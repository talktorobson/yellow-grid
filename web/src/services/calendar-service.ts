/**
 * Calendar Service
 * API calls for provider availability and scheduling
 */

import apiClient from './api-client';
import { ServiceOrder } from '@/types';

interface ApiResponse<T> {
  data: T;
  meta: any;
}

export interface AvailabilitySlot {
  id: string;
  providerId: string;
  startTime: string;
  endTime: string;
  status: 'available' | 'busy' | 'blocked';
  bufferBefore?: number;
  bufferAfter?: number;
}

export interface ProviderAvailability {
  providerId: string;
  providerName: string;
  date: string;
  slots: AvailabilitySlot[];
  totalAvailableHours: number;
  utilization: number; // 0-1
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId?: string;
  type: 'service-order' | 'blocked' | 'available';
  data?: ServiceOrder | AvailabilitySlot;
}

export interface SchedulingConflict {
  serviceOrderId: string;
  conflictType: 'overlap' | 'buffer' | 'capacity';
  message: string;
  affectedProviders: string[];
}

class CalendarService {
  /**
   * Get provider availability for a date range
   */
  async getProviderAvailability(params: {
    providerIds?: string[];
    startDate: string;
    endDate: string;
    countryCode?: string;
  }): Promise<ProviderAvailability[]> {
    const response = await apiClient.get<ApiResponse<ProviderAvailability[]>>('/calendar/availability', {
      params,
    });
    return response.data.data;
  }

  /**
   * Get scheduled service orders for calendar view
   */
  async getScheduledOrders(params: {
    startDate: string;
    endDate: string;
    providerId?: string;
    providerIds?: string[];
    countryCode?: string;
  }): Promise<ServiceOrder[]> {
    const response = await apiClient.get<ApiResponse<ServiceOrder[]>>('/calendar/scheduled-orders', {
      params,
    });
    return response.data.data;
  }

  /**
   * Check for scheduling conflicts
   */
  async checkConflicts(
    serviceOrderId: string,
    providerId: string,
    scheduledDate: string
  ): Promise<SchedulingConflict[]> {
    const response = await apiClient.post<ApiResponse<SchedulingConflict[]>>('/calendar/check-conflicts', {
      serviceOrderId,
      providerId,
      scheduledDate,
    });
    return response.data.data;
  }

  /**
   * Schedule service order
   */
  async scheduleOrder(
    serviceOrderId: string,
    providerId: string,
    scheduledDate: string
  ): Promise<ServiceOrder> {
    const response = await apiClient.post<ApiResponse<ServiceOrder>>('/calendar/schedule', {
      serviceOrderId,
      providerId,
      scheduledDate,
    });
    return response.data.data;
  }

  /**
   * Block provider time
   */
  async blockProviderTime(
    providerId: string,
    startTime: string,
    endTime: string,
    reason: string
  ): Promise<AvailabilitySlot> {
    const response = await apiClient.post<ApiResponse<AvailabilitySlot>>('/calendar/block-time', {
      providerId,
      startTime,
      endTime,
      reason,
    });
    return response.data.data;
  }

  /**
   * Unblock provider time
   */
  async unblockProviderTime(slotId: string): Promise<void> {
    await apiClient.delete(`/calendar/block-time/${slotId}`);
  }

  /**
   * Get calendar utilization stats
   */
  async getUtilizationStats(params: {
    startDate: string;
    endDate: string;
    countryCode?: string;
    providerIds?: string[];
  }) {
    const response = await apiClient.get<ApiResponse<any>>('/calendar/utilization', { params });
    return response.data.data;
  }
}

export const calendarService = new CalendarService();
