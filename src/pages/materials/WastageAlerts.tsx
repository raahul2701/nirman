import { useMemo } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { useMaterialVariance } from '../../hooks/useMaterialVariance';
import { Badge } from '../../components/ui/Badge';

export function WastageAlerts() {
  const { alerts, loading } = useMaterialVariance();
  const unresolved = useMemo(() => alerts.filter((alert) => !alert.resolved).length, [alerts]);

  return (
    <AppLayout title="Wastage Alerts" subtitle="Escalate material losses and suspicious stock movement immediately">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 mb-6">
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Open wastage alerts</p>
          <p className="mt-3 text-3xl text-white font-bold">{unresolved}</p>
        </div>
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Recent alerts</p>
          <p className="mt-3 text-3xl text-white font-bold">{alerts.length}</p>
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
        <div className="grid grid-cols-[1fr_120px_120px_120px] gap-3 px-5 py-3 text-slate-400 text-xs uppercase border-b border-slate-800">
          <span>Material</span>
          <span className="text-center">Type</span>
          <span className="text-center">Loss %</span>
          <span className="text-center">Status</span>
        </div>
        <div className="divide-y divide-slate-800">
          {loading ? (
            <div className="p-6 text-slate-500">Loading wastage alerts…</div>
          ) : alerts.length === 0 ? (
            <div className="p-6 text-slate-500">No wastage alerts present.</div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="grid grid-cols-[1fr_120px_120px_120px] gap-3 px-5 py-4 items-center">
                <span className="text-white text-sm">{alert.material_name}</span>
                <span className="text-center text-slate-200">{alert.alert_type}</span>
                <span className="text-center text-white">{alert.variance_percent.toFixed(1)}%</span>
                <span className="text-center"><Badge variant={alert.resolved ? 'success' : 'warning'}>{alert.resolved ? 'Resolved' : 'Open'}</Badge></span>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
