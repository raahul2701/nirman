import { memo, useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react';
import {
  FolderOpen,
  AlertTriangle,
  Users,
  Package,
  Plane,
  Brain,
  Plus,
  ChevronRight,
  Activity,
  CheckCircle2,
  ShieldCheck,
  RadioTower
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { StatCard } from '../components/ui/Card';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';
import { useNavigate } from 'react-router-dom';
import { Problem } from '../types';
import { formatDistanceToNow, CATEGORY_LABELS } from '../lib/utils';
import { DashboardSectionSkeleton } from '../components/dashboard/DashboardSectionSkeleton';
import { BRANDING } from '../constants/branding';
import { RoleBasedDashboard } from '../components/dashboard/RoleBasedDashboard';
import { getDashboardRole } from '../services/executionDemoData';

const ChartsSection = lazy(() => import('../components/dashboard/ChartsSection').then((mod) => ({ default: mod.ChartsSection })));
const MaterialChart = lazy(() => import('../components/dashboard/MaterialChart').then((mod) => ({ default: mod.MaterialChart })));
const OperationalIntelligenceWidgets = lazy(() => import('../components/dashboard/OperationalIntelligenceWidgets').then((mod) => ({ default: mod.OperationalIntelligenceWidgets })));

const QUICK_ACTIONS = [
  { label: 'Report Problem', icon: AlertTriangle, color: '#B42318', to: '/problems' },
  { label: 'Add Worker', icon: Users, color: '#0B8B7D', to: '/workers' },
  { label: 'Drone Survey', icon: Plane, color: '#2F6B9A', to: '/surveys' },
  { label: 'AI Design', icon: Brain, color: '#C89B3C', to: '/design' },
  { label: 'Inventory', icon: Package, color: '#C89B3C', to: '/inventory' },
] as const;

type ProblemRowProps = {
  problem: Problem;
  onOpen: () => void;
};

type MaterialStockRow = {
  current_qty?: number | null;
  threshold_qty?: number | null;
};

const ProblemRow = memo(function ProblemRow({ problem, onOpen }: ProblemRowProps) {
  return (
    <div
      onClick={onOpen}
      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-[#005F56]/5 transition-all"
      style={{ background: '#F9F7EF', border: '1px solid #EFE8D4' }}
    >
      <div
        className="w-1.5 h-8 rounded-full flex-shrink-0"
        style={{
          background:
            problem.severity === 'critical'
              ? '#B42318'
              : problem.severity === 'high'
              ? '#C89B3C'
              : problem.severity === 'medium'
              ? '#C89B3C'
              : '#0B8B7D',
        }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[#12332D] text-xs font-medium truncate">{problem.title || CATEGORY_LABELS[problem.category]}</p>
        <p className="text-[#6C7568] text-[10px] mt-0.5">{problem.problem_code} · {formatDistanceToNow(problem.created_at)}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <SeverityBadge severity={problem.severity} />
        <StatusBadge status={problem.status} />
      </div>
    </div>
  );
});

export function DashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ activeProjects: 0, openIssues: 0, workersPresent: 0, lowStockAlerts: 0, surveysCompleted: 0 });
  const [recentProblems, setRecentProblems] = useState<Problem[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const dashboardRole = getDashboardRole(profile?.role);
  const dashboardTitle = dashboardRole === 'executive_engineer'
    ? 'Executive Engineer Project Command Center'
    : dashboardRole === 'assistant_engineer'
      ? 'AE Monitoring Command Center'
      : dashboardRole === 'junior_engineer'
        ? 'JE Mobile Field Dashboard'
        : dashboardRole === 'contractor'
          ? 'Contractor Project & Billing Dashboard'
          : 'National Infra Operations Command Center';

  const onViewProblems = useCallback(() => navigate('/problems'), [navigate]);

  const recentProblemItems = useMemo(
    () => recentProblems.map((problem) => (
      <ProblemRow key={problem.id} problem={problem} onOpen={onViewProblems} />
    )),
    [recentProblems, onViewProblems]
  );

  useEffect(() => {
    if (!user) {
      setLoadingStats(false);
      return;
    }

    const currentUserId = user.id;
    let isActive = true;

    async function loadDashboard() {
      const [proj, probs, workers, materials, surveys] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact' }).eq('owner_id', currentUserId).eq('status', 'active'),
        supabase.from('problems').select('id', { count: 'exact' }).eq('reported_by', currentUserId).eq('status', 'open'),
        supabase.from('workers').select('id', { count: 'exact' }).eq('owner_id', currentUserId).eq('status', 'active'),
        supabase.from('materials').select('id, current_qty, threshold_qty').eq('owner_id', currentUserId),
        supabase.from('surveys').select('id', { count: 'exact' }).eq('owner_id', currentUserId).eq('status', 'complete'),
      ]);

      if (!isActive) return;

      const lowStock = ((materials.data || []) as MaterialStockRow[]).filter(
        (m) => Number(m.current_qty || 0) <= Number(m.threshold_qty || 0)
      ).length;
      setStats({
        activeProjects: proj.count || 0,
        openIssues: probs.count || 0,
        workersPresent: workers.count || 0,
        lowStockAlerts: lowStock,
        surveysCompleted: surveys.count || 0,
      });

      const { data: recentData } = await supabase
        .from('problems')
        .select('*')
        .eq('reported_by', currentUserId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (isActive && recentData) {
        setRecentProblems(recentData as Problem[]);
      }

      if (isActive) {
        setLoadingStats(false);
      }
    }

    loadDashboard();
    return () => {
      isActive = false;
    };
  }, [user]);

  const actionButtons = useMemo(
    () => QUICK_ACTIONS.map((action) => (
      <button
        key={action.label}
        onClick={() => navigate(action.to)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:shadow-enterprise"
        style={{ background: `${action.color}12`, border: `1px solid ${action.color}28`, color: action.color }}
      >
        <action.icon size={13} />
        {action.label}
      </button>
    )),
    [navigate]
  );

  return (
    <AppLayout title={dashboardTitle} subtitle={`ARSPL role-based command view for ${profile?.full_name?.split(' ')[0] || 'Builder'}`}>
      <div className="mb-6 rounded-lg p-5 shadow-command" style={{ background: 'linear-gradient(135deg, #FFFFFF 0%, #F7F5EF 100%)', border: '1px solid var(--border-strong)' }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <img src={BRANDING.LOGO_MARK_PATH} alt="ARSPL" className="h-14 w-14 rounded-lg bg-white object-contain p-1" style={{ border: '1px solid var(--border)' }} />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: '#6B5A1E' }}>{BRANDING.EXECUTIVE_LABEL}</p>
              <h2 className="mt-1 text-2xl font-black text-[#12332D]">{dashboardTitle}</h2>
              <p className="mt-1 text-sm text-[#6C7568]">Role-aware project access, component progress, submissions, and billing readiness.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Ops', value: 'Live', icon: RadioTower },
              { label: 'AI', value: 'Ready', icon: Brain },
              { label: 'Control', value: 'Secure', icon: ShieldCheck },
            ].map((item) => (
              <div key={item.label} className="rounded-lg px-4 py-3" style={{ background: 'rgba(0,95,86,0.06)', border: '1px solid rgba(0,95,86,0.12)' }}>
                <item.icon size={16} className="mx-auto text-[#005F56]" />
                <p className="mt-1 text-sm font-bold text-[#12332D]">{item.value}</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-[#6C7568]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <RoleBasedDashboard role={profile?.role} />

      <div className="my-6 h-px bg-[#EFE8D4]" />

      <div className="flex flex-wrap gap-2 mb-6">{actionButtons}</div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <StatCard label="Active Projects" value={stats.activeProjects} icon={<FolderOpen size={18} />} loading={loadingStats} color="#005F56" />
        <StatCard label="Open Issues" value={stats.openIssues} icon={<AlertTriangle size={18} />} loading={loadingStats} color="#B42318" />
        <StatCard label="Active Workers" value={stats.workersPresent} icon={<Users size={18} />} loading={loadingStats} color="#0B8B7D" />
        <StatCard label="Low Stock Items" value={stats.lowStockAlerts} icon={<Package size={18} />} loading={loadingStats} color="#C89B3C" />
        <StatCard label="Surveys Done" value={stats.surveysCompleted} icon={<Plane size={18} />} loading={loadingStats} color="#2F6B9A" />
      </div>

      <Suspense fallback={<DashboardSectionSkeleton />}>
        <OperationalIntelligenceWidgets />
      </Suspense>

      <Suspense fallback={<DashboardSectionSkeleton />}>
        <ChartsSection />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Suspense fallback={<DashboardSectionSkeleton />}>
          <MaterialChart />
        </Suspense>

        <div className="rounded-lg p-5 shadow-enterprise" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[#12332D] font-semibold text-sm">Recent Problems</h3>
              <p className="text-[#6C7568] text-xs mt-0.5">Latest reported issues</p>
            </div>
            <Button size="sm" variant="ghost" icon={<ChevronRight size={13} />} onClick={() => navigate('/problems')}>
              View all
            </Button>
          </div>
          {recentProblems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 size={32} className="text-[#CDBD82] mb-2" />
              <p className="text-[#6C7568] text-sm">No problems reported yet</p>
              <Button size="sm" variant="primary" className="mt-3" icon={<Plus size={13} />} onClick={() => navigate('/problems')}>
                Report First Issue
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentProblemItems}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg p-5 shadow-enterprise" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[#12332D] font-semibold text-sm">Project Progress</h3>
            <p className="text-[#6C7568] text-xs mt-0.5">Active construction projects</p>
          </div>
          <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => navigate('/projects')}>
            New Project
          </Button>
        </div>
        {stats.activeProjects === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FolderOpen size={32} className="text-[#CDBD82] mb-2" />
            <p className="text-[#6C7568] text-sm">No active projects</p>
            <Button size="sm" variant="primary" className="mt-3" icon={<Plus size={13} />} onClick={() => navigate('/projects')}>
              Create Project
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#F9F7EF', border: '1px solid #EFE8D4' }}>
            <Activity size={16} className="text-[#005F56]" />
            <p className="text-[#6C7568] text-sm">{stats.activeProjects} active project{stats.activeProjects !== 1 ? 's' : ''} — visit the Projects page for details</p>
            <Button size="sm" variant="ghost" icon={<ChevronRight size={13} />} onClick={() => navigate('/projects')} className="ml-auto">View</Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
