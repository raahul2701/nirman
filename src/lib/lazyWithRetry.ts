import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const lazyReloadKey = 'nirman:lazy-reload';
const staleChunkPattern = /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|ChunkLoadError/i;

function isStaleChunkError(error: unknown): boolean {
  return error instanceof Error && staleChunkPattern.test(error.message);
}

function reloadOnceForStaleChunk(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const currentPath = window.location.pathname + window.location.search + window.location.hash;
  const previousPath = window.sessionStorage.getItem(lazyReloadKey);

  if (previousPath === currentPath) {
    window.sessionStorage.removeItem(lazyReloadKey);
    return;
  }

  window.sessionStorage.setItem(lazyReloadKey, currentPath);
  window.location.reload();
}

export function lazyWithRetry<T extends ComponentType<any>>(
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
          reloadOnceForStaleChunk();
        }

        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    }
    throw lastError;
  });
}

export function createLazyComponent<T extends ComponentType<any>, TModule extends Record<string, unknown>>(
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
