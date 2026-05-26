import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type ActivityEventType = 'login_success' | 'page_visit' | 'logout' | 'pilot_started' | 'assignment_created';

type ActivityOptions = {
  userId?: string | null;
  email?: string | null;
  pagePath?: string | null;
  metadata?: Record<string, unknown>;
};

const PAGE_VISIT_THROTTLE_MS = 60_000;
const LOGIN_SESSION_KEY = 'nirman:last-login-activity-user';
let lastPageVisitKey = '';
let lastPageVisitAt = 0;

function warnActivity(error: unknown) {
  if (import.meta.env.DEV) {
    console.warn('[activity] failed to log activity', error);
  }
}

function currentPath() {
  return typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search || ''}` : null;
}

function getUserEmail(user: Pick<User, 'email'> | null | undefined, fallback?: string | null) {
  return user?.email || fallback || null;
}

export async function logActivity(eventType: ActivityEventType, options: ActivityOptions = {}) {
  const userId = options.userId;
  if (!userId) return;

  try {
    await supabase.from('user_activity_logs').insert({
      user_id: userId,
      email: options.email || null,
      event_type: eventType,
      page_path: options.pagePath ?? currentPath(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      metadata: options.metadata || {},
    } as any);
  } catch (error) {
    warnActivity(error);
  }
}

export function shouldLogPageVisit(userId: string | null | undefined, pagePath: string) {
  if (!userId || !pagePath) return false;
  const now = Date.now();
  const key = `${userId}:${pagePath}`;
  if (key === lastPageVisitKey && now - lastPageVisitAt < PAGE_VISIT_THROTTLE_MS) {
    return false;
  }
  lastPageVisitKey = key;
  lastPageVisitAt = now;
  return true;
}

export function logPageVisit(pathname: string, user?: User | null, email?: string | null) {
  if (!shouldLogPageVisit(user?.id, pathname)) return;
  void logActivity('page_visit', {
    userId: user?.id,
    email: getUserEmail(user, email),
    pagePath: pathname,
  });
}

export function logLoginSuccess(user?: User | null, email?: string | null) {
  if (!user?.id) return;
  const previousUser = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(LOGIN_SESSION_KEY) : null;
  if (previousUser === user.id) return;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(LOGIN_SESSION_KEY, user.id);
  }
  void logActivity('login_success', {
    userId: user.id,
    email: getUserEmail(user, email),
    pagePath: currentPath(),
  });
}

export function logLogout(user?: User | null, email?: string | null) {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(LOGIN_SESSION_KEY);
  }
  void logActivity('logout', {
    userId: user?.id,
    email: getUserEmail(user, email),
    pagePath: currentPath(),
  });
}

export function logPilotStarted(user: User | null | undefined, email?: string | null, metadata?: Record<string, unknown>) {
  void logActivity('pilot_started', {
    userId: user?.id,
    email: getUserEmail(user, email),
    pagePath: '/enterprise/start-pilot',
    metadata,
  });
}

export function logAssignmentCreated(user: User | null | undefined, email?: string | null, metadata?: Record<string, unknown>, pagePath?: string) {
  void logActivity('assignment_created', {
    userId: user?.id,
    email: getUserEmail(user, email),
    pagePath: pagePath || currentPath(),
    metadata,
  });
}
