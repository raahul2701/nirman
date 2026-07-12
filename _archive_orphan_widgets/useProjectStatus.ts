import { useCallback, useEffect, useState } from 'react';
import { ProjectStatusViewModel } from './project-status.config';
import { mapProjectStatusDtoToVm } from './project-status.mapper';
import { projectStatusService } from './project-status.service';

export const useProjectStatus = (projectId?: string) => {
  const [data, setData] = useState<ProjectStatusViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (!projectId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await projectStatusService.getProjectStatus(projectId);
      setData(mapProjectStatusDtoToVm(response));
    } catch {
      setError('Failed to load project status.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
};