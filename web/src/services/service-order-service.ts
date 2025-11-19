/**
 * Service Order Service
 * API calls for service order management
 */

import apiClient from './api-client';
import { ServiceOrder, PaginatedResponse, SalesPotential, RiskLevel, GoExecStatus } from '@/types';

interface ServiceOrderFilters {
  status?: string;
  serviceType?: string;
  priority?: string;
  salesPotential?: string;
  riskLevel?: string;
  countryCode?: string;
  page?: number;
  limit?: number;
}

interface AssessSalesPotentialDto {
  salesPotential: SalesPotential;
  salesPotentialScore: number;
  salesPreEstimationValue?: number;
  salesmanNotes?: string;
}

interface AssessRiskDto {
  riskLevel: RiskLevel;
  riskScore: number;
  riskFactors?: Record<string, unknown>;
}

interface UpdateGoExecDto {
  goExecStatus: GoExecStatus;
  goExecBlockReason?: string;
  paymentStatus?: string;
  productDeliveryStatus?: string;
}

class ServiceOrderService {
  /**
   * Get all service orders with filters
   */
  async getAll(filters: ServiceOrderFilters = {}): Promise<PaginatedResponse<ServiceOrder>> {
    const response = await apiClient.get<PaginatedResponse<ServiceOrder>>('/service-orders', {
      params: filters,
    });
    return response.data;
  }

  /**
   * Get service order by ID
   */
  async getById(id: string): Promise<ServiceOrder> {
    const response = await apiClient.get<ServiceOrder>(`/service-orders/${id}`);
    return response.data;
  }

  /**
   * Assess sales potential (AI-powered)
   */
  async assessSalesPotential(id: string, data: AssessSalesPotentialDto): Promise<ServiceOrder> {
    const response = await apiClient.post<ServiceOrder>(
      `/service-orders/${id}/assess-sales-potential`,
      data
    );
    return response.data;
  }

  /**
   * Assess risk level (AI-powered)
   */
  async assessRisk(id: string, data: AssessRiskDto): Promise<ServiceOrder> {
    const response = await apiClient.post<ServiceOrder>(`/service-orders/${id}/assess-risk`, data);
    return response.data;
  }

  /**
   * Acknowledge risk
   */
  async acknowledgeRisk(id: string, userId: string): Promise<ServiceOrder> {
    const response = await apiClient.post<ServiceOrder>(`/service-orders/${id}/acknowledge-risk`, {
      userId,
    });
    return response.data;
  }

  /**
   * Update Go Exec status
   */
  async updateGoExecStatus(id: string, data: UpdateGoExecDto): Promise<ServiceOrder> {
    const response = await apiClient.patch<ServiceOrder>(
      `/service-orders/${id}/go-exec-status`,
      data
    );
    return response.data;
  }

  /**
   * Override Go Exec (derogation)
   */
  async overrideGoExec(
    id: string,
    data: { reason: string; approvedBy: string }
  ): Promise<ServiceOrder> {
    const response = await apiClient.post<ServiceOrder>(
      `/service-orders/${id}/override-go-exec`,
      data
    );
    return response.data;
  }

  /**
   * Get service order statistics
   */
  async getStatistics() {
    const response = await apiClient.get('/service-orders/statistics');
    return response.data;
  }

  /**
   * Reschedule service order to new date/slot
   */
  async reschedule(
    id: string,
    data: {
      newDate: string;
      newSlot: 'AM' | 'PM';
      reason: string;
      reassignProvider: boolean;
      notifyCustomer: boolean;
      notifyProvider: boolean;
    }
  ): Promise<{
    serviceOrderId: string;
    previousSchedule: {
      date: string;
      slot: string;
    };
    newSchedule: {
      date: string;
      slot: string;
      confirmedAt: string;
    };
    rescheduledBy: string;
    rescheduledAt: string;
    reason: string;
    notifications: {
      customerNotified: boolean;
      providerNotified: boolean;
    };
    message: string;
  }> {
    const response = await apiClient.post(
      `/cockpit/service-orders/${id}/reschedule`,
      data
    );
    return response.data;
  }

  /**
   * Record Technical Visit outcome
   */
  async recordTVOutcome(
    id: string,
    data: {
      outcome: 'YES' | 'YES_BUT' | 'NO';
      findings: string;
      issues?: string;
      scopeChanges?: string;
      requiredActions?: string;
      estimatedValue?: number;
      blockInstallation: boolean;
    }
  ): Promise<ServiceOrder> {
    const response = await apiClient.post<ServiceOrder>(
      `/service-orders/${id}/tv-outcome`,
      data
    );
    return response.data;
  }

  /**
   * Get blocked installation orders
   */
  async getBlockedOrders(projectId?: string): Promise<Array<{
    id: string;
    externalId: string;
    serviceType: string;
    blockedBy: {
      tvOrderId: string;
      tvOrderExternalId: string;
      outcome: 'NO' | 'YES_BUT';
      reason: string;
    };
    blockedAt: string;
    status: string;
  }>> {
    const response = await apiClient.get('/service-orders/blocked', {
      params: { projectId },
    });
    return response.data;
  }

  /**
   * Unblock installation order
   */
  async unblockOrder(id: string, reason: string): Promise<ServiceOrder> {
    const response = await apiClient.post<ServiceOrder>(
      `/service-orders/${id}/unblock`,
      { reason }
    );
    return response.data;
  }
}

export const serviceOrderService = new ServiceOrderService();
