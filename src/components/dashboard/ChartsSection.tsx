import { memo } from 'react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

const CHART_COLORS = ['#FF6B00', '#00D4AA', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

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

export const ChartsSection = memo(() => (
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
));