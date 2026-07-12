import { TodaysWorkDTO, TodaysWorkViewModel } from '../config/todays-work.config';
import { TASK_TYPE_CONFIG, TASK_PRIORITY_CONFIG } from '../constants/todays-work.constants';
import { buildWorkflowRoute } from '../../../../lib/utils/workflow';

export const mapTodaysWorkDtoToVm = (dto: TodaysWorkDTO): TodaysWorkViewModel => {
  const { taskType, dueTime, workflowId, entityId, priority, ...rest } = dto;

  const formattedTime = new Date(dueTime).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return {
    ...rest,
    taskType,
    formattedTime,
    href: buildWorkflowRoute(workflowId, entityId),
    icon: TASK_TYPE_CONFIG[taskType]?.icon || TASK_TYPE_CONFIG.SITE_VISIT.icon,
    priority: { name: priority, ...TASK_PRIORITY_CONFIG[priority] },
  };
};