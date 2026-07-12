import {
  Briefcase,
  ChevronDown,
  User,
  CloudSun,
  Bell,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export function JEDashboardHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
      {/* TODO: Implement Project Selector */}
      <div className="flex cursor-pointer items-center gap-4">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-base font-semibold">Current Project Name</h1>
            <p className="text-xs text-muted-foreground">
              Current Workflow Stage
            </p>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="ml-auto flex items-center gap-4">
        {/* TODO: Implement Weather, Notifications, and User Profile */}
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <CloudSun className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8">
          <User className="h-4 w-4" />
          <span className="sr-only">Toggle user menu</span>
        </Button>
      </div>
    </header>
  );
}