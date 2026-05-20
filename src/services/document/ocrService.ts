export type OcrProviderName = 'browser-tesseract' | 'google-vision' | 'azure-ocr' | 'server-proxy' | 'noop';

export interface OcrPageResult {
  pageNumber: number;
  text: string;
  confidence?: number;
  blocks?: Array<{ text: string; confidence?: number; bbox?: [number, number, number, number] }>;
}

export interface OcrResult {
  provider: OcrProviderName;
  pages: OcrPageResult[];
  createdAt: string;
  warnings: string[];
  confidence?: number;
  duplicateHash?: string;
}

export interface OcrProvider {
  name: OcrProviderName;
  extract(file: File, signal?: AbortSignal): Promise<OcrResult>;
}

const noopProvider: OcrProvider = {
  name: 'noop',
  async extract(file) {
    return {
      provider: 'noop',
      pages: [{ pageNumber: 1, text: '', confidence: 0 }],
      createdAt: new Date().toISOString(),
      warnings: [`OCR provider not configured for ${file.name}`],
    };
  },
};

const providers = new Map<OcrProviderName, OcrProvider>([['noop', noopProvider]]);
const documentHashes = new Set<string>();

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, timeoutMs: number, externalSignal?: AbortSignal) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(new Error('OCR timed out')), timeoutMs);
  const abort = () => controller.abort(externalSignal?.reason);
  externalSignal?.addEventListener('abort', abort, { once: true });
  try {
    return await run(controller.signal);
  } finally {
    window.clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', abort);
  }
}

function normalizeConfidence(result: OcrResult) {
  const scores = result.pages.map((page) => page.confidence).filter((value): value is number => typeof value === 'number');
  return scores.length ? Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 100) / 100 : 0;
}

async function createDocumentHash(file: File) {
  const sample = await file.slice(0, Math.min(file.size, 256 * 1024)).arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', sample);
  return Array.from(new Uint8Array(digest)).map((item) => item.toString(16).padStart(2, '0')).join('');
}

export function registerOcrProvider(provider: OcrProvider) {
  providers.set(provider.name, provider);
}

export async function extractDocumentText(file: File, options: { provider?: OcrProviderName; signal?: AbortSignal; retries?: number } = {}) {
  const provider = providers.get(options.provider || 'noop') || noopProvider;
  const retries = options.retries ?? 1;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (options.signal?.aborted) throw new DOMException('OCR cancelled', 'AbortError');
    try {
      return await provider.extract(file, options.signal);
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      await new Promise((resolve) => window.setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('OCR extraction failed');
}

export async function runOcrPipeline(file: File, options: { providers?: OcrProviderName[]; signal?: AbortSignal; timeoutMs?: number; retries?: number } = {}) {
  const hash = await createDocumentHash(file);
  const warnings: string[] = [];
  if (documentHashes.has(hash)) warnings.push('possible duplicate document');
  documentHashes.add(hash);

  const providerList: OcrProviderName[] = options.providers?.length ? options.providers : ['server-proxy', 'browser-tesseract', 'noop'];
  let lastError: unknown;

  for (const providerName of providerList) {
    const provider = providers.get(providerName);
    if (!provider) {
      warnings.push(`${providerName} provider not registered`);
      continue;
    }
    try {
      const result = await withTimeout(
        (signal) => extractDocumentText(file, { provider: provider.name, signal, retries: options.retries ?? 1 }),
        options.timeoutMs || 25000,
        options.signal
      );
      const confidence = normalizeConfidence(result);
      return {
        ...result,
        confidence,
        duplicateHash: hash,
        warnings: [...warnings, ...result.warnings, ...validateExtraction(result)],
      };
    } catch (error) {
      lastError = error;
      warnings.push(`${providerName} failed`);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('All OCR providers failed');
}

export function validateExtraction(result: OcrResult) {
  const text = result.pages.map((page) => page.text).join('\n');
  const warnings: string[] = [];
  if (text.trim().length < 30) warnings.push('low text extraction volume');
  if (/fake|edited|draft|unsigned/i.test(text)) warnings.push('invalid report heuristics matched');
  if (!/date|test|result|value|signature|engineer/i.test(text)) warnings.push('expected report fields not detected');
  return warnings;
}

export function prepareDocumentForOcr(file: File) {
  return {
    fileName: file.name,
    contentType: file.type,
    size: file.size,
    isPdf: file.type === 'application/pdf',
    isImage: file.type.startsWith('image/'),
    estimatedPages: file.type === 'application/pdf' ? undefined : 1,
  };
}
