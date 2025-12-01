/**
 * Dashboard Page - Operator Cockpit
 * Control Tower view with metrics, critical actions, and priority tasks
 * Integrated with backend API - no mock data
 */

import { Link, useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  UserCheck, 
  Users, 
  Clock, 
  RefreshCw, 
  X,
  TrendingUp,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard-service';
import type { CriticalAction as ApiCriticalAction, PriorityTask as ApiPriorityTask } from '@/services/dashboard-service';
import { StatCardSkeleton } from '@/components/LoadingSkeleton';
import { 
  MetricCard, 
  CriticalActionsPanel, 
  PriorityTasksList 
} from '@/components/dashboard';
import type { 
  CriticalAction, 
  CriticalActionType, 
  PriorityTask, 
  TaskStatus, 
  TaskPriority 
} from '@/components/dashboard';

// Map API action types to component action types
const mapApiActionType = (type: string): CriticalActionType => {
  const typeMap: Record<string, CriticalActionType> = {
    'UNASSIGNED': 'scheduling_conflict',
    'OVERDUE': 'payment_overdue',
    'SLA_RISK': 'wcf_pending',
    'PENDING_RESPONSE': 'contract_not_signed',
    'FAILED_ASSIGNMENT': 'pro_no_show',
    'ESCALATED': 'customer_complaint',
  };
  return typeMap[type] || 'scheduling_conflict';
};

// Transform API critical action to component format
const transformCriticalAction = (apiAction: ApiCriticalAction): CriticalAction => ({
  id: apiAction.id,
  type: mapApiActionType(apiAction.type),
  title: apiAction.title,
  description: apiAction.description,
  serviceOrderRef: apiAction.link.split('?')[0].replace('/', ''),
  createdAt: new Date().toISOString(),
  priority: apiAction.priority,
});

// Map API task status to component status
const mapTaskStatus = (status: string, isOverdue: boolean): TaskStatus => {
  if (isOverdue) return 'overdue';
  const statusMap: Record<string, TaskStatus> = {
    'OPEN': 'pending',
    'ASSIGNED': 'pending',
    'IN_PROGRESS': 'in_progress',
    'COMPLETED': 'completed',
    'CANCELLED': 'completed',
  };
  return statusMap[status] || 'pending';
};

// Map API task priority to component priority
const mapTaskPriority = (priority: string, escalationLevel: number): TaskPriority => {
  if (escalationLevel > 0) return 'urgent';
  const priorityMap: Record<string, TaskPriority> = {
    'CRITICAL': 'urgent',
    'HIGH': 'high',
    'MEDIUM': 'medium',
    'LOW': 'low',
  };
  return priorityMap[priority] || 'medium';
};

// Transform API task to component format
const transformPriorityTask = (apiTask: ApiPriorityTask): PriorityTask => ({
  id: apiTask.id,
  title: apiTask.title,
  description: apiTask.description || undefined,
  status: mapTaskStatus(apiTask.status, apiTask.isOverdue),
  priority: mapTaskPriority(apiTask.priority, apiTask.escalationLevel),
  dueDate: apiTask.slaDeadline || undefined,
  assignee: apiTask.assignee?.name,
  serviceOrderRef: apiTask.serviceOrderExternalId || apiTask.serviceOrderId || undefined,
  category: apiTask.type,
});

export default function DashboardPage() {
  const navigate = useNavigate();
  
  // Fetch dashboard stats
  const { 
    data: stats, 
    isLoading: statsLoading, 
    error: statsError, 
    refetch: refetchStats 
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getStats(),
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  // Fetch critical actions
  const { 
    data: criticalActionsData,
    isLoading: actionsLoading,
    refetch: refetchActions
  } = useQuery({
    queryKey: ['dashboard-critical-actions'],
    queryFn: () => dashboardService.getCriticalActions(),
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  // Fetch priority tasks
  const { 
    data: priorityTasksData,
    isLoading: tasksLoading,
    refetch: refetchTasks
  } = useQuery({
    queryKey: ['dashboard-priority-tasks'],
    queryFn: () => dashboardService.getPriorityTasks(10),
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  const isLoading = statsLoading || actionsLoading || tasksLoading;
  const error = statsError;

  // Transform API data to component format
  const criticalActions: CriticalAction[] = (criticalActionsData || []).map(transformCriticalAction);
  const priorityTasks: PriorityTask[] = (priorityTasksData || []).map(transformPriorityTask);

  const handleRefresh = () => {
    refetchStats();
    refetchActions();
    refetchTasks();
  };

  const handleCriticalActionClick = (action: CriticalAction) => {
    // Find the original API action to get the link
    const apiAction = criticalActionsData?.find(a => a.id === action.id);
    if (apiAction?.link) {
      navigate(apiAction.link);
    } else {
      navigate('/service-orders');
    }
  };

  const handleTaskClick = (task: PriorityTask) => {
    if (task.serviceOrderRef) {
      navigate(`/service-orders/${task.serviceOrderRef}`);
    } else {
      navigate('/tasks');
    }
  };

  // Calculate today's metrics
  const todayScheduled = stats?.serviceOrders.byStatus?.SCHEDULED ?? 0;
  const inProgress = stats?.serviceOrders.byStatus?.IN_PROGRESS ?? 0;
  const completedToday = stats?.serviceOrders.byStatus?.COMPLETED ?? 0;
  const pendingAssignments = stats?.assignments.pending ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Control Tower</h1>
          <p className="text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/calendar"
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Calendar
          </Link>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <X className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Error Loading Dashboard</h3>
              <p className="text-sm text-red-700">
                We encountered an issue loading the dashboard data. Please try refreshing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid - Green gradient cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              title="Today's Schedule"
              value={todayScheduled}
              icon={Calendar}
              variant="green-1"
              onClick={() => navigate('/calendar')}
            />
            <MetricCard
              title="In Progress"
              value={inProgress}
              icon={Clock}
              variant="green-2"
              onClick={() => navigate('/service-orders?status=IN_PROGRESS')}
            />
            <MetricCard
              title="Completed Today"
              value={completedToday}
              icon={TrendingUp}
              variant="green-3"
              onClick={() => navigate('/service-orders?status=COMPLETED')}
            />
            <MetricCard
              title="Pending Assignments"
              value={pendingAssignments}
              icon={UserCheck}
              variant="green-4"
              onClick={() => navigate('/assignments?status=PENDING')}
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical Actions Panel - Takes 1 column */}
        <div className="lg:col-span-1">
          <CriticalActionsPanel
            actions={criticalActions}
            onActionClick={handleCriticalActionClick}
            onViewAll={() => navigate('/service-orders')}
            loading={actionsLoading}
          />
        </div>

        {/* Priority Tasks - Takes 2 columns */}
        <div className="lg:col-span-2">
          <PriorityTasksList
            tasks={priorityTasks}
            onTaskClick={handleTaskClick}
            onViewAll={() => navigate('/tasks')}
            loading={tasksLoading}
          />
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link 
          to="/service-orders" 
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Service Orders</h3>
            <ClipboardList className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {stats?.serviceOrders.total ?? 0}
          </div>
          <p className="text-sm text-gray-500">
            {stats?.serviceOrders.pending ?? 0} pending · {stats?.serviceOrders.byStatus?.ASSIGNED ?? 0} assigned
          </p>
        </Link>

        <Link 
          to="/providers" 
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Providers</h3>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {stats?.providers.total ?? 0}
          </div>
          <p className="text-sm text-gray-500">
            {stats?.providers.active ?? 0} active today
          </p>
        </Link>

        <Link 
          to="/tasks" 
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Tasks Overview</h3>
            <AlertTriangle className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {stats?.tasks.pending ?? 0}
          </div>
          <p className="text-sm text-gray-500">
            {stats?.tasks.overdue ?? 0} overdue tasks
          </p>
        </Link>
      </div>
    </div>
  );
}
