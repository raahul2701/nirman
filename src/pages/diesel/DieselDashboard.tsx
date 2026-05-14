import { useMemo } from 'react';
import { BarChart, Truck, AlertTriangle } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { useDieselTracking } from '../../hooks/useDieselTracking';
import { Badge } from '../../components/ui/Badge';

export function DieselDashboard() {
  const { entries, alerts, loading, totalDieselReceived, totalDieselUsed, openAlerts, recentAlerts } = useDieselTracking();

  const activeMachines = useMemo(() => new Set(entries.map((entry) => entry.machine_name)).size, [entries]);
  const fuelLoss = useMemo(() => entries.reduce((sum, entry) => sum + Number(entry.variance || 0), 0), [entries]);

  return (
    <AppLayout
      title="Diesel Management"
      subtitle="Track daily fuel entries, machine consumption and AI variance alerts"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 mb-6">
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-sm text-slate-400">Active machines</p>
          <p className="mt-3 text-3xl font-semibold text-white">{activeMachines}</p>
        </div>
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-sm text-slate-400">Diesel received</p>
          <p className="mt-3 text-3xl font-semibold text-white">{totalDieselReceived.toFixed(1)} L</p>
        </div>
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-sm text-slate-400">Diesel used</p>
          <p className="mt-3 text-3xl font-semibold text-white">{totalDieselUsed.toFixed(1)} L</p>
        </div>
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-sm text-slate-400">Open alerts</p>
          <p className="mt-3 text-3xl font-semibold text-white">{openAlerts}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-[0.2em]">Diesel Usage Trend</p>
              <h3 className="text-white text-lg font-semibold">Site fuel overview</h3>
            </div>
            <BarChart className="text-orange-400" />
          </div>
          <div className="min-h-[220px] rounded-2xl bg-slate-900 p-4 flex flex-col justify-center text-slate-500">
            {loading ? 'Loading data…' : `Fuel loss estimate: ${fuelLoss.toFixed(1)} L from recent entries.`}
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-[0.2em]">Latest alerts</p>
              <h3 className="text-white text-lg font-semibold">Diesel anomalies</h3>
            </div>
            <AlertTriangle className="text-rose-500" />
          </div>
          <div className="space-y-3">
            {recentAlerts.length > 0 ? (
              recentAlerts.map((alert) => (
                <div key={alert.id} className="rounded-2xl bg-slate-900 p-4 border border-slate-800">
                  <p className="text-sm text-slate-300">{alert.alert_message || alert.alert_type}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary">{alert.severity}</Badge>
                    <Badge variant={alert.resolved ? 'success' : 'warning'}>{alert.resolved ? 'Resolved' : 'Open'}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500">No diesel alerts recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
