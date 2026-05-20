export type FieldEventPriority = 'low' | 'medium' | 'high' | 'critical';

export interface FieldEvent {
  id: string;
  type: 'sync' | 'ai-alert' | 'upload' | 'engineer-activity' | 'field-action' | 'geofence' | 'diesel' | 'material' | 'document';
  title: string;
  priority: FieldEventPriority;
  module?: string;
  projectId?: string;
  actorId?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

type Listener = (events: FieldEvent[]) => void;

const priorityRank: Record<FieldEventPriority, number> = { low: 1, medium: 2, high: 3, critical: 4 };

class FieldEventBus {
  private events: FieldEvent[] = [];
  private listeners = new Set<Listener>();
  private flushTimer: number | null = null;
  private maxEvents = 200;

  publish(event: Omit<FieldEvent, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) {
    const next: FieldEvent = {
      ...event,
      id: event.id || crypto.randomUUID(),
      createdAt: event.createdAt || new Date().toISOString(),
    };

    if (this.events.some((item) => item.id === next.id)) return next.id;
    this.events = [next, ...this.events].slice(0, this.maxEvents);
    this.scheduleFlush();
    return next.id;
  }

  getSnapshot(limit = 50) {
    return this.events
      .slice()
      .sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority] || b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  getPendingActions() {
    return this.events.filter((event) => event.type === 'field-action');
  }

  getPrioritizedAlerts() {
    return this.events.filter((event) => event.type === 'ai-alert' || event.priority === 'critical');
  }

  subscribe(listener: Listener, signal?: AbortSignal) {
    if (signal?.aborted) return () => {};
    this.listeners.add(listener);
    listener(this.getSnapshot());

    const unsubscribe = () => this.listeners.delete(listener);
    signal?.addEventListener('abort', unsubscribe, { once: true });
    return () => {
      signal?.removeEventListener('abort', unsubscribe);
      unsubscribe();
    };
  }

  private scheduleFlush() {
    if (this.flushTimer !== null) return;
    const delay = typeof document !== 'undefined' && document.hidden ? 5000 : 750;
    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = null;
      const snapshot = this.getSnapshot();
      this.listeners.forEach((listener) => listener(snapshot));
    }, delay);
  }
}

export const fieldEventBus = new FieldEventBus();

export function createSyncEvent(pending: number, syncing: number) {
  fieldEventBus.publish({
    type: 'sync',
    title: pending + syncing > 0 ? 'Offline sync pending' : 'All field data synced',
    priority: pending > 10 ? 'high' : pending > 0 ? 'medium' : 'low',
    module: 'offline-sync',
    payload: { pending, syncing },
  });
}
