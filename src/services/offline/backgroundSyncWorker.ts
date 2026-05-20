// Background sync worker - manages offline queue periodically
import { offlineSyncService } from '../offline/offlineSyncService';

export class BackgroundSyncWorker {
  private intervalId: number | null = null;
  private isRunning = false;
  private intervalMs = 30000;
  private hiddenIntervalMs = 120000;
  private syncPromise: Promise<void> | null = null;
  private handleOnline = () => { void this.sync(); };
  private handleOffline = () => this.pause();
  private handleVisibilityChange = () => this.restartTimer();

  async start(intervalMs = 30000): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalMs = intervalMs;
    console.debug('[BackgroundSync] Worker started');

    // Initial sync
    void this.sync();

    // Periodic sync
    this.restartTimer();

    // Listen to online event
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private async sync(): Promise<void> {
    if (this.syncPromise) return this.syncPromise;
    if (!navigator.onLine) {
      console.debug('[BackgroundSync] Offline, skipping sync');
      return;
    }

    this.syncPromise = (async () => {
      console.debug('[BackgroundSync] Syncing queue...');
      await offlineSyncService.syncAll();
    })();

    try {
      await this.syncPromise;
    } catch (error) {
      console.error('[BackgroundSync] Sync error:', error);
    } finally {
      this.syncPromise = null;
    }
  }

  private pause(): void {
    console.debug('[BackgroundSync] Paused (offline)');
  }

  private restartTimer(): void {
    if (!this.isRunning) return;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
    const delay = document.hidden ? this.hiddenIntervalMs : this.intervalMs;
    this.intervalId = window.setInterval(() => { void this.sync(); }, delay);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.isRunning = false;
    console.debug('[BackgroundSync] Worker stopped');
  }
}

export const backgroundSyncWorker = new BackgroundSyncWorker();
