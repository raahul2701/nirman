import { AppLayout } from '../../components/layout/AppLayout';
import { usePaymentRecovery } from '../../hooks/usePaymentRecovery';

export function DepartmentFollowups() {
  const { visits, loading } = usePaymentRecovery();

  return (
    <AppLayout title="Department Followups" subtitle="Track treasury meetings, JE discussions and field file movements">
      <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
        <div className="grid grid-cols-[1fr_140px_140px] gap-3 px-5 py-3 text-slate-400 text-xs uppercase border-b border-slate-800">
          <span>Visit Type</span>
          <span className="text-center">Date</span>
          <span className="text-center">Followup ID</span>
        </div>
        <div className="divide-y divide-slate-800">
          {loading ? (
            <div className="p-6 text-slate-500">Loading department visits…</div>
          ) : visits.length === 0 ? (
            <div className="p-6 text-slate-500">No visits recorded yet.</div>
          ) : (
            visits.map((visit) => (
              <div key={visit.id} className="grid grid-cols-[1fr_140px_140px] gap-3 px-5 py-4 items-center">
                <span className="text-white text-sm">{visit.visit_type}</span>
                <span className="text-center text-slate-200">{visit.visit_date}</span>
                <span className="text-center text-slate-200">{visit.followup_id}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
