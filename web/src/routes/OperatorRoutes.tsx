import { Route, Routes } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage';
import AnalyticsPage from '../pages/analytics/AnalyticsPage';
import ServiceOrdersPage from '../pages/service-orders/ServiceOrdersPage';
import ServiceOrderDetailPage from '../pages/service-orders/ServiceOrderDetailPage';
import AssignmentsPage from '../pages/assignments/AssignmentsPage';
import AssignmentDetailPage from '../pages/assignments/AssignmentDetailPage';
import ProvidersPage from '../pages/providers/ProvidersPage';
import ProviderDetailPage from '../pages/providers/ProviderDetailPage';
import CreateProviderPage from '../pages/providers/CreateProviderPage';
import CalendarPage from '../pages/calendar/CalendarPage';
import TasksPage from '../pages/tasks/TasksPage';
import PerformanceDashboardPage from '../pages/performance/PerformanceDashboardPage';
import { OperationsGridPage } from '../pages/operations';

export const OperatorRoutes = () => {
    return (
        <Routes>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="grid" element={<OperationsGridPage />} />
            <Route path="orders" element={<ServiceOrdersPage />} />
            <Route path="orders/:id" element={<ServiceOrderDetailPage />} />
            <Route path="assignments" element={<AssignmentsPage />} />
            <Route path="assignments/:id" element={<AssignmentDetailPage />} />
            <Route path="providers" element={<ProvidersPage />} />
            <Route path="providers/new" element={<CreateProviderPage />} />
            <Route path="providers/:id" element={<ProviderDetailPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="performance" element={<PerformanceDashboardPage />} />
        </Routes>
    );
};
