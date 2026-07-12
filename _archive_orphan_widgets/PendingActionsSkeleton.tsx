export function PendingActionsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="h-8 w-8 flex-shrink-0 rounded-full bg-muted/50" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-4/5 rounded bg-muted/50" />
            <div className="h-2 w-1/2 rounded bg-muted/50" />
          </div>
        </div>
      ))}
    </div>
  );
}