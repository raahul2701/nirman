import { useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Notification } from '../types';
import { useAuth } from './useAuth';
import { NotificationContext } from './notificationContextCore';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setNotifications(data as Notification[]);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    let cleanupChannel: (() => void) | undefined;
    const scheduleSubscription = () => {
      fetchNotifications();

      const channel = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        })
        .subscribe();

      cleanupChannel = () => {
        supabase.removeChannel(channel);
      };
    };

    const rafHandle = window.requestIdleCallback
      ? window.requestIdleCallback(scheduleSubscription, { timeout: 2000 })
      : window.setTimeout(scheduleSubscription, 1000);

    return () => {
      if (typeof rafHandle === 'number') {
        window.cancelIdleCallback?.(rafHandle);
        window.clearTimeout(rafHandle);
      }
      cleanupChannel?.();
    };
  }, [fetchNotifications, user]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [user]);

  const addNotification = useCallback(async (title: string, message: string, type: Notification['type'] = 'info', category = 'general') => {
    if (!user) return;
    const { data } = await supabase.from('notifications').insert({
      user_id: user.id, title, message, type, category
    }).select().maybeSingle();
    if (data) setNotifications(prev => [data as Notification, ...prev]);
  }, [user]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const contextValue = useMemo(
    () => ({ notifications, unreadCount, markAsRead, markAllAsRead, addNotification }),
    [notifications, unreadCount, markAsRead, markAllAsRead, addNotification]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}
