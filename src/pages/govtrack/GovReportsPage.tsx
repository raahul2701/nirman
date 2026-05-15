import { useEffect, useState } from 'react';
import {
  FileBarChart, TrendingUp, IndianRupee, Shield,
  CheckCircle, AlertTriangle, Clock, Download
} from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import { formatCurrency } from '../../lib/utils';

const monthlyPayments = [
  { month: 'Jan', released: 18, pending: 5 },
  { month: 'Feb', released: 22, pending: 8 },
  { month: 'Mar', released: 15, pending: 3 },
  { month: 'Apr', released: 28, pending: 12 },
  { month: 'May', released: 32, pending: 6 },
  { month: 'Jun', released: 25, pending: 9 },
];

const projectHealth = [
  { name: 'NH-44 Ext', score: 85 },
  { name: 'PWD Bldg A', score: 72 },
  { name: 'Bridge #7', score: 91 },
  { name: 'Dam Phase 2', score: 58 },
  { name: 'Railway OHE', score: 67 },
];

const riskDistribution = [
  { name: 'Safe', value: 14, color: '#22c55e' },
  { name: 'Low Risk', value: 9, color: '#eab308' },
  { name: 'Medium', value: 6, color: '#f97316' },
  { name: 'High', value: 2, color: '#ef4444' },
];

export function GovReportsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalProjects: 0, totalPayments: 0, totalInspections: 0, totalUploads: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  async function loadStats() {
    const [proj, pay, insp, uploads] = await Promise.all([
      supabase.from('gov_projects').select('id', { count: 'exact' }).or(`owner_id.eq.${user!.id},contractor_id.eq.${user!.id},engineer_id.eq.${user!.id}`),
      supabase.from('payment_requests').select('id', { count: 'exact' }),
      supabase.from('inspection_reports').select('id', { count: 'exact' }).eq('inspected_by', user!.id),
      supabase.from('work_uploads').select('id', { count: 'exact' }).eq('uploaded_by', user!.id),
    ]);
    setStats({
      totalProjects: proj.count || 0,
      totalPayments: pay.count || 0,
      totalInspections: insp.count || 0,
      totalUploads: uploads.count || 0,
    });
    setLoading(false);
  }

  return (
    <AppLayout title="GovTrack Reports — NIRMAN AI" subtitle="Auto-generated analytics and compliance reports by ARSPL">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Projects', value: stats.totalProjects, icon: FileBarChart, color: '#00D4AA' },
          { label: 'Payment Requests', value: stats.totalPayments, icon: IndianRupee, color: '#FF6B00' },
          { label: 'Inspections', value: stats.totalInspections, icon: Shield, color: '#3B82F6' },
          { label: 'Work Uploads', value: stats.totalUploads, icon: CheckCircle, color: '#22c55e' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[#606060] text-xs mb-2">{k.label}</p>
                <p className="text-white text-2xl font-bold" style={{ color: k.color }}>{loading ? '—' : k.value}</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${k.color}15` }}>
                <k.icon size={16} style={{ color: k.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Payment timeline */}
        <div className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold text-sm">Payment Flow (Lakhs)</h3>
              <p className="text-[#606060] text-xs mt-0.5">Released vs Pending</p>
            </div>
            <Button size="sm" variant="ghost" icon={<Download size={12} />}>Export</Button>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyPayments} barSize={12}>
              <XAxis dataKey="month" tick={{ fill: '#606060', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#606060', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1F1F1F', border: '1px solid #333', borderRadius: '8px', fontSize: '11px', color: '#fff' }} />
              <Bar dataKey="released" fill="#22c55e" radius={[3, 3, 0, 0]} name="Released" />
              <Bar dataKey="pending" fill="#F59E0B" radius={[3, 3, 0, 0]} name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk distribution */}
        <div className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
          <div className="mb-4">
            <h3 className="text-white font-semibold text-sm">AI Risk Distribution</h3>
            <p className="text-[#606060] text-xs mt-0.5">Across all milestones</p>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                {riskDistribution.map((r, i) => <Cell key={i} fill={r.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1F1F1F', border: '1px solid #333', borderRadius: '8px', fontSize: '11px', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {riskDistribution.map(r => (
              <div key={r.name} className="text-center">
                <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ background: r.color }} />
                <p className="text-[#606060] text-[9px]">{r.name}</p>
                <p className="text-white text-xs font-bold">{r.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project health scores */}
      <div className="rounded-2xl p-5 mb-4" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold text-sm">Project Health Scores</h3>
            <p className="text-[#606060] text-xs mt-0.5">AI-assessed quality and compliance</p>
          </div>
          <TrendingUp size={14} style={{ color: '#00D4AA' }} />
        </div>
        <div className="flex flex-col gap-3">
          {projectHealth.map(p => (
            <div key={p.name} className="flex items-center gap-3">
              <span className="text-[#A0A0A0] text-xs w-28 truncate">{p.name}</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#2A2A2A' }}>
                <div className="h-full rounded-full transition-all" style={{
                  width: `${p.score}%`,
                  background: p.score >= 80 ? 'linear-gradient(90deg, #22c55e, #00D4AA)' : p.score >= 60 ? 'linear-gradient(90deg, #F59E0B, #FF6B00)' : 'linear-gradient(90deg, #ef4444, #f97316)',
                }} />
              </div>
              <span className="text-white text-xs font-bold w-8 text-right" style={{ color: p.score >= 80 ? '#22c55e' : p.score >= 60 ? '#F59E0B' : '#ef4444' }}>{p.score}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance summary */}
      <div className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold text-sm">Compliance Summary</h3>
            <p className="text-[#606060] text-xs mt-0.5">Key compliance indicators</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'NBC Compliant', value: '87%', icon: CheckCircle, color: '#22c55e' },
            { label: 'Safety Standards', value: '92%', icon: Shield, color: '#3B82F6' },
            { label: 'Structural Issues', value: '3', icon: AlertTriangle, color: '#ef4444' },
            { label: 'Overdue Milestones', value: '2', icon: Clock, color: '#F59E0B' },
          ].map(c => (
            <div key={c.label} className="rounded-xl p-3 text-center" style={{ background: '#111111' }}>
              <c.icon size={16} className="mx-auto mb-1.5" style={{ color: c.color }} />
              <p className="text-white text-lg font-bold">{c.value}</p>
              <p className="text-[#606060] text-[10px]">{c.label}</p>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
