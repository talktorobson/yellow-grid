/**
 * Project Service
 * API calls for project management and project ownership
 */

import apiClient from './api-client';
import { UUID, ISODateString } from '@/types';

// Project interfaces
export interface Project {
  id: UUID;
  externalId: string;
  salesOrderId?: string;
  salesSystemSource?: string;
  countryCode: string;
  businessUnit: string;
  storeCode?: string;
  status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  projectOwnerId?: string;
  projectOwnerName?: string;
  projectOwnerAssignmentMode?: 'AUTO' | 'MANUAL';
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceOrderCount: number;
  completedServiceOrderCount: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface ProjectOwnershipRecommendation {
  projectId: UUID;
  recommendedOperatorId: string;
  operatorName: string;
  operatorEmail: string;
  currentProjectCount: number;
  currentWorkload: number;
  maxWorkload: number;
  matchScore: number;
  reason: string;
}

export interface AssignProjectOwnerDto {
  operatorId?: string;
  mode: 'AUTO' | 'MANUAL';
}

class ProjectService {
  /**
   * Get all projects
   */
  async getAll(params?: {
    countryCode?: string;
    status?: string;
    projectOwnerId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ projects: Project[]; total: number; page: number; limit: number }> {
    const response = await apiClient.get<{
      projects: Project[];
      total: number;
      page: number;
      limit: number;
    }>('/projects', { params });
    return response.data;
  }

  /**
   * Get project by ID
   */
  async getById(id: string): Promise<Project> {
    const response = await apiClient.get<Project>(`/projects/${id}`);
    return response.data;
  }

  /**
   * Get project ownership recommendation
   */
  async getOwnershipRecommendation(id: string): Promise<ProjectOwnershipRecommendation> {
    const response = await apiClient.get<ProjectOwnershipRecommendation>(
      `/projects/${id}/ownership-recommendation`
    );
    return response.data;
  }

  /**
   * Assign project owner
   */
  async assignProjectOwner(id: string, data: AssignProjectOwnerDto): Promise<Project> {
    const response = await apiClient.post<Project>(`/projects/${id}/assign-owner`, data);
    return response.data;
  }

  /**
   * Remove project owner
   */
  async removeProjectOwner(id: string): Promise<Project> {
    const response = await apiClient.delete<Project>(`/projects/${id}/owner`);
    return response.data;
  }

  /**
   * Get project statistics
   */
  async getStatistics(params?: {
    countryCode?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalProjects: number;
    projectsByStatus: Record<string, number>;
    projectsWithOwner: number;
    projectsWithoutOwner: number;
    averageServiceOrdersPerProject: number;
  }> {
    const response = await apiClient.get('/projects/statistics', { params });
    return response.data;
  }
}

export const projectService = new ProjectService();
