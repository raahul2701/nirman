import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { Loader2 } from 'lucide-react';
import { hasPermission, type Permission } from '../services/auth/rbac';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
  requiredPermission?: Permission;
  requireAuth?: boolean;
}

const DEFAULT_REQUIRED_ROLES: string[] = [];

export function ProtectedRoute({
  children,
  requiredRole = DEFAULT_REQUIRED_ROLES,
  requiredPermission,
  requireAuth = true
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: '#FF6B00' }} />
          <p className="text-[#606060]">Loading...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (user && requiredRole.length > 0 && profile) {
    const hasRequiredRole = requiredRole.includes(profile.role);
    if (!hasRequiredRole) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  if (user && requiredPermission && !hasPermission(profile, requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) return null;
  if (profile && !profile.onboarding_complete) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}

// Role-based route components
export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole={['admin', 'super_admin']}>
      {children}
    </ProtectedRoute>
  );
}

export function ContractorRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole={['contractor', 'admin', 'super_admin']}>
      {children}
    </ProtectedRoute>
  );
}

export function GovRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole={['gov_official', 'admin', 'super_admin']}>
      {children}
    </ProtectedRoute>
  );
}
