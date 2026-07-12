interface MetricRowProps {
  label: string;
  value: number | string;
  valueClassName?: string;
}

export function MetricRow({ label, value, valueClassName }: MetricRowProps) {
  return (
    <span>
      {label}: <span className={`font-semibold text-card-foreground ${valueClassName ?? ''}`}>{value}</span>
    </span>
  );
}
