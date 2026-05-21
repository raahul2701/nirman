export function formatDistanceToNow(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export function generateProblemCode(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `GT-${year}-${rand}`;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

export const SEVERITY_BG: Record<string, string> = {
  critical: 'rgba(239,68,68,0.12)',
  high: 'rgba(249,115,22,0.12)',
  medium: 'rgba(234,179,8,0.12)',
  low: 'rgba(34,197,94,0.12)',
};

export const STATUS_COLORS: Record<string, string> = {
  open: '#ef4444',
  in_progress: '#FF6B00',
  resolved: '#22c55e',
  closed: '#808080',
  active: '#22c55e',
  pilot: '#3B82F6',
  paused: '#F59E0B',
  locked: '#808080',
  completed: '#00D4AA',
  archived: '#606060',
};

export const CATEGORY_LABELS: Record<string, string> = {
  structural: 'Structural Issue',
  safety_hazard: 'Safety Hazard',
  equipment_failure: 'Equipment Failure',
  material_defect: 'Material Defect',
  design_mismatch: 'Design Mismatch',
  labor_dispute: 'Labor Dispute',
  weather_related: 'Weather Related',
  other: 'Other',
};
