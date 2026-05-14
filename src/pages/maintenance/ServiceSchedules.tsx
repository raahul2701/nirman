import { AppLayout } from '../../components/layout/AppLayout';
import { useMaintenance } from '../../hooks/useMaintenance';
import { Badge } from '../../components/ui/Badge';

export function ServiceSchedules() {
  const { schedules, loading } = useMaintenance();

  return (
    <AppLayout title="Maintenance Schedule" subtitle="Planned preventive maintenance and next due service dates">
      <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
        <div className="grid grid-cols-[1fr_140px_140px_140px] gap-3 px-5 py-3 text-slate-400 text-xs uppercase border-b border-slate-800">
          <span>Machine</span>
          <span className="text-center">Next due</span>
          <span className="text-center">Status</span>
          <span className="text-center">Service type</span>
        </div>
        <div className="divide-y divide-slate-800">
          {loading ? (
            <div className="p-6 text-slate-500">Loading service schedules…</div>
          ) : schedules.length === 0 ? (
            <div className="p-6 text-slate-500">No scheduled maintenance found.</div>
          ) : (
            schedules.map((schedule) => (
              <div key={schedule.id} className="grid grid-cols-[1fr_140px_140px_140px] gap-3 px-5 py-4 items-center">
                <span className="text-white text-sm">{schedule.machine_name}</span>
                <span className="text-center text-slate-200">{schedule.next_service_date || 'TBD'}</span>
                <span className="text-center"><Badge variant={schedule.status === 'completed' ? 'success' : 'warning'}>{schedule.status}</Badge></span>
                <span className="text-center text-slate-200">{schedule.machine_type}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
