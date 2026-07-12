import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calendar, IndianRupee, ShieldCheck } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Card, StatCard } from '../../components/ui/Card';
import { EMPTY_WORKSPACE_SUMMARY, calculateContractorMonthlyAmount, getMyWorkspaceSummary, normalizeWorkspaceSummary, WorkspaceSummary } from '../../services/businessHierarchyService';

export function ContractorLicensingPage() {
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null);
  const [demoUsers, setDemoUsers] = useState(8);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyWorkspaceSummary()
      .then((data) => {
        if (!cancelled) setSummary(normalizeWorkspaceSummary(data));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load licences');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => {
    const licenses = normalizeWorkspaceSummary(summary || EMPTY_WORKSPACE_SUMMARY).licenses;
    return {
      actualUsers: licenses.reduce((total, license) => total + Number(license.actual_users || 0), 0),
      billableUsers: licenses.reduce((total, license) => total + Number(license.billable_users || 0), 0),
      monthlyAmount: licenses.reduce((total, license) => total + Number(license.monthly_amount || 0), 0),
      active: licenses.filter((license) => license.license_status === 'active').length,
    };
  }, [summary]);

  const demoBilling = calculateContractorMonthlyAmount(demoUsers);
  const licenses = normalizeWorkspaceSummary(summary || EMPTY_WORKSPACE_SUMMARY).licenses;

  return (
    <AppLayout title="Contractor Licensing" subtitle="Contractors pay. Government users remain free.">
      {error && (
        <Card className="mb-6 border-red-500/20">
          <div className="flex items-center gap-3 text-red-300">
            <AlertTriangle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Licences" value={totals.active} loading={loading} icon={<ShieldCheck size={18} />} color="#22c55e" />
        <StatCard label="Actual Users" value={totals.actualUsers} loading={loading} icon={<IndianRupee size={18} />} color="#3B82F6" />
        <StatCard label="Billable Users" value={totals.billableUsers} loading={loading} icon={<IndianRupee size={18} />} color="#F59E0B" />
        <StatCard label="Monthly Revenue" value={`₹${totals.monthlyAmount.toLocaleString('en-IN')}`} loading={loading} icon={<Calendar size={18} />} color="#FF6B00" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-white font-semibold">Licence Dashboard</h2>
              <p className="text-[#606060] text-xs mt-1">1 contractor project seat = 1 paid licence; minimum billing block is 10 users</p>
            </div>
            <Badge color="#F59E0B">₹270/user/month</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#808080] border-b border-[#2A2A2A]">
                  <th className="py-3 pr-4 font-medium">Contractor</th>
                  <th className="py-3 pr-4 font-medium">Actual</th>
                  <th className="py-3 pr-4 font-medium">Billable</th>
                  <th className="py-3 pr-4 font-medium">Amount</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Renewal</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((license) => (
                  <tr key={license.id} className="border-b border-[#232323] text-[#D0D0D0]">
                    <td className="py-3 pr-4 text-white">{license.contractor_name || 'Unnamed contractor'}</td>
                    <td className="py-3 pr-4">{Number(license.actual_users || 0)}</td>
                    <td className="py-3 pr-4">{Number(license.billable_users || 0)}</td>
                    <td className="py-3 pr-4">₹{Number(license.monthly_amount || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 pr-4"><StatusBadge status={license.license_status || 'unknown'} /></td>
                    <td className="py-3 pr-4">{license.renewal_date ? new Date(license.renewal_date).toLocaleDateString('en-IN') : 'Manual'}</td>
                  </tr>
                ))}
                {!loading && licenses.length === 0 && (
                  <tr>
                    <td className="py-6 text-[#808080]" colSpan={6}>No contractor licences found for this workspace.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h2 className="text-white font-semibold mb-2">Billing Rule Check</h2>
          <p className="text-[#808080] text-sm mb-5">Use this to verify the minimum 10-user block.</p>
          <label className="block text-xs text-[#808080] mb-2" htmlFor="demoUsers">Contractor users</label>
          <input
            id="demoUsers"
            type="number"
            min={0}
            value={demoUsers}
            onChange={(event) => setDemoUsers(Number(event.target.value))}
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-white outline-none focus:border-[#FF6B00]"
          />
          <div className="mt-5 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-[#808080]">Actual users</span><span className="text-white">{demoBilling.actualUsers}</span></div>
            <div className="flex justify-between text-sm"><span className="text-[#808080]">Billable users</span><span className="text-white">{demoBilling.billableUsers}</span></div>
            <div className="flex justify-between text-sm"><span className="text-[#808080]">Monthly amount</span><span className="text-white">₹{demoBilling.monthlyAmount.toLocaleString('en-IN')}</span></div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
