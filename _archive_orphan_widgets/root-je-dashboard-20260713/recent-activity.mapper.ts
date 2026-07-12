import { formatDistanceToNow } from '../../../../lib/utils';
import { RecentActivityDTO, RecentActivityViewModel } from '../config/recent-activity.config';
import { ACTIVITY_EVENT_CONFIG } from '../constants/recent-activity.constants';

export const mapActivityDtoToVm = (dto: RecentActivityDTO): RecentActivityViewModel => {
  const config = ACTIVITY_EVENT_CONFIG[dto.eventType] || {
    icon: ACTIVITY_EVENT_CONFIG.WORKFLOW_MOVED.icon,
    color: 'text-gray-500',
    title: 'Unknown Event',
  };

  return {
    id: dto.id,
    title: config.title,
    description: `${dto.details} by ${dto.user.name}`,
    time: formatDistanceToNow(new Date(dto.timestamp)),
    icon: config.icon,
    color: config.color,
  };
};