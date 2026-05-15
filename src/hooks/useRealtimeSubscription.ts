import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export type RealtimeRowEvent<T> = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: T;
  old?: T;
};

export function useRealtimeSubscription<T = Record<string, unknown>>(
  table: string,
  callback: (event: RealtimeRowEvent<T>) => void,
  filter?: string
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callbackRef = useRef<(event: RealtimeRowEvent<T>) => void>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-realtime`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter: filter || undefined,
      }, (payload: { eventType: string; new?: unknown; old?: unknown }) => {
        const eventType = payload.eventType as RealtimeRowEvent<T>['eventType'];
        callbackRef.current({ eventType, new: payload.new as T, old: payload.old as T });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, filter]);
}

export function useRealtimeDisputes(callback: (event: RealtimeRowEvent<Record<string, unknown>>) => void) {
  useRealtimeSubscription('disputes', callback);
}

export function useRealtimeBGAlerts(callback: (event: RealtimeRowEvent<Record<string, unknown>>) => void) {
  useRealtimeSubscription('bank_guarantees', callback);
}

export function useRealtimeHindrance(callback: (event: RealtimeRowEvent<Record<string, unknown>>) => void) {
  useRealtimeSubscription('hindrance_register', callback);
}

export function useRealtimeBudgetAlerts(callback: (event: RealtimeRowEvent<Record<string, unknown>>) => void) {
  useRealtimeSubscription('budget_progress_snapshots', callback);
}
