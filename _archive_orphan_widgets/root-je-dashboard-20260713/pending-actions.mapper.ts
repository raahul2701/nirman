import { PENDING_ACTION_TYPE, PendingActionViewModel } from '../config/pending-actions.config';
import { isPast, isSameDay } from '../../../../lib/utils';
import { buildWorkflowRoute } from '../../../../lib/utils/workflow';
import { formatDueDate } from '../../../../lib/utils/date';

export const mapPendingActionDtoToVm = (dto: PENDING_ACTION_TYPE): PendingActionViewModel => {
  return {
    ...dto,
    isOverdue: isPast(new Date(dto.dueDate)) && !isSameDay(new Date(), new Date(dto.dueDate)),
    formattedDueDate: formatDueDate(dto.dueDate),
    href: buildWorkflowRoute(dto.workflowId, dto.entityId),
  };
};

export const mapPendingActionDtosToVms = (dtos: PENDING_ACTION_TYPE[]): PendingActionViewModel[] => {
  return dtos.map(mapPendingActionDtoToVm);
};