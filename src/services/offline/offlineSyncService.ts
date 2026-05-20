// Offline sync service with retry, dedup, and cleanup using existing offlineDB
import type { OfflinePayload } from './offlineDB';
import { addToSyncQueue, getPendingSyncItems, deleteSyncItem } from './offlineDB';

interface SyncConfig {
  maxRetries?: number;
  initialBackoff?: number; // ms
  maxBackoff?: number; // ms
  cleanupInterval?: number; // ms
}

const DEFAULT_CONFIG: SyncConfig = {
  maxRetries: 5,
  initialBackoff: 1000,
  maxBackoff: 30000,
  cleanupInterval: 60000, // 1 min
};

class OfflineSyncService {
  private config: SyncConfig;
  private syncInProgress = new Map<string, Promise<void>>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private retryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private syncHandlers = new Map<string, (item: OfflinePayload) => Promise<void>>();

  constructor(config: SyncConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async init(): Promise<void> {
    // Load existing items and try to sync
    this.startCleanupTimer();
    console.debug('[Sync] Initialized');
  }

  // Register handler for each entity type (table)
  registerHandler(table: string, handler: (item: OfflinePayload) => Promise<void>): void {
    this.syncHandlers.set(table, handler);
  }

  // Enqueue new operation (with dedup protection)
  async enqueue(table: string, action: string, payload: any): Promise<string> {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    
    const existing = await getPendingSyncItems();
    const payloadKey = String(payload?.id || payload?.clientId || '');
    const duplicate = payloadKey
      ? existing.find(e =>
          e.table === table &&
          e.action === action &&
          e.retryCount === 0 &&
          String(e.payload?.id || e.payload?.clientId || '') === payloadKey
        )
      : undefined;
    
    if (duplicate) {
      console.debug(`[Sync] Dedup prevented: ${table}:${action}`);
      return duplicate.id;
    }

    const item: OfflinePayload = {
      id,
      action,
      table,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    await addToSyncQueue(item);
    console.debug(`[Sync] Enqueued: ${id}`, item);

    // Trigger sync for this item
    void this.syncItem(id);

    return id;
  }

  // Sync a single item with retry and backoff
  async syncItem(itemId: string): Promise<void> {
    if (this.syncInProgress.has(itemId)) {
      return this.syncInProgress.get(itemId)!;
    }

    const promise = this._syncItemInternal(itemId);
    this.syncInProgress.set(itemId, promise);

    try {
      await promise;
    } finally {
      this.syncInProgress.delete(itemId);
    }
  }

  private async _syncItemInternal(itemId: string): Promise<void> {
    const items = await getPendingSyncItems();
    const item = items.find(i => i.id === itemId);
    
    if (!item) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const handler = this.syncHandlers.get(item.table);
    if (!handler) {
      console.error(`[Sync] No handler for table: ${item.table}`);
      return;
    }

    try {
      await handler(item);
      await deleteSyncItem(itemId);
      console.debug(`[Sync] Synced: ${itemId}`);
    } catch (error) {
      const nextRetry = item.retryCount + 1;
      const lastError = error instanceof Error ? error.message : String(error);

      if (nextRetry > (this.config.maxRetries || 5)) {
        console.error(`[Sync] Max retries exceeded: ${itemId}`, lastError);
      } else {
        const backoff = this.calculateBackoff(nextRetry, this.config);
        console.debug(`[Sync] Retry scheduled: ${itemId} in ${backoff}ms`);
        
        // Schedule retry
        const timer = setTimeout(() => {
          this.retryTimers.delete(itemId);
          void this._retryItem(itemId, nextRetry, lastError);
        }, backoff);
        this.retryTimers.set(itemId, timer);
      }
    }
  }

  private async _retryItem(itemId: string, retryCount: number, lastError: string): Promise<void> {
    const items = await getPendingSyncItems();
    const item = items.find(i => i.id === itemId);
    if (item) {
      await addToSyncQueue({
        ...item,
        retryCount,
        lastError,
      });
      await this.syncItem(itemId);
    }
  }

  private calculateBackoff(retries: number, config: SyncConfig): number {
    const exp = Math.min(retries, 5);
    const base = (config.initialBackoff || 1000) * Math.pow(2, exp);
    return Math.min(base, config.maxBackoff || 30000);
  }

  // Sync all pending items
  async syncAll(): Promise<void> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const items = await getPendingSyncItems();
    await Promise.all(items.map(i => this.syncItem(i.id)));
  }

  // Get queue status
  async getStatus(): Promise<{
    pending: number;
    syncing: number;
    synced: number;
    failed: number;
  }> {
    const items = await getPendingSyncItems();
    return {
      pending: items.length,
      syncing: this.syncInProgress.size,
      synced: 0,
      failed: items.filter(i => i.retryCount > (this.config.maxRetries || 5)).length,
    };
  }

  // Cleanup old synced items (older than 24h)
  private startCleanupTimer(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => this._cleanup(), this.config.cleanupInterval);
  }

  private async _cleanup(): Promise<void> {
    try {
      const items = await getPendingSyncItems();
      const now = new Date();
      const dayMs = 24 * 60 * 60 * 1000;

      for (const item of items) {
        const itemTime = new Date(item.createdAt).getTime();
        if (item.retryCount > (this.config.maxRetries || 5) && now.getTime() - itemTime > dayMs) {
          await deleteSyncItem(item.id);
          console.debug(`[Sync] Cleaned up: ${item.id}`);
        }
      }
    } catch (error) {
      console.error('[Sync] Cleanup error:', error);
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    for (const timer of this.retryTimers.values()) {
      clearTimeout(timer);
    }
    this.retryTimers.clear();
  }
}

export const offlineSyncService = new OfflineSyncService();
