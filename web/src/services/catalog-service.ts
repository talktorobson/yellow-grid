/**
 * Catalog Service
 * API calls for service catalog management
 */

import apiClient from './api-client';

export interface CatalogService {
  id: string;
  externalCode: string;
  fsmCode?: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  basePrice?: number;
  currency: string;
  estimatedDuration?: number;
  requiredSkills: string[];
  isActive: boolean;
  countryCode: string;
  businessUnit: string;
  validFrom?: string;
  validTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedServices {
  data: CatalogService[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ServiceStats {
  total: number;
  active: number;
  inactive: number;
  byCategory: Record<string, number>;
}

export interface Specialty {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  countryCode: string;
  businessUnit: string;
}

interface ApiResponse<T> {
  data: T;
  meta: any;
}

interface ServiceFilters {
  search?: string;
  category?: string;
  isActive?: boolean;
  countryCode?: string;
  businessUnit?: string;
  page?: number;
  limit?: number;
}

interface CreateServiceDto {
  externalCode: string;
  fsmCode?: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  basePrice?: number;
  currency?: string;
  estimatedDuration?: number;
  requiredSkills?: string[];
  isActive?: boolean;
  countryCode: string;
  businessUnit: string;
}

interface UpdateServiceDto {
  name?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  basePrice?: number;
  estimatedDuration?: number;
  requiredSkills?: string[];
  isActive?: boolean;
}

class CatalogServiceApi {
  /**
   * Get all services with filters
   */
  async getAll(filters: ServiceFilters = {}): Promise<PaginatedServices> {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '' && v !== undefined && v !== null)
    );

    const response = await apiClient.get<ApiResponse<PaginatedServices>>('/service-catalog/services', { params });
    return response.data.data;
  }

  /**
   * Search services
   */
  async search(query: string, filters: ServiceFilters = {}): Promise<CatalogService[]> {
    const params = { q: query, ...filters };
    const response = await apiClient.get<ApiResponse<CatalogService[]>>('/service-catalog/services/search', { params });
    return response.data.data;
  }

  /**
   * Get service by ID
   */
  async getById(id: string): Promise<CatalogService> {
    const response = await apiClient.get<ApiResponse<CatalogService>>(`/service-catalog/services/${id}`);
    return response.data.data;
  }

  /**
   * Get service stats
   */
  async getStats(): Promise<ServiceStats> {
    const response = await apiClient.get<ApiResponse<ServiceStats>>('/service-catalog/services/stats');
    return response.data.data;
  }

  /**
   * Create service
   */
  async create(data: CreateServiceDto): Promise<CatalogService> {
    const response = await apiClient.post<ApiResponse<CatalogService>>('/service-catalog/services', data);
    return response.data.data;
  }

  /**
   * Update service
   */
  async update(id: string, data: UpdateServiceDto): Promise<CatalogService> {
    const response = await apiClient.patch<ApiResponse<CatalogService>>(`/service-catalog/services/${id}`, data);
    return response.data.data;
  }

  /**
   * Delete service
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/service-catalog/services/${id}`);
  }

  /**
   * Get specialties
   */
  async getSpecialties(): Promise<Specialty[]> {
    const response = await apiClient.get<ApiResponse<Specialty[]>>('/service-catalog/specialties');
    return response.data.data;
  }

  /**
   * Get specialty by code
   */
  async getSpecialtyByCode(code: string): Promise<Specialty> {
    const response = await apiClient.get<ApiResponse<Specialty>>(`/service-catalog/specialties/${code}`);
    return response.data.data;
  }
}

export const catalogService = new CatalogServiceApi();
