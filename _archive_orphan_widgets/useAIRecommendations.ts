import { useState, useEffect, useCallback } from 'react';
import { AIRecommendationViewModel } from '../config/ai-recommendation.config';
import { AI_RECOMMENDATION_STRINGS } from '../constants/ai-recommendation.constants';
import { mapAIRecommendationDtoToVm } from '../mappers/ai-recommendation.mapper';
import { aiRecommendationService } from '../services/ai-recommendation.service';

export const useAIRecommendations = (projectId?: string) => {
  const [recommendations, setRecommendations] = useState<AIRecommendationViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const dtos = await aiRecommendationService.getRecommendations(projectId);
      const viewModels = dtos.map(mapAIRecommendationDtoToVm);
      setRecommendations(viewModels);
    } catch {
      setError(AI_RECOMMENDATION_STRINGS.ERROR_LOADING);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchRecommendations();
  }, [fetchRecommendations]);

  return { recommendations, loading, error, refresh: fetchRecommendations };
};
