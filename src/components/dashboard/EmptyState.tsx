import type { ReactNode } from 'react';

type EmptyStateProps = {
  icon?: ReactNode;
  title?: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
};

export function EmptyState({ icon, title, description, actionLabel, onAction, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#CDBD82] bg-[#F9F7EF] px-4 py-6 text-center">
      {icon && <div className="text-[#6C7568]">{icon}</div>}
      {title && <h4 className="mt-2 text-sm font-bold text-[#12332D]">{title}</h4>}
      <p className="mt-1 text-sm text-[#6C7568]">{description}</p>
      {(actionLabel && onAction) ? (
        <button type="button" onClick={onAction} className="mt-4 rounded-md bg-[#12332D] px-3 py-2 text-sm font-medium text-white">
          {actionLabel}
        </button>
      ) : null}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}