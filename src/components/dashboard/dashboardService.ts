import { supabase } from '../../lib/supabase';
import { getMyWorkspaceSummary, type ProjectAssignment } from '../../services/businessHierarchyService';
import { getDashboardRole, type DashboardIdentity } from '../../services/executionDemoData';
import { ProjectCategory, type ComponentProgress, type DashboardProject } from './dashboard';

type ProjectRow = {
  id: string;
  name?: string;
  project_name?: string;
  code?: string;
  project_code?: string;
  budget?: number;
  total_contract_value?: number;
  progress_percent?: number;
  project_type?: string;
};

type ComponentRow = {
  project_id: string;
  component_type: string;
  component_name: string;
  planned_quantity: number;
  executed_quantity: number;
  unit: string;
  progress_percent: number;
};

function normalizeProjectRow(row?: ProjectRow | null): Omit<DashboardProject, 'id' | 'aeId' | 'ae' | 'jeId' | 'je' | 'contractorId' | 'contractor' | 'issues' | 'pendingInspections' | 'components'> {
  return {
    name: row?.project_name || row?.name || 'Assigned Project',
    code: row?.project_code || row?.code || 'PROJECT',
    budget: Number(row?.total_contract_value ?? row?.budget ?? 0),
    progress: Number(row?.progress_percent ?? 0),
    category: (row?.project_type as ProjectCategory) || ProjectCategory.OTHER,
  };
}

export async function loadAssignedDashboardProjects(role?: string | null, identity: DashboardIdentity = {}) {
  const dashboardRole = getDashboardRole(role);
  const summary = await getMyWorkspaceSummary();
  if (!identity.userId || !summary.workspace || summary.projects.length === 0) return [];

  const currentUserId = identity.userId || '';
  const assignments = summary.projects.filter((assignment) => {
    if (assignment.access_status !== 'active' && assignment.access_status !== 'pilot') return false;
    if (dashboardRole === 'executive_engineer') return assignment.executive_engineer_id === currentUserId || summary.workspace?.executive_engineer_id === currentUserId;
    if (dashboardRole === 'admin') return summary.members.some((member) => member.user_id === currentUserId && member.active);
    if (dashboardRole === 'assistant_engineer') return assignment.assistant_engineer_id === currentUserId;
    if (dashboardRole === 'junior_engineer') return assignment.junior_engineer_id === currentUserId;
    if (dashboardRole === 'contractor') return assignment.contractor_id === currentUserId;
    return true;
  });

  if (assignments.length === 0) return [];

  const legacyIds = assignments.filter((assignment) => assignment.project_table !== 'gov_projects').map((assignment) => assignment.project_id);
  const govIds = assignments.filter((assignment) => assignment.project_table === 'gov_projects').map((assignment) => assignment.project_id);

  const [legacyProjects, govProjects, componentResult] = await Promise.all([
    legacyIds.length > 0 ? supabase.from('projects').select('id,name,budget,progress_percent,status').in('id', legacyIds) : Promise.resolve({ data: [], error: null }),
    govIds.length > 0 ? supabase.from('gov_projects').select('id,project_name,project_code,total_contract_value,progress_percent,project_type,status').in('id', govIds) : Promise.resolve({ data: [], error: null }),
    supabase
      .from('project_components')
      .select('project_id,component_type,component_name,planned_quantity,executed_quantity,unit,progress_percent')
      .eq('workspace_id', summary.workspace.id)
      .in('project_id', assignments.map((assignment) => assignment.project_id)),
  ]);

  if (legacyProjects.error) throw legacyProjects.error;
  if (govProjects.error) throw govProjects.error;
  if (componentResult.error) throw componentResult.error;

  const rows = new Map<string, ProjectRow>();
  ((legacyProjects.data || []) as ProjectRow[]).forEach((project) => rows.set(project.id, project));
  ((govProjects.data || []) as ProjectRow[]).forEach((project) => rows.set(project.id, project));
  const componentsByProject = new Map<string, ComponentRow[]>();
  ((componentResult.data || []) as ComponentRow[]).forEach((component) => {
    const list = componentsByProject.get(component.project_id) || [];
    list.push(component);
    componentsByProject.set(component.project_id, list);
  });

  return assignments.map((assignment: ProjectAssignment): DashboardProject => {
    const project = normalizeProjectRow(rows.get(assignment.project_id));
    const components = componentsByProject.get(assignment.project_id);
    return {
      id: assignment.project_id,
      ...project,
      aeId: assignment.assistant_engineer_id || '',
      ae: 'Assistant Engineer',
      jeId: assignment.junior_engineer_id || '',
      je: 'Junior Engineer',
      contractorId: assignment.contractor_id || '',
      contractor: assignment.contractor_company_name || 'Contractor',
      issues: 0,
      pendingInspections: 0,
      components: components && components.length > 0
        ? components.map((c): ComponentProgress => ({ id: `${assignment.project_id}-${c.component_name}`, name: c.component_name, progress: Number(c.progress_percent || 0), plannedQty: Number(c.planned_quantity || 0), executedQty: Number(c.executed_quantity || 0), unit: c.unit || 'unit' }))
        : [{ id: `${assignment.project_id}-default`, name: 'Earthwork', progress: project.progress, plannedQty: 0, executedQty: 0, unit: 'unit' }],
    };
  });
}
