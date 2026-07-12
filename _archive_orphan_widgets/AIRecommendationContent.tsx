import { Lightbulb } from 'lucide-react';
import { AIRecommendationViewModel } from '../../config/ai-recommendation.config';

interface AIRecommendationContentProps {
  recommendations: AIRecommendationViewModel[];
}

export function AIRecommendationContent({ recommendations }: AIRecommendationContentProps) {
  return (
    <div className="space-y-2">
      {recommendations.map((rec) => (
        <div key={rec.id} className="flex items-start gap-2 text-sm">
          <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-500" />
          <p className="text-muted-foreground">{rec.text}</p>
        </div>
      ))}
    </div>
  );
}