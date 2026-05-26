import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { retryWithBackoff } from '../offline/retryManager';

export interface AiInvokeOptions {
  retries?: number;
  timeoutMs?: number;
  cacheKey?: string;
  cacheTTLms?: number;
  quotaKey?: string;
  maxQuotaPerDay?: number;
  allowOffline?: boolean;
  fallbackResponse?: unknown;
  errorMessage?: string;
}

const AI_CACHE_PREFIX = 'nirman:ai-cache:';
const AI_QUOTA_PREFIX = 'nirman:ai-quota:';
const AI_DEFAULT_RETRIES = 2;
const AI_DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;

function safeStorage() {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return null;
    }
    return window.localStorage;
  } catch {
    return null;
  }
}

function loadJsonFromStorage<T>(key: string): T | null {
  const storage = safeStorage();
  if (!storage) return null;
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

function storeJsonToStorage(key: string, data: unknown): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore storage failures in low-space environments
  }
}

function getDailyQuotaKey(quotaKey: string): string {
  const dayKey = new Date().toISOString().slice(0, 10);
  return `${AI_QUOTA_PREFIX}${quotaKey}:${dayKey}`;
}

function getCachedAiResponse<T>(key: string, ttlMs: number): T | null {
  void ttlMs;
  const cache = loadJsonFromStorage<{ expiresAt: number; value: T }>(key);
  if (!cache || cache.expiresAt < Date.now()) {
    const storage = safeStorage();
    if (storage) storage.removeItem(key);
    return null;
  }
  return cache.value;
}

function setCachedAiResponse<T>(key: string, value: T, ttlMs: number): void {
  void ttlMs;
  storeJsonToStorage(key, { expiresAt: Date.now() + ttlMs, value });
}

function stableHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function generateCacheKey(functionName: string, payload: Record<string, unknown>): string {
  const payloadString = JSON.stringify(payload);
  return `${AI_CACHE_PREFIX}${functionName}:${stableHash(payloadString)}`;
}

function trackDailyQuota(quotaKey: string, maxQuotaPerDay: number): boolean {
  const storageKey = getDailyQuotaKey(quotaKey);
  const quota = loadJsonFromStorage<{ count: number }>(storageKey) ?? { count: 0 };
  if (quota.count >= maxQuotaPerDay) {
    return false;
  }
  storeJsonToStorage(storageKey, { count: quota.count + 1 });
  return true;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

async function persistAiRequestLog(
  functionName: string,
  payload: Record<string, unknown>,
  durationMs: number,
  success: boolean,
  errorMessage?: string,
  responseSummary?: string
): Promise<void> {
  try {
    const userResult = await supabase.auth.getUser();
    await supabase.from('ai_usage_logs').insert({
      user_id: userResult.data.user?.id || null,
      function_name: functionName,
      duration_ms: Math.round(durationMs),
      success,
      error_message: errorMessage,
      payload_summary: JSON.stringify(payload).slice(0, 1000),
      response_summary: responseSummary?.slice(0, 1000) ?? null,
    });
  } catch (error) {
    logger.logAIError(error, 'persistAiRequestLog', { functionName, payloadKeys: Object.keys(payload) });
  }
}

export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  payload: Record<string, unknown> | unknown,
  options: AiInvokeOptions = {}
): Promise<T> {
  const normalizedPayload = typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {};

  if (typeof window !== 'undefined' && !navigator.onLine && !options.allowOffline) {
    const error = new Error('Cannot invoke AI while offline.');
    logger.logAIError(error, functionName, { payload });
    throw error;
  }

  if (options.quotaKey && options.maxQuotaPerDay && !trackDailyQuota(options.quotaKey, options.maxQuotaPerDay)) {
    const error = new Error(`AI quota exceeded for ${options.quotaKey}`);
    logger.logAIError(error, functionName, { payload });
    throw error;
  }

  const cacheKey = options.cacheKey ?? (options.cacheTTLms ? generateCacheKey(functionName, normalizedPayload) : undefined);
  if (cacheKey) {
    const cached = getCachedAiResponse<T>(cacheKey, options.cacheTTLms ?? AI_DEFAULT_CACHE_TTL_MS);
    if (cached !== null) {
      return cached;
    }
  }

  const operation = async () => {
    const startTime = Date.now();
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload as Record<string, unknown>,
    });
    const durationMs = Date.now() - startTime;

    if (error) {
      const formattedError = new Error(extractErrorMessage(error));
      logger.logAIError(formattedError, functionName, { payload, details: error });
      await persistAiRequestLog(functionName, normalizedPayload, durationMs, false, extractErrorMessage(error));
      throw formattedError;
    }

    if (!data) {
      const emptyError = new Error(`Edge function ${functionName} returned empty response`);
      logger.logAIError(emptyError, functionName, { payload });
      await persistAiRequestLog(functionName, normalizedPayload, durationMs, false, emptyError.message);
      throw emptyError;
    }

    if (cacheKey) {
      setCachedAiResponse<T>(cacheKey, data as T, options.cacheTTLms ?? AI_DEFAULT_CACHE_TTL_MS);
    }

    await persistAiRequestLog(functionName, normalizedPayload, durationMs, true, undefined, typeof data === 'string' ? data : JSON.stringify(data));
    return data as T;
  };

  try {
    const result = await retryWithBackoff(
      async () => {
        const promise = operation();
        if (options.timeoutMs) {
          const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`AI request timed out after ${options.timeoutMs}ms`)), options.timeoutMs));
          return Promise.race([promise, timeout]);
        }
        return promise;
      },
      options.retries ?? AI_DEFAULT_RETRIES,
      1000
    );

    return result as T;
  } catch (error) {
    const finalError = error instanceof Error ? error : new Error(extractErrorMessage(error));
    logger.logAIError(finalError, functionName, { payload });
    if (options.fallbackResponse !== undefined) {
      return options.fallbackResponse as T;
    }
    throw new Error(options.errorMessage ?? finalError.message);
  }
}

