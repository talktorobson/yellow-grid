import { Route, Routes } from 'react-router-dom';
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
} from '../pages/provider';

export const ProviderRoutes = () => {
    return (
        <Routes>
            <Route path="dashboard" element={<ProviderDashboardPage />} />
            <Route path="jobs" element={<ProviderJobsPage />} />
            <Route path="jobs/:id" element={<ProviderJobDetailPage />} />
            <Route path="calendar" element={<ProviderCalendarPage />} />
            <Route path="teams" element={<ProviderTeamsPage />} />
            <Route path="teams/:id" element={<ProviderTeamDetailPage />} />
            <Route path="financial" element={<ProviderFinancialPage />} />
            <Route path="performance" element={<ProviderPerformancePage />} />
            <Route path="settings" element={<ProviderSettingsPage />} />
            <Route path="messages" element={<ProviderMessagesPage />} />
        </Routes>
    );
};
