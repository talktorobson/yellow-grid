/**
 * Service Order Service
 * API calls for service order management
 */

import apiClient from './api-client';
import { ServiceOrder, PaginatedResponse, SalesPotential, RiskLevel, GoExecStatus } from '@/types';

interface ApiResponse<T> {
  data: T;
  meta: any;
}

interface ServiceOrderFilters {
  status?: string;
  serviceType?: string;
  priority?: string;
  salesPotential?: string;
  riskLevel?: string;
  countryCode?: string;
  assignedProviderId?: string;
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

interface CreateServiceOrderDto {
  projectId?: string;
  serviceId: string;
  countryCode: string;
  businessUnit: string;
  customerInfo: {
    name: string;
    email?: string;
    phone?: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
  };
  serviceType: 'INSTALLATION' | 'REPAIR' | 'MAINTENANCE' | 'TECHNICAL_VISIT' | 'QUOTATION';
  urgency: 'URGENT' | 'STANDARD' | 'LOW';
  estimatedDurationMinutes: number;
  serviceAddress: {
    street: string;
    city: string;
    postalCode: string;
    lat?: number;
    lng?: number;
  };
  requestedStartDate: string;
  requestedEndDate: string;
  requestedTimeSlot?: string;
  externalServiceOrderId?: string;
  externalSalesOrderId?: string;
  externalProjectId?: string;
  salesmanNotes?: string;
}

class ServiceOrderService {
  /**
   * Create a new service order
   */
  async create(data: CreateServiceOrderDto): Promise<ServiceOrder> {
    const response = await apiClient.post<ApiResponse<ServiceOrder>>('/service-orders', data);
    return response.data.data;
  }

  /**
   * Get all service orders with filters
   */
  async getAll(filters: ServiceOrderFilters = {}): Promise<PaginatedResponse<ServiceOrder>> {
    // Remove empty filters
    const params = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '' && v !== undefined && v !== null)
    );

    const response = await apiClient.get<ApiResponse<PaginatedResponse<ServiceOrder>>>('/service-orders', {
      params,
    });
    return response.data.data;
  }

  /**
   * Get service order by ID
   */
  async getById(id: string): Promise<ServiceOrder> {
    const response = await apiClient.get<ApiResponse<ServiceOrder>>(`/service-orders/${id}`);
    return response.data.data;
  }

  /**
   * Assess sales potential (AI-powered)
   */
  async assessSalesPotential(id: string, data: AssessSalesPotentialDto): Promise<ServiceOrder> {
    const response = await apiClient.post<ApiResponse<ServiceOrder>>(
      `/service-orders/${id}/assess-sales-potential`,
      data
    );
    return response.data.data;
  }

  /**
   * Assess risk level (AI-powered)
   */
  async assessRisk(id: string, data: AssessRiskDto): Promise<ServiceOrder> {
    const response = await apiClient.post<ApiResponse<ServiceOrder>>(`/service-orders/${id}/assess-risk`, data);
    return response.data.data;
  }

  /**
   * Acknowledge risk
   */
  async acknowledgeRisk(id: string, userId: string): Promise<ServiceOrder> {
    const response = await apiClient.post<ApiResponse<ServiceOrder>>(`/service-orders/${id}/acknowledge-risk`, {
      userId,
    });
    return response.data.data;
  }

  /**
   * Update Go Exec status
   */
  async updateGoExecStatus(id: string, data: UpdateGoExecDto): Promise<ServiceOrder> {
    const response = await apiClient.patch<ApiResponse<ServiceOrder>>(
      `/service-orders/${id}/go-exec-status`,
      data
    );
    return response.data.data;
  }

  /**
   * Override Go Exec (derogation)
   */
  async overrideGoExec(
    id: string,
    data: { reason: string; approvedBy: string }
  ): Promise<ServiceOrder> {
    const response = await apiClient.post<ApiResponse<ServiceOrder>>(
      `/service-orders/${id}/override-go-exec`,
      data
    );
    return response.data.data;
  }

  /**
   * Get service order statistics
   */
  async getStatistics() {
    const response = await apiClient.get<ApiResponse<any>>('/service-orders/statistics');
    return response.data.data;
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
    const response = await apiClient.post<ApiResponse<any>>(
      `/cockpit/service-orders/${id}/reschedule`,
      data
    );
    return response.data.data;
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
    const response = await apiClient.post<ApiResponse<ServiceOrder>>(
      `/service-orders/${id}/tv-outcome`,
      data
    );
    return response.data.data;
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
    const response = await apiClient.get<ApiResponse<any>>('/service-orders/blocked', {
      params: { projectId },
    });
    return response.data.data;
  }

  /**
   * Unblock installation order
   */
  async unblockOrder(id: string, reason: string): Promise<ServiceOrder> {
    const response = await apiClient.post<ApiResponse<ServiceOrder>>(
      `/service-orders/${id}/unblock`,
      { reason }
    );
    return response.data.data;
  }

  /**
   * Bulk assign service orders
   */
  async bulkAssign(ids: string[]): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const response = await apiClient.post<ApiResponse<any>>('/service-orders/bulk/assign', {
      serviceOrderIds: ids,
    });
    return response.data.data;
  }

  /**
   * Bulk cancel service orders
   */
  async bulkCancel(ids: string[], reason: string): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const response = await apiClient.post<ApiResponse<any>>('/service-orders/bulk/cancel', {
      serviceOrderIds: ids,
      reason,
    });
    return response.data.data;
  }

  /**
   * Bulk update status
   */
  async bulkUpdateStatus(ids: string[], status: string): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const response = await apiClient.post<ApiResponse<any>>('/service-orders/bulk/update-status', {
      serviceOrderIds: ids,
      status,
    });
    return response.data.data;
  }

  /**
   * Bulk reschedule service orders
   */
  async bulkReschedule(ids: string[]): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const response = await apiClient.post<ApiResponse<any>>('/service-orders/bulk/reschedule', {
      serviceOrderIds: ids,
    });
    return response.data.data;
  }

  /**
   * Bulk export service orders
   */
  async bulkExport(ids: string[], format: 'csv' | 'excel'): Promise<Blob> {
    // Export returns a blob, not a JSON wrapper
    const response = await apiClient.post(
      '/service-orders/bulk/export',
      {
        serviceOrderIds: ids,
        format,
      },
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }
}

export const serviceOrderService = new ServiceOrderService();
