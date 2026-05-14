import { AppLayout } from '../../components/layout/AppLayout';
import { useLabourPayments } from '../../hooks/useLabourPayments';
import { Badge } from '../../components/ui/Badge';

export function LabourPayments() {
  const { payments, pendingDue, loading } = useLabourPayments();

  return (
    <AppLayout title="Labour Payments" subtitle="Track daily wages, pending dues and salary audit trails">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 mb-6">
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Recent payments</p>
          <p className="mt-3 text-3xl text-white font-bold">{payments.length}</p>
        </div>
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Pending dues</p>
          <p className="mt-3 text-3xl text-white font-bold">{pendingDue}</p>
        </div>
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Live status</p>
          <p className="mt-3 text-3xl text-white font-bold">{loading ? 'Loading…' : 'Synced'}</p>
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
        <div className="grid grid-cols-[1fr_120px_120px_120px] gap-3 px-5 py-3 text-slate-400 text-xs uppercase border-b border-slate-800">
          <span>Worker</span>
          <span className="text-center">Amount</span>
          <span className="text-center">Mode</span>
          <span className="text-center">Status</span>
        </div>
        <div className="divide-y divide-slate-800">
          {payments.length === 0 ? (
            <div className="p-6 text-slate-500">No labour payments found yet.</div>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="grid grid-cols-[1fr_120px_120px_120px] gap-3 px-5 py-4 items-center">
                <span className="text-white text-sm">{payment.worker_id || 'Worker'}</span>
                <span className="text-center text-slate-200">₹{payment.payment_amount.toFixed(0)}</span>
                <span className="text-center text-slate-200">{payment.payment_mode}</span>
                <span className="text-center"><Badge variant={payment.payment_status === 'paid' ? 'success' : 'warning'}>{payment.payment_status}</Badge></span>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
