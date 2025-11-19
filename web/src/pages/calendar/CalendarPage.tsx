/**
 * Calendar Page
 * Provider availability and service order scheduling
 */

import { useState, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, View, Event } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { calendarService } from '@/services/calendar-service';
import { providerService } from '@/services/provider-service';
import AvailabilityHeatmap from '@/components/calendar/AvailabilityHeatmap';
import { Calendar as CalendarIcon, Users, Filter, Download } from 'lucide-react';
import clsx from 'clsx';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { enUS } from 'date-fns/locale/en-US';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function CalendarPage() {
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'heatmap'>('calendar');

  // Calculate date range based on current view
  const dateRange = useMemo(() => {
    if (view === 'month') {
      return {
        startDate: format(startOfMonth(date), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(date), 'yyyy-MM-dd'),
      };
    } else if (view === 'week') {
      const start = startOfWeek(date);
      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(addDays(start, 6), 'yyyy-MM-dd'),
      };
    } else {
      return {
        startDate: format(date, 'yyyy-MM-dd'),
        endDate: format(date, 'yyyy-MM-dd'),
      };
    }
  }, [view, date]);

  // Fetch providers
  const { data: providersData } = useQuery({
    queryKey: ['providers', { limit: 100 }],
    queryFn: () => providerService.getAll({ limit: 100 }),
  });

  const providers = providersData?.data || [];

  // Fetch scheduled orders
  const { data: scheduledOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['calendar-orders', dateRange, selectedProviders],
    queryFn: () =>
      calendarService.getScheduledOrders({
        ...dateRange,
        providerId: selectedProviders[0], // TODO: Support multiple
      }),
  });

  // Fetch provider availability
  const { isLoading: availabilityLoading } = useQuery({
    queryKey: ['calendar-availability', dateRange, selectedProviders],
    queryFn: () =>
      calendarService.getProviderAvailability({
        ...dateRange,
        providerIds: selectedProviders.length > 0 ? selectedProviders : undefined,
      }),
    enabled: viewMode === 'heatmap',
  });

  // Fetch utilization metrics
  const { data: utilization } = useQuery({
    queryKey: ['calendar-utilization', dateRange, selectedProviders],
    queryFn: () =>
      calendarService.getUtilizationMetrics({
        ...dateRange,
        providerIds: selectedProviders.length > 0 ? selectedProviders : undefined,
      }),
  });

  // Convert to calendar events
  const events: Event[] = useMemo(() => {
    if (!scheduledOrders) return [];

    return scheduledOrders.map((order) => ({
      id: order.id,
      title: `${order.externalId} - ${order.serviceType}`,
      start: new Date(order.scheduledDate!),
      end: new Date(
        new Date(order.scheduledDate!).getTime() + (order.estimatedDuration || 2) * 60 * 60 * 1000
      ),
      resource: order,
    }));
  }, [scheduledOrders]);

  // Event style getter
  const eventStyleGetter = useCallback((event: Event) => {
    const order = event.resource;
    let backgroundColor = '#3b82f6'; // blue

    if (order?.status === 'COMPLETED') {
      backgroundColor = '#10b981'; // green
    } else if (order?.status === 'CANCELLED') {
      backgroundColor = '#ef4444'; // red
    } else if (order?.priority === 'P1') {
      backgroundColor = '#f59e0b'; // orange
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  }, []);

  const handleProviderToggle = (providerId: string) => {
    setSelectedProviders((prev) =>
      prev.includes(providerId)
        ? prev.filter((id) => id !== providerId)
        : [...prev, providerId]
    );
  };

  const handleDateClick = (clickedDate: Date) => {
    setDate(clickedDate);
    setView('day');
  };

  // Heatmap data
  const heatmapData = useMemo(() => {
    if (!utilization) return [];

    return utilization.flatMap((provider) => ({
      date: dateRange.startDate,
      utilizationRate: provider.utilizationRate,
      totalHours: provider.totalHours,
      availableHours: provider.availableHours,
    }));
  }, [utilization, dateRange]);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Calendar & Availability</h1>
            <p className="text-gray-600 mt-1">
              Provider scheduling and availability management
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Provider Selection */}
        <div className="lg:col-span-1 space-y-6">
          {/* View Mode Selector */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">View Mode</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setViewMode('calendar')}
                className={clsx(
                  'px-3 py-2 text-sm rounded-lg text-left transition-colors',
                  viewMode === 'calendar'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                <CalendarIcon className="w-4 h-4 inline mr-2" />
                Calendar View
              </button>
              <button
                onClick={() => setViewMode('heatmap')}
                className={clsx(
                  'px-3 py-2 text-sm rounded-lg text-left transition-colors',
                  viewMode === 'heatmap'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                <Filter className="w-4 h-4 inline mr-2" />
                Availability Heatmap
              </button>
            </div>
          </div>

          {/* Provider Filter */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Filter by Provider</h3>
              <Users className="w-4 h-4 text-gray-400" />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {providers.map((provider) => (
                <label
                  key={provider.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedProviders.includes(provider.id)}
                    onChange={() => handleProviderToggle(provider.id)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-900">{provider.name}</span>
                </label>
              ))}
              {providers.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No providers available</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Statistics</h3>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {scheduledOrders?.length || 0}
                </div>
                <div className="text-xs text-gray-600">Scheduled Orders</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {utilization
                    ? (
                        (utilization.reduce((sum, u) => sum + u.utilizationRate, 0) /
                          utilization.length) *
                        100
                      ).toFixed(0)
                    : 0}
                  %
                </div>
                <div className="text-xs text-gray-600">Avg Utilization</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {selectedProviders.length || providers.length}
                </div>
                <div className="text-xs text-gray-600">Active Providers</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="card p-0 overflow-hidden">
            {viewMode === 'calendar' ? (
              <>
                {ordersLoading ? (
                  <div className="p-12 text-center text-gray-500">
                    Loading calendar...
                  </div>
                ) : (
                  <div className="p-6" style={{ height: '700px' }}>
                    <Calendar
                      localizer={localizer}
                      events={events}
                      startAccessor="start"
                      endAccessor="end"
                      view={view}
                      onView={setView}
                      date={date}
                      onNavigate={setDate}
                      eventPropGetter={eventStyleGetter}
                      onSelectEvent={(event) => {
                        console.log('Event selected:', event);
                        // TODO: Show event detail modal
                      }}
                      style={{ height: '100%' }}
                      views={['month', 'week', 'day']}
                      tooltipAccessor={(event) => {
                        const order = event.resource;
                        return `${order?.externalId}\n${order?.serviceType}\nStatus: ${order?.status}`;
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="p-6">
                {availabilityLoading ? (
                  <div className="py-12 text-center text-gray-500">
                    Loading availability data...
                  </div>
                ) : (
                  <AvailabilityHeatmap
                    data={heatmapData}
                    startDate={new Date(dateRange.startDate)}
                    endDate={new Date(dateRange.endDate)}
                    onDateClick={handleDateClick}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
