import { useEffect, useState } from 'react';
import { startOfflineSync } from '../services/offline/syncManager';
import { getPendingSyncItems } from '../services/offline/offlineDB';

export function useOfflineSync() {
  const [pendingSync, setPendingSync] = useState(0);
  const [status, setStatus] = useState<'synced' | 'pending' | 'failed'>('synced');

  useEffect(() => {
    const cleanup = startOfflineSync();
    async function refresh() {
      const items = await getPendingSyncItems();
      setPendingSync(items.length);
      setStatus(items.length > 0 ? 'pending' : 'synced');
    }
    refresh();
    const interval = window.setInterval(refresh, 30000);
    return () => {
      if (cleanup) cleanup();
      window.clearInterval(interval);
    };
  }, []);

  return { pendingSync, status };
}
