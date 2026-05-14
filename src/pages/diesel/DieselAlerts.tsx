import { AppLayout } from '../../components/layout/AppLayout';
import { useDieselTracking } from '../../hooks/useDieselTracking';
import { Badge } from '../../components/ui/Badge';

export function DieselAlerts() {
  const { alerts, loading } = useDieselTracking();
  const openAlerts = alerts.filter((item) => !item.resolved).length;

  return (
    <AppLayout title="Diesel Alerts" subtitle="Investigate high-risk fuel events and verify field anomalies">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 mb-6">
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Open alerts</p>
          <p className="mt-3 text-3xl text-white font-bold">{openAlerts}</p>
        </div>
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Total diesel alerts</p>
          <p className="mt-3 text-3xl text-white font-bold">{alerts.length}</p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
        <div className="grid grid-cols-[1fr_120px_120px_100px] gap-3 px-5 py-3 text-slate-400 text-xs uppercase border-b border-slate-800">
          <span>Alert message</span>
          <span className="text-center">Severity</span>
          <span className="text-center">Resolved</span>
          <span className="text-center">Date</span>
        </div>
        <div className="divide-y divide-slate-800">
          {loading ? (
            <div className="p-6 text-slate-500">Loading diesel alerts…</div>
          ) : alerts.length === 0 ? (
            <div className="p-6 text-slate-500">No diesel alerts found.</div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="grid grid-cols-[1fr_120px_120px_100px] gap-3 px-5 py-4 items-center">
                <span className="text-white text-sm">{alert.alert_message || alert.alert_type}</span>
                <span className="text-center"><Badge variant="secondary">{alert.severity}</Badge></span>
                <span className="text-center"><Badge variant={alert.resolved ? 'success' : 'warning'}>{alert.resolved ? 'Resolved' : 'Open'}</Badge></span>
                <span className="text-center text-slate-400">{new Date(alert.created_at).toISOString().split('T')[0]}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
