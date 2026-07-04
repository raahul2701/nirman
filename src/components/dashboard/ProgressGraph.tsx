import { memo } from 'react';
import type { DashboardProject } from './dashboard';
import { EmptyState } from './EmptyState';
import { ProgressBar } from './ProgressBar';

export const ProgressGraph = memo(function ProgressGraph({ projects }: { projects: DashboardProject[] }) {
  if (projects.length === 0) return <EmptyState description="No active assigned project data available." />;
  return (
    <div className="space-y-3">
      {projects.slice(0, 5).map((project) => (
        <div key={project.id}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="truncate font-semibold text-[#12332D]">{project.name}</span>
            <span className="text-[#6C7568]">{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} />
        </div>
      ))}
    </div>
  );
});
