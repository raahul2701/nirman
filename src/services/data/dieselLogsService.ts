// Enhanced Diesel Logs service with offline support
import { dieselLogsRepository } from '../persistence/dieselLogsRepository';
import { offlineSyncService } from '../offline/offlineSyncService';
import { createOptimisticManager } from '../offline/optimisticUpdate';
import type { DieselIssueLog } from '../../types/persistence';

const optimisticMgr = createOptimisticManager<DieselIssueLog>();

export const dieselLogsService = {
  async createLog(log: DieselIssueLog): Promise<DieselIssueLog> {
    const opt = optimisticMgr.create(log);

    await offlineSyncService.enqueue('diesel_issue_logs', 'CREATE', log);

    return opt.value;
  },

  async listLogs(projectId: string, limit = 50, offset = 0) {
    try {
      const remote = await dieselLogsRepository.list(projectId, limit, offset);
      const local = optimisticMgr.getAll().filter(o => o.value.project_id === projectId);

      const merged = [
        ...local.filter(o => !o.syncedAt).map(o => o.value),
        ...remote.filter(r => !local.some(o => o.serverId === r.id)),
      ];

      return merged;
    } catch (error) {
      console.warn('[Diesel] Offline mode:', error);
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
    offlineSyncService.registerHandler('diesel_issue_logs', async (item) => {
      const payload = item.payload as unknown as DieselIssueLog;
      if (item.action === 'CREATE') {
        const created = await dieselLogsRepository.create(payload);
        if (payload.id && created.id) optimisticMgr.markSynced(payload.id, created.id);
      }
    });
  },
};
