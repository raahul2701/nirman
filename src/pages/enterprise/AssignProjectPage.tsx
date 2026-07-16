import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Edit3, FolderTree, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { logAssignmentCreated } from '../../services/activityLogger';
import { useAuth } from '../../contexts/useAuth';
import { resolveActiveWorkspaceForWrite } from '../../services/businessHierarchyService';

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
  full_name?: string | null;
  email?: string | null;
  contractor_company?: string | null;
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


type LegacyProjectRow = {
  id: string;
  name?: string | null;
  project_name?: string | null;
  project_code?: string | null;
};

type GovProjectRow = {
  id: string;
  project_name?: string | null;
  project_code?: string | null;
  contractor_name?: string | null;
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

type AssignmentPayload = {
  workspace_id: string;
  project_id: string;
  project_table: 'gov_projects' | 'projects';
  executive_engineer_id: string;
  assistant_engineer_id: string | null;
  junior_engineer_id: string | null;
  contractor_id: string | null;
  contractor_company_name: string | null;
  access_status: AssignmentStatus;
};

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
function memberLabel(member: WorkspaceUserRow, profile?: ProfileRow) {
  const name = member.full_name || profile?.full_name || profile?.company || member.contractor_company || profile?.email || member.email || shortId(member.user_id);
  const email = member.email || profile?.email || null;
  return email && !name.includes(email) ? `${name} - ${email}` : name;
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

function findActiveWorkspaceUser(users: WorkspaceUserRow[], workspaceId: string, userId: string, role: WorkspaceUserRow['role']) {
  return users.find((workspaceUser) => (
    workspaceUser.workspace_id === workspaceId
    && workspaceUser.user_id === userId
    && workspaceUser.role === role
    && workspaceUser.active !== false
  ));
}

function preserveExistingSelection(selectedId: string, existingId: string | null | undefined) {
  return selectedId || existingId || null;
}
export function AssignProjectPage() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUserRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
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

  const loadData = useCallback(async (preferredWorkspaceId?: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const nextWarnings: string[] = [];
    try {
      const activeWorkspace = await resolveActiveWorkspaceForWrite(preferredWorkspaceId);
      if (preferredWorkspaceId && !activeWorkspace.requestedWorkspaceMatched) {
        nextWarnings.push('The selected workspace does not belong to your active Executive Engineer account.');
      }

      const loadedWorkspaces = [activeWorkspace.workspace as WorkspaceRow];
      setWorkspaces(loadedWorkspaces);

      const nextWorkspaceId = activeWorkspace.workspace.id;
      setWorkspaceId(nextWorkspaceId);
      const [govProjectsResult, legacyProjectsResult] = await Promise.all([
        supabase
          .from('gov_projects')
          .select('id, project_name, project_code, contractor_name')
          .order('created_at', { ascending: false }),
        supabase
          .from('projects')
          .select('id, name, project_name, project_code')
          .order('created_at', { ascending: false }),
      ]);

      if (govProjectsResult.error) nextWarnings.push(`gov_projects unavailable: ${govProjectsResult.error.message}`);
      if (legacyProjectsResult.error) nextWarnings.push(`projects unavailable: ${legacyProjectsResult.error.message}`);

      const govProjects = govProjectsResult.error ? [] : ((govProjectsResult.data || []) as GovProjectRow[]).map((project) => ({
        id: project.id,
        table: 'gov_projects' as const,
        label: project.project_name || project.project_code || project.id,
        code: project.project_code || null,
        contractorName: project.contractor_name || null,
        workspaceId: nextWorkspaceId || null,
      }));
      const legacyProjects = legacyProjectsResult.error ? [] : ((legacyProjectsResult.data || []) as LegacyProjectRow[]).map((project) => ({
        id: project.id,
        table: 'projects' as const,
        label: project.project_name || project.name || project.project_code || project.id,
        code: project.project_code || null,
        contractorName: null,
        workspaceId: nextWorkspaceId || null,
      }));
      const loadedProjects: ProjectOption[] = [...govProjects, ...legacyProjects];
      setProjects(loadedProjects);
      setProjectKey((current) => current || (loadedProjects[0] ? `${loadedProjects[0].table}:${loadedProjects[0].id}` : ''));

      if (nextWorkspaceId) {
        const [usersResult, assignmentsResult] = await Promise.all([
          supabase
            .from('workspace_users')
            .select('id, workspace_id, user_id, role, active, full_name, email, contractor_company, parent_user_id, subdivision_name')
            .eq('workspace_id', nextWorkspaceId)
            .eq('active', true),
          supabase
            .from('project_assignments')
            .select('id, workspace_id, project_id, project_table, executive_engineer_id, assistant_engineer_id, junior_engineer_id, contractor_id, contractor_company_name, access_status')
            .eq('workspace_id', nextWorkspaceId)
            .order('created_at', { ascending: false }),
        ]);

        if (usersResult.error) nextWarnings.push(`workspace_users unavailable: ${usersResult.error.message}`);
        if (assignmentsResult.error) nextWarnings.push(`project_assignments unavailable: ${assignmentsResult.error.message}`);

        const loadedUsers = (usersResult.data || []) as WorkspaceUserRow[];
        const loadedAssignments = (assignmentsResult.data || []) as AssignmentRow[];

        setWorkspaceUsers(loadedUsers);
        setAssignments(loadedAssignments);

        const profileIds = Array.from(new Set([
          ...loadedUsers.map((user) => user.user_id),
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
        setAssignments([]);
        setProfiles({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignment data');
    } finally {
      setWarnings(nextWarnings);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const selectedWorkspace = workspaces.find((workspace) => workspace.id === workspaceId);
  const selectedProject = projects.find((project) => `${project.table}:${project.id}` === projectKey);
  useEffect(() => {
    if (loading) return;
    const queryWorkspaceId = searchParams.get('workspaceId');
    const queryProjectId = searchParams.get('projectId');
    const queryProjectTable = searchParams.get('projectTable') || 'gov_projects';

    if (queryWorkspaceId && workspaces.some((workspace) => workspace.id === queryWorkspaceId) && queryWorkspaceId !== workspaceId) {
      setWorkspaceId(queryWorkspaceId);
    }

    if (queryProjectId) {
      const queryProjectKey = `${queryProjectTable}:${queryProjectId}`;
      if (projects.some((project) => `${project.table}:${project.id}` === queryProjectKey) && projectKey !== queryProjectKey) {
        setProjectKey(queryProjectKey);
      }
    }
  }, [loading, projectKey, projects, searchParams, workspaceId, workspaces]);

  const aeOptions = useMemo(() => workspaceUsers.filter((user) => user.role === 'assistant_engineer'), [workspaceUsers]);
  const jeOptions = useMemo(() => workspaceUsers.filter((user) => user.role === 'junior_engineer'), [workspaceUsers]);
  const contractorOptions = useMemo(() => {
    const byId = new Map<string, { id: string; label: string; status?: string | null }>();
    workspaceUsers.filter((user) => user.role === 'contractor').forEach((user) => {
      byId.set(user.user_id, { id: user.user_id, label: memberLabel(user, profiles[user.user_id]) });
    });
    return Array.from(byId.values());
  }, [profiles, workspaceUsers]);

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
    const existing = assignments.find((assignment) => (
      assignment.workspace_id === selectedWorkspace.id
      && assignment.project_id === selectedProject.id
      && (assignment.project_table || 'gov_projects') === selectedProject.table
    ));

    const preservedAssistantEngineerId = preserveExistingSelection(assistantEngineerId, existing?.assistant_engineer_id);
    const preservedJuniorEngineerId = preserveExistingSelection(juniorEngineerId, existing?.junior_engineer_id);
    const preservedContractorId = preserveExistingSelection(contractorId, existing?.contractor_id);

    if (!preservedAssistantEngineerId && !preservedJuniorEngineerId && !preservedContractorId) {
      setError('Select at least one AE, JE, or Contractor before saving.');
      return;
    }
    if (preservedAssistantEngineerId && !findActiveWorkspaceUser(workspaceUsers, selectedWorkspace.id, preservedAssistantEngineerId, 'assistant_engineer')) {
      setError('Selected Assistant Engineer must be an active assistant_engineer profile in this workspace.');
      return;
    }
    if (preservedJuniorEngineerId && !findActiveWorkspaceUser(workspaceUsers, selectedWorkspace.id, preservedJuniorEngineerId, 'junior_engineer')) {
      setError('Selected Junior Engineer must be an active junior_engineer profile in this workspace.');
      return;
    }
    if (preservedContractorId && !findActiveWorkspaceUser(workspaceUsers, selectedWorkspace.id, preservedContractorId, 'contractor')) {
      setError('Selected Contractor must be an active contractor profile in this workspace.');
      return;
    }

    setSaving(true);
    try {
      const contractor = contractorOptions.find((option) => option.id === preservedContractorId);
      const payload: AssignmentPayload = {
        workspace_id: selectedWorkspace.id,
        project_id: selectedProject.id,
        project_table: selectedProject.table,
        executive_engineer_id: selectedWorkspace.executive_engineer_id,
        assistant_engineer_id: preservedAssistantEngineerId,
        junior_engineer_id: preservedJuniorEngineerId,
        contractor_id: preservedContractorId,
        contractor_company_name: contractor?.label || selectedProject.contractorName || existing?.contractor_company_name || null,
        access_status: status,
      };

      const targetId = editingId || existing?.id;
      const result = targetId
        ? await supabase.from('project_assignments').update(payload).eq('id', targetId).select().maybeSingle()
        : await supabase.from('project_assignments').insert(payload).select().maybeSingle();

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
    label: `${project.table === 'gov_projects' ? 'Government Project' : 'Workspace Project'} - ${project.code ? `${project.code} - ` : ''}${project.label}`,
  }));

  const canManageAssignment = Boolean(user?.id && selectedWorkspace && (selectedWorkspace.executive_engineer_id === user.id || profile?.role === 'admin' || profile?.role === 'super_admin'));
  const assignmentBlockReason = loading
    ? 'Assignment data is still loading.'
    : saving
      ? 'Assignment is saving.'
      : !workspaceId
        ? 'Select a valid workspace.'
        : !projectKey || !selectedProject
          ? 'Select a valid project.'
          : !canManageAssignment
            ? 'Your role cannot update this assignment.'
            : null;
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
              onChange={(event) => { setWorkspaceId(event.target.value); void loadData(event.target.value); }}
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
                ...aeOptions.map((user) => ({ value: user.user_id, label: memberLabel(user, profiles[user.user_id]) })),
              ]}
            />
            <Select
              label="Junior Engineer"
              value={selectValue(juniorEngineerId)}
              onChange={(event) => setJuniorEngineerId(event.target.value === EMPTY_VALUE ? '' : event.target.value)}
              options={[
                { value: EMPTY_VALUE, label: jeOptions.length ? 'Not assigned' : 'No JE found in workspace' },
                ...jeOptions.map((user) => ({ value: user.user_id, label: memberLabel(user, profiles[user.user_id]) })),
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
            <Button variant="primary" icon={<Save size={14} />} loading={saving} disabled={Boolean(assignmentBlockReason)} onClick={saveAssignment}>
              {editingId ? 'Update Assignment' : 'Save Assignment'}
            </Button>
            <Button variant="outline" onClick={resetForm}>Clear</Button>
            {assignmentBlockReason && <p className="basis-full text-xs text-[#6C7568]">{assignmentBlockReason}</p>}
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
