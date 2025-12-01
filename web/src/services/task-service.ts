/**
 * Task Service
 * API calls for task management
 */

import apiClient from './api-client';

export type TaskType = 'MANUAL_SCHEDULING' | 'FOLLOW_UP' | 'DOCUMENT_REVIEW' | 'PROVIDER_ONBOARDING' | 'QUALITY_CHECK' | 'ESCALATION' | 'CUSTOM';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'BLOCKED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToId?: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  serviceOrderId?: string;
  serviceOrder?: {
    id: string;
    reference: string;
    status: string;
  };
  providerId?: string;
  provider?: {
    id: string;
    name: string;
  };
  dueDate?: string;
  slaDeadline?: string;
  slaPausedAt?: string;
  slaPausedReason?: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedTasks {
  data: Task[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TaskDashboard {
  pendingCount: number;
  overdueCount: number;
  completedTodayCount: number;
  byType: Record<TaskType, number>;
  byPriority: Record<TaskPriority, number>;
  recentTasks: Task[];
}

interface ApiResponse<T> {
  data: T;
  meta: any;
}

interface TaskFilters {
  status?: TaskStatus;
  type?: TaskType;
  priority?: TaskPriority;
  assignedToId?: string;
  serviceOrderId?: string;
  providerId?: string;
  overdue?: boolean;
  page?: number;
  limit?: number;
}

interface CreateTaskDto {
  type: TaskType;
  title: string;
  description?: string;
  priority?: TaskPriority;
  assignedToId?: string;
  serviceOrderId?: string;
  providerId?: string;
  dueDate?: string;
  metadata?: Record<string, unknown>;
}

interface UpdateTaskDto {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  assignedToId?: string;
  dueDate?: string;
  metadata?: Record<string, unknown>;
}

class TaskService {
  /**
   * Get all tasks with filters
   */
  async getAll(filters: TaskFilters = {}): Promise<PaginatedTasks> {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '' && v !== undefined && v !== null)
    );

    const response = await apiClient.get<ApiResponse<PaginatedTasks>>('/tasks', { params });
    return response.data.data;
  }

  /**
   * Get task dashboard data
   */
  async getDashboard(): Promise<TaskDashboard> {
    const response = await apiClient.get<ApiResponse<TaskDashboard>>('/tasks/dashboard');
    return response.data.data;
  }

  /**
   * Get task by ID
   */
  async getById(id: string): Promise<Task> {
    const response = await apiClient.get<ApiResponse<Task>>(`/tasks/${id}`);
    return response.data.data;
  }

  /**
   * Create task
   */
  async create(data: CreateTaskDto): Promise<Task> {
    const response = await apiClient.post<ApiResponse<Task>>('/tasks', data);
    return response.data.data;
  }

  /**
   * Update task
   */
  async update(id: string, data: UpdateTaskDto): Promise<Task> {
    const response = await apiClient.patch<ApiResponse<Task>>(`/tasks/${id}`, data);
    return response.data.data;
  }

  /**
   * Assign task
   */
  async assign(id: string, userId: string): Promise<Task> {
    const response = await apiClient.post<ApiResponse<Task>>(`/tasks/${id}/assign`, { userId });
    return response.data.data;
  }

  /**
   * Start task
   */
  async start(id: string): Promise<Task> {
    const response = await apiClient.post<ApiResponse<Task>>(`/tasks/${id}/start`);
    return response.data.data;
  }

  /**
   * Complete task
   */
  async complete(id: string, notes?: string): Promise<Task> {
    const response = await apiClient.post<ApiResponse<Task>>(`/tasks/${id}/complete`, { notes });
    return response.data.data;
  }

  /**
   * Cancel task
   */
  async cancel(id: string, reason?: string): Promise<Task> {
    const response = await apiClient.post<ApiResponse<Task>>(`/tasks/${id}/cancel`, { reason });
    return response.data.data;
  }

  /**
   * Pause SLA
   */
  async pauseSla(id: string, reason: string): Promise<Task> {
    const response = await apiClient.post<ApiResponse<Task>>(`/tasks/${id}/sla/pause`, { reason });
    return response.data.data;
  }

  /**
   * Resume SLA
   */
  async resumeSla(id: string): Promise<Task> {
    const response = await apiClient.post<ApiResponse<Task>>(`/tasks/${id}/sla/resume`);
    return response.data.data;
  }
}

export const taskService = new TaskService();
