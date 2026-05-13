import { cn } from '../../lib/utils';
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

export function Badge({ children, color = '#FF6B00' }: { children: string; color?: string }) {
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{ color, background: `${color}15` }}
    >
      {children}
    </span>
  );
}
