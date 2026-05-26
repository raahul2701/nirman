import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Edit3, FolderTree, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { logAssignmentCreated } from '../../services/activityLogger';
import { useAuth } from '../../contexts/useAuth';

type WorkspaceRow = {
  id: string;
  executive_engineer_id: string;
  workspace_name: string;
  division_code?: string | null;
  department?: string | null;
  district?: string | null;
  status?: string | null;
};

type WorkspaceUserRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'executive_engineer' | 'assistant_engineer' | 'junior_engineer' | 'contractor' | 'admin_viewer' | string;
  active?: boolean | null;
  parent_user_id?: string | null;
  subdivision_name?: string | null;
};

type ProfileRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  company?: string | null;
  role?: string | null;
};

type ProjectOption = {
  id: string;
  table: 'gov_projects' | 'projects';
  label: string;
  code?: string | null;
  contractorName?: string | null;
};

type ContractorLicenseRow = {
  contractor_id: string;
  contractor_company_name?: string | null;
  license_status?: string | null;
};

type AssignmentRow = {
  id: string;
  workspace_id: string;
  project_id: string;
  project_table?: string | null;
  executive_engineer_id: string;
  assistant_engineer_id?: string | null;
  junior_engineer_id?: string | null;
  contractor_id?: string | null;
  contractor_company_name?: string | null;
  access_status?: string | null;
};

type AssignmentStatus = 'active' | 'pilot' | 'paused' | 'locked' | 'completed' | 'archived';

