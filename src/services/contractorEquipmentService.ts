import { supabase } from '../lib/supabase';
import { getActiveWorkspaceId } from './businessHierarchyService';

export type EquipmentProjectTable = 'projects' | 'gov_projects';

export type EquipmentContext = {
  workspace_id: string;
  contractor_id: string;
};

export type EquipmentProjectScope = EquipmentContext & {
  project_id: string;
  project_table: EquipmentProjectTable;
};

export type EquipmentAssetRecord = {
  id: string;
  workspace_id: string;
  contractor_id: string;
  name: string;
  equipment_code: string;
  equipment_type: string;
  registration_number: string | null;
  status: string;
  initial_hour_meter: number;
  initial_km: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type EquipmentDeploymentRecord = {
  id: string;
  workspace_id: string;
  project_id: string;
  project_table: string;
  contractor_id: string;
  equipment_asset_id: string;
  status: string;
  deployed_on: string;
  ended_on: string | null;
  notes: string | null;
  created_at: string;
  equipment_assets?: { name: string; equipment_code: string; equipment_type: string; registration_number: string | null } | null;
};

export type EquipmentExecutionLogRecord = {
  id: string;
  workspace_id: string;
  project_id: string;
  project_table: string;
  contractor_id: string;
  equipment_asset_id: string;
  execution_date: string;
  start_hour_meter: number;
  end_hour_meter: number;
  start_km: number;
  end_km: number;
  running_hours: number;
  km_travelled: number;
  fuel_used_litres: number | null;
  operator_name: string;
  activity: string;
  status: string;
  chainage_from: string;
  chainage_to: string;
  remarks: string;
  photos: string[];
  created_at: string;
  equipment_assets?: { name: string; equipment_code: string; equipment_type: string; registration_number: string | null } | null;
};

export type EquipmentExecutionResult = {
  log_id: string;
  running_hours: number;
  km_travelled: number;
};

/**
 * Canonical equipment code format (approved design): EQ- followed by exactly
 * three digits, e.g. EQ-014. Enforced by a DATABASE CHECK constraint
 * (equipment_assets_equipment_code_format_check) and validated here for
 * friendly client-side errors.
 */
export const EQUIPMENT_CODE_PATTERN = /^EQ-[0-9]{3}$/;

export function normalizeEquipmentCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export type CreateEquipmentAssetInput = {
  name: string;
  equipment_code: string;
  equipment_type: string;
  registration_number?: string;
  initial_hour_meter?: number;
  initial_km?: number;
  notes?: string;
};

export type DeployEquipmentAssetInput = {
  equipment_asset_id: string;
  project_id: string;
  deployed_on?: string;
  notes?: string;
};

export type RecordEquipmentExecutionInput = {
  equipment_asset_id: string;
  execution_date: string;
  start_hour_meter: number;
  end_hour_meter: number;
  start_km: number;
  end_km: number;
  fuel_used_litres?: number | null;
  operator_name?: string;
  activity?: string;
  status?: 'working' | 'idle' | 'breakdown';
  chainage_from?: string;
  chainage_to?: string;
  remarks?: string;
  photos?: string[];
};

const ASSET_COLUMNS = 'id, workspace_id, contractor_id, name, equipment_code, equipment_type, registration_number, status, initial_hour_meter, initial_km, notes, created_at, updated_at';
const DEPLOYMENT_COLUMNS = 'id, workspace_id, project_id, project_table, contractor_id, equipment_asset_id, status, deployed_on, ended_on, notes, created_at, equipment_assets(name, equipment_code, equipment_type, registration_number)';
const LOG_COLUMNS = 'id, workspace_id, project_id, project_table, contractor_id, equipment_asset_id, execution_date, start_hour_meter, end_hour_meter, start_km, end_km, running_hours, km_travelled, fuel_used_litres, operator_name, activity, status, chainage_from, chainage_to, remarks, photos, created_at, equipment_assets(name, equipment_code, equipment_type, registration_number)';

/**
 * Resolves the signed-in contractor identity. Business lock D: contractor_id
 * ALWAYS comes from auth.uid() — client input is never accepted.
 */
async function resolveEquipmentContext(): Promise<EquipmentContext> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error('Your session has expired. Please sign in again.');

  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (profileError) throw profileError;
  if (profile?.role !== 'contractor') throw new Error('Equipment execution is available only to contractor accounts.');

  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) throw new Error('An active contractor workspace is required for equipment execution.');

  return { workspace_id: workspaceId, contractor_id: userId };
}

