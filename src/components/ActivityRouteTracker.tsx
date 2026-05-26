import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { logPageVisit } from '../services/activityLogger';

export function ActivityRouteTracker() {
  const location = useLocation();
  const { user, profile } = useAuth();

  useEffect(() => {
    logPageVisit(location.pathname, user, profile?.email || user?.email);
  }, [location.pathname, profile?.email, user?.email, user?.id]);

  return null;
}
