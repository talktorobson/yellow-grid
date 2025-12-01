import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ExperienceProvider } from './providers/ExperienceProvider';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import CallbackPage from './pages/auth/CallbackPage';

// Layouts
import UnifiedPortalLayout from './components/layout/UnifiedPortalLayout';
import CustomerLayout from './layouts/CustomerLayout';

// Pages - Service Operator (default) Experience
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import ServiceOrdersPage from './pages/service-orders/ServiceOrdersPage';
import ServiceOrderDetailPage from './pages/service-orders/ServiceOrderDetailPage';
import AssignmentsPage from './pages/assignments/AssignmentsPage';
import AssignmentDetailPage from './pages/assignments/AssignmentDetailPage';
import ProvidersPage from './pages/providers/ProvidersPage';
import CreateProviderPage from './pages/providers/CreateProviderPage';
import CalendarPage from './pages/calendar/CalendarPage';
import TasksPage from './pages/tasks/TasksPage';
import PerformanceDashboardPage from './pages/performance/PerformanceDashboardPage';
import { OperationsGridPage } from './pages/operations';
import NotFoundPage from './pages/NotFoundPage';

// Provider Portal Pages
import {
  ProviderDashboardPage,
  ProviderJobsPage,
  ProviderTeamsPage,
  ProviderFinancialPage,
  ProviderCalendarPage,
  ProviderPerformancePage,
  ProviderSettingsPage,
  ProviderJobDetailPage,
  ProviderTeamDetailPage,
  ProviderMessagesPage,
} from './pages/provider';

// Customer Portal Pages
import {
  CustomerStatusPage,
  CustomerSchedulePage,
  CustomerContractPage,
  CustomerPhotosPage,
  CustomerWCFPage,
  CustomerEvaluatePage,
} from './pages/customer';

// PSM Portal Pages
import {
  PSMDashboardPage,
  PSMPipelinePage,
  PSMProvidersPage,
  PSMCoveragePage,
  PSMProviderDetailPage,
  PSMVerificationPage,
} from './pages/psm';

// Seller Portal Pages
import {
  SellerDashboardPage,
  SellerAvailabilityPage,
  SellerTVReportPage,
  SellerProjectsPage,
  SellerQuotationsPage,
} from './pages/seller';

// Admin Portal Pages
import {
  AdminDashboardPage,
  AdminUsersPage,
  AdminConfigPage,
  AdminRolesPage,
  AdminAuditPage,
  AdminUserDetailPage,
  AdminNotificationsPage,
} from './pages/admin';

// Offer Manager / Catalog Pages
import {
  OfferManagerServicesPage,
  OfferManagerPricingPage,
  OfferManagerChecklistsPage,
  CatalogServiceDetailPage,
} from './pages/catalog';

