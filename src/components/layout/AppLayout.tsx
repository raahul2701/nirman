import { memo, ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { WorkspaceBadge } from '../enterprise/WorkspaceBadge';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

function AppLayoutComponent({ children, title, subtitle }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0D0D0D' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 ml-60 transition-all duration-300">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto p-6">
          <WorkspaceBadge />
          {children}
        </main>
      </div>
    </div>
  );
}

export const AppLayout = memo(AppLayoutComponent);
