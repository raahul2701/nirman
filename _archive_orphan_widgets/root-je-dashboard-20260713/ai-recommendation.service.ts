import { AIRecommendationDTO } from '../config/ai-recommendation.config';

const mockRecommendations: AIRecommendationDTO[] = [
  {
    id: 'rec-1',
    recommendationText: 'Concrete pour for Block C should be done before 2 PM due to rain forecast.',
    confidenceScore: 0.92,
    context: 'WEATHER',
  },
  {
    id: 'rec-2',
    recommendationText: 'Cement stock is sufficient for only 2 more days of planned work. Raise a new material request.',
    confidenceScore: 0.88,
    context: 'MATERIAL',
  },
];

export const aiRecommendationService = {
  getRecommendations: async (projectId: string): Promise<AIRecommendationDTO[]> => {
    // TODO(API): Replace with an actual API call to the AI service for the given project.
    void projectId;
    return Promise.resolve(mockRecommendations);
  },
};
