import { mockPendingActions } from '../config/pending-actions.config';

/**
 * Service to fetch pending actions for the current user.
 * In the future, this will make an API call to the Workflow Engine.
 */
export const pendingActionsService = {
  getPendingActions: async (userId: string) => {
    console.log(`Fetching pending actions for user: ${userId}`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockPendingActions;
  },
};