import { useEffect, useState } from 'react';
import { KeyRound, Plus, UserMinus, Users, X } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import {
  SITE_TEAM_ROLE,
  type SiteTeamRole,
  deactivateContractorSiteTeamMember,
  listContractorSiteTeam,
  loadContractorProjects,
  provisionContractorSiteTeamMember,
  requestContractorSiteTeamPasswordReset,
  type ContractorSiteTeamMember,
} from '../services/contractorSiteTeamService';
import type { ProjectOption } from '../services/assignedProjectsService';

const roleOptions = [
  { value: SITE_TEAM_ROLE, label: 'Project Manager' },
  { value: 'surveyor', label: 'Surveyor' },
  { value: 'subcontractor', label: 'Subcontractor — Authorization pending', disabled: true },
  { value: 'labour_contractor', label: 'Labour Contractor — Authorization pending', disabled: true },
  { value: 'site_engineer', label: 'Site Engineer — Authorization pending', disabled: true },
  { value: 'storekeeper', label: 'Storekeeper — Authorization pending', disabled: true },
  { value: 'mechanical_engineer', label: 'Mechanical Engineer — Authorization pending', disabled: true },
  { value: 'electrical_engineer', label: 'Electrical Engineer — Authorization pending', disabled: true },
  { value: 'qc_engineer', label: 'QC Engineer — Authorization pending', disabled: true },
  { value: 'labour_supervisor', label: 'Labour Supervisor — Authorization pending', disabled: true },
];

const initialForm: { role: SiteTeamRole; fullName: string; email: string; phone: string; location: string; employeeCode: string; loginIdentifier: string; projectId: string; scopeType: string; workPackageRef: string } = { role: SITE_TEAM_ROLE, fullName: '', email: '', phone: '', location: '', employeeCode: '', loginIdentifier: '', projectId: '', scopeType: '', workPackageRef: '' };

