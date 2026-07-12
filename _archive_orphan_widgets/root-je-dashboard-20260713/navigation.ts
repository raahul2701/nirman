import {
  LayoutDashboard,
  Briefcase,
  ClipboardList,
  Ruler,
  Users,
  Package,
  Truck,
  Fuel,
  Camera,
  Shield,
  CheckSquare,
  Book,
  AlertTriangle,
  GitBranch,
  BarChart,
  Bell,
  User,
} from 'lucide-react';

export const jeNavigation = [
  {
    title: 'COMMAND CENTER',
    items: [
      { href: '/je/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/je/projects', label: 'My Projects', icon: Briefcase },
    ],
  },
  {
    title: 'FIELD EXECUTION',
    items: [
      { href: '/je/dpr', label: 'Daily Progress', icon: ClipboardList },
      { href: '/je/survey', label: 'Survey & Quantity', icon: Ruler },
      { href: '/je/labour', label: 'Labour', icon: Users },
      { href: '/je/material', label: 'Material', icon: Package },
      { href: '/je/equipment', label: 'Equipment', icon: Truck },
      { href: '/je/diesel', label: 'Diesel', icon: Fuel },
      { href: '/je/photos', label: 'Site Photos', icon: Camera },
    ],
  },
  {
    title: 'QUALITY',
    items: [
      { href: '/je/inspections', label: 'Inspections', icon: CheckSquare },
      { href: '/je/quality', label: 'Quality', icon: Shield },
      { href: '/je/mb', label: 'Measurement Book', icon: Book },
    ],
  },
  {
    title: 'WORKFLOW',
    items: [
      { href: '/je/workflow', label: 'Workflow', icon: GitBranch },
      { href: '/je/issues', label: 'Issues', icon: AlertTriangle },
      {
        href: '/je/hindrance',
        label: 'Hindrance Register',
        icon: AlertTriangle,
      },
    ],
  },
  {
    title: 'REPORTS',
    items: [
      { href: '/je/reports', label: 'Reports', icon: BarChart },
      { href: '/je/notifications', label: 'Notifications', icon: Bell },
      { href: '/je/profile', label: 'Profile', icon: User },
    ],
  },
];
