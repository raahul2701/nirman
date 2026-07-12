export function SiteConditionsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div className="h-4 w-3/4 rounded bg-muted/50" />
        <div className="h-4 w-3/4 rounded bg-muted/50" />
        <div className="h-4 w-2/3 rounded bg-muted/50" />
        <div className="h-4 w-2/3 rounded bg-muted/50" />
      </div>
      <div className="pt-2 space-y-1.5">
        <div className="h-2.5 w-1/3 rounded-full bg-muted/50" />
        <div className="h-8 w-full rounded bg-muted/50" />
      </div>
    </div>
  );
}