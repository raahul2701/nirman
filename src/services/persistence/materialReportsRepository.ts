import { supabase } from '../../lib/supabase';
import type { MaterialAIReport } from '../../types/persistence';

export const materialReportsRepository = {
  async create(report: MaterialAIReport) {
    const { data, error } = await supabase.from('material_ai_reports').insert(report).select().single();
    if (error) throw error;
    return data as MaterialAIReport;
  },

  async list(projectId: string, limit = 20, offset = 0) {
    const { data, error } = await supabase
      .from('material_ai_reports')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data as MaterialAIReport[];
  },

  async update(id: string, patch: Partial<MaterialAIReport>) {
    const { data, error } = await supabase.from('material_ai_reports').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data as MaterialAIReport;
  },

  // Subscription helper (returns realtime subscription object)
  subscribe(projectId: string, callback: (r: any) => void) {
    return supabase
      .from(`material_ai_reports:project_id=eq.${projectId}`)
      .on('*', (payload: any) => callback(payload))
      .subscribe();
  },
};
