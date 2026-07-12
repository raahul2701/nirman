import { Cloud, Droplets, Thermometer, Wind } from 'lucide-react';
import { cn } from '../../../../../components/ui/utils';
import { SiteConditionsViewModel } from '../../config/site-conditions.config';
import { SITE_CONDITIONS_STRINGS } from '../../constants/site-conditions.constants';

interface SiteConditionsContentProps {
  conditions: SiteConditionsViewModel;
}

const advisoryVariantClasses = {
  default: 'bg-green-500/10 text-green-700 border-green-500/20',
  warning: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  critical: 'bg-red-500/10 text-red-700 border-red-500/20',
};

export function SiteConditionsContent({ conditions }: SiteConditionsContentProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="flex items-center gap-2"><Thermometer size={14} className="text-muted-foreground" /> {conditions.temperature}</div>
        <div className="flex items-center gap-2"><Droplets size={14} className="text-muted-foreground" /> {conditions.humidity}</div>
        <div className="flex items-center gap-2"><Wind size={14} className="text-muted-foreground" /> {conditions.wind}</div>
        <div className="flex items-center gap-2"><Cloud size={14} className="text-muted-foreground" /> {conditions.rain}</div>
      </div>
      <div className="pt-2">
        <p className="text-xs font-semibold text-muted-foreground mb-1">{SITE_CONDITIONS_STRINGS.WORK_ADVISORY_TITLE}</p>
        <div
          className={cn(
            'rounded-md border p-2 text-xs font-medium',
            advisoryVariantClasses[conditions.workAdvisory.variant]
          )}
        >
          {conditions.workAdvisory.text}
        </div>
      </div>
    </div>
  );
}