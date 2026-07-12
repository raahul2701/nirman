import { PENDING_ACTION_PRIORITY } from '../config/pending-actions.config';

type PriorityConfig = {
  className: string;
};

export const PRIORITY_CONFIG: Record<PENDING_ACTION_PRIORITY, PriorityConfig> = {
  high: {
    className: 'border-destructive/50 bg-destructive/10 text-destructive',
  },
  medium: {
    className: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-600',
  },
  low: {
    className: 'border-blue-500/50 bg-blue-500/10 text-blue-600',
  },
};