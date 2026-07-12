import { ClipboardList, Package, CheckSquare, GitBranch, Camera, Ruler } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type ActivityEventConfig = {
  icon: LucideIcon;
  color: string;
  title: string;
};

export const ACTIVITY_EVENT_CONFIG: Record<string, ActivityEventConfig> = {
  DPR_SUBMITTED: {
    icon: ClipboardList,
    color: 'text-blue-500',
    title: 'DPR Submitted',
  },
  MATERIAL_RECEIVED: {
    icon: Package,
    color: 'text-green-500',
    title: 'Material Received',
  },
  INSPECTION_COMPLETED: {
    icon: CheckSquare,
    color: 'text-purple-500',
    title: 'Inspection Completed',
  },
  WORKFLOW_MOVED: {
    icon: GitBranch,
    color: 'text-orange-500',
    title: 'Workflow Stage Moved',
  },
  PHOTO_UPLOADED: {
    icon: Camera,
    color: 'text-indigo-500',
    title: 'Site Photo Uploaded',
  },
  SURVEY_UPDATED: {
    icon: Ruler,
    color: 'text-teal-500',
    title: 'Survey Updated',
  },
};