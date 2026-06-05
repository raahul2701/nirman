import { AlertTriangle, ClipboardCheck, FileText, Ruler, UploadCloud } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { surveyQuantityDemo } from '../../services/executionDemoData';

export function SurveyQuantityPage() {
  const warnings = surveyQuantityDemo.filter((row) => row.shortfallCum > 0);

  return (
    <AppLayout title="Survey & Quantity" subtitle="Manual TBM, auto level, total station and future DGPS/CSV support for quantity calculation.">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Level Entries" value={surveyQuantityDemo.length} icon={<Ruler size={18} />} color="#005F56" />
        <StatCard label="Warnings" value={warnings.length} icon={<AlertTriangle size={18} />} color="#B42318" />
        <StatCard label="Shortfall Qty" value={`${warnings.reduce((sum, row) => sum + row.shortfallCum, 0)} cum`} icon={<ClipboardCheck size={18} />} color="#C89B3C" />
        <StatCard label="AI Checks" value="Active" icon={<FileText size={18} />} color="#0B8B7D" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[360px_1fr]">
        <Card>
          <h3 className="text-sm font-bold text-[#12332D]">TBM Manual Entry</h3>
          <div className="mt-4 grid gap-3">
            {['Project', 'Chainage', 'TBM reference', 'Benchmark RL', 'Backsight', 'Intermediate sight', 'Foresight', 'Formation level', 'Design level', 'Layer/component type'].map((label) => (
              <input key={label} aria-label={label} placeholder={label} className="rounded-lg border border-[#EFE8D4] bg-white px-3 py-2 text-sm outline-none focus:border-[#005F56]" />
            ))}
            <textarea aria-label="Remarks" placeholder="Remarks" className="min-h-20 rounded-lg border border-[#EFE8D4] bg-white px-3 py-2 text-sm outline-none focus:border-[#005F56]" />
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="primary" icon={<ClipboardCheck size={14} />}>Calculate RL</Button>
            <Button variant="secondary" icon={<UploadCloud size={14} />}>Upload Data</Button>
          </div>
        </Card>

        <div className="space-y-5">
          {surveyQuantityDemo.map((row) => (
            <Card key={row.chainage}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6C7568]">{row.tbm} / {row.component}</p>
                  <h3 className="mt-1 text-sm font-bold text-[#12332D]">Chainage {row.chainage}</h3>
                  <p className="mt-1 text-xs text-[#6C7568]">Calculated RL {row.calculatedRl} / Formation {row.formationLevel} / Design {row.designLevel}</p>
                </div>
                <span className={`rounded-md px-2 py-1 text-xs font-bold ${row.shortfallCum > 0 ? 'bg-[#B42318]/10 text-[#B42318]' : 'bg-[#005F56]/10 text-[#005F56]'}`}>{row.warning}</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-lg bg-[#F9F7EF] p-3"><p className="text-xs text-[#6C7568]">Required crust</p><p className="font-bold">{row.requiredThicknessMm} mm</p></div>
                <div className="rounded-lg bg-[#F9F7EF] p-3"><p className="text-xs text-[#6C7568]">Actual available</p><p className="font-bold">{row.actualThicknessMm} mm</p></div>
                <div className="rounded-lg bg-[#F9F7EF] p-3"><p className="text-xs text-[#6C7568]">Deficiency</p><p className="font-bold">{Math.max(0, row.requiredThicknessMm - row.actualThicknessMm)} mm</p></div>
                <div className="rounded-lg bg-[#F9F7EF] p-3"><p className="text-xs text-[#6C7568]">Shortfall quantity</p><p className="font-bold">{row.shortfallCum} cum</p></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
