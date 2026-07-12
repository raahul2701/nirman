import { useState, useEffect, useCallback } from 'react';
import { SiteConditionsViewModel } from '../config/site-conditions.config';
import { SITE_CONDITIONS_STRINGS } from '../constants/site-conditions.constants';
import { mapSiteConditionsDtoToVm } from '../mappers/site-conditions.mapper';
import { siteConditionsService } from '../services/site-conditions.service';

export const useSiteConditions = (latitude?: number, longitude?: number) => {
  const [conditions, setConditions] = useState<SiteConditionsViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConditions = useCallback(async () => {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const dto = await siteConditionsService.getSiteConditions(latitude, longitude);
      const viewModel = mapSiteConditionsDtoToVm(dto);
      setConditions(viewModel);
    } catch {
      setError(SITE_CONDITIONS_STRINGS.ERROR_LOADING);
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    void fetchConditions();
  }, [fetchConditions]);

  return { conditions, loading, error, refresh: fetchConditions };
};
