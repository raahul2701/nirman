import { useMemo } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { useMaterialVariance } from '../../hooks/useMaterialVariance';

export function MaterialReconciliation() {
  const { reconciliations, totalVariance, activeAlerts, loading } = useMaterialVariance();

  const summary = useMemo(() => ({
    count: reconciliations.length,
    averageVariance: reconciliations.length ? totalVariance / reconciliations.length : 0,
  }), [reconciliations, totalVariance]);

  return (
    <AppLayout title="Material Reconciliation" subtitle="Compare theoretical material needs with actual usage for theft and wastage detection">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 mb-6">
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Variance records</p>
          <p className="mt-3 text-3xl text-white font-bold">{summary.count}</p>
        </div>
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Average variance</p>
          <p className="mt-3 text-3xl text-white font-bold">{summary.averageVariance.toFixed(2)}%</p>
        </div>
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Active alerts</p>
          <p className="mt-3 text-3xl text-white font-bold">{activeAlerts}</p>
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
        <div className="grid grid-cols-[1fr_120px_120px_120px] gap-3 px-5 py-3 text-slate-400 text-xs uppercase border-b border-slate-800">
          <span>Material</span>
          <span className="text-center">Required</span>
          <span className="text-center">Used</span>
          <span className="text-center">Variance</span>
        </div>
        <div className="divide-y divide-slate-800">
          {loading ? (
            <div className="p-6 text-slate-500">Loading material reconciliation...</div>
          ) : reconciliations.length === 0 ? (
            <div className="p-6 text-slate-500">No reconciliation records found.</div>
          ) : (
            reconciliations.slice(0, 10).map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_120px_120px_120px] gap-3 px-5 py-4 items-center">
                <span className="text-white text-sm">{item.material_name}</span>
                <span className="text-center text-slate-200">{item.theoretical_required}</span>
                <span className="text-center text-slate-200">{item.actual_consumption}</span>
                <span className="text-center text-white">{item.variance_percent.toFixed(1)}%</span>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
