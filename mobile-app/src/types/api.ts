/**
 * API Type Definitions
 *
 * Type definitions for API requests and responses based on the
 * execution-mobile-api.md specification.
 */

// ============================================================================
// Common Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
    traceId: string;
  };
}

export interface ErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface Pagination {
  limit: number;
  offset?: number;
  total?: number;
  hasNext?: boolean;
  nextCursor?: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  heading?: number;
}

export interface SyncMetadata {
  version: number;
  last_modified: string;
  modified_by: string;
  checksum: string;
}

// ============================================================================
// Authentication
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface User {
  user_id: string;
  name: string;
  email: string;
  role: string;
  trade?: string;
  certifications?: string[];
}

// ============================================================================
// Jobs
// ============================================================================

export interface Job {
  job_id: string;
  work_order_id: string;
  project_id: string;
  status: JobStatus;
  priority: JobPriority;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string;
  actual_end?: string;
  assigned_technician: AssignedTechnician;
  location: JobLocation;
  tasks: Task[];
  attachments: Attachment[];
  notes?: string;
  metadata: JobMetadata;
  sync_metadata: SyncMetadata;
}

export type JobStatus =
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'on_hold'
  | 'cancelled';

export type JobPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface AssignedTechnician {
  user_id: string;
  name: string;
  trade: string;
  certifications?: string[];
}

export interface JobLocation {
  site_id: string;
  address?: Address;
  building?: string;
  floor?: string;
  zone?: string;
  coordinates: GeoLocation;
  access_instructions?: string;
}

export interface Address {
  street: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
}

export interface Task {
  task_id: string;
  description: string;
  status: TaskStatus;
  estimated_hours: number;
  actual_hours?: number;
  completion_percentage: number;
  required_materials: Material[];
  checklist_items?: ChecklistItem[];
  photos?: Photo[];
}

export type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'skipped';

export interface Material {
  material_id: string;
  name: string;
  quantity: number;
  quantity_used?: number;
  unit: string;
  serial_numbers?: string[];
}

export interface ChecklistItem {
  item_id: string;
  description: string;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
}

export interface Attachment {
  attachment_id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnail_url?: string;
  offline_available: boolean;
  local_path?: string;
}

export interface JobMetadata {
  contract_id?: string;
  customer_id?: string;
  equipment_ids?: string[];
}

export interface GetJobsRequest {
  status?: JobStatus;
  date_from?: string;
  date_to?: string;
  sync_token?: string;
  include_offline?: boolean;
}

export interface GetJobsResponse {
  jobs: Job[];
  sync_token: string;
  server_time: string;
  total_count: number;
  offline_data_size?: number;
}

export interface UpdateJobStatusRequest {
  status: JobStatus;
  timestamp: string;
  location: GeoLocation;
  notes?: string;
  offline_queued: boolean;
  sync_metadata?: {
    client_version: number;
    client_timestamp: string;
    device_id: string;
  };
}

// ============================================================================
// Check-In/Out
// ============================================================================

export interface CheckInRequest {
  timestamp: string;
  location: GeoLocation;
  device_info: DeviceInfo;
  travel_time_minutes?: number;
  notes?: string;
  offline_queued: boolean;
}

export interface DeviceInfo {
  device_id: string;
  platform: 'iOS' | 'Android';
  os_version: string;
  app_version: string;
}

export interface CheckInResponse {
  check_in_id: string;
  job_id: string;
  user_id: string;
  check_in_time: string;
  location: GeoLocation;
  geofence_validated: boolean;
  distance_from_site_meters: number;
  status: string;
  next_actions?: NextAction[];
}

export interface NextAction {
  action: string;
  task_id?: string;
  description: string;
}

export interface CheckOutRequest {
  timestamp: string;
  location: GeoLocation;
  break_time_minutes: number;
  work_summary: WorkSummary;
  signature?: Signature;
  notes?: string;
  offline_queued: boolean;
}

export interface WorkSummary {
  tasks_completed: string[];
  tasks_in_progress: string[];
  completion_percentage: number;
  materials_used: Material[];
  issues_encountered: string[];
  follow_up_required: boolean;
}

export interface Signature {
  data_url: string;
  signed_by: string;
  signed_at: string;
}

export interface CheckOutResponse {
  check_out_id: string;
  job_id: string;
  user_id: string;
  check_in_time: string;
  check_out_time: string;
  total_hours: number;
  billable_hours: number;
  break_time_minutes: number;
  overtime_hours: number;
  status: string;
  time_entry_id: string;
  requires_approval: boolean;
}

// ============================================================================
// Media
// ============================================================================

export interface Photo {
  photo_id: string;
  job_id: string;
  task_id?: string;
  url: string;
  thumbnail_url?: string;
  filename: string;
  size: number;
  mime_type: string;
  dimensions: {
    width: number;
    height: number;
  };
  caption?: string;
  timestamp: string;
  location?: GeoLocation;
  uploaded_at?: string;
  uploaded_by?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  offline_id?: string;
}

