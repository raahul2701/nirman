// Optimistic UI update helper - manages local state before sync
interface OptimisticValue<T> {
  localId: string; // Temp ID before server response
  value: T;
  createdAt: number;
  syncedAt?: number;
  serverId?: string;
}

export class OptimisticUpdateManager<T extends { id?: string }> {
  private local = new Map<string, OptimisticValue<T>>();
  private listeners = new Set<() => void>();

  // Create with temp ID
  create(value: T, tempId?: string): OptimisticValue<T> {
    const localId = tempId || `temp-${Date.now()}-${Math.random()}`;
    const opt: OptimisticValue<T> = {
      localId,
      value: { ...value, id: localId },
      createdAt: Date.now(),
    };
    this.local.set(localId, opt);
    this.notify();
    return opt;
  }

  // Update with optimistic response
  update(localId: string, changes: Partial<T>): void {
    const opt = this.local.get(localId);
    if (opt) {
      opt.value = { ...opt.value, ...changes };
      this.notify();
    }
  }

  // Mark as synced with server ID
  markSynced(localId: string, serverId: string): void {
    const opt = this.local.get(localId);
    if (opt) {
      opt.syncedAt = Date.now();
      opt.serverId = serverId;
      // Optionally remove temp ID after sync confirmed
    }
    this.notify();
  }

  // Get all optimistic values
  getAll(): OptimisticValue<T>[] {
    return Array.from(this.local.values());
  }

  // Get by local ID
  get(localId: string): OptimisticValue<T> | undefined {
    return this.local.get(localId);
  }

  // Remove after confirmed sync
  remove(localId: string): void {
    this.local.delete(localId);
    this.notify();
  }

  // Clear all
  clear(): void {
    this.local.clear();
    this.notify();
  }

  // Subscribe to changes
  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach(cb => cb());
  }
}

// Factory to create manager per feature
export function createOptimisticManager<T extends { id?: string }>(): OptimisticUpdateManager<T> {
  return new OptimisticUpdateManager();
}
