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
};
