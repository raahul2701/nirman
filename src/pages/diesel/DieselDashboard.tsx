import { useMemo } from 'react';
import { BarChart, Truck, AlertTriangle } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { useDieselTracking } from '../../hooks/useDieselTracking';
import { Badge } from '../../components/ui/Badge';
import { useDieselLogs } from '../../hooks/useDataServices';
import { OfflineSyncIndicator } from '../../components/offline/OfflineSyncIndicator';

const DEFAULT_PROJECT_ID = 'project-1';

export function DieselDashboard() {
  const { entries, loading, totalDieselReceived, totalDieselUsed, openAlerts, recentAlerts } = useDieselTracking();
  const { logs } = useDieselLogs(DEFAULT_PROJECT_ID);

  const serviceEntries = useMemo(() => logs.map((item) => ({
    id: item.id || `${item.created_at}-${item.vehicle_id}`,
    machine_name: String(item.log?.machine_name || item.vehicle_id || 'Machine'),
    operator_name: String(item.log?.operator_name || 'Not captured'),
    diesel_used: Number(item.log?.diesel_used || item.consumption || 0),
    actual_consumption: Number(item.consumption || item.log?.actual_consumption || 0),
    expected_consumption: Number(item.log?.expected_consumption || 0),
    variance: Number(item.log?.variance || 0),
  })), [logs]);
  const allEntries = useMemo(() => [...serviceEntries, ...entries], [entries, serviceEntries]);
  const activeMachines = useMemo(() => new Set(allEntries.map((entry) => entry.machine_name)).size, [allEntries]);
  const fuelLoss = useMemo(() => allEntries.reduce((sum, entry) => sum + Number(entry.variance || 0), 0), [allEntries]);
  const serviceDieselUsed = useMemo(() => serviceEntries.reduce((sum, entry) => sum + Number(entry.diesel_used || entry.actual_consumption || 0), 0), [serviceEntries]);
  const machineAnalytics = useMemo(() => allEntries.slice(0, 6).map((entry) => ({
    id: entry.id,
    machine: entry.machine_name,
    operator: entry.operator_name || 'Not captured',
    used: Number(entry.diesel_used || entry.actual_consumption || 0),
    expected: Number(entry.expected_consumption || 0),
  })), [allEntries]);

  return (
    <AppLayout
      title="Diesel Management"
      subtitle="Track daily fuel entries, machine consumption and AI variance alerts"
    >
      <div className="mb-4 flex justify-end">
        <OfflineSyncIndicator />
      </div>
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
          <p className="mt-3 text-3xl font-semibold text-white">{(totalDieselUsed + serviceDieselUsed).toFixed(1)} L</p>
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

      <div className="mt-4 rounded-2xl p-5 bg-slate-950 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-[0.2em]">Diesel issue ledger</p>
            <h3 className="text-white text-lg font-semibold">Machine-wise analytics</h3>
          </div>
          <Truck className="text-orange-400" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {machineAnalytics.map((item) => (
            <div key={item.id} className="rounded-2xl bg-slate-900 p-4 border border-slate-800">
              <p className="font-semibold text-white">{item.machine}</p>
              <p className="text-sm text-slate-400">Operator: {item.operator}</p>
              <div className="mt-3 h-2 rounded-full bg-slate-800">
                <div className="h-2 rounded-full bg-orange-500" style={{ width: `${Math.min((item.used / Math.max(item.expected || item.used, 1)) * 100, 100)}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-500">Used {item.used.toFixed(1)} L / expected {item.expected.toFixed(1)} L</p>
            </div>
          ))}
          {!machineAnalytics.length && <p className="text-slate-500">No ledger entries yet.</p>}
        </div>
      </div>
    </AppLayout>
  );
}
