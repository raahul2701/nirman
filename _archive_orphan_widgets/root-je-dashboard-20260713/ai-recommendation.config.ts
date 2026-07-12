/**
 * Data Transfer Object (DTO) for AI recommendations from the API.
 */
export type AIRecommendationDTO = {
  id: string;
  recommendationText: string;
  confidenceScore: number;
  context: 'WEATHER' | 'SCHEDULE' | 'MATERIAL';
};

/**
 * View Model for AI recommendations, shaped for the UI.
 */
export interface AIRecommendationViewModel {
  id: string;
  text: string;
}