import { AppLayout } from '../../../../components/layout/AppLayout';
import { JEDashboardHeader } from './components/Header/JEDashboardHeader';
import { jeNavigation } from '../config/navigation';
import { TodaysWorkWidget } from './components/TodaysWork/TodaysWorkWidget';
import { QuickActionsPanel } from './components/QuickActions/QuickActionsPanel';
import { PendingActionsWidget } from './components/PendingActions/PendingActionsWidget';
import { SiteConditionsWidget } from './components/SiteConditions/SiteConditionsWidget';
import { ProjectStatusWidget } from './components/ProjectStatus/ProjectStatusWidget';
import { RecentActivityWidget } from './components/RecentActivity/RecentActivityWidget';
import { AIRecommendationWidget } from './components/AIRecommendation/AIRecommendationWidget';

export function JEDashboardPage() {
  return (
    <AppLayout
      title="JE Dashboard"
      subtitle="Field Execution Command Center"
      sidebarNav={jeNavigation}
    >
      <div className="flex min-h-screen w-full flex-col">
        <JEDashboardHeader />
        <main className="grid flex-1 auto-rows-max gap-4 p-4 sm:p-6 md:grid-cols-3 lg:grid-cols-4">
          <TodaysWorkWidget />
          <QuickActionsPanel />
          <PendingActionsWidget />
          <ProjectStatusWidget />
          <SiteConditionsWidget />
          <RecentActivityWidget />
          <AIRecommendationWidget />
        </main>
      </div>
    </AppLayout>
  );
}