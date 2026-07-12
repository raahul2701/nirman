import type { RouteInfoItem } from '@/types/userManual';

export const enterpriseRoutes: RouteInfoItem[] = [
  {
    route: '/enterprise/setup',
    purpose: 'Workspace and Google/department metadata setup for the EE workspace.',
    users: 'EE, Admin.',
    data: 'Workspace, department/division, district, EE identity, optional Google Drive root details.',
    steps: [
      'Open Enterprise > Workspace Setup.',
      'Check workspace identity.',
      'Enter or confirm department and Drive metadata.',
      'Save changes and return to Start Pilot.',
    ],
    result: 'Workspace context is ready for project assignment and Drive ownership planning.',
  },
  // ... other enterprise routes
];