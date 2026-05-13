import { useEffect, useState } from 'react';
import {
  FolderOpen, AlertTriangle, Users, Package, Plane, Brain,
  TrendingUp, Plus, ChevronRight, Activity, Clock, CheckCircle2
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AppLayout } from '../components/layout/AppLayout';
import { StatCard } from '../components/ui/Card';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Problem } from '../types';
import { formatDistanceToNow, CATEGORY_LABELS } from '../lib/utils';

const CHART_COLORS = ['#FF6B00', '#00D4AA', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

const materialData = [
  { name: 'Cement', used: 420, total: 600 },
  { name: 'Steel', used: 280, total: 400 },
  { name: 'Sand', used: 190, total: 300 },
  { name: 'Bricks', used: 350, total: 500 },
  { name: 'Tiles', used: 120, total: 200 },
];

const progressData = [
  { week: 'W1', resolved: 4, reported: 7 },
  { week: 'W2', resolved: 8, reported: 10 },
  { week: 'W3', resolved: 12, reported: 13 },
  { week: 'W4', resolved: 15, reported: 16 },
  { week: 'W5', resolved: 11, reported: 12 },
  { week: 'W6', resolved: 18, reported: 19 },
];

const categoryData = [
  { name: 'Structural', value: 32 },
  { name: 'Safety', value: 24 },
  { name: 'Equipment', value: 18 },
  { name: 'Material', value: 14 },
  { name: 'Other', value: 12 },
];

export function DashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ activeProjects: 0, openIssues: 0, workersPresent: 0, lowStockAlerts: 0, surveysCompleted: 0 });
  const [recentProblems, setRecentProblems] = useState<Problem[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [proj, probs, workers, materials, surveys] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact' }).eq('owner_id', user!.id).eq('status', 'active'),
        supabase.from('problems').select('id', { count: 'exact' }).eq('reported_by', user!.id).eq('status', 'open'),
        supabase.from('workers').select('id', { count: 'exact' }).eq('owner_id', user!.id).eq('status', 'active'),
        supabase.from('materials').select('id, current_qty, threshold_qty').eq('owner_id', user!.id),
        supabase.from('surveys').select('id', { count: 'exact' }).eq('owner_id', user!.id).eq('status', 'complete'),
      ]);
      const lowStock = (materials.data || []).filter(m => m.current_qty <= m.threshold_qty).length;
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
        .eq('reported_by', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (recentData) setRecentProblems(recentData as Problem[]);
      setLoadingStats(false);
    }
    load();
  }, [user]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <AppLayout title="Dashboard" subtitle={`Welcome to NIRMAN AI, ${profile?.full_name?.split(' ')[0] || 'Builder'}`}>
      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { label: 'Report Problem', icon: AlertTriangle, color: '#ef4444', to: '/problems' },
          { label: 'Add Worker', icon: Users, color: '#00D4AA', to: '/workers' },
          { label: 'Drone Survey', icon: Plane, color: '#3B82F6', to: '/surveys' },
          { label: 'AI Design', icon: Brain, color: '#FF6B00', to: '/design' },
          { label: 'Inventory', icon: Package, color: '#F59E0B', to: '/inventory' },
        ].map(a => (
          <button
            key={a.label}
            onClick={() => navigate(a.to)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white transition-all hover:scale-105"
            style={{ background: `${a.color}15`, border: `1px solid ${a.color}25`, color: a.color }}
          >
            <a.icon size={13} />
            {a.label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <StatCard label="Active Projects" value={stats.activeProjects} icon={<FolderOpen size={18} />} loading={loadingStats} color="#00D4AA" />
        <StatCard label="Open Issues" value={stats.openIssues} icon={<AlertTriangle size={18} />} loading={loadingStats} color="#ef4444" />
        <StatCard label="Active Workers" value={stats.workersPresent} icon={<Users size={18} />} loading={loadingStats} color="#FF6B00" />
        <StatCard label="Low Stock Items" value={stats.lowStockAlerts} icon={<Package size={18} />} loading={loadingStats} color="#F59E0B" />
        <StatCard label="Surveys Done" value={stats.surveysCompleted} icon={<Plane size={18} />} loading={loadingStats} color="#3B82F6" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Issue timeline */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold text-sm">Issue Resolution Timeline</h3>
              <p className="text-[#606060] text-xs mt-0.5">Reported vs Resolved weekly</p>
            </div>
            <TrendingUp size={16} className="text-[#00D4AA]" />
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={progressData}>
              <XAxis dataKey="week" tick={{ fill: '#606060', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#606060', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1F1F1F', border: '1px solid #333', borderRadius: '8px', fontSize: '11px', color: '#fff' }} />
              <Line type="monotone" dataKey="reported" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} name="Reported" />
              <Line type="monotone" dataKey="resolved" stroke="#00D4AA" strokeWidth={2} dot={{ r: 3, fill: '#00D4AA' }} name="Resolved" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category pie */}
        <div className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
          <div className="mb-4">
            <h3 className="text-white font-semibold text-sm">Problem Categories</h3>
            <p className="text-[#606060] text-xs mt-0.5">Distribution by type</p>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={3}>
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1F1F1F', border: '1px solid #333', borderRadius: '8px', fontSize: '11px', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1 mt-2">
            {categoryData.slice(0, 4).map((c, i) => (
              <div key={c.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i] }} />
                <span className="text-[10px] text-[#606060]">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Material consumption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold text-sm">Material Consumption</h3>
              <p className="text-[#606060] text-xs mt-0.5">Used vs Total (demo data)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={materialData} barSize={14}>
              <XAxis dataKey="name" tick={{ fill: '#606060', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#606060', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1F1F1F', border: '1px solid #333', borderRadius: '8px', fontSize: '11px', color: '#fff' }} />
              <Bar dataKey="total" fill="#2A2A2A" radius={[4, 4, 0, 0]} name="Total" />
              <Bar dataKey="used" fill="#FF6B00" radius={[4, 4, 0, 0]} name="Used" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent activity */}
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
              {recentProblems.map(p => (
                <div
                  key={p.id}
                  onClick={() => navigate('/problems')}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/3 transition-all"
                  style={{ background: '#111111' }}
                >
                  <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{
                    background: p.severity === 'critical' ? '#ef4444' : p.severity === 'high' ? '#f97316' : p.severity === 'medium' ? '#eab308' : '#22c55e'
                  }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{p.title || CATEGORY_LABELS[p.category]}</p>
                    <p className="text-[#606060] text-[10px] mt-0.5">{p.problem_code} · {formatDistanceToNow(p.created_at)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <SeverityBadge severity={p.severity} />
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Projects progress */}
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
