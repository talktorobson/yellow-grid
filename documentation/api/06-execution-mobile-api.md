# Execution Mobile API Specification

## Overview

The Execution Mobile API provides endpoints for field service technicians to manage jobs, check-in/out operations, media uploads, and offline synchronization. Designed for mobile-first operation with robust offline capabilities.

---

## Table of Contents

1. [Job Management](#job-management)
2. [Check-In/Out Operations](#check-inout-operations)
3. [Media Upload](#media-upload)
4. [Offline Sync](#offline-sync)
5. [Real-Time Updates](#real-time-updates)
6. [Chat & Messaging](#chat--messaging)
7. [Rate Limiting](#rate-limiting)

---

## Job Management

### Get Assigned Jobs

```yaml
GET /api/v1/mobile/jobs
```

Retrieve jobs assigned to the authenticated technician.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status: `assigned`, `in_progress`, `completed`, `on_hold` |
| date_from | string | No | Start date (ISO 8601) |
| date_to | string | No | End date (ISO 8601) |
| sync_token | string | No | Token for incremental sync |
| include_offline | boolean | No | Include offline-capable data (default: true) |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "job_id": "job_789",
        "work_order_id": "wo_123",
        "project_id": "proj_456",
        "status": "assigned",
        "priority": "high",
        "scheduled_start": "2025-11-14T08:00:00Z",
        "scheduled_end": "2025-11-14T17:00:00Z",
        "assigned_technician": {
          "user_id": "user_101",
          "name": "John Smith",
          "trade": "electrician"
        },
        "location": {
          "site_id": "site_001",
          "building": "Building A",
          "floor": "3",
          "zone": "Zone 3A",
          "coordinates": {
            "latitude": 40.7128,
            "longitude": -74.0060
          }
        },
        "tasks": [
          {
            "task_id": "task_001",
            "description": "Install electrical panel",
            "estimated_hours": 4.0,
            "required_materials": [
              {
                "material_id": "mat_001",
                "name": "200A Panel",
                "quantity": 1,
                "unit": "each"
              }
            ],
            "prerequisites": [],
            "safety_requirements": [
              "LOTO procedures required",
              "Arc flash PPE required"
            ]
          }
        ],
        "attachments": [
          {
            "attachment_id": "att_001",
            "name": "electrical_diagram.pdf",
            "type": "application/pdf",
            "size": 2048576,
            "url": "/api/v1/media/download/att_001",
            "thumbnail_url": "/api/v1/media/thumbnail/att_001",
            "offline_available": true
          }
        ],
        "notes": "Customer requires notification 1 hour before arrival",
        "metadata": {
          "contract_id": "contract_001",
          "customer_id": "cust_789",
          "equipment_ids": ["equip_001", "equip_002"]
        },
        "sync_metadata": {
          "version": 3,
          "last_modified": "2025-11-14T06:30:00Z",
          "modified_by": "user_201",
          "checksum": "a1b2c3d4e5f6"
        }
      }
    ],
    "sync_token": "sync_token_xyz123",
    "server_time": "2025-11-14T07:00:00Z",
    "total_count": 15,
    "offline_data_size": 52428800
  }
}
```

---

### Get Job Details

```yaml
GET /api/v1/mobile/jobs/{job_id}
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| job_id | string | Yes | Unique job identifier |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| include_history | boolean | No | Include change history |
| include_offline_package | boolean | No | Include complete offline data package |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "job_id": "job_789",
    "work_order_id": "wo_123",
    "project_id": "proj_456",
    "status": "in_progress",
    "priority": "high",
    "scheduled_start": "2025-11-14T08:00:00Z",
    "scheduled_end": "2025-11-14T17:00:00Z",
    "actual_start": "2025-11-14T08:15:00Z",
    "actual_end": null,
    "assigned_technician": {
      "user_id": "user_101",
      "name": "John Smith",
      "trade": "electrician",
      "certifications": ["master_electrician", "arc_flash"]
    },
    "location": {
      "site_id": "site_001",
      "address": {
        "street": "123 Main Street",
        "city": "New York",
        "state": "NY",
        "postal_code": "10001",
        "country": "USA"
      },
      "building": "Building A",
      "floor": "3",
      "zone": "Zone 3A",
      "coordinates": {
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      "access_instructions": "Use north entrance, check in at security desk"
    },
    "tasks": [
      {
        "task_id": "task_001",
        "description": "Install electrical panel",
        "status": "in_progress",
        "estimated_hours": 4.0,
        "actual_hours": 2.5,
        "completion_percentage": 60,
        "required_materials": [
          {
            "material_id": "mat_001",
            "name": "200A Panel",
            "quantity": 1,
            "quantity_used": 1,
            "unit": "each",
            "serial_numbers": ["SN123456"]
          }
        ],
        "checklist_items": [
          {
            "item_id": "check_001",
            "description": "Verify power shutdown",
            "completed": true,
            "completed_at": "2025-11-14T08:20:00Z",
            "completed_by": "user_101"
          },
          {
            "item_id": "check_002",
            "description": "Install panel mounting brackets",
            "completed": true,
            "completed_at": "2025-11-14T09:45:00Z",
            "completed_by": "user_101"
          },
          {
            "item_id": "check_003",
            "description": "Mount panel enclosure",
            "completed": false,
            "completed_at": null,
            "completed_by": null
          }
        ],
        "photos": [
          {
            "photo_id": "photo_001",
            "url": "/api/v1/media/photo_001",
            "thumbnail_url": "/api/v1/media/thumbnail/photo_001",
            "caption": "Panel location before installation",
            "taken_at": "2025-11-14T08:25:00Z",
            "gps_coordinates": {
              "latitude": 40.7128,
              "longitude": -74.0060,
              "accuracy": 5.0
            }
          }
        ]
      }
    ],
    "time_entries": [
      {
        "entry_id": "time_001",
        "check_in_time": "2025-11-14T08:15:00Z",
        "check_out_time": null,
        "check_in_location": {
          "latitude": 40.7128,
          "longitude": -74.0060,
          "accuracy": 10.0
        },
        "break_time_minutes": 0,
        "travel_time_minutes": 15
      }
    ],
    "attachments": [
      {
        "attachment_id": "att_001",
        "name": "electrical_diagram.pdf",
        "type": "application/pdf",
        "size": 2048576,
        "url": "/api/v1/media/download/att_001",
        "offline_available": true,
        "local_path": "/offline_cache/att_001.pdf"
      }
    ],
    "notes": [
      {
        "note_id": "note_001",
        "text": "Customer requested quiet hours after 5 PM",
        "created_by": "user_201",
        "created_at": "2025-11-13T14:30:00Z",
        "type": "general"
      }
    ],
    "sync_metadata": {
      "version": 5,
      "last_modified": "2025-11-14T08:15:00Z",
      "modified_by": "user_101",
      "checksum": "a1b2c3d4e5f6",
      "conflict_resolution": "server_wins"
    }
  }
}
```

---

### Update Job Status

```yaml
PATCH /api/v1/mobile/jobs/{job_id}/status
```

**Request Body:**

```json
{
  "status": "in_progress",
  "timestamp": "2025-11-14T08:15:00Z",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "accuracy": 10.0
  },
  "notes": "Started work on site",
  "offline_queued": false,
  "sync_metadata": {
    "client_version": 5,
    "client_timestamp": "2025-11-14T08:15:00Z",
    "device_id": "device_mobile_001"
  }
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "job_id": "job_789",
    "status": "in_progress",
    "updated_at": "2025-11-14T08:15:00Z",
    "sync_metadata": {
      "version": 6,
      "server_timestamp": "2025-11-14T08:15:01Z",
      "conflicts_detected": false
    }
  }
}
```

**Response 409 (Conflict):**

```json
{
  "success": false,
  "error": {
    "code": "SYNC_CONFLICT",
    "message": "Job has been modified by another user",
    "details": {
      "server_version": 7,
      "client_version": 5,
      "last_modified_by": "user_201",
      "last_modified_at": "2025-11-14T08:10:00Z",
      "conflict_fields": ["status", "notes"],
      "resolution_strategy": "server_wins",
      "server_data": {
        "status": "on_hold",
        "notes": "Waiting for materials delivery"
      }
    }
  }
}
```

---

## Check-In/Out Operations

### Check In to Job

```yaml
POST /api/v1/mobile/jobs/{job_id}/check-in
```

**Request Body:**

```json
{
  "timestamp": "2025-11-14T08:15:00Z",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "accuracy": 10.0,
    "altitude": 15.5,
    "heading": 180.0
  },
  "device_info": {
    "device_id": "device_mobile_001",
    "platform": "iOS",
    "os_version": "17.1",
    "app_version": "2.5.0"
  },
  "travel_time_minutes": 15,
  "notes": "Arrived on site, checking in at security",
  "offline_queued": false
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "check_in_id": "checkin_001",
    "job_id": "job_789",
    "user_id": "user_101",
    "check_in_time": "2025-11-14T08:15:00Z",
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "accuracy": 10.0
    },
    "geofence_validated": true,
    "distance_from_site_meters": 25.5,
    "status": "checked_in",
    "next_actions": [
      {
        "action": "start_task",
        "task_id": "task_001",
        "description": "Begin work on Install electrical panel"
      },
      {
        "action": "report_delay",
        "description": "Report if starting work will be delayed"
      }
    ]
  }
}
```

---

### Check Out from Job

```yaml
POST /api/v1/mobile/jobs/{job_id}/check-out
```

**Request Body:**

```json
{
  "timestamp": "2025-11-14T17:30:00Z",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "accuracy": 10.0
  },
  "break_time_minutes": 30,
  "work_summary": {
    "tasks_completed": ["task_001"],
    "tasks_in_progress": [],
    "completion_percentage": 100,
    "materials_used": [
      {
        "material_id": "mat_001",
        "quantity": 1,
        "serial_numbers": ["SN123456"]
      }
    ],
    "issues_encountered": [],
    "follow_up_required": false
  },
  "signature": {
    "data_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
    "signed_by": "John Smith",
    "signed_at": "2025-11-14T17:30:00Z"
  },
  "notes": "Work completed successfully, customer satisfied",
  "offline_queued": false
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "check_out_id": "checkout_001",
    "job_id": "job_789",
    "user_id": "user_101",
    "check_in_time": "2025-11-14T08:15:00Z",
    "check_out_time": "2025-11-14T17:30:00Z",
    "total_hours": 9.25,
    "billable_hours": 8.75,
    "break_time_minutes": 30,
    "overtime_hours": 0.25,
    "status": "checked_out",
    "time_entry_id": "time_001",
    "requires_approval": false
  }
}
```

---

### Get Time Entries

```yaml
GET /api/v1/mobile/time-entries
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| date_from | string | No | Start date (ISO 8601) |
| date_to | string | No | End date (ISO 8601) |
| status | string | No | Filter by status: `draft`, `submitted`, `approved`, `rejected` |
| job_id | string | No | Filter by specific job |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "time_entries": [
      {
        "entry_id": "time_001",
        "job_id": "job_789",
        "work_order_id": "wo_123",
        "date": "2025-11-14",
        "check_in_time": "2025-11-14T08:15:00Z",
        "check_out_time": "2025-11-14T17:30:00Z",
        "total_hours": 9.25,
        "regular_hours": 8.0,
        "overtime_hours": 0.25,
        "double_time_hours": 0.0,
        "break_time_minutes": 30,
        "travel_time_minutes": 15,
        "billable_hours": 8.75,
        "hourly_rate": 85.00,
        "total_cost": 743.75,
        "status": "submitted",
        "submitted_at": "2025-11-14T18:00:00Z",
        "approved_at": null,
        "approved_by": null
      }
    ],
    "summary": {
      "total_hours": 42.5,
      "total_billable": 40.0,
      "total_cost": 3400.00,
      "pending_approval_hours": 9.25
    }
  }
}
```

---

## Media Upload

### Upload Photo

```yaml
POST /api/v1/mobile/media/photos
```

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | file | Yes | Image file (JPEG, PNG, HEIC) |
| job_id | string | Yes | Associated job ID |
| task_id | string | No | Associated task ID |
| caption | string | No | Photo caption/description |
| timestamp | string | Yes | Photo taken timestamp (ISO 8601) |
| location | JSON | No | GPS coordinates |
| metadata | JSON | No | Additional metadata |
| offline_id | string | No | Client-generated ID for offline sync |

**cURL Example:**

```bash
curl -X POST https://api.fsm.example.com/api/v1/mobile/media/photos \
  -H "Authorization: Bearer {token}" \
  -F "file=@photo.jpg" \
  -F "job_id=job_789" \
  -F "task_id=task_001" \
  -F "caption=Panel installation - before" \
  -F "timestamp=2025-11-14T08:25:00Z" \
  -F 'location={"latitude":40.7128,"longitude":-74.0060,"accuracy":5.0}' \
  -F 'metadata={"camera":"iPhone 15 Pro","flash":false,"orientation":"landscape"}'
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "photo_id": "photo_001",
    "job_id": "job_789",
    "task_id": "task_001",
    "url": "/api/v1/media/photo_001",
    "thumbnail_url": "/api/v1/media/thumbnail/photo_001",
    "filename": "photo_001_20251114_082500.jpg",
    "size": 2457600,
    "mime_type": "image/jpeg",
    "dimensions": {
      "width": 4032,
      "height": 3024
    },
    "caption": "Panel installation - before",
    "timestamp": "2025-11-14T08:25:00Z",
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "accuracy": 5.0
    },
    "uploaded_at": "2025-11-14T08:26:00Z",
    "uploaded_by": "user_101",
    "processing_status": "completed",
    "offline_id": null
  }
}
```

---

### Upload Document

```yaml
POST /api/v1/mobile/media/documents
```

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | file | Yes | Document file (PDF, DOCX, XLSX, etc.) |
| job_id | string | Yes | Associated job ID |
| document_type | string | Yes | Type: `invoice`, `report`, `inspection`, `other` |
| title | string | Yes | Document title |
| description | string | No | Document description |
| timestamp | string | Yes | Upload timestamp (ISO 8601) |
| tags | JSON | No | Array of tags |
| offline_id | string | No | Client-generated ID for offline sync |

**Response 201:**

```json
{
  "success": true,
  "data": {
    "document_id": "doc_001",
    "job_id": "job_789",
    "document_type": "inspection",
    "title": "Electrical Panel Inspection Report",
    "description": "Pre-installation inspection documentation",
    "url": "/api/v1/media/download/doc_001",
    "filename": "inspection_report_20251114.pdf",
    "size": 524288,
    "mime_type": "application/pdf",
    "page_count": 5,
    "uploaded_at": "2025-11-14T09:00:00Z",
    "uploaded_by": "user_101",
    "tags": ["inspection", "electrical", "pre_installation"],
    "virus_scan_status": "clean",
    "offline_id": null
  }
}
```

---

### Upload Video

```yaml
POST /api/v1/mobile/media/videos
```

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | file | Yes | Video file (MP4, MOV, AVI) |
| job_id | string | Yes | Associated job ID |
| task_id | string | No | Associated task ID |
| title | string | Yes | Video title |
| description | string | No | Video description |
| duration_seconds | integer | Yes | Video duration |
| timestamp | string | Yes | Recording timestamp (ISO 8601) |
| offline_id | string | No | Client-generated ID for offline sync |

**Response 202 (Accepted):**

```json
{
  "success": true,
  "data": {
    "video_id": "video_001",
    "job_id": "job_789",
    "task_id": "task_001",
    "title": "Panel installation process",
    "upload_session_id": "upload_session_xyz",
    "processing_status": "uploading",
    "progress_percentage": 0,
    "estimated_completion": "2025-11-14T09:15:00Z",
    "check_status_url": "/api/v1/mobile/media/videos/video_001/status",
    "offline_id": null
  }
}
```

---

### Batch Upload (Offline Sync)

```yaml
POST /api/v1/mobile/media/batch
```

**Content-Type:** `multipart/form-data`

Upload multiple media files in a single request, typically used for offline sync.

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| files[] | file | Yes | Array of files (photos, documents, videos) |
| metadata | JSON | Yes | Metadata for each file |
| sync_token | string | No | Sync token for conflict resolution |

**Metadata Structure:**

```json
{
  "files": [
    {
      "offline_id": "offline_photo_001",
      "type": "photo",
      "job_id": "job_789",
      "task_id": "task_001",
      "caption": "Before installation",
      "timestamp": "2025-11-14T08:25:00Z",
      "location": {
        "latitude": 40.7128,
        "longitude": -74.0060,
        "accuracy": 5.0
      }
    },
    {
      "offline_id": "offline_doc_001",
      "type": "document",
      "job_id": "job_789",
      "document_type": "inspection",
      "title": "Inspection Report",
      "timestamp": "2025-11-14T09:00:00Z"
    }
  ]
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "batch_id": "batch_001",
    "total_files": 2,
    "successful_uploads": 2,
    "failed_uploads": 0,
    "results": [
      {
        "offline_id": "offline_photo_001",
        "server_id": "photo_001",
        "status": "success",
        "url": "/api/v1/media/photo_001"
      },
      {
        "offline_id": "offline_doc_001",
        "server_id": "doc_001",
        "status": "success",
        "url": "/api/v1/media/download/doc_001"
      }
    ],
    "errors": [],
    "sync_token": "sync_token_abc456"
  }
}
```

---

## Offline Sync

### Initialize Offline Sync

```yaml
POST /api/v1/mobile/sync/initialize
```

Prepare data package for offline operation.

**Request Body:**

```json
{
  "user_id": "user_101",
  "device_id": "device_mobile_001",
  "date_range": {
    "start": "2025-11-14",
    "end": "2025-11-21"
  },
  "include_attachments": true,
  "max_attachment_size_mb": 50,
  "compression_enabled": true
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "sync_package_id": "sync_pkg_001",
    "sync_token": "sync_token_initial_xyz",
    "package_size_bytes": 104857600,
    "estimated_download_time_seconds": 45,
    "contents": {
      "jobs_count": 15,
      "attachments_count": 45,
      "materials_count": 150,
      "reference_data": [
        "safety_procedures",
        "equipment_specs",
        "material_catalog"
      ]
    },
    "download_url": "/api/v1/mobile/sync/download/sync_pkg_001",
    "expires_at": "2025-11-14T10:00:00Z",
    "checksum": "sha256:a1b2c3d4e5f6..."
  }
}
```

---

### Sync Changes (Delta Sync)

```yaml
POST /api/v1/mobile/sync/delta
```

Synchronize changes between client and server.

**Request Body:**

```json
{
  "sync_token": "sync_token_xyz123",
  "device_id": "device_mobile_001",
  "client_changes": {
    "jobs": [
      {
        "job_id": "job_789",
        "action": "update",
        "changes": {
          "status": "in_progress",
          "actual_start": "2025-11-14T08:15:00Z"
        },
        "version": 5,
        "timestamp": "2025-11-14T08:15:00Z"
      }
    ],
    "time_entries": [
      {
        "entry_id": "time_001",
        "action": "create",
        "data": {
          "job_id": "job_789",
          "check_in_time": "2025-11-14T08:15:00Z",
          "location": {
            "latitude": 40.7128,
            "longitude": -74.0060
          }
        },
        "timestamp": "2025-11-14T08:15:00Z"
      }
    ],
    "media_uploads": [
      {
        "offline_id": "offline_photo_001",
        "action": "create",
        "reference": {
          "job_id": "job_789",
          "task_id": "task_001",
          "caption": "Installation progress",
          "timestamp": "2025-11-14T10:30:00Z"
        }
      }
    ],
    "task_updates": [
      {
        "task_id": "task_001",
        "action": "update",
        "changes": {
          "status": "in_progress",
          "completion_percentage": 60
        },
        "version": 3,
        "timestamp": "2025-11-14T11:00:00Z"
      }
    ]
  },
  "conflict_resolution_strategy": "client_wins_on_conflict"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "sync_token": "sync_token_new_abc456",
    "server_time": "2025-11-14T12:00:00Z",
    "conflicts": [
      {
        "entity_type": "job",
        "entity_id": "job_789",
        "field": "status",
        "client_value": "in_progress",
        "server_value": "on_hold",
        "server_version": 7,
        "client_version": 5,
        "resolution": "server_wins",
        "resolved_value": "on_hold",
        "last_modified_by": "user_201",
        "last_modified_at": "2025-11-14T10:00:00Z"
      }
    ],
    "server_changes": {
      "jobs": [
        {
          "job_id": "job_790",
          "action": "create",
          "data": {
            "job_id": "job_790",
            "work_order_id": "wo_124",
            "status": "assigned",
            "scheduled_start": "2025-11-15T08:00:00Z"
          },
          "version": 1
        }
      ],
      "attachments": [],
      "reference_data_updates": []
    },
    "applied_changes": {
      "jobs_updated": 0,
      "time_entries_created": 1,
      "media_pending_upload": 1,
      "tasks_updated": 1
    },
    "pending_uploads": [
      {
        "offline_id": "offline_photo_001",
        "upload_url": "/api/v1/mobile/media/photos",
        "priority": "high"
      }
    ]
  }
}
```

---

### Get Sync Status

```yaml
GET /api/v1/mobile/sync/status
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| device_id | string | Yes | Device identifier |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "device_id": "device_mobile_001",
    "last_sync_time": "2025-11-14T12:00:00Z",
    "sync_token": "sync_token_abc456",
    "pending_uploads": {
      "count": 3,
      "total_size_bytes": 8388608,
      "items": [
        {
          "type": "photo",
          "offline_id": "offline_photo_001",
          "size_bytes": 2457600,
          "priority": "high"
        },
        {
          "type": "document",
          "offline_id": "offline_doc_001",
          "size_bytes": 524288,
          "priority": "medium"
        },
        {
          "type": "video",
          "offline_id": "offline_video_001",
          "size_bytes": 5406720,
          "priority": "low"
        }
      ]
    },
    "pending_downloads": {
      "count": 1,
      "total_size_bytes": 1048576,
      "items": [
        {
          "type": "attachment",
          "attachment_id": "att_002",
          "size_bytes": 1048576,
          "priority": "medium"
        }
      ]
    },
    "conflicts": {
      "count": 0,
      "requires_resolution": false
    },
    "sync_health": {
      "status": "healthy",
      "last_successful_sync": "2025-11-14T12:00:00Z",
      "consecutive_failures": 0,
      "storage_available_bytes": 2147483648
    }
  }
}
```

---

## Real-Time Updates

### WebSocket Connection

```yaml
WSS /api/v1/mobile/ws
```

**Connection URL:**

```
wss://api.fsm.example.com/api/v1/mobile/ws?token={jwt_token}&device_id={device_id}
```

**Authentication:**

Send JWT token as query parameter or in first message after connection.

**Message Format:**

```json
{
  "type": "subscribe",
  "channels": ["jobs", "messages", "alerts"],
  "filters": {
    "user_id": "user_101",
    "job_ids": ["job_789", "job_790"]
  }
}
```

---

### WebSocket Events

#### Job Updated Event

```json
{
  "type": "job.updated",
  "timestamp": "2025-11-14T14:30:00Z",
  "data": {
    "job_id": "job_789",
    "changes": {
      "status": "on_hold",
      "notes": "Waiting for material delivery"
    },
    "updated_by": "user_201",
    "version": 7
  }
}
```

#### New Job Assigned Event

```json
{
  "type": "job.assigned",
  "timestamp": "2025-11-14T15:00:00Z",
  "data": {
    "job_id": "job_791",
    "work_order_id": "wo_125",
    "priority": "urgent",
    "scheduled_start": "2025-11-14T16:00:00Z",
    "notification": {
      "title": "Urgent Job Assigned",
      "message": "Emergency repair at Building B, Floor 2",
      "action_required": true
    }
  }
}
```

#### Message Received Event

```json
{
  "type": "message.received",
  "timestamp": "2025-11-14T15:15:00Z",
  "data": {
    "message_id": "msg_001",
    "from_user_id": "user_201",
    "from_name": "Sarah Johnson",
    "subject": "Material Delivery Update",
    "body": "Panel delivery scheduled for tomorrow 9 AM",
    "related_job_id": "job_789",
    "priority": "high",
    "read_status": false
  }
}
```

#### Alert Event

```json
{
  "type": "alert.created",
  "timestamp": "2025-11-14T15:30:00Z",
  "data": {
    "alert_id": "alert_001",
    "type": "safety",
    "severity": "high",
    "title": "Weather Alert",
    "message": "Severe thunderstorm warning in your area. Consider rescheduling outdoor work.",
    "affected_jobs": ["job_789"],
    "action_required": true,
    "expires_at": "2025-11-14T18:00:00Z"
  }
}
```

---

### Heartbeat & Connection Management

**Client Ping:**

```json
{
  "type": "ping",
  "timestamp": "2025-11-14T15:45:00Z"
}
```

**Server Pong:**

```json
{
  "type": "pong",
  "timestamp": "2025-11-14T15:45:00Z",
  "server_time": "2025-11-14T15:45:00.123Z"
}
```

**Recommended ping interval:** 30 seconds

**Connection timeout:** 60 seconds without activity

---

## Chat & Messaging

The Chat API enables 4-party real-time communication for service orders. All parties (Customer, Operator, Work Team, Provider Manager) share a single conversation per service order.

### Get or Create Conversation

```yaml
POST /api/v1/chat/service-orders/{serviceOrderId}/conversation
```

Retrieves the existing conversation for a service order or creates a new one if none exists.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| serviceOrderId | string | Yes | Unique service order identifier |

**Response 200/201:**

```json
{
  "data": {
    "id": "conv_001",
    "serviceOrderId": "so_789",
    "status": "ACTIVE",
    "participants": [
      {
        "id": "part_001",
        "participantType": "CUSTOMER",
        "displayName": "Marie Dupont",
        "customerId": "cust_123",
        "status": "ACTIVE",
        "joinedAt": "2025-12-01T10:00:00Z"
      },
      {
        "id": "part_002",
        "participantType": "OPERATOR",
        "displayName": "Jean-Pierre Martin",
        "userId": "user_456",
        "status": "ACTIVE",
        "joinedAt": "2025-12-01T10:05:00Z"
      },
      {
        "id": "part_003",
        "participantType": "WORK_TEAM",
        "displayName": "Services Pro Paris - Équipe 1",
        "workTeamId": "wt_789",
        "status": "ACTIVE",
        "joinedAt": "2025-12-01T10:30:00Z"
      }
    ],
    "messageCount": 12,
    "lastMessageAt": "2025-12-01T14:30:00Z",
    "createdAt": "2025-12-01T10:00:00Z",
    "updatedAt": "2025-12-01T14:30:00Z"
  }
}
```

---

### Get Conversation Messages

```yaml
GET /api/v1/chat/conversations/{conversationId}/messages
```

Retrieve messages from a conversation with pagination.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| conversationId | string | Yes | Unique conversation identifier |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| take | integer | No | Number of messages to retrieve (default: 50, max: 100) |
| cursor | string | No | Cursor for pagination (message ID) |
| direction | string | No | `before` or `after` cursor (default: `before`) |

**Response 200:**

```json
{
  "data": {
    "messages": [
      {
        "id": "msg_001",
        "conversationId": "conv_001",
        "senderId": "part_001",
        "senderType": "CUSTOMER",
        "senderDisplayName": "Marie Dupont",
        "messageType": "TEXT",
        "content": {
          "text": "Bonjour, à quelle heure arrivez-vous ?"
        },
        "status": "READ",
        "createdAt": "2025-12-01T10:15:00Z"
      },
      {
        "id": "msg_002",
        "conversationId": "conv_001",
        "senderId": "part_002",
        "senderType": "OPERATOR",
        "senderDisplayName": "Jean-Pierre Martin",
        "messageType": "TEXT",
        "content": {
          "text": "Bonjour Mme Dupont, le technicien est prévu entre 14h et 16h."
        },
        "status": "DELIVERED",
        "createdAt": "2025-12-01T10:20:00Z"
      },
      {
        "id": "msg_003",
        "conversationId": "conv_001",
        "senderId": "part_003",
        "senderType": "WORK_TEAM",
        "senderDisplayName": "Services Pro Paris - Équipe 1",
        "messageType": "TEXT",
        "content": {
          "text": "Je suis en route, arrivée prévue dans 20 minutes."
        },
        "status": "SENT",
        "createdAt": "2025-12-01T14:10:00Z"
      }
    ],
    "pagination": {
      "hasMore": true,
      "nextCursor": "msg_000",
      "totalCount": 45
    }
  }
}
```

---

### Send Message

```yaml
POST /api/v1/chat/conversations/{conversationId}/messages
```

Send a new message to the conversation.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| conversationId | string | Yes | Unique conversation identifier |

**Request Body:**

```json
{
  "messageType": "TEXT",
  "content": {
    "text": "Le travail est terminé. Voici les photos de l'installation."
  },
  "replyToMessageId": null,
  "metadata": {
    "clientMessageId": "client_msg_123",
    "platform": "ANDROID"
  }
}
```

**Response 201:**

```json
{
  "data": {
    "id": "msg_004",
    "conversationId": "conv_001",
    "senderId": "part_003",
    "senderType": "WORK_TEAM",
    "senderDisplayName": "Services Pro Paris - Équipe 1",
    "messageType": "TEXT",
    "content": {
      "text": "Le travail est terminé. Voici les photos de l'installation."
    },
    "status": "SENT",
    "metadata": {
      "clientMessageId": "client_msg_123",
      "platform": "ANDROID"
    },
    "createdAt": "2025-12-01T16:00:00Z"
  }
}
```

---

### Send Media Message

```yaml
POST /api/v1/chat/conversations/{conversationId}/messages
```

Send a message with media attachment.

**Content-Type:** `multipart/form-data` or JSON with pre-uploaded media URL

**Request Body (JSON):**

```json
{
  "messageType": "IMAGE",
  "content": {
    "text": "Installation terminée - avant/après",
    "mediaUrl": "/media/uploads/photo_123.jpg",
    "mediaThumbnailUrl": "/media/uploads/photo_123_thumb.jpg",
    "mediaType": "IMAGE_JPEG",
    "mediaSize": 2457600
  }
}
```

**Response 201:**

```json
{
  "data": {
    "id": "msg_005",
    "conversationId": "conv_001",
    "senderId": "part_003",
    "senderType": "WORK_TEAM",
    "senderDisplayName": "Services Pro Paris - Équipe 1",
    "messageType": "IMAGE",
    "content": {
      "text": "Installation terminée - avant/après",
      "mediaUrl": "/media/uploads/photo_123.jpg",
      "mediaThumbnailUrl": "/media/uploads/photo_123_thumb.jpg",
      "mediaType": "IMAGE_JPEG",
      "mediaSize": 2457600
    },
    "status": "SENT",
    "createdAt": "2025-12-01T16:05:00Z"
  }
}
```

---

### Mark Messages as Read

```yaml
POST /api/v1/chat/conversations/{conversationId}/read
```

Mark all messages up to and including a specific message as read.

**Request Body:**

```json
{
  "lastReadMessageId": "msg_005"
}
```

**Response 200:**

```json
{
  "data": {
    "conversationId": "conv_001",
    "participantId": "part_001",
    "lastReadMessageId": "msg_005",
    "unreadCount": 0,
    "updatedAt": "2025-12-01T16:10:00Z"
  }
}
```

---

### Get Unread Count

```yaml
GET /api/v1/chat/conversations/{conversationId}/unread
```

Get unread message count for the current participant.

**Response 200:**

```json
{
  "data": {
    "conversationId": "conv_001",
    "unreadCount": 3,
    "lastReadMessageId": "msg_002",
    "oldestUnreadMessageId": "msg_003",
    "newestUnreadMessageId": "msg_005"
  }
}
```

---

### Get All Conversations Unread

```yaml
GET /api/v1/chat/unread
```

Get unread counts for all conversations the user participates in.

**Response 200:**

```json
{
  "data": {
    "totalUnread": 15,
    "conversations": [
      {
        "conversationId": "conv_001",
        "serviceOrderId": "so_789",
        "unreadCount": 3,
        "lastMessageAt": "2025-12-01T16:05:00Z",
        "lastMessagePreview": "Installation terminée - avant/après"
      },
      {
        "conversationId": "conv_002",
        "serviceOrderId": "so_790",
        "unreadCount": 12,
        "lastMessageAt": "2025-12-01T15:30:00Z",
        "lastMessagePreview": "À quelle heure pouvez-vous venir demain ?"
      }
    ]
  }
}
```

---

### Add Participant

```yaml
POST /api/v1/chat/conversations/{conversationId}/participants
```

Add a new participant to the conversation. Requires OWNER role or system permissions.

**Request Body:**

```json
{
  "participantType": "PROVIDER_MANAGER",
  "userId": "user_999",
  "displayName": "Sophie Bernard - Responsable"
}
```

**Response 201:**

```json
{
  "data": {
    "id": "part_004",
    "conversationId": "conv_001",
    "participantType": "PROVIDER_MANAGER",
    "userId": "user_999",
    "displayName": "Sophie Bernard - Responsable",
    "status": "ACTIVE",
    "joinedAt": "2025-12-01T16:15:00Z"
  }
}
```

---

### Remove Participant

```yaml
DELETE /api/v1/chat/conversations/{conversationId}/participants/{participantId}
```

Remove a participant from the conversation. Creates a system message.

**Response 200:**

```json
{
  "data": {
    "id": "part_004",
    "status": "LEFT",
    "leftAt": "2025-12-01T17:00:00Z",
    "systemMessage": {
      "id": "msg_006",
      "messageType": "SYSTEM",
      "content": {
        "text": "Sophie Bernard - Responsable a quitté la conversation"
      },
      "createdAt": "2025-12-01T17:00:00Z"
    }
  }
}
```

---

### Typing Indicator (WebSocket)

```yaml
WS /api/v1/chat/ws
```

Send and receive typing indicators via WebSocket.

**Send Typing Start:**

```json
{
  "type": "typing.start",
  "conversationId": "conv_001"
}
```

**Receive Typing Indicator:**

```json
{
  "type": "typing.update",
  "data": {
    "conversationId": "conv_001",
    "participantId": "part_002",
    "participantType": "OPERATOR",
    "displayName": "Jean-Pierre Martin",
    "isTyping": true,
    "expiresAt": "2025-12-01T16:20:10Z"
  }
}
```

---

### Chat WebSocket Events

#### New Message Event

```json
{
  "type": "chat.message.new",
  "timestamp": "2025-12-01T16:20:00Z",
  "data": {
    "message": {
      "id": "msg_007",
      "conversationId": "conv_001",
      "senderId": "part_002",
      "senderType": "OPERATOR",
      "senderDisplayName": "Jean-Pierre Martin",
      "messageType": "TEXT",
      "content": {
        "text": "Merci pour le retour, je clôture le dossier."
      },
      "status": "SENT",
      "createdAt": "2025-12-01T16:20:00Z"
    }
  }
}
```

#### Message Status Update Event

```json
{
  "type": "chat.message.status",
  "timestamp": "2025-12-01T16:21:00Z",
  "data": {
    "messageId": "msg_007",
    "conversationId": "conv_001",
    "status": "DELIVERED",
    "deliveredTo": [
      {
        "participantId": "part_001",
        "deliveredAt": "2025-12-01T16:20:05Z"
      },
      {
        "participantId": "part_003",
        "deliveredAt": "2025-12-01T16:20:10Z"
      }
    ]
  }
}
```

#### Participant Joined Event

```json
{
  "type": "chat.participant.joined",
  "timestamp": "2025-12-01T16:15:00Z",
  "data": {
    "conversationId": "conv_001",
    "participant": {
      "id": "part_004",
      "participantType": "PROVIDER_MANAGER",
      "displayName": "Sophie Bernard - Responsable",
      "joinedAt": "2025-12-01T16:15:00Z"
    }
  }
}
```

---

### Chat Rate Limits

| Operation | Requests | Time Window | Burst |
|-----------|----------|-------------|-------|
| Send Message | 30 | 1 minute | 40 |
| Get Messages | 60 | 1 minute | 80 |
| WebSocket Messages | 60 | 1 minute | 100 |
| Typing Indicators | 10 | 10 seconds | 15 |
| Media Upload | 10 | 1 minute | 15 |

---

## Rate Limiting

### Rate Limit Configuration

| Endpoint Category | Requests | Time Window | Burst Allowed |
|-------------------|----------|-------------|---------------|
| Job Queries | 100 | 1 minute | 120 |
| Job Updates | 30 | 1 minute | 40 |
| Check-In/Out | 10 | 1 minute | 15 |
| Media Upload (Single) | 20 | 1 minute | 25 |
| Media Upload (Batch) | 5 | 1 minute | 8 |
| Sync Operations | 10 | 5 minutes | 15 |
| WebSocket Messages | 60 | 1 minute | 80 |

### Rate Limit Headers

**Response Headers:**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 75
X-RateLimit-Reset: 1699968000
X-RateLimit-Burst: 120
X-RateLimit-Category: job_queries
```

