import { useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
import { AuthChangeEvent, User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { logger } from '../lib/logger';
import { AuthContext } from './authContextCore';
import { logLoginSuccess, logLogout } from '../services/activityLogger';

const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const SESSION_REFRESH_LEAD = 60 * 1000; // refresh 1 minute before expiry
const ACTIVITY_THROTTLE_MS = 1000;
const REFRESH_FAILURE_COOLDOWN = 30 * 1000;
const DEVICE_SESSION_KEY = 'nirman-device-id';
type AuditLogInsert = {
  user_id?: string;
  action: string;
  ip_address: string | null;
  user_agent: string;
  table_name?: string;
  record_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
};

type DeviceSessionUpsert = {
  user_id: string;
  device_id: string;
  user_agent: string;
  last_seen_at: string;
};

function areSessionsEqual(a: Session | null, b: Session | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.access_token === b.access_token &&
    a.refresh_token === b.refresh_token &&
    a.expires_at === b.expires_at &&
    a.user?.id === b.user?.id
  );
}

function isLikelyOffline(error: unknown) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (!(error instanceof Error)) return false;

  return /Failed to fetch|NetworkError|Load failed|fetch/i.test(error.message);
}

function getDeviceId() {
  const existing = localStorage.getItem(DEVICE_SESSION_KEY);
  if (existing) return existing;
  const next = crypto.randomUUID();
  localStorage.setItem(DEVICE_SESSION_KEY, next);
  return next;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const userId = user?.id;
  const sessionExpiresAt = session?.expires_at;
  const activityTimeoutRef = useRef<number | null>(null);
  const refreshTimeoutRef = useRef<number | null>(null);
  const refreshInFlightRef = useRef(false);
  const lastRefreshFailureRef = useRef(0);
  const mountedRef = useRef(true);
  const currentSessionRef = useRef<Session | null>(null);

  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'] as const;
    const handleActivity = () => {
      if (activityTimeoutRef.current) return;
      setLastActivity(Date.now());
      activityTimeoutRef.current = window.setTimeout(() => {
        activityTimeoutRef.current = null;
      }, ACTIVITY_THROTTLE_MS);
    };

    events.forEach((event) => document.addEventListener(event, handleActivity, true));
    return () => {
      events.forEach((event) => document.removeEventListener(event, handleActivity, true));
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    if (!mountedRef.current) return;
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (mountedRef.current && data) {
        setProfile(data as Profile);
      }
    } catch (error) {
      logger.error('Failed to fetch profile', { error, userId });
    }
  }, []);

  const logAudit = useCallback(async (action: string, details?: Record<string, unknown>, userId?: string) => {
    if (!mountedRef.current) return;
    const auditUserId = userId ?? user?.id;
    if (!auditUserId) return;

    try {
      const auditLog: AuditLogInsert = {
        user_id: auditUserId,
        action,
        ip_address: null,
        user_agent: navigator.userAgent,
        ...details,
      };
      await supabase.from('audit_logs').insert(auditLog);
    } catch (error) {
      logger.error('Failed to log audit event', { error, action, userId: auditUserId });
    }
  }, [user?.id]);

  const trackDeviceSession = useCallback(async (nextUserId: string) => {
    try {
      const deviceSession: DeviceSessionUpsert = {
        user_id: nextUserId,
        device_id: getDeviceId(),
        user_agent: navigator.userAgent,
        last_seen_at: new Date().toISOString(),
      };
      await supabase.from('device_sessions').upsert(deviceSession, { onConflict: 'user_id,device_id' });
    } catch (error) {
      logger.warn('Failed to update device session', { error, userId: nextUserId });
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (user?.id) {
        void logAudit('logout', undefined, user.id);
        logLogout(user, profile?.email || user.email);
      }
      await supabase.auth.signOut();
      if (mountedRef.current) {
        setUser(null);
        setSession(null);
        setProfile(null);
      }
      logger.info('User signed out successfully');
    } catch (error) {
      logger.error('Sign out error', { error });
    }
  }, [logAudit, profile?.email, user]);

  const refreshSession = useCallback(async () => {
    const now = Date.now();
    if (refreshInFlightRef.current || now - lastRefreshFailureRef.current < REFRESH_FAILURE_COOLDOWN) {
      return;
    }

    refreshInFlightRef.current = true;
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      if (data.session && mountedRef.current) {
        currentSessionRef.current = data.session;
        setSession(data.session);
        setUser(data.session.user);
        void trackDeviceSession(data.session.user.id);
        logger.info('Session refreshed successfully', { userId: data.session.user.id });
      }
    } catch (error) {
      lastRefreshFailureRef.current = Date.now();
      if (isLikelyOffline(error)) {
        logger.warn('Session refresh skipped while offline', { error });
        return;
      }

      logger.error('Session refresh failed', { error });
      void signOut();
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [signOut, trackDeviceSession]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [fetchProfile, user]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        await supabase.from('audit_logs').insert({
          action: 'failed_login',
          ip_address: null,
          user_agent: navigator.userAgent,
          new_values: { email },
        });
        logger.warn('Failed login attempt', { email, error: error.message });
        return { error: error as Error };
      }
      void logAudit('login', { table_name: 'auth' });
      logLoginSuccess(data.user, data.user?.email || email);
      updateActivity();
      return { error: null };
    } catch (error) {
      logger.error('Sign in error', { error });
      return { error: error as Error };
    }
  }, [logAudit, updateActivity]);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        logger.error('Sign up error', { email, error: error.message });
        return { error: error as Error };
      }
      logger.info('User signed up', { email });
      return { error: null };
    } catch (error) {
      logger.error('Sign up error', { error });
      return { error: error as Error };
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    const scheduleRefresh = () => {
      const now = Date.now();
      const expiresAt = sessionExpiresAt ? sessionExpiresAt * 1000 : now + SESSION_CHECK_INTERVAL;
      const delay = Math.max(expiresAt - now - SESSION_REFRESH_LEAD, 1000);

      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = window.setTimeout(() => {
        if (mountedRef.current) {
          void refreshSession();
        }
      }, delay);
    };

    scheduleRefresh();

    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [refreshSession, sessionExpiresAt, userId]);

  useEffect(() => {
    let cancelled = false;

    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          logger.warn('Failed to retrieve initial session', { error });
        }

        const initialSession = data?.session ?? null;
        currentSessionRef.current = initialSession;

        if (mountedRef.current && !cancelled) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
        }

        if (initialSession?.user && !cancelled) {
          await fetchProfile(initialSession.user.id);
          void trackDeviceSession(initialSession.user.id);
          void logAudit('session_init', { table_name: 'auth' }, initialSession.user.id);
          logLoginSuccess(initialSession.user, initialSession.user.email);
          logger.info('Initial auth session loaded', { userId: initialSession.user.id });
        }
      } catch (error) {
        logger.error('Auth initialization failed', { error });
      } finally {
        if (mountedRef.current && !cancelled) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, nextSession: Session | null) => {
      if (!mountedRef.current || cancelled) return;

      const isSameSession = areSessionsEqual(nextSession, currentSessionRef.current);
      if (isSameSession && event !== 'SIGNED_OUT') {
        return;
      }

      currentSessionRef.current = nextSession;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        await fetchProfile(nextSession.user.id);
        void trackDeviceSession(nextSession.user.id);
        void logAudit(event, { table_name: 'auth' }, nextSession.user.id);
        if (event === 'SIGNED_IN') {
          logLoginSuccess(nextSession.user, nextSession.user.email);
        }
        logger.info(`Auth state changed: ${event}`, { userId: nextSession.user.id });
      } else {
        setProfile(null);
        if (event === 'SIGNED_OUT') {
          void logAudit('logout');
          logger.info('User signed out');
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchProfile, logAudit, trackDeviceSession]);

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      refreshSession,
      lastActivity,
      updateActivity,
    }),
    [user, session, profile, loading, signIn, signUp, signOut, refreshProfile, refreshSession, lastActivity, updateActivity]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
