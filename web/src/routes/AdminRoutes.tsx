import { Route, Routes } from 'react-router-dom';
import AnalyticsPage from '../pages/analytics/AnalyticsPage';
import {
    AdminDashboardPage,
    AdminUsersPage,
    AdminConfigPage,
    AdminRolesPage,
    AdminAuditPage,
    AdminUserDetailPage,
    AdminNotificationsPage,
} from '../pages/admin';

export const AdminRoutes = () => {
    return (
        <Routes>
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="users/:id" element={<AdminUserDetailPage />} />
            <Route path="roles" element={<AdminRolesPage />} />
            <Route path="notifications" element={<AdminNotificationsPage />} />
            <Route path="config" element={<AdminConfigPage />} />
            <Route path="audit" element={<AdminAuditPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
        </Routes>
    );
};
