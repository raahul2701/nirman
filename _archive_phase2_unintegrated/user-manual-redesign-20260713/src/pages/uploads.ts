import type { UploadInfoItem } from '@/types/userManual';

export const uploads: UploadInfoItem[] = [
  {
    name: 'Site photo upload',
    route: '/govtrack/upload',
    upload: 'Work photos, category, description, milestone if available, GPS latitude/longitude.',
    who: 'JE and Contractor; EE/AE review.',
    verification: 'Review status, AI quality score when configured, photo/GPS evidence, and milestone linkage.',
    review: 'EE/AE/JE should check missing GPS, unclear photos, wrong category, duplicate uploads, and pending review status.',
  },
  // ... other upload types
];