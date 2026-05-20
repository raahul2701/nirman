import { supabase } from '../../lib/supabase';
import type { BudgetAnalyticsSession } from '../../types/persistence';

export const budgetSessionsRepository = {
  async create(session: BudgetAnalyticsSession) {
    const { data, error } = await supabase.from('budget_analytics_sessions').insert(session).select().single();
    if (error) throw error;
    return data as BudgetAnalyticsSession;
  },

  async list(projectId: string, limit = 20, offset = 0) {
    const { data, error } = await supabase
      .from('budget_analytics_sessions')
      .select('*')
      .eq('project_id', projectId)
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data as BudgetAnalyticsSession[];
  },
};
