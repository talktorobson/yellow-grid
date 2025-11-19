import { Model } from '@nozbe/watermelondb';
import { field, json, date, readonly, children } from '@nozbe/watermelondb/decorators';
import { AssignedTechnician, JobLocation, JobMetadata, JobStatus, JobPriority } from '../../types/api';

const sanitizeJson = (json: any) => json;

export default class Job extends Model {
  static readonly table = 'jobs';

  static readonly associations = {
    tasks: { type: 'has_many', foreignKey: 'job_id' },
  } as const;

  @field('job_id') jobId!: string;
  @field('work_order_id') workOrderId!: string;
  @field('project_id') projectId!: string;
  @field('status') status!: JobStatus;
  @field('priority') priority!: JobPriority;
  @date('scheduled_start') scheduledStart!: Date;
  @date('scheduled_end') scheduledEnd!: Date;
  @date('actual_start') actualStart?: Date;
  @date('actual_end') actualEnd?: Date;
  
  @json('assigned_technician_json', sanitizeJson) assignedTechnician!: AssignedTechnician;
  @json('location_json', sanitizeJson) location!: JobLocation;
  @field('notes') notes?: string;
  @json('metadata_json', sanitizeJson) metadata!: JobMetadata;
  
  @field('sync_version') syncVersion!: number;
  @date('last_modified') lastModified!: Date;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('tasks') tasks!: any;
}
