import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import CallbackPage from './pages/auth/CallbackPage';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import ServiceOrdersPage from './pages/service-orders/ServiceOrdersPage';
import ServiceOrderDetailPage from './pages/service-orders/ServiceOrderDetailPage';
import AssignmentsPage from './pages/assignments/AssignmentsPage';
import AssignmentDetailPage from './pages/assignments/AssignmentDetailPage';
import ProvidersPage from './pages/providers/ProvidersPage';
import CalendarPage from './pages/calendar/CalendarPage';
import TasksPage from './pages/tasks/TasksPage';
import PerformanceDashboardPage from './pages/performance/PerformanceDashboardPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<CallbackPage />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="service-orders" element={<ServiceOrdersPage />} />
          <Route path="service-orders/:id" element={<ServiceOrderDetailPage />} />
          <Route path="assignments" element={<AssignmentsPage />} />
          <Route path="assignments/:id" element={<AssignmentDetailPage />} />
          <Route path="providers" element={<ProvidersPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="performance" element={<PerformanceDashboardPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
