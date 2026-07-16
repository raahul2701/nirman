import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, RefreshCw, Save } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Input';
import { useAuth } from '../../contexts/useAuth';
import { featureFlags } from '../../lib/featureFlags';
import { supabase } from '../../lib/supabase';
import { logAssignmentCreated, logPilotStarted } from '../../services/activityLogger';

type WorkspaceRow = {
  id: string;
  executive_engineer_id: string;
  workspace_name: string;
  division_code?: string | null;
};

type WorkspaceUserRow = {
  workspace_id: string;
  user_id: string;
  role: string;
  active?: boolean | null;
};

type ProfileRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  company?: string | null;
};

type ProjectOption = {
  id: string;
  table: 'gov_projects' | 'projects';
  label: string;
  code?: string | null;
  contractorName?: string | null;
};

type ContractorOption = {
  id: string;
  label: string;
  status?: string | null;
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
  assistant_engineer_id?: string | null;
  junior_engineer_id?: string | null;
  contractor_id?: string | null;
  contractor_company_name?: string | null;
  access_status?: string | null;
};

type AssignmentStatus = 'pilot' | 'active' | 'paused';
type AssignmentPayload = Omit<AssignmentRow, 'id'>;
type WorkspaceInsertPayload = {
  workspace_name: string;
  workspace_code: string;
  department: string;
  district: string;
  division_code: string;
  status: string;
  executive_engineer_id: string;
  executive_engineer_name: string;
  executive_engineer_email: string | null;
  storage_namespace: string;
};
type WorkspaceUserUpsertPayload = {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  parent_user_id: string | null;
  subdivision_name: string | null;
  free_lifetime: boolean;
  active: boolean;
};
type WorkspaceRole = 'executive_engineer' | 'assistant_engineer' | 'junior_engineer' | 'contractor';
type LegacyProjectInsertPayload = Record<string, string | number>;
type GovProjectInsertPayload = Record<string, string | number>;

const EMPTY_VALUE = '__none__';
const steps = ['Workspace', 'Project', 'Team', 'Assignment', 'Verification'];

function shortId(value: string | null | undefined, fallback = '-') {
  return value ? value.slice(0, 8) : fallback;
}

function profileName(profile: ProfileRow | undefined, fallback: string) {
  return profile?.full_name || profile?.company || profile?.email || fallback;
}

function resolveEngineerName(profile: ProfileRow | null | undefined, email?: string | null) {
  return profile?.full_name || email?.split('@')[0] || 'Executive Engineer';
}

function selectValue(value: string) {
  return value || EMPTY_VALUE;
}

