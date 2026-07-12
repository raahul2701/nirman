interface ProjectMetricProgressProps {
  label: string;
  value: number;
}

export function ProjectMetricProgress({ label, value }: ProjectMetricProgressProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        <span>{clampedValue}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${clampedValue}%` }} />
      </div>
    </div>
  );
}