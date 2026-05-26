import { logger } from '../../lib/logger';
import { measureAsync } from '../../lib/telemetry';

export interface AiManagedRequest<T> {
  run: (signal: AbortSignal) => Promise<T>;
  label?: string;
  retries?: number;
  timeoutMs?: number;
  retryBaseDelayMs?: number;
  signal?: AbortSignal;
}

export class AiRequestError extends Error {
  status?: number;
  retryable: boolean;

  constructor(message: string, options: { status?: number; retryable?: boolean } = {}) {
    super(message);
    this.name = 'AiRequestError';
    this.status = options.status;
    this.retryable = options.retryable ?? false;
  }
}

type QueueTask = {
  execute: () => void;
  reject: (error: unknown) => void;
  signal?: AbortSignal;
  cleanup?: () => void;
};

const DEFAULT_TIMEOUT_MS = 30000;
const MAX_CONCURRENT_REQUESTS = 2;

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

function isOffline() {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

function getRetryDelay(error: unknown, attempt: number, baseDelayMs: number) {
  if (error instanceof AiRequestError && error.status === 429) {
    return Math.min(baseDelayMs * 2 ** attempt + 1000, 10000);
  }

  return Math.min(baseDelayMs * 2 ** attempt, 8000);
}

function createLinkedController(externalSignal?: AbortSignal) {
  const controller = new AbortController();
  let cleanup = () => {};

  if (externalSignal?.aborted) {
    controller.abort(externalSignal.reason);
  } else if (externalSignal) {
    const abortLinkedRequest = () => controller.abort(externalSignal.reason);
    externalSignal.addEventListener('abort', abortLinkedRequest, { once: true });
    cleanup = () => externalSignal.removeEventListener('abort', abortLinkedRequest);
  }

  return { controller, cleanup };
}

class AiRequestManager {
  private activeCount = 0;
  private queue: QueueTask[] = [];

  enqueue<T>(request: AiManagedRequest<T>): Promise<T> {
    if (isOffline()) {
      return Promise.reject(new AiRequestError('AI is unavailable while offline', { retryable: true }));
    }

    return new Promise<T>((resolve, reject) => {
      const task: QueueTask = {
        signal: request.signal,
        reject,
        execute: () => {
          this.runNow(request).then(resolve, reject).finally(() => {
            task.cleanup?.();
            this.activeCount -= 1;
            this.pump();
          });
        },
      };

      if (request.signal?.aborted) {
        reject(new DOMException('AI request cancelled', 'AbortError'));
        return;
      }

      this.queue.push(task);
      if (request.signal) {
        const cancelQueuedRequest = () => {
          const index = this.queue.indexOf(task);
          if (index >= 0) {
            this.queue.splice(index, 1);
            reject(new DOMException('AI request cancelled', 'AbortError'));
          }
        };
        request.signal.addEventListener('abort', cancelQueuedRequest, { once: true });
        task.cleanup = () => request.signal?.removeEventListener('abort', cancelQueuedRequest);
      }
      this.pump();
    });
  }

  private pump() {
    while (this.activeCount < MAX_CONCURRENT_REQUESTS && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) return;

      if (task.signal?.aborted) {
        task.cleanup?.();
        task.reject(new DOMException('AI request cancelled', 'AbortError'));
        continue;
      }

      this.activeCount += 1;
      task.execute();
    }
  }

  private async runNow<T>({
    run,
    label = 'ai-request',
    retries = 2,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retryBaseDelayMs = 600,
    signal,
  }: AiManagedRequest<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const { controller, cleanup } = createLinkedController(signal);
      const timeout = window.setTimeout(() => controller.abort(new Error('AI request timed out')), timeoutMs);

      try {
        const result = await measureAsync(`ai:${label}`, () => run(controller.signal), { attempt });
        logger.info('AI request completed', { label, attempt });
        return result;
      } catch (error) {
        lastError = error;

        if (isAbortError(error) || signal?.aborted) {
          logger.warn('AI request cancelled', { label });
          throw error;
        }

        const retryable =
          error instanceof AiRequestError
            ? error.retryable || error.status === 429 || (error.status !== undefined && error.status >= 500)
            : true;

        logger.warn('AI request failed', {
          label,
          attempt,
          retryable,
          status: error instanceof AiRequestError ? error.status : undefined,
          message: error instanceof Error ? error.message : 'Unknown AI error',
        });

        if (!retryable || attempt >= retries || isOffline()) {
          break;
        }

        await new Promise((resolve) => window.setTimeout(resolve, getRetryDelay(error, attempt, retryBaseDelayMs)));
      } finally {
        window.clearTimeout(timeout);
        cleanup();
      }
    }

    throw lastError instanceof Error ? lastError : new AiRequestError('AI request failed');
  }
}

export const aiRequestManager = new AiRequestManager();
