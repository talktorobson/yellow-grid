import apiClient from '../../api/client';
import { 
  CheckInRequest, 
  CheckInResponse, 
  CheckOutRequest, 
  CheckOutResponse,
  DeviceInfo
} from '../../types/api';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import NetInfo from '@react-native-community/netinfo';
import { OfflineQueueService } from '../offline/OfflineQueueService';

export class ExecutionService {
  private static instance: ExecutionService;

  private constructor() {}

  static getInstance(): ExecutionService {
    if (!ExecutionService.instance) {
      ExecutionService.instance = new ExecutionService();
    }
    return ExecutionService.instance;
  }

  private getDeviceInfo(): DeviceInfo {
    return {
      device_id: Device.osBuildId || 'unknown', // In real app use SecureStore uuid
      platform: Platform.OS === 'ios' ? 'iOS' : 'Android',
      os_version: Device.osVersion || 'unknown',
      app_version: Application.nativeApplicationVersion || '1.0.0',
    };
  }

  async checkIn(jobId: string, location: any): Promise<CheckInResponse> {
    const request: CheckInRequest = {
      timestamp: new Date().toISOString(),
      location,
      device_info: this.getDeviceInfo(),
      offline_queued: false,
    };

    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      await OfflineQueueService.getInstance().addToQueue({
        type: 'CHECK_IN',
        payload: { ...request, job_id: jobId },
      });
      
      // Return fake response for optimistic UI update
      return {
        check_in_id: 'offline_' + Date.now(),
        job_id: jobId,
        user_id: 'current_user',
        check_in_time: request.timestamp,
        location: request.location,
        geofence_validated: true, // Assume valid
        distance_from_site_meters: 0,
        status: 'queued',
      };
    }

    const response = await apiClient.post<any>(`/execution/check-in`, {
      ...request,
      job_id: jobId, 
    });
    
    return response.data;
  }

  async checkOut(jobId: string, location: any): Promise<CheckOutResponse> {
    const request: CheckOutRequest = {
      timestamp: new Date().toISOString(),
      location,
      break_time_minutes: 0,
      work_summary: {
        tasks_completed: [],
        tasks_in_progress: [],
        completion_percentage: 100,
        materials_used: [],
        issues_encountered: [],
        follow_up_required: false
      },
      offline_queued: false,
    };

    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      await OfflineQueueService.getInstance().addToQueue({
        type: 'CHECK_OUT',
        payload: { ...request, job_id: jobId },
      });

      return {
        check_out_id: 'offline_' + Date.now(),
        job_id: jobId,
        user_id: 'current_user',
        check_in_time: new Date().toISOString(), // Unknown
        check_out_time: request.timestamp,
        total_hours: 0,
        billable_hours: 0,
        break_time_minutes: 0,
        overtime_hours: 0,
        status: 'queued',
        time_entry_id: 'offline',
        requires_approval: false,
      };
    }

    const response = await apiClient.post<any>(`/execution/check-out`, {
      ...request,
      job_id: jobId,
    });

    return response.data;
  }
}
