/**
 * User Service
 * API calls for user management
 */

import apiClient from './api-client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  countryCode: string;
  businessUnit: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedUsers {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApiResponse<T> {
  data: T;
  meta: any;
}

interface UserFilters {
  search?: string;
  role?: string;
  isActive?: boolean;
  countryCode?: string;
  businessUnit?: string;
  page?: number;
  limit?: number;
}

interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roles: string[];
  countryCode?: string;
  businessUnit?: string;
}

interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  countryCode?: string;
  businessUnit?: string;
}

class UserService {
  /**
   * Get all users with filters and pagination
   */
  async getAll(filters: UserFilters = {}): Promise<PaginatedUsers> {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '' && v !== undefined && v !== null)
    );

    const response = await apiClient.get<ApiResponse<PaginatedUsers>>('/users', { params });
    return response.data.data;
  }

  /**
   * Get user by ID
   */
  async getById(id: string): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
    return response.data.data;
  }

  /**
   * Create user
   */
  async create(data: CreateUserDto): Promise<User> {
    const response = await apiClient.post<ApiResponse<User>>('/users', data);
    return response.data.data;
  }

  /**
   * Update user
   */
  async update(id: string, data: UpdateUserDto): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>(`/users/${id}`, data);
    return response.data.data;
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  }

  /**
   * Assign role to user
   */
  async assignRole(id: string, roleName: string): Promise<User> {
    const response = await apiClient.post<ApiResponse<User>>(`/users/${id}/roles`, { roleName });
    return response.data.data;
  }

  /**
   * Remove role from user
   */
  async removeRole(id: string, roleName: string): Promise<User> {
    const response = await apiClient.delete<ApiResponse<User>>(`/users/${id}/roles/${roleName}`);
    return response.data.data;
  }
}

export const userService = new UserService();
