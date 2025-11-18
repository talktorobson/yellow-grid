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

  // TODO: Implement customer information display in component
  it.skip('should display customer information', async () => {
    renderWithRouter('/service-orders/so-1');

    await waitFor(() => {
      const customerNames = screen.getAllByText(/Marie Dubois/i);
      const addresses = screen.getAllByText(/123 Rue de Rivoli/i);
      expect(customerNames.length).toBeGreaterThan(0);
      expect(addresses.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  // TODO: Implement AI sales potential display in component
  it.skip('should show AI sales potential assessment', async () => {
    renderWithRouter('/service-orders/so-1');

    await waitFor(() => {
      const salesPotential = screen.getAllByText(/Sales Potential/i);
      const high = screen.getAllByText(/HIGH/i);
      expect(salesPotential.length).toBeGreaterThan(0);
      expect(high.length).toBeGreaterThan(0);
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
      const installations = screen.getAllByText(/Installation/i);
      const scheduled = screen.getAllByText(/SCHEDULED/i);
      expect(installations.length).toBeGreaterThan(0);
      expect(scheduled.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });
});
