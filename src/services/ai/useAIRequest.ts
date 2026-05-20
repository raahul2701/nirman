import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { aiRequestManager, type AiManagedRequest } from './aiRequestManager';

type AiStatus = 'idle' | 'loading' | 'success' | 'error';

export function useAIRequest<TArgs extends unknown[], TResult>(
  requestFactory: (...args: TArgs) => Omit<AiManagedRequest<TResult>, 'signal'>
) {
  const [status, setStatus] = useState<AiStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TResult | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const run = useCallback(async (...args: TArgs) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus('loading');
    setError(null);

    try {
      const result = await aiRequestManager.enqueue({ ...requestFactory(...args), signal: controller.signal });
      if (mountedRef.current) {
        setData(result);
        setStatus('success');
      }
      return result;
    } catch (nextError) {
      const normalized = nextError instanceof Error ? nextError : new Error('AI request failed');
      if (mountedRef.current && normalized.name !== 'AbortError') {
        setError(normalized);
        setStatus('error');
      }
      throw normalized;
    }
  }, [requestFactory]);

  return useMemo(() => ({
    cancel,
    data,
    error,
    loading: status === 'loading',
    run,
    status,
  }), [cancel, data, error, run, status]);
}
