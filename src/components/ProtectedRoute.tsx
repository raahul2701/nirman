import { useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
  requireAuth?: boolean;
}

export function ProtectedRoute({
  children,
  requiredRole = [],
  requireAuth = true
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    if (requireAuth && !user) {
      navigate('/login', {
        state: { from: location.pathname },
        replace: true
      });
      return;
    }

    if (user && requiredRole.length > 0 && profile) {
      const hasRequiredRole = requiredRole.includes(profile.role);
      if (!hasRequiredRole) {
        // Redirect to unauthorized page or dashboard
        navigate('/unauthorized', { replace: true });
        return;
      }
    }
  }, [user, profile, loading, requiredRole, requireAuth, navigate, location]);

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
    return null; // Will redirect in useEffect
  }

  if (user && requiredRole.length > 0 && profile) {
    const hasRequiredRole = requiredRole.includes(profile.role);
    if (!hasRequiredRole) {
      return null; // Will redirect in useEffect
    }
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