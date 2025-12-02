import { Route, Routes } from 'react-router-dom';
import {
    SellerDashboardPage,
    SellerAvailabilityPage,
    SellerTVReportPage,
    SellerProjectsPage,
    SellerQuotationsPage,
} from '../pages/seller';

export const SellerRoutes = () => {
    return (
        <Routes>
            <Route path="dashboard" element={<SellerDashboardPage />} />
            <Route path="availability" element={<SellerAvailabilityPage />} />
            <Route path="projects" element={<SellerProjectsPage />} />
            <Route path="projects/:id" element={<SellerProjectsPage />} />
            <Route path="reports" element={<SellerTVReportPage />} />
            <Route path="reports/:id" element={<SellerTVReportPage />} />
            <Route path="quotations" element={<SellerQuotationsPage />} />
            <Route path="quotations/:id" element={<SellerQuotationsPage />} />
        </Routes>
    );
};
