import { supabase } from '../lib/supabase';
import { getActiveWorkspaceId } from './businessHierarchyService';
import type { WorkerScope } from './workersService';

export type ContractorMaterialRecord = {
  id: string;
  workspace_id: string;
  project_id: string;
  project_table: 'projects' | 'gov_projects';
  contractor_id: string;
  material_name: string;
  category: string | null;
  unit: string | null;
  current_quantity: number;
  unit_price: number | null;
  created_at: string;
};

export type ContractorStockTransaction = {
  id: string;
  material_id: string | null;
  transaction_type: string;
  quantity: number;
  unit_price: number | null;
  total_amount: number | null;
  transaction_date: string | null;
  done_by: string | null;
  notes: string | null;
  materials?: { material_name: string; unit: string | null } | null;
};

export type RecordMaterialEntryResult = {
  material_id: string;
  transaction_id: string;
  current_quantity: number;
};

export type MaterialEntryInput = {
  material_name: string;
  quantity: number;
  unit?: string;
  unit_price?: number;
  entry_date?: string;
  notes?: string;
};

const MATERIAL_COLUMNS = 'id, workspace_id, project_id, project_table, contractor_id, material_name, category, unit, current_quantity, unit_price, created_at';

async function resolveScope(scope: WorkerScope) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error('Your session has expired. Please sign in again.');
  if (scope.contractor_id !== userId) throw new Error('Entry scope must belong to the signed-in contractor.');

  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (profileError) throw profileError;
  if (profile?.role !== 'contractor') throw new Error('Field material entries are available only to contractor accounts.');

  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId || workspaceId !== scope.workspace_id) throw new Error('Entry scope must belong to the active workspace.');

  const { data: assignment, error: assignmentError } = await supabase
    .from('project_assignments')
    .select('id')
    .eq('workspace_id', scope.workspace_id)
    .eq('project_id', scope.project_id)
    .eq('project_table', scope.project_table)
    .eq('contractor_id', userId)
    .in('access_status', ['active', 'pilot'])
    .maybeSingle();
  if (assignmentError) throw assignmentError;
  if (!assignment) throw new Error('No active contractor assignment exists for this project.');

  return { ...scope, contractor_id: userId };
}

export async function listContractorMaterials(scope: WorkerScope): Promise<ContractorMaterialRecord[]> {
  const resolved = await resolveScope(scope);
  const { data, error } = await supabase
    .from('materials')
    .select(MATERIAL_COLUMNS)
    .eq('workspace_id', resolved.workspace_id)
    .eq('project_id', resolved.project_id)
    .eq('project_table', resolved.project_table)
    .eq('contractor_id', resolved.contractor_id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as ContractorMaterialRecord[];
}

export async function listContractorStockTransactions(scope: WorkerScope): Promise<ContractorStockTransaction[]> {
  const resolved = await resolveScope(scope);
  const { data, error } = await supabase
    .from('stock_transactions')
    .select('id, material_id, transaction_type, quantity, unit_price, total_amount, transaction_date, done_by, notes')
    .eq('workspace_id', resolved.workspace_id)
    .eq('project_id', resolved.project_id)
    .eq('project_table', resolved.project_table)
    .eq('contractor_id', resolved.contractor_id)
    .eq('transaction_type', 'in')
    .order('transaction_date', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []) as ContractorStockTransaction[];
}

export async function recordMaterialEntry(scope: WorkerScope, input: MaterialEntryInput): Promise<RecordMaterialEntryResult> {
  const resolved = await resolveScope(scope);
  const { data, error } = await supabase.rpc('contractor_record_material_entry', {
    p_workspace_id: resolved.workspace_id,
    p_project_id: resolved.project_id,
    p_project_table: resolved.project_table,
    p_material_name: input.material_name,
    p_quantity: input.quantity,
    p_unit: input.unit ?? '',
    p_unit_price: input.unit_price ?? null,
    p_entry_date: input.entry_date ?? new Date().toISOString().slice(0, 10),
    p_notes: input.notes ?? '',
  });
  if (error) throw error;
  return data as RecordMaterialEntryResult;
}