### Rate Limit Exceeded Response

**Response 429:**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded for job updates",
    "details": {
      "limit": 30,
      "window_seconds": 60,
      "retry_after_seconds": 45,
      "reset_at": "2025-11-14T16:01:00Z",
      "category": "job_updates"
    }
  }
}
```

### Rate Limiting Best Practices

1. **Batch Operations**: Use batch endpoints for multiple updates
2. **Offline Queue**: Queue operations when offline, sync when connected
3. **Exponential Backoff**: Implement exponential backoff on 429 responses
4. **WebSocket**: Use WebSocket for real-time updates instead of polling
5. **Delta Sync**: Use delta sync to minimize API calls
6. **Local Cache**: Cache reference data locally to reduce queries

### Premium Rate Limits

Premium tier customers receive enhanced limits:

| Endpoint Category | Standard | Premium | Enterprise |
|-------------------|----------|---------|------------|
| Job Queries | 100/min | 300/min | 1000/min |
| Job Updates | 30/min | 100/min | 300/min |
| Media Upload | 20/min | 60/min | 200/min |
| Sync Operations | 10/5min | 30/5min | 100/5min |

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_REQUEST | 400 | Malformed request |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| SYNC_CONFLICT | 409 | Data conflict detected |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| FILE_TOO_LARGE | 413 | Upload exceeds size limit |
| UNSUPPORTED_MEDIA_TYPE | 415 | Invalid file type |
| OFFLINE_MODE_REQUIRED | 503 | Operation requires offline mode |
| SYNC_TOKEN_EXPIRED | 410 | Sync token has expired |

---

## Offline Sync Patterns

### Pattern 1: Optimistic Updates

```javascript
// Client-side pseudocode
async function updateJobStatus(jobId, newStatus) {
  // 1. Update local database immediately
  await localDB.jobs.update(jobId, { status: newStatus, synced: false });

  // 2. Update UI immediately
  updateUI(jobId, newStatus);

  // 3. Queue sync operation
  await syncQueue.add({
    operation: 'update_job_status',
    jobId,
    newStatus,
    timestamp: new Date().toISOString()
  });

  // 4. Attempt sync if online
  if (navigator.onLine) {
    await syncQueue.process();
  }
}
```

### Pattern 2: Conflict Resolution

```javascript
// Server-side conflict resolution
function resolveConflict(clientData, serverData, strategy) {
  if (strategy === 'server_wins') {
    return serverData;
  } else if (strategy === 'client_wins') {
    return clientData;
  } else if (strategy === 'merge') {
    return {
      ...serverData,
      ...clientData,
      conflictedFields: detectConflicts(clientData, serverData)
    };
  } else if (strategy === 'last_write_wins') {
    return clientData.timestamp > serverData.timestamp
      ? clientData
      : serverData;
  }
}
```

### Pattern 3: Media Upload Queue

```javascript
// Client-side media upload queue
class MediaUploadQueue {
  async addToQueue(file, metadata) {
    const offlineId = generateOfflineId();

    // Store file and metadata locally
    await localDB.pendingUploads.add({
      offlineId,
      file: await this.compressIfNeeded(file),
      metadata,
      priority: metadata.priority || 'medium',
      retryCount: 0,
      createdAt: new Date()
    });

    // Attempt upload if online
    if (navigator.onLine) {
      await this.processQueue();
    }
  }

