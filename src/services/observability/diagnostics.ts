import { trackEvent } from '../../lib/telemetry';
import { sanitizeRequestPayload } from '../../lib/requestSanitizer';

const sensitiveKeys = [/token/i, /secret/i, /password/i, /apikey/i, /api_key/i, /authorization/i];

export function safeDiagnosticsPayload(payload: Record<string, unknown>) {
  return sanitizeRequestPayload(
    Object.fromEntries(
      Object.entries(payload).map(([key, value]) => [
        key,
        sensitiveKeys.some((pattern) => pattern.test(key)) ? '[redacted]' : value,
      ]),
    ),
  );
}

export function trackCrash(error: unknown, context: Record<string, unknown> = {}) {
  trackEvent({
    name: 'runtime:crash',
    failed: true,
    properties: safeDiagnosticsPayload({
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.slice(0, 1000) : undefined,
      ...context,
    }),
  });
}

export function trackUploadDiagnostic(event: string, properties: Record<string, unknown>) {
  trackEvent({ name: `upload:${event}`, properties: safeDiagnosticsPayload(properties) });
}

export function trackOfflineDiagnostic(event: string, properties: Record<string, unknown>) {
  trackEvent({ name: `offline:${event}`, properties: safeDiagnosticsPayload(properties) });
}

export function trackAiTrace(event: string, properties: Record<string, unknown>) {
  trackEvent({ name: `ai-trace:${event}`, properties: safeDiagnosticsPayload(properties) });
}
