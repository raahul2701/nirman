import { validateEnvironment } from './environment';

type Metric = { count: number; totalMs: number; failures: number };

class RuntimeHealthMonitor {
  private metrics = new Map<string, Metric>();
  private startedAt = Date.now();

  recordRequest(label: string, durationMs: number, failed = false) {
    const current = this.metrics.get(label) || { count: 0, totalMs: 0, failures: 0 };
    current.count += 1;
    current.totalMs += durationMs;
    if (failed) current.failures += 1;
    this.metrics.set(label, current);
  }

  snapshot() {
    const metrics = Array.from(this.metrics.entries()).map(([label, metric]) => ({
      label,
      count: metric.count,
      failures: metric.failures,
      avgMs: metric.count ? Math.round(metric.totalMs / metric.count) : 0,
    }));

    return {
      uptimeMs: Date.now() - this.startedAt,
      online: typeof navigator === 'undefined' ? true : navigator.onLine,
      environment: validateEnvironment(),
      metrics,
    };
  }
}

export const runtimeHealthMonitor = new RuntimeHealthMonitor();
