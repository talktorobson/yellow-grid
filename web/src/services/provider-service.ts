/**
 * Provider Service
 * API calls for provider management
 */

import apiClient from './api-client';
import { Provider, PaginatedResponse } from '@/types';

interface ApiResponse<T> {
  data: T;
  meta: any;
}

interface ProviderFilters {
  status?: string;
  countryCode?: string;
  serviceType?: string;
  coverageZone?: string;
  page?: number;
  limit?: number;
}

interface CreateProviderDto {
  externalId: string;
  name: string;
  countryCode: string;
  email: string;
  phone: string;
  serviceTypes: string[];
  coverageZones: string[];
}

class ProviderService {
  /**
   * Get all providers with filters
   */
  async getAll(filters: ProviderFilters = {}): Promise<PaginatedResponse<Provider>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Provider>>>('/providers', {
      params: filters,
    });
    return response.data.data;
  }

  /**
   * Get provider by ID
   */
  async getById(id: string): Promise<Provider> {
    const response = await apiClient.get<ApiResponse<Provider>>(`/providers/${id}`);
    return response.data.data;
  }

  /**
   * Create provider
   */
  async create(data: CreateProviderDto): Promise<Provider> {
    const response = await apiClient.post<ApiResponse<Provider>>('/providers', data);
    return response.data.data;
  }

  /**
   * Update provider
   */
  async update(id: string, data: Partial<CreateProviderDto>): Promise<Provider> {
    const response = await apiClient.patch<ApiResponse<Provider>>(`/providers/${id}`, data);
    return response.data.data;
  }

  /**
   * Delete provider
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/providers/${id}`);
  }

  /**
   * Search providers for assignment
   * Returns providers that match criteria for a service order
   */
  async searchForAssignment(serviceOrderId: string, filters: {
    serviceType?: string;
    coverageZone?: string;
    limit?: number;
  }): Promise<Provider[]> {
    const response = await apiClient.get<Provider[]>('/providers/search-for-assignment', {
      params: {
        serviceOrderId,
        ...filters,
      },
    });
    return response.data;
  }
}

export const providerService = new ProviderService();
