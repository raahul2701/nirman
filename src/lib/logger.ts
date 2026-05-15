import { supabase } from './supabase';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: JsonObject;
  userId?: string;
  timestamp?: string;
  stack?: string;
  url?: string;
  userAgent?: string;
}

const ENABLE_REMOTE_LOGS = import.meta.env.VITE_ENABLE_REMOTE_LOGS === 'true';
const ENABLE_CONSOLE_LOGS = import.meta.env.VITE_ENABLE_LOGGER_CONSOLE === 'true';
const MAX_CONTEXT_DEPTH = 5;
const MAX_ARRAY_ITEMS = 50;
const MAX_OBJECT_KEYS = 50;
const MAX_STRING_LENGTH = 2000;

function truncateString(value: string): string {
  return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...` : value;
}

function sanitizeJson(value: unknown, seen = new WeakSet<object>(), depth = 0): JsonValue | undefined {
  if (value === null) return null;

  switch (typeof value) {
    case 'string':
      return truncateString(value);
    case 'number':
      return Number.isFinite(value) ? value : String(value);
    case 'boolean':
      return value;
    case 'bigint':
      return value.toString();
    case 'undefined':
    case 'function':
    case 'symbol':
      return undefined;
    case 'object':
      break;
    default:
      return String(value);
  }

  if (depth >= MAX_CONTEXT_DEPTH) {
    return '[MaxDepth]';
  }

  if (value instanceof Error) {
    const errorPayload: JsonObject = {
      name: value.name,
      message: value.message,
    };
    if (value.stack) errorPayload.stack = truncateString(value.stack);
    if ('cause' in value) {
      const cause = sanitizeJson(value.cause, seen, depth + 1);
      if (cause !== undefined) errorPayload.cause = cause;
    }
    return errorPayload;
  }

  if (value instanceof Date) return value.toISOString();
  if (value instanceof URL) return value.toString();
  if (value instanceof Event) return value.type;

  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeJson(item, seen, depth + 1) ?? null);
  }

  const output: JsonObject = {};
  for (const [key, item] of Object.entries(value).slice(0, MAX_OBJECT_KEYS)) {
    const sanitized = sanitizeJson(item, seen, depth + 1);
    if (sanitized !== undefined) {
      output[key] = sanitized;
    }
  }
  return output;
}

function sanitizeContext(context?: Record<string, unknown>): JsonObject | undefined {
  if (!context) return undefined;
  const sanitized = sanitizeJson(context);
  return sanitized && !Array.isArray(sanitized) && typeof sanitized === 'object' ? sanitized : undefined;
}

function summarizePayload(payload: unknown): string | undefined {
  const sanitized = sanitizeJson(payload);
  if (sanitized === undefined) return undefined;
  return truncateString(JSON.stringify(sanitized));
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private constructor() {
    // Setup global error handlers
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.error('Global error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled promise rejection', {
          reason: event.reason,
          stack: event.reason?.stack
        });
      });
    }
  }

  private async persistLog(entry: LogEntry): Promise<void> {
    if (!ENABLE_REMOTE_LOGS) return;

    try {
      const payload: Record<string, JsonValue | string> = {
        level: entry.level,
        message: entry.message,
        created_at: entry.timestamp || new Date().toISOString()
      };

      if (entry.context) payload.context = entry.context;
      if (entry.userId) payload.user_id = entry.userId;
      if (entry.url) payload.url = entry.url;
      if (entry.userAgent) payload.user_agent = entry.userAgent;
      if (entry.stack) payload.stack = entry.stack;

      await supabase.from('error_logs').insert(payload);
    } catch (error) {
      if (ENABLE_CONSOLE_LOGS) {
        console.warn('Failed to persist log:', sanitizeJson(error));
      }
    }
  }

  private addLog(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      context: sanitizeContext(context),
      userId: undefined,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      stack: new Error().stack
    };

    // Add to in-memory logs
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Persist asynchronously
    void this.persistLog(entry);

    // Console output for development
    if (ENABLE_CONSOLE_LOGS) {
      const consoleMethod = level === LogLevel.ERROR || level === LogLevel.CRITICAL ? 'error' :
                           level === LogLevel.WARN ? 'warn' : 'log';
      console[consoleMethod](`[${level.toUpperCase()}] ${message}`, entry.context || '');
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.addLog(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.addLog(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.addLog(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.addLog(LogLevel.ERROR, message, context);
  }

  critical(message: string, context?: Record<string, unknown>): void {
    this.addLog(LogLevel.CRITICAL, message, context);
  }

  // Network error logging
  logNetworkError(error: unknown, url: string, method: string): void {
    const err = typeof error === 'object' && error !== null ? error as Record<string, unknown> : undefined;
    const response = err && 'response' in err ? (err as { response?: { data?: unknown } }).response?.data : undefined;

    this.error('Network request failed', {
      url,
      method,
      status: err && 'status' in err ? (err as { status?: number }).status : undefined,
      statusText: err && 'statusText' in err ? (err as { statusText?: string }).statusText : undefined,
      response
    });
  }

  // Supabase error logging
  logSupabaseError(error: unknown, operation: string): void {
    const err = typeof error === 'object' && error !== null ? error as Record<string, unknown> : undefined;

    this.error('Supabase operation failed', {
      operation,
      code: err && 'code' in err ? (err as { code?: string }).code : undefined,
      message: err && 'message' in err ? (err as { message?: string }).message : undefined,
      details: err && 'details' in err ? (err as { details?: unknown }).details : undefined,
      hint: err && 'hint' in err ? (err as { hint?: unknown }).hint : undefined
    });
  }

  // AI error logging
  logAIError(error: unknown, functionName: string, input?: unknown): void {
    const err = error instanceof Error ? error : undefined;

    this.error('AI function failed', {
      functionName,
      input: summarizePayload(input),
      error: err?.message ?? (typeof error === 'string' ? error : undefined),
      stack: err?.stack
    });
  }

  // Edge function error logging
  logEdgeFunctionError(error: unknown, functionName: string, payload?: unknown): void {
    const err = error instanceof Error ? error : undefined;

    this.error('Edge function failed', {
      functionName,
      payload: summarizePayload(payload),
      error: err?.message ?? (typeof error === 'string' ? error : undefined)
    });
  }

  // Get recent logs (for debugging)
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
  }
}

export const logger = Logger.getInstance();
