export function RecentActivitySkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-start gap-4">
          <div className="h-8 w-8 flex-shrink-0 rounded-full bg-muted/50" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/5 rounded bg-muted/50" />
            <div className="h-2 w-4/5 rounded bg-muted/50" />
          </div>
        </div>
      ))}
    </div>
  );
}