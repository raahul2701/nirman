import { ProjectStatusResponse, ProjectStatusViewModel } from './project-status.config';

export const mapProjectStatusDtoToVm = (dto: ProjectStatusResponse): ProjectStatusViewModel => {
  const delayDays = dto.schedule.delayInDays;

  return {
    physicalProgress: dto.progress.physical,
    financialProgress: dto.progress.financial,
    delayDays,
    delayVariant: delayDays > 0 ? 'destructive' : 'default',
    hindranceCount: dto.alerts.activeHindrances,
    issueCount: dto.alerts.openIssues,
    lastUpdated: dto.updatedAt,
  };
};