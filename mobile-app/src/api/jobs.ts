/**
 * Jobs API
 *
 * API endpoints for job management, check-in/out, and job updates.
 */

import apiClient from './client';
import {
  ApiResponse,
  CheckInRequest,
  CheckInResponse,
  CheckOutRequest,
  CheckOutResponse,
  GetJobsRequest,
  GetJobsResponse,
  Job,
  UpdateJobStatusRequest,
} from '../types/api';

/**
 * Get list of assigned jobs
 */
export async function getJobs(params: GetJobsRequest = {}): Promise<GetJobsResponse> {
  const response = await apiClient.get<ApiResponse<GetJobsResponse>>('/mobile/jobs', {
    params: {
      status: params.status,
      date_from: params.date_from,
      date_to: params.date_to,
      sync_token: params.sync_token,
      include_offline: params.include_offline ?? true,
    },
  });

  return response.data.data;
}

/**
 * Get job details by ID
 */
export async function getJobById(
  jobId: string,
  includeHistory = false,
  includeOfflinePackage = true
): Promise<Job> {
  const response = await apiClient.get<ApiResponse<Job>>(`/mobile/jobs/${jobId}`, {
    params: {
      include_history: includeHistory,
      include_offline_package: includeOfflinePackage,
    },
  });

  return response.data.data;
}

/**
 * Update job status
 */
export async function updateJobStatus(
  jobId: string,
  request: UpdateJobStatusRequest
): Promise<Job> {
  const response = await apiClient.patch<ApiResponse<Job>>(
    `/mobile/jobs/${jobId}/status`,
    request
  );

  return response.data.data;
}

/**
 * Check in to a job
 */
export async function checkIn(jobId: string, request: CheckInRequest): Promise<CheckInResponse> {
  const response = await apiClient.post<ApiResponse<CheckInResponse>>(
    `/mobile/jobs/${jobId}/check-in`,
    request
  );

  return response.data.data;
}

/**
 * Check out from a job
 */
export async function checkOut(
  jobId: string,
  request: CheckOutRequest
): Promise<CheckOutResponse> {
  const response = await apiClient.post<ApiResponse<CheckOutResponse>>(
    `/mobile/jobs/${jobId}/check-out`,
    request
  );

  return response.data.data;
}

/**
 * Get jobs for a specific date range
 */
export async function getJobsByDateRange(startDate: Date, endDate: Date): Promise<Job[]> {
  const response = await getJobs({
    date_from: startDate.toISOString(),
    date_to: endDate.toISOString(),
  });

  return response.jobs;
}

/**
 * Get jobs for today
 */
export async function getTodaysJobs(): Promise<Job[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getJobsByDateRange(today, tomorrow);
}

/**
 * Get jobs by status
 */
export async function getJobsByStatus(status: GetJobsRequest['status']): Promise<Job[]> {
  const response = await getJobs({status});

  return response.jobs;
}

/**
 * Refresh jobs from server (for pull-to-refresh)
 */
export async function refreshJobs(syncToken?: string): Promise<GetJobsResponse> {
  return getJobs({
    sync_token: syncToken,
    include_offline: true,
  });
}
