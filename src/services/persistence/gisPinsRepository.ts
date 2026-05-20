import { supabase } from '../../lib/supabase';
import type { GisSitePin } from '../../types/persistence';

export const gisPinsRepository = {
  async create(pin: GisSitePin) {
    const { data, error } = await supabase.from('gis_site_pins').insert(pin).select().single();
    if (error) throw error;
    return data as GisSitePin;
  },

  async list(projectId: string, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('gis_site_pins')
      .select('*')
      .eq('project_id', projectId)
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data as GisSitePin[];
  },

  async update(id: string, patch: Partial<GisSitePin>) {
    const { data, error } = await supabase.from('gis_site_pins').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data as GisSitePin;
  },

  subscribe(projectId: string, cb: (p: any) => void) {
    return supabase
      .from(`gis_site_pins:project_id=eq.${projectId}`)
      .on('*', (payload: any) => cb(payload))
      .subscribe();
  },
};
