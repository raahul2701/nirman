import { useState, useEffect, useCallback } from 'react';
import { RecentActivityViewModel } from '../config/recent-activity.config';
import { mapActivityDtoToVm } from '../mappers/recent-activity.mapper';
import { recentActivityService } from '../services/recent-activity.service';

export const useRecentActivity = (projectId?: string) => {
  const [activities, setActivities] = useState<RecentActivityViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const dtos = await recentActivityService.getRecentActivity(projectId);
      const viewModels = dtos.map(mapActivityDtoToVm);
      setActivities(viewModels);
    } catch {
      setError('Failed to load recent activity.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return { activities, loading, error, refresh: fetchActivities };
};
