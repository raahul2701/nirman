import { MetricRow } from './MetricRow';

interface StatusMetricProps {
  label: string;
  value: number | string;
  valueClassName?: string;
}

export function StatusMetric(props: StatusMetricProps) {
  return <MetricRow {...props} />;
}