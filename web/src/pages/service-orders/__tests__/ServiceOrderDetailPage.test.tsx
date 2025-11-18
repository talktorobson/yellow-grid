/**
 * ServiceOrderDetailPage Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/utils/test-utils';
import { Route, Routes } from 'react-router-dom';
import ServiceOrderDetailPage from '../ServiceOrderDetailPage';

// Mock useParams to return a service order ID
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'so-1' }),
  };
});

describe('ServiceOrderDetailPage', () => {
  it('should render service order details', async () => {
    render(
      <Routes>
        <Route path="*" element={<ServiceOrderDetailPage />} />
      </Routes>
    );

    await waitFor(() => {
      expect(screen.getByText('SO-2024-001')).toBeInTheDocument();
    });
  });

  it('should display customer information', async () => {
    render(
      <Routes>
        <Route path="*" element={<ServiceOrderDetailPage />} />
      </Routes>
    );

    await waitFor(() => {
      expect(screen.getByText(/Marie Dubois/)).toBeInTheDocument();
      expect(screen.getByText(/123 Rue de Rivoli/)).toBeInTheDocument();
    });
  });

  it('should show AI sales potential assessment', async () => {
    render(
      <Routes>
        <Route path="*" element={<ServiceOrderDetailPage />} />
      </Routes>
    );

    await waitFor(() => {
      expect(screen.getByText(/Sales Potential/i)).toBeInTheDocument();
      expect(screen.getByText(/HIGH/i)).toBeInTheDocument();
    });
  });

  it('should show AI risk assessment', async () => {
    render(
      <Routes>
        <Route path="*" element={<ServiceOrderDetailPage />} />
      </Routes>
    );

    await waitFor(() => {
      expect(screen.getByText(/Risk Assessment/i)).toBeInTheDocument();
      expect(screen.getByText(/LOW/i)).toBeInTheDocument();
    });
  });

  it('should display service type and status', async () => {
    render(
      <Routes>
        <Route path="*" element={<ServiceOrderDetailPage />} />
      </Routes>
    );

    await waitFor(() => {
      expect(screen.getByText(/Installation/)).toBeInTheDocument();
      expect(screen.getByText(/SCHEDULED/)).toBeInTheDocument();
    });
  });
});
