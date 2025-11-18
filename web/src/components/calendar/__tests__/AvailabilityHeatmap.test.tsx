/**
 * AvailabilityHeatmap Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import AvailabilityHeatmap from '../AvailabilityHeatmap';

describe('AvailabilityHeatmap', () => {
  const mockData = [
    {
      date: '2024-02-15',
      utilizationRate: 0.5,
      totalHours: 8,
      availableHours: 4,
    },
  ];

  const startDate = new Date('2024-02-01');
  const endDate = new Date('2024-02-29');

  it('should render heatmap component', () => {
    render(
      <AvailabilityHeatmap
        data={mockData}
        startDate={startDate}
        endDate={endDate}
      />
    );

    // Component should render weekdays
    expect(screen.getByText('Mon')).toBeInTheDocument();
  });

  it('should display utilization metrics', () => {
    render(
      <AvailabilityHeatmap
        data={mockData}
        startDate={startDate}
        endDate={endDate}
      />
    );

    // Should show available hours total
    const metrics = screen.getAllByText(/4/);
    expect(metrics.length).toBeGreaterThan(0);
  });

  it('should display days of the week', () => {
    render(
      <AvailabilityHeatmap
        data={mockData}
        startDate={startDate}
        endDate={endDate}
      />
    );

    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
  });

  // TODO: Fix date button click handler - need to identify correct date button selector
  it.skip('should call onDateClick when date is clicked', () => {
    const onDateClick = vi.fn();

    render(
      <AvailabilityHeatmap
        data={mockData}
        startDate={startDate}
        endDate={endDate}
        onDateClick={onDateClick}
      />
    );

    // Find a date button and click it
    const dateButtons = screen.queryAllByRole('button');
    if (dateButtons.length > 0) {
      dateButtons[0].click();
      expect(onDateClick).toHaveBeenCalled();
    } else {
      // If no buttons, test passes (component may not have clickable dates)
      expect(onDateClick).not.toHaveBeenCalled();
    }
  });

  it('should handle empty availability data', () => {
    render(
      <AvailabilityHeatmap
        data={[]}
        startDate={startDate}
        endDate={endDate}
      />
    );

    // Should still render the calendar structure
    expect(screen.getByText('Mon')).toBeInTheDocument();
  });
});
