import { Route, Routes } from 'react-router-dom';
import AnalyticsPage from '../pages/analytics/AnalyticsPage';
import {
    PSMDashboardPage,
    PSMPipelinePage,
    PSMProvidersPage,
    PSMCoveragePage,
    PSMProviderDetailPage,
    PSMVerificationPage,
} from '../pages/psm';

export const PSMRoutes = () => {
    return (
        <Routes>
            <Route path="dashboard" element={<PSMDashboardPage />} />
            <Route path="pipeline" element={<PSMPipelinePage />} />
            <Route path="providers" element={<PSMProvidersPage />} />
            <Route path="providers/:id" element={<PSMProviderDetailPage />} />
            <Route path="coverage" element={<PSMCoveragePage />} />
            <Route path="verification" element={<PSMVerificationPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
        </Routes>
    );
};
