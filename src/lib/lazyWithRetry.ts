import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const staleChunkPattern = /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|ChunkLoadError/i;

function isStaleChunkError(error: unknown): boolean {
  return error instanceof Error && staleChunkPattern.test(error.message);
}

function notifyStaleChunk(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('nirman:stale-assets'));
}

export function lazyWithRetry<T extends ComponentType<object>>(
  factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await factory();
      } catch (error) {
        lastError = error;
        if (isStaleChunkError(error)) {
          notifyStaleChunk();
        }

        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    }
    throw lastError;
  });
}

export function createLazyComponent<T extends ComponentType<object>, TModule extends Record<string, unknown>>(
  factory: () => Promise<TModule>,
  exportName: keyof TModule
): LazyExoticComponent<T> {
  return lazyWithRetry(async () => {
    const mod = await factory();
    const component = mod.default ?? mod[exportName];

    if (!component) {
      throw new Error(`Lazy component export "${String(exportName)}" was not found`);
    }

    return { default: component as T };
  });
}
