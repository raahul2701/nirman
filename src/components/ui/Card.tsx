import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, glow, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl p-5 transition-all duration-200',
        glow && 'hover:shadow-lg hover:shadow-[#FF6B00]/5',
        onClick && 'cursor-pointer',
        className
      )}
      style={{ background: '#1A1A1A', border: '1px solid #232323' }}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  color = '#FF6B00',
  loading,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  color?: string;
  loading?: boolean;
}) {
  return (
    <Card glow>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#606060] text-xs font-medium mb-2">{label}</p>
          {loading ? (
            <div className="h-7 w-16 rounded-lg bg-[#2A2A2A] animate-pulse" />
          ) : (
            <p className="text-white text-2xl font-bold">{value}</p>
          )}
          {trend && <p className="text-xs mt-1.5" style={{ color: trend.startsWith('+') ? '#22c55e' : '#ef4444' }}>{trend}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}20` }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
    </Card>
  );
}
