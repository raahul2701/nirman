// Enhanced Budget Sessions service with offline support
import { budgetSessionsRepository } from '../persistence/budgetSessionsRepository';
import { offlineSyncService } from '../offline/offlineSyncService';
import { createOptimisticManager } from '../offline/optimisticUpdate';
import type { BudgetAnalyticsSession } from '../../types/persistence';

const optimisticMgr = createOptimisticManager<BudgetAnalyticsSession>();

export const budgetSessionsService = {
  async createSession(session: BudgetAnalyticsSession): Promise<BudgetAnalyticsSession> {
    const opt = optimisticMgr.create(session);

    await offlineSyncService.enqueue('budget_analytics_sessions', 'CREATE', session);

    return opt.value;
  },

  async listSessions(projectId: string, limit = 20, offset = 0) {
    try {
      const remote = await budgetSessionsRepository.list(projectId, limit, offset);
      const local = optimisticMgr.getAll().filter(o => o.value.project_id === projectId);

      const merged = [
        ...local.filter(o => !o.syncedAt).map(o => o.value),
        ...remote.filter(r => !local.some(o => o.serverId === r.id)),
      ];

      return merged;
    } catch (error) {
      console.warn('[Budget] Offline mode:', error);
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
    offlineSyncService.registerHandler('budget_analytics_sessions', async (item) => {
      const payload = item.payload as unknown as BudgetAnalyticsSession;
      if (item.action === 'CREATE') {
        const created = await budgetSessionsRepository.create(payload);
        if (payload.id && created.id) optimisticMgr.markSynced(payload.id, created.id);
      }
    });
  },
};
