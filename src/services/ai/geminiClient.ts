import { AiRequestError, aiRequestManager } from './aiRequestManager';
import { auditAiRequest } from './aiAudit';
import { supabase } from '../../lib/supabase';
import { trackAiTrace } from '../observability/diagnostics';

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
}

export interface AiRequest {
  messages: AiMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
}

const defaultModel = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || 'gemini-2.5-flash';
const fallbackModels = Array.from(new Set([
  (import.meta.env.VITE_GEMINI_FALLBACK_MODEL as string | undefined) || 'gemini-2.1',
  'gemini-2.0',
]));
const imageModel = (import.meta.env.VITE_GEMINI_IMAGE_MODEL as string | undefined) || defaultModel;
const defaultTimeoutMs = Number(import.meta.env.VITE_AI_TIMEOUT_MS || 30000);
const proxyEnabled = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
const geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

function safeLogMessage(message: string) {
  const googleKeyPrefix = ['AI', 'za', 'Sy'].join('');
  return String(message)
    .replace(new RegExp(`${googleKeyPrefix}[A-Za-z0-9_-]{35}`, 'g'), '[redacted]')
    .replace(/\b[AEiou0-9]{20,}\b/g, '[redacted]');
}

function serializeContent(content: AiMessage['content']) {
  if (typeof content === 'string') return content;
  return content
    .map((item) => {
      if (item.type === 'text') return item.text;
      if (item.type === 'image_url') return `IMAGE_URL: ${item.image_url.url}`;
      return '';
    })
    .join('\n');
}

function buildPrompt(messages: AiMessage[]) {
  return messages
    .map((message) => {
      const payload = serializeContent(message.content);
      if (message.role === 'system') return `SYSTEM: ${payload}`;
      if (message.role === 'assistant') return `ASSISTANT: ${payload}`;
      return `USER: ${payload}`;
    })
    .join('\n\n');
}

function dataUrlToInlineData(url: string) {
  const match = url.match(/^data:([^;,]+)?(?:;[^,]*)?,(.*)$/);
  if (!match) return null;
  return {
    mimeType: match[1] || 'application/octet-stream',
    data: match[2],
  };
}

function messageToParts(message: AiMessage) {
  if (typeof message.content === 'string') {
    return [{ text: `${message.role.toUpperCase()}: ${message.content}` }];
  }

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  parts.push({ text: `${message.role.toUpperCase()}:` });
  for (const item of message.content) {
    if (item.type === 'text') {
      parts.push({ text: item.text });
      continue;
    }

    const inlineData = dataUrlToInlineData(item.image_url.url);
    if (inlineData) {
      parts.push({ inlineData });
    } else {
      parts.push({ text: `Image reference: ${item.image_url.url}` });
    }
  }
  return parts;
}

function buildGeminiPayload({ messages, model, temperature = 0.2, maxTokens = 900 }: AiRequest & { model: string }) {
  const systemMessages = messages.filter((message) => message.role === 'system').map((message) => serializeContent(message.content));
  const contentMessages = messages.filter((message) => message.role !== 'system');

  return {
    model,
    systemInstruction: systemMessages.length ? { parts: systemMessages.map((text) => ({ text })) } : undefined,
    contents: contentMessages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: messageToParts(message),
    })),
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };
}

function normalizeGeminiResponse(payload: unknown): string {
  if (!payload) return '';
  if (typeof payload === 'string') return payload.trim();

  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeGeminiResponse(item)).join('\n');
  }

  if (typeof payload === 'object' && payload !== null) {
    const record = payload as Record<string, unknown>;
    if ('candidates' in record && Array.isArray(record.candidates)) {
      return normalizeGeminiResponse(record.candidates[0]);
    }
    if ('parts' in record && Array.isArray(record.parts)) {
      return record.parts.map((part) => normalizeGeminiResponse(part)).filter(Boolean).join('\n');
    }
    if ('content' in record) return normalizeGeminiResponse(record.content);
    if ('text' in record) return normalizeGeminiResponse(record.text);
    if ('message' in record) return normalizeGeminiResponse((record.message as Record<string, unknown>)?.content);
    return Object.values(record).map(normalizeGeminiResponse).join('\n');
  }

  return String(payload).trim();
}

function normalizeAiError(error: unknown, fallbackMessage = 'AI service unavailable. Please try again later.') {
  if (error instanceof AiRequestError) return error;
  if (error instanceof DOMException && error.name === 'AbortError') return error;
  if (error instanceof Error) {
    const message = safeLogMessage(error.message || fallbackMessage);
    return new AiRequestError(message, { retryable: true });
  }
  return new AiRequestError(fallbackMessage, { retryable: true });
}

async function requestGeminiRaw({
  payload: _payload,
  signal: _signal,
}: {
  payload: ReturnType<typeof buildGeminiPayload>;
  signal: AbortSignal;
}) {
  throw new AiRequestError('Direct browser Gemini calls are disabled; use the AI proxy.', {
    status: 503,
    retryable: true,
  });

}

