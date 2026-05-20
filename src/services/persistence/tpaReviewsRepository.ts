import { supabase } from '../../lib/supabase';
import type { TpaUploadReview } from '../../types/persistence';

export const tpaReviewsRepository = {
  async create(review: TpaUploadReview) {
    const { data, error } = await supabase.from('tpa_upload_reviews').insert(review).select().single();
    if (error) throw error;
    return data as TpaUploadReview;
  },

  async listForUpload(uploadId: string) {
    const { data, error } = await supabase.from('tpa_upload_reviews').select('*').eq('upload_id', uploadId);
    if (error) throw error;
    return data as TpaUploadReview[];
  },
};
