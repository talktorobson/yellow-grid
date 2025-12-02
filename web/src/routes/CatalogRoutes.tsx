import { Route, Routes, Navigate } from 'react-router-dom';
import AnalyticsPage from '../pages/analytics/AnalyticsPage';
import {
    OfferManagerServicesPage,
    OfferManagerPricingPage,
    OfferManagerChecklistsPage,
    CatalogServiceDetailPage,
} from '../pages/catalog';

export const CatalogRoutes = () => {
    return (
        <Routes>
            <Route index element={<Navigate to="services" replace />} />
            <Route path="dashboard" element={<Navigate to="services" replace />} />
            <Route path="services" element={<OfferManagerServicesPage />} />
            <Route path="services/:id" element={<CatalogServiceDetailPage />} />
            <Route path="pricing" element={<OfferManagerPricingPage />} />
            <Route path="checklists" element={<OfferManagerChecklistsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
        </Routes>
    );
};
