import { lazy } from 'react';
import { Navigate, Outlet, RouteObject, useRoutes } from 'react-router-dom';
import { OnboardingGuard, ProtectedRoute } from '../components/ProtectedRoute';

const LoginPage = lazy(() => import('../pages/auth/LoginPage').then((mod) => ({ default: mod.LoginPage })));
const SignupPage = lazy(() => import('../pages/auth/SignupPage').then((mod) => ({ default: mod.SignupPage })));
const OnboardingPage = lazy(() => import('../pages/auth/OnboardingPage').then((mod) => ({ default: mod.OnboardingPage })));
const DashboardPage = lazy(() => import('../pages/DashboardPage').then((mod) => ({ default: mod.DashboardPage })));
const ProblemsPage = lazy(() => import('../pages/ProblemsPage').then((mod) => ({ default: mod.ProblemsPage })));
const WorkersPage = lazy(() => import('../pages/WorkersPage').then((mod) => ({ default: mod.WorkersPage })));
const SurveysPage = lazy(() => import('../pages/SurveysPage').then((mod) => ({ default: mod.SurveysPage })));
const DesignPage = lazy(() => import('../pages/DesignPage').then((mod) => ({ default: mod.DesignPage })));
const InventoryPage = lazy(() => import('../pages/InventoryPage').then((mod) => ({ default: mod.InventoryPage })));
const ProjectsPage = lazy(() => import('../pages/ProjectsPage').then((mod) => ({ default: mod.ProjectsPage })));
const ReportsPage = lazy(() => import('../pages/ReportsPage').then((mod) => ({ default: mod.ReportsPage })));
const SettingsPage = lazy(() => import('../pages/SettingsPage').then((mod) => ({ default: mod.SettingsPage })));
const GovDashboardPage = lazy(() => import('../pages/govtrack/GovDashboardPage').then((mod) => ({ default: mod.GovDashboardPage })));
const GovProjectsPage = lazy(() => import('../pages/govtrack/GovProjectsPage').then((mod) => ({ default: mod.GovProjectsPage })));
const GovProjectDetailPage = lazy(() => import('../pages/govtrack/GovProjectDetailPage').then((mod) => ({ default: mod.GovProjectDetailPage })));
const UploadWorkPage = lazy(() => import('../pages/govtrack/UploadWorkPage').then((mod) => ({ default: mod.UploadWorkPage })));
const PaymentsPage = lazy(() => import('../pages/govtrack/PaymentsPage').then((mod) => ({ default: mod.PaymentsPage })));
const InspectionsPage = lazy(() => import('../pages/govtrack/InspectionsPage').then((mod) => ({ default: mod.InspectionsPage })));
const GovReportsPage = lazy(() => import('../pages/govtrack/GovReportsPage').then((mod) => ({ default: mod.GovReportsPage })));
const BlacklistPage = lazy(() => import('../pages/BlacklistPage').then((mod) => ({ default: mod.BlacklistPage })));
const BankGuaranteesPage = lazy(() => import('../pages/BankGuaranteesPage').then((mod) => ({ default: mod.BankGuaranteesPage })));
const DrawingComparePage = lazy(() => import('../pages/DrawingComparePage').then((mod) => ({ default: mod.DrawingComparePage })));
const MaterialTestsPage = lazy(() => import('../pages/MaterialTestsPage').then((mod) => ({ default: mod.MaterialTestsPage })));
const MaterialReconciliation = lazy(() => import('../pages/materials/MaterialReconciliation').then((mod) => ({ default: mod.MaterialReconciliation })));
const WastageAlerts = lazy(() => import('../pages/materials/WastageAlerts').then((mod) => ({ default: mod.WastageAlerts })));
const TenderLifecyclePage = lazy(() => import('../pages/TenderLifecyclePage').then((mod) => ({ default: mod.TenderLifecyclePage })));
const DlpTrackerPage = lazy(() => import('../pages/DlpTrackerPage').then((mod) => ({ default: mod.DlpTrackerPage })));
const WeatherLoggerPage = lazy(() => import('../pages/WeatherLoggerPage').then((mod) => ({ default: mod.WeatherLoggerPage })));
const ExtensionsPage = lazy(() => import('../pages/ExtensionsPage').then((mod) => ({ default: mod.ExtensionsPage })));
const WhatsAppBotPage = lazy(() => import('../pages/WhatsAppBotPage').then((mod) => ({ default: mod.WhatsAppBotPage })));
const GisMapPage = lazy(() => import('../pages/GisMapPage').then((mod) => ({ default: mod.GisMapPage })));
const BudgetProgressPage = lazy(() => import('../pages/BudgetProgressPage').then((mod) => ({ default: mod.BudgetProgressPage })));
const TpaPortalPage = lazy(() => import('../pages/TpaPortalPage').then((mod) => ({ default: mod.TpaPortalPage })));
const HindranceRegisterPage = lazy(() => import('../pages/HindranceRegisterPage').then((mod) => ({ default: mod.HindranceRegisterPage })));
const DisputesPage = lazy(() => import('../pages/DisputesPage').then((mod) => ({ default: mod.DisputesPage })));
const DieselDashboard = lazy(() => import('../pages/diesel/DieselDashboard').then((mod) => ({ default: mod.DieselDashboard })));
const DieselIssue = lazy(() => import('../pages/diesel/DieselIssue').then((mod) => ({ default: mod.DieselIssue })));
const DieselAlerts = lazy(() => import('../pages/diesel/DieselAlerts').then((mod) => ({ default: mod.DieselAlerts })));
const DieselReports = lazy(() => import('../pages/diesel/DieselReports').then((mod) => ({ default: mod.DieselReports })));
const MaintenanceDashboard = lazy(() => import('../pages/maintenance/MaintenanceDashboard').then((mod) => ({ default: mod.MaintenanceDashboard })));
const ServiceSchedules = lazy(() => import('../pages/maintenance/ServiceSchedules').then((mod) => ({ default: mod.ServiceSchedules })));
const LabourPayments = lazy(() => import('../pages/labour/LabourPayments').then((mod) => ({ default: mod.LabourPayments })));
const LabourAdvances = lazy(() => import('../pages/labour/LabourAdvances').then((mod) => ({ default: mod.LabourAdvances })));
const LabourSettlements = lazy(() => import('../pages/labour/LabourSettlements').then((mod) => ({ default: mod.LabourSettlements })));
const PaymentRecovery = lazy(() => import('../pages/recovery/PaymentRecovery').then((mod) => ({ default: mod.PaymentRecovery })));
const DepartmentFollowups = lazy(() => import('../pages/recovery/DepartmentFollowups').then((mod) => ({ default: mod.DepartmentFollowups })));
const BreakdownReports = lazy(() => import('../pages/maintenance/BreakdownReports').then((mod) => ({ default: mod.BreakdownReports })));
const AdminSystemPage = lazy(() => import('../pages/AdminSystemPage').then((mod) => ({ default: mod.AdminSystemPage })));
const AuditLogsPage = lazy(() => import('../pages/admin/AuditLogsPage').then((mod) => ({ default: mod.AuditLogsPage })));

