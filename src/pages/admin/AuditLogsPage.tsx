import { useEffect, useState } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/ui/Badge';

interface AuditLogRecord {
  id: string;
  user_id: string | null;
  action_type: string;
  module_name: string;
  record_id: string | null;
  ip_address: string | null;
  device_info: string | null;
  created_at: string;
  new_data: Record<string, unknown> | null;
  old_data: Record<string, unknown> | null;
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ module_name: '', action_type: '', user_id: '' });

  useEffect(() => {
    loadAuditLogs();
  }, []);

  async function loadAuditLogs() {
    setLoading(true);
    let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
    if (filters.module_name) query = query.ilike('module_name', `%${filters.module_name}%`);
    if (filters.action_type) query = query.ilike('action_type', `%${filters.action_type}%`);
    if (filters.user_id) query = query.eq('user_id', filters.user_id);

    const { data, error } = await query;
    if (error) {
      console.error('Failed to load audit logs', error);
      setLoading(false);
      return;
    }
    setLogs((data ?? []) as AuditLogRecord[]);
    setLoading(false);
  }

  return (
    <AppLayout title="Audit Logs" subtitle="Inspect all sensitive actions recorded across the platform">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 mb-6">
        {['module_name', 'action_type', 'user_id'].map((field) => (
          <label key={field} className="block text-slate-300">
            <span className="text-xs uppercase text-slate-500">{field.replace('_', ' ')}</span>
            <input
              value={(filters as any)[field]}
              onChange={(e) => setFilters((prev) => ({ ...prev, [field]: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none"
              placeholder={`Filter by ${field.replace('_', ' ')}`}
            />
          </label>
        ))}
      </div>
      <div className="mb-6">
        <button
          onClick={loadAuditLogs}
          className="rounded-2xl bg-orange-500 px-4 py-2 text-white font-semibold"
        >
          Apply filters
        </button>
      </div>
      <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
        <div className="grid grid-cols-[1fr_120px_120px_120px_120px] gap-3 px-5 py-3 text-slate-400 text-xs uppercase border-b border-slate-800">
          <span>Action</span>
          <span className="text-center">Module</span>
          <span className="text-center">User</span>
          <span className="text-center">Device</span>
          <span className="text-center">Date</span>
        </div>
        <div className="divide-y divide-slate-800">
          {loading ? (
            <div className="p-6 text-slate-500">Loading audit logs…</div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-slate-500">No audit logs found.</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="grid grid-cols-[1fr_120px_120px_120px_120px] gap-3 px-5 py-4 items-center">
                <span className="text-white text-sm">{log.action_type}</span>
                <span className="text-center text-slate-200">{log.module_name}</span>
                <span className="text-center text-slate-200">{log.user_id?.slice(0, 8) || 'system'}</span>
                <span className="text-center text-slate-200 truncate">{log.device_info || 'unknown'}</span>
                <span className="text-center text-slate-400">{new Date(log.created_at).toISOString().split('T')[0]}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
