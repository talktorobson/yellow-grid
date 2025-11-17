/**
 * Service Orders API Service
 */
import { apiClient } from './client';
import type { ServiceOrder, SalesPotential, RiskLevel } from '../types';

export const serviceOrdersApi = {
  // Basic CRUD
  getAll: (params?: {
    status?: string;
    priority?: string;
    countryCode?: string;
    serviceType?: string;
  }) => apiClient.get<ServiceOrder[]>('/api/v1/service-orders', { params }),

  getById: (id: string) =>
    apiClient.get<ServiceOrder>(`/api/v1/service-orders/${id}`),

  create: (data: Partial<ServiceOrder>) =>
    apiClient.post<ServiceOrder>('/api/v1/service-orders', data),

  update: (id: string, data: Partial<ServiceOrder>) =>
    apiClient.put<ServiceOrder>(`/api/v1/service-orders/${id}`, data),

  getStatistics: () =>
    apiClient.get('/api/v1/service-orders/statistics'),

  // Sales potential assessment (AI)
  assessSalesPotential: (id: string, data: {
    salesPotential: SalesPotential;
    salesPotentialScore: number;
    salesPreEstimationValue?: number;
    salesmanNotes?: string;
  }) => apiClient.post(`/api/v1/service-orders/${id}/assess-sales-potential`, data),

  getBySalesPotential: (potential: SalesPotential, countryCode?: string) =>
    apiClient.get<ServiceOrder[]>('/api/v1/service-orders/sales-potential', {
      params: { potential, countryCode },
    }),

  // Risk assessment (AI)
  assessRisk: (id: string, data: {
    riskLevel: RiskLevel;
    riskScore: number;
    riskFactors?: any;
  }) => apiClient.post(`/api/v1/service-orders/${id}/assess-risk`, data),

  acknowledgeRisk: (id: string, userId: string) =>
    apiClient.post(`/api/v1/service-orders/${id}/acknowledge-risk`, { userId }),

  getHighRiskOrders: (countryCode?: string) =>
    apiClient.get<ServiceOrder[]>('/api/v1/service-orders/high-risk', {
      params: { countryCode },
    }),

  // Go Execution monitoring
  updateGoExecStatus: (id: string, data: {
    goExecStatus: 'OK' | 'NOK' | 'DEROGATION';
    goExecBlockReason?: string;
    paymentStatus?: string;
    productDeliveryStatus?: string;
  }) => apiClient.post(`/api/v1/service-orders/${id}/go-exec-status`, data),

  overrideGoExec: (id: string, data: {
    reason: string;
    approvedBy: string;
  }) => apiClient.post(`/api/v1/service-orders/${id}/override-go-exec`, data),

  getGoExecIssues: (countryCode?: string) =>
    apiClient.get<ServiceOrder[]>('/api/v1/service-orders/go-exec-issues', {
      params: { countryCode },
    }),
};
