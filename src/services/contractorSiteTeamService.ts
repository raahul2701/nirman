import { supabase } from '../lib/supabase';
import { loadProjectOptionsForAssignments, loadVisibleProjectAssignments, type ProjectOption } from './assignedProjectsService';

export const SITE_TEAM_ROLE = 'project_manager' as const;

export type ContractorSiteTeamMember = {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  role: string;
  employee_code: string | null;
  login_identifier: string | null;
  active: boolean;
  deactivated_at: string | null;
  password_reset_required: boolean;
  project_id: string | null;
  project_label: string;
};

export type SiteTeamScope = {
  projectId: string;
  role: typeof SITE_TEAM_ROLE;
  scopeType: string;
  workPackageRef?: string;
};

type SiteTeamFunctionResponse = { ok: boolean; message?: string };
type TeamRow = Record<string, unknown>;

function asString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

async function currentContractorContext() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user?.id) throw new Error('Your session has expired. Please sign in again.');
  const membership = await supabase.from('workspace_users').select('workspace_id').eq('user_id', data.user.id).eq('role', 'contractor').eq('active', true).limit(2);
  if (membership.error) throw membership.error;
  if ((membership.data || []).length !== 1 || !membership.data?.[0]?.workspace_id) throw new Error('A single active Contractor workspace is required for Site Team management.');
  return { contractorId: data.user.id, workspaceId: membership.data[0].workspace_id as string };
}

export async function loadContractorProjects(): Promise<ProjectOption[]> {
  const { contractorId, workspaceId } = await currentContractorContext();
  const assignments = await loadVisibleProjectAssignments(contractorId);
  const ownAssignments = assignments.filter((assignment) => assignment.contractor_id === contractorId && assignment.workspace_id === workspaceId);
  return loadProjectOptionsForAssignments(ownAssignments);
}

export async function listContractorSiteTeam(): Promise<ContractorSiteTeamMember[]> {
  const { contractorId, workspaceId } = await currentContractorContext();
  const { data: members, error: membersError } = await supabase
    .from('workspace_users')
    .select('id, user_id, full_name, email, phone, role, employee_code, login_identifier, active, deactivated_at, password_reset_required')
    .eq('workspace_id', workspaceId)
    .eq('contractor_owner_id', contractorId)
    .eq('role', SITE_TEAM_ROLE)
    .order('created_at', { ascending: false });
  if (membersError) throw membersError;

  const rows = (members || []) as unknown as TeamRow[];
  const userIds = rows.map((row) => asString(row.user_id)).filter((id): id is string => Boolean(id));
  if (userIds.length === 0) return [];

  const [{ data: profiles, error: profilesError }, { data: scopes, error: scopesError }] = await Promise.all([
    supabase.from('profiles').select('id, location').in('id', userIds),
    supabase.from('project_user_scopes').select('user_id, project_id, role, active').in('user_id', userIds).eq('role', SITE_TEAM_ROLE).eq('active', true),
  ]);
  if (profilesError) throw profilesError;
  if (scopesError) throw scopesError;

  const profileLocation = new Map(((profiles || []) as Array<{ id: string; location?: string | null }>).map((profile) => [profile.id, profile.location || null]));
  const projectByUser = new Map(((scopes || []) as Array<{ user_id: string; project_id: string }>).map((scope) => [scope.user_id, scope.project_id]));
  const projectOptions = await loadContractorProjects();
  const projectLabel = new Map(projectOptions.map((project) => [project.id, project.label]));

  return rows.map((row) => {
    const userId = asString(row.user_id) || '';
    const projectId = projectByUser.get(userId) || null;
    return {
      id: asString(row.id) || userId,
      user_id: userId,
      full_name: asString(row.full_name) || 'Unnamed member',
      email: asString(row.email),
      phone: asString(row.phone),
      location: profileLocation.get(userId) || null,
      role: asString(row.role) || SITE_TEAM_ROLE,
      employee_code: asString(row.employee_code),
      login_identifier: asString(row.login_identifier),
      active: asBoolean(row.active, true) && !asString(row.deactivated_at),
      deactivated_at: asString(row.deactivated_at),
      password_reset_required: asBoolean(row.password_reset_required),
      project_id: projectId,
      project_label: projectId ? projectLabel.get(projectId) || projectId : 'Not assigned',
    };
  });
}

export async function provisionContractorSiteTeamMember(input: {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  employeeCode?: string;
  loginIdentifier: string;
  scope: SiteTeamScope;
}) {
  const { data, error } = await supabase.functions.invoke<SiteTeamFunctionResponse>('provision-project-team', {
    body: { action: 'contractor_site_team_provision', ...input },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.message || 'Could not provision the Project Manager.');
}

async function invokeLifecycle(action: 'contractor_site_team_deactivate' | 'contractor_site_team_request_password_reset', userId: string) {
  const { data, error } = await supabase.functions.invoke<SiteTeamFunctionResponse>('provision-project-team', { body: { action, userId } });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.message || 'Could not update the Site Team member.');
}

export function deactivateContractorSiteTeamMember(userId: string) {
  return invokeLifecycle('contractor_site_team_deactivate', userId);
}

export function requestContractorSiteTeamPasswordReset(userId: string) {
  return invokeLifecycle('contractor_site_team_request_password_reset', userId);
}
