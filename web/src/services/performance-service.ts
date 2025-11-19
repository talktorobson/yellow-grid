/**
 * Performance Service
 * API calls for performance metrics and analytics
 */

import apiClient from './api-client';

export interface OperatorPerformance {
  operatorId: string;
  operatorName: string;
  countryCode: string;
  metrics: {
    totalServiceOrders: number;
    completedServiceOrders: number;
    completionRate: number;
    averageCompletionTime: number; // in days
    onTimeDeliveryRate: number;
    customerSatisfactionScore: number; // 1-5
    activeServiceOrders: number;
    p1ResponseTime: number; // in hours
    p2ResponseTime: number; // in hours
  };
  period: {
    startDate: string;
    endDate: string;
  };
  trends: {
    completionRateTrend: 'up' | 'down' | 'stable';
    satisfactionTrend: 'up' | 'down' | 'stable';
  };
}

export interface ProviderPerformance {
  providerId: string;
  providerName: string;
  countryCode: string;
  metrics: {
    totalAssignments: number;
    completedAssignments: number;
    completionRate: number;
    acceptanceRate: number;
    averageCompletionTime: number; // in days
    onTimeDeliveryRate: number;
    qualityScore: number; // 1-5
    customerRating: number; // 1-5
    repeatIssueRate: number; // percentage
    responseTime: number; // in hours
  };
  period: {
    startDate: string;
    endDate: string;
  };
  trends: {
    completionRateTrend: 'up' | 'down' | 'stable';
    qualityTrend: 'up' | 'down' | 'stable';
  };
}

export interface TeamPerformance {
  teamId: string;
  teamName: string;
  countryCode: string;
  businessUnit: string;
  metrics: {
    totalServiceOrders: number;
    completedServiceOrders: number;
    completionRate: number;
    averageResolutionTime: number; // in days
    firstTimeFixRate: number;
    utilizationRate: number;
    activeOperators: number;
    activeProviders: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface PerformanceTrends {
  labels: string[]; // Dates or periods
  datasets: Array<{
    label: string;
    data: number[];
    color: string;
  }>;
}

interface PerformanceFilters {
  countryCode?: string;
  businessUnit?: string;
  startDate?: string;
  endDate?: string;
  operatorId?: string;
  providerId?: string;
}

class PerformanceService {
  /**
   * Get operator performance metrics
   */
  async getOperatorPerformance(filters: PerformanceFilters = {}): Promise<{
    operators: OperatorPerformance[];
    total: number;
  }> {
    const response = await apiClient.get('/performance/operators', {
      params: filters,
    });
    return response.data;
  }

  /**
   * Get provider performance metrics
   */
  async getProviderPerformance(filters: PerformanceFilters = {}): Promise<{
    providers: ProviderPerformance[];
    total: number;
  }> {
    const response = await apiClient.get('/performance/providers', {
      params: filters,
    });
    return response.data;
  }

  /**
   * Get team performance metrics
   */
  async getTeamPerformance(filters: PerformanceFilters = {}): Promise<{
    teams: TeamPerformance[];
    total: number;
  }> {
    const response = await apiClient.get('/performance/teams', {
      params: filters,
    });
    return response.data;
  }

  /**
   * Get performance trends over time
   */
  async getPerformanceTrends(
    type: 'operators' | 'providers' | 'teams',
    metric: string,
    filters: PerformanceFilters = {}
  ): Promise<PerformanceTrends> {
    const response = await apiClient.get(`/performance/trends/${type}/${metric}`, {
      params: filters,
    });
    return response.data;
  }

  /**
   * Get overall dashboard summary
   */
  async getDashboardSummary(filters: PerformanceFilters = {}): Promise<{
    totalServiceOrders: number;
    completedServiceOrders: number;
    overallCompletionRate: number;
    averageCustomerSatisfaction: number;
    topPerformers: {
      operators: Array<{ id: string; name: string; score: number }>;
      providers: Array<{ id: string; name: string; score: number }>;
    };
    alerts: Array<{
      type: 'warning' | 'error' | 'info';
      message: string;
      entity: string;
      entityId: string;
    }>;
  }> {
    const response = await apiClient.get('/performance/dashboard', {
      params: filters,
    });
    return response.data;
  }

  /**
   * Export performance report
   */
  async exportReport(
    type: 'operators' | 'providers' | 'teams',
    format: 'csv' | 'excel' | 'pdf',
    filters: PerformanceFilters = {}
  ): Promise<Blob> {
    const response = await apiClient.post(
      `/performance/export/${type}`,
      {
        format,
        ...filters,
      },
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }
}

export const performanceService = new PerformanceService();
