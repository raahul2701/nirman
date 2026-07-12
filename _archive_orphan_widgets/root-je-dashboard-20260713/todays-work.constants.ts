import { CheckSquare, ClipboardList, Book, Package, Ruler, Footprints } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TodaysTaskType, TodaysTaskPriority } from '../config/todays-work.config';

export const TODAYS_WORK_STRINGS = {
  ERROR_LOADING: "Failed to load today's tasks.",
  NO_DATA: "No tasks scheduled for today. You're all clear!",
};

export const TASK_TYPE_CONFIG: Record<TodaysTaskType, { icon: LucideIcon }> = {
  INSPECTION: { icon: CheckSquare },
  DPR: { icon: ClipboardList },
  MB_PREPARATION: { icon: Book },
  MATERIAL_VERIFICATION: { icon: Package },
  SURVEY: { icon: Ruler },
  SITE_VISIT: { icon: Footprints },
};

export const TASK_PRIORITY_CONFIG: Record<TodaysTaskPriority, { className: string }> = {
  high: {
    className: 'bg-destructive/10 text-destructive',
  },
  medium: {
    className: 'bg-yellow-500/10 text-yellow-600',
  },
  low: {
    className: 'bg-blue-500/10 text-blue-600',
  },
};