/**
 * Validates that the requested project is one the signed-in contractor is
 * actively assigned to (active or pilot). V1 supports project_table='projects'
 * only (business lock C); gov_projects stays available in the schema.
 */
async function resolveProjectScope(projectId: string): Promise<EquipmentProjectScope> {
  const context = await resolveEquipmentContext();
  const { data: assignment, error: assignmentError } = await supabase
    .from('project_assignments')
    .select('id')
    .eq('workspace_id', context.workspace_id)
    .eq('project_id', projectId)
    .eq('project_table', 'projects')
    .eq('contractor_id', context.contractor_id)
    .in('access_status', ['active', 'pilot'])
    .maybeSingle();
  if (assignmentError) throw assignmentError;
  if (!assignment) throw new Error('No active or pilot contractor assignment exists for this project.');
  return { ...context, project_id: projectId, project_table: 'projects' };
}

function toLogRecord(row: Record<string, unknown>): EquipmentExecutionLogRecord {
  const photos = Array.isArray(row.photos) ? (row.photos as unknown[]) : [];
  return { ...(row as unknown as EquipmentExecutionLogRecord), photos: photos.filter((item): item is string => typeof item === 'string') };
}

// ---------------------------------------------------------------------------
// Assets (workspace-scoped; direct client writes guarded by narrow RLS)
// ---------------------------------------------------------------------------

export async function listEquipmentAssets(): Promise<EquipmentAssetRecord[]> {
  const context = await resolveEquipmentContext();
  const { data, error } = await supabase
    .from('equipment_assets')
    .select(ASSET_COLUMNS)
    .eq('workspace_id', context.workspace_id)
    .eq('contractor_id', context.contractor_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as EquipmentAssetRecord[];
}

export async function createEquipmentAsset(input: CreateEquipmentAssetInput): Promise<EquipmentAssetRecord> {
  const context = await resolveEquipmentContext();
  const name = input.name.trim();
  if (!name) throw new Error('Equipment name is required.');
  const equipmentCode = normalizeEquipmentCode(input.equipment_code ?? '');
  if (!equipmentCode) throw new Error('Equipment code is required (e.g. EQ-014).');
  if (!EQUIPMENT_CODE_PATTERN.test(equipmentCode)) throw new Error('Equipment code must use the format EQ-014 (EQ- followed by exactly 3 digits).');
  const equipmentType = (input.equipment_type || '').trim();
  if (!equipmentType) throw new Error('Equipment type is required.');
  const initialHourMeter = input.initial_hour_meter ?? 0;
  const initialKm = input.initial_km ?? 0;
  if (!Number.isFinite(initialHourMeter) || initialHourMeter < 0) throw new Error('Initial hour meter must be zero or more.');
  if (!Number.isFinite(initialKm) || initialKm < 0) throw new Error('Initial KM must be zero or more.');

  const { data, error } = await supabase
    .from('equipment_assets')
    .insert({
      workspace_id: context.workspace_id,
      contractor_id: context.contractor_id,
      created_by: context.contractor_id,
      name,
      equipment_code: equipmentCode,
      equipment_type: equipmentType,
      registration_number: input.registration_number?.trim() || null,
      status: 'active',
      initial_hour_meter: initialHourMeter,
      initial_km: initialKm,
      notes: input.notes?.trim() || null,
    })
    .select(ASSET_COLUMNS)
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('This equipment code is already used in your workspace. Equipment codes must be unique (e.g. EQ-014).');
    throw error;
  }
  return data as EquipmentAssetRecord;
}

