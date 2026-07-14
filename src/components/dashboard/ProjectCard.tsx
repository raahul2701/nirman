import { memo } from 'react';
import { Card } from '../ui/Card';
import type { DashboardProject } from './dashboard';
import { ProgressBar } from './ProgressBar';

function formatProgress(value: number | null) {
  return value == null ? 'Not available' : `${Math.round(value)}%`;
}

export const ProjectCard = memo(function ProjectCard({ project }: { project: DashboardProject }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6C7568]">{project.code}</p>
          <h3 className="mt-1 text-sm font-bold text-[#12332D]">{project.name}</h3>
          <p className="mt-1 text-xs text-[#6C7568]">{project.ae} / {project.je}</p>
        </div>
        <span className="rounded-md bg-[#005F56]/10 px-2 py-1 text-xs font-bold text-[#005F56]">{formatProgress(project.progress)}</span>
      </div>
      <div className="mt-4 space-y-3">
        {project.components.map((component) => (
          <div key={`${project.id}-${component.name}`}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-[#12332D]">{component.name}</span>
              <span className="text-[#6C7568]">{formatProgress(component.progress)}</span>
            </div>
            <ProgressBar value={component.progress} />
          </div>
        ))}
      </div>
    </Card>
  );
});
