import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';
import { getActiveWorkspaceId } from './businessHierarchyService';
import type { WorkerScope } from './workersService';

export type Subcontractor = Database['public']['Tables']['subcontractors']['Row'];
type SubcontractorInsert = Database['public']['Tables']['subcontractors']['Insert'];
type SubcontractorUpdate = Database['public']['Tables']['subcontractors']['Update'];

type SubcontractorMutableFields = Pick<SubcontractorInsert, 'company_name' | 'contact_person' | 'phone' | 'email' | 'work_type' | 'work_description' | 'status' | 'start_date' | 'end_date'>;
export type CreateSubcontractorInput = WorkerScope & Omit<SubcontractorMutableFields, 'company_name'> & { company_name: string };
export type UpdateSubcontractorInput = SubcontractorMutableFields;

const SUBCONTRACTOR_COLUMNS = 'id, workspace_id, project_id, project_table, contractor_id, company_name, contact_person, phone, email, work_type, work_description, status, start_date, end_date, created_at, updated_at';

async function resolveSubcontractorScope(scope: WorkerScope): Promise<WorkerScope> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user?.id) throw new Error('Your session has expired. Please sign in again.');
  const { data: profile, error: profileError } = await supabase.from('profiles').select('id, role').eq('id', data.user.id).maybeSingle();
  if (profileError) throw profileError;
  if (profile?.role !== 'contractor') throw new Error('Subcontractor scope is available only to contractor accounts.');
  if (scope.contractor_id !== data.user.id) throw new Error('Subcontractor scope must belong to the signed-in contractor.');
  const activeWorkspaceId = await getActiveWorkspaceId();
  if (!activeWorkspaceId || activeWorkspaceId !== scope.workspace_id) throw new Error('Subcontractor scope must belong to the active workspace.');
  const { data: assignment, error: assignmentError } = await supabase.from('project_assignments').select('id').eq('workspace_id', scope.workspace_id).eq('project_id', scope.project_id).eq('project_table', scope.project_table).eq('contractor_id', data.user.id).in('access_status', ['active', 'pilot']).maybeSingle();
  if (assignmentError) throw assignmentError;
  if (!assignment) throw new Error('No active contractor assignment exists for the requested subcontractor scope.');
  return { ...scope, contractor_id: data.user.id };
}

function subcontractorPayload(input: SubcontractorMutableFields): SubcontractorUpdate {
  return Object.fromEntries(Object.entries({ company_name: input.company_name, contact_person: input.contact_person, phone: input.phone, email: input.email, work_type: input.work_type, work_description: input.work_description, status: input.status, start_date: input.start_date, end_date: input.end_date }).filter(([, value]) => value !== undefined)) as SubcontractorUpdate;
}

export async function listSubcontractors(scope: WorkerScope): Promise<Subcontractor[]> {
  const resolvedScope = await resolveSubcontractorScope(scope);
  const { data, error } = await supabase.from('subcontractors').select(SUBCONTRACTOR_COLUMNS).eq('workspace_id', resolvedScope.workspace_id).eq('project_id', resolvedScope.project_id).eq('project_table', resolvedScope.project_table).eq('contractor_id', resolvedScope.contractor_id).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Subcontractor[];
}

export async function createSubcontractor(input: CreateSubcontractorInput): Promise<Subcontractor> {
  const resolvedScope = await resolveSubcontractorScope(input);
  const payload = { ...subcontractorPayload(input), company_name: input.company_name, ...resolvedScope } as SubcontractorInsert;
  const { data, error } = await supabase.from('subcontractors').insert(payload).select(SUBCONTRACTOR_COLUMNS).single();
  if (error) throw error;
  return data as Subcontractor;
}

export async function updateSubcontractor(id: string, scope: WorkerScope, input: UpdateSubcontractorInput): Promise<Subcontractor> {
  const resolvedScope = await resolveSubcontractorScope(scope);
  const { data, error } = await supabase.from('subcontractors').update(subcontractorPayload(input)).eq('id', id).eq('workspace_id', resolvedScope.workspace_id).eq('project_id', resolvedScope.project_id).eq('project_table', resolvedScope.project_table).eq('contractor_id', resolvedScope.contractor_id).select(SUBCONTRACTOR_COLUMNS).single();
  if (error) throw error;
  return data as Subcontractor;
}