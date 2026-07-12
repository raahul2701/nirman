import { RecentActivityDTO } from '../config/recent-activity.config';

const now = new Date();

const mockRecentActivity: RecentActivityDTO[] = [
  {
    id: '1',
    eventType: 'DPR_SUBMITTED',
    timestamp: new Date(now.getTime() - 15 * 60000).toISOString(),
    user: { name: 'S. Kumar', role: 'JE' },
    details: 'Daily Progress Report for 24th July',
  },
  {
    id: '2',
    eventType: 'MATERIAL_RECEIVED',
    timestamp: new Date(now.getTime() - 2 * 60 * 60000).toISOString(),
    user: { name: 'R. Sharma', role: 'Store Keeper' },
    details: 'Cement (50 bags) received from Supplier X',
  },
  {
    id: '3',
    eventType: 'INSPECTION_COMPLETED',
    timestamp: new Date(now.getTime() - 5 * 60 * 60000).toISOString(),
    user: { name: 'A. Gupta', role: 'AE' },
    details: 'Slab reinforcement check passed',
  },
  {
    id: '4',
    eventType: 'PHOTO_UPLOADED',
    timestamp: new Date(now.getTime() - 8 * 60 * 60000).toISOString(),
    user: { name: 'S. Kumar', role: 'JE' },
    details: '3 photos of ongoing earthwork uploaded',
  },
];

export const recentActivityService = {
  getRecentActivity: async (projectId: string): Promise<RecentActivityDTO[]> => {
    // TODO(API): Replace with an actual API call to fetch recent activity for the given projectId
    void projectId;
    return Promise.resolve(mockRecentActivity);
  },
};