export function ContractorSiteTeamPage() {
  const [members, setMembers] = useState<ContractorSiteTeamMember[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [loadedMembers, loadedProjects] = await Promise.all([listContractorSiteTeam(), loadContractorProjects()]);
      setMembers(loadedMembers); setProjects(loadedProjects);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load your Site Team.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const scopeType = form.scopeType.trim();
    const workPackageRef = form.workPackageRef.trim();
    if (!form.fullName.trim() || !form.email.trim() || !form.loginIdentifier.trim() || !form.projectId || !scopeType) {
      setError('Full Name, Email, Login Identifier, Project, and Scope Type are required.'); return;
    }
    if (scopeType === 'entire_project' && workPackageRef) {
      setError('Entire-project scope must not include a work package reference.'); return;
    }
    if (scopeType === 'work_package' && !workPackageRef) {
      setError('A Work Package Reference is required for work-package scope.'); return;
    }
    setSubmitting(true); setError('');
    try {
      await provisionContractorSiteTeamMember({
        fullName: form.fullName.trim(), email: form.email.trim(), phone: form.phone.trim() || undefined,
        location: form.location.trim() || undefined, employeeCode: form.employeeCode.trim() || undefined,
        loginIdentifier: form.loginIdentifier.trim(),
        scope: { projectId: form.projectId, role: form.role, scopeType, workPackageRef: scopeType === 'work_package' ? workPackageRef : undefined },
      });
      setShowForm(false); setForm(initialForm); await load();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : `Could not provision the ${form.role === 'surveyor' ? 'Surveyor' : 'Project Manager'}.`); }
    finally { setSubmitting(false); }
  }

  async function lifecycle(action: 'deactivate' | 'reset', member: ContractorSiteTeamMember) {
    if (!member.active && action === 'deactivate') return;
    setError('');
    try {
      if (action === 'deactivate') await deactivateContractorSiteTeamMember(member.user_id);
      else await requestContractorSiteTeamPasswordReset(member.user_id);
      await load();
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Could not update the Site Team member.'); }
  }

  return <AppLayout title="Contractor Site Team" subtitle="Create and manage your authorized Project Manager and Surveyor site team">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#232323] bg-[#1A1A1A] p-5">
      <div><h2 className="text-lg font-bold text-white">Site Team</h2><p className="mt-1 text-sm text-[#A0A0A0]">Project Manager and Surveyor provisioning are currently authorized.</p></div>
      <Button variant="primary" icon={<Plus size={15} />} onClick={() => { setError(''); setShowForm(true); }}>Create Site Team Member</Button>
    </div>
    {error && <p className="mb-4 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</p>}
    <div className="rounded-2xl border border-[#232323] bg-[#1A1A1A] p-5">
      {loading ? <p className="py-10 text-center text-sm text-[#A0A0A0]">Loading Site Team…</p> : members.length === 0 ? <div className="py-12 text-center text-[#A0A0A0]"><Users className="mx-auto mb-3 text-[#606060]" size={38} /><p>No Project Managers or Surveyors in your Site Team.</p></div> :
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-[#303030] text-xs uppercase text-[#808080]"><tr><th className="pb-3 pr-4">Name</th><th className="pb-3 pr-4">Role</th><th className="pb-3 pr-4">Employee Code</th><th className="pb-3 pr-4">Login Identifier</th><th className="pb-3 pr-4">Project</th><th className="pb-3 pr-4">Status</th><th className="pb-3">Actions</th></tr></thead><tbody>{members.map((member) => <tr key={member.id} className="border-b border-[#303030] text-[#D0D0D0] last:border-0"><td className="py-3 pr-4"><p className="font-medium text-white">{member.full_name}</p><p className="text-xs text-[#808080]">{member.email || member.phone || 'No contact'}</p></td><td className="py-3 pr-4">{member.role === 'surveyor' ? 'Surveyor' : 'Project Manager'}</td><td className="py-3 pr-4">{member.employee_code || '—'}</td><td className="py-3 pr-4">{member.login_identifier || '—'}</td><td className="py-3 pr-4">{member.project_label}</td><td className="py-3 pr-4">{member.active ? <span className="text-emerald-300">Active</span> : <span className="text-red-300">Deactivated</span>}{member.password_reset_required && <p className="text-xs text-amber-300">Password reset required</p>}</td><td className="py-3"><div className="flex gap-2"><Button size="sm" variant="outline" disabled={!member.active} icon={<KeyRound size={12} />} onClick={() => void lifecycle('reset', member)}>Request reset</Button><Button size="sm" variant="ghost" disabled={!member.active} icon={<UserMinus size={12} />} onClick={() => void lifecycle('deactivate', member)}>Deactivate</Button></div></td></tr>)}</tbody></table></div>}
    </div>
    {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#303030] bg-[#1A1A1A] p-5" role="dialog" aria-modal="true" aria-labelledby="site-team-form-title"><div className="mb-5 flex items-start justify-between"><div><h2 id="site-team-form-title" className="text-lg font-bold text-white">Create Site Team Member</h2><p className="mt-1 text-xs text-[#A0A0A0]">Project Manager and Surveyor are the currently authorized roles.</p></div><button type="button" onClick={() => !submitting && setShowForm(false)} className="text-[#A0A0A0] hover:text-white"><X size={18} /></button></div><form onSubmit={submit} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Select label="Role" value={form.role} onChange={(event) => setForm((value) => ({ ...value, role: event.target.value as SiteTeamRole }))} options={roleOptions} /><Input label="Full Name" value={form.fullName} onChange={(event) => setForm((value) => ({ ...value, fullName: event.target.value }))} required /><Input label="Email" type="email" value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} required /><Input label="Phone" type="tel" value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} /><Input label="Location" value={form.location} onChange={(event) => setForm((value) => ({ ...value, location: event.target.value }))} /><Input label="Employee Code" value={form.employeeCode} onChange={(event) => setForm((value) => ({ ...value, employeeCode: event.target.value }))} /><Input label="Login Identifier" value={form.loginIdentifier} onChange={(event) => setForm((value) => ({ ...value, loginIdentifier: event.target.value }))} required /><Select label="Project" value={form.projectId} onChange={(event) => setForm((value) => ({ ...value, projectId: event.target.value }))} options={[{ value: '', label: 'Select accessible project' }, ...projects.map((project) => ({ value: project.id, label: project.label }))]} /><Select label="Scope Type" value={form.scopeType} onChange={(event) => setForm((value) => ({ ...value, scopeType: event.target.value, workPackageRef: event.target.value === 'entire_project' ? '' : value.workPackageRef }))} options={[{ value: '', label: 'Select scope type' }, { value: 'entire_project', label: 'Entire Project' }, { value: 'work_package', label: 'Work Package' }]} /><Input label="Work Package Reference" value={form.workPackageRef} onChange={(event) => setForm((value) => ({ ...value, workPackageRef: event.target.value }))} /></div><p className="text-xs text-[#A0A0A0]">Entire-project scope covers the whole project; work-package scope requires the exact authorized work package reference.</p><div className="flex gap-3"><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)} disabled={submitting}>Cancel</Button><Button type="submit" variant="primary" className="flex-1" loading={submitting}>Provision Site Team Member</Button></div></form></div></div>}
  </AppLayout>;
}
