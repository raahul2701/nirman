import { supabase } from '../lib/supabase';
import { isCapabilityUnavailable, isMissingBackendCapabilityError, markCapabilityUnavailable } from '../lib/backendCapabilities';

export type WorkspaceRole = 'executive_engineer' | 'assistant_engineer' | 'junior_engineer' | 'contractor' | 'admin_viewer';
export type LicenseStatus = 'active' | 'trial' | 'expired' | 'suspended';

export interface ExecutiveEngineerWorkspace {
  id: string;
  executive_engineer_id: string;
  executive_engineer_name: string;
  executive_engineer_email: string | null;
  workspace_name: string;
  workspace_code: string | null;
  division_code: string | null;
  department: string | null;
  district: string | null;
  drive_root_folder_id: string | null;
  storage_namespace: string;
  status: string;
}

export interface WorkspaceUser {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  parent_user_id: string | null;
  subdivision_name: string | null;
  free_lifetime: boolean;
  active: boolean;
}

export interface ContractorLicense {
  id: string;
  workspace_id: string | null;
  contractor_name: string;
  actual_users: number | null;
  billable_users: number | null;
  price_per_user: number | null;
  monthly_amount: number | null;
  license_status: LicenseStatus | null;
  renewal_date: string | null;
  recommended_by: string | null;
  created_at: string | null;
}

export interface ContractorRecommendation {
  id: string;
  workspace_id: string;
  contractor_name: string;
  contractor_email: string | null;
  contractor_phone: string | null;
  contractor_company_name: string | null;
  project_ids: string[];
  onboarding_token: string;
  status: string;
  expires_at: string;
}

export interface WorkspaceGoogleConnection {
  id: string;
  workspace_id: string;
  google_project_id: string | null;
  drive_root_folder_id: string | null;
  maps_api_status: string;
  gemini_api_status: string;
  drive_api_status: string;
  setup_status: string;
}

export interface ProjectAssignment {
  id: string;
  workspace_id: string;
  project_id: string;
  project_table: string;
  executive_engineer_id: string;
  assistant_engineer_id: string | null;
  junior_engineer_id: string | null;
  contractor_id: string | null;
  contractor_company_name: string | null;
  access_status: string;
}

export interface WorkspaceSummary {
  workspace: ExecutiveEngineerWorkspace | null;
  members: WorkspaceUser[];
  projects: ProjectAssignment[];
  licenses: ContractorLicense[];
  recommendations: ContractorRecommendation[];
  googleConnection: WorkspaceGoogleConnection | null;
}

export const EMPTY_WORKSPACE_SUMMARY: WorkspaceSummary = {
  workspace: null,
  members: [],
  projects: [],
  licenses: [],
  recommendations: [],
  googleConnection: null,
};

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

type WorkspaceSummaryInput = {
  workspace?: ExecutiveEngineerWorkspace | null;
  members?: WorkspaceUser[] | null;
  projects?: ProjectAssignment[] | null;
  licenses?: ContractorLicense[] | null;
  recommendations?: ContractorRecommendation[] | null;
  googleConnection?: WorkspaceGoogleConnection | null;
};
type WorkspaceMembershipRow = {
  workspace_id?: string;
};
type WorkspaceGoogleConnectionUpsert = Partial<WorkspaceGoogleConnection> & {
  workspace_id: string;
  updated_at: string;
};
type ContractorRecommendationInsert = {
  workspace_id: string;
  recommended_by_executive_engineer_id: string;
  contractor_name: string;
  contractor_email: string | null;
  contractor_phone: string | null;
  contractor_company_name: string | null;
  project_ids: string[];
  status: string;
};
type ContractorLicenseUpsert = {
  workspace_id: string | null;
  contractor_name: string;
  actual_users: number;
  price_per_user: number;
  license_status: LicenseStatus;
  recommended_by: string | null;
  renewal_date: string | null;
};

export function normalizeWorkspaceSummary(summary?: WorkspaceSummaryInput | null): WorkspaceSummary {
  return {
    workspace: summary?.workspace ?? null,
    members: asArray(summary?.members),
    projects: asArray(summary?.projects),
    licenses: asArray(summary?.licenses),
    recommendations: asArray(summary?.recommendations),
    googleConnection: summary?.googleConnection ?? null,
  };
}

export const CONTRACTOR_LICENSE_PRICE = 270;
export const CONTRACTOR_MIN_BILLABLE_USERS = 10;

export async function getActiveWorkspaceId(): Promise<string | null> {
  const summary = await getMyWorkspaceSummary();
  return summary.workspace?.id ?? null;
}

export function calculateContractorMonthlyAmount(actualUsers: number) {
  const safeUsers = Math.max(0, Math.floor(Number(actualUsers) || 0));
  const billableUsers = Math.max(safeUsers, CONTRACTOR_MIN_BILLABLE_USERS);
  return {
    actualUsers: safeUsers,
    billableUsers,
    pricePerUserMonth: CONTRACTOR_LICENSE_PRICE,
    monthlyAmount: billableUsers * CONTRACTOR_LICENSE_PRICE,
  };
}

