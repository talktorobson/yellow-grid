import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'jobs',
      columns: [
        { name: 'job_id', type: 'string', isIndexed: true },
        { name: 'work_order_id', type: 'string' },
        { name: 'project_id', type: 'string' },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'priority', type: 'string' },
        { name: 'scheduled_start', type: 'string' },
        { name: 'scheduled_end', type: 'string' },
        { name: 'actual_start', type: 'string', isOptional: true },
        { name: 'actual_end', type: 'string', isOptional: true },
        { name: 'assigned_technician_json', type: 'string' }, // JSON stringified AssignedTechnician
        { name: 'location_json', type: 'string' }, // JSON stringified JobLocation
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'metadata_json', type: 'string' }, // JSON stringified JobMetadata
        { name: 'sync_version', type: 'number' },
        { name: 'last_modified', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'task_id', type: 'string', isIndexed: true },
        { name: 'job_id', type: 'string', isIndexed: true },
        { name: 'description', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'estimated_hours', type: 'number' },
        { name: 'actual_hours', type: 'number', isOptional: true },
        { name: 'completion_percentage', type: 'number' },
        { name: 'required_materials_json', type: 'string' }, // JSON stringified Material[]
        { name: 'checklist_items_json', type: 'string', isOptional: true }, // JSON stringified ChecklistItem[]
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sync_status',
      columns: [
        { name: 'entity_type', type: 'string' },
        { name: 'last_sync_token', type: 'string' },
        { name: 'last_sync_time', type: 'number' },
      ],
    }),
  ],
});
