import { supabase } from './supabase';

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
  context?: Record<string, any>;
  userId?: string;
  timestamp?: string;
  stack?: string;
  url?: string;
  userAgent?: string;
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
    try {
      // Store in Supabase for persistence
      await supabase.from('error_logs').insert({
        level: entry.level,
        message: entry.message,
        context: entry.context,
        user_id: entry.userId,
        url: entry.url,
        user_agent: entry.userAgent,
        stack: entry.stack,
        created_at: entry.timestamp || new Date().toISOString()
      });
    } catch (error) {
      // Fallback to console if Supabase fails
      console.error('Failed to persist log:', error);
    }
  }

  private addLog(level: LogLevel, message: string, context?: Record<string, any>): void {
    const entry: LogEntry = {
      level,
      message,
      context,
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
    this.persistLog(entry);

    // Console output for development
    const consoleMethod = level === LogLevel.ERROR || level === LogLevel.CRITICAL ? 'error' :
                         level === LogLevel.WARN ? 'warn' : 'log';
    console[consoleMethod](`[${level.toUpperCase()}] ${message}`, context || '');
  }

  debug(message: string, context?: Record<string, any>): void {
    this.addLog(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.addLog(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.addLog(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, any>): void {
    this.addLog(LogLevel.ERROR, message, context);
  }

  critical(message: string, context?: Record<string, any>): void {
    this.addLog(LogLevel.CRITICAL, message, context);
  }

  // Network error logging
  logNetworkError(error: any, url: string, method: string): void {
    this.error('Network request failed', {
      url,
      method,
      status: error.status,
      statusText: error.statusText,
      response: error.response?.data
    });
  }

  // Supabase error logging
  logSupabaseError(error: any, operation: string): void {
    this.error('Supabase operation failed', {
      operation,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
  }

  // AI error logging
  logAIError(error: any, functionName: string, input?: any): void {
    this.error('AI function failed', {
      functionName,
      input: input ? JSON.stringify(input).slice(0, 500) : undefined,
      error: error.message,
      stack: error.stack
    });
  }

  // Edge function error logging
  logEdgeFunctionError(error: any, functionName: string, payload?: any): void {
    this.error('Edge function failed', {
      functionName,
      payload: payload ? JSON.stringify(payload).slice(0, 500) : undefined,
      error: error.message
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