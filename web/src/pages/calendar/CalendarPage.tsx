/**
 * Calendar Page - Redesigned (Viewport-Fit)
 * Provider availability and service order scheduling
 * Clean, user-friendly interface - fits within viewport
 */

import { useState, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import {
  format,
  parse,
  startOfWeek,
  getDay,
  addDays,
  startOfMonth,
  endOfMonth,
  endOfWeek,
  isToday,
  eachDayOfInterval,
} from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { calendarService } from '@/services/calendar-service';
import { providerService } from '@/services/provider-service';
import { Provider } from '@/types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Clock,
  Users,
  CheckCircle,
  X,
  MapPin,
  Filter,
  Zap,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import clsx from 'clsx';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { enUS } from 'date-fns/locale/en-US';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

// Status colors and labels
const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  ASSIGNED: { color: 'text-blue-700', bg: 'bg-blue-100 border-blue-200', label: 'Assigned', icon: Clock },
  SCHEDULED: { color: 'text-indigo-700', bg: 'bg-indigo-100 border-indigo-200', label: 'Scheduled', icon: CalendarIcon },
  IN_PROGRESS: { color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200', label: 'In Progress', icon: Zap },
  COMPLETED: { color: 'text-green-700', bg: 'bg-green-100 border-green-200', label: 'Completed', icon: CheckCircle },
  CANCELLED: { color: 'text-red-700', bg: 'bg-red-100 border-red-200', label: 'Cancelled', icon: X },
};

const URGENCY_CONFIG: Record<string, { color: string; bg: string }> = {
  URGENT: { color: 'text-red-700', bg: 'bg-red-500' },
  STANDARD: { color: 'text-blue-700', bg: 'bg-blue-500' },
  LOW: { color: 'text-gray-600', bg: 'bg-gray-400' },
};

interface EventDetailModalProps {
  event: any;
  onClose: () => void;
}

function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const order = event?.resource;
  if (!order) return null;

  const statusConfig = STATUS_CONFIG[order.state] || STATUS_CONFIG.ASSIGNED;
  const urgencyConfig = URGENCY_CONFIG[order.urgency] || URGENCY_CONFIG.STANDARD;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header with urgency indicator */}
        <div className={clsx('h-2', urgencyConfig.bg)} />
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {order.externalId || order.id?.slice(0, 8)}
              </p>
              <h3 className="text-xl font-semibold text-gray-900 mt-1">
                {order.serviceType || 'Service Order'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Status Badge */}
          <div className={clsx('inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border', statusConfig.bg, statusConfig.color)}>
            <StatusIcon className="w-4 h-4" />
            {statusConfig.label}
          </div>

          {/* Details Grid */}
          <div className="mt-6 space-y-4">
            {/* Customer */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium text-gray-900">
                  {order.customerInfo?.name || order.customerName || 'Not specified'}
                </p>
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Scheduled</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(order.scheduledDate), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-sm text-gray-600">
                  {format(new Date(order.scheduledDate), 'h:mm a')} • {order.estimatedDurationMinutes || 120} min
                </p>
              </div>
            </div>

            {/* Provider */}
            {order.assignedProvider && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Assigned Provider</p>
                  <p className="font-medium text-gray-900">{order.assignedProvider.name}</p>
                </div>
              </div>
            )}

            {/* Address */}
            {order.customerInfo?.address && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium text-gray-900">{order.customerInfo.address}</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 pt-6 border-t flex gap-3">
            <button className="flex-1 btn btn-primary">View Full Details</button>
            <button className="btn btn-secondary">Reschedule</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom toolbar component for better navigation
function CustomToolbar({ view, onNavigate, onView, label }: any) {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-gray-100 bg-white">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('TODAY')}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Today
        </button>
        <div className="flex items-center bg-gray-100 rounded-lg">
          <button
            onClick={() => onNavigate('PREV')}
            className="p-2 hover:bg-gray-200 rounded-l-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => onNavigate('NEXT')}
            className="p-2 hover:bg-gray-200 rounded-r-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 ml-2">{label}</h2>
      </div>

      {/* View Switcher */}
      <div className="flex items-center bg-gray-100 rounded-lg p-1">
        {[
          { key: Views.MONTH, label: 'Month' },
          { key: Views.WEEK, label: 'Week' },
          { key: Views.DAY, label: 'Day' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onView(key)}
            className={clsx(
              'px-4 py-1.5 text-sm font-medium rounded-md transition-all',
              view === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Heatmap Component
function AvailabilityHeatmapRedesigned({
  data,
  startDate,
  endDate,
  onDateClick,
  onWeekClick,
}: {
  data: any[];
  startDate: Date;
  endDate: Date;
  onDateClick: (date: Date) => void;
  onWeekClick: (weekStart: Date) => void;
}) {
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const weeks = useMemo(() => {
    const start = startOfWeek(startDate, { weekStartsOn: 1 });
    const end = endOfWeek(endDate, { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({ start, end });
    
    const result: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      result.push(allDays.slice(i, i + 7));
    }
    return result;
  }, [startDate, endDate]);

  const getDayData = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return data.find((d) => d.date === dateStr);
  };

  const getUtilizationColor = (rate: number) => {
    if (rate === 0) return { bg: 'bg-gray-50', text: 'text-gray-400', ring: 'ring-gray-200' };
    if (rate < 0.3) return { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' };
    if (rate < 0.6) return { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' };
    if (rate < 0.85) return { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200' };
    return { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200' };
  };

  const getWeekStats = (week: Date[]) => {
    let totalHours = 0;
    let scheduledHours = 0;
    week.forEach(day => {
      const dayData = getDayData(day);
      if (dayData) {
        totalHours += dayData.totalHours || 0;
        scheduledHours += dayData.scheduledHours || 0;
      }
    });
    return { totalHours, scheduledHours, utilization: totalHours > 0 ? scheduledHours / totalHours : 0 };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Legend */}
      <div className="flex items-center justify-between pb-3 flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-900">Capacity Overview</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-200" />
            <span className="text-gray-600">Available (&lt;30%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-100 border border-amber-200" />
            <span className="text-gray-600">Moderate (30-60%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-100 border border-orange-200" />
            <span className="text-gray-600">Busy (60-85%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100 border border-red-200" />
            <span className="text-gray-600">Full (&gt;85%)</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid - fills remaining space */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="grid grid-cols-[100px_repeat(7,1fr)] bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="p-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Week</div>
          {weekDays.map((day) => (
            <div key={day} className="p-2 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
              {day}
            </div>
          ))}
        </div>

        {/* Weeks - scrollable */}
        <div className="flex-1 overflow-auto">
          {weeks.map((week, weekIndex) => {
            const weekStats = getWeekStats(week);
            const weekStart = week[0];
            const weekColor = getUtilizationColor(weekStats.utilization);

            return (
              <div
                key={weekIndex}
                className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-gray-100 last:border-b-0"
              >
                {/* Week Summary */}
                <button
                  onClick={() => onWeekClick(weekStart)}
                  className="p-2 text-left border-r border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="text-xs text-gray-500">
                    {format(week[0], 'MMM d')} - {format(week[6], 'd')}
                  </div>
                  <div className={clsx('text-sm font-semibold', weekColor.text)}>
                    {(weekStats.utilization * 100).toFixed(0)}%
                  </div>
                </button>

                {/* Days */}
                {week.map((day) => {
                  const dayData = getDayData(day);
                  const utilization = dayData?.utilizationRate || 0;
                  const colors = getUtilizationColor(utilization);
                  const isCurrentMonth = day >= startDate && day <= endDate;
                  const todayFlag = isToday(day);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => onDateClick(day)}
                      disabled={!isCurrentMonth}
                      className={clsx(
                        'relative p-1.5 border-r border-gray-100 last:border-r-0 transition-all text-left min-h-[60px]',
                        isCurrentMonth
                          ? `${colors.bg} hover:ring-2 hover:ring-inset ${colors.ring} cursor-pointer`
                          : 'bg-gray-50/50 cursor-not-allowed'
                      )}
                    >
                      <div className={clsx(
                        'text-xs font-medium',
                        todayFlag
                          ? 'w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center'
                          : isCurrentMonth ? 'text-gray-900' : 'text-gray-300'
                      )}>
                        {format(day, 'd')}
                      </div>
                      {isCurrentMonth && dayData && (
                        <div className="mt-1">
                          <div className={clsx('text-xs font-medium', colors.text)}>
                            {(utilization * 100).toFixed(0)}%
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 mt-3 flex-shrink-0">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs font-medium">Total Capacity</span>
          </div>
          <div className="text-xl font-bold text-gray-900">
            {data.reduce((sum, d) => sum + (d.totalHours || 0), 0).toFixed(0)}h
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">Scheduled</span>
          </div>
          <div className="text-xl font-bold text-gray-900">
            {data.reduce((sum, d) => sum + (d.scheduledHours || 0), 0).toFixed(0)}h
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Available</span>
          </div>
          <div className="text-xl font-bold text-emerald-600">
            {data.reduce((sum, d) => sum + (d.availableHours || 0), 0).toFixed(0)}h
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Avg Utilization</span>
          </div>
          <div className="text-xl font-bold text-gray-900">
            {data.length > 0
              ? ((data.reduce((sum, d) => sum + (d.utilizationRate || 0), 0) / data.length) * 100).toFixed(0)
              : 0}%
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'heatmap'>('calendar');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Calculate date range based on current view
  const dateRange = useMemo(() => {
    if (view === Views.MONTH) {
      return {
        startDate: format(startOfMonth(date), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(date), 'yyyy-MM-dd'),
      };
    } else if (view === Views.WEEK) {
      const start = startOfWeek(date, { weekStartsOn: 1 });
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
        providerIds: selectedProviders.length > 0 ? selectedProviders : undefined,
      }),
  });

  // Fetch utilization metrics
  const { data: utilization } = useQuery({
    queryKey: ['calendar-utilization', dateRange, selectedProviders],
    queryFn: () =>
      calendarService.getUtilizationStats({
        ...dateRange,
        providerIds: selectedProviders.length > 0 ? selectedProviders : undefined,
      }),
  });

  // Convert to calendar events
  const events = useMemo(() => {
    if (!scheduledOrders) return [];

    return scheduledOrders.map((order) => {
      const customerName =
        order.customerInfo?.name || order.customerName || 'Customer';

      return {
        id: order.id,
        title: `${customerName} • ${order.serviceType || 'Service'}`,
        start: new Date(order.scheduledDate!),
        end: new Date(
          new Date(order.scheduledDate!).getTime() +
            ((order as any).estimatedDurationMinutes || 120) * 60 * 1000
        ),
        resource: order,
      };
    });
  }, [scheduledOrders]);

  // Event style getter
  const eventStyleGetter = useCallback((event: any) => {
    const order = event.resource;

    let backgroundColor = '#3b82f6';
    const orderState = (order as any)?.state;
    if (orderState === 'COMPLETED') backgroundColor = '#10b981';
    else if (orderState === 'CANCELLED') backgroundColor = '#ef4444';
    else if (order?.urgency === 'URGENT') backgroundColor = '#ef4444';

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        border: 'none',
        color: 'white',
        fontSize: '12px',
        padding: '2px 6px',
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
    setView(Views.DAY);
    setViewMode('calendar');
  };

  const handleWeekClick = (weekStart: Date) => {
    setDate(weekStart);
    setView(Views.WEEK);
    setViewMode('calendar');
  };

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
  };

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setDate(start);
    if (view === Views.MONTH) {
      setView(Views.DAY);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const totalOrders = scheduledOrders?.length || 0;
    const urgentOrders = scheduledOrders?.filter((o) => o.urgency === 'URGENT').length || 0;
    const completedOrders = scheduledOrders?.filter((o) => (o as any).state === 'COMPLETED').length || 0;
    const avgUtilization = utilization?.length
      ? (utilization.reduce((sum: number, u: any) => sum + (u.utilizationRate || 0), 0) / utilization.length) * 100
      : 0;

    return { totalOrders, urgentOrders, completedOrders, avgUtilization };
  }, [scheduledOrders, utilization]);

  // Calculate viewport height minus the layout header (64px/4rem) and main padding (64px/4rem = 32px top + 32px bottom)
  // Total offset: 128px = 8rem
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Scheduling Calendar</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {format(date, 'MMMM yyyy')} • {stats.totalOrders} orders scheduled
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all',
                    viewMode === 'calendar'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <CalendarIcon className="w-4 h-4" />
                  Calendar
                </button>
                <button
                  onClick={() => setViewMode('heatmap')}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all',
                    viewMode === 'heatmap'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <Grid3X3 className="w-4 h-4" />
                  Capacity
                </button>
              </div>

              {/* Filter Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
                  showFilters || selectedProviders.length > 0
                    ? 'bg-primary-50 text-primary-700 border-primary-200'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                )}
              >
                <Filter className="w-4 h-4" />
                Filters
                {selectedProviders.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary-600 text-white rounded-full">
                    {selectedProviders.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Filter by Provider</h3>
                {selectedProviders.length > 0 && (
                  <button
                    onClick={() => setSelectedProviders([])}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {providers.map((provider: Provider) => (
                  <button
                    key={provider.id}
                    onClick={() => handleProviderToggle(provider.id)}
                    className={clsx(
                      'px-3 py-1.5 text-sm rounded-full border transition-colors',
                      selectedProviders.includes(provider.id)
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    )}
                  >
                    {provider.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-6 py-3">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{stats.totalOrders}</span> Total Orders
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{stats.urgentOrders}</span> Urgent
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{stats.completedOrders}</span> Completed
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{stats.avgUtilization.toFixed(0)}%</span> Avg Utilization
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Fills remaining space */}
      <div className="flex-1 min-h-0 max-w-[1600px] w-full mx-auto px-6 py-4">
        {viewMode === 'calendar' ? (
          <div className="h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            {ordersLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                  <p className="mt-4 text-gray-500">Loading calendar...</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0 calendar-viewport-fit">
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
                  onSelectEvent={handleSelectEvent}
                  onSelectSlot={handleSelectSlot}
                  selectable
                  popup
                  views={[Views.MONTH, Views.WEEK, Views.DAY]}
                  components={{
                    toolbar: CustomToolbar,
                  }}
                  formats={{
                    dayHeaderFormat: (date: Date) => format(date, 'EEEE, MMMM d'),
                    dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
                      `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`,
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <AvailabilityHeatmapRedesigned
            data={utilization || []}
            startDate={parse(dateRange.startDate, 'yyyy-MM-dd', new Date())}
            endDate={parse(dateRange.endDate, 'yyyy-MM-dd', new Date())}
            onDateClick={handleDateClick}
            onWeekClick={handleWeekClick}
          />
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
