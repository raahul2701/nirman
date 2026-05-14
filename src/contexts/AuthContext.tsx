import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { logger } from '../lib/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSession: () => Promise<void>;
  lastActivity: Date;
  updateActivity: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(new Date());

  // Activity tracking
  const updateActivity = useCallback(() => {
    setLastActivity(new Date());
  }, []);

  // Inactivity logout
  useEffect(() => {
    const checkInactivity = () => {
      const now = new Date();
      const timeSinceActivity = now.getTime() - lastActivity.getTime();
      if (timeSinceActivity > INACTIVITY_TIMEOUT && user) {
        logger.info('User logged out due to inactivity', { userId: user.id });
        signOut();
      }
    };

    const interval = setInterval(checkInactivity, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [lastActivity, user]);

  // Session refresh
  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        logger.info('Session refreshed successfully', { userId: data.session.user.id });
      }
    } catch (error) {
      logger.error('Session refresh failed', { error });
      // Force logout if refresh fails
      await signOut();
    }
  }, []);

  // Periodic session check
  useEffect(() => {
    if (!user) return;

    const checkSession = () => {
      const now = Date.now();
      const expiresAt = session?.expires_at ? session.expires_at * 1000 : 0;
      const timeToExpiry = expiresAt - now;

      if (timeToExpiry < SESSION_CHECK_INTERVAL) {
        refreshSession();
      }
    };

    const interval = setInterval(checkSession, SESSION_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [user, session, refreshSession]);

  // Activity listeners
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const handleActivity = () => updateActivity();

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [updateActivity]);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (data) setProfile(data as Profile);
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  // Audit logging helper
  const logAudit = async (action: string, details?: any) => {
    if (!user) return;
    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action,
        ip_address: null, // Would need server-side for IP
        user_agent: navigator.userAgent,
        ...details
      });
    } catch (error) {
      logger.error('Failed to log audit event', { error, action });
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
        await logAudit(event, { table_name: 'auth' });
        logger.info(`Auth state changed: ${event}`, { userId: session.user.id });
      } else {
        setProfile(null);
        if (event === 'SIGNED_OUT') {
          await logAudit('logout');
          logger.info('User signed out');
        }
      }
      if (event === 'SIGNED_OUT') setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Log failed login attempt
        await supabase.from('audit_logs').insert({
          action: 'failed_login',
          ip_address: null,
          user_agent: navigator.userAgent,
          new_values: { email }
        });
        logger.warn('Failed login attempt', { email, error: error.message });
        return { error: error as Error };
      }
      await logAudit('login', { table_name: 'auth' });
      updateActivity();
      return { error: null };
    } catch (error) {
      logger.error('Sign in error', { error });
      return { error: error as Error };
    }
  }

  async function signUp(email: string, password: string) {
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
  }

  async function signOut() {
    try {
      await logAudit('logout');
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      logger.info('User signed out successfully');
    } catch (error) {
      logger.error('Sign out error', { error });
    }
  }

  return (
    <AuthContext.Provider value={{
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
      updateActivity
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
