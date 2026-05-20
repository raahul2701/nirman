const SECRET_PATTERNS = [
  /authorization/i,
  /apikey/i,
  /api[_-]?key/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /password/i,
  /secret/i,
];

export function maskToken(value: unknown) {
  if (typeof value !== 'string') return value;
  if (value.length <= 8) return '[masked]';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function sanitizeRequestPayload<T>(payload: T): T {
  if (!payload || typeof payload !== 'object') return payload;
  if (Array.isArray(payload)) return payload.map((item) => sanitizeRequestPayload(item)) as T;

  return Object.fromEntries(
    Object.entries(payload as Record<string, unknown>).map(([key, value]) => {
      if (SECRET_PATTERNS.some((pattern) => pattern.test(key))) return [key, maskToken(value)];
      return [key, sanitizeRequestPayload(value)];
    })
  ) as T;
}

export function hasSuspiciousPayload(payload: unknown) {
  const text = JSON.stringify(sanitizeRequestPayload(payload)).toLowerCase();
  return /<script|javascript:|onerror=|onload=|drop\s+table|union\s+select/.test(text);
}

export function assertSafePayload(payload: unknown) {
  if (hasSuspiciousPayload(payload)) {
    throw new Error('Suspicious payload rejected');
  }
}
