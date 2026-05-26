import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';

type AiMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
};

type AiProxyRequest = {
  messages: AiMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  workflow?: string;
  requestId?: string;
  timestamp?: number;
  nonce?: string;
  bodyHash?: string;
};

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_TIMEOUT_MS = Number(Deno.env.get('AI_PROXY_TIMEOUT_MS') || 30000);
const MAX_REQUESTS_PER_WINDOW = Number(Deno.env.get('AI_PROXY_RATE_LIMIT') || 30);
const RATE_WINDOW_MS = Number(Deno.env.get('AI_PROXY_RATE_WINDOW_MS') || 60000);
const MAX_PROMPT_CHARS = Number(Deno.env.get('AI_PROXY_MAX_PROMPT_CHARS') || 60000);
const defaultModel = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
const rateBuckets = new Map<string, number[]>();

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getCallerKey(req: Request, userId?: string) {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwardedFor || req.headers.get('cf-connecting-ip') || 'unknown-ip';
  return `${userId || 'anon'}:${ip}`;
}

function assertRateLimit(key: string) {
  const now = Date.now();
  const bucket = (rateBuckets.get(key) || []).filter((hit) => now - hit < RATE_WINDOW_MS);
  if (bucket.length >= MAX_REQUESTS_PER_WINDOW) {
    throw new Response(JSON.stringify({ error: 'AI proxy rate limit exceeded' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }
  bucket.push(now);
  rateBuckets.set(key, bucket);
}

async function sha256Hex(input: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hmacHex(secret: string, input: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

function promptSize(messages: AiMessage[]) {
  return messages.reduce((total, message) => total + JSON.stringify(message.content).length, 0);
}

function dataUrlToInlineData(url: string) {
  const match = url.match(/^data:([^;,]+)?(?:;[^,]*)?,(.*)$/);
  if (!match) return null;
  return {
    mimeType: match[1] || 'application/octet-stream',
    data: match[2],
  };
}

function serializeContent(content: AiMessage['content']) {
  if (typeof content === 'string') return content;
  return content.map((item) => item.type === 'text' ? item.text : `Image reference: ${item.image_url.url}`).join('\n');
}

function messageToParts(message: AiMessage) {
  if (typeof message.content === 'string') {
    return [{ text: `${message.role.toUpperCase()}: ${message.content}` }];
  }

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: `${message.role.toUpperCase()}:` }];
  for (const item of message.content) {
    if (item.type === 'text') {
      parts.push({ text: item.text });
      continue;
    }

    const inlineData = dataUrlToInlineData(item.image_url.url);
    parts.push(inlineData ? { inlineData } : { text: `Image reference: ${item.image_url.url}` });
  }
  return parts;
}

function buildGeminiPayload(payload: Record<string, unknown>) {
  const messages = Array.isArray(payload.messages) ? payload.messages as AiMessage[] : [];
  const systemMessages = messages.filter((message) => message.role === 'system').map((message) => serializeContent(message.content));
  const contentMessages = messages.filter((message) => message.role !== 'system');

  return {
    systemInstruction: systemMessages.length ? { parts: systemMessages.map((text) => ({ text })) } : undefined,
    contents: contentMessages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: messageToParts(message),
    })),
    generationConfig: {
      temperature: payload.temperature ?? 0.2,
      maxOutputTokens: payload.maxTokens ?? 900,
    },
  };
}

function normalizeGeminiResponse(result: unknown) {
  const record = result as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    text?: string;
    output?: string;
  };
  const parts = record.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    return parts.map((part) => typeof part?.text === 'string' ? part.text : '').filter(Boolean).join('\n').trim();
  }
  return String(record.text || record.output || '').trim();
}

