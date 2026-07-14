import {
  AlertTriangle,
  Calendar,
  Camera,
  ClipboardCheck,
  FileBarChart,
  FileText,
  FileX,
  FolderOpen,
  IndianRupee,
  MessageSquare,
  Package,
  ScanLine,
  Shield,
  TrendingUp,
  Truck,
} from '../../lib/icons';
import { StatCard } from '../ui/Card';
import { getDashboardRole, type DashboardIdentity } from '../../services/executionDemoData';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { loadAssignedDashboardProjects } from './dashboardService';
import type { DashboardProject } from './dashboard';
import { DashboardCard } from './DashboardCard';
import { DashboardSectionSkeleton } from './DashboardSectionSkeleton';
import { EmptyState } from './EmptyState';
import { QuickActions, type DashboardAction } from './QuickActions';
import { InsightsList } from './InsightsList';
import { RecentActivityList } from './RecentActivityList';
import { ProgressGraph } from './ProgressGraph';
import { ProjectTimeline } from './ProjectTimeline';

const ContractorDashboard = lazy(() => import('./ContractorDashboard').then((mod) => ({ default: mod.ContractorDashboard })));

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function averageProgress(projects: DashboardProject[]) {
  if (projects.length === 0) return 'Not available';
  const progressValues = projects.map((project) => project.progress).filter((value): value is number => value != null && Number.isFinite(value));
  if (progressValues.length === 0) return 'Not available';
  return `${Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)}%`;
}

function totalContractValue(projects: DashboardProject[]) {
  return projects.reduce((sum, project) => sum + Number(project.budget || 0), 0);
}

function withProjectContext(actions: DashboardAction[], project?: DashboardProject | null) {
  if (!project) return actions;
  const params = new URLSearchParams({ projectId: project.id, projectTable: project.projectTable });
  if (project.workspaceId) params.set('workspaceId', project.workspaceId);
  return actions.map((action) => ({ ...action, to: `${action.to}?${params.toString()}` }));
}

const JE_ACTIONS: DashboardAction[] = [
  { label: 'Daily Progress', to: '/field/daily-progress', icon: <ClipboardCheck size={16} /> },
  { label: 'Survey & Quantity', to: '/field/survey-quantity', icon: <ScanLine size={16} /> },
  { label: 'Labour', to: '/field/labour', icon: <FileText size={16} /> },
  { label: 'Material', to: '/field/materials', icon: <Package size={16} /> },
  { label: 'Equipment', to: '/field/equipment', icon: <Truck size={16} /> },
  { label: 'Diesel', to: '/diesel', icon: <Truck size={16} /> },
  { label: 'Photos', to: '/field/daily-progress', icon: <Camera size={16} /> },
  { label: 'Inspection', to: '/quality/inspections', icon: <Shield size={16} /> },
  { label: 'Reports', to: '/reports/physical-progress', icon: <FileBarChart size={16} /> },
];

const AE_ACTIONS: DashboardAction[] = [
  { label: 'JE Submissions', to: '/quality/inspections', icon: <ClipboardCheck size={16} /> },
  { label: 'MB Review', to: '/field/survey-quantity', icon: <ScanLine size={16} /> },
  { label: 'BOQ Variation', to: '/projects/agreement-boq', icon: <FileText size={16} /> },
  { label: 'Drawing Review', to: '/quality/drawing-compare', icon: <FileBarChart size={16} /> },
  { label: 'Extension Requests', to: '/delays/extensions', icon: <MessageSquare size={16} /> },
  { label: 'RA Bills', to: '/finance/ra-bills', icon: <IndianRupee size={16} /> },
];

const EE_ACTIONS: DashboardAction[] = [
  { label: 'Division Dashboard', to: '/dashboard', icon: <FolderOpen size={16} /> },
  { label: 'Financial Progress', to: '/reports/financial-progress', icon: <IndianRupee size={16} /> },
  { label: 'Physical Progress', to: '/reports/physical-progress', icon: <TrendingUp size={16} /> },
  { label: 'Risk Dashboard', to: '/operations', icon: <AlertTriangle size={16} /> },
  { label: 'Tender Status', to: '/tender-lifecycle', icon: <FileText size={16} /> },
  { label: 'DLP Tracker', to: '/delays/dlp', icon: <FileX size={16} /> },
];

type DashboardRole = ReturnType<typeof getDashboardRole>;

type LoadState = 'loading' | 'loaded' | 'empty' | 'error';

