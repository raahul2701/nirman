// Integration layer for GisMapPage - adds persistence without rewriting UI
import type { GisSitePin } from '../../types/persistence';
import { gisPinsService } from '../data/gisPinsService';
import { useAuth } from '../../contexts/useAuth';
import { useCallback } from 'react';

export function useGisPinPersistence(projectId: string) {
  const { user } = useAuth();

  const savePin = useCallback(
    async (pinData: {
      label: string;
      type: string;
      lat: number;
      lng: number;
      properties?: Record<string, unknown>;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const pin: GisSitePin = {
        project_id: projectId,
        latitude: pinData.lat,
        longitude: pinData.lng,
        properties: {
          label: pinData.label,
          type: pinData.type,
          ...pinData.properties,
        },
        created_by: user.id,
      };

      return gisPinsService.createPin(pin);
    },
    [projectId, user]
  );

  return { savePin };
}