async function validateRequestSignature(req: Request, body: AiProxyRequest) {
  const now = Date.now();
  if (!body.timestamp || Math.abs(now - body.timestamp) > 5 * 60 * 1000 || !body.nonce) {
    throw new Response(JSON.stringify({ error: 'Missing or stale AI request signature metadata' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { bodyHash, ...unsignedBody } = body;
  const expectedBodyHash = await sha256Hex(JSON.stringify(unsignedBody));
  if (bodyHash && !timingSafeEqual(bodyHash, expectedBodyHash)) {
    throw new Response(JSON.stringify({ error: 'Invalid AI request body hash' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const secret = Deno.env.get('AI_PROXY_SIGNING_SECRET');
  const signature = req.headers.get('x-nirman-signature');
  if (secret && signature) {
    const expected = await hmacHex(secret, `${body.timestamp}.${body.nonce}.${bodyHash || expectedBodyHash}`);
    if (!timingSafeEqual(signature, expected)) {
      throw new Response(JSON.stringify({ error: 'Invalid AI request signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
}

async function audit(event: Record<string, unknown>) {
  try {
    await createSupabaseClient().from('ai_request_logs').insert(event);
  } catch (error) {
    console.warn('[ai-proxy] audit write failed', error instanceof Error ? error.message : error);
  }
}

async function fetchWithRetry(payload: Record<string, unknown>, signal: AbortSignal) {
  if (!geminiApiKey) {
    throw new Error('Gemini API key is not configured on the server');
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${GEMINI_BASE_URL}/${encodeURIComponent(payload.model as string)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildGeminiPayload(payload)),
      });

      if (!response.ok) {
        const responseBody = await response.json().catch(() => null);
        const retryable = response.status === 429 || response.status >= 500;
        if (!retryable || attempt === 2) {
          throw new Error(`Gemini request failed with status ${response.status}: ${responseBody?.error?.message || response.statusText}`);
        }
        lastError = new Error(responseBody?.error?.message || 'Gemini request failed');
      } else {
        return response.json();
      }
    } catch (error) {
      lastError = error;
      if (signal.aborted || attempt === 2) break;
    }

    await new Promise((resolve) => setTimeout(resolve, Math.min(800 * 2 ** attempt, 4000)));
  }

  throw lastError instanceof Error ? lastError : new Error('AI request failed');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  let userId: string | undefined;
  let workflow = 'gemini-chat';

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) return json({ error: 'Missing authorization' }, 401);

    const supabase = createSupabaseClient();
    const token = authorization.replace('Bearer ', '');
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return json({ error: 'Invalid session' }, 401);
    userId = data.user.id;

    assertRateLimit(getCallerKey(req, userId));

    const rawBody = await req.text();
    const body = JSON.parse(rawBody) as AiProxyRequest;
    workflow = body.workflow || workflow;
    await validateRequestSignature(req, body);

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return json({ error: 'AI messages are required' }, 400);
    }
    if (promptSize(body.messages) > MAX_PROMPT_CHARS) {
      return json({ error: 'AI prompt exceeds production size limit' }, 413);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('AI proxy timeout'), DEFAULT_TIMEOUT_MS);
    const model = body.model || defaultModel;

    try {
      await audit({
        user_id: userId,
        request_id: body.requestId || requestId,
        workflow,
        model,
        status: 'queued',
        prompt_chars: promptSize(body.messages),
        metadata: { temperature: body.temperature, maxTokens: body.maxTokens },
      });

      const result = await fetchWithRetry({
        model,
        messages: body.messages,
        temperature: body.temperature ?? 0.2,
        maxTokens: body.maxTokens ?? 900,
      }, controller.signal);

      const content = normalizeGeminiResponse(result);
      const tokensUsed = result?.usage?.total_tokens ?? Math.ceil(content.length / 4);
      const durationMs = Date.now() - startedAt;

      await audit({
        user_id: userId,
        request_id: body.requestId || requestId,
        workflow,
        model,
        status: 'completed',
        duration_ms: durationMs,
        tokens_used: tokensUsed,
      });

      return json({ content, tokensUsed, confidence: 0.86, requestId: body.requestId || requestId, durationMs });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    if (error instanceof Response) return error;
    const durationMs = Date.now() - startedAt;
    await audit({
      user_id: userId,
      request_id: requestId,
      workflow,
      status: 'failed',
      duration_ms: durationMs,
      error_message: error instanceof Error ? error.message : 'Unknown AI proxy error',
    });
    return json({ error: 'AI service unavailable', requestId }, 503);
  }
});
