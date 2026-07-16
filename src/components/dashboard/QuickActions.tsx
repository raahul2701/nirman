import { memo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type DashboardAction = {
  label: string;
  to: string;
  icon: ReactNode;
  permission?: string;
  badge?: string | number;
  disabled?: boolean;
  disabledReason?: string;
};

export const QuickActions = memo(function QuickActions({ actions }: { actions: DashboardAction[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {actions.map((action) => {
        const content = (
          <>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#005F56]/15 bg-[#005F56]/8 text-[#005F56]">{action.icon}</span>
            <span>{action.label}</span>
          </>
        );

        if (action.disabled) {
          return (
            <div key={`${action.to}-${action.label}`}>
              <button type="button" disabled className="flex min-h-12 w-full items-center gap-2 rounded-lg border border-[#EFE8D4] bg-[#F9F7EF] px-3 py-2 text-xs font-bold text-[#6C7568] opacity-70">
                {content}
              </button>
              {action.disabledReason && <p className="mt-1 text-[10px] text-[#6B5A1E]">{action.disabledReason}</p>}
            </div>
          );
        }

        return (
          <Link key={`${action.to}-${action.label}`} to={action.to} className="flex min-h-12 items-center gap-2 rounded-lg border border-[#EFE8D4] bg-[#F9F7EF] px-3 py-2 text-xs font-bold text-[#12332D] transition hover:border-[#C89B3C]/50 hover:bg-[#FFFDF7]">
            {content}
          </Link>
        );
      })}
    </div>
  );
});