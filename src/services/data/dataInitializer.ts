// Initialize all data services on app startup
import { offlineSyncService } from '../offline/offlineSyncService';
import { backgroundSyncWorker } from '../offline/backgroundSyncWorker';
import { mobileCameraOptimizer } from '../mobile/mobileCameraOptimizer';
import { materialReportsService } from './materialReportsService';
import { gisPinsService } from './gisPinsService';
import { budgetSessionsService } from './budgetSessionsService';
import { tpaReviewsService } from './tpaReviewsService';
import { hindranceService } from './hindranceService';
import { dieselLogsService } from './dieselLogsService';

let initialized = false;

const debugLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.debug(...args);
};

export async function initializeDataServices(): Promise<void> {
  if (initialized) return;

  try {
    // Init offline sync
    await offlineSyncService.init();
    debugLog('[Data] Offline sync initialized');

    // Register all handlers
    await Promise.all([
      materialReportsService.setupSync(),
      gisPinsService.setupSync(),
      budgetSessionsService.setupSync(),
      tpaReviewsService.setupSync(),
      hindranceService.setupSync(),
      dieselLogsService.setupSync(),
    ]);
    debugLog('[Data] Sync handlers registered');

    // Try sync pending items
    void offlineSyncService.syncAll().catch(e => console.error('[Data] Initial sync error:', e));

    // Start background sync worker
    await backgroundSyncWorker.start(30000); // Sync every 30s
    debugLog('[Data] Background sync worker started');

    initialized = true;
  } catch (error) {
    console.error('[Data] Initialization failed:', error);
    throw error;
  }
}

export function isDataServicesReady(): boolean {
  return initialized;
}

export function destroyDataServices(): void {
  backgroundSyncWorker.stop();
  offlineSyncService.destroy();
  mobileCameraOptimizer.clearPreviewCache();
  initialized = false;
}
