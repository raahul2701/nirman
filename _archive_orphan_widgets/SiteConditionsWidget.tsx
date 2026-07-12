import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card';
import { EmptyState } from '../../../../../components/dashboard/EmptyState';
import { useSiteConditions } from '../../hooks/useSiteConditions';
import { SiteConditionsContent } from './SiteConditionsContent';
import { SiteConditionsSkeleton } from './SiteConditionsSkeleton';
import { SITE_CONDITIONS_STRINGS } from '../../constants/site-conditions.constants';

export function SiteConditionsWidget() {
  // TODO: Consume latitude and longitude from a ProjectContext
  const { conditions, loading, error, refresh } = useSiteConditions(28.6139, 77.2090);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site Conditions</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <SiteConditionsSkeleton />
        ) : error ? (
          <EmptyState description={error} onRetry={refresh} />
        ) : conditions ? (
          <SiteConditionsContent conditions={conditions} />
        ) : (
          <EmptyState description={SITE_CONDITIONS_STRINGS.NO_DATA} />
        )}
      </CardContent>
    </Card>
  );
}