import { ProjectStatusContent } from './ProjectStatusContent';
import { ProjectStatusSkeleton } from './ProjectStatusSkeleton';
import { useProjectStatus } from './useProjectStatus';

export function ProjectStatusWidget() {
  const { data, loading, error } = useProjectStatus('mock-project-id');

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">Project Status</h3>
      </div>
      {loading ? (
        <ProjectStatusSkeleton />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : data ? (
        <ProjectStatusContent status={data} />
      ) : (
        <p className="text-sm text-muted-foreground">No status data available.</p>
      )}
    </div>
  );
}