import { useEffect, useState } from 'react';
import { startOfflineSync } from '../services/offline/syncManager';
import { getPendingSyncItems } from '../services/offline/offlineDB';

export function useOfflineSync() {
  const [pendingSync, setPendingSync] = useState(0);
  const [status, setStatus] = useState<'synced' | 'pending' | 'failed'>('synced');

  useEffect(() => {
    let stopSync: (() => void) | undefined;
    let mounted = true;
    let lastCount = 0;
    let lastStatus: typeof status = 'synced';

    async function refresh() {
      if (!mounted) return;

      try {
        const items = await getPendingSyncItems();
        if (!mounted) return;

        const count = items.length;
        const nextStatus = count > 0 ? 'pending' : 'synced';

        if (count !== lastCount) {
          lastCount = count;
          setPendingSync(count);
        }

        if (nextStatus !== lastStatus) {
          lastStatus = nextStatus;
          setStatus(nextStatus);
        }
      } catch {
        if (!mounted || lastStatus === 'failed') return;
        lastStatus = 'failed';
        setStatus('failed');
      }
    }

    const deferredStart = () => {
      const offlineCleanup = startOfflineSync();
      void refresh();
      const interval = window.setInterval(refresh, 30000);
      stopSync = () => {
        offlineCleanup?.();
        window.clearInterval(interval);
      };
    };

    const timerId = window.requestIdleCallback
      ? window.requestIdleCallback(deferredStart, { timeout: 3000 })
      : window.setTimeout(deferredStart, 1500);

    return () => {
      mounted = false;
      if (typeof timerId === 'number') {
        window.cancelIdleCallback?.(timerId);
        window.clearTimeout(timerId);
      }
      stopSync?.();
    };
  }, []);

  return { pendingSync, status };
}