const protectedTree = (
  <ProtectedRoute>
    <OnboardingGuard>
      <Outlet />
    </OnboardingGuard>
  </ProtectedRoute>
);

const routes: RouteObject[] = [
  { path: 'login', element: <LoginPage /> },
  { path: 'signup', element: <SignupPage /> },
  { path: 'onboarding', element: <ProtectedRoute><OnboardingPage /></ProtectedRoute> },
  { path: 'dashboard', element: <ProtectedRoute><OnboardingGuard><DashboardPage /></OnboardingGuard></ProtectedRoute> },
  { path: 'problems', element: <ProtectedRoute><OnboardingGuard><ProblemsPage /></OnboardingGuard></ProtectedRoute> },
  { path: 'workers', element: <ProtectedRoute><OnboardingGuard><WorkersPage /></OnboardingGuard></ProtectedRoute> },
  { path: 'surveys', element: <ProtectedRoute><OnboardingGuard><SurveysPage /></OnboardingGuard></ProtectedRoute> },
  { path: 'design', element: <ProtectedRoute><OnboardingGuard><DesignPage /></OnboardingGuard></ProtectedRoute> },
  { path: 'inventory', element: <ProtectedRoute><OnboardingGuard><InventoryPage /></OnboardingGuard></ProtectedRoute> },
  { path: 'projects', element: <ProtectedRoute><OnboardingGuard><ProjectsPage /></OnboardingGuard></ProtectedRoute> },
  { path: 'reports', element: <ProtectedRoute><OnboardingGuard><ReportsPage /></OnboardingGuard></ProtectedRoute> },
  { path: 'settings', element: <ProtectedRoute><OnboardingGuard><SettingsPage /></OnboardingGuard></ProtectedRoute> },
  {
    path: 'govtrack',
    element: protectedTree,
    children: [
      { index: true, element: <GovDashboardPage /> },
      { path: 'projects', element: <GovProjectsPage /> },
      { path: 'projects/new', element: <GovProjectsPage /> },
      { path: 'projects/:id', element: <GovProjectDetailPage /> },
      { path: 'upload', element: <UploadWorkPage /> },
      { path: 'payments', element: <PaymentsPage /> },
      { path: 'inspect', element: <InspectionsPage /> },
      { path: 'inspect/:id', element: <InspectionsPage /> },
      { path: 'reports', element: <GovReportsPage /> },
    ],
  },
  { path: 'blacklist', element: <ProtectedRoute><OnboardingGuard><BlacklistPage /></OnboardingGuard></ProtectedRoute> },
  { path: 'bank-guarantees', element: <ProtectedRoute><OnboardingGuard><BankGuaranteesPage /></OnboardingGuard></ProtectedRoute> },
  { path: 'drawing-compare', element: <ProtectedRoute><OnboardingGuard><DrawingComparePage /></OnboardingGuard></ProtectedRoute> },
  { path: 'material-tests', element: <ProtectedRoute><OnboardingGuard><MaterialTestsPage /></OnboardingGuard></ProtectedRoute> },
  {
    path: 'materials',
    element: protectedTree,
    children: [
      { path: 'reconciliation', element: <MaterialReconciliation /> },
      { path: 'variance', element: <WastageAlerts /> },
      { path: 'theft-alerts', element: <WastageAlerts /> },
    ],
  },
  { path: 'tender-lifecycle', element: <ProtectedRoute><OnboardingGuard><TenderLifecyclePage /></OnboardingGuard></ProtectedRoute> },
  { path: 'dlp-tracker', element: <ProtectedRoute><OnboardingGuard><DlpTrackerPage /></OnboardingGuard></ProtectedRoute> },
  { path: 'weather-log', element: <ProtectedRoute><OnboardingGuard><WeatherLoggerPage /></OnboardingGuard></ProtectedRoute> },
  { path: 'extensions', element: <ProtectedRoute><OnboardingGuard><ExtensionsPage /></OnboardingGuard></ProtectedRoute> },
  { path: 'whatsapp-bot', element: <ProtectedRoute><OnboardingGuard><WhatsAppBotPage /></OnboardingGuard></ProtectedRoute> },
  { path: 'gis-map', element: <ProtectedRoute><OnboardingGuard><GisMapPage /></OnboardingGuard></ProtectedRoute> },
  { path: 'budget-progress', element: <ProtectedRoute><OnboardingGuard><BudgetProgressPage /></OnboardingGuard></ProtectedRoute> },
  { path: 'tpa-portal', element: <ProtectedRoute><OnboardingGuard><TpaPortalPage /></OnboardingGuard></ProtectedRoute> },
  { path: 'hindrance-register', element: <ProtectedRoute><OnboardingGuard><HindranceRegisterPage /></OnboardingGuard></ProtectedRoute> },
  { path: 'disputes', element: <ProtectedRoute><OnboardingGuard><DisputesPage /></OnboardingGuard></ProtectedRoute> },
  {
    path: 'diesel',
    element: protectedTree,
    children: [
      { index: true, element: <DieselDashboard /> },
      { path: 'new', element: <DieselIssue /> },
      { path: 'alerts', element: <DieselAlerts /> },
      { path: 'reports', element: <DieselReports /> },
    ],
  },
  {
    path: 'labour',
    element: protectedTree,
    children: [
      { path: 'payments', element: <LabourPayments /> },
      { path: 'advances', element: <LabourAdvances /> },
      { path: 'settlements', element: <LabourSettlements /> },
    ],
  },
  {
    path: 'recovery',
    element: protectedTree,
    children: [
      { path: 'dashboard', element: <PaymentRecovery /> },
      { path: 'followups', element: <DepartmentFollowups /> },
    ],
  },
  {
    path: 'maintenance',
    element: protectedTree,
    children: [
      { index: true, element: <MaintenanceDashboard /> },
      { path: 'breakdowns', element: <BreakdownReports /> },
      { path: 'schedule', element: <ServiceSchedules /> },
    ],
  },
  {
    path: 'admin',
    element: protectedTree,
    children: [
      { path: 'audit-logs', element: <AuditLogsPage /> },
      { path: 'system', element: <AdminSystemPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
];

export function AppRoutes() {
  return useRoutes(routes as RouteObject[]);
}
