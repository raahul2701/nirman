import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface MaintenanceLogRecord {
  id: string;
  project_id: string;
  machine_name: string;
  machine_type: string;
  maintenance_type: string;
  service_date: string;
  maintenance_cost: number;
  status: string;
}

export interface ServiceScheduleRecord {
  id: string;
  machine_name: string;
  machine_type: string;
  next_service_date: string | null;
  status: string;
}

export interface BreakdownReportRecord {
  id: string;
  machine_name: string;
  machine_type: string;
  severity: string;
  breakdown_date: string;
  resolved: boolean;
}

export interface MachineryHealthRecord {
  id: string;
  machine_name: string;
  health_rating: string;
  last_checked: string;
}

export function useMaintenance() {
  const [logs, setLogs] = useState<MaintenanceLogRecord[]>([]);
  const [schedules, setSchedules] = useState<ServiceScheduleRecord[]>([]);
  const [breakdowns, setBreakdowns] = useState<BreakdownReportRecord[]>([]);
  const [health, setHealth] = useState<MachineryHealthRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const [{ data: logsData }, { data: schedulesData }, { data: breakdownsData }, { data: healthData }] = await Promise.all([
        supabase.from('maintenance_logs').select('*').order('service_date', { ascending: false }).limit(30),
        supabase.from('service_schedules').select('*').order('next_service_date', { ascending: true }).limit(30),
        supabase.from('breakdown_reports').select('*').order('breakdown_date', { ascending: false }).limit(30),
        supabase.from('machinery_health').select('*').order('last_checked', { ascending: false }).limit(30),
      ]);
      if (!mounted) return;
      setLogs((logsData ?? []) as MaintenanceLogRecord[]);
      setSchedules((schedulesData ?? []) as ServiceScheduleRecord[]);
      setBreakdowns((breakdownsData ?? []) as BreakdownReportRecord[]);
      setHealth((healthData ?? []) as MachineryHealthRecord[]);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  return { logs, schedules, breakdowns, health, loading };
}
