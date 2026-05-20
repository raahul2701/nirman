import { supabase } from '../../lib/supabase';
import type { DieselIssueLog } from '../../types/persistence';

export const dieselLogsRepository = {
  async create(log: DieselIssueLog) {
    const { data, error } = await supabase.from('diesel_issue_logs').insert(log).select().single();
    if (error) throw error;
    return data as DieselIssueLog;
  },

  async list(projectId: string, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('diesel_issue_logs')
      .select('*')
      .eq('project_id', projectId)
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data as DieselIssueLog[];
  },
};
