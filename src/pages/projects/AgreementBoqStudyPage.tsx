import { useMemo, useState } from 'react';
import { Brain, ClipboardCheck, FileText, IndianRupee, UploadCloud } from '../../lib/icons';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { agreementStudyDemo } from '../../services/executionDemoData';

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

export function AgreementBoqStudyPage() {
  const [fileName, setFileName] = useState(agreementStudyDemo.documentName);
  const totalBoq = useMemo(() => agreementStudyDemo.boqItems.reduce((sum, item) => sum + item.amount, 0), []);

  return (
    <AppLayout title="Agreement & BOQ AI Study" subtitle="Upload agreement copies and structure BOQ, clauses, milestones, BG, SD, DLP, and payment terms.">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="BOQ Items" value={agreementStudyDemo.boqItems.length} icon={<FileText size={18} />} color="#005F56" />
        <StatCard label="Extracted Value" value={formatMoney(totalBoq)} icon={<IndianRupee size={18} />} color="#C89B3C" />
        <StatCard label="Milestones" value={agreementStudyDemo.milestones.length} icon={<ClipboardCheck size={18} />} color="#0B8B7D" />
        <StatCard label="AI Study" value="Ready" icon={<Brain size={18} />} color="#2F6B9A" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[360px_1fr]">
        <Card>
          <h3 className="text-sm font-bold text-[#12332D]">Agreement Upload</h3>
          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#CDBD82] bg-[#F9F7EF] p-6 text-center">
            <UploadCloud size={28} className="text-[#005F56]" />
            <span className="mt-2 text-sm font-semibold text-[#12332D]">{fileName}</span>
            <span className="mt-1 text-xs text-[#6C7568]">PDF/DOC/XLS metadata is linked to agreement_documents</span>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              onChange={(event) => setFileName(event.target.files?.[0]?.name || agreementStudyDemo.documentName)}
            />
          </label>
          <Button className="mt-4 w-full" variant="primary" icon={<Brain size={14} />}>Run AI Agreement Study</Button>
          <p className="mt-3 text-xs text-[#6C7568]">Extraction stores BOQ items, clauses, milestones, BG, SD, DLP and payment terms against project_id.</p>
        </Card>

        <div className="space-y-5">
          <Card>
            <h3 className="text-sm font-bold text-[#12332D]">Structured BOQ Items</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.12em] text-[#6C7568]">
                  <tr>
                    <th className="py-2">Item</th>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {agreementStudyDemo.boqItems.map((item) => (
                    <tr key={item.itemNo} className="border-t border-[#EFE8D4]">
                      <td className="py-3 font-semibold text-[#12332D]">{item.itemNo}</td>
                      <td>{item.description}</td>
                      <td>{item.quantity} {item.unit}</td>
                      <td>{formatMoney(item.rate)}</td>
                      <td className="font-semibold">{formatMoney(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-bold text-[#12332D]">Important Clauses & Milestones</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {agreementStudyDemo.clauses.concat(agreementStudyDemo.milestones).map((item) => (
                <div key={item} className="rounded-lg border border-[#EFE8D4] bg-[#F9F7EF] p-3 text-sm text-[#12332D]">{item}</div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
