// Enhanced Material Reports service with offline support
import { materialReportsRepository } from '../persistence/materialReportsRepository';
import { offlineSyncService } from '../offline/offlineSyncService';
import { createOptimisticManager } from '../offline/optimisticUpdate';
import type { MaterialAIReport } from '../../types/persistence';

const optimisticMgr = createOptimisticManager<MaterialAIReport>();

export const materialReportsService = {
  // Create with optimistic update
  async createReport(report: MaterialAIReport): Promise<MaterialAIReport> {
    // Add to optimistic state immediately
    const opt = optimisticMgr.create(report);

    // Enqueue sync
    await offlineSyncService.enqueue(
      'material_ai_reports',
      'CREATE',
      report
    );

    // Return optimistic value immediately
    return opt.value;
  },

  // List with optimistic values merged
  async listReports(projectId: string, limit = 20, offset = 0) {
    try {
      const remote = await materialReportsRepository.list(projectId, limit, offset);
      const local = optimisticMgr.getAll().filter(o => o.value.project_id === projectId);

      // Merge: local optimistic values + remote synced values
      const merged = [
        ...local.filter(o => !o.syncedAt).map(o => o.value), // Pending
        ...remote.filter(r => !local.some(o => o.serverId === r.id)),
      ];

      return merged;
    } catch (error) {
      // Offline fallback: return only optimistic values
      console.warn('[Material] Offline mode:', error);
      return optimisticMgr
        .getAll()
        .filter(o => o.value.project_id === projectId)
        .map(o => o.value);
    }
  },

  // Get single report
  async getReport(id: string): Promise<MaterialAIReport | undefined> {
    const local = optimisticMgr.get(id);
    if (local?.value) return local.value;

    try {
      const remote = await materialReportsRepository.list('', 100, 0);
      return remote.find(r => r.id === id);
    } catch {
      return undefined;
    }
  },

  // Update
  async updateReport(id: string, patch: Partial<MaterialAIReport>): Promise<void> {
    optimisticMgr.update(id, patch);

    await offlineSyncService.enqueue('material_ai_reports', 'UPDATE', {
      id,
      ...patch,
    });
  },

  // Subscribe to optimistic updates
  subscribe(cb: () => void): () => void {
    return optimisticMgr.subscribe(cb);
  },

  // Register sync handler (call on app init)
  async setupSync(): Promise<void> {
    offlineSyncService.registerHandler('material_ai_reports', async (item) => {
      const payload = item.payload as unknown as MaterialAIReport;
      if (item.action === 'CREATE') {
        const created = await materialReportsRepository.create(payload);
        if (payload.id && created.id) optimisticMgr.markSynced(payload.id, created.id);
      } else if (item.action === 'UPDATE') {
        if (payload.id) await materialReportsRepository.update(payload.id, payload);
      }
    });
  },
};
