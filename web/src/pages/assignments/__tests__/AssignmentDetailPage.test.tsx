/**
 * AssignmentDetailPage Tests
 * Testing assignment transparency and scoring breakdown
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import AssignmentDetailPage from '../AssignmentDetailPage';

// Create a test wrapper with routing
function renderWithRouter(initialRoute = '/assignments/assignment-1') {
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
            <Route path="/assignments/:id" element={<AssignmentDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('AssignmentDetailPage', () => {
  it('should render assignment details', async () => {
    renderWithRouter('/assignments/assignment-1');

    await waitFor(() => {
      expect(screen.getByText(/Assignment/i)).toBeInTheDocument();
    });
  });

  it('should display scoring transparency - all factors', async () => {
    renderWithRouter('/assignments/assignment-1');

    await waitFor(() => {
      // Check for scoring factors
      const distanceElements = screen.getAllByText(/Distance/i);
      const skillsElements = screen.getAllByText(/Skills Match/i);
      const availabilityElements = screen.getAllByText(/Availability/i);

      expect(distanceElements.length).toBeGreaterThan(0);
      expect(skillsElements.length).toBeGreaterThan(0);
      expect(availabilityElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('should show scoring rationale for each factor', async () => {
    renderWithRouter('/assignments/assignment-1');

    await waitFor(() => {
      expect(screen.getByText(/Provider is 5km from customer location/i)).toBeInTheDocument();
      expect(screen.getByText(/Provider has all required certifications/i)).toBeInTheDocument();
      expect(screen.getByText(/Provider has 60% availability/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should display total weighted score', async () => {
    renderWithRouter('/assignments/assignment-1');

    await waitFor(() => {
      expect(screen.getByText(/8.5/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show assignment timeline', async () => {
    renderWithRouter('/assignments/assignment-1');

    await waitFor(() => {
      expect(screen.getByText(/Assignment Timeline/i)).toBeInTheDocument();
      expect(screen.getByText(/Assignment Created/i)).toBeInTheDocument();
      expect(screen.getByText(/Offered to Provider/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should display assignment status', async () => {
    renderWithRouter('/assignments/assignment-1');

    await waitFor(() => {
      const statusElements = screen.getAllByText(/ACCEPTED/i);
      expect(statusElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });
});
