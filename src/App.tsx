import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastProvider } from './components/ui/Toast';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { OnboardingPage } from './pages/auth/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProblemsPage } from './pages/ProblemsPage';
import { WorkersPage } from './pages/WorkersPage';
import { SurveysPage } from './pages/SurveysPage';
import { DesignPage } from './pages/DesignPage';
import { InventoryPage } from './pages/InventoryPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { GovDashboardPage } from './pages/govtrack/GovDashboardPage';
import { GovProjectsPage } from './pages/govtrack/GovProjectsPage';
import { GovProjectDetailPage } from './pages/govtrack/GovProjectDetailPage';
import { UploadWorkPage } from './pages/govtrack/UploadWorkPage';
import { PaymentsPage } from './pages/govtrack/PaymentsPage';
import { InspectionsPage } from './pages/govtrack/InspectionsPage';
import { GovReportsPage } from './pages/govtrack/GovReportsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D0D0D' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#FF6B00] border-t-transparent animate-spin" />
        <p className="text-[#606060] text-sm">Loading NIRMAN AI...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (profile && !profile.onboarding_complete) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <SignupPage />} />
      <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><OnboardingGuard><DashboardPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/problems" element={<ProtectedRoute><OnboardingGuard><ProblemsPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/workers" element={<ProtectedRoute><OnboardingGuard><WorkersPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/surveys" element={<ProtectedRoute><OnboardingGuard><SurveysPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/design" element={<ProtectedRoute><OnboardingGuard><DesignPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><OnboardingGuard><InventoryPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><OnboardingGuard><ProjectsPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><OnboardingGuard><ReportsPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><OnboardingGuard><SettingsPage /></OnboardingGuard></ProtectedRoute>} />
      {/* GovTrack Pro */}
      <Route path="/govtrack" element={<ProtectedRoute><OnboardingGuard><GovDashboardPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/govtrack/projects" element={<ProtectedRoute><OnboardingGuard><GovProjectsPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/govtrack/projects/new" element={<ProtectedRoute><OnboardingGuard><GovProjectsPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/govtrack/projects/:id" element={<ProtectedRoute><OnboardingGuard><GovProjectDetailPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/govtrack/upload" element={<ProtectedRoute><OnboardingGuard><UploadWorkPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/govtrack/payments" element={<ProtectedRoute><OnboardingGuard><PaymentsPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/govtrack/inspect" element={<ProtectedRoute><OnboardingGuard><InspectionsPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/govtrack/inspect/:id" element={<ProtectedRoute><OnboardingGuard><InspectionsPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/govtrack/reports" element={<ProtectedRoute><OnboardingGuard><GovReportsPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
