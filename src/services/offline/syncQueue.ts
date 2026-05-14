import { addToSyncQueue, deleteSyncItem, getPendingSyncItems } from './offlineDB';

export async function queueSyncAction(action: string, table: string, payload: Record<string, unknown>) {
  await addToSyncQueue({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    action,
    table,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  });
}

export async function getSyncQueue() {
  return getPendingSyncItems();
}

export async function removeSyncedItem(id: string) {
  await deleteSyncItem(id);
}

export async function incrementRetry(id: string, current: number, lastError?: string) {
  const items = await getPendingSyncItems();
  const item = items.find((entry) => entry.id === id);
  if (!item) return;
  await addToSyncQueue({ ...item, retryCount: current + 1, lastError, createdAt: item.createdAt });
}
