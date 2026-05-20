import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, FolderTree, IndianRupee, Link, Send, ShieldCheck, UserPlus } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, StatCard } from '../../components/ui/Card';
import { calculateContractorMonthlyAmount } from '../../services/businessHierarchyService';
import {
  pilotChecklistItems,
  pilotGoogleConnection,
  pilotLicenses,
  pilotPeople,
  pilotProjects,
  pilotRecommendations,
  pilotWorkspace,
} from '../../services/pilotSeedData';

type DemoStep = 'recommended' | 'accepted' | 'licensed';

function personName(id: string | null | undefined) {
  if (!id) return '-';
  return pilotPeople.find((person) => person.id === id)?.name || id.slice(0, 8);
}

export function PilotAdminPage() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [demoStep, setDemoStep] = useState<DemoStep>('recommended');
  const [demoUsers, setDemoUsers] = useState(8);

  const totals = useMemo(() => ({
    monthlyAmount: pilotLicenses.reduce((total, license) => total + Number(license.monthly_amount || 0), 0),
    actualUsers: pilotLicenses.reduce((total, license) => total + license.contractor_user_count, 0),
    billableUsers: pilotLicenses.reduce((total, license) => total + license.billable_users, 0),
  }), []);

  const demoBilling = calculateContractorMonthlyAmount(demoUsers);
  const completedChecks = Object.values(checkedItems).filter(Boolean).length;

  function toggleChecklist(id: string) {
    setCheckedItems((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <AppLayout title="Pilot Admin" subtitle="2-3 engineer pilot readiness, demo seed data, and manual verification">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pilot Projects" value={pilotProjects.length} icon={<FolderTree size={18} />} color="#00D4AA" />
        <StatCard label="Contractors" value={pilotLicenses.length} icon={<ShieldCheck size={18} />} color="#3B82F6" />
        <StatCard label="Billable Users" value={totals.billableUsers} icon={<IndianRupee size={18} />} color="#F59E0B" />
        <StatCard label="Monthly Billing" value={`₹${totals.monthlyAmount.toLocaleString('en-IN')}`} icon={<IndianRupee size={18} />} color="#FF6B00" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-white font-semibold">Pilot Workspace Hierarchy</h2>
              <p className="text-[#606060] text-xs">{pilotWorkspace.workspace_name} · {pilotWorkspace.division_code}</p>
            </div>
            <Badge color="#22c55e">Government users free</Badge>
          </div>

          <div className="space-y-3">
            {pilotPeople.filter((person) => person.role !== 'Contractor').map((person) => (
              <div key={person.id} className="rounded-lg border border-[#2A2A2A] bg-[#111111] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-white text-sm">{person.name}</p>
                    <p className="text-[#808080] text-xs">{person.role}{person.parentId ? ` · reports to ${personName(person.parentId)}` : ''}</p>
                  </div>
                  <Badge color={person.role === 'Executive Engineer' ? '#00D4AA' : '#3B82F6'}>{person.role}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-white font-semibold mb-4">Google API Status</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-[#808080]">Drive root</span><Badge color="#00D4AA">Mapped</Badge></div>
            <div className="flex justify-between text-sm"><span className="text-[#808080]">Gemini</span><StatusBadge status={pilotGoogleConnection.gemini_api_status} /></div>
            <div className="flex justify-between text-sm"><span className="text-[#808080]">Maps</span><StatusBadge status={pilotGoogleConnection.maps_api_status} /></div>
            <div className="flex justify-between text-sm"><span className="text-[#808080]">Setup</span><StatusBadge status={pilotGoogleConnection.setup_status} /></div>
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-semibold">Contractor Licences And Assigned Projects</h2>
            <p className="text-[#606060] text-xs">Seed includes 8 users billed as 10, 12 users billed as 12, and one trial contractor.</p>
          </div>
          <Badge color="#F59E0B">₹270/user/month</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#808080] border-b border-[#2A2A2A]">
                <th className="py-3 pr-4 font-medium">Contractor</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium">Actual</th>
                <th className="py-3 pr-4 font-medium">Billable</th>
                <th className="py-3 pr-4 font-medium">Monthly</th>
                <th className="py-3 pr-4 font-medium">Projects</th>
              </tr>
            </thead>
            <tbody>
              {pilotLicenses.map((license) => {
                const assigned = pilotProjects.filter((project) => project.contractorId === license.contractor_id);
                return (
                  <tr key={license.id} className="border-b border-[#232323] text-[#D0D0D0]">
                    <td className="py-3 pr-4 text-white">{license.contractor_company_name}</td>
                    <td className="py-3 pr-4"><StatusBadge status={license.license_status} /></td>
                    <td className="py-3 pr-4">{license.contractor_user_count}</td>
                    <td className="py-3 pr-4">{license.billable_users}</td>
                    <td className="py-3 pr-4">₹{Number(license.monthly_amount).toLocaleString('en-IN')}</td>
                    <td className="py-3 pr-4">{assigned.map((project) => project.code).join(', ')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <FolderTree size={22} className="text-[#00D4AA]" />
            <div>
              <h2 className="text-white font-semibold">EE Drive Folder Mappings</h2>
              <p className="text-[#606060] text-xs">Government documents stay under the EE workspace root.</p>
            </div>
          </div>
          <div className="space-y-3">
            {pilotProjects.map((project) => (
              <div key={project.id} className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-3">
                <p className="text-white text-sm">{project.name}</p>
                <p className="text-[#808080] text-xs mt-1 break-all">{project.driveFolderPath}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-5">
            <UserPlus size={22} className="text-[#FF6B00]" />
            <div>
              <h2 className="text-white font-semibold">Onboarding Demo Flow</h2>
              <p className="text-[#606060] text-xs">Local simulation only; no payment or external messages sent.</p>
            </div>
          </div>

          <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-4 mb-4">
            <p className="text-white text-sm">{pilotRecommendations[0].contractor_company_name}</p>
            <div className="mt-2 flex items-center gap-2 text-[#808080] text-xs">
              <Link size={12} />
              <span>{pilotRecommendations[0].onboarding_token}</span>
            </div>
          </div>

          <label className="block text-xs text-[#808080] mb-2" htmlFor="demoContractorUsers">Demo contractor users</label>
          <input
            id="demoContractorUsers"
            type="number"
            min={0}
            value={demoUsers}
            onChange={(event) => setDemoUsers(Number(event.target.value))}
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-white outline-none focus:border-[#FF6B00]"
          />

          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-[#111111] border border-[#2A2A2A] p-3"><p className="text-[#808080] text-xs">Actual</p><p className="text-white font-semibold">{demoBilling.actualUsers}</p></div>
            <div className="rounded-lg bg-[#111111] border border-[#2A2A2A] p-3"><p className="text-[#808080] text-xs">Billable</p><p className="text-white font-semibold">{demoBilling.billableUsers}</p></div>
            <div className="rounded-lg bg-[#111111] border border-[#2A2A2A] p-3"><p className="text-[#808080] text-xs">Monthly</p><p className="text-white font-semibold">₹{demoBilling.monthlyAmount.toLocaleString('en-IN')}</p></div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="sm" variant={demoStep === 'recommended' ? 'primary' : 'secondary'} icon={<Send size={12} />} onClick={() => setDemoStep('recommended')}>EE Recommended</Button>
            <Button size="sm" variant={demoStep === 'accepted' ? 'primary' : 'secondary'} icon={<CheckCircle2 size={12} />} onClick={() => setDemoStep('accepted')}>Contractor Accepted</Button>
            <Button size="sm" variant={demoStep === 'licensed' ? 'primary' : 'secondary'} icon={<IndianRupee size={12} />} onClick={() => setDemoStep('licensed')}>Licence Created</Button>
          </div>
          <p className="mt-4 text-sm text-[#D0D0D0]">
            Current step: <span className="text-[#00D4AA] font-semibold">{demoStep.replace('_', ' ')}</span>
          </p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <ClipboardCheck size={22} className="text-[#00D4AA]" />
            <div>
              <h2 className="text-white font-semibold">Manual Verification Checklist</h2>
              <p className="text-[#606060] text-xs">Pilot operator can tick these during the engineer demo.</p>
            </div>
          </div>
          <Badge color="#00D4AA">{completedChecks}/{pilotChecklistItems.length} checked</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {pilotChecklistItems.map((item) => (
            <label key={item.id} className="flex cursor-pointer gap-3 rounded-lg border border-[#2A2A2A] bg-[#111111] p-4">
              <input
                type="checkbox"
                checked={Boolean(checkedItems[item.id])}
                onChange={() => toggleChecklist(item.id)}
                className="mt-1 h-4 w-4 accent-[#00D4AA]"
              />
              <span>
                <span className="block text-white text-sm font-medium">{item.label}</span>
                <span className="block text-[#808080] text-xs mt-1">{item.expected}</span>
              </span>
            </label>
          ))}
        </div>
      </Card>
    </AppLayout>
  );
}
