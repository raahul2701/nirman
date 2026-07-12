const SKELETON_ROWS = 3;

export function ProjectStatusSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
        <div key={index} className="space-y-1.5">
          <div className="h-2.5 w-3/5 rounded-full bg-muted/50" />
          <div className="h-2 w-4/5 rounded-full bg-muted/50" />
        </div>
      ))}
    </div>
  );
}