import { AppLayout } from '../../components/layout/AppLayout';
import { useLabourPayments } from '../../hooks/useLabourPayments';
import { Badge } from '../../components/ui/Badge';

export function LabourAdvances() {
  const { advances, loading } = useLabourPayments();

  return (
    <AppLayout title="Labour Advances" subtitle="Track advance disbursal and repayment timelines for workers">
      <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
        <div className="grid grid-cols-[1fr_120px_120px] gap-3 px-5 py-3 text-slate-400 text-xs uppercase border-b border-slate-800">
          <span>Worker</span>
          <span className="text-center">Amount</span>
          <span className="text-center">Status</span>
        </div>
        <div className="divide-y divide-slate-800">
          {loading ? (
            <div className="p-6 text-slate-500">Loading labour advances…</div>
          ) : advances.length === 0 ? (
            <div className="p-6 text-slate-500">No advances recorded yet.</div>
          ) : (
            advances.map((advance) => (
              <div key={advance.id} className="grid grid-cols-[1fr_120px_120px] gap-3 px-5 py-4 items-center">
                <span className="text-white text-sm">{advance.worker_id || 'Worker'}</span>
                <span className="text-center text-slate-200">₹{advance.advance_amount.toFixed(0)}</span>
                <span className="text-center"><Badge variant={advance.status === 'paid' ? 'success' : 'warning'}>{advance.status}</Badge></span>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