  async processQueue() {
    const pending = await localDB.pendingUploads
      .orderBy('priority')
      .toArray();

    for (const upload of pending) {
      try {
        const result = await this.uploadFile(upload);
        await this.updateReferences(upload.offlineId, result.serverId);
        await localDB.pendingUploads.delete(upload.offlineId);
      } catch (error) {
        await this.handleUploadError(upload, error);
      }
    }
  }
}
```

---

## Appendix

### Media Upload Limits

| Media Type | Max Size | Supported Formats |
|------------|----------|-------------------|
| Photo | 25 MB | JPEG, PNG, HEIC, WebP |
| Document | 50 MB | PDF, DOCX, XLSX, TXT |
| Video | 500 MB | MP4, MOV, AVI |
| Signature | 1 MB | PNG (data URL) |

### Geofencing Validation

Jobs support geofence validation for check-in/check-out:

- **Tolerance**: 100 meters (configurable per job)
- **GPS Accuracy**: Minimum 20 meters required
- **Validation**: Server-side distance calculation
- **Override**: Supervisors can override validation failures

### Offline Storage Recommendations

- **Jobs**: Store 7-14 days of assigned jobs
- **Attachments**: Download on-demand or selective sync
- **Media Cache**: Limit to 500 MB, LRU eviction
- **Reference Data**: Full sync, update weekly

---

**Version:** 1.0.0
**Last Updated:** 2025-11-14
**API Base URL:** `https://api.fsm.example.com`
