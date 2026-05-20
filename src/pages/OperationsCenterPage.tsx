import { Activity, AlertTriangle, Brain, CheckCircle2, Clock, Package, Shield, Truck, Zap } from '../lib/icons';
import { useOfflineSync } from '../hooks/useOfflineSync';

const cards = [
  { label: 'Live Project Alerts', value: '12', detail: '4 critical, 8 watchlist', icon: AlertTriangle, tone: 'text-red-400' },
  { label: 'Diesel Anomaly Feed', value: '7', detail: '2 high variance entries', icon: Truck, tone: 'text-orange-400' },
  { label: 'QC Defect Alerts', value: '18', detail: 'RCC, finish, material checks', icon: Shield, tone: 'text-yellow-300' },
  { label: 'Pending Approvals', value: '26', detail: 'JE 11, EE 9, SE 6', icon: CheckCircle2, tone: 'text-cyan-300' },
  { label: 'Contractor Risk Ranking', value: 'B+', detail: '3 contractors need review', icon: Package, tone: 'text-purple-300' },
  { label: 'Delay Prediction Board', value: '9', detail: 'AI forecasted slippages', icon: Clock, tone: 'text-pink-300' },
  { label: 'Live Sync Queue Health', value: 'Stable', detail: 'Offline actions monitored', icon: Activity, tone: 'text-emerald-300' },
  { label: 'AI Processing Queue', value: 'Ready', detail: 'Proxy, retries, audit active', icon: Brain, tone: 'text-blue-300' },
];

const riskRows = [
  ['Eastern Canal Package', 'High', 'Diesel variance and delayed QC closures'],
  ['NH Bypass Segment 4', 'Medium', 'Pending approvals over SLA'],
  ['District Hospital Block', 'Medium', 'Material wastage trend rising'],
  ['Rural Bridge Cluster', 'Low', 'Sync queue healthy after field upload burst'],
];

export function OperationsCenterPage() {
  const { pendingSync, status } = useOfflineSync();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Operations Center</h1>
          <p className="text-sm text-[#A0A0A0]">Enterprise live command view for projects, AI, field sync, and approvals.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
          <Zap size={16} />
          Production telemetry active
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, icon: Icon, tone }) => (
          <section key={label} className="rounded-lg border border-[#24243A] bg-[#11111A] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-sm text-[#A0A0A0]">{label}</span>
              <Icon size={18} className={tone} />
            </div>
            <div className="text-2xl font-bold">{label === 'Live Sync Queue Health' ? (pendingSync ? `${pendingSync} queued` : value) : value}</div>
            <p className="mt-1 text-xs text-[#808080]">{label === 'Live Sync Queue Health' ? `Status ${status}` : detail}</p>
          </section>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border border-[#24243A] bg-[#11111A] p-4">
          <h2 className="mb-4 text-lg font-semibold">Risk Ranking</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-[#808080]">
                <tr>
                  <th className="pb-3 font-medium">Project</th>
                  <th className="pb-3 font-medium">Risk</th>
                  <th className="pb-3 font-medium">Signal</th>
                </tr>
              </thead>
              <tbody>
                {riskRows.map(([project, risk, signal]) => (
                  <tr key={project} className="border-t border-[#24243A]">
                    <td className="py-3">{project}</td>
                    <td className="py-3">{risk}</td>
                    <td className="py-3 text-[#A0A0A0]">{signal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-[#24243A] bg-[#11111A] p-4">
          <h2 className="mb-4 text-lg font-semibold">Queue Health</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-[#24243A] pb-3"><span className="text-[#A0A0A0]">Offline sync</span><span>{pendingSync} pending</span></div>
            <div className="flex justify-between border-b border-[#24243A] pb-3"><span className="text-[#A0A0A0]">Queued uploads</span><span>Resumable</span></div>
            <div className="flex justify-between border-b border-[#24243A] pb-3"><span className="text-[#A0A0A0]">AI proxy</span><span>Throttled</span></div>
            <div className="flex justify-between"><span className="text-[#A0A0A0]">Realtime channels</span><span>Cleanup guarded</span></div>
          </div>
        </section>
      </div>
    </div>
  );
}
