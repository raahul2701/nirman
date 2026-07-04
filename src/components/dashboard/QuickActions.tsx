import { memo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type DashboardAction = {
  label: string;
  to: string;
  icon: ReactNode;
  permission?: string; // For future permission checks
  badge?: string | number;
  disabled?: boolean;
};

export const QuickActions = memo(function QuickActions({ actions }: { actions: DashboardAction[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {actions.map((action) => (
        <Link key={`${action.to}-${action.label}`} to={action.to} className="flex min-h-12 items-center gap-2 rounded-lg border border-[#EFE8D4] bg-[#F9F7EF] px-3 py-2 text-xs font-bold text-[#12332D] transition hover:border-[#C89B3C]/50 hover:bg-[#FFFDF7]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#005F56]/15 bg-[#005F56]/8 text-[#005F56]">{action.icon}</span>
          <span>{action.label}</span>
        </Link>
      ))}
    </div>
  );
});