function findActiveWorkspaceUser(users: WorkspaceUserRow[], workspaceId: string, userId: string, role: WorkspaceRole) {
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
export function StartPilotWizardPage() {
  const navigate = useNavigate();
  const { user, profile, session, loading: authLoading, profileLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [pausingDemo, setPausingDemo] = useState(false);
  const [demoResults, setDemoResults] = useState<string[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUserRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [contractors, setContractors] = useState<ContractorOption[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [assistantEngineerId, setAssistantEngineerId] = useState('');
  const [juniorEngineerId, setJuniorEngineerId] = useState('');
  const [contractorId, setContractorId] = useState('');
  const [status, setStatus] = useState<AssignmentStatus>('pilot');
  const [allowUpdate, setAllowUpdate] = useState(false);
  const [savedAssignmentId, setSavedAssignmentId] = useState<string | null>(null);
  const [demoAssignmentId, setDemoAssignmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const selectedWorkspace = workspaces.find((workspace) => workspace.id === workspaceId);
  const selectedProject = projects.find((project) => `${project.table}:${project.id}` === projectKey);
  const existingAssignment = assignments.find((assignment) => (
    assignment.workspace_id === workspaceId
    && assignment.project_id === selectedProject?.id
    && (assignment.project_table || 'gov_projects') === selectedProject?.table
  ));

  const loadData = useCallback(async (nextWorkspaceId?: string) => {
    setLoading(true);
    setError(null);
    const nextWarnings: string[] = [];
    try {
      const workspaceResult = await supabase
        .from('executive_engineer_workspaces')
        .select('id, executive_engineer_id, workspace_name, division_code')
        .order('created_at', { ascending: false });
      if (workspaceResult.error) throw workspaceResult.error;

      const loadedWorkspaces = (workspaceResult.data || []) as WorkspaceRow[];
      const resolvedWorkspaceId = nextWorkspaceId || loadedWorkspaces[0]?.id || '';
      setWorkspaces(loadedWorkspaces);
      setWorkspaceId(resolvedWorkspaceId);

      const [govResult, legacyResult] = await Promise.all([
        supabase
          .from('gov_projects')
          .select('id, project_name, project_code, contractor_name')
          .order('created_at', { ascending: false }),
        supabase
          .from('projects')
          .select('id, name, project_name, project_code')
          .order('created_at', { ascending: false }),
      ]);

      if (govResult.error) nextWarnings.push(`gov_projects unavailable: ${govResult.error.message}`);
      if (legacyResult.error) nextWarnings.push(`projects unavailable: ${legacyResult.error.message}`);

      const govProjects = govResult.error ? [] : ((govResult.data || []) as GovProjectRow[]).map((project) => ({
        id: project.id,
        table: 'gov_projects' as const,
        label: project.project_name || project.project_code || project.id,
        code: project.project_code || null,
        contractorName: project.contractor_name || null,
        workspaceId: resolvedWorkspaceId || null,
      }));
      const legacyProjects = legacyResult.error ? [] : ((legacyResult.data || []) as LegacyProjectRow[]).map((project) => ({
        id: project.id,
        table: 'projects' as const,
        label: project.project_name || project.name || project.project_code || project.id,
        code: project.project_code || null,
        contractorName: null,
        workspaceId: resolvedWorkspaceId || null,
      }));
      const loadedProjects: ProjectOption[] = [...govProjects, ...legacyProjects];
      setProjects(loadedProjects);
      setProjectKey((current) => current || (loadedProjects[0] ? `${loadedProjects[0].table}:${loadedProjects[0].id}` : ''));

      if (!resolvedWorkspaceId) {
        setWorkspaceUsers([]);
        setContractors([]);
        setAssignments([]);
        setProfiles({});
        return;
      }

      const [usersResult, assignmentsResult] = await Promise.all([
        supabase
          .from('workspace_users')
          .select('workspace_id, user_id, role, active')
          .eq('workspace_id', resolvedWorkspaceId)
          .eq('active', true),
        supabase
          .from('project_assignments')
          .select('id, workspace_id, project_id, project_table, assistant_engineer_id, junior_engineer_id, contractor_id, contractor_company_name, access_status')
          .eq('workspace_id', resolvedWorkspaceId)
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
        ...loadedAssignments.flatMap((assignment) => [assignment.assistant_engineer_id, assignment.junior_engineer_id, assignment.contractor_id]),
      ].filter(Boolean) as string[]));

      let profileMap: Record<string, ProfileRow> = {};
      if (profileIds.length) {
        const profileResult = await supabase
          .from('profiles')
          .select('id, full_name, email, company')
          .in('id', profileIds);
        if (profileResult.error) {
          nextWarnings.push(`profiles unavailable: ${profileResult.error.message}`);
        } else {
          profileMap = Object.fromEntries(((profileResult.data || []) as ProfileRow[]).map((profile) => [profile.id, profile]));
        }
      }
      setProfiles(profileMap);

      const contractorMap = new Map<string, ContractorOption>();
      loadedUsers.filter((user) => user.role === 'contractor').forEach((user) => {
        contractorMap.set(user.user_id, { id: user.user_id, label: profileName(profileMap[user.user_id], shortId(user.user_id)) });
      });
      setContractors(Array.from(contractorMap.values()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pilot wizard data');
    } finally {
      setWarnings(nextWarnings);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);


  useEffect(() => {
    setAllowUpdate(false);
  }, [projectKey]);

  const aeOptions = useMemo(() => workspaceUsers.filter((user) => user.role === 'assistant_engineer'), [workspaceUsers]);
  const jeOptions = useMemo(() => workspaceUsers.filter((user) => user.role === 'junior_engineer'), [workspaceUsers]);

  function canContinue() {
    if (step === 0) return Boolean(workspaceId);
    if (step === 1) return Boolean(projectKey);
    if (step === 3) return Boolean(workspaceId && projectKey);
    return true;
  }

  async function saveAssignment() {
    setError(null);
    if (!selectedWorkspace || !selectedProject) {
      setError('Select a workspace and project before saving.');
      return;
    }
    if (existingAssignment && !allowUpdate) {
      setError('An assignment already exists for this workspace and project. Review it, then choose update existing assignment to continue.');
      return;
    }

    const preservedAssistantEngineerId = preserveExistingSelection(assistantEngineerId, existingAssignment?.assistant_engineer_id);
    const preservedJuniorEngineerId = preserveExistingSelection(juniorEngineerId, existingAssignment?.junior_engineer_id);
    const preservedContractorId = preserveExistingSelection(contractorId, existingAssignment?.contractor_id);

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
      const contractor = contractors.find((item) => item.id === preservedContractorId);
      const payload = {
        workspace_id: selectedWorkspace.id,
        project_id: selectedProject.id,
        project_table: selectedProject.table,
        executive_engineer_id: selectedWorkspace.executive_engineer_id,
        assistant_engineer_id: preservedAssistantEngineerId,
        junior_engineer_id: preservedJuniorEngineerId,
        contractor_id: preservedContractorId,
        contractor_company_name: contractor?.label || selectedProject.contractorName || existingAssignment?.contractor_company_name || null,
        access_status: status,
      };

      const result = existingAssignment
        ? await supabase.from('project_assignments').update(payload as AssignmentPayload).eq('id', existingAssignment.id).select().maybeSingle()
        : await supabase.from('project_assignments').insert(payload as AssignmentPayload).select().maybeSingle();

      if (result.error) throw result.error;
      logPilotStarted(user, profile?.email || user?.email, {
        assignment_id: (result.data as AssignmentRow | null)?.id || existingAssignment?.id || null,
        project_id: selectedProject.id,
        project_table: selectedProject.table,
        workspace_id: selectedWorkspace.id,
        access_status: status,
        action: existingAssignment ? 'updated_assignment' : 'created_assignment',
      });
      logAssignmentCreated(user, profile?.email || user?.email, {
        assignment_id: (result.data as AssignmentRow | null)?.id || existingAssignment?.id || null,
        project_id: selectedProject.id,
        project_table: selectedProject.table,
        workspace_id: selectedWorkspace.id,
        action: existingAssignment ? 'updated' : 'created',
        access_status: status,
      }, '/enterprise/start-pilot');
      setSavedAssignmentId((result.data as AssignmentRow | null)?.id || existingAssignment?.id || null);
      await loadData(selectedWorkspace.id);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pilot assignment');
    } finally {
      setSaving(false);
    }
  }

  async function createDemoPilotData() {
    if (!featureFlags.pilotMode) return;
    setCreatingDemo(true);
    setError(null);
    setDemoResults([]);
    const results: string[] = [];

    try {
      if (authLoading || profileLoading) {
        throw new Error('Session expired: your secure session is still being restored. Try again in a moment.');
      }
      if (!session || !user?.id) {
        throw new Error('Session expired: your secure session is no longer valid. Please sign in again.');
      }
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const activeSession = sessionData.session;
      const activeUserId = activeSession?.user.id;
      if (import.meta.env.DEV) {
        console.info('[start-pilot] create demo auth check', {
          sessionPresent: Boolean(activeSession),
          contextUserMatchesSession: Boolean(activeUserId && user.id === activeUserId),
          engineerIdMatchesSession: Boolean(activeUserId && user.id === activeUserId),
          requestStage: 'session_validation',
        });
      }
      if (sessionError || !activeSession || !activeUserId || activeUserId !== user.id) {
        throw new Error('Session expired: your secure session is no longer valid. Please sign in again.');
      }

      const workspaceName = 'NIRMAN Pilot Demo Workspace';
      const projectCode = 'DEMO-PILOT-001';
      const contractorCompany = 'Demo Contractor Pvt Ltd';
      const today = new Date();
      const startDate = today.toISOString().slice(0, 10);
      const demoEndDate = new Date(today);
      demoEndDate.setFullYear(demoEndDate.getFullYear() + 1);
      const endDate = demoEndDate.toISOString().slice(0, 10);

      let workspace = null as WorkspaceRow | null;
      const workspaceLookup = await supabase
        .from('executive_engineer_workspaces')
        .select('id, executive_engineer_id, workspace_name, division_code')
        .eq('workspace_name', workspaceName)
        .maybeSingle();
      if (workspaceLookup.error) throw new Error(`executive_engineer_workspaces lookup failed: ${workspaceLookup.error.message}`);

      if (workspaceLookup.data) {
        workspace = workspaceLookup.data as WorkspaceRow;
        results.push('Demo workspace already exists.');
      } else {
        const workspaceInsert = await supabase
          .from('executive_engineer_workspaces')
          .insert({
            workspace_name: workspaceName,
            workspace_code: 'DEMO-DIV-001',
            department: 'Demo Public Works Department',
            district: 'Demo District',
            division_code: 'DEMO-DIV-001',
            status: 'active',
            executive_engineer_id: activeUserId,
            executive_engineer_name: resolveEngineerName(profile, activeSession.user.email),
            executive_engineer_email: activeSession.user.email || null,
            storage_namespace: `demo_${activeUserId.replace(/-/g, '').slice(0, 16)}`,
          } as WorkspaceInsertPayload)
          .select('id, executive_engineer_id, workspace_name, division_code')
          .maybeSingle();
        if (workspaceInsert.error) throw new Error(`executive_engineer_workspaces insert failed: ${workspaceInsert.error.message}`);
        workspace = workspaceInsert.data as WorkspaceRow;
        results.push('Demo workspace created.');
      }

      if (!workspace) throw new Error('Demo workspace could not be created or loaded.');

      const eeMembership = await supabase
        .from('workspace_users')
        .upsert({
          workspace_id: workspace.id,
          user_id: activeUserId,
          role: 'executive_engineer',
          parent_user_id: null,
          subdivision_name: null,
          free_lifetime: true,
          active: true,
        } as WorkspaceUserUpsertPayload, { onConflict: 'workspace_id,user_id' })
        .select('id')
        .maybeSingle();
      if (eeMembership.error) {
        results.push(`EE workspace membership not created: ${eeMembership.error.message}`);
      } else {
        results.push('Current user linked as Executive Engineer.');
      }

      let project = null as ProjectOption | null;
      const govProjectLookup = await supabase
        .from('gov_projects')
        .select('id, project_name, project_code, contractor_name')
        .eq('project_code', projectCode)
        .maybeSingle();

      if (govProjectLookup.error) {
        results.push(`gov_projects lookup unavailable: ${govProjectLookup.error.message}`);
        const legacyLookup = await supabase
          .from('projects')
          .select('id, name')
          .eq('name', 'Demo Road Construction Pilot Project')
          .maybeSingle();
        if (legacyLookup.error) throw new Error(`projects fallback lookup failed: ${legacyLookup.error.message}`);

        if (legacyLookup.data) {
          project = { id: legacyLookup.data.id, table: 'projects', label: legacyLookup.data.name };
          results.push('Demo fallback project already exists.');
        } else {
          const legacyInsert = await supabase
            .from('projects')
            .insert({
              name: 'Demo Road Construction Pilot Project',
              project_name: 'Demo Road Construction Pilot Project',
              description: 'Demo pilot project for testing NIRMAN assignment workflow.',
              owner_id: activeUserId,
              company: profile?.company || 'NIRMAN Demo',
              status: 'active',
              start_date: startDate,
              budget: 2500000,
              location: 'Demo District',
              progress_percent: 0,
            } as LegacyProjectInsertPayload)
            .select('id, name')
            .maybeSingle();
          if (legacyInsert.error) throw new Error(`Project creation failed: projects fallback insert failed: ${legacyInsert.error.message}`);
          project = { id: legacyInsert.data.id, table: 'projects', label: legacyInsert.data.name };
          results.push('Demo fallback project created.');
        }
      } else if (govProjectLookup.data) {
        project = {
          id: govProjectLookup.data.id,
          table: 'gov_projects',
          label: govProjectLookup.data.project_name,
          code: govProjectLookup.data.project_code,
          contractorName: govProjectLookup.data.contractor_name,
        };
        results.push('Demo GovTrack project already exists.');
      } else {
        const projectId = crypto.randomUUID();
        const govProjectInsert = await supabase
          .from('gov_projects')
          .insert({
            id: projectId,
            engineer_id: activeUserId,
            project_name: 'Demo Road Construction Pilot Project',
            project_code: projectCode,
            department: 'Demo Public Works Department',
            contractor_name: contractorCompany,
            total_contract_value: 2500000,
            start_date: startDate,
            end_date: endDate,
            location: 'Demo District',
            project_type: 'highway',
            status: 'active',
          } as GovProjectInsertPayload);
        if (govProjectInsert.error) throw new Error(`Project creation failed: gov_projects insert failed: ${govProjectInsert.error.message}`);
        project = {
          id: projectId,
          table: 'gov_projects',
          label: 'Demo Road Construction Pilot Project',
          code: projectCode,
          contractorName: contractorCompany,
        };
        results.push('Demo GovTrack project created.');
      }

      if (!project) throw new Error('Demo project could not be created or loaded.');

      const assignmentLookup = await supabase
        .from('project_assignments')
        .select('id')
        .eq('workspace_id', workspace.id)
        .eq('project_id', project.id)
        .eq('project_table', project.table)
        .maybeSingle();
      if (assignmentLookup.error) throw new Error(`project_assignments lookup failed: ${assignmentLookup.error.message}`);

      let assignmentId = assignmentLookup.data?.id as string | undefined;
      if (assignmentId) {
        results.push('Demo assignment already exists.');
      } else {
        const assignmentInsert = await supabase
          .from('project_assignments')
          .insert({
            workspace_id: workspace.id,
            project_id: project.id,
            project_table: project.table,
            executive_engineer_id: workspace.executive_engineer_id || user.id,
            assistant_engineer_id: null,
            junior_engineer_id: null,
            contractor_id: null,
            contractor_company_name: contractorCompany,
            access_status: 'pilot',
          } as AssignmentPayload)
          .select('id')
          .maybeSingle();
        if (assignmentInsert.error) throw new Error(`Assignment creation failed: project_assignments insert failed: ${assignmentInsert.error.message}`);
        assignmentId = assignmentInsert.data?.id;
        results.push('Demo pilot assignment created.');
        logPilotStarted(user, profile?.email || user.email, {
          assignment_id: assignmentId || null,
          project_id: project.id,
          project_table: project.table,
          workspace_id: workspace.id,
          action: 'created_demo_data',
        });
        logAssignmentCreated(user, profile?.email || user.email, {
          assignment_id: assignmentId || null,
          project_id: project.id,
          project_table: project.table,
          workspace_id: workspace.id,
          action: 'created_demo',
          access_status: 'pilot',
        }, '/enterprise/start-pilot');
      }

      results.push('Demo AE/JE/Contractor users are placeholders only. Invite real users before role-based team selection testing.');
      setDemoAssignmentId(assignmentId || null);
      setWorkspaceId(workspace.id);
      setProjectKey(`${project.table}:${project.id}`);
      setStatus('pilot');
      setStep(4);
      setDemoResults(results);
      await loadData(workspace.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create demo pilot data');
      setDemoResults(results);
    } finally {
      setCreatingDemo(false);
    }
  }

  async function pauseDemoAssignment() {
    if (!demoAssignmentId) return;
    setPausingDemo(true);
    setError(null);
    try {
      const result = await supabase
        .from('project_assignments')
        .update({ access_status: 'paused' } as Pick<AssignmentPayload, 'access_status'>)
        .eq('id', demoAssignmentId);
      if (result.error) throw new Error(`project_assignments pause update failed: ${result.error.message}`);
      setDemoResults((current) => [...current, 'Demo assignment paused. No records were deleted.']);
      await loadData(workspaceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause demo assignment');
    } finally {
      setPausingDemo(false);
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
  const missingTeam = [
    !assistantEngineerId ? 'Assistant Engineer' : '',
    !juniorEngineerId ? 'Junior Engineer' : '',
    !contractorId ? 'Contractor' : '',
  ].filter(Boolean);

  return (
    <AppLayout title="Start Pilot Wizard" subtitle="Guided setup from workspace to verified assignment">
      {featureFlags.pilotMode && (
        <Card className="mb-6 border-[#CDBD82]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge color="#F59E0B">Pilot test mode</Badge>
                <span className="text-xs text-[#6C7568]">Explicit click only</span>
              </div>
              <h2 className="text-lg font-semibold text-[#12332D]">Create Demo Pilot Data</h2>
              <p className="mt-1 text-sm text-[#4D5B52]">
                Creates a demo EE workspace, demo project, and pilot assignment for first testing. It does not create fake auth users for AE, JE, or Contractor.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" loading={creatingDemo} onClick={createDemoPilotData}>Create Demo Pilot Data</Button>
              {demoAssignmentId && (
                <Button variant="outline" loading={pausingDemo} onClick={pauseDemoAssignment}>Pause Demo Assignment</Button>
              )}
            </div>
          </div>
          {demoResults.length > 0 && (
            <div className="mt-4 rounded-lg border border-[#D9D0B5] bg-[#FAF7EC] p-3">
              <p className="mb-2 text-sm font-semibold text-[#12332D]">Demo data result</p>
              <ul className="space-y-1 text-xs text-[#4D5B52]">
                {demoResults.map((result) => <li key={result}>{result}</li>)}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setStep(0)}>View Wizard</Button>
                <Button size="sm" variant="outline" onClick={() => navigate('/enterprise/access')}>View Access Control</Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/enterprise/assign-project?workspaceId=${workspaceId}&projectId=${projectKey.split(':')[1] || ''}&projectTable=${projectKey.split(':')[0] || 'gov_projects'}`)}>Open Assignment Page</Button>
                <Button size="sm" variant="outline" onClick={() => navigate('/dashboard')}>View Dashboard</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card className="mb-6">
        <div className="flex flex-wrap gap-2">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(index)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${index === step ? 'bg-[#005F56] text-white' : index < step ? 'bg-[#D8B15A]/20 text-[#12332D]' : 'bg-[#F4EBD2] text-[#6C7568]'}`}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>
      </Card>

      {loading && (
        <Card className="mb-6">
          <div className="flex items-center gap-3 text-[#4D5B52]">
            <RefreshCw size={18} className="animate-spin" />
            <span className="text-sm">Loading pilot data...</span>
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

      {warnings.length > 0 && (
        <Card className="mb-6 border-[#CDBD82]">
          <div className="flex gap-3">
            <AlertTriangle size={18} className="mt-0.5 text-[#F59E0B]" />
            <div>
              <p className="text-sm font-semibold text-[#12332D]">Some data could not be loaded</p>
              <ul className="mt-2 space-y-1 text-xs text-[#6C7568]">
                {warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {step === 0 && (
        <Card>
          <h2 className="mb-2 text-lg font-semibold text-[#12332D]">Step 1: Select Workspace</h2>
          <p className="mb-5 text-sm text-[#4D5B52]">Choose the Executive Engineer workspace that will own the pilot project.</p>
          {workspaces.length ? (
            <Select label="Workspace" value={workspaceId} onChange={(event) => { setWorkspaceId(event.target.value); setAllowUpdate(false); void loadData(event.target.value); }} options={workspaceOptions} />
          ) : (
            <div className="rounded-lg border border-[#CDBD82] bg-[#FFF8E1] p-4">
              <p className="text-sm text-[#6B5A1E]">No EE workspace found. Create or configure one first, then return here.</p>
              <Button className="mt-3" variant="primary" onClick={() => navigate('/enterprise/setup')}>Open Workspace Setup</Button>
            </div>
          )}
        </Card>
      )}

      {step === 1 && (
        <Card>
          <h2 className="mb-2 text-lg font-semibold text-[#12332D]">Step 2: Select Project</h2>
          <p className="mb-5 text-sm text-[#4D5B52]">Use an existing GovTrack project. If the project is not listed, create it first, then return here.</p>
          {projects.length ? (
            <Select label="Project" value={projectKey} onChange={(event) => setProjectKey(event.target.value)} options={projectOptions} />
          ) : (
            <div className="rounded-lg border border-[#CDBD82] bg-[#FFF8E1] p-4">
              <p className="text-sm text-[#6B5A1E]">No project found. Create project first, then return here.</p>
              <Button className="mt-3" variant="primary" onClick={() => navigate('/govtrack/projects')}>Open GovTrack Projects</Button>
            </div>
          )}
        </Card>
      )}

      {step === 2 && (
        <Card>
          <h2 className="mb-2 text-lg font-semibold text-[#12332D]">Step 3: Select Team</h2>
          <p className="mb-5 text-sm text-[#4D5B52]">Assign the AE, JE, and Contractor for field execution and review.</p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Select
              label="Assistant Engineer"
              value={selectValue(assistantEngineerId)}
              onChange={(event) => setAssistantEngineerId(event.target.value === EMPTY_VALUE ? '' : event.target.value)}
              options={[{ value: EMPTY_VALUE, label: aeOptions.length ? 'Not assigned' : 'No AE found' }, ...aeOptions.map((user) => ({ value: user.user_id, label: profileName(profiles[user.user_id], shortId(user.user_id)) }))]}
            />
            <Select
              label="Junior Engineer"
              value={selectValue(juniorEngineerId)}
              onChange={(event) => setJuniorEngineerId(event.target.value === EMPTY_VALUE ? '' : event.target.value)}
              options={[{ value: EMPTY_VALUE, label: jeOptions.length ? 'Not assigned' : 'No JE found' }, ...jeOptions.map((user) => ({ value: user.user_id, label: profileName(profiles[user.user_id], shortId(user.user_id)) }))]}
            />
            <Select
              label="Contractor"
              value={selectValue(contractorId)}
              onChange={(event) => setContractorId(event.target.value === EMPTY_VALUE ? '' : event.target.value)}
              options={[{ value: EMPTY_VALUE, label: contractors.length ? 'Not assigned' : 'No contractor found' }, ...contractors.map((contractor) => ({ value: contractor.id, label: `${contractor.label}${contractor.status ? ` - ${contractor.status}` : ''}` }))]}
            />
          </div>
          {missingTeam.length > 0 && (
            <p className="mt-4 rounded-lg border border-[#CDBD82] bg-[#FFF8E1] px-3 py-2 text-sm text-[#6B5A1E]">
              Missing optional selection: {missingTeam.join(', ')}. You can continue, but the assignment will be incomplete.
            </p>
          )}
        </Card>
      )}

      {step === 3 && (
        <Card>
          <h2 className="mb-2 text-lg font-semibold text-[#12332D]">Step 4: Save Assignment</h2>
          <p className="mb-5 text-sm text-[#4D5B52]">Review the pilot mapping before saving it to project_assignments.</p>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Summary label="Workspace" value={selectedWorkspace?.workspace_name || '-'} />
            <Summary label="Project" value={selectedProject?.label || '-'} />
            <Summary label="AE" value={profileName(profiles[assistantEngineerId], shortId(assistantEngineerId))} />
            <Summary label="JE" value={profileName(profiles[juniorEngineerId], shortId(juniorEngineerId))} />
            <Summary label="Contractor" value={contractors.find((item) => item.id === contractorId)?.label || shortId(contractorId)} />
            <div>
              <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value as AssignmentStatus)} options={[{ value: 'pilot', label: 'Pilot' }, { value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }]} />
            </div>
          </div>
          {existingAssignment && (
            <label className="mt-5 flex cursor-pointer gap-3 rounded-lg border border-[#CDBD82] bg-[#FFF8E1] p-4 text-sm text-[#6B5A1E]">
              <input type="checkbox" checked={allowUpdate} onChange={(event) => setAllowUpdate(event.target.checked)} className="mt-1 h-4 w-4 accent-[#005F56]" />
              <span>An assignment already exists for this workspace and project. Update existing assignment instead of creating a duplicate.</span>
            </label>
          )}
          {missingTeam.length > 0 && (
            <p className="mt-4 rounded-lg border border-[#CDBD82] bg-[#FFF8E1] px-3 py-2 text-sm text-[#6B5A1E]">
              Warning: {missingTeam.join(', ')} not selected.
            </p>
          )}
          <Button className="mt-5" variant="primary" icon={<Save size={14} />} loading={saving} onClick={saveAssignment}>Save Pilot Assignment</Button>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <div className="mb-5 flex items-center gap-3">
            <CheckCircle2 size={24} className="text-[#22c55e]" />
            <div>
              <h2 className="text-lg font-semibold text-[#12332D]">Assignment Created Successfully</h2>
              <p className="text-sm text-[#4D5B52]">Assignment ID {shortId(savedAssignmentId || existingAssignment?.id)}</p>
            </div>
          </div>
          <div className="mb-6 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => navigate('/enterprise/access')}>View Access Control</Button>
            <Button variant="outline" onClick={() => navigate(`/enterprise/assign-project?workspaceId=${workspaceId}&projectId=${selectedProject?.id || ''}&projectTable=${selectedProject?.table || 'gov_projects'}`)}>Open Assignment Page</Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>Open Dashboard</Button>
            <Button variant="outline" onClick={() => navigate(selectedProject?.table === 'projects' ? `/projects?workspaceId=${workspaceId}&projectId=${selectedProject.id}` : `/govtrack/projects/${selectedProject?.id || ''}?workspaceId=${workspaceId}`)}>Back to Project</Button>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            {['Contractor uploads site photo/document', 'JE verifies field data', 'AE reviews QC/progress', 'EE monitors dashboard/reports'].map((item) => (
              <div key={item} className="rounded-lg border border-[#D9D0B5] bg-[#FAF7EC] p-3">
                <ClipboardCheck size={18} className="mb-2 text-[#005F56]" />
                <p className="text-sm text-[#12332D]">{item}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Button variant="outline" icon={<ChevronLeft size={14} />} disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</Button>
        {step < 3 && (
          <Button variant="primary" icon={<ChevronRight size={14} />} disabled={!canContinue()} onClick={() => setStep((current) => Math.min(4, current + 1))}>Next</Button>
        )}
        {step === 3 && <Badge color="#005F56">Ready to save</Badge>}
        {step === 4 && <Badge color="#22c55e">Pilot ready</Badge>}
      </div>
    </AppLayout>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#D9D0B5] bg-[#FAF7EC] p-3">
      <p className="text-xs text-[#6C7568]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#12332D]">{value || '-'}</p>
    </div>
  );
}
