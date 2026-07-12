import type { ChecklistItem } from '@/types/userManual';

export const checklists: ChecklistItem[] = [
  {
    title: 'EE daily checklist',
    items: [
      'Open Dashboard and Gov Dashboard.',
      'Review project progress and payment risks.',
      'Check QC/TPA/hindrance/diesel alerts.',
      'Verify access for active pilot projects.',
      'Review Activity Logs during pilot.',
    ],
  },
  {
    title: 'AE daily checklist',
    items: [
      'Review assigned project uploads.',
      'Check material QC and TPA reports.',
      'Review JE inspection notes.',
      'Flag missing or poor evidence.',
      'Escalate major risks to EE.',
    ],
  },
  // ... other checklists
];