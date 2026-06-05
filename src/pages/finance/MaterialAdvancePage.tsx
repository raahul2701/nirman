import { AlertTriangle, FileText, IndianRupee, Package, UploadCloud } from '../../lib/icons';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { materialAdvanceDemo } from '../../services/executionDemoData';

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

export function MaterialAdvancePage() {
  const submitted = materialAdvanceDemo.reduce((sum, item) => sum + item.submittedValue, 0);
  const recommended = materialAdvanceDemo.reduce((sum, item) => sum + item.aiRecommendedEligibleValue, 0);
  const approved = materialAdvanceDemo.reduce((sum, item) => sum + item.approvedValue, 0);

  return (
    <AppLayout title="Material Advance" subtitle="Upload bills, photos, challans and certificates for AI-assisted eligible value review.">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Submitted Value" value={formatMoney(submitted)} icon={<IndianRupee size={18} />} color="#005F56" />
        <StatCard label="AI Recommended" value={formatMoney(recommended)} icon={<Package size={18} />} color="#C89B3C" />
        <StatCard label="Approved Value" value={formatMoney(approved)} icon={<FileText size={18} />} color="#0B8B7D" />
        <StatCard label="Pending Docs" value="1" icon={<AlertTriangle size={18} />} color="#B42318" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[360px_1fr]">
        <Card>
          <h3 className="text-sm font-bold text-[#12332D]">New Claim</h3>
          <div className="mt-4 grid gap-3">
            {['Project', 'Material type', 'Quantity received', 'Location/site', 'Supplier name', 'GST invoice number', 'BOQ item mapping', 'Agreement reference'].map((label) => (
              <input key={label} aria-label={label} placeholder={label} className="rounded-lg border border-[#EFE8D4] bg-white px-3 py-2 text-sm outline-none focus:border-[#005F56]" />
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-dashed border-[#CDBD82] bg-[#F9F7EF] p-4 text-center">
            <UploadCloud size={24} className="mx-auto text-[#005F56]" />
            <p className="mt-2 text-sm font-semibold text-[#12332D]">Bill, photo, challan, test certificate</p>
          </div>
          <Button className="mt-4 w-full" variant="primary" icon={<Package size={14} />}>Run AI Material Review</Button>
          <p className="mt-3 text-xs font-semibold text-[#6C7568]">AI recommended eligible value only. Final approval subject to EE/department verification.</p>
        </Card>

        <div className="space-y-4">
          {materialAdvanceDemo.map((claim) => (
            <Card key={claim.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6C7568]">{claim.project}</p>
                  <h3 className="mt-1 text-sm font-bold text-[#12332D]">{claim.material}</h3>
                  <p className="mt-1 text-xs text-[#6C7568]">{claim.warning}</p>
                </div>
                <span className="rounded-md bg-[#005F56]/10 px-2 py-1 text-xs font-bold text-[#005F56]">{claim.status}</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-lg bg-[#F9F7EF] p-3"><p className="text-xs text-[#6C7568]">Submitted</p><p className="font-bold">{formatMoney(claim.submittedValue)}</p></div>
                <div className="rounded-lg bg-[#F9F7EF] p-3"><p className="text-xs text-[#6C7568]">AI recommended</p><p className="font-bold">{formatMoney(claim.aiRecommendedEligibleValue)}</p></div>
                <div className="rounded-lg bg-[#F9F7EF] p-3"><p className="text-xs text-[#6C7568]">Approved</p><p className="font-bold">{formatMoney(claim.approvedValue)}</p></div>
                <div className="rounded-lg bg-[#F9F7EF] p-3"><p className="text-xs text-[#6C7568]">Pending docs</p><p className="font-bold">{claim.pendingDocuments.join(', ') || 'None'}</p></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
