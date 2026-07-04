import { memo } from 'react';
import type { DashboardProject } from './dashboard';
import { EmptyState } from './EmptyState';
import { ProjectCard } from './ProjectCard';

export const ProjectTimeline = memo(function ProjectTimeline({ projects }: { projects: DashboardProject[] }) {
  if (projects.length === 0) return <EmptyState description="No assigned projects to display on timeline." />;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {projects.map((project) => <ProjectCard key={project.id} project={project} />)}
    </div>
  );
});
