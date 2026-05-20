// Enhanced Hindrance service with offline support
import { hindranceRepository } from '../persistence/hindranceRepository';
import { offlineSyncService } from '../offline/offlineSyncService';
import { createOptimisticManager } from '../offline/optimisticUpdate';
import type { HindranceEntry } from '../../types/persistence';

const optimisticMgr = createOptimisticManager<HindranceEntry>();

export const hindranceService = {
  async createEntry(entry: HindranceEntry): Promise<HindranceEntry> {
    const opt = optimisticMgr.create(entry);

    await offlineSyncService.enqueue('hindrance_entries', 'CREATE', entry);

    return opt.value;
  },

  async listEntries(projectId: string, limit = 50, offset = 0) {
    try {
      const remote = await hindranceRepository.list(projectId, limit, offset);
      const local = optimisticMgr.getAll().filter(o => o.value.project_id === projectId);

      const merged = [
        ...local.filter(o => !o.syncedAt).map(o => o.value),
        ...remote.filter(r => !local.some(o => o.serverId === r.id)),
      ];

      return merged;
    } catch (error) {
      console.warn('[Hindrance] Offline mode:', error);
      return optimisticMgr
        .getAll()
        .filter(o => o.value.project_id === projectId)
        .map(o => o.value);
    }
  },

  subscribe(cb: () => void): () => void {
    return optimisticMgr.subscribe(cb);
  },

  async setupSync(): Promise<void> {
    offlineSyncService.registerHandler('hindrance_entries', async (item) => {
      const payload = item.payload as unknown as HindranceEntry;
      if (item.action === 'CREATE') {
        const created = await hindranceRepository.create(payload);
        if (payload.id && created.id) optimisticMgr.markSynced(payload.id, created.id);
      }
    });
  },
};
