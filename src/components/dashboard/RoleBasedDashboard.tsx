import { AlertTriangle, ClipboardCheck, FileText, FolderOpen, IndianRupee, Package, Users } from '../../lib/icons';
import { Card, StatCard } from '../ui/Card';
import { executionProjects, getDashboardRole, getRoleProjects, materialAdvanceDemo, type DashboardIdentity } from '../../services/executionDemoData';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getMyWorkspaceSummary, type ProjectAssignment } from '../../services/businessHierarchyService';

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-[#EFE8D4]">
      <div className="h-2 rounded-full bg-[#005F56]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function ProjectCard({ project }: { project: (typeof executionProjects)[number] }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6C7568]">{project.code}</p>
          <h3 className="mt-1 text-sm font-bold text-[#12332D]">{project.name}</h3>
          <p className="mt-1 text-xs text-[#6C7568]">{project.ae} / {project.je}</p>
        </div>
        <span className="rounded-md bg-[#005F56]/10 px-2 py-1 text-xs font-bold text-[#005F56]">{project.progress}%</span>
      </div>
      <div className="mt-4 space-y-3">
        {project.components.map((component) => (
          <div key={`${project.id}-${component.name}`}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-[#12332D]">{component.name}</span>
              <span className="text-[#6C7568]">{component.progress}%</span>
            </div>
            <ProgressBar value={component.progress} />
          </div>
        ))}
      </div>
    </Card>
  );
}

type DashboardProject = (typeof executionProjects)[number];

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

function normalizeProjectRow(row?: ProjectRow | null) {
  return {
    name: row?.project_name || row?.name || 'Assigned Project',
    code: row?.project_code || row?.code || 'PROJECT',
    budget: Number(row?.total_contract_value ?? row?.budget ?? 0),
    progress: Number(row?.progress_percent ?? 0),
    category: String(row?.project_type || 'road') as DashboardProject['category'],
  };
}

async function loadAssignedDashboardProjects(role?: string | null, identity: DashboardIdentity = {}) {
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

  return assignments.map((assignment: ProjectAssignment) => {
    const project = normalizeProjectRow(rows.get(assignment.project_id));
    const components = componentsByProject.get(assignment.project_id);
    return {
      id: assignment.project_id,
      name: project.name,
      code: project.code,
      category: project.category,
      aeId: assignment.assistant_engineer_id || '',
      ae: 'Assistant Engineer',
      jeId: assignment.junior_engineer_id || '',
      je: 'Junior Engineer',
      contractorId: assignment.contractor_id || '',
      contractor: assignment.contractor_company_name || 'Contractor',
      progress: project.progress,
      budget: project.budget,
      issues: 0,
      pendingInspections: 0,
      components: components && components.length > 0
        ? components.map((component) => ({
            name: component.component_name as DashboardProject['components'][number]['name'],
            progress: Number(component.progress_percent || 0),
            plannedQty: Number(component.planned_quantity || 0),
            executedQty: Number(component.executed_quantity || 0),
            unit: component.unit || 'unit',
          }))
        : [{ name: 'Earthwork', progress: project.progress, plannedQty: 0, executedQty: 0, unit: 'unit' }],
    } satisfies DashboardProject;
  });
}

