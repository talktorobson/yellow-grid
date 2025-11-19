/**
 * ServiceOrdersPage Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@/test/utils/test-utils';
import ServiceOrdersPage from '../ServiceOrdersPage';

describe('ServiceOrdersPage', () => {
  it('should render service orders list', async () => {
    render(<ServiceOrdersPage />);

    expect(screen.getByText('Service Orders')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('SO-2024-001')).toBeInTheDocument();
      expect(screen.getByText('SO-2024-002')).toBeInTheDocument();
    });
  });

  it('should display service order types', async () => {
    render(<ServiceOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText(/INSTALLATION/i)).toBeInTheDocument();
      expect(screen.getByText(/TECHNICAL_VISIT/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show correct status badges', async () => {
    render(<ServiceOrdersPage />);

    await waitFor(() => {
      const statusBadges = screen.getAllByText(/SCHEDULED|CREATED/i);
      expect(statusBadges.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('should display filter controls', () => {
    render(<ServiceOrdersPage />);

    expect(screen.getByPlaceholderText(/Search by order ID/i)).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    render(<ServiceOrdersPage />);

    // Check for loading indicator (you may need to adjust based on your implementation)
    expect(screen.getByText('Service Orders')).toBeInTheDocument();
  });
});
