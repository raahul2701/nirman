type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: unknown }>;
    };
  }>;
  error?: { message?: string };
};

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';

export function getGeminiKey() {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) {
    throw new Error('Gemini API key is not configured on the server');
  }
  return key;
}

function stripCodeFence(text: string) {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function extractJsonText(text: string) {
  const trimmed = stripCodeFence(text);
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed;
  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch) return objectMatch[0];
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) return arrayMatch[0];
  return trimmed;
}

function extractText(response: GeminiResponse) {
  const parts = response.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    throw new Error(`Gemini response did not include text content. ${response.error?.message || ''}`.trim());
  }

  const text = parts.map((part) => typeof part.text === 'string' ? part.text : '').filter(Boolean).join('\n').trim();
  if (!text) {
    throw new Error('Gemini response did not include text content.');
  }
  return text;
}

export async function runGeminiText(prompt: string, options: { maxTokens?: number; temperature?: number; signal?: AbortSignal } = {}) {
  const key = getGeminiKey();
  const response = await fetch(`${GEMINI_API_BASE}/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    signal: options.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxTokens ?? 1200,
      },
    }),
  });

  const responseText = await response.text().catch(() => '');
  const responseJson = responseText ? JSON.parse(responseText) as GeminiResponse : {};
  if (!response.ok) {
    throw new Error(`Gemini API returned ${response.status}: ${responseJson.error?.message || responseText}`);
  }

  return extractText(responseJson);
}

export async function runGeminiJson<T = Record<string, unknown>>(prompt: string, options: { maxTokens?: number; temperature?: number; signal?: AbortSignal } = {}) {
  const text = await runGeminiText(prompt, options);
  return JSON.parse(extractJsonText(text)) as T;
}
