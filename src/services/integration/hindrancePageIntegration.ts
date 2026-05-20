// Integration layer for HindranceRegisterPage - adds persistence without rewriting UI
import type { HindranceEntry } from '../../types/persistence';
import { hindranceService } from '../data/hindranceService';
import { useAuth } from '../../contexts/useAuth';
import { useCallback } from 'react';

export function useHindranceEntryPersistence(projectId: string) {
  const { user } = useAuth();

  const saveEntry = useCallback(
    async (entryData: {
      title: string;
      party: string;
      duration: string;
      location: string;
      description: string;
      delayDays?: number;
      escalation?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const entry: HindranceEntry = {
        project_id: projectId,
        description: entryData.description,
        location: entryData.location
          ? {
              text: entryData.location,
              ...(entryData.location.includes(',') && {
                lat: parseFloat(entryData.location.split(',')[0]),
                lng: parseFloat(entryData.location.split(',')[1]),
              }),
            }
          : undefined,
        severity: (entryData.delayDays || 1) >= 7 ? 'high' : 'medium',
        status: 'open',
        created_by: user.id,
      };

      return hindranceService.createEntry(entry);
    },
    [projectId, user]
  );

  return { saveEntry };
}