export function RoleBasedDashboard({ role, identity }: { role?: string | null; identity?: DashboardIdentity }) {
  const dashboardRole = getDashboardRole(role);

  if (dashboardRole === 'contractor') {
    return (
      <Suspense fallback={<DashboardSectionSkeleton />}>
        <ContractorDashboard />
      </Suspense>
    );
  }

  return <AssignedRoleDashboard role={role} identity={identity} dashboardRole={dashboardRole} />;
}

function AssignedRoleDashboard({ role, identity, dashboardRole }: { role?: string | null; identity?: DashboardIdentity; dashboardRole: DashboardRole }) {
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const identityUserId = identity?.userId;
  const identityFullName = identity?.fullName;
  const identityCompany = identity?.company;

  useEffect(() => {
    let active = true;
    setState('loading');
    setError(null);
    loadAssignedDashboardProjects(role, { userId: identityUserId, fullName: identityFullName, company: identityCompany })
      .then((loadedProjects) => {
        if (!active) return;
        setProjects(loadedProjects);
        setState(loadedProjects.length > 0 ? 'loaded' : 'empty');
        setSelectedProjectId((current) => loadedProjects.some((project) => project.id === current) ? current : loadedProjects[0]?.id || '');
      })
      .catch((loadError) => {
        if (!active) return;
        console.warn('[dashboard] assignment-backed dashboard unavailable', loadError);
        setProjects([]);
        setState('error');
        setError(loadError instanceof Error ? loadError.message : 'Dashboard data could not be loaded.');
      });
    return () => {
      active = false;
    };
  }, [identityCompany, identityFullName, identityUserId, role]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || projects[0] || null,
    [projects, selectedProjectId],
  );
  const actions = useMemo(() => {
    if (dashboardRole === 'junior_engineer') return withProjectContext(JE_ACTIONS, selectedProject);
    if (dashboardRole === 'assistant_engineer') return withProjectContext(AE_ACTIONS, selectedProject);
    return withProjectContext(EE_ACTIONS, selectedProject);
  }, [dashboardRole, selectedProject]);
  const totalValue = totalContractValue(projects);
  const avgProgress = averageProgress(projects);
  const roleLabel = dashboardRole === 'junior_engineer'
    ? 'Junior Engineer'
    : dashboardRole === 'assistant_engineer'
      ? 'Assistant Engineer'
      : dashboardRole === 'admin'
        ? 'Admin Viewer'
        : 'Executive Engineer';
  const sourceNote = state === 'loading'
    ? 'Resolving assignment-backed project context...'
    : state === 'error'
      ? error || 'Dashboard data could not be loaded.'
      : state === 'empty'
        ? 'No active project_assignments row was found for this role.'
        : 'Loaded from active workspace and project_assignments.';

  if (dashboardRole === 'junior_engineer') {
    return (
      <div className="space-y-5">
        <JEDashboardHeader
          projects={projects}
          selectedProject={selectedProject}
          selectedProjectId={selectedProjectId}
          onProjectChange={setSelectedProjectId}
          roleLabel={roleLabel}
          loading={state === 'loading'}
        />
        <p className="text-xs text-[#6C7568]">{sourceNote}</p>
        {state === 'error' && <EmptyState title="JE dashboard unavailable" description={sourceNote} />}
        {state === 'empty' && <EmptyState title="No JE assigned projects" description="Ask the EE/Admin to add this user to an active project_assignments.junior_engineer_id row." />}
        {state !== 'error' && state !== 'empty' && (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Assigned Projects" value={projects.length} icon={<FolderOpen size={18} />} color="#005F56" loading={state === 'loading'} />
              <StatCard label="Selected Progress" value={selectedProject?.progress == null ? 'Not available' : `${Math.round(selectedProject.progress)}%`} icon={<TrendingUp size={18} />} color="#0B8B7D" loading={state === 'loading'} />
              <StatCard label="Contract Value" value={selectedProject ? formatMoney(selectedProject.budget) : 'Not available'} icon={<IndianRupee size={18} />} color="#C89B3C" loading={state === 'loading'} />
              <StatCard label="Pending MB" value="Not available" icon={<ScanLine size={18} />} color="#B42318" loading={state === 'loading'} />
            </div>
            <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
              <DashboardCard title="Quick Actions" subtitle="Routes are existing app routes and include selected project context.">
                <QuickActions actions={actions} />
              </DashboardCard>
              <DashboardCard title="Project Status" subtitle={selectedProject ? `${selectedProject.code} - ${selectedProject.projectTable}` : 'No selected project'}>
                {selectedProject ? (
                  <div className="space-y-3 text-sm text-[#12332D]">
                    <p><span className="font-bold">Project:</span> {selectedProject.name}</p>
                    <p><span className="font-bold">Progress:</span> {selectedProject.progress == null ? 'Not available' : `${Math.round(selectedProject.progress)}%`}</p>
                    <p><span className="font-bold">Contract value:</span> {formatMoney(selectedProject.budget)}</p>
                    <p><span className="font-bold">Assignment role:</span> {selectedProject.assignmentRole || 'junior_engineer'}</p>
                  </div>
                ) : <EmptyState description="Select an assigned project to view status." />}
              </DashboardCard>
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              <DashboardCard title="Today's Work"><EmptyState description="No DPR/task table is currently wired for a verified today work queue." /></DashboardCard>
              <DashboardCard title="Pending Actions"><EmptyState description="No workflow action count is available for this selected project yet." /></DashboardCard>
              <DashboardCard title="Assigned Projects"><ProgressGraph projects={projects} /></DashboardCard>
              <DashboardCard title="Recent Activity"><RecentActivityList items={['No verified activity feed is available for this JE dashboard yet.']} /></DashboardCard>
              <DashboardCard title="Site Conditions"><EmptyState description="Weather and site condition logs are unavailable for this project context." /></DashboardCard>
              <DashboardCard title="AI Recommendations"><InsightsList items={['No Gemini-backed project recommendation record is available for the selected project yet.']} /></DashboardCard>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-[#6C7568]">{sourceNote}</p>
      {state === 'error' && <EmptyState title={`${roleLabel} dashboard unavailable`} description={sourceNote} />}
      {state === 'empty' && <EmptyState title="No assigned projects" description="No active assignment-backed project context is available for this role." />}
      {state !== 'error' && state !== 'empty' && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard label="Assigned Projects" value={projects.length} icon={<FolderOpen size={18} />} color="#005F56" loading={state === 'loading'} />
            <StatCard label="Total Contract Value" value={formatMoney(totalValue)} icon={<IndianRupee size={18} />} color="#C89B3C" loading={state === 'loading'} />
            <StatCard label="Average Progress" value={avgProgress} icon={<TrendingUp size={18} />} color="#0B8B7D" loading={state === 'loading'} />
            <StatCard label="Open Workflow Items" value="Not available" icon={<ClipboardCheck size={18} />} color="#2F6B9A" loading={state === 'loading'} />
          </div>
          <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
            <DashboardCard title={`${roleLabel} Actions`} subtitle="Existing app routes with selected project context when a project is selected.">
              <QuickActions actions={actions} />
            </DashboardCard>
            <DashboardCard title="Data Availability">
              <InsightsList items={['Assignment-backed projects and contract values are loaded from database rows; progress is shown only when a verified project or component progress source exists. Workflow, site condition, and AI recommendation counts remain unavailable until backend records are wired.']} />
            </DashboardCard>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <DashboardCard title="Progress"><ProgressGraph projects={projects} /></DashboardCard>
            <DashboardCard title="Assigned Projects"><ProjectTimeline projects={projects} /></DashboardCard>
          </div>
        </>
      )}
    </div>
  );
}

function JEDashboardHeader({
  projects,
  selectedProject,
  selectedProjectId,
  onProjectChange,
  roleLabel,
  loading,
}: {
  projects: DashboardProject[];
  selectedProject: DashboardProject | null;
  selectedProjectId: string;
  onProjectChange: (projectId: string) => void;
  roleLabel: string;
  loading: boolean;
}) {
  const today = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[#EFE8D4] bg-[#F9F7EF] p-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6C7568]">JE Field Execution Command Center</p>
        <h2 className="mt-1 text-lg font-black text-[#12332D]">{loading ? 'Loading project context...' : selectedProject?.name || 'No assigned project selected'}</h2>
        <p className="text-xs text-[#6C7568]">
          {selectedProject ? `${selectedProject.code} - ${selectedProject.projectTable} - ${roleLabel}` : `${roleLabel} - ${today}`}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 rounded-lg border border-[#D8B15A]/30 bg-white px-3 py-2 text-xs font-bold text-[#12332D]">
          <Calendar size={14} />
          {today}
        </div>
        {projects.length > 1 && (
          <select
            className="rounded-lg border border-[#D8B15A]/40 bg-white px-3 py-2 text-sm font-semibold text-[#12332D]"
            value={selectedProjectId}
            onChange={(event) => onProjectChange(event.target.value)}
          >
            {projects.map((project) => <option key={`${project.projectTable}:${project.id}`} value={project.id}>{project.code} - {project.name}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}
