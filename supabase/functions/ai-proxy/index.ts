import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';

type AiTextContentItem = { type: 'text'; text: string };
type AiImageUrlContentItem = { type: 'image_url'; image_url: { url: string } };
type AiFileContentItem = {
  type: 'file';
  name: string;
  mimeType: string;
  bucket: string;
  path: string;
  fileUri?: string;
};
type AiContentItem = AiTextContentItem | AiImageUrlContentItem | AiFileContentItem;

type AiMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | AiContentItem[];
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

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_UPLOAD_BASE = 'https://generativelanguage.googleapis.com';
const GEMINI_BASE_URL = GEMINI_API_BASE;
const DEFAULT_TIMEOUT_MS = Number(Deno.env.get('AI_PROXY_TIMEOUT_MS') || 30000);
const MAX_REQUESTS_PER_WINDOW = Number(Deno.env.get('AI_PROXY_RATE_LIMIT') || 30);
const RATE_WINDOW_MS = Number(Deno.env.get('AI_PROXY_RATE_WINDOW_MS') || 60000);
const MAX_PROMPT_CHARS = Number(Deno.env.get('AI_PROXY_MAX_PROMPT_CHARS') || 60000);
const GEMINI_FILE_CACHE_TTL_MS = Number(Deno.env.get('GEMINI_FILE_CACHE_TTL_MS') || 60 * 60 * 1000);
const defaultModel = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
const rateBuckets = new Map<string, number[]>();
const uploadedFileCache = new Map<string, { fileUri: string; uploadedAt: number }>();

const AI_PROXY_DEBUG = Boolean(Deno.env.get('AI_PROXY_DEBUG'));

function maskKey(key: string | undefined) {
  if (!key) return '<missing>';
  return `${key.slice(0, 4)}...(${key.length} chars)`;
}

async function logGeminiEvent(event: Record<string, unknown>) {
  try {
    console.warn('[ai-proxy][gemini-debug]', JSON.stringify(event));
    if (AI_PROXY_DEBUG) {
      // best-effort audit write (non-blocking)
      await createSupabaseClient().from('ai_request_logs').insert({ event_type: 'gemini_debug', event });
    }
  } catch (e) {
    console.warn('[ai-proxy] failed to write gemini debug audit', e instanceof Error ? e.message : e);
  }
}
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
  return content.map((item) => {
    if (item.type === 'text') return item.text;
    if (item.type === 'image_url') return `Image reference: ${item.image_url.url}`;
    if (item.type === 'file') return `File reference: ${item.name || item.path}`;
    return '';
  }).join('\n');
}

function messageToParts(message: AiMessage) {
  if (typeof message.content === 'string') {
    return [{ text: `${message.role.toUpperCase()}: ${message.content}` }];
  }

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } } | { file_data: { mime_type: string; file_uri: string } }> = [{ text: `${message.role.toUpperCase()}:` }];
  for (const item of message.content) {
    if (item.type === 'text') {
      parts.push({ text: item.text });
      continue;
    }

    if (item.type === 'image_url') {
      const inlineData = dataUrlToInlineData(item.image_url.url);
      parts.push(inlineData ? { inlineData } : { text: `Image reference: ${item.image_url.url}` });
      continue;
    }

    if (item.type === 'file') {
      if (!item.fileUri) {
        throw new Error('Missing fileUri for Gemini file content item');
      }
      parts.push({ file_data: { mime_type: item.mimeType, file_uri: item.fileUri } });
      continue;
    }
  }
  return parts;
}

function getFileCacheKey(item: AiFileContentItem) {
  return `${item.bucket}:${item.path}:${item.mimeType}:${item.name}`;
}

