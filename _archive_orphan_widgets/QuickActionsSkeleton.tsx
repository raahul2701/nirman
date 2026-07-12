export function QuickActionsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-[64px] animate-pulse rounded-lg bg-muted/50"
        />
      ))}
    </div>
  );
}