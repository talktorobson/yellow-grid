/**
 * ProvidersPage Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@/test/utils/test-utils';
import ProvidersPage from '../ProvidersPage';

describe('ProvidersPage', () => {
  it('should render providers list', async () => {
    render(<ProvidersPage />);

    expect(screen.getByText('Providers')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('TechPro Services')).toBeInTheDocument();
    });
  });

  it('should display provider details', async () => {
    render(<ProvidersPage />);

    await waitFor(() => {
      expect(screen.getByText('TechPro Services')).toBeInTheDocument();
      expect(screen.getByText(/contact@techpro.fr/)).toBeInTheDocument();
      expect(screen.getByText(/\+33123456789/)).toBeInTheDocument();
    });
  });

  it('should show provider status', async () => {
    render(<ProvidersPage />);

    await waitFor(() => {
      const statusBadges = screen.getAllByText(/ACTIVE/);
      expect(statusBadges.length).toBeGreaterThan(0);
    });
  });

  it('should display filter controls', () => {
    render(<ProvidersPage />);

    expect(screen.getByPlaceholderText(/Search providers/)).toBeInTheDocument();
  });

  it('should show service types', async () => {
    render(<ProvidersPage />);

    await waitFor(() => {
      expect(screen.getByText(/Installation/)).toBeInTheDocument();
      expect(screen.getByText(/Maintenance/)).toBeInTheDocument();
    });
  });
});
