import { ReactNode } from 'react';
import { SEVERITY_COLORS, SEVERITY_BG, STATUS_COLORS } from '../../lib/utils';

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
      style={{ color: SEVERITY_COLORS[severity] || '#A0A0A0', background: SEVERITY_BG[severity] || 'rgba(160,160,160,0.1)' }}
    >
      {severity}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || '#808080';
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
      style={{ color, background: `${color}15`, border: `1px solid ${color}25` }}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

export function Badge({
  children,
  color = '#005F56',
  variant = 'solid',
  className = ''
}: {
  children: ReactNode;
  color?: string;
  variant?: 'solid' | 'outline' | 'ghost' | 'secondary' | 'destructive' | string;
  className?: string;
}) {
  const baseClass = 'px-2 py-0.5 rounded-full text-[10px] font-medium';
  const style = variant === 'outline'
    ? { color, background: 'transparent', border: `1px solid ${color}` }
    : variant === 'ghost'
      ? { color, background: 'rgba(0,95,86,0.08)' }
      : variant === 'secondary'
        ? { color, background: 'rgba(200,155,60,0.14)' }
        : variant === 'destructive'
          ? { color: '#ef4444', background: 'rgba(239,68,68,0.15)' }
          : { color, background: `${color}15` };

  return (
    <span className={`${baseClass} ${className}`} style={style}>
      {children}
    </span>
  );
}
