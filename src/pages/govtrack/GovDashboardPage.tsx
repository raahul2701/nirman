import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Landmark, FolderOpen, IndianRupee, AlertTriangle, Clock,
  TrendingUp, ChevronRight, Shield, BarChart2
} from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AppLayout } from '../../components/layout/AppLayout';
import { StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import { GovProject, PaymentRequest } from '../../types';

const paymentTimeline = [
  { month: 'Jan', amount: 24 }, { month: 'Feb', amount: 18 },
  { month: 'Mar', amount: 32 }, { month: 'Apr', amount: 28 },
  { month: 'May', amount: 35 }, { month: 'Jun', amount: 22 },
];

const riskDistribution = [
  { name: 'Safe', value: 12, color: '#22c55e' },
  { name: 'Low', value: 8, color: '#eab308' },
  { name: 'Medium', value: 5, color: '#f97316' },
  { name: 'High', value: 2, color: '#ef4444' },
];

export function GovDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<GovProject[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [projRes, payRes] = await Promise.all([
      supabase.from('gov_projects').select('*').or(`owner_id.eq.${user.id},contractor_id.eq.${user.id},engineer_id.eq.${user.id}`).order('created_at', { ascending: false }),
      supabase.from('payment_requests').select('*').eq('final_status', 'pending').order('created_at', { ascending: false }),
    ]);
    if (projRes.data) setProjects(projRes.data as GovProject[]);
    if (payRes.data) setPendingPayments(payRes.data as PaymentRequest[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeProjects = projects.filter(p => p.status === 'active');
  const totalContractValue = projects.reduce((s, p) => s + p.total_contract_value, 0);
  const pendingAmount = pendingPayments.reduce((s, p) => s + p.claimed_amount, 0);
  const delayedProjects = projects.filter(p => p.end_date && new Date(p.end_date) < new Date() && p.status === 'active');

  const alerts = [
    { type: 'critical', message: `${pendingPayments.length} payment request${pendingPayments.length !== 1 ? 's' : ''} pending approval`, time: 'Just now' },
    { type: 'warning', message: `${delayedProjects.length} project${delayedProjects.length !== 1 ? 's' : ''} past deadline`, time: '1h ago' },
    { type: 'info', message: `${activeProjects.length} active government project${activeProjects.length !== 1 ? 's' : ''} under management`, time: '2h ago' },
  ];

  return (
    <AppLayout title="GovTrack Pro — NIRMAN AI" subtitle="Government Contract Monitoring & Smart Payments by ARSPL">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatCard label="Active Projects" value={activeProjects.length} icon={<FolderOpen size={18} />} loading={loading} color="#00D4AA" />
        <StatCard label="Pending Approvals" value={pendingPayments.length} icon={<Clock size={18} />} loading={loading} color="#ef4444" />
        <StatCard label="Critical Issues" value={0} icon={<AlertTriangle size={18} />} loading={loading} color="#f97316" />
        <StatCard label="Contract Value" value={totalContractValue > 0 ? `${(totalContractValue / 10000000).toFixed(1)}Cr` : '0'} icon={<Landmark size={18} />} loading={loading} color="#3B82F6" />
        <StatCard label="Pending Amount" value={pendingAmount > 0 ? `${(pendingAmount / 100000).toFixed(1)}L` : '0'} icon={<IndianRupee size={18} />} loading={loading} color="#FF6B00" />
        <StatCard label="Delayed" value={delayedProjects.length} icon={<AlertTriangle size={18} />} loading={loading} color="#ef4444" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Projects table */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold text-sm">Projects Overview</h3>
              <p className="text-[#606060] text-xs mt-0.5">All government contracts</p>
            </div>
            <Button size="sm" variant="primary" icon={<FolderOpen size={13} />} onClick={() => navigate('/govtrack/projects/new')}>
              New Project
            </Button>
          </div>

          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Landmark size={36} className="text-[#2A2A2A] mb-3" />
              <p className="text-[#606060] text-sm">No government projects yet</p>
              <Button size="sm" variant="primary" className="mt-3" onClick={() => navigate('/govtrack/projects/new')}>Create First Project</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {projects.slice(0, 6).map(p => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/govtrack/projects/${p.id}`)}
                  className="flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all hover:bg-white/3"
                  style={{ background: '#111111' }}
                >
                  <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: p.status === 'active' ? '#22c55e' : p.status === 'on_hold' ? '#F59E0B' : '#808080' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-medium truncate">{p.project_name}</p>
                      <span className="text-[10px] font-mono text-[#606060]">{p.project_code}</span>
                    </div>
                    <p className="text-[#606060] text-[10px] mt-0.5">{p.department} · {p.contractor_name}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-20">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9px] text-[#606060]">Progress</span>
                        <span className="text-[9px] text-white font-semibold">{p.progress_percent}%</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: '#2A2A2A' }}>
                        <div className="h-full rounded-full" style={{ width: `${p.progress_percent}%`, background: 'linear-gradient(90deg, #FF6B00, #FF8C00)' }} />
                      </div>
                    </div>
                    <Badge color={p.status === 'active' ? '#22c55e' : p.status === 'on_hold' ? '#F59E0B' : '#808080'}>
                      {p.status.replace('_', ' ')}
                    </Badge>
                    <ChevronRight size={14} className="text-[#404040]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alert feed */}
        <div className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
          <div className="flex items-center gap-2 mb-4">
            <Shield size={14} style={{ color: '#00D4AA' }} />
            <h3 className="text-white font-semibold text-sm">Alert Feed</h3>
          </div>
          <div className="flex flex-col gap-2">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: '#111111' }}>
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{
                  background: a.type === 'critical' ? '#ef4444' : a.type === 'warning' ? '#F59E0B' : '#00D4AA'
                }} />
                <div>
                  <p className="text-white text-xs leading-relaxed">{a.message}</p>
                  <p className="text-[#404040] text-[10px] mt-1">{a.time}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Risk distribution mini */}
          <div className="mt-4 pt-4 border-t border-[#232323]">
            <p className="text-[#606060] text-xs font-medium mb-3">AI Risk Distribution</p>
            <div className="flex items-center gap-2">
              {riskDistribution.map(r => (
                <div key={r.name} className="flex-1 text-center">
                  <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ background: r.color }} />
                  <p className="text-white text-xs font-bold">{r.value}</p>
                  <p className="text-[#606060] text-[9px]">{r.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold text-sm">Payment Timeline</h3>
              <p className="text-[#606060] text-xs mt-0.5">Monthly releases (Lakhs)</p>
            </div>
            <TrendingUp size={14} style={{ color: '#00D4AA' }} />
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={paymentTimeline} barSize={16}>
              <XAxis dataKey="month" tick={{ fill: '#606060', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#606060', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1F1F1F', border: '1px solid #333', borderRadius: '8px', fontSize: '11px', color: '#fff' }} />
              <Bar dataKey="amount" fill="#FF6B00" radius={[4, 4, 0, 0]} name="Amount (L)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold text-sm">Project Risk Overview</h3>
              <p className="text-[#606060] text-xs mt-0.5">AI-assessed risk levels</p>
            </div>
            <BarChart2 size={14} style={{ color: '#FF6B00' }} />
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                {riskDistribution.map((r, i) => <Cell key={i} fill={r.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1F1F1F', border: '1px solid #333', borderRadius: '8px', fontSize: '11px', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AppLayout>
  );
}
