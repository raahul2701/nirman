import {
  Activity,
  AlertTriangle,
  Camera,
  FileBarChart,
  FileText,
  FileX,
  IndianRupee,
  MessageSquare,
  Package,
  Truck,
  TrendingUp,
  Upload,
  Users,
} from '../../lib/icons';
import { StatCard } from '../ui/Card';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { useToast } from '../ui/useToast';
import { getContractorDashboardData, type ContractorKpis } from './contractorDashboardService';
import type { DashboardProject } from './dashboard';
import { DashboardCard } from './DashboardCard';
import { EmptyState } from './EmptyState';
import { QuickActions, type DashboardAction } from './QuickActions';
import { InsightsList } from './InsightsList';
import { RecentActivityList } from './RecentActivityList';
import { NotificationPanel } from './NotificationPanel';
import { ProgressGraph } from './ProgressGraph';
import { ProjectTimeline } from './ProjectTimeline';
import { formatCurrency } from '../../lib/utils';

const contractorActions: DashboardAction[] = [
  { label: 'Upload DPR', to: '/field/daily-progress', icon: <Upload size={16} /> },
  { label: 'Site Photos', to: '/field/daily-progress', icon: <Camera size={16} /> },
  { label: 'Material Request', to: '/finance/material-advance', icon: <Package size={16} /> },
  { label: 'RA Bill Status', to: '/finance/ra-bills', icon: <FileBarChart size={16} /> },
  { label: 'Labour Attendance', to: '/field/labour', icon: <Users size={16} /> },
  { label: 'Machinery Log', to: '/field/equipment', icon: <Truck size={16} /> },
  { label: 'Hindrance Register', to: '/delays/hindrance', icon: <FileX size={16} /> },
  { label: 'AI Assistant', to: '/projects/agreement-boq', icon: <MessageSquare size={16} /> },
];

function withProjectContext(actions: DashboardAction[], project?: DashboardProject | null) {
  if (!project) return actions;
  const params = new URLSearchParams({ projectId: project.id, projectTable: project.projectTable });
  if (project.workspaceId) params.set('workspaceId', project.workspaceId);
  return actions.map((action) => ({ ...action, to: `${action.to}?${params.toString()}` }));
}

function displayPercent(value: ContractorKpis[keyof ContractorKpis]) {
  return typeof value === 'number' ? `${value}%` : value;
}

function projectDetailPath(project: DashboardProject) {
  return project.projectTable === 'gov_projects' ? `/govtrack/projects/${project.id}` : `/projects/details?projectId=${project.id}&projectTable=projects`;
}

