import { supabase } from '../../lib/supabase';
import { getMyWorkspaceSummary, type ProjectAssignment } from '../../services/businessHierarchyService';
import { getDashboardRole, type DashboardIdentity } from '../../services/executionDemoData';
import { ProjectCategory, type ComponentProgress, type DashboardProject } from './dashboard';

type ProjectRow = {
  id: string;
  table: 'projects' | 'gov_projects';
  name?: string;
  project_name?: string;

  project_code?: string;
  budget?: number;
  total_contract_value?: number;
  progress_percent?: number | null;
  project_type?: string;
};

const PROJECTS_SELECT = 'id,name,project_name,project_code,budget,progress_percent,status';
const GOV_PROJECTS_SELECT = 'id,project_name,project_code,total_contract_value,project_type,status';

type ComponentRow = {
  project_id: string;
  component_type: string;
  component_name: string;
  planned_quantity: number;
  executed_quantity: number;
  unit: string;
  progress_percent: number;
};

function normalizeProjectRow(row?: ProjectRow | null): Omit<DashboardProject, 'id' | 'projectTable' | 'workspaceId' | 'assignmentRole' | 'aeId' | 'ae' | 'jeId' | 'je' | 'contractorId' | 'contractor' | 'issues' | 'pendingInspections' | 'components'> {
  return {
    name: row?.project_name || row?.name || 'Assigned Project',
    code: row?.project_code || 'PROJECT',
    budget: Number(row?.total_contract_value ?? row?.budget ?? 0),
    progress: row?.table === 'projects' && row?.progress_percent != null ? Number(row.progress_percent) : null,
    category: (row?.project_type as ProjectCategory) || ProjectCategory.OTHER,
  };
}

function getAssignmentRoleForUser(assignment: ProjectAssignment, userId: string, dashboardRole: ReturnType<typeof getDashboardRole>) {
  if (dashboardRole === 'executive_engineer' && assignment.executive_engineer_id === userId) return 'executive_engineer';
  if (dashboardRole === 'assistant_engineer' && assignment.assistant_engineer_id === userId) return 'assistant_engineer';
  if (dashboardRole === 'junior_engineer' && assignment.junior_engineer_id === userId) return 'junior_engineer';
  if (dashboardRole === 'contractor' && assignment.contractor_id === userId) return 'contractor';
  if (dashboardRole === 'admin') return 'admin_viewer';
  return null;
}

function normalizeProjectTable(projectTable?: string | null): 'projects' | 'gov_projects' | null {
  if (!projectTable || projectTable === 'gov_projects') return 'gov_projects';
  if (projectTable === 'projects') return 'projects';
  return null;
}

