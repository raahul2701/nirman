import { supabase } from '../lib/supabase';
import type { Worker } from '../types';
import { getActiveWorkspaceId } from './businessHierarchyService';

export type WorkerProjectTable = 'projects' | 'gov_projects';
export type WorkerScope = { workspace_id: string; project_id: string; project_table: WorkerProjectTable; contractor_id: string; };
type WorkerMutableFields = { site_id?: string | null; full_name?: string; phone?: string | null; aadhaar_number?: string | null; skill?: string | null; daily_wage?: number | null; photo_url?: string | null; emergency_contact?: string | null; address?: string | null; joining_date?: string | null; is_active?: boolean | null; email?: string | null; };
export type CreateWorkerInput = WorkerScope & WorkerMutableFields & { full_name: string };
export type UpdateWorkerInput = WorkerScope & WorkerMutableFields;
const WORKER_COLUMNS = 'id, site_id, full_name, phone, aadhaar_number, skill, daily_wage, photo_url, emergency_contact, address, joining_date, is_active, created_at, workspace_id, project_id, project_table, contractor_id, email, auth_user_id';

async function resolveWorkerScope(scope: WorkerScope): Promise<WorkerScope> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user?.id) throw new Error('Your session has expired. Please sign in again.');
  const { data: profile, error: profileError } = await supabase.from('profiles').select('id, role').eq('id', data.user.id).maybeSingle();
  if (profileError) throw profileError;
  if (profile?.role !== 'contractor') throw new Error('Worker scope is available only to contractor accounts.');
  if (scope.contractor_id !== data.user.id) throw new Error('Worker scope must belong to the signed-in contractor.');
  const activeWorkspaceId = await getActiveWorkspaceId();
  if (!activeWorkspaceId || activeWorkspaceId !== scope.workspace_id) throw new Error('Worker scope must belong to the active workspace.');
  const { data: assignment, error: assignmentError } = await supabase.from('project_assignments').select('id')
    .eq('workspace_id', scope.workspace_id).eq('project_id', scope.project_id).eq('project_table', scope.project_table)
    .eq('contractor_id', data.user.id).in('access_status', ['active', 'pilot']).maybeSingle();
  if (assignmentError) throw assignmentError;
  if (!assignment) throw new Error('No active contractor assignment exists for the requested worker scope.');
  return { ...scope, contractor_id: data.user.id };
}

function workerPayload(input: WorkerMutableFields): WorkerMutableFields {
  return Object.fromEntries(
    Object.entries({
      site_id: input.site_id,
      full_name: input.full_name,
      phone: input.phone,
      aadhaar_number: input.aadhaar_number,
      skill: input.skill,
      daily_wage: input.daily_wage,
      photo_url: input.photo_url,
      emergency_contact: input.emergency_contact,
      address: input.address,
      joining_date: input.joining_date,
      is_active: input.is_active,
      email: input.email,
    }).filter(([, value]) => value !== undefined)
  ) as WorkerMutableFields;
}

export async function listWorkers(scope: WorkerScope): Promise<Worker[]> {
  const resolvedScope = await resolveWorkerScope(scope);
  const { data, error } = await supabase.from('workers').select(WORKER_COLUMNS).eq('workspace_id', resolvedScope.workspace_id).eq('project_id', resolvedScope.project_id).eq('project_table', resolvedScope.project_table).eq('contractor_id', resolvedScope.contractor_id).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Worker[];
}

export async function createWorker(input: CreateWorkerInput): Promise<Worker> {
  const resolvedScope = await resolveWorkerScope(input);
  const { data, error } = await supabase.from('workers').insert({ ...workerPayload(input), ...resolvedScope }).select(WORKER_COLUMNS).single();
  if (error) throw error;
  return data as Worker;
}

export async function updateWorker(id: string, input: UpdateWorkerInput): Promise<Worker> {
  const resolvedScope = await resolveWorkerScope(input);
  const { data, error } = await supabase.from('workers').update(workerPayload(input)).eq('id', id).eq('workspace_id', resolvedScope.workspace_id).eq('project_id', resolvedScope.project_id).eq('project_table', resolvedScope.project_table).eq('contractor_id', resolvedScope.contractor_id).select(WORKER_COLUMNS).single();
  if (error) throw error;
  return data as Worker;
}