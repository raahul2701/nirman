// Integration layer for BudgetProgressPage - adds persistence without rewriting UI
import type { BudgetAnalyticsSession } from '../../types/persistence';
import { budgetSessionsService } from '../data/budgetSessionsService';
import { useAuth } from '../../contexts/useAuth';
import { useCallback } from 'react';

export function useBudgetSessionPersistence(projectId: string) {
  const { user } = useAuth();

  const saveSession = useCallback(
    async (sessionData: {
      projectCost: string;
      startDate: string;
      endDate: string;
      raBills: string;
      workProgress: string;
      billingTimeline: string;
      delays: string;
      milestones: string;
      manpower: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const session: BudgetAnalyticsSession = {
        project_id: projectId,
        session_data: sessionData,
        created_by: user.id,
      };

      return budgetSessionsService.createSession(session);
    },
    [projectId, user]
  );

  return { saveSession };
}
