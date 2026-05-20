import { supabase } from '../../lib/supabase';
import type { UploadMetadata } from '../../types/persistence';

export const uploadMetadataRepository = {
  async create(meta: UploadMetadata) {
    const { data, error } = await supabase.from('upload_metadata').insert(meta).select().single();
    if (error) throw error;
    return data as UploadMetadata;
  },

  async get(id: string) {
    const { data, error } = await supabase.from('upload_metadata').select('*').eq('id', id).single();
    if (error) throw error;
    return data as UploadMetadata;
  },
};