export function ContractorDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const userId = user?.id;
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [kpis, setKpis] = useState<ContractorKpis | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      if (!userId) {
        setProjects([]);
        setKpis(null);
        setError('No authenticated user found.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await getContractorDashboardData(userId);
        setProjects(result.projects);
        setKpis(result.kpis);
        setWarnings(result.warnings);
        setSelectedProjectId((current) => result.projects.some((project) => project.id === current) ? current : result.projects[0]?.id || '');
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Could not fetch contractor dashboard data.';
        setError(message);
        setProjects([]);
        setKpis(null);
        setWarnings([]);
        toast(message, 'error');
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [toast, userId]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || projects[0] || null,
    [projects, selectedProjectId],
  );
  const contextualActions = useMemo(() => withProjectContext(contractorActions, selectedProject), [selectedProject]);
  const activityItems = warnings.length > 0
    ? warnings.slice(0, 4)
    : ['No recent activity feed is available for assigned contractor projects.'];

  if (!loading && error) {
    return <EmptyState title="Contractor dashboard unavailable" description={error} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-lg border border-[#EFE8D4] bg-[#F9F7EF] p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6C7568]">Assigned Projects</p>
          <h2 className="mt-1 text-lg font-black text-[#12332D]">{selectedProject?.name || 'No assigned project selected'}</h2>
          <p className="text-xs text-[#6C7568]">
            {selectedProject ? `${selectedProject.code} - ${selectedProject.projectTable}` : 'Projects appear here only after an active assignment exists.'}
          </p>
        </div>
        {projects.length > 1 && (
          <select
            className="rounded-lg border border-[#D8B15A]/40 bg-white px-3 py-2 text-sm font-semibold text-[#12332D]"
            value={selectedProject?.id || ''}
            onChange={(event) => setSelectedProjectId(event.target.value)}
          >
            {projects.map((project) => <option key={`${project.projectTable}:${project.id}`} value={project.id}>{project.code} - {project.name}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Contract Value" value={kpis ? formatCurrency(kpis.totalContractValue) : 'Not available'} icon={<IndianRupee size={18} />} color="#C89B3C" loading={loading} />
        <StatCard label="Work Completed" value={kpis ? displayPercent(kpis.workCompletedPercent) : 'Not available'} icon={<TrendingUp size={18} />} color="#0B8B7D" loading={loading} />
        <StatCard label="Running Bills" value={kpis?.runningBills ?? 'Not available'} icon={<FileText size={18} />} color="#2F6B9A" loading={loading} />
        <StatCard label="Pending Approvals" value={kpis?.pendingApprovals ?? 'Not available'} icon={<AlertTriangle size={18} />} color="#B42318" loading={loading} />
        <StatCard label="Material Pending" value={kpis?.materialPending ?? 'Not available'} icon={<Package size={18} />} color="#C89B3C" loading={loading} />
        <StatCard label="Today's Progress" value={kpis?.todaysProgress ?? 'Not available'} icon={<Activity size={18} />} color="#005F56" loading={loading} />
      </div>

      {!loading && projects.length === 0 ? (
        <EmptyState title="No assigned contractor projects" description="Only active project_assignments rows for this contractor are shown here." />
      ) : (
        <>
          {warnings.length > 0 && (
            <DashboardCard title="Partial Data Notice" subtitle="The dashboard loaded assigned projects, but some secondary data sources were unavailable.">
              <RecentActivityList items={warnings.slice(0, 3)} />
            </DashboardCard>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <DashboardCard title="Quick Actions" subtitle="Actions carry the selected assignment-backed project context where supported.">
                {projects.length > 0 || loading ? <QuickActions actions={contextualActions} /> : <EmptyState description="No projects assigned. Actions will appear here once assigned." />}
              </DashboardCard>
              <DashboardCard title="Assigned Projects" subtitle="Only projects visible through project_assignments are listed.">
                <ProjectTimeline projects={projects} />
              </DashboardCard>
            </div>
            <div className="space-y-6">
              <DashboardCard title="Selected Project">
                {selectedProject ? (
                  <div className="space-y-3 text-sm text-[#12332D]">
                    <p><span className="font-bold">Code:</span> {selectedProject.code}</p>
                    <p><span className="font-bold">Progress:</span> {selectedProject.progress}%</p>
                    <p><span className="font-bold">Contract value:</span> {formatCurrency(selectedProject.budget)}</p>
                    <Link className="inline-flex rounded-lg bg-[#005F56] px-3 py-2 text-xs font-bold text-white" to={projectDetailPath(selectedProject)}>Open project</Link>
                  </div>
                ) : <EmptyState description="Select an assigned project to view details." />}
              </DashboardCard>
              <DashboardCard title="Recent Activity"><RecentActivityList items={activityItems} /></DashboardCard>
              <DashboardCard title="Notification Panel"><NotificationPanel /></DashboardCard>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DashboardCard title="Progress Summary"><ProgressGraph projects={projects} /></DashboardCard>
            <DashboardCard title="Billing / Payment Status">
              <InsightsList items={['Payment counts use payment_requests where available. Material and daily progress metrics are marked unavailable until dedicated backend records are present.']} />
            </DashboardCard>
          </div>
        </>
      )}
    </div>
  );
}
