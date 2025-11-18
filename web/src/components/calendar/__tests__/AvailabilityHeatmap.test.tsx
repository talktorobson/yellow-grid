/**
 * AvailabilityHeatmap Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import AvailabilityHeatmap from '../AvailabilityHeatmap';

describe('AvailabilityHeatmap', () => {
  const mockAvailability = [
    {
      providerId: 'provider-1',
      providerName: 'TechPro Services',
      date: '2024-02-15',
      totalAvailableHours: 8,
      utilization: 0.5,
      slots: [],
    },
  ];

  it('should render heatmap component', () => {
    render(
      <AvailabilityHeatmap
        availability={mockAvailability}
        currentMonth={new Date('2024-02-01')}
      />
    );

    expect(screen.getByText('TechPro Services')).toBeInTheDocument();
  });

  it('should display utilization metrics', () => {
    render(
      <AvailabilityHeatmap
        availability={mockAvailability}
        currentMonth={new Date('2024-02-01')}
      />
    );

    // Should show available hours
    expect(screen.getByText(/8/)).toBeInTheDocument();
  });

  it('should display days of the week', () => {
    render(
      <AvailabilityHeatmap
        availability={mockAvailability}
        currentMonth={new Date('2024-02-01')}
      />
    );

    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
  });

  it('should call onDateClick when date is clicked', () => {
    const onDateClick = vi.fn();

    render(
      <AvailabilityHeatmap
        availability={mockAvailability}
        currentMonth={new Date('2024-02-01')}
        onDateClick={onDateClick}
      />
    );

    // Find a date button and click it (you may need to adjust the selector)
    const dateButtons = screen.getAllByRole('button');
    if (dateButtons.length > 0) {
      dateButtons[0].click();
      expect(onDateClick).toHaveBeenCalled();
    }
  });

  it('should handle empty availability data', () => {
    render(
      <AvailabilityHeatmap
        availability={[]}
        currentMonth={new Date('2024-02-01')}
      />
    );

    // Should still render the calendar structure
    expect(screen.getByText('Mon')).toBeInTheDocument();
  });
});
