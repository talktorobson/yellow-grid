import { Model } from '@nozbe/watermelondb';
import { field, json, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import { TaskStatus, Material, ChecklistItem } from '../../types/api';

const sanitizeJson = (json: any) => json;

export default class Task extends Model {
  static readonly table = 'tasks';

  static readonly associations = {
    jobs: { type: 'belongs_to', key: 'job_id' },
  } as const;

  @field('task_id') taskId!: string;
  @field('job_id') jobId!: string;
  @field('description') description!: string;
  @field('status') status!: TaskStatus;
  @field('estimated_hours') estimatedHours!: number;
  @field('actual_hours') actualHours?: number;
  @field('completion_percentage') completionPercentage!: number;
  
  @json('required_materials_json', sanitizeJson) requiredMaterials!: Material[];
  @json('checklist_items_json', sanitizeJson) checklistItems?: ChecklistItem[];

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('jobs', 'job_id') job!: any;
}
