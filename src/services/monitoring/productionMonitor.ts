import { supabase } from '../../lib/supabase';
import { measureAsync, trackEvent } from '../../lib/telemetry';
import { offlineSyncService } from '../offline/offlineSyncService';
import { safeDiagnosticsPayload } from '../observability/diagnostics';

const MONITOR_INTERVAL_MS = 5 * 60 * 1000;

class ProductionMonitor {
  private timer: number | null = null;

  start() {
    if (this.timer || typeof window === 'undefined') return;
    const startWhenIdle = window.requestIdleCallback || ((callback: IdleRequestCallback) => window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 1500));
    startWhenIdle(() => {
      void this.collect();
      this.timer = window.setInterval(() => void this.collect(), MONITOR_INTERVAL_MS);
    });
  }

  stop() {
    if (!this.timer) return;
    window.clearInterval(this.timer);
    this.timer = null;
  }

  async collect() {
    await Promise.allSettled([
      this.measureDatabaseHealth(),
      this.measureOfflineSyncHealth(),
      this.measureStorageHealth(),
      this.measureAiProxyHealth(),
      this.measureWebVitals(),
    ]);
  }

  private async measureDatabaseHealth() {
    await measureAsync('monitor:db-latency', async () => {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (error && !['42501', 'PGRST301'].includes(error.code || '')) throw error;
    });
  }

  private async measureOfflineSyncHealth() {
    const status = await offlineSyncService.getStatus();
    trackEvent({ name: 'monitor:offline-sync-health', failed: status.failed > 0, properties: status });
  }

  private async measureStorageHealth() {
    await measureAsync('monitor:storage-latency', async () => {
      const { error } = await supabase.storage.listBuckets();
      if (error && !/permission|authorized/i.test(error.message)) throw error;
    });
  }

  private async measureAiProxyHealth() {
    try {
      const { data, error } = await supabase.functions.invoke('health', { body: { check: 'ai-proxy' } });
      trackEvent({
        name: 'monitor:ai-proxy-health',
        failed: Boolean(error || data?.ok === false),
        properties: safeDiagnosticsPayload({ error: error?.message, status: data?.status }),
      });
    } catch (error) {
      trackEvent({ name: 'monitor:ai-proxy-health', failed: true, properties: safeDiagnosticsPayload({ message: error instanceof Error ? error.message : 'unknown' }) });
    }
  }

  private async measureWebVitals() {
    if (!('performance' in window)) return;
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (navigation) {
      trackEvent({
        name: 'monitor:web-startup',
        durationMs: navigation.loadEventEnd || navigation.domContentLoadedEventEnd,
        properties: {
          transferSize: navigation.transferSize,
          encodedBodySize: navigation.encodedBodySize,
        },
      });
    }
  }
}

export const productionMonitor = new ProductionMonitor();

