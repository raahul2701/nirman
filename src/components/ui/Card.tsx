import { ReactNode, memo } from 'react';
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
        'rounded-lg p-5 transition-all duration-200 shadow-enterprise',
        glow && 'hover:shadow-command',
        onClick && 'cursor-pointer',
        className
      )}
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {children}
    </div>
  );
}

export const StatCard = memo(({
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
}) => {
  return (
    <Card glow>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#6C7568] text-xs font-medium mb-2">{label}</p>
          {loading ? (
            <div className="h-7 w-16 rounded-lg bg-[#EFE8D4] animate-pulse" />
          ) : (
            <p className="text-[#12332D] text-2xl font-bold">{value}</p>
          )}
          {trend && <p className="text-xs mt-1.5" style={{ color: trend.startsWith('+') ? '#22c55e' : '#ef4444' }}>{trend}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
    </Card>
  );
});