function App() {
  return (
    <AuthProvider>
      <ExperienceProvider>
        <Toaster position="top-right" richColors />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<CallbackPage />} />

          {/* ============================================================ */}
          {/* ALL PORTALS USE UNIFIED LAYOUT */}
          {/* ============================================================ */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <UnifiedPortalLayout />
              </ProtectedRoute>
            }
          >
            {/* Root redirect to operator dashboard */}
            <Route index element={<Navigate to="/operator/dashboard" replace />} />

            {/* Legacy routes redirect to operator paths */}
            <Route path="dashboard" element={<Navigate to="/operator/dashboard" replace />} />
            <Route path="operations-grid" element={<Navigate to="/operator/grid" replace />} />
            <Route path="service-orders" element={<Navigate to="/operator/orders" replace />} />
            <Route path="service-orders/:id" element={<Navigate to="/operator/orders" replace />} />

            {/* ============================================================ */}
            {/* SERVICE OPERATOR / CONTROL TOWER */}
            {/* ============================================================ */}
            <Route path="operator/dashboard" element={<DashboardPage />} />
            <Route path="operator/grid" element={<OperationsGridPage />} />
            <Route path="operator/orders" element={<ServiceOrdersPage />} />
            <Route path="operator/orders/:id" element={<ServiceOrderDetailPage />} />
            <Route path="operator/assignments" element={<AssignmentsPage />} />
            <Route path="operator/assignments/:id" element={<AssignmentDetailPage />} />
            <Route path="operator/providers" element={<ProvidersPage />} />
            <Route path="operator/providers/new" element={<CreateProviderPage />} />
            <Route path="operator/calendar" element={<CalendarPage />} />
            <Route path="operator/tasks" element={<TasksPage />} />
            <Route path="operator/analytics" element={<AnalyticsPage />} />
            <Route path="operator/performance" element={<PerformanceDashboardPage />} />

            {/* ============================================================ */}
            {/* PROVIDER PORTAL */}
            {/* ============================================================ */}
            <Route path="provider/dashboard" element={<ProviderDashboardPage />} />
            <Route path="provider/jobs" element={<ProviderJobsPage />} />
            <Route path="provider/jobs/:id" element={<ProviderJobDetailPage />} />
            <Route path="provider/calendar" element={<ProviderCalendarPage />} />
            <Route path="provider/teams" element={<ProviderTeamsPage />} />
            <Route path="provider/teams/:id" element={<ProviderTeamDetailPage />} />
            <Route path="provider/financial" element={<ProviderFinancialPage />} />
            <Route path="provider/performance" element={<ProviderPerformancePage />} />
            <Route path="provider/settings" element={<ProviderSettingsPage />} />
            <Route path="provider/messages" element={<ProviderMessagesPage />} />

            {/* ============================================================ */}
            {/* PSM (Provider Success Manager) PORTAL */}
            {/* ============================================================ */}
            <Route path="psm/dashboard" element={<PSMDashboardPage />} />
            <Route path="psm/pipeline" element={<PSMPipelinePage />} />
            <Route path="psm/providers" element={<PSMProvidersPage />} />
            <Route path="psm/providers/:id" element={<PSMProviderDetailPage />} />
            <Route path="psm/coverage" element={<PSMCoveragePage />} />
            <Route path="psm/verification" element={<PSMVerificationPage />} />
            <Route path="psm/analytics" element={<AnalyticsPage />} />

            {/* ============================================================ */}
            {/* SELLER PORTAL */}
            {/* ============================================================ */}
            <Route path="seller/dashboard" element={<SellerDashboardPage />} />
            <Route path="seller/availability" element={<SellerAvailabilityPage />} />
            <Route path="seller/projects" element={<SellerProjectsPage />} />
            <Route path="seller/projects/:id" element={<SellerProjectsPage />} />
            <Route path="seller/reports" element={<SellerTVReportPage />} />
            <Route path="seller/reports/:id" element={<SellerTVReportPage />} />
            <Route path="seller/quotations" element={<SellerQuotationsPage />} />
            <Route path="seller/quotations/:id" element={<SellerQuotationsPage />} />

            {/* ============================================================ */}
            {/* ADMIN PORTAL */}
            {/* ============================================================ */}
            <Route path="admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="admin/users" element={<AdminUsersPage />} />
            <Route path="admin/users/:id" element={<AdminUserDetailPage />} />
            <Route path="admin/roles" element={<AdminRolesPage />} />
            <Route path="admin/notifications" element={<AdminNotificationsPage />} />
            <Route path="admin/config" element={<AdminConfigPage />} />
            <Route path="admin/audit" element={<AdminAuditPage />} />
            <Route path="admin/analytics" element={<AnalyticsPage />} />

            {/* ============================================================ */}
            {/* OFFER MANAGER / CATALOG */}
            {/* ============================================================ */}
            <Route path="catalog/services" element={<OfferManagerServicesPage />} />
            <Route path="catalog/services/:id" element={<CatalogServiceDetailPage />} />
            <Route path="catalog/pricing" element={<OfferManagerPricingPage />} />
            <Route path="catalog/checklists" element={<OfferManagerChecklistsPage />} />
            <Route path="catalog/analytics" element={<AnalyticsPage />} />
          </Route>

          {/* ============================================================ */}
          {/* CUSTOMER PORTAL (deep-link authenticated - separate layout) */}
          {/* ============================================================ */}
          <Route path="/customer/:token" element={<CustomerLayout />}>
            <Route index element={<Navigate to="status" replace />} />
            <Route path="status" element={<CustomerStatusPage />} />
            <Route path="schedule" element={<CustomerSchedulePage />} />
            <Route path="contract" element={<CustomerContractPage />} />
            <Route path="photos" element={<CustomerPhotosPage />} />
            <Route path="wcf" element={<CustomerWCFPage />} />
            <Route path="evaluate" element={<CustomerEvaluatePage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ExperienceProvider>
    </AuthProvider>
  );
}

export default App;
