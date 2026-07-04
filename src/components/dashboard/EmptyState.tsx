import type { ReactNode } from 'react';

type EmptyStateProps = {
  icon?: ReactNode;
  title?: string;
  description: string;
  children?: ReactNode; // Replaces `action` prop for more flexibility
};

export function EmptyState({ icon, title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#CDBD82] bg-[#F9F7EF] px-4 py-6 text-center">
      {icon && <div className="text-[#6C7568]">{icon}</div>}
      {title && <h4 className="mt-2 text-sm font-bold text-[#12332D]">{title}</h4>}
      <p className="mt-1 text-sm text-[#6C7568]">{description}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}