import {
  AlertTriangle,
  Brain,
  Calendar,
  Camera,
  ClipboardCheck,
  Clock,
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
import { getDashboardRole, getRoleProjects, type DashboardIdentity } from '../../services/executionDemoData';
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

const ContractorDashboard = lazy(() => import('./ContractorDashboard').then((mod) => ({ default: mod.ContractorDashboard })));

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

type WorkflowLane = {
  label: string;
  count: string | number;
  tone: string;
};

function compactNumber(value: number) {
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function averageProgress(projects: DashboardProject[]) {
  if (projects.length === 0) return 0;
  return Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length);
}

function WorkflowStatusPanel({ lanes }: { lanes: WorkflowLane[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {lanes.map((lane) => (
        <div key={lane.label} className="rounded-lg border border-[#EFE8D4] bg-[#F9F7EF] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6C7568]">{lane.label}</p>
          <p className="mt-2 text-2xl font-black text-[#12332D]">{lane.count}</p>
          <div className="mt-3 h-1.5 rounded-full bg-[#EFE8D4]">
            <div className="h-1.5 rounded-full" style={{ width: '68%', background: lane.tone }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const JE_ACTIONS: DashboardAction[] = [
  { label: 'Verify DPR', to: '/quality/inspections', icon: <ClipboardCheck size={16} /> },
  { label: 'Measurement Book', to: '/field/survey-quantity', icon: <ScanLine size={16} /> },
  { label: 'Material Verification', to: '/quality/material-tests', icon: <Package size={16} /> },
  { label: 'Photo Verification', to: '/field/daily-progress', icon: <Camera size={16} /> },
  { label: 'Raise NCR', to: '/problems', icon: <AlertTriangle size={16} /> },
  { label: 'Safety Checklist', to: '/quality/inspections', icon: <Shield size={16} /> },
];

const AE_ACTIONS: DashboardAction[] = [
  { label: 'JE Submissions', to: '/quality/inspections', icon: <ClipboardCheck size={16} /> },
  { label: 'MB Approval', to: '/field/survey-quantity', icon: <ScanLine size={16} /> },
  { label: 'BOQ Variation', to: '/projects/agreement-boq', icon: <FileText size={16} /> },
  { label: 'Drawing Approval', to: '/quality/drawing-compare', icon: <FileBarChart size={16} /> },
  { label: 'Extension Requests', to: '/delays/extensions', icon: <MessageSquare size={16} /> },
  { label: 'RA Bill Verification', to: '/finance/ra-bills', icon: <IndianRupee size={16} /> },
];

const EE_ACTIONS: DashboardAction[] = [
  { label: 'Division Dashboard', to: '/dashboard', icon: <FolderOpen size={16} /> },
  { label: 'Financial Progress', to: '/reports/financial-progress', icon: <IndianRupee size={16} /> },
  { label: 'Physical Progress', to: '/reports/physical-progress', icon: <TrendingUp size={16} /> },
  { label: 'Risk Dashboard', to: '/operations', icon: <AlertTriangle size={16} /> },
  { label: 'Tender Status', to: '/tender-lifecycle', icon: <FileText size={16} /> },
  { label: 'DLP Tracker', to: '/delays/dlp', icon: <FileX size={16} /> },
];

const JE_INSIGHTS = [
  'Compare DPR quantities with MB entries before marking progress verified.',
  'Flag photo submissions without GPS metadata for return or re-upload.',
  'Material verification should be closed before quantity approval.',
];

const AE_INSIGHTS = [
  'Variation recommendation requires BOQ and agreement clause review.',
  'Delayed projects should be checked for hindrance and extension linkage.',
  'RA bill verification should reconcile approved MB quantities only.',
];

const EE_INSIGHTS = [
  'Delay prediction should prioritize projects with low progress and pending inspections.',
  'Cost overrun watchlist uses progress variance, open issues, and RA bill readiness.',
  'Contractor ranking should combine quality score, resubmissions, and payment cycle time.',
];

type DashboardMetrics = {
  totalContractValue: number;
  completedValue: number;
  avgProgress: number;
  pendingInspections: number;
  openIssues: number;
  materialPending: number;
  activityItems: string[];
  approvalLanes: WorkflowLane[];
};

function getDashboardMetrics(projects: DashboardProject[]): DashboardMetrics {
  const totalContractValue = projects.reduce((sum, project) => sum + project.budget, 0);
  const completedValue = projects.reduce((sum, project) => sum + project.budget * (project.progress / 100), 0);
  const avgProgress = averageProgress(projects);
  const pendingInspections = projects.reduce((sum, project) => sum + project.pendingInspections, 0);
  const openIssues = projects.reduce((sum, project) => sum + project.issues, 0);
  const materialPending = Math.max(1, projects.length + Math.ceil(openIssues / 2));
  const activityItems = projects.length > 0
    ? projects.slice(0, 4).map((project) => `${project.code}: ${project.progress}% physical progress updated`)
    : ['No recent workflow activity for this role.'];

  return {
    totalContractValue,
    completedValue,
    avgProgress,
    pendingInspections,
    openIssues,
    materialPending,
    activityItems,
    approvalLanes: [
      { label: 'Pending', count: Math.max(0, projects.length + pendingInspections), tone: '#C89B3C' },
      { label: 'Approved', count: Math.max(0, projects.length * 2), tone: '#005F56' },
      { label: 'Returned', count: Math.max(0, openIssues), tone: '#B42318' },
      { label: 'Resubmitted', count: Math.max(0, Math.ceil(openIssues / 2)), tone: '#2F6B9A' },
    ],
  };
}

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

function AssignedRoleDashboard({ role, identity, dashboardRole }: { role?: string | null; identity?: DashboardIdentity; dashboardRole: ReturnType<typeof getDashboardRole> }) {
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
  const {
    totalContractValue,
    completedValue,
    avgProgress, 
    pendingInspections,
    openIssues,
    materialPending,
    activityItems,
    approvalLanes,
  } = useMemo(() => getDashboardMetrics(assignedProjects), [assignedProjects]);

  if (dashboardRole === 'junior_engineer') {
    return (
      <div className="space-y-5">
        <p className="text-xs text-[#6C7568]">{loading ? 'Resolving role allocation...' : sourceNote}</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Pending Inspections" value={pendingInspections || assignedProjects.length} icon={<ClipboardCheck size={18} />} color="#005F56" loading={loading} />
          <StatCard label="Today's Site Visits" value={Math.max(1, Math.min(assignedProjects.length, 4))} icon={<Calendar size={18} />} color="#0B8B7D" />
          <StatCard label="Pending MB" value={Math.max(1, assignedProjects.length + openIssues)} icon={<ScanLine size={18} />} color="#C89B3C" />
          <StatCard label="Material Checks" value={materialPending} icon={<Package size={18} />} color="#B42318" />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <DashboardCard title="Pending Verification Queue" subtitle="DPR, quantities, site inspection, material checks, and safety actions.">
            <QuickActions actions={JE_ACTIONS} />
          </DashboardCard>
          <DashboardCard title="AI Recommendations">
            <InsightsList items={JE_INSIGHTS} />
          </DashboardCard>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <DashboardCard title="Recent Contractor Uploads"><RecentActivityList items={activityItems} /></DashboardCard>
          <DashboardCard title="Inspection Calendar"><WorkflowStatusPanel lanes={approvalLanes} /></DashboardCard>
          <DashboardCard title="Assigned Projects"><ProgressGraph projects={assignedProjects} /></DashboardCard>
        </div>
      </div>
    );
  }

  if (dashboardRole === 'assistant_engineer') {
    return (
      <div className="space-y-5">
        <p className="text-xs text-[#6C7568]">{loading ? 'Resolving role allocation...' : sourceNote}</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <StatCard label="Pending JE Approvals" value={approvalLanes[0].count} icon={<FileText size={18} />} color="#005F56" loading={loading} />
          <StatCard label="Delayed Projects" value={openIssues} icon={<AlertTriangle size={18} />} color="#B42318" />
          <StatCard label="Budget Variance" value={`${Math.max(0, 100 - avgProgress)}%`} icon={<IndianRupee size={18} />} color="#C89B3C" />
          <StatCard label="Quality Score" value={`${Math.max(70, 98 - openIssues * 3)}%`} icon={<Shield size={18} />} color="#0B8B7D" />
          <StatCard label="Material Consumption" value={`${Math.min(100, avgProgress + 8)}%`} icon={<Package size={18} />} color="#2F6B9A" />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <DashboardCard title="Pending Approvals" subtitle="Technical approval queue for MB, BOQ variation, materials, drawings, extensions, and RA bills.">
            <QuickActions actions={AE_ACTIONS} />
          </DashboardCard>
          <DashboardCard title="Technical Alerts">
            <InsightsList items={AE_INSIGHTS} />
          </DashboardCard>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <DashboardCard title="Charts"><ProgressGraph projects={assignedProjects} /></DashboardCard>
          <DashboardCard title="Workflow Status"><WorkflowStatusPanel lanes={approvalLanes} /></DashboardCard>
          <DashboardCard title="Workload Summary"><RecentActivityList items={activityItems} /></DashboardCard>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-[#6C7568]">{loading ? 'Resolving role allocation...' : sourceNote}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <StatCard label="Total Works" value={assignedProjects.length} icon={<FolderOpen size={18} />} color="#005F56" loading={loading} />
        <StatCard label="Cost Overrun" value={`${Math.max(0, 100 - avgProgress)}%`} icon={<IndianRupee size={18} />} color="#B42318" />
        <StatCard label="Time Overrun" value={openIssues} icon={<Clock size={18} />} color="#C89B3C" />
        <StatCard label="Red Flag Projects" value={openIssues} icon={<AlertTriangle size={18} />} color="#B42318" />
        <StatCard label="AI Recommendations" value={Math.max(1, assignedProjects.length)} icon={<Brain size={18} />} color="#2F6B9A" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <DashboardCard title="Executive Summary" subtitle={`Budget under command: ${formatMoney(totalContractValue)}. Completed value: ${formatMoney(completedValue)}.`}>
          <QuickActions actions={EE_ACTIONS} />
        </DashboardCard>
        <DashboardCard title="AI Alerts">
          <InsightsList items={EE_INSIGHTS} />
        </DashboardCard>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <DashboardCard title="Financial Charts"><ProgressGraph projects={assignedProjects} /></DashboardCard>
        <DashboardCard title="Risk Heat Map">
          <WorkflowStatusPanel lanes={[
            { label: 'Low', count: Math.max(0, assignedProjects.length - openIssues), tone: '#005F56' },
            { label: 'Medium', count: Math.max(0, pendingInspections), tone: '#C89B3C' },
            { label: 'High', count: openIssues, tone: '#B42318' },
            { label: 'Predicted Delay', count: `${Math.max(0, 100 - avgProgress)}%`, tone: '#2F6B9A' },
          ]} />
        </DashboardCard>
        <DashboardCard title="Project Ranking">
          <div className="space-y-2">
            {[...assignedProjects].sort((a, b) => b.progress - a.progress).slice(0, 5).map((project, index) => (
              <div key={project.id} className="flex items-center gap-3 rounded-lg border border-[#EFE8D4] bg-[#F9F7EF] p-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#005F56]/10 text-xs font-black text-[#005F56]">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[#12332D]">{project.name}</p>
                  <p className="text-[10px] text-[#6C7568]">{compactNumber(project.budget)} contract value</p>
                </div>
                <span className="text-xs font-bold text-[#12332D]">{project.progress}%</span>
              </div>
            ))}
            {assignedProjects.length === 0 && !loading && <EmptyState description="No division-wide project ranking available." />}
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
