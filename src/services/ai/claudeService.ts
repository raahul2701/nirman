import { supabase } from '../../lib/supabase';

export interface EdgeFunctionResponse<T = unknown> {
  success: boolean;
  data: T;
  error?: string;
}

export async function invokeEdgeFunction<T = unknown>(functionName: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Edge function ${functionName} returned empty response`);
  }

  return data as T;
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
  return invokeEdgeFunction<AnalyzeDrawingResult>('analyze-drawing', input);
}

export async function verifyMaterialTest(input: { testId: string; reportUrl: string; sampleId: string; materialType: string; testType: string; labName: string; requiredValue: string; achievedValue: string; labCertificateNumber?: string }): Promise<VerifyMaterialTestResult> {
  return invokeEdgeFunction<VerifyMaterialTestResult>('verify-material-test', input);
}

export async function analyzeDispute(input: { disputeId: string; agreementText: string; boq: string; disputeDescription: string; claimAmount: number; contractClauses?: string[] }): Promise<AnalyzeDisputeResult> {
  return invokeEdgeFunction<AnalyzeDisputeResult>('analyze-dispute', input);
}

export async function generateExtensionLetter(input: { projectId: string; extensionRequest: Record<string, unknown> }): Promise<string> {
  const response = await invokeEdgeFunction<{ letter: string }>('generate-extension-letter', input);
  return response.letter;
}

export async function sendBGAlerts(): Promise<void> {
  await invokeEdgeFunction<void>('send-bg-alerts', {});
}

export async function calculateBudgetGap(): Promise<void> {
  await invokeEdgeFunction<void>('calculate-budget-gap', {});
}

export async function autoWeatherSync(): Promise<void> {
  await invokeEdgeFunction<void>('auto-weather-sync', {});
}

export async function generateWeeklyReport(): Promise<void> {
  await invokeEdgeFunction<void>('generate-weekly-report', {});
}

export async function tpaDiscrepancyAnalysis(input: { projectId: string; reportIds: string[] }): Promise<Record<string, unknown>> {
  return invokeEdgeFunction<Record<string, unknown>>('tpa-discrepancy-analysis', input);
}
