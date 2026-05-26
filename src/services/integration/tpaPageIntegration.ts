// Integration layer for TpaPortalPage - adds persistence without rewriting UI
import type { TpaUploadReview } from '../../types/persistence';
import { tpaReviewsService } from '../data/tpaReviewsService';
import { uploadMetadataRepository } from '../persistence/uploadMetadataRepository';
import { useAuth } from '../../contexts/useAuth';
import { useCallback } from 'react';

export function useTpaReviewPersistence() {
  const { user } = useAuth();

  const saveReview = useCallback(
    async (reviewData: {
      files: File[];
      summary: string;
      flags?: string[];
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Save file metadata first
      await Promise.all(
        reviewData.files.map(file =>
          uploadMetadataRepository.create({
            file_name: file.name,
            content_type: file.type,
            size: file.size,
            storage_path: `tpa-uploads/${user.id}/${file.name}`,
            uploaded_by: user.id,
          })
        )
      );

      // Save review
      const review: TpaUploadReview = {
        review: {
          summary: reviewData.summary,
          flags: reviewData.flags || [],
          fileCount: reviewData.files.length,
        },
        reviewer_id: user.id,
        status: 'pending',
      };

      return tpaReviewsService.createReview(review);
    },
    [user]
  );

  return { saveReview };
}
