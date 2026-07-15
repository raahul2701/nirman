import { supabase } from '../lib/supabase';
import { getActiveWorkspaceId } from './businessHierarchyService';
import type { GovProject } from '../types';
export type ProjectOption = {
  id: string;
  table: 'gov_projects' | 'projects';
  label: string;
  code?: string | null;
  contractorName?: string | null;
};

type ProjectOptionAssignment = {
  project_id?: string | null;
  project_table?: string | null;
};

type LegacyProjectOptionRow = {
  id: string;
  name?: string | null;
  code?: string | null;
};

type GovProjectOptionRow = {
  id: string;
  project_name?: string | null;
  project_code?: string | null;
  contractor_name?: string | null;
};

export type ProjectAssignmentAccessStatus = 'active' | 'pilot' | 'paused' | 'locked' | 'completed' | 'archived' | string;

export type ProjectAssignmentAccessRow = {
  id: string;
  workspace_id: string | null;
  project_id: string | null;
  project_table: string | null;
  executive_engineer_id: string | null;
  assistant_engineer_id: string | null;
  junior_engineer_id: string | null;
  contractor_id: string | null;
  contractor_company_name: string | null;
  access_status: ProjectAssignmentAccessStatus | null;
};

type SupabaseErrorLike = {
  message?: string | null;
  code?: string | null;
  status?: number | string;
};

function optionalError(error?: SupabaseErrorLike | null) {
  if (!error) return false;
  const hint = [error.message, error.code, error.status].filter(Boolean).join(' ').toLowerCase();
  return hint.includes('does not exist') || hint.includes('pgrst205') || hint.includes('42703') || String(error.status) === '404';
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

export function isActiveAssignment(status?: string | null) {
  return status === 'active' || status === 'pilot';
}

export async function loadVisibleProjectAssignments(userId: string) {
  const activeWorkspaceId = await getActiveWorkspaceId();
  let query = supabase
    .from('project_assignments')
    .select('id, workspace_id, project_id, project_table, executive_engineer_id, assistant_engineer_id, junior_engineer_id, contractor_id, contractor_company_name, access_status')
    .in('access_status', ['active', 'pilot'])
    .or(`executive_engineer_id.eq.${userId},assistant_engineer_id.eq.${userId},junior_engineer_id.eq.${userId},contractor_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (activeWorkspaceId) {
    query = query.eq('workspace_id', activeWorkspaceId);
  }

  const { data, error } = await query;

  if (error) {
    if (optionalError(error)) return [];
    throw error;
  }

  return ((data || []) as ProjectAssignmentAccessRow[]).filter((assignment) => (
    assignment.project_table === 'gov_projects'
    && Boolean(assignment.project_id)
    && isActiveAssignment(assignment.access_status)
  ));
}

export async function loadVisibleGovProjectIds(userId: string) {
  const assignments = await loadVisibleProjectAssignments(userId);
  return unique(assignments.map((assignment) => assignment.project_id));
}

export async function loadAssignedGovProjects(userId: string) {
  const assignmentIds = await loadVisibleGovProjectIds(userId);
  if (assignmentIds.length === 0) return [];

  const { data, error } = await supabase
    .from('gov_projects')
    .select('id, project_name, project_code, department, contractor_name, contractor_id, engineer_id, je_id, se_id, total_contract_value, start_date, end_date, contract_pdf_url, location, district, state, project_type, status, created_at')
    .in('id', assignmentIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as GovProject[];
}

export async function loadAssignedGovProjectCount(userId: string) {
  const projects = await loadAssignedGovProjects(userId);
  return projects.length;
}

export function filterRowsByAssignedProject<T extends { project_id?: string | null }>(rows: T[], projectIds: string[]) {
  if (projectIds.length === 0) return [];
  const allowed = new Set(projectIds);
  return rows.filter((row) => row.project_id && allowed.has(row.project_id));
}
export async function loadProjectOptionsForAssignments(assignments: ProjectOptionAssignment[]) {
  const govIds = unique(assignments
    .filter((assignment) => (assignment.project_table || 'gov_projects') === 'gov_projects')
    .map((assignment) => assignment.project_id));
  const legacyIds = unique(assignments
    .filter((assignment) => assignment.project_table === 'projects')
    .map((assignment) => assignment.project_id));

  const [govResult, legacyResult] = await Promise.all([
    govIds.length > 0
      ? supabase.from('gov_projects').select('id, project_name, project_code, contractor_name').in('id', govIds)
      : Promise.resolve({ data: [], error: null }),
    legacyIds.length > 0
      ? supabase.from('projects').select('id, name, code').in('id', legacyIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (govResult.error) throw govResult.error;
  if (legacyResult.error) throw legacyResult.error;

  const govOptions = ((govResult.data || []) as GovProjectOptionRow[]).map((project) => ({
    id: project.id,
    table: 'gov_projects' as const,
    label: project.project_name || project.project_code || project.id,
    code: project.project_code || null,
    contractorName: project.contractor_name || null,
  }));

  const legacyOptions = ((legacyResult.data || []) as LegacyProjectOptionRow[]).map((project) => ({
    id: project.id,
    table: 'projects' as const,
    label: project.name || project.code || project.id,
    code: project.code || null,
    contractorName: null,
  }));

  const optionsByKey = new Map<string, ProjectOption>();
  [...govOptions, ...legacyOptions].forEach((project) => {
    optionsByKey.set(`${project.table}:${project.id}`, project);
  });

  return assignments
    .map((assignment) => optionsByKey.get(`${assignment.project_table || 'gov_projects'}:${assignment.project_id}`))
    .filter(Boolean) as ProjectOption[];
}