/**
 * AssignmentDetailPage Tests
 * Testing assignment transparency and scoring breakdown
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/utils/test-utils';
import { Route, Routes } from 'react-router-dom';
import AssignmentDetailPage from '../AssignmentDetailPage';

// Mock useParams to return an assignment ID
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'assignment-1' }),
  };
});

describe('AssignmentDetailPage', () => {
  it('should render assignment details', async () => {
    render(
      <Routes>
        <Route path="*" element={<AssignmentDetailPage />} />
      </Routes>
    );

    await waitFor(() => {
      expect(screen.getByText(/Assignment/i)).toBeInTheDocument();
    });
  });

  it('should display scoring transparency - all factors', async () => {
    render(
      <Routes>
        <Route path="*" element={<AssignmentDetailPage />} />
      </Routes>
    );

    await waitFor(() => {
      // Check for scoring factors
      expect(screen.getByText(/Distance/i)).toBeInTheDocument();
      expect(screen.getByText(/Skills Match/i)).toBeInTheDocument();
      expect(screen.getByText(/Availability/i)).toBeInTheDocument();
    });
  });

  it('should show scoring rationale for each factor', async () => {
    render(
      <Routes>
        <Route path="*" element={<AssignmentDetailPage />} />
      </Routes>
    );

    await waitFor(() => {
      expect(screen.getByText(/Provider is 5km from customer location/i)).toBeInTheDocument();
      expect(screen.getByText(/Provider has all required certifications/i)).toBeInTheDocument();
      expect(screen.getByText(/Provider has 60% availability/i)).toBeInTheDocument();
    });
  });

  it('should display total weighted score', async () => {
    render(
      <Routes>
        <Route path="*" element={<AssignmentDetailPage />} />
      </Routes>
    );

    await waitFor(() => {
      expect(screen.getByText(/8.5/)).toBeInTheDocument();
    });
  });

  it('should show assignment timeline', async () => {
    render(
      <Routes>
        <Route path="*" element={<AssignmentDetailPage />} />
      </Routes>
    );

    await waitFor(() => {
      expect(screen.getByText(/Timeline/i)).toBeInTheDocument();
      expect(screen.getByText(/CREATED/i)).toBeInTheDocument();
      expect(screen.getByText(/ACCEPTED/i)).toBeInTheDocument();
    });
  });

  it('should display assignment status', async () => {
    render(
      <Routes>
        <Route path="*" element={<AssignmentDetailPage />} />
      </Routes>
    );

    await waitFor(() => {
      expect(screen.getByText(/ACCEPTED/i)).toBeInTheDocument();
    });
  });
});