export interface UploadPhotoRequest {
  file: File | Blob;
  job_id: string;
  task_id?: string;
  caption?: string;
  timestamp: string;
  location?: GeoLocation;
  metadata?: Record<string, any>;
  offline_id?: string;
}

export interface UploadPhotoResponse {
  photo_id: string;
  job_id: string;
  task_id?: string;
  url: string;
  thumbnail_url?: string;
  filename: string;
  size: number;
  mime_type: string;
  dimensions: {
    width: number;
    height: number;
  };
  caption?: string;
  timestamp: string;
  location?: GeoLocation;
  uploaded_at: string;
  uploaded_by: string;
  processing_status: string;
  offline_id?: string;
}

export interface BatchUploadRequest {
  files: File[] | Blob[];
  metadata: BatchUploadMetadata[];
  sync_token?: string;
}

export interface BatchUploadMetadata {
  offline_id: string;
  type: 'photo' | 'document' | 'video';
  job_id: string;
  task_id?: string;
  caption?: string;
  timestamp: string;
  location?: GeoLocation;
}

export interface BatchUploadResponse {
  batch_id: string;
  total_files: number;
  successful_uploads: number;
  failed_uploads: number;
  results: UploadResult[];
  errors: ErrorDetail[];
  sync_token: string;
}

export interface UploadResult {
  offline_id: string;
  server_id: string;
  status: 'success' | 'failed';
  url?: string;
  error?: string;
}

// ============================================================================
// Offline Sync
// ============================================================================

export interface SyncBatchRequest {
  device_id: string;
  items: OfflineQueueItem[];
  last_sync_timestamp?: string;
}

export interface OfflineQueueItem {
  offline_id: string;
  entity_type: EntityType;
  entity_id: string;
  operation: 'create' | 'update' | 'delete';
  data: Record<string, any>;
  priority: SyncPriority;
  dependencies: string[];
  retry_count: number;
  checksum: string;
  created_at: string;
}

export type EntityType =
  | 'check_in'
  | 'check_out'
  | 'task_execution'
  | 'checklist_results'
  | 'photo'
  | 'signature'
  | 'note'
  | 'time_entry';

export type SyncPriority = 'critical' | 'high' | 'medium' | 'low' | 'background';

export interface SyncBatchResponse {
  results: SyncItemResult[];
  conflicts: SyncConflict[];
  server_timestamp: string;
  next_sync_recommended?: string;
}

export interface SyncItemResult {
  queue_item_id: string;
  status: 'success' | 'conflict' | 'error';
  entity_id?: string;
  error?: ErrorDetail;
}

export interface SyncConflict {
  entity_type: EntityType;
  entity_id: string;
  field: string;
  client_value: any;
  server_value: any;
  server_version: number;
  client_version: number;
  resolution: ConflictResolution;
  resolved_value: any;
  last_modified_by: string;
  last_modified_at: string;
}

export type ConflictResolution =
  | 'server_wins'
  | 'client_wins'
  | 'newer_wins'
  | 'merge'
  | 'manual';

export interface DeltaSyncRequest {
  sync_token: string;
  device_id: string;
  client_changes: {
    jobs?: any[];
    time_entries?: any[];
    media_uploads?: any[];
    task_updates?: any[];
  };
  conflict_resolution_strategy: ConflictResolution;
}

export interface DeltaSyncResponse {
  sync_token: string;
  server_time: string;
  conflicts: SyncConflict[];
  server_changes: {
    jobs?: any[];
    attachments?: any[];
    reference_data_updates?: any[];
  };
  applied_changes: {
    jobs_updated: number;
    time_entries_created: number;
    media_pending_upload: number;
    tasks_updated: number;
  };
  pending_uploads?: PendingUpload[];
}

export interface PendingUpload {
  offline_id: string;
  upload_url: string;
  priority: SyncPriority;
}

// ============================================================================
// WebSocket
// ============================================================================

export interface WebSocketMessage {
  type: WebSocketMessageType;
  timestamp: string;
  data: any;
}

export type WebSocketMessageType =
  | 'ping'
  | 'pong'
  | 'subscribe'
  | 'job.updated'
  | 'job.assigned'
  | 'message.received'
  | 'alert.created';

export interface SubscribeMessage {
  type: 'subscribe';
  channels: string[];
  filters: {
    user_id: string;
    job_ids?: string[];
  };
}

export interface JobUpdatedEvent {
  type: 'job.updated';
  timestamp: string;
  data: {
    job_id: string;
    changes: Partial<Job>;
    updated_by: string;
    version: number;
  };
}

export interface JobAssignedEvent {
  type: 'job.assigned';
  timestamp: string;
  data: {
    job_id: string;
    work_order_id: string;
    priority: JobPriority;
    scheduled_start: string;
    notification: {
      title: string;
      message: string;
      action_required: boolean;
    };
  };
}
