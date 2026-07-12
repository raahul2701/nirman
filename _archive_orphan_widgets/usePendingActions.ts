import { useState, useEffect, useCallback } from 'react';
import { PendingActionViewModel } from '../config/pending-actions.config';
import { pendingActionsService } from '../services/pending-actions.service';
import { mapPendingActionDtosToVms } from '../mappers/pending-actions.mapper';
import { PENDING_ACTIONS_STRINGS } from '../constants/pending-actions.constants';

export const usePendingActions = (userId?: string) => {
  const [actions, setActions] = useState<PendingActionViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActions = useCallback(async (): Promise<void> => {
    if (!userId) {
      setActions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const dtos = await pendingActionsService.getPendingActions(userId);
      const viewModels = mapPendingActionDtosToVms(dtos);
      setActions(viewModels);
    } catch {
      setError(PENDING_ACTIONS_STRINGS.ERROR_LOADING);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchActions();
  }, [fetchActions]);

  return { actions, loading, error, refresh: fetchActions };
};