const EMPTY_VALUE = '__none__';

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'pilot', label: 'Pilot' },
  { value: 'paused', label: 'Paused' },
  { value: 'locked', label: 'Locked' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

function displayName(profile: ProfileRow | undefined, fallback: string) {
  return profile?.full_name || profile?.company || profile?.email || fallback;
}

function shortId(value: string | null | undefined, fallback = '-') {
  return value ? String(value).slice(0, 8) : fallback;
}

function toUiStatus(status: string | null | undefined): AssignmentStatus {
  if (status === 'pilot' || status === 'paused' || status === 'locked' || status === 'completed' || status === 'archived') return status;
  return 'active';
}

function selectValue(value: string | null | undefined) {
  return value || EMPTY_VALUE;
}

export function AssignProjectPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUserRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [licenses, setLicenses] = useState<ContractorLicenseRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [assistantEngineerId, setAssistantEngineerId] = useState('');
  const [juniorEngineerId, setJuniorEngineerId] = useState('');
  const [contractorId, setContractorId] = useState('');
  const [status, setStatus] = useState<AssignmentStatus>('pilot');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  async function loadData(preferredWorkspaceId?: string) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const nextWarnings: string[] = [];
    try {
      const workspaceResult = await supabase
        .from('executive_engineer_workspaces')
        .select('id, executive_engineer_id, workspace_name, division_code, department, district, status')
        .order('created_at', { ascending: false });

      if (workspaceResult.error) throw workspaceResult.error;
      const loadedWorkspaces = (workspaceResult.data || []) as WorkspaceRow[];
      setWorkspaces(loadedWorkspaces);

      const nextWorkspaceId = preferredWorkspaceId || workspaceId || loadedWorkspaces[0]?.id || '';
      setWorkspaceId(nextWorkspaceId);

      let loadedProjects: ProjectOption[] = [];
      const govProjectsResult = await supabase
        .from('gov_projects')
        .select('id, project_name, project_code, contractor_name')
        .order('created_at', { ascending: false });

      if (govProjectsResult.error) {
        nextWarnings.push(`gov_projects unavailable: ${govProjectsResult.error.message}`);
        const legacyResult = await supabase
          .from('projects')
          .select('id, name, contractor_id')
          .order('created_at', { ascending: false });
        if (legacyResult.error) {
          nextWarnings.push(`projects fallback unavailable: ${legacyResult.error.message}`);
        } else {
          loadedProjects = (legacyResult.data || []).map((project: any) => ({
            id: project.id,
            table: 'projects',
            label: project.name || project.id,
            code: null,
            contractorName: null,
          }));
        }
      } else {
        loadedProjects = (govProjectsResult.data || []).map((project: any) => ({
          id: project.id,
          table: 'gov_projects',
          label: project.project_name || project.project_code || project.id,
          code: project.project_code || null,
          contractorName: project.contractor_name || null,
        }));
      }
      setProjects(loadedProjects);
      setProjectKey((current) => current || (loadedProjects[0] ? `${loadedProjects[0].table}:${loadedProjects[0].id}` : ''));

      if (nextWorkspaceId) {
        const [usersResult, licensesResult, assignmentsResult] = await Promise.all([
          supabase
            .from('workspace_users')
            .select('id, workspace_id, user_id, role, active, parent_user_id, subdivision_name')
            .eq('workspace_id', nextWorkspaceId)
            .eq('active', true),
          supabase
            .from('contractor_licenses')
            .select('contractor_id, contractor_company_name, license_status')
            .eq('workspace_id', nextWorkspaceId),
          supabase
            .from('project_assignments')
            .select('id, workspace_id, project_id, project_table, executive_engineer_id, assistant_engineer_id, junior_engineer_id, contractor_id, contractor_company_name, access_status')
            .eq('workspace_id', nextWorkspaceId)
            .order('created_at', { ascending: false }),
        ]);

        if (usersResult.error) nextWarnings.push(`workspace_users unavailable: ${usersResult.error.message}`);
        if (licensesResult.error) nextWarnings.push(`contractor_licenses unavailable: ${licensesResult.error.message}`);
        if (assignmentsResult.error) nextWarnings.push(`project_assignments unavailable: ${assignmentsResult.error.message}`);

        const loadedUsers = (usersResult.data || []) as WorkspaceUserRow[];
        const loadedLicenses = (licensesResult.data || []) as ContractorLicenseRow[];
        const loadedAssignments = (assignmentsResult.data || []) as AssignmentRow[];

        setWorkspaceUsers(loadedUsers);
        setLicenses(loadedLicenses);
        setAssignments(loadedAssignments);

        const profileIds = Array.from(new Set([
          ...loadedUsers.map((user) => user.user_id),
          ...loadedLicenses.map((license) => license.contractor_id),
          ...loadedAssignments.flatMap((assignment) => [
            assignment.executive_engineer_id,
            assignment.assistant_engineer_id,
            assignment.junior_engineer_id,
            assignment.contractor_id,
          ]),
        ].filter(Boolean) as string[]));

        if (profileIds.length > 0) {
          const profileResult = await supabase
            .from('profiles')
            .select('id, full_name, email, company, role')
            .in('id', profileIds);
          if (profileResult.error) {
            nextWarnings.push(`profiles unavailable: ${profileResult.error.message}`);
            setProfiles({});
          } else {
            setProfiles(Object.fromEntries(((profileResult.data || []) as ProfileRow[]).map((profile) => [profile.id, profile])));
          }
        } else {
          setProfiles({});
        }
      } else {
        setWorkspaceUsers([]);
        setLicenses([]);
        setAssignments([]);
        setProfiles({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignment data');
    } finally {
      setWarnings(nextWarnings);
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!workspaceId || loading) return;
    loadData(workspaceId);
  }, [workspaceId]);

  const selectedWorkspace = workspaces.find((workspace) => workspace.id === workspaceId);
  const selectedProject = projects.find((project) => `${project.table}:${project.id}` === projectKey);

  const aeOptions = useMemo(() => workspaceUsers.filter((user) => user.role === 'assistant_engineer'), [workspaceUsers]);
  const jeOptions = useMemo(() => workspaceUsers.filter((user) => user.role === 'junior_engineer'), [workspaceUsers]);
  const contractorOptions = useMemo(() => {
    const byId = new Map<string, { id: string; label: string; status?: string | null }>();
    workspaceUsers.filter((user) => user.role === 'contractor').forEach((user) => {
      byId.set(user.user_id, { id: user.user_id, label: displayName(profiles[user.user_id], shortId(user.user_id)) });
    });
    licenses.forEach((license) => {
      byId.set(license.contractor_id, {
        id: license.contractor_id,
        label: license.contractor_company_name || displayName(profiles[license.contractor_id], shortId(license.contractor_id)),
        status: license.license_status,
      });
    });
    return Array.from(byId.values());
  }, [licenses, profiles, workspaceUsers]);

  function resetForm() {
    setEditingId(null);
    setAssistantEngineerId('');
    setJuniorEngineerId('');
    setContractorId('');
    setStatus('pilot');
    setSuccess(null);
    setError(null);
  }

  function editAssignment(assignment: AssignmentRow) {
    setEditingId(assignment.id);
    setWorkspaceId(assignment.workspace_id);
    setProjectKey(`${assignment.project_table || 'gov_projects'}:${assignment.project_id}`);
    setAssistantEngineerId(assignment.assistant_engineer_id || '');
    setJuniorEngineerId(assignment.junior_engineer_id || '');
    setContractorId(assignment.contractor_id || '');
    setStatus(toUiStatus(assignment.access_status));
    setSuccess(null);
    setError(null);
  }

  async function saveAssignment() {
    setError(null);
    setSuccess(null);
    if (!selectedWorkspace) {
      setError('No workspace is selected. Create or join an EE workspace first.');
      return;
    }
    if (!selectedProject) {
      setError('No project is selected. Create a GovTrack project first.');
      return;
    }
    if (!assistantEngineerId && !juniorEngineerId && !contractorId) {
      setError('Select at least one AE, JE, or Contractor before saving.');
      return;
    }

    setSaving(true);
    try {
      const contractor = contractorOptions.find((option) => option.id === contractorId);
      const payload = {
        workspace_id: selectedWorkspace.id,
        project_id: selectedProject.id,
        project_table: selectedProject.table,
        executive_engineer_id: selectedWorkspace.executive_engineer_id,
        assistant_engineer_id: assistantEngineerId || null,
        junior_engineer_id: juniorEngineerId || null,
        contractor_id: contractorId || null,
        contractor_company_name: contractor?.label || selectedProject.contractorName || null,
        access_status: status,
      };

      const existing = assignments.find((assignment) => (
        assignment.workspace_id === payload.workspace_id
        && assignment.project_id === payload.project_id
        && (assignment.project_table || 'gov_projects') === payload.project_table
      ));

      const targetId = editingId || existing?.id;
      const result = targetId
        ? await supabase.from('project_assignments').update(payload as any).eq('id', targetId).select().maybeSingle()
        : await supabase.from('project_assignments').insert(payload as any).select().maybeSingle();

      if (result.error) throw result.error;

      setSuccess('Project assignment saved.');
      logAssignmentCreated(user, profile?.email || user?.email, {
        assignment_id: (result.data as AssignmentRow | null)?.id || targetId || null,
        project_id: selectedProject.id,
        project_table: selectedProject.table,
        workspace_id: selectedWorkspace.id,
        action: targetId ? 'updated' : 'created',
        access_status: status,
      }, '/enterprise/assign-project');
      setEditingId(null);
      await loadData(selectedWorkspace.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project assignment');
    } finally {
      setSaving(false);
    }
  }

  const workspaceOptions = workspaces.map((workspace) => ({
    value: workspace.id,
    label: `${workspace.workspace_name}${workspace.division_code ? ` (${workspace.division_code})` : ''}`,
  }));

  const projectOptions = projects.map((project) => ({
    value: `${project.table}:${project.id}`,
    label: `${project.code ? `${project.code} - ` : ''}${project.label}`,
  }));

  return (
    <AppLayout title="Assign Pilot Project" subtitle="Map one project to EE workspace, AE, JE, and Contractor">
      {loading && (
        <Card className="mb-6">
          <div className="flex items-center gap-3 text-[#4D5B52]">
            <RefreshCw size={18} className="animate-spin" />
            <span className="text-sm">Loading workspaces, projects, users, contractors, and assignments...</span>
          </div>
        </Card>
      )}

      {error && (
        <Card className="mb-6 border-red-400/30">
          <div className="flex items-center gap-3 text-red-500">
            <AlertTriangle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        </Card>
      )}

      {success && (
        <Card className="mb-6 border-green-500/20">
          <div className="flex items-center gap-3 text-green-700">
            <CheckCircle2 size={18} />
            <span className="text-sm">{success}</span>
          </div>
        </Card>
      )}

      {warnings.length > 0 && (
        <Card className="mb-6 border-[#CDBD82]">
          <div className="flex gap-3">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-[#F59E0B]" />
            <div>
              <p className="text-sm font-semibold text-[#12332D]">Some assignment data could not be loaded</p>
              <ul className="mt-2 space-y-1 text-xs text-[#6C7568]">
                {warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {!loading && workspaces.length === 0 && (
        <Card className="mb-6">
          <div className="flex gap-3">
            <ShieldCheck size={20} className="text-[#F59E0B]" />
            <div>
              <p className="font-semibold text-[#12332D]">No EE workspace found</p>
              <p className="mt-1 text-sm text-[#4D5B52]">Create or assign an Executive Engineer workspace before mapping projects.</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <div className="mb-5 flex items-center gap-3">
            <FolderTree size={22} className="text-[#005F56]" />
            <div>
              <h2 className="font-semibold text-[#12332D]">{editingId ? 'Edit Assignment' : 'Create Assignment'}</h2>
              <p className="text-xs text-[#6C7568]">EE workspace owns the assignment row.</p>
            </div>
          </div>

          <div className="space-y-4">
            <Select
              label="Workspace"
              value={workspaceId}
              onChange={(event) => setWorkspaceId(event.target.value)}
              options={workspaceOptions.length ? workspaceOptions : [{ value: '', label: 'No workspace available' }]}
              disabled={loading || workspaceOptions.length === 0}
            />
            <Select
              label="Project"
              value={projectKey}
              onChange={(event) => setProjectKey(event.target.value)}
              options={projectOptions.length ? projectOptions : [{ value: '', label: 'No project available' }]}
              disabled={loading || projectOptions.length === 0}
            />
            <Select
              label="Assistant Engineer"
              value={selectValue(assistantEngineerId)}
              onChange={(event) => setAssistantEngineerId(event.target.value === EMPTY_VALUE ? '' : event.target.value)}
              options={[
                { value: EMPTY_VALUE, label: aeOptions.length ? 'Not assigned' : 'No AE found in workspace' },
                ...aeOptions.map((user) => ({ value: user.user_id, label: displayName(profiles[user.user_id], shortId(user.user_id)) })),
              ]}
            />
            <Select
              label="Junior Engineer"
              value={selectValue(juniorEngineerId)}
              onChange={(event) => setJuniorEngineerId(event.target.value === EMPTY_VALUE ? '' : event.target.value)}
              options={[
                { value: EMPTY_VALUE, label: jeOptions.length ? 'Not assigned' : 'No JE found in workspace' },
                ...jeOptions.map((user) => ({ value: user.user_id, label: displayName(profiles[user.user_id], shortId(user.user_id)) })),
              ]}
            />
            <Select
              label="Contractor"
              value={selectValue(contractorId)}
              onChange={(event) => setContractorId(event.target.value === EMPTY_VALUE ? '' : event.target.value)}
              options={[
                { value: EMPTY_VALUE, label: contractorOptions.length ? 'Not assigned' : 'No contractor found in workspace' },
                ...contractorOptions.map((contractor) => ({
                  value: contractor.id,
                  label: `${contractor.label}${contractor.status ? ` - ${contractor.status}` : ''}`,
                })),
              ]}
            />
            <Select
              label="Assignment Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as AssignmentStatus)}
              options={statusOptions}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" icon={<Save size={14} />} loading={saving} disabled={loading || !workspaceId || !projectKey} onClick={saveAssignment}>
              {editingId ? 'Update Assignment' : 'Save Assignment'}
            </Button>
            <Button variant="outline" onClick={resetForm}>Clear</Button>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold text-[#12332D]">Existing Assignments</h2>
              <p className="text-xs text-[#6C7568]">Rows are loaded from project_assignments for the selected workspace.</p>
            </div>
            <Button size="sm" variant="outline" icon={<RefreshCw size={13} />} onClick={() => loadData(workspaceId)}>Refresh</Button>
          </div>

          {projects.length === 0 && (
            <p className="mb-4 rounded-lg border border-[#CDBD82] bg-[#FFF8E1] px-3 py-2 text-sm text-[#6B5A1E]">
              No projects were found. Create the first project in GovTrack Projects, then return here to assign it.
            </p>
          )}

          {workspaceUsers.length === 0 && workspaceId && (
            <p className="mb-4 rounded-lg border border-[#CDBD82] bg-[#FFF8E1] px-3 py-2 text-sm text-[#6B5A1E]">
              No workspace users were found. Add AE, JE, and Contractor members to workspace_users before assigning.
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-sm">
              <thead>
                <tr className="border-b border-[#D9D0B5] text-left text-[#6C7568]">
                  <th className="py-3 pr-4 font-medium">Project</th>
                  <th className="py-3 pr-4 font-medium">AE</th>
                  <th className="py-3 pr-4 font-medium">JE</th>
                  <th className="py-3 pr-4 font-medium">Contractor</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => {
                  const project = projects.find((item) => item.id === assignment.project_id && item.table === (assignment.project_table || 'gov_projects'));
                  return (
                    <tr key={assignment.id} className="border-b border-[#E8DFC6] text-[#4D5B52]">
                      <td className="py-3 pr-4 font-medium text-[#12332D]">{project?.label || shortId(assignment.project_id)}</td>
                      <td className="py-3 pr-4">{displayName(profiles[assignment.assistant_engineer_id || ''], shortId(assignment.assistant_engineer_id))}</td>
                      <td className="py-3 pr-4">{displayName(profiles[assignment.junior_engineer_id || ''], shortId(assignment.junior_engineer_id))}</td>
                      <td className="py-3 pr-4">{assignment.contractor_company_name || displayName(profiles[assignment.contractor_id || ''], shortId(assignment.contractor_id))}</td>
                      <td className="py-3 pr-4"><StatusBadge status={assignment.access_status || 'unknown'} /></td>
                      <td className="py-3 pr-4">
                        <Button size="sm" variant="outline" icon={<Edit3 size={12} />} onClick={() => editAssignment(assignment)}>Edit</Button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && assignments.length === 0 && (
                  <tr>
                    <td className="py-8 text-[#6C7568]" colSpan={6}>No project assignments found for this workspace.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
