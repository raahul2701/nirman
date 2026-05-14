import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface AuditLogRecord {
  id: string;
  table_name: string;
  record_id: string;
  operation_type: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_by: string | null;
  ip_address: string | null;
  device_info: Record<string, unknown> | null;
  user_agent: string | null;
  created_at: string;
}

export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50);
      if (!mounted) return;
      setLogs((data ?? []) as AuditLogRecord[]);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  return { logs, loading };
}