export function getDriveProjectFolderPath(eeNameOrId: string, projectName: string) {
  const cleanEe = String(eeNameOrId || '').trim().replace(/[\\/]+/g, '-').replace(/\s+/g, '_') || 'UnknownEE';
  const cleanProject = String(projectName || '').trim().replace(/[\\/]+/g, '-').replace(/\s+/g, '_') || 'Project';
  return `NIRMAN AI/${cleanEe}/${cleanProject}`;
}

type SupabaseErrorLike = {
  code?: string;
  message?: string | null;
  details?: string | null;
  status?: number | string;
};
type ProfileIdentityRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  company?: string | null;
};

type WorkspaceInsertPayload = {
  executive_engineer_id: string;
  executive_engineer_name: string;
  executive_engineer_email: string | null;
  workspace_name: string;
  workspace_code: string;
  division_code: string;
  department: string;
  district: string;
  storage_namespace: string;
  status: string;
};

type WorkspaceUpdatePayload = Partial<Pick<ExecutiveEngineerWorkspace, 'drive_root_folder_id'>> & {
  google_drive_root_folder_id?: string | null;
  gemini_enabled?: boolean | null;
  maps_enabled?: boolean | null;
  updated_at: string;
};

export function isContractorRecommendationStorageUnavailable() {
  return isCapabilityUnavailable('contractorRecommendations');
}

function isOptionalSupabaseError(error?: SupabaseErrorLike | null) {
  if (!error) return false;
  const hint = [error.code, error.message, error.details, error.status]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    hint.includes('pgrst205') ||
    hint.includes('42703') ||
    (hint.includes('relation') && hint.includes('does not exist')) ||
    String(error.status) === '404'
  );
}

function emailLocalPart(email?: string | null) {
  return email?.split('@')[0] || null;
}

function resolveEngineerName(workspaceUserName?: string | null, profile?: ProfileIdentityRow | null, authEmail?: string | null) {
  return workspaceUserName || profile?.full_name || emailLocalPart(authEmail) || 'Executive Engineer';
}

