import {
  ClipboardList, 
  Camera,
  Ruler,
  PackagePlus,
  Fuel,
  Users,
  Truck,
  AlertTriangle,
  CheckSquare,
  Book,
  AlertCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type JE_QUICK_ACTION_TYPE = {
  id: string;
  label: string;
  icon: LucideIcon;
  permission: string;
  roles: ('JE' | 'AE' | 'EE' | 'Contractor')[];
  stages: ('planning' | 'execution' | 'completion' | 'all')[];
  order?: number;
  hidden?: boolean;
  disabled?: boolean;
  featureFlag?: string;
  badge?: string | number;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  priority?: 'high' | 'medium' | 'low';
};

export const jeQuickActions: JE_QUICK_ACTION_TYPE[] = [
  {
    id: 'dpr',
    label: 'Daily Progress',
    icon: ClipboardList,
    permission: 'dpr.create', // TODO: Replace with permission constant, e.g., PERMISSIONS.DPR.CREATE
    roles: ['JE', 'Contractor'],
    stages: ['execution'],
    order: 1,
  },
  {
    id: 'sitePhotos',
    label: 'Site Photos',
    icon: Camera,
    permission: 'photos.upload', // TODO: Replace with permission constant
    roles: ['JE', 'Contractor'],
    stages: ['execution'],
    order: 2,
  },
  {
    id: 'survey',
    label: 'Survey Entry',
    icon: Ruler,
    permission: 'survey.create', // TODO: Replace with permission constant
    roles: ['JE'],
    stages: ['execution'],
    order: 3,
  },
  {
    id: 'materialReceipt',
    label: 'Material Receipt',
    icon: PackagePlus,
    permission: 'material.receive', // TODO: Replace with permission constant
    roles: ['JE', 'Contractor'],
    stages: ['execution'],
    order: 4,
  },
  {
    id: 'diesel',
    label: 'Diesel Entry',
    icon: Fuel,
    permission: 'diesel.create', // TODO: Replace with permission constant
    roles: ['JE', 'Contractor'],
    stages: ['execution'],
    order: 5,
  },
  { id: 'labour', label: 'Labour Attendance', icon: Users, permission: 'labour.create', roles: ['JE', 'Contractor'], stages: ['execution'], order: 6 }, // TODO: Replace with permission constant
  { id: 'equipment', label: 'Equipment Log', icon: Truck, permission: 'equipment.create', roles: ['JE', 'Contractor'], stages: ['execution'], order: 7 }, // TODO: Replace with permission constant
  {
    id: 'hindrance',
    label: 'Hindrance',
    icon: AlertTriangle,
    permission: 'hindrance.create', // TODO: Replace with permission constant
    roles: ['JE', 'Contractor'],
    stages: ['execution'],
    order: 8,
  },
  {
    id: 'inspection',
    label: 'Inspection',
    icon: CheckSquare,
    permission: 'inspection.create', // TODO: Replace with permission constant
    roles: ['JE', 'AE'],
    stages: ['execution'],
    order: 9,
    badge: 2,
    badgeVariant: 'destructive',
  },
  { id: 'mb', label: 'Measurement', icon: Book, permission: 'mb.create', roles: ['JE'], stages: ['execution'], order: 10 }, // TODO: Replace with permission constant
  {
    id: 'raiseIssue',
    label: 'Raise Issue',
    icon: AlertCircle,
    permission: 'issue.create', // TODO: Replace with permission constant
    roles: ['JE', 'AE', 'Contractor'],
    stages: ['all'],
    order: 11,
  },
];