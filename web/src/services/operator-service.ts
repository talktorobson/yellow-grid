/**
 * Operator Service
 * API calls for operator management and workload tracking
 */

import apiClient from './api-client';
import { UUID, ISODateString } from '@/types';

// Operator interfaces
export interface Operator {
  id: UUID;
  externalId: string;
  name: string;
  email: string;
  countryCode: string;
  businessUnit: string;
  role: string;
  currentProjectCount: number;
  currentWorkload: number;
  maxWorkload: number;
  availabilityScore: number;
  status: 'AVAILABLE' | 'BUSY' | 'OVERLOADED' | 'UNAVAILABLE';
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface OperatorWorkloadStats {
  operators: Operator[];
  summary: {
    totalOperators: number;
    availableOperators: number;
    busyOperators: number;
    overloadedOperators: number;
    averageWorkload: number;
    totalProjects: number;
  };
}

class OperatorService {
  /**
   * Get all operators
   */
  async getAll(params?: {
    countryCode?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ operators: Operator[]; total: number; page: number; limit: number }> {
    const response = await apiClient.get<{
      operators: Operator[];
      total: number;
      page: number;
      limit: number;
    }>('/operators', { params });
    return response.data;
  }

  /**
   * Get operator by ID
   */
  async getById(id: string): Promise<Operator> {
    const response = await apiClient.get<Operator>(`/operators/${id}`);
    return response.data;
  }

  /**
   * Get operators for project ownership
   */
  async getOperatorsForProjectOwnership(countryCode: string): Promise<Operator[]> {
    const response = await apiClient.get<Operator[]>(
      `/operators/project-ownership/${countryCode}`
    );
    return response.data;
  }

  /**
   * Get workload statistics
   */
  async getWorkloadStats(
    countryCode?: string,
    operatorId?: string
  ): Promise<OperatorWorkloadStats> {
    const response = await apiClient.get<OperatorWorkloadStats>('/operators/workload-stats', {
      params: { countryCode, operatorId },
    });
    return response.data;
  }

  /**
   * Update operator availability
   */
  async updateAvailability(
    id: string,
    data: { status: string; reason?: string }
  ): Promise<Operator> {
    const response = await apiClient.patch<Operator>(`/operators/${id}/availability`, data);
    return response.data;
  }
}

export const operatorService = new OperatorService();
