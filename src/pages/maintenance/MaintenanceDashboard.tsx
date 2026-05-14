import { useMemo } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { useMaintenance } from '../../hooks/useMaintenance';
import { Badge } from '../../components/ui/Badge';

export function MaintenanceDashboard() {
  const { logs, schedules, breakdowns, health, loading } = useMaintenance();

  const openBreakdowns = useMemo(() => breakdowns.filter((item) => !item.resolved).length, [breakdowns]);
  const dueSchedules = useMemo(() => schedules.filter((item) => item.status !== 'completed').length, [schedules]);

  return (
    <AppLayout title="Maintenance" subtitle="Preventive care, breakdown tracking and asset health monitoring">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4 mb-6">
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Service records</p>
          <p className="mt-3 text-3xl text-white font-bold">{logs.length}</p>
        </div>
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Planned services</p>
          <p className="mt-3 text-3xl text-white font-bold">{schedules.length}</p>
        </div>
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Open breakdowns</p>
          <p className="mt-3 text-3xl text-white font-bold">{openBreakdowns}</p>
        </div>
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Asset checks</p>
          <p className="mt-3 text-3xl text-white font-bold">{health.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-[0.2em]">Pending schedule</p>
              <h3 className="text-white text-lg font-semibold">Next service actions</h3>
            </div>
            <Badge variant="secondary">{dueSchedules} pending</Badge>
          </div>
          <div className="min-h-[220px] rounded-2xl bg-slate-900 p-4 text-slate-500">
            {loading ? 'Loading maintenance dashboard…' : 'Use the schedule page for upcoming preventive service details.'}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-[0.2em]">Asset health</p>
              <h3 className="text-white text-lg font-semibold">Machine condition</h3>
            </div>
            <Badge variant="secondary">{health.length} entries</Badge>
          </div>
          <div className="space-y-3">
            {health.slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-2xl bg-slate-900 p-4 border border-slate-800">
                <p className="text-sm text-white">{item.machine_name}</p>
                <p className="text-slate-400 text-xs mt-1">Last checked {item.last_checked.split('T')[0]}</p>
                <Badge variant={item.health_rating === 'poor' ? 'destructive' : item.health_rating === 'fair' ? 'warning' : 'secondary'}>{item.health_rating}</Badge>
              </div>
            ))}
            {loading && <p className="text-slate-500">Loading health records…</p>}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