export async function setEquipmentAssetStatus(assetId: string, status: 'active' | 'inactive'): Promise<void> {
  const context = await resolveEquipmentContext();
  const { error } = await supabase
    .from('equipment_assets')
    .update({ status })
    .eq('id', assetId)
    .eq('workspace_id', context.workspace_id)
    .eq('contractor_id', context.contractor_id)
    .is('deleted_at', null);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Deployments (project-scoped; direct client writes guarded by narrow RLS)
// ---------------------------------------------------------------------------

export async function listEquipmentDeployments(): Promise<EquipmentDeploymentRecord[]> {
  const context = await resolveEquipmentContext();
  const { data, error } = await supabase
    .from('project_equipment_assignments')
    .select(DEPLOYMENT_COLUMNS)
    .eq('workspace_id', context.workspace_id)
    .eq('contractor_id', context.contractor_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as EquipmentDeploymentRecord[];
}

export async function deployEquipmentAsset(input: DeployEquipmentAssetInput): Promise<EquipmentDeploymentRecord> {
  const scope = await resolveProjectScope(input.project_id);
  const { data, error } = await supabase
    .from('project_equipment_assignments')
    .insert({
      workspace_id: scope.workspace_id,
      project_id: scope.project_id,
      project_table: scope.project_table,
      contractor_id: scope.contractor_id,
      created_by: scope.contractor_id,
      equipment_asset_id: input.equipment_asset_id,
      status: 'active',
      deployed_on: input.deployed_on || new Date().toISOString().slice(0, 10),
      notes: input.notes?.trim() || null,
    })
    .select(DEPLOYMENT_COLUMNS)
    .single();
  if (error) throw error;
  return data as EquipmentDeploymentRecord;
}

export async function endEquipmentDeployment(deploymentId: string, endedOn?: string): Promise<void> {
  const context = await resolveEquipmentContext();
  const { error } = await supabase
    .from('project_equipment_assignments')
    .update({ status: 'ended', ended_on: endedOn || new Date().toISOString().slice(0, 10) })
    .eq('id', deploymentId)
    .eq('contractor_id', context.contractor_id)
    .eq('status', 'active')
    .is('deleted_at', null);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Execution logs (read-only for clients; writes go through the RPC only)
// ---------------------------------------------------------------------------

export async function listEquipmentExecutionLogs(options?: { limit?: number }): Promise<EquipmentExecutionLogRecord[]> {
  const context = await resolveEquipmentContext();
  const { data, error } = await supabase
    .from('equipment_execution_logs')
    .select(LOG_COLUMNS)
    .eq('workspace_id', context.workspace_id)
    .eq('contractor_id', context.contractor_id)
    .is('deleted_at', null)
    .order('execution_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 200);
  if (error) throw error;
  return ((data || []) as Record<string, unknown>[]).map(toLogRecord);
}

/**
 * Records one execution through the SECURITY DEFINER RPC — the single write
 * path into equipment_execution_logs. The server validates everything and
 * returns the GENERATED running_hours / km_travelled values.
 */
export async function recordEquipmentExecution(projectId: string, input: RecordEquipmentExecutionInput): Promise<EquipmentExecutionResult> {
  const scope = await resolveProjectScope(projectId);
  const { data, error } = await supabase.rpc('contractor_record_equipment_execution', {
    p_workspace_id: scope.workspace_id,
    p_project_id: scope.project_id,
    p_project_table: scope.project_table,
    p_equipment_asset_id: input.equipment_asset_id,
    p_execution_date: input.execution_date,
    p_start_hour_meter: input.start_hour_meter,
    p_end_hour_meter: input.end_hour_meter,
    p_start_km: input.start_km,
    p_end_km: input.end_km,
    p_fuel_used_litres: input.fuel_used_litres ?? null,
    p_operator_name: input.operator_name ?? '',
    p_activity: input.activity ?? '',
    p_status: input.status ?? 'working',
    p_chainage_from: input.chainage_from ?? '',
    p_chainage_to: input.chainage_to ?? '',
    p_remarks: input.remarks ?? '',
    p_photos: input.photos ?? [],
  });
  if (error) throw error;
  const result = data as Partial<EquipmentExecutionResult> | null;
  if (!result?.log_id) throw new Error('Equipment execution could not be recorded.');
  return {
    log_id: result.log_id,
    running_hours: Number(result.running_hours ?? 0),
    km_travelled: Number(result.km_travelled ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Photos — reuse the existing `uploads` bucket convention
// (upload + getPublicUrl, same as DailyReportForm); no new bucket.
// ---------------------------------------------------------------------------

export async function uploadEquipmentExecutionPhotos(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `equipment-execution/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
    const { error } = await supabase.storage.from('uploads').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('uploads').getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}