import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // Service Orders
    tableSchema({
      name: 'service_orders',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'order_number', type: 'string', isIndexed: true },
        { name: 'project_id', type: 'string' },
        { name: 'project_name', type: 'string' },
        { name: 'service_type', type: 'string' },
        { name: 'priority', type: 'string' },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'scheduled_date', type: 'string' },
        { name: 'scheduled_time_slot', type: 'string' }, // JSON
        { name: 'estimated_duration', type: 'number' },
        { name: 'customer', type: 'string' }, // JSON
        { name: 'site_address', type: 'string' }, // JSON
        { name: 'products', type: 'string' }, // JSON
        { name: 'service_description', type: 'string' },
        { name: 'special_instructions', type: 'string', isOptional: true },
        { name: 'assigned_provider_id', type: 'string', isOptional: true },
        { name: 'assigned_work_team_id', type: 'string', isOptional: true },
        { name: 'check_in_id', type: 'string', isOptional: true },
        { name: 'check_out_id', type: 'string', isOptional: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Check-Ins
    tableSchema({
      name: 'check_ins',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'service_order_id', type: 'string', isIndexed: true },
        { name: 'technician_id', type: 'string' },
        { name: 'scheduled_arrival_window', type: 'string' }, // JSON
        { name: 'actual_arrival_time', type: 'string' },
        { name: 'check_in_time', type: 'string' },
        { name: 'check_in_method', type: 'string' },
        { name: 'location', type: 'string' }, // JSON
        { name: 'location_accuracy', type: 'number' },
        { name: 'location_verified', type: 'boolean' },
        { name: 'arrival_photos', type: 'string' }, // JSON array
        { name: 'customer_present', type: 'boolean' },
        { name: 'customer_signature', type: 'string', isOptional: true }, // JSON
        { name: 'site_access_notes', type: 'string', isOptional: true },
        { name: 'safety_hazards', type: 'string' }, // JSON array
        { name: 'status', type: 'string' },
        { name: 'metadata', type: 'string' }, // JSON
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Check-Outs
    tableSchema({
      name: 'check_outs',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'service_order_id', type: 'string', isIndexed: true },
        { name: 'check_in_id', type: 'string' },
        { name: 'technician_id', type: 'string' },
        { name: 'check_out_time', type: 'string' },
        { name: 'completion_status', type: 'string' },
        { name: 'work_performed', type: 'string' }, // JSON
        { name: 'materials_used', type: 'string' }, // JSON array
        { name: 'departure_photos', type: 'string' }, // JSON array
        { name: 'customer_signature', type: 'string', isOptional: true }, // JSON
        { name: 'customer_feedback', type: 'string', isOptional: true }, // JSON
        { name: 'next_visit_required', type: 'boolean' },
        { name: 'next_visit_reason', type: 'string', isOptional: true },
        { name: 'location', type: 'string' }, // JSON
        { name: 'status', type: 'string' },
        { name: 'metadata', type: 'string' }, // JSON
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Photos
    tableSchema({
      name: 'photos',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'service_order_id', type: 'string', isIndexed: true },
        { name: 'uri', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'caption', type: 'string', isOptional: true },
        { name: 'location', type: 'string', isOptional: true }, // JSON
        { name: 'uploaded', type: 'boolean' },
        { name: 'uploaded_url', type: 'string', isOptional: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Sync Queue
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'entity_type', type: 'string', isIndexed: true },
        { name: 'entity_id', type: 'string', isIndexed: true },
        { name: 'operation', type: 'string' }, // CREATE, UPDATE, DELETE
        { name: 'payload', type: 'string' }, // JSON
        { name: 'retry_count', type: 'number' },
        { name: 'last_error', type: 'string', isOptional: true },
        { name: 'status', type: 'string' }, // PENDING, IN_PROGRESS, COMPLETED, FAILED
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
