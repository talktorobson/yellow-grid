/**
 * ServiceOrderDetailPage Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import ServiceOrderDetailPage from '../ServiceOrderDetailPage';

// Create a test wrapper with routing
function renderWithRouter(initialRoute = '/service-orders/so-1') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/service-orders/:id" element={<ServiceOrderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('ServiceOrderDetailPage', () => {
  it('should render service order details', async () => {
    renderWithRouter('/service-orders/so-1');

    await waitFor(() => {
      const orderIds = screen.getAllByText('SO-2024-001');
      expect(orderIds.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('should display customer information', async () => {
    renderWithRouter('/service-orders/so-1');

    await waitFor(() => {
      expect(screen.getByText(/Marie Dubois/i)).toBeInTheDocument();
      expect(screen.getByText(/123 Rue de Rivoli/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show AI sales potential assessment', async () => {
    renderWithRouter('/service-orders/so-1');

    await waitFor(() => {
      expect(screen.getByText(/Sales Potential/i)).toBeInTheDocument();
      expect(screen.getByText(/HIGH/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show AI risk assessment', async () => {
    renderWithRouter('/service-orders/so-1');

    await waitFor(() => {
      expect(screen.getByText(/Risk Assessment/i)).toBeInTheDocument();
      expect(screen.getByText(/LOW/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should display service type and status', async () => {
    renderWithRouter('/service-orders/so-1');

    await waitFor(() => {
      const technicalVisits = screen.getAllByText(/TECHNICAL_VISIT/i);
      const scheduled = screen.getAllByText(/SCHEDULED/i);
      expect(technicalVisits.length).toBeGreaterThan(0);
      expect(scheduled.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });
});
