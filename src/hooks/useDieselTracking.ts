import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';

export interface DieselEntryRecord {
  id: string;
  site_id: string | null;
  project_id: string | null;
  entry_date: string;
  machine_name: string;
  machine_type: string;
  machine_id: string | null;
  operator_name: string | null;
  opening_diesel: number;
  diesel_received: number;
  diesel_used: number;
  closing_diesel: number;
  running_hours: number;
  expected_consumption: number;
  actual_consumption: number;
  variance: number;
  bill_photo_url: string | null;
  remarks: string | null;
  ai_fraud_flag: boolean;
  ai_fraud_reason: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DieselAlertRecord {
  id: string;
  diesel_entry_id: string | null;
  alert_type: string;
  severity: string;
  alert_message: string;
  resolved: boolean;
  created_at: string;
}

export function useDieselTracking() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DieselEntryRecord[]>([]);
  const [alerts, setAlerts] = useState<DieselAlertRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    async function load() {
      setLoading(true);
      const [{ data: entryData }, { data: alertData }] = await Promise.all([
        supabase.from('diesel_entries').select('*').order('entry_date', { ascending: false }).limit(40),
        supabase.from('diesel_alerts').select('*').order('created_at', { ascending: false }).limit(40),
      ]);
      if (!mounted) return;
      setEntries((entryData ?? []) as DieselEntryRecord[]);
      setAlerts((alertData ?? []) as DieselAlertRecord[]);
      setLoading(false);
    }

    load();
    return () => { mounted = false; };
  }, [user]);

  const totalDieselReceived = useMemo(
    () => entries.reduce((sum, entry) => sum + Number(entry.diesel_received || 0), 0),
    [entries]
  );

  const totalDieselUsed = useMemo(
    () => entries.reduce((sum, entry) => sum + Number(entry.diesel_used || 0), 0),
    [entries]
  );

  const openAlerts = useMemo(() => alerts.filter((alert) => !alert.resolved).length, [alerts]);
  const recentEntries = useMemo(() => entries.slice(0, 6), [entries]);
  const recentAlerts = useMemo(() => alerts.slice(0, 6), [alerts]);

  return { entries, alerts, loading, totalDieselReceived, totalDieselUsed, openAlerts, recentEntries, recentAlerts };
}
