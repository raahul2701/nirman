import { supabase } from '../lib/supabase';

export type WorkspaceRole = 'executive_engineer' | 'assistant_engineer' | 'junior_engineer' | 'contractor' | 'admin_viewer';
export type LicenseStatus = 'active' | 'trial' | 'expired' | 'suspended';

export interface ExecutiveEngineerWorkspace {
  id: string;
  executive_engineer_id: string;
  workspace_name: string;
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
  workspace_id: string;
  contractor_id: string;
  contractor_company_name: string;
  contractor_user_count: number;
  minimum_billable_users: number;
  price_per_user_month: number;
  billable_users: number;
  monthly_amount: number;
  license_status: LicenseStatus;
  billing_owner: 'contractor';
  recommended_by_executive_engineer_id: string | null;
  approved_by_executive_engineer_id: string | null;
  starts_at: string | null;
  expires_at: string | null;
  grace_until: string | null;
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
  return `NIRMAN/ExecutiveEngineer_${cleanEe}/Projects/${cleanProject}`;
}

export async function getMyWorkspaceSummary(): Promise<WorkspaceSummary> {
  try {
    const { data: memberships, error: memberError } = await supabase
      .from('workspace_users')
      .select('*')
      .eq('active', true)
      .limit(1);
    if (memberError) throw memberError;

    const workspaceId = (memberships?.[0] as any)?.workspace_id as string | undefined;
    if (!workspaceId) return EMPTY_WORKSPACE_SUMMARY;

    const [
      workspaceResult,
      membersResult,
      projectsResult,
      licensesResult,
      recommendationsResult,
      googleResult,
    ] = await Promise.all([
      supabase.from('executive_engineer_workspaces').select('*').eq('id', workspaceId).maybeSingle(),
      supabase.from('workspace_users').select('*').eq('workspace_id', workspaceId).eq('active', true),
      supabase.from('project_assignments').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
      supabase.from('contractor_licenses').select('*').eq('workspace_id', workspaceId).order('updated_at', { ascending: false }),
      supabase.from('contractor_recommendations').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
      supabase.from('workspace_google_connections').select('*').eq('workspace_id', workspaceId).maybeSingle(),
    ]);

    if (workspaceResult.error) throw workspaceResult.error;
    if (membersResult.error) throw membersResult.error;
    if (projectsResult.error) throw projectsResult.error;
    if (licensesResult.error) throw licensesResult.error;
    if (recommendationsResult.error) throw recommendationsResult.error;
    if (googleResult.error) throw googleResult.error;

    return normalizeWorkspaceSummary({
      workspace: workspaceResult.data as ExecutiveEngineerWorkspace | null,
      members: membersResult.data as WorkspaceUser[] | null,
      projects: projectsResult.data as ProjectAssignment[] | null,
      licenses: licensesResult.data as ContractorLicense[] | null,
      recommendations: recommendationsResult.data as ContractorRecommendation[] | null,
      googleConnection: googleResult.data as WorkspaceGoogleConnection | null,
    });
  } catch (error) {
    console.warn('[enterprise] workspace summary unavailable', error);
    return EMPTY_WORKSPACE_SUMMARY;
  }
}

export async function upsertWorkspaceGoogleConnection(workspaceId: string, values: Partial<WorkspaceGoogleConnection>) {
  const { data, error } = await supabase
    .from('workspace_google_connections')
    .upsert({
      workspace_id: workspaceId,
      google_project_id: values.google_project_id,
      drive_root_folder_id: values.drive_root_folder_id,
      maps_api_status: values.maps_api_status || 'not_configured',
      gemini_api_status: values.gemini_api_status || 'not_configured',
      drive_api_status: values.drive_api_status || 'not_configured',
      setup_status: values.setup_status || 'manual_pending',
      updated_at: new Date().toISOString(),
    } as any, { onConflict: 'workspace_id' })
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
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data as ContractorRecommendation;
}

export async function activateContractorLicense(input: {
  workspaceId: string;
  contractorId: string;
  contractorCompanyName: string;
  contractorUserCount: number;
  recommendedByExecutiveEngineerId?: string | null;
  approvedByExecutiveEngineerId?: string | null;
  expiresAt?: string | null;
}) {
  const { data, error } = await supabase
    .from('contractor_licenses')
    .upsert({
      workspace_id: input.workspaceId,
      contractor_id: input.contractorId,
      contractor_company_name: input.contractorCompanyName,
      contractor_user_count: input.contractorUserCount,
      minimum_billable_users: CONTRACTOR_MIN_BILLABLE_USERS,
      price_per_user_month: CONTRACTOR_LICENSE_PRICE,
      license_status: 'active',
      billing_owner: 'contractor',
      recommended_by_executive_engineer_id: input.recommendedByExecutiveEngineerId || null,
      approved_by_executive_engineer_id: input.approvedByExecutiveEngineerId || null,
      starts_at: new Date().toISOString(),
      expires_at: input.expiresAt || null,
      updated_at: new Date().toISOString(),
    } as any, { onConflict: 'workspace_id,contractor_id' })
    .select()
    .single();
  if (error) throw error;
  return data as ContractorLicense;
}