export async function loadAssignedDashboardProjects(role?: string | null, identity: DashboardIdentity = {}) {
  const dashboardRole = getDashboardRole(role);
  const summary = await getMyWorkspaceSummary();
  if (!identity.userId || !summary.workspace || summary.projects.length === 0) return [];

  const currentUserId = identity.userId || '';
  const assignments = summary.projects.filter((assignment) => {
    if (!assignment.project_id || !normalizeProjectTable(assignment.project_table)) return false;
    if (assignment.access_status !== 'active' && assignment.access_status !== 'pilot') return false;
    if (dashboardRole === 'executive_engineer') return assignment.executive_engineer_id === currentUserId || summary.workspace?.executive_engineer_id === currentUserId;
    if (dashboardRole === 'admin') return summary.members.some((member) => member.user_id === currentUserId && member.active);
    if (dashboardRole === 'assistant_engineer') return assignment.assistant_engineer_id === currentUserId;
    if (dashboardRole === 'junior_engineer') return assignment.junior_engineer_id === currentUserId;
    if (dashboardRole === 'contractor') return assignment.contractor_id === currentUserId;
    return true;
  });

  if (assignments.length === 0) return [];

  const legacyIds = assignments.filter((assignment) => normalizeProjectTable(assignment.project_table) === 'projects').map((assignment) => assignment.project_id);
  const govIds = assignments.filter((assignment) => normalizeProjectTable(assignment.project_table) === 'gov_projects').map((assignment) => assignment.project_id);

  const [legacyProjects, govProjects, componentResult] = await Promise.all([
    legacyIds.length > 0 ? supabase.from('projects').select(PROJECTS_SELECT).in('id', legacyIds) : Promise.resolve({ data: [], error: null }),
    govIds.length > 0 ? supabase.from('gov_projects').select(GOV_PROJECTS_SELECT).in('id', govIds) : Promise.resolve({ data: [], error: null }),
    supabase
      .from('project_components')
      .select('project_id,component_type,component_name,planned_quantity,executed_quantity,unit,progress_percent')
      .eq('workspace_id', summary.workspace.id)
      .in('project_id', assignments.map((assignment) => assignment.project_id)),
  ]);

  const failedProjectTables = new Set<'projects' | 'gov_projects'>();
  const projectLoadErrors: string[] = [];

  if (legacyProjects.error) {
    failedProjectTables.add('projects');
    projectLoadErrors.push(`projects: ${legacyProjects.error.message}`);
    console.warn('[dashboard] projects query failed', legacyProjects.error);
  }

  if (govProjects.error) {
    failedProjectTables.add('gov_projects');
    projectLoadErrors.push(`gov_projects: ${govProjects.error.message}`);
    console.warn('[dashboard] gov_projects query failed', govProjects.error);
  }

  if (
    (legacyIds.length === 0 || failedProjectTables.has('projects'))
    && (govIds.length === 0 || failedProjectTables.has('gov_projects'))
    && projectLoadErrors.length > 0
  ) {
    throw new Error(`Dashboard project loading failed for ${projectLoadErrors.join('; ')}`);
  }

  if (componentResult.error) {
    console.warn('[dashboard] component progress query failed', componentResult.error);
  }

  const rows = new Map<string, ProjectRow>();
  (!legacyProjects.error ? ((legacyProjects.data || []) as Omit<ProjectRow, 'table'>[]) : []).forEach((project) => rows.set(project.id, { ...project, table: 'projects' }));
  (!govProjects.error ? ((govProjects.data || []) as Omit<ProjectRow, 'table'>[]) : []).forEach((project) => rows.set(project.id, { ...project, table: 'gov_projects' }));
  const componentsByProject = new Map<string, ComponentRow[]>();
  (!componentResult.error ? ((componentResult.data || []) as ComponentRow[]) : []).forEach((component) => {
    const list = componentsByProject.get(component.project_id) || [];
    list.push(component);
    componentsByProject.set(component.project_id, list);
  });

  return assignments.filter((assignment) => {
    const projectTable = normalizeProjectTable(assignment.project_table) || 'gov_projects';
    return !failedProjectTables.has(projectTable);
  }).map((assignment: ProjectAssignment): DashboardProject => {
    const projectTable = normalizeProjectTable(assignment.project_table) || 'gov_projects';
    const projectRow = rows.get(assignment.project_id);
    const baseProject = projectRow ? normalizeProjectRow(projectRow) : { name: 'Project record unavailable', code: assignment.project_id.slice(0, 8), budget: 0, progress: null, category: ProjectCategory.OTHER };
    const components = componentsByProject.get(assignment.project_id);
    const componentProgress = components && components.length > 0
      ? components.reduce((total, component) => total + Number(component.progress_percent || 0), 0) / components.length
      : baseProject.progress;
    const project = { ...baseProject, progress: componentProgress };
    return {
      id: assignment.project_id,
      projectTable,
      workspaceId: assignment.workspace_id,
      assignmentRole: getAssignmentRoleForUser(assignment, currentUserId, dashboardRole),
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
        : [{ id: `${assignment.project_id}-default`, name: 'Progress', progress: project.progress, plannedQty: 0, executedQty: 0, unit: 'unit' }],
    };
  });
}
