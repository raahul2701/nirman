import { AIRecommendationDTO, AIRecommendationViewModel } from '../config/ai-recommendation.config';

export const mapAIRecommendationDtoToVm = (dto: AIRecommendationDTO): AIRecommendationViewModel => {
  return {
    id: dto.id,
    text: dto.recommendationText,
  };
};