import { useEffect, useMemo, useState } from 'react';
import { Activity, Clock, LogIn, RefreshCw, Users } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, StatCard } from '../../components/ui/Card';
import { supabase } from '../../lib/supabase';

type ActivityLog = {
  id: string;
  user_id: string | null;
  email: string | null;
  event_type: string;
  page_path: string | null;
  user_agent: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

function shortUser(log: ActivityLog) {
  return log.email || log.user_id?.slice(0, 8) || 'unknown';
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    year: 'numeric',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shortAgent(value: string | null) {
  if (!value) return '-';
  return value.length > 52 ? `${value.slice(0, 52)}...` : value;
}

function metadataPreview(value: Record<string, unknown> | null) {
  if (!value || Object.keys(value).length === 0) return '{}';
  const text = JSON.stringify(value);
  return text.length > 72 ? `${text.slice(0, 72)}...` : text;
}

function isPermissionError(message: string | null) {
  return !!message && /permission|rls|policy|not authorized|denied/i.test(message);
}

export function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalVisits, setTotalVisits] = useState(0);
  const [totalLogins, setTotalLogins] = useState(0);

  async function loadActivity() {
    setLoading(true);
    setError(null);
    const [logsResult, visitsResult, loginsResult] = await Promise.all([
      supabase
        .from('user_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('user_activity_logs')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'page_visit'),
      supabase
        .from('user_activity_logs')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'login_success'),
    ]);

    if (logsResult.error) {
      setError(logsResult.error.message);
      setLogs([]);
    } else {
      setLogs((logsResult.data || []) as ActivityLog[]);
    }

    if (!visitsResult.error) {
      setTotalVisits(visitsResult.count || 0);
    }
    if (!loginsResult.error) {
      setTotalLogins(loginsResult.count || 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadActivity();
  }, []);

  const latestUsers = useMemo(() => {
    const seen = new Set<string>();
    return logs.filter((log) => {
      const key = log.user_id || log.email;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  }, [logs]);

  const latestLogins = logs.filter((log) => log.event_type === 'login_success').slice(0, 8);
  const latestPages = logs.filter((log) => log.event_type === 'page_visit').slice(0, 12);
  const lastActivityTime = logs[0]?.created_at ? formatTime(logs[0].created_at) : '-';

  const uniqueUsers = useMemo(() => {
    const seen = new Set<string>();
    logs.forEach((log) => {
      const key = log.email || log.user_id;
      if (key) seen.add(key);
    });
    return seen.size;
  }, [logs]);

  const mostActiveUsers = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    logs.forEach((log) => {
      const key = log.user_id || log.email;
      if (!key) return;
      const current = counts.get(key) || { label: shortUser(log), count: 0 };
      current.count += 1;
      counts.set(key, current);
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [logs]);

  const mostVisitedPages = useMemo(() => {
    const counts = new Map<string, number>();
    logs.filter((log) => log.event_type === 'page_visit').forEach((log) => {
      const page = log.page_path || '-';
      counts.set(page, (counts.get(page) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [logs]);

  const permissionDenied = isPermissionError(error);

  return (
    <AppLayout title="Activity Logs" subtitle="Pilot monitoring for logins, page visits, and assignment usage">
      <Card className="mb-6">
        <p className="text-sm text-[#6C7568]">Activity logs are used only for pilot monitoring and product improvement.</p>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <StatCard label="Total Visits" value={totalVisits} icon={<Activity size={18} />} color="#00D4AA" loading={loading} />
        <StatCard label="Login Events" value={totalLogins} icon={<LogIn size={18} />} color="#22c55e" loading={loading} />
        <StatCard label="Unique Users" value={uniqueUsers} icon={<Users size={18} />} color="#F59E0B" loading={loading} />
        <StatCard label="Last Activity" value={lastActivityTime} icon={<Clock size={18} />} color="#3B82F6" loading={loading} />
        <Card>
          <Button variant="primary" icon={<RefreshCw size={14} />} loading={loading} onClick={loadActivity}>Refresh</Button>
          <p className="mt-3 text-xs text-[#6C7568]">Showing latest 100 entries.</p>
        </Card>
      </div>

      {error && (
        <Card className="mb-6 border-red-400/30">
          <p className="text-sm font-medium text-red-500">{permissionDenied ? 'Permission denied while reading activity logs.' : 'Activity logs could not be loaded.'}</p>
          <p className="mt-1 text-xs text-red-500/80">{error}</p>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-[#12332D]">Latest Users</h2>
          <div className="space-y-3">
            {latestUsers.map((log) => (
              <div key={`${log.user_id}-${log.created_at}`} className="flex items-center justify-between rounded-lg border border-[#D9D0B5] bg-[#FAF7EC] p-3">
                <div>
                  <p className="text-sm font-medium text-[#12332D]">{shortUser(log)}</p>
                  <p className="text-xs text-[#6C7568]">{formatTime(log.created_at)}</p>
                </div>
                <StatusBadge status={log.event_type} />
              </div>
            ))}
            {!loading && latestUsers.length === 0 && <p className="text-sm text-[#6C7568]">No user activity yet.</p>}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-[#12332D]">Most Active Users</h2>
          <div className="space-y-3">
            {mostActiveUsers.map((user) => (
              <div key={user.label} className="flex items-center justify-between rounded-lg border border-[#D9D0B5] bg-[#FAF7EC] p-3">
                <span className="text-sm font-medium text-[#12332D]">{user.label}</span>
                <Badge color="#005F56">{user.count} events</Badge>
              </div>
            ))}
            {!loading && mostActiveUsers.length === 0 && <p className="text-sm text-[#6C7568]">No activity counts yet.</p>}
          </div>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-[#12332D]">Latest Pages Visited</h2>
          <div className="space-y-3">
            {latestPages.map((log) => (
              <div key={log.id} className="rounded-lg border border-[#D9D0B5] bg-[#FAF7EC] p-3">
                <p className="text-sm font-medium text-[#12332D]">{log.page_path || '-'}</p>
                <p className="mt-1 text-xs text-[#6C7568]">{shortUser(log)} - {formatTime(log.created_at)}</p>
              </div>
            ))}
            {!loading && latestPages.length === 0 && <p className="text-sm text-[#6C7568]">No page visits yet.</p>}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-[#12332D]">Login Timestamps</h2>
          <div className="space-y-3">
            {latestLogins.map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-lg border border-[#D9D0B5] bg-[#FAF7EC] p-3">
                <span className="text-sm font-medium text-[#12332D]">{shortUser(log)}</span>
                <span className="text-xs text-[#6C7568]">{formatTime(log.created_at)}</span>
              </div>
            ))}
            {!loading && latestLogins.length === 0 && <p className="text-sm text-[#6C7568]">No login events yet.</p>}
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <h2 className="mb-4 font-semibold text-[#12332D]">Most Visited Pages</h2>
        <div className="space-y-3">
          {mostVisitedPages.map(([page, count]) => (
            <div key={page} className="flex items-center justify-between rounded-lg border border-[#D9D0B5] bg-[#FAF7EC] p-3">
              <span className="break-all text-sm font-medium text-[#12332D]">{page}</span>
              <Badge color="#3B82F6">{count} visits</Badge>
            </div>
          ))}
          {!loading && mostVisitedPages.length === 0 && <p className="text-sm text-[#6C7568]">No visited pages yet.</p>}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold text-[#12332D]">Latest Activity Entries</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-[#D9D0B5] text-left text-[#6C7568]">
                <th className="py-3 pr-4 font-medium">Created At</th>
                <th className="py-3 pr-4 font-medium">Email</th>
                <th className="py-3 pr-4 font-medium">Event</th>
                <th className="py-3 pr-4 font-medium">Page</th>
                <th className="py-3 pr-4 font-medium">User Agent</th>
                <th className="py-3 pr-4 font-medium">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-[#E8DFC6] text-[#4D5B52]">
                  <td className="py-3 pr-4">{formatTime(log.created_at)}</td>
                  <td className="py-3 pr-4">{log.email || log.user_id || '-'}</td>
                  <td className="py-3 pr-4"><StatusBadge status={log.event_type} /></td>
                  <td className="max-w-[220px] break-all py-3 pr-4">{log.page_path || '-'}</td>
                  <td className="py-3 pr-4 text-xs">{shortAgent(log.user_agent)}</td>
                  <td className="py-3 pr-4 text-xs">{metadataPreview(log.metadata)}</td>
                </tr>
              ))}
              {!loading && logs.length === 0 && (
                <tr>
                  <td className="py-8 text-[#6C7568]" colSpan={6}>No activity entries found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AppLayout>
  );
}
