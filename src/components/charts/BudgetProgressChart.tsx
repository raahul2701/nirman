import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area } from 'recharts';
import { BudgetProgressSnapshot } from '../../types';

interface BudgetProgressChartProps {
  data: BudgetProgressSnapshot[];
}

export function BudgetProgressChart({ data }: BudgetProgressChartProps) {
  const formatted = data
    .slice()
    .reverse()
    .map((snapshot) => ({
      date: snapshot.snapshot_date,
      financial: Number(snapshot.financial_progress_percent ?? 0),
      physical: Number(snapshot.physical_progress_percent ?? 0),
      gap: Number(snapshot.gap_percentage ?? 0),
    }));

  return (
    <div className="w-full h-96 bg-[#111118] rounded-3xl border border-[#22222A] p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Budget vs Progress Trend</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#2A2A34" strokeDasharray="4 4" />
          <XAxis dataKey="date" tick={{ fill: '#8A8A8A', fontSize: 12 }} />
          <YAxis tick={{ fill: '#8A8A8A', fontSize: 12 }} />
          <Tooltip contentStyle={{ backgroundColor: '#0D0D0D', borderColor: '#272731', color: '#FFFFFF' }} />
          <Legend wrapperStyle={{ color: '#FFFFFF' }} />
          <Area type="monotone" dataKey="gap" stroke="#FF6B00" fillOpacity={0.2} fill="#FF6B00" name="Gap %" />
          <Line type="monotone" dataKey="financial" stroke="#00D4AA" strokeWidth={2} name="Financial %" />
          <Line type="monotone" dataKey="physical" stroke="#3B82F6" strokeWidth={2} name="Physical %" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
