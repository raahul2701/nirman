export function AIRecommendationSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="flex items-start gap-2">
          <div className="h-4 w-4 flex-shrink-0 rounded-full bg-muted/50" />
          <div className="h-3 w-full rounded bg-muted/50" />
        </div>
      ))}
    </div>
  );
}