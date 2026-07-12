export function TodaysWorkSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-2">
          <div className="h-8 w-8 flex-shrink-0 rounded-md bg-muted/50" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-3/4 rounded bg-muted/50" />
            <div className="h-2 w-1/2 rounded bg-muted/50" />
          </div>
          <div className="h-5 w-16 rounded-full bg-muted/50" />
          <div className="h-8 w-20 rounded-md bg-muted/50" />
        </div>
      ))}
    </div>
  );
}