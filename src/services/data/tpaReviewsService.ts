// Enhanced TPA Reviews service with offline support
import { tpaReviewsRepository } from '../persistence/tpaReviewsRepository';
import { offlineSyncService } from '../offline/offlineSyncService';
import { createOptimisticManager } from '../offline/optimisticUpdate';
import type { TpaUploadReview } from '../../types/persistence';

const optimisticMgr = createOptimisticManager<TpaUploadReview>();

export const tpaReviewsService = {
  async createReview(review: TpaUploadReview): Promise<TpaUploadReview> {
    const opt = optimisticMgr.create(review);

    await offlineSyncService.enqueue('tpa_upload_reviews', 'CREATE', review);

    return opt.value;
  },

  async listForUpload(uploadId: string) {
    try {
      const remote = await tpaReviewsRepository.listForUpload(uploadId);
      const local = optimisticMgr.getAll().filter(o => o.value.upload_id === uploadId);

      const merged = [
        ...local.filter(o => !o.syncedAt).map(o => o.value),
        ...remote.filter(r => !local.some(o => o.serverId === r.id)),
      ];

      return merged;
    } catch (error) {
      console.warn('[TPA] Offline mode:', error);
      return optimisticMgr
        .getAll()
        .filter(o => o.value.upload_id === uploadId)
        .map(o => o.value);
    }
  },

  subscribe(cb: () => void): () => void {
    return optimisticMgr.subscribe(cb);
  },

  async setupSync(): Promise<void> {
    offlineSyncService.registerHandler('tpa_upload_reviews', async (item) => {
      const payload = item.payload as unknown as TpaUploadReview;
      if (item.action === 'CREATE') {
        const created = await tpaReviewsRepository.create(payload);
        if (payload.id && created.id) optimisticMgr.markSynced(payload.id, created.id);
      }
    });
  },
};
