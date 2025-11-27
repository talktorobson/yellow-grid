/**
 * Provider Calendar Page
 * 
 * Shows scheduled jobs, availability management, and team calendars.
 * Allows providers to manage their schedule and block time off.
 */

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, Filter, Download } from 'lucide-react';
import clsx from 'clsx';

interface ScheduledJob {
  id: string;
  title: string;
  customer: string;
  address: string;
  time: string;
  duration: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  team?: string;
  amount: number;
}

// Mock data for demonstration
const mockJobs: Record<string, ScheduledJob[]> = {
  '2025-11-27': [
    { id: '1', title: 'Installation électrique', customer: 'Jean Dupont', address: '15 Rue de la Paix, Paris 15e', time: '09:00', duration: '4h', status: 'in_progress', team: 'Équipe A', amount: 450 },
    { id: '2', title: 'Dépannage urgent', customer: 'Marie Martin', address: '8 Avenue des Champs, Paris 8e', time: '14:00', duration: '2h', status: 'scheduled', team: 'Équipe B', amount: 150 },
    { id: '3', title: 'Diagnostic', customer: 'Paul Durand', address: '22 Rue Victor Hugo, Paris 16e', time: '16:30', duration: '1h', status: 'scheduled', amount: 80 },
  ],
  '2025-11-28': [
    { id: '4', title: 'Mise aux normes', customer: 'Sophie Petit', address: '5 Rue du Commerce, Paris 15e', time: '08:30', duration: '6h', status: 'scheduled', team: 'Équipe A', amount: 890 },
    { id: '5', title: 'Installation prise triphasée', customer: 'Luc Moreau', address: '10 Rue de Rivoli, Paris 1er', time: '15:00', duration: '2h', status: 'scheduled', amount: 280 },
  ],
  '2025-11-29': [
    { id: '6', title: 'Réparation interrupteur', customer: 'Emma Dubois', address: '18 Avenue Mozart, Paris 16e', time: '11:00', duration: '1h', status: 'scheduled', amount: 95 },
  ],
};

// Helper functions extracted to avoid deep nesting
const getJobStatusClass = (status: ScheduledJob['status']): string => {
  if (status === 'in_progress') return 'bg-blue-100 border-l-4 border-blue-500';
  if (status === 'completed') return 'bg-green-100 border-l-4 border-green-500';
  return 'bg-amber-100 border-l-4 border-amber-500';
};

const getTeamStatusColor = (index: number): string => {
  const colors = ['bg-green-500', 'bg-yellow-500', 'bg-gray-400'];
  return colors[index] || 'bg-gray-400';
};

const getTeamStatus = (index: number): string => {
  const statuses = ['2 jobs today', '1 job today', 'Available'];
  return statuses[index] || 'Available';
};

export default function ProviderCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'day'>('week');

  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 to 19:00

  // Get week dates
  const getWeekDates = () => {
    const dates = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getJobsForDate = (date: Date) => {
    return mockJobs[formatDateKey(date)] || [];
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const totalWeekRevenue = weekDates.reduce((sum, date) => {
    return sum + getJobsForDate(date).reduce((s, job) => s + job.amount, 0);
  }, 0);

  const totalWeekJobs = weekDates.reduce((sum, date) => {
    return sum + getJobsForDate(date).length;
  }, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600">Manage your schedule and availability</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button className="btn btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Block Time
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-sm text-gray-600">This Week</p>
          <p className="text-2xl font-bold">{totalWeekJobs} jobs</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-600">Revenue</p>
          <p className="text-2xl font-bold text-green-600">€{totalWeekRevenue.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-600">Utilization</p>
          <p className="text-2xl font-bold">78%</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-600">Available Slots</p>
          <p className="text-2xl font-bold text-blue-600">12</p>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="card mb-6">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">
              {weekDates[0].toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={() => navigateWeek(1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('day')}
              className={clsx(
                'px-3 py-1 text-sm rounded-lg',
                view === 'day' ? 'bg-primary-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
              )}
            >
              Day
            </button>
            <button
              onClick={() => setView('week')}
              className={clsx(
                'px-3 py-1 text-sm rounded-lg',
                view === 'week' ? 'bg-primary-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
              )}
            >
              Week
            </button>
          </div>
        </div>

        {/* Week View */}
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Day Headers */}
            <div className="grid grid-cols-8 border-b border-gray-200">
              <div className="p-3 text-sm text-gray-500">Time</div>
              {weekDates.map((date, idx) => {
                const isToday = formatDateKey(date) === formatDateKey(new Date());
                const jobCount = getJobsForDate(date).length;
                const dateKey = formatDateKey(date);
                return (
                  <div
                    key={dateKey}
                    className={clsx(
                      'p-3 text-center border-l border-gray-200',
                      isToday && 'bg-primary-50'
                    )}
                  >
                    <p className="text-sm text-gray-500">{days[idx]}</p>
                    <p className={clsx(
                      'text-lg font-semibold',
                      isToday ? 'text-primary-600' : 'text-gray-900'
                    )}>
                      {date.getDate()}
                    </p>
                    {jobCount > 0 && (
                      <p className="text-xs text-gray-500">{jobCount} job{jobCount > 1 ? 's' : ''}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Time Slots */}
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
                <div className="p-2 text-sm text-gray-500 text-right pr-4">
                  {hour}:00
                </div>
                {weekDates.map((date) => {
                  const jobs = getJobsForDate(date).filter(job => {
                    const jobHour = Number.parseInt(job.time.split(':')[0], 10);
                    return jobHour === hour;
                  });
                  const slotKey = `${formatDateKey(date)}-${hour}`;
                  return (
                    <div
                      key={slotKey}
                      className="border-l border-gray-200 p-1 min-h-[80px] hover:bg-gray-50"
                    >
                      {jobs.map((job) => (
                        <div
                          key={job.id}
                          className={clsx(
                            'p-2 rounded text-xs mb-1 cursor-pointer transition-all hover:shadow-md',
                            getJobStatusClass(job.status)
                          )}
                        >
                          <p className="font-medium truncate">{job.title}</p>
                          <p className="text-gray-600 truncate">{job.customer}</p>
                          <div className="flex items-center gap-2 mt-1 text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{job.time} ({job.duration})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Availability */}
      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold">Team Availability</h3>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {['Équipe A - Jean, Pierre', 'Équipe B - Marie, Sophie', 'Équipe C - Luc, Emma'].map((team, idx) => (
              <div key={team} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'w-3 h-3 rounded-full',
                    getTeamStatusColor(idx)
                  )} />
                  <span className="font-medium">{team}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {getTeamStatus(idx)}
                  </span>
                  <button className="text-sm text-primary-600 hover:text-primary-700">
                    View Schedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