async function attemptGeminiDirect(request: AiRequest) {
  const model = request.model || defaultModel;
  const prompt = buildPrompt(request.messages);
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(new Error('Gemini request timed out')), request.timeoutMs || defaultTimeoutMs);
    try {
      const response = await requestGeminiRaw({
        payload: buildGeminiPayload({ ...request, model }),
        signal: controller.signal,
      });

      const normalized = normalizeGeminiResponse(response);
      trackAiTrace('gemini-direct-success', {
        model,
        attempt,
        promptLength: prompt.length,
      });
      return normalized;
    } catch (error) {
      lastError = error;
      if (error instanceof AiRequestError && !error.retryable) {
        break;
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw normalizeAiError(error);
      }

      const retryable = error instanceof AiRequestError ? error.retryable : true;
      if (!retryable || attempt === 2) break;

      const delay = Math.min(600 * 2 ** attempt, 4000);
      await new Promise((resolve) => window.setTimeout(resolve, delay));
    } finally {
      window.clearTimeout(timeout);
    }
  }

  throw normalizeAiError(lastError, 'Gemini request failed');
}

async function runViaProxy({ messages, model = defaultModel, temperature = 0.2, maxTokens = 900, signal }: AiRequest) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    throw new AiRequestError('AI requires an active session', { status: 401, retryable: false });
  }

  const promptPreview = typeof messages[0]?.content === 'string' ? messages[0].content : 'vision/multipart request';
  const signedBody = await Promise.resolve({
    workflow: 'gemini-chat',
    model,
    messages,
    temperature,
    maxTokens,
    requestId: crypto.randomUUID(),
    timestamp: Date.now(),
    nonce: crypto.randomUUID(),
  });

  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: signedBody,
    headers: { Authorization: `Bearer ${token}` },
  });

  if (signal?.aborted) throw new DOMException('AI request cancelled', 'AbortError');
  if (error || data?.error) {
    throw new AiRequestError(safeLogMessage(String(data?.error || 'AI proxy unavailable. Please try again later.')), {
      status: data?.status || 503,
      retryable: true,
    });
  }

  trackAiTrace('gemini-proxy-success', {
    model,
    promptPreview: safeLogMessage(promptPreview),
    durationMs: data?.durationMs,
    requestId: data?.requestId,
  });

  return String(data?.content || '');
}

export async function runAiCompletion({ messages, model = defaultModel, temperature = 0.2, maxTokens = 900, signal, timeoutMs }: AiRequest) {
  auditAiRequest({
    workflow: 'gemini-chat',
    model,
    status: 'queued',
    promptPreview: typeof messages[0]?.content === 'string' ? messages[0].content : 'vision/multipart request',
  });

  return aiRequestManager.enqueue({
    label: 'gemini-chat',
    signal,
    timeoutMs: timeoutMs || defaultTimeoutMs,
    run: async (requestSignal) => {
      try {
        if (proxyEnabled) {
          return await runViaProxy({ messages, model, temperature, maxTokens, signal: requestSignal });
        }
        return await attemptGeminiDirect({ messages, model, temperature, maxTokens, signal: requestSignal, timeoutMs: timeoutMs || defaultTimeoutMs });
      } catch (error) {
        trackAiTrace('gemini-failed', {
          model,
          error: error instanceof Error ? error.message : 'unknown',
        });
        throw normalizeAiError(error);
      }
    },
  });
}

// Attempt to parse structured JSON from model output with safe fallbacks.
function tryParseJsonSafe(text: string) {
  if (!text || typeof text !== 'string') return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    // Attempt to extract JSON-like substring
    const jsonMatch = text.match(/({[\s\S]*}|\[[\s\S]*\])/);
    const candidate = jsonMatch ? jsonMatch[0] : text;

    // Fix common issues: trailing commas, smart quotes
    const cleaned = candidate
      .replace(/[""'']/g, '"')
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/([}\]'])\s*([}\]])/g, '$1$2');

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // Last resort: return null
      return null;
    }
  }
}

/**
 * Convenience wrapper that returns parsed JSON when available.
 * Falls back to raw string if parsing fails. Does not throw on parse failures.
 */
export async function runAiCompletionStructured(opts: AiRequest) {
  const raw = await runAiCompletion(opts);
  try {
    const parsed = tryParseJsonSafe(String(raw));
    if (parsed !== null) return parsed;
  } catch (err) {
    // swallow parse errors and return raw
  }
  return String(raw);
}

export async function runAiVision(prompt: string, imageDataUrls: string[], signal?: AbortSignal) {
  return runAiCompletion({
    model: imageModel,
    maxTokens: 1100,
    signal,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...imageDataUrls.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
        ],
      },
    ],
  });
}
