import { ProjectStatusViewModel } from './project-status.config';
import { PROJECT_STATUS_LABELS } from './project-status.constants';
import { MetricRow } from './MetricRow';
import { ProjectMetricProgress } from './ProjectMetricProgress';

interface ProjectStatusContentProps {
  status: ProjectStatusViewModel;
}

export function ProjectStatusContent({ status }: ProjectStatusContentProps) {
  return (
    <div className="space-y-3">
      <ProjectMetricProgress label={PROJECT_STATUS_LABELS.PHYSICAL_PROGRESS} value={status.physicalProgress} />
      <ProjectMetricProgress label={PROJECT_STATUS_LABELS.FINANCIAL_PROGRESS} value={status.financialProgress} />
      <div className="space-y-1 pt-1 text-xs text-muted-foreground">
        <MetricRow
          label={PROJECT_STATUS_LABELS.DELAY}
          value={`${status.delayDays} days`}
          valueClassName={status.delayVariant === 'destructive' ? 'text-destructive' : 'text-card-foreground'}
        />
        <div className="flex items-center gap-x-2">
          <MetricRow label={PROJECT_STATUS_LABELS.HINDRANCES} value={status.hindranceCount} />
          <span>|</span>
          <MetricRow label={PROJECT_STATUS_LABELS.ISSUES} value={status.issueCount} />
        </div>
      </div>
    </div>
  );
}