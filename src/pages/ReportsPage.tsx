import { useCallback, useEffect, useState } from 'react';
import {
  TrendingUp, AlertTriangle, Users, Package,
  Download
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';

const weeklyData = [
  { day: 'Mon', problems: 3, resolved: 2, workers: 18 },
  { day: 'Tue', problems: 5, resolved: 4, workers: 20 },
  { day: 'Wed', problems: 2, resolved: 3, workers: 19 },
  { day: 'Thu', problems: 7, resolved: 5, workers: 22 },
  { day: 'Fri', problems: 4, resolved: 6, workers: 21 },
  { day: 'Sat', problems: 1, resolved: 2, workers: 15 },
  { day: 'Sun', problems: 0, resolved: 1, workers: 8 },
];

const monthlyMaterial = [
  { month: 'Jan', cement: 400, steel: 280, sand: 320 },
  { month: 'Feb', cement: 380, steel: 300, sand: 290 },
  { month: 'Mar', cement: 520, steel: 350, sand: 410 },
  { month: 'Apr', cement: 450, steel: 320, sand: 380 },
  { month: 'May', cement: 480, steel: 360, sand: 420 },
];

const severityData = [
  { name: 'Critical', value: 8 },
  { name: 'High', value: 22 },
  { name: 'Medium', value: 45 },
  { name: 'Low', value: 25 },
];

export function ReportsPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const [stats, setStats] = useState({ totalProblems: 0, resolvedProblems: 0, totalWorkers: 0, activeMaterials: 0 });
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!userId) return;
    const [problems, resolved, workers, materials] = await Promise.all([
      supabase.from('problems').select('id', { count: 'exact' }).eq('reported_by', userId),
      supabase.from('problems').select('id', { count: 'exact' }).eq('reported_by', userId).eq('status', 'resolved'),
      supabase.from('workers').select('id', { count: 'exact' }).eq('owner_id', userId),
      supabase.from('materials').select('id', { count: 'exact' }).eq('owner_id', userId),
    ]);
    setStats({
      totalProblems: problems.count || 0,
      resolvedProblems: resolved.count || 0,
      totalWorkers: workers.count || 0,
      activeMaterials: materials.count || 0,
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) loadStats();
  }, [loadStats, userId]);

  const resolutionRate = stats.totalProblems > 0 ? Math.round((stats.resolvedProblems / stats.totalProblems) * 100) : 0;

  return (
    <AppLayout title="Reports & Analytics" subtitle="Performance insights and data exports">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Problems', value: loading ? '—' : stats.totalProblems, icon: AlertTriangle, color: '#ef4444' },
          { label: 'Resolution Rate', value: loading ? '—' : `${resolutionRate}%`, icon: TrendingUp, color: '#22c55e' },
          { label: 'Total Workers', value: loading ? '—' : stats.totalWorkers, icon: Users, color: '#FF6B00' },
          { label: 'Materials Tracked', value: loading ? '—' : stats.activeMaterials, icon: Package, color: '#00D4AA' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[#606060] text-xs mb-2">{k.label}</p>
                <p className="text-white text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${k.color}15` }}>
                <k.icon size={16} style={{ color: k.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold text-sm">Weekly Problem Activity</h3>
              <p className="text-[#606060] text-xs mt-0.5">Reported vs Resolved</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData} barSize={12}>
              <XAxis dataKey="day" tick={{ fill: '#606060', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#606060', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1F1F1F', border: '1px solid #333', borderRadius: '8px', fontSize: '11px', color: '#fff' }} />
              <Bar dataKey="problems" fill="#ef4444" radius={[3, 3, 0, 0]} name="Reported" />
              <Bar dataKey="resolved" fill="#22c55e" radius={[3, 3, 0, 0]} name="Resolved" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
          <div className="mb-4">
            <h3 className="text-white font-semibold text-sm">Issue Severity Distribution</h3>
            <p className="text-[#606060] text-xs mt-0.5">All time breakdown</p>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={severityData} cx="50%" cy="50%" outerRadius={65} dataKey="value" paddingAngle={4}>
                {severityData.map((_, i) => <Cell key={i} fill={['#ef4444', '#f97316', '#eab308', '#22c55e'][i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1F1F1F', border: '1px solid #333', borderRadius: '8px', fontSize: '11px', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-4 gap-2 mt-1">
            {severityData.map((s, i) => (
              <div key={s.name} className="text-center">
                <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ background: ['#ef4444', '#f97316', '#eab308', '#22c55e'][i] }} />
                <p className="text-[#606060] text-[9px]">{s.name}</p>
                <p className="text-white text-xs font-bold">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Material consumption */}
      <div className="rounded-2xl p-5 mb-4" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold text-sm">Monthly Material Consumption</h3>
            <p className="text-[#606060] text-xs mt-0.5">Top 3 materials — demo data</p>
          </div>
          <Button size="sm" variant="ghost" icon={<Download size={13} />}>Export CSV</Button>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={monthlyMaterial}>
            <XAxis dataKey="month" tick={{ fill: '#606060', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#606060', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#1F1F1F', border: '1px solid #333', borderRadius: '8px', fontSize: '11px', color: '#fff' }} />
            <Area type="monotone" dataKey="cement" stroke="#FF6B00" fill="rgba(255,107,0,0.08)" strokeWidth={2} name="Cement (bags)" />
            <Area type="monotone" dataKey="steel" stroke="#00D4AA" fill="rgba(0,212,170,0.06)" strokeWidth={2} name="Steel (kg)" />
            <Area type="monotone" dataKey="sand" stroke="#3B82F6" fill="rgba(59,130,246,0.06)" strokeWidth={2} name="Sand (cu.m)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Worker attendance */}
      <div className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold text-sm">Worker Attendance Trend</h3>
            <p className="text-[#606060] text-xs mt-0.5">Daily headcount this week</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={weeklyData}>
            <XAxis dataKey="day" tick={{ fill: '#606060', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#606060', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#1F1F1F', border: '1px solid #333', borderRadius: '8px', fontSize: '11px', color: '#fff' }} />
            <Line type="monotone" dataKey="workers" stroke="#FF6B00" strokeWidth={2.5} dot={{ r: 4, fill: '#FF6B00', strokeWidth: 0 }} name="Workers Present" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </AppLayout>
  );
}