function workspaceCodeFromUserId(userId: string) {
  return `EE-${userId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

async function resolveWorkspaceForUser(userId: string, authEmail?: string | null): Promise<ExecutiveEngineerWorkspace | null> {
  const memberResult = await supabase
    .from('workspace_users')
    .select('workspace_id, full_name')
    .eq('user_id', userId)
    .eq('active', true)
    .limit(1);
  if (memberResult.error) throw memberResult.error;

  const membership = memberResult.data?.[0] as (WorkspaceMembershipRow & { full_name?: string | null }) | undefined;
  if (membership?.workspace_id) {
    const workspaceResult = await supabase.from('executive_engineer_workspaces').select('*').eq('id', membership.workspace_id).maybeSingle();
    if (workspaceResult.error) throw workspaceResult.error;
    if (workspaceResult.data) return workspaceResult.data as ExecutiveEngineerWorkspace;
  }

  const existingByEngineer = await supabase
    .from('executive_engineer_workspaces')
    .select('*')
    .eq('executive_engineer_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingByEngineer.error) throw existingByEngineer.error;
  if (existingByEngineer.data) return existingByEngineer.data as ExecutiveEngineerWorkspace;

  const profileResult = await supabase
    .from('profiles')
    .select('id, full_name, email, company')
    .eq('id', userId)
    .maybeSingle();
  if (profileResult.error) throw profileResult.error;

  const profile = profileResult.data as ProfileIdentityRow | null;
  const workspaceCode = workspaceCodeFromUserId(userId);
  const insertPayload: WorkspaceInsertPayload = {
    executive_engineer_id: userId,
    executive_engineer_name: resolveEngineerName(membership?.full_name, profile, authEmail),
    executive_engineer_email: profile?.email || authEmail || null,
    workspace_name: profile?.company ? `${profile.company} Workspace` : `${workspaceCode} Workspace`,
    workspace_code: workspaceCode,
    division_code: workspaceCode,
    department: profile?.company || 'Unassigned Department',
    district: 'Unassigned District',
    storage_namespace: `ee_${userId.replace(/-/g, '').slice(0, 16)}`,
    status: 'active',
  };

  const insertResult = await supabase
    .from('executive_engineer_workspaces')
    .insert(insertPayload)
    .select('*')
    .maybeSingle();
  if (insertResult.error) throw insertResult.error;
  return insertResult.data as ExecutiveEngineerWorkspace | null;
}

export async function getMyWorkspaceSummary(): Promise<WorkspaceSummary> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user?.id) return EMPTY_WORKSPACE_SUMMARY;

  const workspace = await resolveWorkspaceForUser(userData.user.id, userData.user.email);
  if (!workspace?.id) {
    return EMPTY_WORKSPACE_SUMMARY;
  }

  const workspaceId = workspace.id;

  const membersResult = await supabase.from('workspace_users').select('*').eq('workspace_id', workspaceId).eq('active', true);
  if (membersResult.error) throw membersResult.error;

  const projectsResult = await supabase.from('project_assignments').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false });
  if (projectsResult.error) throw projectsResult.error;

  const licensesResult = await supabase.from('contractor_licenses').select('*').eq('workspace_id', workspaceId);
  const licenses = licensesResult.error
    ? isOptionalSupabaseError(licensesResult.error)
      ? []
      : (() => { throw licensesResult.error; })()
    : (licensesResult.data as ContractorLicense[] | null) ?? [];

  let recommendations: ContractorRecommendation[] = [];
  if (!isCapabilityUnavailable('contractorRecommendations')) {
    const recommendationsResult = await supabase
      .from('contractor_recommendations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (recommendationsResult.error) {
      if (isMissingBackendCapabilityError(recommendationsResult.error)) {
        markCapabilityUnavailable('contractorRecommendations');
      } else {
        throw recommendationsResult.error;
      }
    } else {
      recommendations = (recommendationsResult.data as ContractorRecommendation[] | null) ?? [];
    }
  }

  const googleResult = await supabase.from('workspace_google_connections').select('*').eq('workspace_id', workspaceId).maybeSingle();

  return normalizeWorkspaceSummary({
    workspace,
    members: membersResult.data as WorkspaceUser[] | null,
    projects: projectsResult.data as ProjectAssignment[] | null,
    licenses,
    recommendations,
    googleConnection: googleResult.error ? null : (googleResult.data as WorkspaceGoogleConnection | null),
  });
}

export async function upsertWorkspaceGoogleConnection(workspaceId: string, values: Partial<WorkspaceGoogleConnection>) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user?.id) throw new Error('Your session has expired. Please sign in again.');

  const workspace = await resolveWorkspaceForUser(userData.user.id, userData.user.email);
  const resolvedWorkspaceId = workspace?.id || workspaceId;
  if (!resolvedWorkspaceId) throw new Error('Executive Engineer workspace could not be resolved.');

  const workspaceUpdate = await supabase
    .from('executive_engineer_workspaces')
    .update({
      drive_root_folder_id: values.drive_root_folder_id ?? null,
      google_drive_root_folder_id: values.drive_root_folder_id ?? null,
      gemini_enabled: values.gemini_api_status === 'manual_configured',
      maps_enabled: values.maps_api_status === 'manual_configured',
      updated_at: new Date().toISOString(),
    } as WorkspaceUpdatePayload)
    .eq('id', resolvedWorkspaceId);
  if (workspaceUpdate.error) throw workspaceUpdate.error;

  const { data, error } = await supabase
    .from('workspace_google_connections')
    .upsert({
      workspace_id: resolvedWorkspaceId,
      google_project_id: values.google_project_id,
      drive_root_folder_id: values.drive_root_folder_id,
      maps_api_status: values.maps_api_status || 'not_configured',
      gemini_api_status: values.gemini_api_status || 'not_configured',
      drive_api_status: values.drive_api_status || 'not_configured',
      setup_status: values.setup_status || 'manual_pending',
      updated_at: new Date().toISOString(),
    } as WorkspaceGoogleConnectionUpsert, { onConflict: 'workspace_id' })
    .select()
    .single();
  if (error) throw error;
  return data as WorkspaceGoogleConnection;
}

export async function recommendContractor(input: {
  workspaceId: string;
  recommendedByExecutiveEngineerId: string;
  contractorName: string;
  contractorEmail?: string;
  contractorPhone?: string;
  contractorCompanyName?: string;
  projectIds?: string[];
}) {
  const { data, error } = await supabase
    .from('contractor_recommendations')
    .insert({
      workspace_id: input.workspaceId,
      recommended_by_executive_engineer_id: input.recommendedByExecutiveEngineerId,
      contractor_name: input.contractorName,
      contractor_email: input.contractorEmail || null,
      contractor_phone: input.contractorPhone || null,
      contractor_company_name: input.contractorCompanyName || null,
      project_ids: input.projectIds || [],
      status: 'recommended',
    } as ContractorRecommendationInsert)
    .select()
    .single();
  if (error) {
    if (isMissingBackendCapabilityError(error)) {
      markCapabilityUnavailable('contractorRecommendations');
      throw new Error('Contractor recommendation storage is not configured.');
    }
    throw error;
  }
  return data as ContractorRecommendation;
}

export async function activateContractorLicense(input: {
  workspaceId: string;
  contractorCompanyName: string;
  contractorUserCount: number;
  recommendedByExecutiveEngineerId?: string | null;
  approvedByExecutiveEngineerId?: string | null;
  expiresAt?: string | null;
}) {
  const billing = calculateContractorMonthlyAmount(input.contractorUserCount);
  const { data, error } = await supabase
    .from('contractor_licenses')
    .upsert({
      workspace_id: input.workspaceId,
      contractor_name: input.contractorCompanyName,
      actual_users: billing.actualUsers,
      price_per_user: CONTRACTOR_LICENSE_PRICE,
      license_status: 'active',
      recommended_by: input.approvedByExecutiveEngineerId || input.recommendedByExecutiveEngineerId || null,
      renewal_date: input.expiresAt || null,
    } as ContractorLicenseUpsert, { onConflict: 'workspace_id,contractor_name' })
    .select()
    .single();
  if (error) throw error;
  return data as ContractorLicense;
}

