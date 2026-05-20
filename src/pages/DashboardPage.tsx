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
  CheckCircle2
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

const ChartsSection = lazy(() => import('../components/dashboard/ChartsSection').then((mod) => ({ default: mod.ChartsSection })));
const MaterialChart = lazy(() => import('../components/dashboard/MaterialChart').then((mod) => ({ default: mod.MaterialChart })));
const OperationalIntelligenceWidgets = lazy(() => import('../components/dashboard/OperationalIntelligenceWidgets').then((mod) => ({ default: mod.OperationalIntelligenceWidgets })));

const QUICK_ACTIONS = [
  { label: 'Report Problem', icon: AlertTriangle, color: '#ef4444', to: '/problems' },
  { label: 'Add Worker', icon: Users, color: '#00D4AA', to: '/workers' },
  { label: 'Drone Survey', icon: Plane, color: '#3B82F6', to: '/surveys' },
  { label: 'AI Design', icon: Brain, color: '#FF6B00', to: '/design' },
  { label: 'Inventory', icon: Package, color: '#F59E0B', to: '/inventory' },
] as const;

type ProblemRowProps = {
  problem: Problem;
  onOpen: () => void;
};

const ProblemRow = memo(function ProblemRow({ problem, onOpen }: ProblemRowProps) {
  return (
    <div
      onClick={onOpen}
      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/3 transition-all"
      style={{ background: '#111111' }}
    >
      <div
        className="w-1.5 h-8 rounded-full flex-shrink-0"
        style={{
          background:
            problem.severity === 'critical'
              ? '#ef4444'
              : problem.severity === 'high'
              ? '#f97316'
              : problem.severity === 'medium'
              ? '#eab308'
              : '#22c55e',
        }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-medium truncate">{problem.title || CATEGORY_LABELS[problem.category]}</p>
        <p className="text-[#606060] text-[10px] mt-0.5">{problem.problem_code} · {formatDistanceToNow(problem.created_at)}</p>
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

      const lowStock = (materials.data || []).filter((m: any) => m.current_qty <= m.threshold_qty).length;
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
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white transition-all hover:scale-105"
        style={{ background: `${action.color}15`, border: `1px solid ${action.color}25`, color: action.color }}
      >
        <action.icon size={13} />
        {action.label}
      </button>
    )),
    [navigate]
  );

  return (
    <AppLayout title="Dashboard" subtitle={`Welcome to NIRMAN AI, ${profile?.full_name?.split(' ')[0] || 'Builder'}`}>
      <div className="flex flex-wrap gap-2 mb-6">{actionButtons}</div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <StatCard label="Active Projects" value={stats.activeProjects} icon={<FolderOpen size={18} />} loading={loadingStats} color="#00D4AA" />
        <StatCard label="Open Issues" value={stats.openIssues} icon={<AlertTriangle size={18} />} loading={loadingStats} color="#ef4444" />
        <StatCard label="Active Workers" value={stats.workersPresent} icon={<Users size={18} />} loading={loadingStats} color="#FF6B00" />
        <StatCard label="Low Stock Items" value={stats.lowStockAlerts} icon={<Package size={18} />} loading={loadingStats} color="#F59E0B" />
        <StatCard label="Surveys Done" value={stats.surveysCompleted} icon={<Plane size={18} />} loading={loadingStats} color="#3B82F6" />
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

        <div className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold text-sm">Recent Problems</h3>
              <p className="text-[#606060] text-xs mt-0.5">Latest reported issues</p>
            </div>
            <Button size="sm" variant="ghost" icon={<ChevronRight size={13} />} onClick={() => navigate('/problems')}>
              View all
            </Button>
          </div>
          {recentProblems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 size={32} className="text-[#2A2A2A] mb-2" />
              <p className="text-[#606060] text-sm">No problems reported yet</p>
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

      <div className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold text-sm">Project Progress</h3>
            <p className="text-[#606060] text-xs mt-0.5">Active construction projects</p>
          </div>
          <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => navigate('/projects')}>
            New Project
          </Button>
        </div>
        {stats.activeProjects === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FolderOpen size={32} className="text-[#2A2A2A] mb-2" />
            <p className="text-[#606060] text-sm">No active projects</p>
            <Button size="sm" variant="primary" className="mt-3" icon={<Plus size={13} />} onClick={() => navigate('/projects')}>
              Create Project
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#111111' }}>
            <Activity size={16} className="text-[#FF6B00]" />
            <p className="text-[#A0A0A0] text-sm">{stats.activeProjects} active project{stats.activeProjects !== 1 ? 's' : ''} — visit the Projects page for details</p>
            <Button size="sm" variant="ghost" icon={<ChevronRight size={13} />} onClick={() => navigate('/projects')} className="ml-auto">View</Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
