import { logger } from './logger';
import { runtimeHealthMonitor } from './runtimeHealth';
import { sanitizeRequestPayload } from './requestSanitizer';

export interface TelemetryEvent {
  name: string;
  properties?: Record<string, unknown>;
  durationMs?: number;
  failed?: boolean;
}

export function trackEvent(event: TelemetryEvent) {
  if (event.durationMs !== undefined) {
    runtimeHealthMonitor.recordRequest(event.name, event.durationMs, event.failed);
  }

  if (event.failed) {
    logger.warn('Telemetry event failed', sanitizeRequestPayload({ name: event.name, ...event.properties }));
  } else {
    logger.debug('Telemetry event', sanitizeRequestPayload({ name: event.name, ...event.properties }));
  }
}

export async function measureAsync<T>(name: string, run: () => Promise<T>, properties?: Record<string, unknown>) {
  const started = performance.now();
  try {
    const result = await run();
    trackEvent({ name, properties, durationMs: performance.now() - started });
    return result;
  } catch (error) {
    trackEvent({ name, properties, durationMs: performance.now() - started, failed: true });
    throw error;
  }
}
