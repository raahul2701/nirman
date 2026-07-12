import { useState, useEffect, useCallback } from 'react';
import { TodaysWorkViewModel } from '../config/todays-work.config';
import { TODAYS_WORK_STRINGS } from '../constants/todays-work.constants';
import { mapTodaysWorkDtoToVm } from '../mappers/todays-work.mapper';
import { todaysWorkService } from '../services/todays-work.service';

export const useTodaysWork = (projectId?: string, userId?: string) => {
  const [tasks, setTasks] = useState<TodaysWorkViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!projectId || !userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const dtos = await todaysWorkService.getTodaysWork(projectId, userId);
      const viewModels = dtos.map(mapTodaysWorkDtoToVm);
      setTasks(viewModels);
    } catch {
      setError(TODAYS_WORK_STRINGS.ERROR_LOADING);
    } finally {
      setLoading(false);
    }
  }, [projectId, userId]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, refresh: fetchTasks };
};
