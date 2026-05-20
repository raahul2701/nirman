// Enhanced GIS Pins service with offline support
import { gisPinsRepository } from '../persistence/gisPinsRepository';
import { offlineSyncService } from '../offline/offlineSyncService';
import { createOptimisticManager } from '../offline/optimisticUpdate';
import type { GisSitePin } from '../../types/persistence';

const optimisticMgr = createOptimisticManager<GisSitePin>();

export const gisPinsService = {
  async createPin(pin: GisSitePin): Promise<GisSitePin> {
    const opt = optimisticMgr.create(pin);

    await offlineSyncService.enqueue('gis_site_pins', 'CREATE', pin);

    return opt.value;
  },

  async listPins(projectId: string, limit = 50, offset = 0) {
    try {
      const remote = await gisPinsRepository.list(projectId, limit, offset);
      const local = optimisticMgr.getAll().filter(o => o.value.project_id === projectId);

      const merged = [
        ...local.filter(o => !o.syncedAt).map(o => o.value),
        ...remote.filter(r => !local.some(o => o.serverId === r.id)),
      ];

      return merged;
    } catch (error) {
      console.warn('[GIS] Offline mode:', error);
      return optimisticMgr
        .getAll()
        .filter(o => o.value.project_id === projectId)
        .map(o => o.value);
    }
  },

  async updatePin(id: string, patch: Partial<GisSitePin>): Promise<void> {
    optimisticMgr.update(id, patch);

    await offlineSyncService.enqueue('gis_site_pins', 'UPDATE', {
      id,
      ...patch,
    });
  },

  subscribe(cb: () => void): () => void {
    return optimisticMgr.subscribe(cb);
  },

  async setupSync(): Promise<void> {
    offlineSyncService.registerHandler('gis_site_pins', async (item) => {
      const payload = item.payload as unknown as GisSitePin;
      if (item.action === 'CREATE') {
        const created = await gisPinsRepository.create(payload);
        if (payload.id && created.id) optimisticMgr.markSynced(payload.id, created.id);
      } else if (item.action === 'UPDATE') {
        if (payload.id) await gisPinsRepository.update(payload.id, payload);
      }
    });
  },
};
