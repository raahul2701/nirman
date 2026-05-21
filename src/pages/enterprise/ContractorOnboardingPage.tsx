import { FormEvent, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Link, Send, UserPlus } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../contexts/useAuth';
import { EMPTY_WORKSPACE_SUMMARY, getMyWorkspaceSummary, normalizeWorkspaceSummary, recommendContractor, WorkspaceSummary } from '../../services/businessHierarchyService';

export function ContractorOnboardingPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null);
  const [contractorName, setContractorName] = useState('');
  const [contractorEmail, setContractorEmail] = useState('');
  const [contractorPhone, setContractorPhone] = useState('');
  const [contractorCompany, setContractorCompany] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await getMyWorkspaceSummary();
    setSummary(normalizeWorkspaceSummary(data));
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load onboarding data'));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!summary?.workspace || !user) return;
    setSaving(true);
    setError(null);
    try {
      const recommendation = await recommendContractor({
        workspaceId: summary.workspace.id,
        recommendedByExecutiveEngineerId: user.id,
        contractorName,
        contractorEmail,
        contractorPhone,
        contractorCompanyName: contractorCompany,
      });
      setMessage(`Recommendation created. Onboarding token: ${recommendation.onboarding_token}`);
      setContractorName('');
      setContractorEmail('');
      setContractorPhone('');
      setContractorCompany('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recommend contractor');
    } finally {
      setSaving(false);
    }
  }

  const safeSummary = normalizeWorkspaceSummary(summary || EMPTY_WORKSPACE_SUMMARY);
  const recommendations = safeSummary.recommendations;

  return (
    <AppLayout title="Contractor Onboarding" subtitle="EE recommends, contractor registers, contractor pays">
      {error && (
        <Card className="mb-6 border-red-500/20">
          <div className="flex items-center gap-3 text-red-300">
            <AlertTriangle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        </Card>
      )}
      {message && (
        <Card className="mb-6 border-green-500/20">
          <div className="flex items-center gap-3 text-green-300">
            <CheckCircle2 size={18} />
            <span className="text-sm">{message}</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-1">
          <div className="flex items-center gap-3 mb-5">
            <UserPlus size={22} className="text-[#FF6B00]" />
            <div>
              <h2 className="text-white font-semibold">Recommend Contractor</h2>
              <p className="text-[#606060] text-xs">Billing owner remains contractor</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs text-[#808080] mb-2" htmlFor="contractorName">Contractor name</label>
              <input id="contractorName" value={contractorName} onChange={(event) => setContractorName(event.target.value)} required className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-white outline-none focus:border-[#FF6B00]" />
            </div>
            <div>
              <label className="block text-xs text-[#808080] mb-2" htmlFor="contractorCompany">Company</label>
              <input id="contractorCompany" value={contractorCompany} onChange={(event) => setContractorCompany(event.target.value)} className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-white outline-none focus:border-[#FF6B00]" />
            </div>
            <div>
              <label className="block text-xs text-[#808080] mb-2" htmlFor="contractorEmail">Email</label>
              <input id="contractorEmail" type="email" value={contractorEmail} onChange={(event) => setContractorEmail(event.target.value)} className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-white outline-none focus:border-[#FF6B00]" />
            </div>
            <div>
              <label className="block text-xs text-[#808080] mb-2" htmlFor="contractorPhone">Phone</label>
              <input id="contractorPhone" value={contractorPhone} onChange={(event) => setContractorPhone(event.target.value)} className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-white outline-none focus:border-[#FF6B00]" />
            </div>
            <Button type="submit" variant="primary" loading={saving} disabled={!safeSummary.workspace || !user} icon={<Send size={14} />}>Create Recommendation</Button>
          </form>
        </Card>

        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-white font-semibold">Recommendation Flow</h2>
              <p className="text-[#606060] text-xs">Contractor receives onboarding link, registers, buys minimum 10-user pack, then gains approved project access.</p>
            </div>
            <Badge color="#22c55e">EE never billed</Badge>
          </div>
          <div className="space-y-3">
            {recommendations.map((recommendation) => (
              <div key={recommendation.id} className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-white text-sm">{recommendation.contractor_company_name || recommendation.contractor_name}</p>
                    <p className="text-[#606060] text-xs">{recommendation.contractor_email || recommendation.contractor_phone || 'No contact added'}</p>
                    <div className="mt-2 flex items-center gap-2 text-[#808080] text-xs">
                      <Link size={12} />
                      <span>{recommendation.onboarding_token}</span>
                    </div>
                  </div>
                  <StatusBadge status={recommendation.status || 'unknown'} />
                </div>
              </div>
            ))}
            {recommendations.length === 0 && (
              <p className="text-[#808080] text-sm">No contractor recommendations found.</p>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
