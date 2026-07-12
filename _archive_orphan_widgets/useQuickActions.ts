import { useState, useEffect } from 'react';
import { jeQuickActions, JE_QUICK_ACTION_TYPE } from '../config/quick-actions.config';

/**
 * Hook to fetch and filter quick actions based on project and user context.
 * @param projectId The ID of the current project.
 * @param userRole The role of the current user.
 * @param workflowStage The current stage of the project's workflow.
 */
export const useQuickActions = (
  _projectId?: string,
  _userRole?: string,
  _workflowStage?: string
) => {
  const [actions, setActions] = useState<JE_QUICK_ACTION_TYPE[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // MOCK: In the future, this will fetch actions from an API.
    // The filtering logic below demonstrates how the hook will handle role, stage, and feature flags.
    const filteredAndSortedActions = jeQuickActions
      .filter(action => !action.hidden) // Filter out hidden actions
      // TODO: Implement feature flag check: .filter(action => !action.featureFlag || isFeatureFlagEnabled(action.featureFlag))
      // TODO: Implement role-based filtering: .filter(action => action.roles.includes(userRole))
      // TODO: Implement stage-based filtering: .filter(action => action.stages.includes(workflowStage) || action.stages.includes('all'))
      .sort((a, b) => (a.order || 99) - (b.order || 99));

    setActions(filteredAndSortedActions);
    setLoading(false);
  }, [_projectId, _userRole, _workflowStage]);

  return { actions, loading };
};