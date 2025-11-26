/**
 * Availability Heatmap Component
 * Visual representation of provider availability
 */

import { useMemo } from 'react';
import clsx from 'clsx';
import { format, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay } from 'date-fns';

interface AvailabilityData {
  date: string;
  utilizationRate: number; // 0-1
  totalHours: number;
  availableHours: number;
}

interface AvailabilityHeatmapProps {
  data: AvailabilityData[];
  startDate: Date;
  endDate: Date;
  onDateClick?: (date: Date) => void;
}

export default function AvailabilityHeatmap({
  data,
  startDate,
  endDate,
  onDateClick,
}: AvailabilityHeatmapProps) {
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get all dates in range aligned to weeks
  const dates = useMemo(() => {
    const start = startOfWeek(startDate);
    const end = endOfWeek(endDate);
    return eachDayOfInterval({ start, end });
  }, [startDate, endDate]);

  // Group dates by week
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    let currentWeek: Date[] = [];

    dates.forEach((date, index) => {
      currentWeek.push(date);
      if ((index + 1) % 7 === 0) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      result.push(currentWeek);
    }

    return result;
  }, [dates]);

  const getUtilization = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayData = data.find((d) => d.date === dateStr);
    return dayData?.utilizationRate ?? 0;
  };

  const getAvailableHours = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayData = data.find((d) => d.date === dateStr);
    return dayData?.availableHours ?? 0;
  };

  const getHeatmapColor = (utilization: number): string => {
    if (utilization === 0) return 'bg-gray-100 text-gray-400';
    if (utilization < 0.3) return 'bg-green-100 text-green-800';
    if (utilization < 0.6) return 'bg-yellow-100 text-yellow-800';
    if (utilization < 0.85) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const isInRange = (date: Date): boolean => {
    return date >= startDate && date <= endDate;
  };

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium text-gray-700">Availability Heatmap</div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
            <span className="text-gray-600">Low utilization</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></div>
            <span className="text-gray-600">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
            <span className="text-gray-600">High utilization</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {weekDays.map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-xs font-medium text-gray-700 text-center"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-200 last:border-b-0">
            {week.map((date, dayIndex) => {
              const utilization = getUtilization(date);
              const availableHours = getAvailableHours(date);
              const inRange = isInRange(date);

              return (
                <button
                  key={dayIndex}
                  onClick={() => inRange && onDateClick?.(date)}
                  disabled={!inRange}
                  className={clsx(
                    'relative px-2 py-3 text-center border-r border-gray-200 last:border-r-0 transition-colors',
                    inRange
                      ? `${getHeatmapColor(utilization)} hover:opacity-80 cursor-pointer`
                      : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                  )}
                  title={
                    inRange
                      ? `${format(date, 'MMM dd')}: ${availableHours.toFixed(1)}h available (${(utilization * 100).toFixed(0)}% utilized)`
                      : 'Outside date range'
                  }
                >
                  <div className="text-xs font-medium">{format(date, 'd')}</div>
                  {inRange && availableHours > 0 && (
                    <div className="text-xs mt-0.5">
                      {availableHours.toFixed(0)}h
                    </div>
                  )}
                  {/* Today indicator */}
                  {isSameDay(date, new Date()) && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-600 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">
            {data.reduce((sum, d) => sum + d.availableHours, 0).toFixed(0)}h
          </div>
          <div className="text-xs text-gray-600 mt-1">Total Available</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">
            {data.length > 0
              ? ((data.reduce((sum, d) => sum + d.utilizationRate, 0) / data.length) * 100).toFixed(0)
              : 0}%
          </div>
          <div className="text-xs text-gray-600 mt-1">Avg Utilization</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">
            {data.filter((d) => d.utilizationRate < 0.6).length}
          </div>
          <div className="text-xs text-gray-600 mt-1">Days with Availability</div>
        </div>
      </div>
    </div>
  );
}
