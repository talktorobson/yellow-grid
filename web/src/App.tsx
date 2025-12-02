import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ExperienceProvider } from './providers/ExperienceProvider';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import PortalSelectorPage from './pages/auth/PortalSelectorPage';
import PortalLoginPage from './pages/auth/PortalLoginPage';
import CallbackPage from './pages/auth/CallbackPage';

// Layouts
import UnifiedPortalLayout from './components/layout/UnifiedPortalLayout';
import CustomerLayout from './layouts/CustomerLayout';

// Pages
import NotFoundPage from './pages/NotFoundPage';

// Customer Portal Pages (Keep here as they are separate layout)
import {
  CustomerStatusPage,
  CustomerSchedulePage,
  CustomerContractPage,
  CustomerPhotosPage,
  CustomerWCFPage,
  CustomerEvaluatePage,
} from './pages/customer';

// Modular Routes
import {
  OperatorRoutes,
  ProviderRoutes,
  AdminRoutes,
  PSMRoutes,
  SellerRoutes,
  CatalogRoutes,
} from './routes';

function App() {
  return (
    <AuthProvider>
      <ExperienceProvider>
        <Toaster position="top-right" richColors />
        <Routes>
          {/* ============================================================ */}
          {/* PUBLIC ROUTES - Portal Selection & Login */}
          {/* ============================================================ */}

          {/* Main portal selector */}
          <Route path="/login" element={<PortalSelectorPage />} />

          {/* Individual portal logins */}
          <Route path="/login/:portal" element={<PortalLoginPage />} />

          {/* Legacy login (redirects to selector) */}
          <Route path="/auth/login" element={<Navigate to="/login" replace />} />

          {/* SSO callback */}
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
            {/* MODULAR ROUTES */}
            {/* ============================================================ */}

            {/* Service Operator / Control Tower */}
            <Route path="operator/*" element={<OperatorRoutes />} />

            {/* Provider Portal */}
            <Route path="provider/*" element={<ProviderRoutes />} />

            {/* PSM (Provider Success Manager) Portal */}
            <Route path="psm/*" element={<PSMRoutes />} />

            {/* Seller Portal */}
            <Route path="seller/*" element={<SellerRoutes />} />

            {/* Admin Portal */}
            <Route path="admin/*" element={<AdminRoutes />} />

            {/* Offer Manager / Catalog */}
            <Route path="catalog/*" element={<CatalogRoutes />} />
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
