import { supabase } from '../../lib/supabase';
import type { HindranceEntry } from '../../types/persistence';

export const hindranceRepository = {
  async create(entry: HindranceEntry) {
    const { data, error } = await supabase.from('hindrance_entries').insert(entry).select().single();
    if (error) throw error;
    return data as HindranceEntry;
  },

  async list(projectId: string, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('hindrance_entries')
      .select('*')
      .eq('project_id', projectId)
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data as HindranceEntry[];
  },
};
