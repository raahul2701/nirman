import { trackEvent } from '../../lib/telemetry';
import { sanitizeRequestPayload } from '../../lib/requestSanitizer';

export interface AiAuditEntry {
  workflow: string;
  model?: string;
  promptPreview?: string;
  status: 'queued' | 'completed' | 'failed' | 'cancelled';
  metadata?: Record<string, unknown>;
}

export function auditAiRequest(entry: AiAuditEntry) {
  trackEvent({
    name: `ai-audit:${entry.workflow}`,
    failed: entry.status === 'failed',
    properties: sanitizeRequestPayload({
      model: entry.model,
      status: entry.status,
      promptPreview: entry.promptPreview?.slice(0, 160),
      metadata: entry.metadata,
    }),
  });
}
