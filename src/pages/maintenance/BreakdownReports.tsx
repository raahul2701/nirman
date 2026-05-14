import { AppLayout } from '../../components/layout/AppLayout';
import { useMaintenance } from '../../hooks/useMaintenance';
import { Badge } from '../../components/ui/Badge';

export function BreakdownReports() {
  const { breakdowns, loading } = useMaintenance();

  return (
    <AppLayout title="Breakdown Reports" subtitle="Track machinery failures and resolution timelines">
      <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
        <div className="grid grid-cols-[1fr_120px_120px_120px] gap-3 px-5 py-3 text-slate-400 text-xs uppercase border-b border-slate-800">
          <span>Machine</span>
          <span className="text-center">Severity</span>
          <span className="text-center">Date</span>
          <span className="text-center">Status</span>
        </div>
        <div className="divide-y divide-slate-800">
          {loading ? (
            <div className="p-6 text-slate-500">Loading breakdown reports…</div>
          ) : breakdowns.length === 0 ? (
            <div className="p-6 text-slate-500">No breakdowns reported.</div>
          ) : (
            breakdowns.map((breakdown) => (
              <div key={breakdown.id} className="grid grid-cols-[1fr_120px_120px_120px] gap-3 px-5 py-4 items-center">
                <span className="text-white text-sm">{breakdown.machine_name}</span>
                <span className="text-center"><Badge variant={breakdown.severity === 'critical' ? 'critical' : breakdown.severity === 'major' ? 'warning' : 'secondary'}>{breakdown.severity}</Badge></span>
                <span className="text-center text-slate-200">{breakdown.breakdown_date.split('T')[0]}</span>
                <span className="text-center"><Badge variant={breakdown.resolved ? 'success' : 'warning'}>{breakdown.resolved ? 'Resolved' : 'Open'}</Badge></span>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}