export async function invokeAiAnalyze<T = unknown>(payload: Record<string, unknown>, options: AiInvokeOptions = {}): Promise<T> {
  return invokeEdgeFunction<T>('ai-analyze', payload, options);
}

export interface AnalyzeDrawingInput {
  projectId: string;
  drawingUrl: string;
  sitePhotoUrl: string;
  drawingType: string;
  elementType: string;
  drawingSpec: string;
  siteObservation: string;
}

export interface AnalyzeDrawingResult {
  compliance_score: number;
  severity: 'compliant' | 'minor' | 'major' | 'critical';
  elements: Array<{ element: string; issue: string; severity: string; recommendation: string }>;
  critical_issues: string[];
  recommendation: string;
  stop_work: boolean;
}

export interface VerifyMaterialTestResult {
  verified: boolean;
  authenticity_score: number;
  suspicious_flags: string[];
  recommendation: string;
}

export interface AnalyzeDisputeResult {
  valid_amount: number;
  invalid_amount: number;
  confidence_score: number;
  arbitration_risk: 'low' | 'medium' | 'high' | 'critical';
  referenced_clauses: Array<{ clause: string; page: number; text: string }>;
  recommendation: string;
  reasoning: string;
}

export async function analyzeDrawing(input: AnalyzeDrawingInput): Promise<AnalyzeDrawingResult> {
  return invokeEdgeFunction<AnalyzeDrawingResult>('analyze-drawing', input, {
    retries: 2,
    timeoutMs: 20000,
    cacheTTLms: 5 * 60 * 1000,
    quotaKey: 'drawing',
    maxQuotaPerDay: 40,
  });
}

export async function verifyMaterialTest(input: { testId: string; reportUrl: string; sampleId: string; materialType: string; testType: string; labName: string; requiredValue: string; achievedValue: string; labCertificateNumber?: string }): Promise<VerifyMaterialTestResult> {
  return invokeEdgeFunction<VerifyMaterialTestResult>('verify-material-test', input, {
    retries: 2,
    timeoutMs: 20000,
    quotaKey: 'materialTest',
    maxQuotaPerDay: 40,
  });
}

export async function analyzeDispute(input: { disputeId: string; agreementText: string; boq: string; disputeDescription: string; claimAmount: number; contractClauses?: string[] }): Promise<AnalyzeDisputeResult> {
  return invokeEdgeFunction<AnalyzeDisputeResult>('analyze-dispute', input, {
    retries: 2,
    timeoutMs: 25000,
    quotaKey: 'dispute',
    maxQuotaPerDay: 30,
  });
}

export async function generateExtensionLetter(input: { projectId: string; extensionRequest: Record<string, unknown> }): Promise<string> {
  const response = await invokeEdgeFunction<{ letter: string }>('generate-extension-letter', input, {
    retries: 2,
    timeoutMs: 20000,
    quotaKey: 'extensionLetter',
    maxQuotaPerDay: 30,
  });
  return response.letter;
}

export async function sendBGAlerts(): Promise<void> {
  await invokeEdgeFunction<void>('send-bg-alerts', {}, { retries: 1, timeoutMs: 10000 });
}

export async function calculateBudgetGap(): Promise<void> {
  await invokeEdgeFunction<void>('calculate-budget-gap', {}, { retries: 1, timeoutMs: 10000 });
}

export async function autoWeatherSync(): Promise<void> {
  await invokeEdgeFunction<void>('auto-weather-sync', {}, { retries: 1, timeoutMs: 10000 });
}

export async function generateWeeklyReport(): Promise<void> {
  await invokeEdgeFunction<void>('generate-weekly-report', {}, { retries: 1, timeoutMs: 10000 });
}

export async function tpaDiscrepancyAnalysis(input: { projectId: string; reportIds: string[] }): Promise<Record<string, unknown>> {
  return invokeEdgeFunction<Record<string, unknown>>('tpa-discrepancy-analysis', input, {
    retries: 2,
    timeoutMs: 20000,
    quotaKey: 'tpaDiscrepancy',
    maxQuotaPerDay: 30,
  });
}
