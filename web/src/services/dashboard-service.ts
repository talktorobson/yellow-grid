import api from './api';

export interface DashboardStats {
  serviceOrders: {
    total: number;
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
  };
}

export const dashboardService = {
  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<DashboardStats> {
    try {
      // Fetch counts from each endpoint
      const [serviceOrdersRes, assignmentsRes, providersRes] = await Promise.all([
        api.get('/service-orders', { params: { limit: 1 } }),
        api.get('/assignments', { params: { limit: 1 } }),
        api.get('/providers', { params: { limit: 1 } }),
      ]);

      return {
        serviceOrders: {
          total: serviceOrdersRes.data.pagination?.total || 0,
          byStatus: {
            CREATED: 0, // Would need separate API calls or aggregation endpoint
            SCHEDULED: 0,
            ASSIGNED: 0,
            IN_PROGRESS: 0,
            COMPLETED: 0,
          },
        },
        assignments: {
          total: assignmentsRes.data.pagination?.total || 0,
          pending: 0, // Would need filtered query
          accepted: 0,
        },
        providers: {
          total: providersRes.data.pagination?.total || 0,
          active: 0, // Would need filtered query
        },
        tasks: {
          total: 0, // Would need tasks endpoint
          pending: 0,
        },
      };
    } catch (error) {
      console.error('[Dashboard] Failed to fetch stats:', error);
      throw error;
    }
  },
};
