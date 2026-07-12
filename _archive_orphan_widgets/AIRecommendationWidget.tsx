import { Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card';
import { EmptyState } from '../../../../../components/dashboard/EmptyState';
import { useAIRecommendations } from '../../hooks/useAIRecommendations';
import { AIRecommendationContent } from './AIRecommendationContent';
import { AIRecommendationSkeleton } from './AIRecommendationSkeleton';
import { AI_RECOMMENDATION_STRINGS } from '../../constants/ai-recommendation.constants';

export function AIRecommendationWidget() {
  // TODO: Consume projectId from a ProjectContext
  const { recommendations, loading, error, refresh } = useAIRecommendations('mock-project-id');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain size={16} className="text-blue-500" />
          <span>AI Recommendations</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <AIRecommendationSkeleton />
        ) : error ? (
          <EmptyState description={error} onRetry={refresh} />
        ) : recommendations.length > 0 ? (
          <AIRecommendationContent recommendations={recommendations} />
        ) : (
          <EmptyState description={AI_RECOMMENDATION_STRINGS.NO_DATA} />
        )}
      </CardContent>
    </Card>
  );
}