async function uploadFileToGemini(item: AiFileContentItem, signal: AbortSignal) {
  if (!geminiApiKey) {
    throw new Error('Gemini API key is not configured on the server');
  }

  const cacheKey = getFileCacheKey(item);
  const cached = uploadedFileCache.get(cacheKey);
  if (cached && Date.now() - cached.uploadedAt < GEMINI_FILE_CACHE_TTL_MS) {
    return cached.fileUri;
  }

  const supabase = createSupabaseClient();
  const { data, error } = await supabase.storage.from(item.bucket).download(item.path);
  if (error || !data) {
    throw new Error(`File upload failed: ${error?.message ?? 'Supabase download failed'}`);
  }

  const buffer = await data.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (!bytes.length) {
    throw new Error('Uploaded document is empty.');
  }

  const initEndpoint = `${GEMINI_UPLOAD_BASE}/upload/v1beta/files?key=${encodeURIComponent(geminiApiKey)}`;
  await logGeminiEvent({ phase: 'upload_init.start', endpoint: initEndpoint, model: null, file: { name: item.name, mimeType: item.mimeType, bucket: item.bucket, path: item.path }, apiKey: maskKey(geminiApiKey) });
  const initResponse = await fetch(initEndpoint, {
    method: 'POST',
    signal,
    headers: {
      'x-goog-api-key': geminiApiKey,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(bytes.length),
      'X-Goog-Upload-Header-Content-Type': item.mimeType,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: item.name || item.path } }),
  });
  const initText = await initResponse.text().catch(() => '');
  await logGeminiEvent({ phase: 'upload_init.response', endpoint: initEndpoint, status: initResponse.status, body: initText });

  if (!initResponse.ok) {
    throw new Error(`Gemini file upload init failed: ${initResponse.status} ${initText}`);
  }

  let uploadUrl = initResponse.headers.get('x-goog-upload-url');
  if (!uploadUrl) {
    const initJson = (() => {
      try { return JSON.parse(initText) as Record<string, unknown>; } catch { return null; }
    })();
    uploadUrl = (initJson?.upload_url as string) || ((initJson?.file as Record<string, unknown> | undefined)?.upload_url as string) || '';
  }

  if (!uploadUrl) {
    throw new Error('Gemini file upload init did not return an upload URL.');
  }

  await logGeminiEvent({ phase: 'upload_transfer.start', uploadUrl: uploadUrl, bytes: bytes.length });
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    signal,
    headers: {
      'Content-Length': String(bytes.length),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: bytes,
  });
  const uploadText = await uploadResponse.text().catch(() => '');
  await logGeminiEvent({ phase: 'upload_transfer.response', uploadUrl: uploadUrl, status: uploadResponse.status, body: uploadText });

  if (!uploadResponse.ok) {
    throw new Error(`Gemini file upload failed: ${uploadResponse.status} ${uploadText}`);
  }

  const fileInfo = (() => {
    try { return JSON.parse(uploadText) as Record<string, unknown>; } catch { return null; }
  })();
  const fileUri = (fileInfo?.file as Record<string, unknown> | undefined)?.uri as string || (fileInfo?.uri as string) || '';
  const fileName = (fileInfo?.file as Record<string, unknown> | undefined)?.name as string || (fileInfo?.name as string) || '';
  await logGeminiEvent({ phase: 'upload_transfer.fileInfo', fileName, fileUri, fileInfo });
  if (!fileUri) {
    throw new Error('Gemini file upload failed to return a file URI.');
  }

  // Poll file metadata until ACTIVE
  if (fileName) {
    const maxPoll = 10;
    let attempt = 0;
    while (attempt < maxPoll) {
      attempt += 1;
      try {
        const metaEndpoint = `${GEMINI_API_BASE}/files/${encodeURIComponent(fileName)}?key=${encodeURIComponent(geminiApiKey)}`;
        const metaRes = await fetch(metaEndpoint, { method: 'GET', signal });
        const metaText = await metaRes.text().catch(() => '');
        await logGeminiEvent({ phase: 'file_meta', endpoint: metaEndpoint, status: metaRes.status, body: metaText });
        if (metaRes.ok) {
          const meta = (() => { try { return JSON.parse(metaText) as Record<string, unknown>; } catch { return null; } })();
          const state = (meta?.file as Record<string, unknown> | undefined)?.state as string | undefined || (meta?.state as string | undefined);
          if (state === 'ACTIVE') break;
          if (state === 'FAILED') throw new Error('Gemini reported uploaded file state=FAILED');
        }
      } catch (err) {
        await logGeminiEvent({ phase: 'file_meta.error', error: err instanceof Error ? err.message : String(err) });
      }
      // backoff
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }

  uploadedFileCache.set(cacheKey, { fileUri, uploadedAt: Date.now() });
  return fileUri;
}

async function resolveFileUris(messages: AiMessage[], signal: AbortSignal) {
  const resolved = [] as AiMessage[];
  for (const message of messages) {
    if (typeof message.content === 'string') {
      resolved.push(message);
      continue;
    }

    const content = [] as AiContentItem[];
    for (const item of message.content) {
      if (item.type !== 'file') {
        content.push(item);
        continue;
      }
      const fileUri = item.fileUri ?? await uploadFileToGemini(item, signal);
      content.push({ ...item, fileUri });
    }

    resolved.push({ ...message, content });
  }
  return resolved;
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

  const resolvedMessages = await resolveFileUris(Array.isArray(payload.messages) ? payload.messages as AiMessage[] : [], signal);
  const resolvedPayload = {
    ...payload,
    messages: resolvedMessages,
  };

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const genEndpoint = `${GEMINI_BASE_URL}/models/${encodeURIComponent(payload.model as string)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;
      await logGeminiEvent({ phase: 'generate_content.start', endpoint: genEndpoint, model: payload.model, apiKey: maskKey(geminiApiKey), payloadSize: JSON.stringify(resolvedPayload).length });
      const response = await fetch(genEndpoint, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildGeminiPayload(resolvedPayload)),
      });
      const respText = await response.text().catch(() => '');
      let respJson: unknown = null;
      try { respJson = JSON.parse(respText); } catch (error) {
        console.error(error);
      }
      await logGeminiEvent({ phase: 'generate_content.response', endpoint: genEndpoint, status: response.status, body: respText });

      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        if (!retryable || attempt === 2) {
          const errObj = { status: response.status, body: respJson ?? respText, headers: Object.fromEntries(response.headers.entries()) };
          await logGeminiEvent({ phase: 'generate_content.error', error: errObj });
          throw new Error(`Gemini request failed: ${JSON.stringify(errObj)}`);
        }
        lastError = new Error(respText || 'Gemini request failed');
      } else {
        return respJson ?? respText;
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
  let model = defaultModel;

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
    model = body.model || defaultModel;

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
    const errMessage = error instanceof Error ? error.message : String(error);
    await audit({
      user_id: userId,
      request_id: requestId,
      workflow,
      status: 'failed',
      duration_ms: durationMs,
      error_message: errMessage,
    });
    // Detailed debug log when enabled
    try {
      await logGeminiEvent({ phase: 'proxy.failure', error: errMessage, stack: error instanceof Error ? error.stack : undefined, requestId, workflow, model });
    } catch (error) {
      console.error(error);
    }
    if (AI_PROXY_DEBUG) {
      console.error('[ai-proxy] failing error', error instanceof Error ? error.stack || error.message : String(error));
    }
    return json({ error: 'AI service unavailable', requestId, details: AI_PROXY_DEBUG ? errMessage : undefined }, 503);
  }
});
