import { AppLayout } from '../../components/layout/AppLayout';
import { useLabourPayments } from '../../hooks/useLabourPayments';
import { Badge } from '../../components/ui/Badge';

export function LabourSettlements() {
  const { settlements, loading } = useLabourPayments();

  return (
    <AppLayout title="Labour Settlements" subtitle="Review settlement records and worker payout reconciliation">
      <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
        <div className="grid grid-cols-[1fr_120px_120px] gap-3 px-5 py-3 text-slate-400 text-xs uppercase border-b border-slate-800">
          <span>Worker</span>
          <span className="text-center">Amount</span>
          <span className="text-center">Status</span>
        </div>
        <div className="divide-y divide-slate-800">
          {loading ? (
            <div className="p-6 text-slate-500">Loading settlement records…</div>
          ) : settlements.length === 0 ? (
            <div className="p-6 text-slate-500">No settlements found.</div>
          ) : (
            settlements.map((settlement) => (
              <div key={settlement.id} className="grid grid-cols-[1fr_120px_120px] gap-3 px-5 py-4 items-center">
                <span className="text-white text-sm">{settlement.worker_id || 'Worker'}</span>
                <span className="text-center text-slate-200">₹{settlement.settlement_amount.toFixed(0)}</span>
                <span className="text-center"><Badge variant={settlement.settlement_status === 'completed' ? 'success' : 'warning'}>{settlement.settlement_status}</Badge></span>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
