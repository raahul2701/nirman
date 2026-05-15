import { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const materialData = [
  { name: 'Cement', used: 420, total: 600 },
  { name: 'Steel', used: 280, total: 400 },
  { name: 'Sand', used: 190, total: 300 },
  { name: 'Bricks', used: 350, total: 500 },
  { name: 'Tiles', used: 120, total: 200 },
];

export const MaterialChart = memo(() => (
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
));