import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastProvider } from './components/ui/Toast';
// Lazy load all pages for performance
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((mod) => ({ default: mod.LoginPage })));
const SignupPage = lazy(() => import('./pages/auth/SignupPage').then((mod) => ({ default: mod.SignupPage })));
const OnboardingPage = lazy(() => import('./pages/auth/OnboardingPage').then((mod) => ({ default: mod.OnboardingPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((mod) => ({ default: mod.DashboardPage })));
const ProblemsPage = lazy(() => import('./pages/ProblemsPage').then((mod) => ({ default: mod.ProblemsPage })));
const WorkersPage = lazy(() => import('./pages/WorkersPage').then((mod) => ({ default: mod.WorkersPage })));
const SurveysPage = lazy(() => import('./pages/SurveysPage').then((mod) => ({ default: mod.SurveysPage })));
const DesignPage = lazy(() => import('./pages/DesignPage').then((mod) => ({ default: mod.DesignPage })));
const InventoryPage = lazy(() => import('./pages/InventoryPage').then((mod) => ({ default: mod.InventoryPage })));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then((mod) => ({ default: mod.ProjectsPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((mod) => ({ default: mod.ReportsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((mod) => ({ default: mod.SettingsPage })));
const GovDashboardPage = lazy(() => import('./pages/govtrack/GovDashboardPage').then((mod) => ({ default: mod.GovDashboardPage })));
const GovProjectsPage = lazy(() => import('./pages/govtrack/GovProjectsPage').then((mod) => ({ default: mod.GovProjectsPage })));
const GovProjectDetailPage = lazy(() => import('./pages/govtrack/GovProjectDetailPage').then((mod) => ({ default: mod.GovProjectDetailPage })));
const UploadWorkPage = lazy(() => import('./pages/govtrack/UploadWorkPage').then((mod) => ({ default: mod.UploadWorkPage })));
const PaymentsPage = lazy(() => import('./pages/govtrack/PaymentsPage').then((mod) => ({ default: mod.PaymentsPage })));
const InspectionsPage = lazy(() => import('./pages/govtrack/InspectionsPage').then((mod) => ({ default: mod.InspectionsPage })));
const GovReportsPage = lazy(() => import('./pages/govtrack/GovReportsPage').then((mod) => ({ default: mod.GovReportsPage })));
const BlacklistPage = lazy(() => import('./pages/BlacklistPage').then((mod) => ({ default: mod.BlacklistPage })));
const BankGuaranteesPage = lazy(() => import('./pages/BankGuaranteesPage').then((mod) => ({ default: mod.BankGuaranteesPage })));
const DrawingComparePage = lazy(() => import('./pages/DrawingComparePage').then((mod) => ({ default: mod.DrawingComparePage })));
const MaterialTestsPage = lazy(() => import('./pages/MaterialTestsPage').then((mod) => ({ default: mod.MaterialTestsPage })));
const TenderLifecyclePage = lazy(() => import('./pages/TenderLifecyclePage').then((mod) => ({ default: mod.TenderLifecyclePage })));
const DlpTrackerPage = lazy(() => import('./pages/DlpTrackerPage').then((mod) => ({ default: mod.DlpTrackerPage })));
const WeatherLoggerPage = lazy(() => import('./pages/WeatherLoggerPage').then((mod) => ({ default: mod.WeatherLoggerPage })));
const ExtensionsPage = lazy(() => import('./pages/ExtensionsPage').then((mod) => ({ default: mod.ExtensionsPage })));
const WhatsAppBotPage = lazy(() => import('./pages/WhatsAppBotPage').then((mod) => ({ default: mod.WhatsAppBotPage })));
const GisMapPage = lazy(() => import('./pages/GisMapPage').then((mod) => ({ default: mod.GisMapPage })));
const BudgetProgressPage = lazy(() => import('./pages/BudgetProgressPage').then((mod) => ({ default: mod.BudgetProgressPage })));
const TpaPortalPage = lazy(() => import('./pages/TpaPortalPage').then((mod) => ({ default: mod.TpaPortalPage })));
const HindranceRegisterPage = lazy(() => import('./pages/HindranceRegisterPage').then((mod) => ({ default: mod.HindranceRegisterPage })));
const DisputesPage = lazy(() => import('./pages/DisputesPage').then((mod) => ({ default: mod.DisputesPage })));
const DieselDashboard = lazy(() => import('./pages/diesel/DieselDashboard').then((mod) => ({ default: mod.DieselDashboard })));
const DieselIssue = lazy(() => import('./pages/diesel/DieselIssue').then((mod) => ({ default: mod.DieselIssue })));
const DieselAlerts = lazy(() => import('./pages/diesel/DieselAlerts').then((mod) => ({ default: mod.DieselAlerts })));
const DieselReports = lazy(() => import('./pages/diesel/DieselReports').then((mod) => ({ default: mod.DieselReports })));
const MaintenanceDashboard = lazy(() => import('./pages/maintenance/MaintenanceDashboard').then((mod) => ({ default: mod.MaintenanceDashboard })));
const ServiceSchedules = lazy(() => import('./pages/maintenance/ServiceSchedules').then((mod) => ({ default: mod.ServiceSchedules })));
const AdminSystemPage = lazy(() => import('./pages/AdminSystemPage').then((mod) => ({ default: mod.AdminSystemPage })));
const AuditLogsPage = lazy(() => import('./pages/admin/AuditLogsPage').then((mod) => ({ default: mod.AuditLogsPage })));

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
      <Route path="/blacklist" element={<ProtectedRoute><OnboardingGuard><BlacklistPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/bank-guarantees" element={<ProtectedRoute><OnboardingGuard><BankGuaranteesPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/drawing-compare" element={<ProtectedRoute><OnboardingGuard><DrawingComparePage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/material-tests" element={<ProtectedRoute><OnboardingGuard><MaterialTestsPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/tender-lifecycle" element={<ProtectedRoute><OnboardingGuard><TenderLifecyclePage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/dlp-tracker" element={<ProtectedRoute><OnboardingGuard><DlpTrackerPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/weather-log" element={<ProtectedRoute><OnboardingGuard><WeatherLoggerPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/extensions" element={<ProtectedRoute><OnboardingGuard><ExtensionsPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/whatsapp-bot" element={<ProtectedRoute><OnboardingGuard><WhatsAppBotPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/gis-map" element={<ProtectedRoute><OnboardingGuard><GisMapPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/budget-progress" element={<ProtectedRoute><OnboardingGuard><BudgetProgressPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/tpa-portal" element={<ProtectedRoute><OnboardingGuard><TpaPortalPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/hindrance-register" element={<ProtectedRoute><OnboardingGuard><HindranceRegisterPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/disputes" element={<ProtectedRoute><OnboardingGuard><DisputesPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/diesel" element={<ProtectedRoute><OnboardingGuard><DieselDashboard /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/diesel/new" element={<ProtectedRoute><OnboardingGuard><DieselIssue /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/diesel/alerts" element={<ProtectedRoute><OnboardingGuard><DieselAlerts /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/diesel/reports" element={<ProtectedRoute><OnboardingGuard><DieselReports /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/materials/reconciliation" element={<ProtectedRoute><OnboardingGuard><MaterialReconciliation /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/materials/variance" element={<ProtectedRoute><OnboardingGuard><WastageAlerts /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/materials/theft-alerts" element={<ProtectedRoute><OnboardingGuard><WastageAlerts /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/labour/payments" element={<ProtectedRoute><OnboardingGuard><LabourPayments /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/labour/advances" element={<ProtectedRoute><OnboardingGuard><LabourAdvances /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/labour/settlements" element={<ProtectedRoute><OnboardingGuard><LabourSettlements /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/recovery/dashboard" element={<ProtectedRoute><OnboardingGuard><PaymentRecovery /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/recovery/followups" element={<ProtectedRoute><OnboardingGuard><DepartmentFollowups /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/maintenance" element={<ProtectedRoute><OnboardingGuard><MaintenanceDashboard /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/maintenance/breakdowns" element={<ProtectedRoute><OnboardingGuard><BreakdownReports /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/maintenance/schedule" element={<ProtectedRoute><OnboardingGuard><ServiceSchedules /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/admin/audit-logs" element={<ProtectedRoute><OnboardingGuard><AuditLogsPage /></OnboardingGuard></ProtectedRoute>} />
      <Route path="/admin/system" element={<ProtectedRoute><OnboardingGuard><AdminSystemPage /></OnboardingGuard></ProtectedRoute>} />
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
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D0D0D' }}>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-[#FF6B00] border-t-transparent animate-spin" />
                  <p className="text-[#606060] text-sm">Loading NIRMAN AI...</p>
                </div>
              </div>
            }>
              <AppRoutes />
            </Suspense>
          </NotificationProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