export function RoleBasedDashboard({ role, identity }: { role?: string | null; identity?: DashboardIdentity }) {
  const dashboardRole = getDashboardRole(role);
  const [dbProjects, setDbProjects] = useState<DashboardProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'database' | 'demo' | 'empty'>('empty');
  const identityUserId = identity?.userId;
  const identityFullName = identity?.fullName;
  const identityCompany = identity?.company;

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadAssignedDashboardProjects(role, { userId: identityUserId, fullName: identityFullName, company: identityCompany })
      .then((projects) => {
        if (!active) return;
        setDbProjects(projects);
        setSource(projects.length > 0 ? 'database' : identityUserId ? 'empty' : 'demo');
      })
      .catch((error) => {
        if (!active) return;
        console.warn('[dashboard] database role allocation unavailable, using demo fallback', error);
        setDbProjects([]);
        setSource(identityUserId ? 'empty' : 'demo');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [identityCompany, identityFullName, identityUserId, role]);

  const assignedProjects = useMemo(
    () => {
      if (dbProjects.length > 0) return dbProjects;
      if (source === 'demo') return getRoleProjects(role, { userId: identityUserId, fullName: identityFullName, company: identityCompany });
      return [];
    },
    [dbProjects, identityCompany, identityFullName, identityUserId, role, source]
  );

  const sourceNote = source === 'database'
    ? 'Loaded from workspace and project assignment tables.'
    : source === 'demo'
      ? 'Demo fallback shown because no signed-in user context was available.'
      : 'No active workspace/project assignment was found for this role.';

  if (dashboardRole === 'contractor') {
    const totalSubmitted = materialAdvanceDemo.reduce((sum, item) => sum + item.submittedValue, 0);
    const possibleBilling = assignedProjects.reduce((sum, project) => sum + project.budget * (project.progress / 100), 0);
    return (
      <div className="space-y-5">
        <p className="text-xs text-[#6C7568]">{loading ? 'Resolving role allocation...' : sourceNote}</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard label="Assigned Projects" value={assignedProjects.length} icon={<FolderOpen size={18} />} color="#005F56" />
          <StatCard label="Possible Billing" value={formatMoney(possibleBilling)} icon={<IndianRupee size={18} />} color="#C89B3C" />
          <StatCard label="Material Advance" value={formatMoney(totalSubmitted)} icon={<Package size={18} />} color="#0B8B7D" />
          <StatCard label="Pending Payment" value={formatMoney(420000)} icon={<ClipboardCheck size={18} />} color="#B42318" />
        </div>
        <Card>
          <h3 className="text-sm font-bold text-[#12332D]">Contractor Dashboard</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {assignedProjects.map((project) => (
              <div key={project.id} className="rounded-lg border border-[#EFE8D4] bg-[#F9F7EF] p-4">
                <p className="text-sm font-bold text-[#12332D]">{project.name}</p>
                <p className="mt-1 text-xs text-[#6C7568]">Agreement summary, BOQ reading, executed and remaining quantities linked.</p>
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                  <span>Executed: {project.progress}%</span>
                  <span>RA bill: under review</span>
                  <span>Milestone: WMM</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (dashboardRole === 'junior_engineer') {
    return (
      <div className="space-y-5">
        <p className="text-xs text-[#6C7568]">{loading ? 'Resolving role allocation...' : sourceNote}</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Daily Progress" value="86%" icon={<ClipboardCheck size={18} />} color="#005F56" />
          <StatCard label="Labour" value="42" icon={<Users size={18} />} color="#0B8B7D" />
          <StatCard label="Materials" value="5" icon={<Package size={18} />} color="#C89B3C" />
          <StatCard label="Issues" value="3" icon={<AlertTriangle size={18} />} color="#B42318" />
        </div>
        <Card>
          <h3 className="text-sm font-bold text-[#12332D]">JE Field Dashboard</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {['Site photos', 'Measurements', 'Inspection entries', 'Equipment log'].map((item) => (
              <div key={item} className="rounded-lg border border-[#EFE8D4] bg-[#F9F7EF] p-4 text-sm font-semibold text-[#12332D]">{item}</div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (dashboardRole === 'assistant_engineer') {
    return (
      <div className="space-y-5">
        <p className="text-xs text-[#6C7568]">{loading ? 'Resolving role allocation...' : sourceNote}</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <StatCard label="Assigned Projects" value={assignedProjects.length} icon={<FolderOpen size={18} />} color="#005F56" />
          <StatCard label="JE Submissions" value="18" icon={<FileText size={18} />} color="#0B8B7D" />
          <StatCard label="Contractor Submissions" value="7" icon={<ClipboardCheck size={18} />} color="#C89B3C" />
          <StatCard label="Pending Inspections" value="3" icon={<AlertTriangle size={18} />} color="#B42318" />
          <StatCard label="Progress Issues" value="4" icon={<AlertTriangle size={18} />} color="#2F6B9A" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">{assignedProjects.map((project) => <ProjectCard key={project.id} project={project} />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-[#6C7568]">{loading ? 'Resolving role allocation...' : sourceNote}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Workspace Projects" value={assignedProjects.length} icon={<FolderOpen size={18} />} color="#005F56" />
        <StatCard label="Open Issues" value={assignedProjects.reduce((sum, project) => sum + project.issues, 0)} icon={<AlertTriangle size={18} />} color="#B42318" />
        <StatCard label="Pending Inspections" value={assignedProjects.reduce((sum, project) => sum + project.pendingInspections, 0)} icon={<ClipboardCheck size={18} />} color="#C89B3C" />
        <StatCard label="Budget Under Command" value={formatMoney(assignedProjects.reduce((sum, project) => sum + project.budget, 0))} icon={<IndianRupee size={18} />} color="#0B8B7D" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{assignedProjects.map((project) => <ProjectCard key={project.id} project={project} />)}</div>
    </div>
  );
}
