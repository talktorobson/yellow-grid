import apiClient from './api-client';

export interface DashboardStats {
  serviceOrders: {
    total: number;
    pending: number;
    byStatus: {
      CREATED: number;
      SCHEDULED: number;
      ASSIGNED: number;
      IN_PROGRESS: number;
      COMPLETED: number;
    };
  };
  assignments: {
    total: number;
    pending: number;
    accepted: number;
  };
  providers: {
    total: number;
    active: number;
  };
  tasks: {
    total: number;
    pending: number;
    overdue: number;
  };
}

export interface KPIData {
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

export interface AnalyticsData {
  serviceOrders: {
    total: KPIData;
    completed: KPIData;
    avgCompletionTime: KPIData;
    successRate: KPIData;
  };
  assignments: {
    total: KPIData;
    acceptanceRate: KPIData;
    avgResponseTime: KPIData;
  };
  providers: {
    total: KPIData;
    activeRate: KPIData;
    utilization: KPIData;
  };
  trends: {
    labels: string[];
    serviceOrders: number[];
    completions: number[];
    assignments: number[];
  };
}

export interface CriticalAction {
  id: string;
  type: 'UNASSIGNED' | 'OVERDUE' | 'SLA_RISK' | 'PENDING_RESPONSE' | 'FAILED_ASSIGNMENT' | 'ESCALATED';
  title: string;
  description: string;
  count: number;
  priority: 'critical' | 'high' | 'medium';
  link: string;
}

export interface PriorityTask {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  escalationLevel: number;
  serviceOrderId: string | null;
  serviceOrderExternalId: string | null;
  customerName: string;
  assignee: {
    id: string;
    name: string;
  } | null;
  slaDeadline: string | null;
  isOverdue: boolean;
  hoursRemaining: number | null;
  createdAt: string;
}

interface ApiResponse<T> {
  data: T;
  meta: any;
}

export const dashboardService = {
  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<DashboardStats> {
    const response = await apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats');
    return response.data.data;
  },

  /**
   * Get advanced analytics data
   */
  async getAnalytics(range: string = '30d'): Promise<AnalyticsData> {
    const response = await apiClient.get<ApiResponse<AnalyticsData>>('/dashboard/analytics', {
      params: { range },
    });
    return response.data.data;
  },

  /**
   * Get critical actions requiring immediate attention
   */
  async getCriticalActions(): Promise<CriticalAction[]> {
    const response = await apiClient.get<ApiResponse<CriticalAction[]>>('/dashboard/critical-actions');
    return response.data.data;
  },

  /**
   * Get priority tasks for dashboard
   */
  async getPriorityTasks(limit: number = 10): Promise<PriorityTask[]> {
    const response = await apiClient.get<ApiResponse<PriorityTask[]>>('/dashboard/priority-tasks', {
      params: { limit },
    });
    return response.data.data;
  },
};
