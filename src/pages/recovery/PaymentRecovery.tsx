import { AppLayout } from '../../components/layout/AppLayout';
import { usePaymentRecovery } from '../../hooks/usePaymentRecovery';
import { Badge } from '../../components/ui/Badge';

export function PaymentRecovery() {
  const { followups, overdueFollowups, loading } = usePaymentRecovery();

  return (
    <AppLayout title="Payment Recovery" subtitle="Monitor pending payments and escalation timelines for delayed bills">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 mb-6">
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Active followups</p>
          <p className="mt-3 text-3xl text-white font-bold">{followups.length}</p>
        </div>
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Overdue items</p>
          <p className="mt-3 text-3xl text-white font-bold">{overdueFollowups}</p>
        </div>
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Realtime sync</p>
          <p className="mt-3 text-3xl text-white font-bold">{loading ? 'Loading…' : 'Ready'}</p>
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
        <div className="grid grid-cols-[1fr_140px_140px_120px] gap-3 px-5 py-3 text-slate-400 text-xs uppercase border-b border-slate-800">
          <span>Department</span>
          <span className="text-center">Last Followup</span>
          <span className="text-center">Escalation</span>
          <span className="text-center">Next Action</span>
        </div>
        <div className="divide-y divide-slate-800">
          {followups.length === 0 ? (
            <div className="p-6 text-slate-500">No payment recovery followups found.</div>
          ) : (
            followups.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_140px_140px_120px] gap-3 px-5 py-4 items-center">
                <span className="text-white text-sm">{item.department}</span>
                <span className="text-center text-slate-200">{item.last_followup_date}</span>
                <span className="text-center"><Badge variant={item.escalation_level === 'critical' ? 'critical' : item.escalation_level === 'high' ? 'warning' : 'secondary'}>{item.escalation_level}</Badge></span>
                <span className="text-center text-slate-200">{item.next_followup_date || 'TBD'}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
