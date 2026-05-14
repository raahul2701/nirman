import { useMemo } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { useDieselTracking } from '../../hooks/useDieselTracking';
import { Badge } from '../../components/ui/Badge';

export function DieselReports() {
  const { entries, alerts, loading } = useDieselTracking();

  const totalReceived = useMemo(
    () => entries.reduce((sum, entry) => sum + Number(entry.diesel_received || 0), 0),
    [entries]
  );
  const totalUsed = useMemo(
    () => entries.reduce((sum, entry) => sum + Number(entry.diesel_used || 0), 0),
    [entries]
  );
  const totalVariance = useMemo(
    () => entries.reduce((sum, entry) => sum + Number(entry.variance || 0), 0),
    [entries]
  );

  return (
    <AppLayout title="Diesel Reports" subtitle="Fuel loss analysis, variance insights and alert history">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 mb-6">
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Total Diesel Received</p>
          <p className="mt-3 text-3xl text-white font-bold">{totalReceived.toFixed(1)} L</p>
        </div>
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Total Diesel Used</p>
          <p className="mt-3 text-3xl text-white font-bold">{totalUsed.toFixed(1)} L</p>
        </div>
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Total variance</p>
          <p className="mt-3 text-3xl text-white font-bold">{totalVariance.toFixed(1)} L</p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
        <div className="grid grid-cols-[1fr_120px_120px_120px] gap-3 px-5 py-3 text-slate-400 text-xs uppercase border-b border-slate-800">
          <span>Machine</span>
          <span className="text-center">Diesel used</span>
          <span className="text-center">Variance</span>
          <span className="text-center">Date</span>
        </div>
        <div className="divide-y divide-slate-800">
          {loading ? (
            <div className="p-6 text-slate-500">Loading diesel report data…</div>
          ) : entries.length === 0 ? (
            <div className="p-6 text-slate-500">No diesel report data available.</div>
          ) : (
            entries.slice(0, 10).map((entry) => (
              <div key={entry.id} className="grid grid-cols-[1fr_120px_120px_120px] gap-3 px-5 py-4 items-center">
                <span className="text-white text-sm">{entry.machine_name}</span>
                <span className="text-center text-slate-200">{Number(entry.diesel_used).toFixed(1)} L</span>
                <span className="text-center text-white">{Number(entry.variance).toFixed(1)} L</span>
                <span className="text-center text-slate-400">{entry.entry_date}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-white text-base font-semibold">Recent alert summary</h3>
          <p className="text-slate-500 text-sm">Monitor suspicious diesel usage patterns and fraud flags.</p>
        </div>
        <div className="divide-y divide-slate-800">
          {alerts.length === 0 ? (
            <div className="p-6 text-slate-500">No alerts generated yet.</div>
          ) : (
            alerts.slice(0, 8).map((alert) => (
              <div key={alert.id} className="px-5 py-4 grid grid-cols-[1fr_120px_120px] gap-3 items-center">
                <span className="text-white text-sm">{alert.alert_message || alert.alert_type}</span>
                <span className="text-center"><Badge variant="secondary">{alert.severity}</Badge></span>
                <span className="text-center"><Badge variant={alert.resolved ? 'success' : 'warning'}>{alert.resolved ? 'Resolved' : 'Open'}</Badge></span>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
