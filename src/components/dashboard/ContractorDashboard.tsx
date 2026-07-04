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
import { useEffect, useState, useMemo } from 'react';
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

export function ContractorDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const userId = user?.id;
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [kpis, setKpis] = useState<ContractorKpis | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      if (!userId) { setLoading(false); return; }
      setLoading(true);
      try {
        const { projects: loadedProjects, kpis: loadedKpis } = await getContractorDashboardData(userId);
        setProjects(loadedProjects);
        setKpis(loadedKpis);
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Could not fetch project data.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [toast, userId]);

  const activityItems = useMemo(() =>
    projects.length > 0
      ? projects.slice(0, 4).map((p) => `${p.code}: ${p.progress}% physical progress updated`)
      : ['No recent workflow activity for this role.'],
    [projects]
  );

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Contract Value" value={kpis ? formatCurrency(kpis.totalContractValue) : '...'} icon={<IndianRupee size={18} />} color="#C89B3C" loading={loading} />
        <StatCard label="Work Completed" value={kpis ? `${kpis.workCompletedPercent}%` : '...'} icon={<TrendingUp size={18} />} color="#0B8B7D" loading={loading} />
        <StatCard label="Running Bills" value={kpis?.runningBills ?? '--'} icon={<FileText size={18} />} color="#2F6B9A" loading={loading} />
        <StatCard label="Pending Approvals" value={kpis?.pendingApprovals ?? '--'} icon={<AlertTriangle size={18} />} color="#B42318" loading={loading} />
        <StatCard label="Material Pending" value={kpis?.materialPending ?? '--'} icon={<Package size={18} />} color="#C89B3C" loading={loading} />
        <StatCard label="Today's Progress" value={typeof kpis?.todaysProgress === 'number' ? `${kpis.todaysProgress}%` : (kpis?.todaysProgress ?? '--')} icon={<Activity size={18} />} color="#005F56" loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DashboardCard title="Quick Actions" subtitle="Submit progress, raise requests, and manage site activities.">
            {projects.length > 0 || loading ? (
              <QuickActions actions={contractorActions} />
            ) : (
              <EmptyState description="No projects assigned. Actions will appear here once assigned." />
            )}
          </DashboardCard>
          <DashboardCard title="AI Insights" subtitle="Gemini-backed prompts use BOQ, progress, and material context.">
            <InsightsList items={['No AI insights available yet.']} />
          </DashboardCard>
        </div>
        <div className="space-y-6">
          <DashboardCard title="Recent Activities"><RecentActivityList items={activityItems} /></DashboardCard>
          <DashboardCard title="Notification Panel"><NotificationPanel /></DashboardCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardCard title="Progress Chart"><ProgressGraph projects={projects} /></DashboardCard>
        <DashboardCard title="Project Timeline"><ProjectTimeline projects={projects} /></DashboardCard>
      </div>
    </div>
  );
}
