# Document & Media API Specification

## Overview

The Document & Media API manages contracts, work completion forms (WCF), documents, and media files (photos, videos, PDFs). Provides comprehensive upload, download, version control, and document management capabilities with support for offline operations.

---

## Table of Contents

1. [Contract Management](#contract-management)
2. [Work Completion Forms (WCF)](#work-completion-forms-wcf)
3. [Document Management](#document-management)
4. [Media Upload](#media-upload)
5. [Media Download](#media-download)
6. [Version Control](#version-control)
7. [Real-Time Updates](#real-time-updates)
8. [Rate Limiting](#rate-limiting)

---

## Contract Management

### Get Contracts

```yaml
GET /api/v1/documents/contracts
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| project_id | string | No | Filter by project |
| status | string | No | Filter: `draft`, `pending_approval`, `active`, `completed`, `terminated` |
| contract_type | string | No | Type: `master`, `subcontractor`, `purchase_order`, `service` |
| client_id | string | No | Filter by client |
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Items per page (default: 50, max: 200) |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "contracts": [
      {
        "contract_id": "contract_001",
        "contract_number": "MSA-2025-001",
        "contract_type": "master",
        "title": "Master Service Agreement - Downtown Office Complex",
        "status": "active",
        "project_id": "proj_456",
        "project_name": "Downtown Office Complex",
        "client": {
          "client_id": "client_789",
          "name": "ABC Corporation",
          "contact_name": "David Johnson",
          "email": "djohnson@abc.com",
          "phone": "+1-555-0103"
        },
        "contractor": {
          "company_name": "BuildTech Construction",
          "contact_name": "Michael Chen",
          "email": "mchen@buildtech.com"
        },
        "financial": {
          "contract_value": 5000000,
          "currency": "USD",
          "payment_terms": "Net 30",
          "retention_percentage": 10.0,
          "billed_to_date": 3375000,
          "paid_to_date": 3037500,
          "remaining_value": 1625000
        },
        "dates": {
          "effective_date": "2025-06-01",
          "expiration_date": "2025-12-31",
          "signed_date": "2025-05-15",
          "days_remaining": 47
        },
        "scope": {
          "description": "Complete MEP installation for new office complex",
          "deliverables": [
            "Electrical system installation",
            "Plumbing system installation",
            "HVAC system installation"
          ],
          "exclusions": [
            "Exterior landscaping",
            "Parking lot construction"
          ]
        },
        "documents": [
          {
            "document_id": "doc_001",
            "name": "Signed_Contract_MSA-2025-001.pdf",
            "version": "1.2",
            "type": "executed_contract",
            "size": 2457600,
            "uploaded_at": "2025-05-15T14:30:00Z",
            "uploaded_by": "user_301"
          },
          {
            "document_id": "doc_002",
            "name": "Amendment_01_Scope_Change.pdf",
            "version": "1.0",
            "type": "amendment",
            "size": 524288,
            "uploaded_at": "2025-08-10T10:00:00Z",
            "uploaded_by": "user_301"
          }
        ],
        "milestones": [
          {
            "milestone_id": "cm_001",
            "name": "Foundation Complete",
            "payment_amount": 500000,
            "due_date": "2025-07-15",
            "completion_date": "2025-07-14",
            "status": "paid",
            "payment_date": "2025-07-28"
          },
          {
            "milestone_id": "cm_002",
            "name": "Structural Frame Complete",
            "payment_amount": 750000,
            "due_date": "2025-09-30",
            "completion_date": "2025-09-28",
            "status": "paid",
            "payment_date": "2025-10-12"
          },
          {
            "milestone_id": "cm_003",
            "name": "MEP Rough-In Complete",
            "payment_amount": 1000000,
            "due_date": "2025-11-30",
            "completion_date": null,
            "status": "in_progress",
            "payment_date": null
          }
        ],
        "amendments": [
          {
            "amendment_id": "amend_001",
            "number": "01",
            "description": "Scope change - Additional electrical circuits",
            "value_change": 50000,
            "effective_date": "2025-08-10",
            "status": "approved"
          }
        ],
        "change_orders": 3,
        "total_change_order_value": 125000,
        "created_at": "2025-05-01T09:00:00Z",
        "updated_at": "2025-11-14T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total_items": 12,
      "total_pages": 1,
      "has_next": false,
      "has_previous": false
    },
    "summary": {
      "total_contracts": 12,
      "total_value": 15500000,
      "active_contracts": 8,
      "pending_approval": 2,
      "total_billed": 10250000,
      "total_paid": 9225000
    }
  }
}
```

---

### Get Contract Details

```yaml
GET /api/v1/documents/contracts/{contract_id}
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| contract_id | string | Yes | Unique contract identifier |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| include_history | boolean | No | Include revision history |
| include_related_documents | boolean | No | Include all related documents |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "contract_id": "contract_001",
    "contract_number": "MSA-2025-001",
    "contract_type": "master",
    "title": "Master Service Agreement - Downtown Office Complex",
    "status": "active",
    "version": "1.2",
    "project_id": "proj_456",
    "financial": {
      "original_contract_value": 4950000,
      "current_contract_value": 5000000,
      "change_orders_value": 50000,
      "currency": "USD",
      "payment_terms": {
        "terms": "Net 30",
        "payment_schedule": "milestone_based",
        "retention_percentage": 10.0,
        "retention_release": "substantial_completion"
      },
      "billing_summary": {
        "total_billed": 3375000,
        "total_paid": 3037500,
        "retention_held": 337500,
        "outstanding_invoices": 337500,
        "remaining_to_bill": 1625000
      }
    },
    "parties": {
      "owner": {
        "name": "ABC Corporation",
        "address": "456 Corporate Blvd, New York, NY 10002",
        "authorized_representative": "David Johnson",
        "title": "VP of Operations"
      },
      "contractor": {
        "name": "BuildTech Construction",
        "license_number": "CT-12345-NY",
        "address": "789 Builder Ave, New York, NY 10003",
        "authorized_representative": "Michael Chen",
        "title": "Project Manager"
      },
      "architect": {
        "name": "Design Architects LLC",
        "contact": "Jane Smith",
        "license_number": "ARC-98765-NY"
      }
    },
    "scope": {
      "description": "Complete MEP installation for new office complex",
      "deliverables": [
        "Electrical system installation - 480V/208V distribution",
        "Plumbing system installation - domestic and fire protection",
        "HVAC system installation - VAV system with central plant"
      ],
      "exclusions": [
        "Exterior landscaping",
        "Parking lot construction",
        "Low voltage systems (data/telecom)"
      ],
      "specifications": [
        {
          "section": "26 00 00",
          "title": "Electrical",
          "document_id": "doc_spec_001"
        },
        {
          "section": "22 00 00",
          "title": "Plumbing",
          "document_id": "doc_spec_002"
        },
        {
          "section": "23 00 00",
          "title": "HVAC",
          "document_id": "doc_spec_003"
        }
      ]
    },
    "schedule": {
      "effective_date": "2025-06-01",
      "substantial_completion_date": "2025-12-15",
      "final_completion_date": "2025-12-31",
      "liquidated_damages": {
        "amount_per_day": 5000,
        "maximum_amount": 250000,
        "trigger": "substantial_completion"
      }
    },
    "insurance_requirements": {
      "general_liability": {
        "per_occurrence": 1000000,
        "aggregate": 2000000
      },
      "workers_compensation": {
        "required": true,
        "statutory_limits": true
      },
      "builders_risk": {
        "coverage_amount": 5000000,
        "deductible": 25000
      }
    },
    "bonds": {
      "performance_bond": {
        "required": true,
        "percentage": 100,
        "amount": 5000000,
        "surety": "ABC Surety Company",
        "bond_number": "PB-2025-001",
        "expiration": "2026-01-31"
      },
      "payment_bond": {
        "required": true,
        "percentage": 100,
        "amount": 5000000,
        "surety": "ABC Surety Company",
        "bond_number": "PAY-2025-001",
        "expiration": "2026-01-31"
      }
    },
    "documents": [
      {
        "document_id": "doc_001",
        "name": "Signed_Contract_MSA-2025-001.pdf",
        "type": "executed_contract",
        "version": "1.2",
        "size": 2457600,
        "pages": 45,
        "url": "/api/v1/media/download/doc_001",
        "uploaded_at": "2025-05-15T14:30:00Z",
        "uploaded_by": {
          "user_id": "user_301",
          "name": "Michael Chen"
        }
      }
    ],
    "change_orders": [
      {
        "change_order_id": "co_001",
        "number": "CO-001",
        "description": "Additional electrical circuits - 2nd floor",
        "value_change": 50000,
        "schedule_impact_days": 3,
        "status": "approved",
        "submitted_date": "2025-08-01",
        "approved_date": "2025-08-05",
        "effective_date": "2025-08-10",
        "documents": [
          {
            "document_id": "doc_co_001",
            "name": "CO-001_Electrical_Circuits.pdf"
          }
        ]
      }
    ],
    "submittals": {
      "total": 45,
      "approved": 38,
      "pending_review": 5,
      "rejected": 2
    },
    "rfis": {
      "total": 23,
      "open": 3,
      "closed": 20,
      "average_response_time_days": 4.2
    },
    "created_at": "2025-05-01T09:00:00Z",
    "updated_at": "2025-11-14T10:00:00Z",
    "version_history": [
      {
        "version": "1.0",
        "description": "Initial contract execution",
        "modified_at": "2025-05-15T14:30:00Z",
        "modified_by": "user_301"
      },
      {
        "version": "1.1",
        "description": "Amendment 01 - Scope change",
        "modified_at": "2025-08-10T10:00:00Z",
        "modified_by": "user_301"
      },
      {
        "version": "1.2",
        "description": "Amendment 02 - Schedule adjustment",
        "modified_at": "2025-10-15T11:00:00Z",
        "modified_by": "user_301"
      }
    ]
  }
}
```

---

### Upload Contract Document

```yaml
POST /api/v1/documents/contracts/{contract_id}/upload
```

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | file | Yes | Contract document (PDF) |
| document_type | string | Yes | Type: `executed_contract`, `amendment`, `change_order` |
| version | string | No | Version number |
| description | string | No | Document description |
| effective_date | string | No | Effective date (ISO 8601) |

**Response 201:**

```json
{
  "success": true,
  "data": {
    "document_id": "doc_003",
    "contract_id": "contract_001",
    "name": "Amendment_02_Schedule.pdf",
    "document_type": "amendment",
    "version": "1.0",
    "size": 655360,
    "pages": 8,
    "url": "/api/v1/media/download/doc_003",
    "uploaded_at": "2025-11-14T15:00:00Z",
    "uploaded_by": "user_301",
    "processing_status": "completed"
  }
}
```

---

## Work Completion Forms (WCF)

### Get Work Completion Forms

```yaml
GET /api/v1/documents/wcf
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| project_id | string | No | Filter by project |
| job_id | string | No | Filter by job |
| status | string | No | Filter: `draft`, `submitted`, `approved`, `rejected` |
| date_from | string | No | Start date (ISO 8601) |
| date_to | string | No | End date (ISO 8601) |
| technician_id | string | No | Filter by technician |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "forms": [
      {
        "wcf_id": "wcf_001",
        "wcf_number": "WCF-2025-1114-001",
        "job_id": "job_789",
        "work_order_id": "wo_123",
        "project_id": "proj_456",
        "status": "approved",
        "technician": {
          "user_id": "user_101",
          "name": "John Smith",
          "trade": "electrician"
        },
        "work_performed": {
          "date": "2025-11-14",
          "start_time": "08:15:00Z",
          "end_time": "17:30:00Z",
          "total_hours": 9.25,
          "break_time_minutes": 30,
          "billable_hours": 8.75,
          "description": "Installed 200A electrical panel, connected feeders, tested circuits"
        },
        "tasks_completed": [
          {
            "task_id": "task_001",
            "description": "Install electrical panel",
            "completion_percentage": 100,
            "notes": "Installation completed per specifications"
          }
        ],
        "materials_used": [
          {
            "material_id": "mat_001",
            "name": "200A Panel",
            "quantity": 1,
            "unit": "each",
            "serial_number": "SN123456",
            "cost": 1250.00
          },
          {
            "material_id": "mat_002",
            "name": "3/0 AWG Copper Wire",
            "quantity": 150,
            "unit": "feet",
            "cost": 450.00
          }
        ],
        "equipment_used": [
          {
            "equipment_id": "equip_005",
            "name": "Scissor Lift 20ft",
            "hours": 4.0,
            "cost": 180.00
          }
        ],
        "quality_checks": [
          {
            "check_id": "qc_001",
            "description": "Verify panel installation per code",
            "status": "passed",
            "performed_by": "user_101",
            "performed_at": "2025-11-14T16:00:00Z"
          },
          {
            "check_id": "qc_002",
            "description": "Test all circuits",
            "status": "passed",
            "performed_by": "user_101",
            "performed_at": "2025-11-14T17:00:00Z"
          }
        ],
        "photos": [
          {
            "photo_id": "photo_001",
            "caption": "Panel before installation",
            "url": "/api/v1/media/photo_001",
            "thumbnail_url": "/api/v1/media/thumbnail/photo_001"
          },
          {
            "photo_id": "photo_002",
            "caption": "Panel after installation",
            "url": "/api/v1/media/photo_002",
            "thumbnail_url": "/api/v1/media/thumbnail/photo_002"
          }
        ],
        "customer_signature": {
          "signed_by": "David Johnson",
          "title": "Facilities Manager",
          "signature_data_url": "data:image/png;base64,iVBORw0KGg...",
          "signed_at": "2025-11-14T17:30:00Z",
          "satisfaction_rating": 5,
          "comments": "Excellent work, very professional"
        },
        "technician_signature": {
          "signed_by": "John Smith",
          "signature_data_url": "data:image/png;base64,iVBORw0KGg...",
          "signed_at": "2025-11-14T17:30:00Z"
        },
        "approval": {
          "status": "approved",
          "approved_by": "user_302",
          "approved_by_name": "Sarah Williams",
          "approved_at": "2025-11-14T18:00:00Z",
          "comments": "Work completed satisfactorily"
        },
        "billing": {
          "labor_cost": 743.75,
          "materials_cost": 1700.00,
          "equipment_cost": 180.00,
          "total_cost": 2623.75,
          "invoiced": true,
          "invoice_id": "inv_001"
        },
        "created_at": "2025-11-14T17:30:00Z",
        "submitted_at": "2025-11-14T17:35:00Z",
        "updated_at": "2025-11-14T18:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total_items": 156,
      "total_pages": 4
    },
    "summary": {
      "total_forms": 156,
      "pending_approval": 12,
      "approved_today": 8,
      "total_billable_hours": 1250.5,
      "total_value": 106250.00
    }
  }
}
```

---

### Create Work Completion Form

```yaml
POST /api/v1/documents/wcf
```

**Request Body:**

```json
{
  "job_id": "job_789",
  "work_order_id": "wo_123",
  "project_id": "proj_456",
  "technician_id": "user_101",
  "work_performed": {
    "date": "2025-11-14",
    "start_time": "08:15:00Z",
    "end_time": "17:30:00Z",
    "break_time_minutes": 30,
    "description": "Installed 200A electrical panel, connected feeders, tested circuits"
  },
  "tasks_completed": [
    {
      "task_id": "task_001",
      "completion_percentage": 100,
      "notes": "Installation completed per specifications"
    }
  ],
  "materials_used": [
    {
      "material_id": "mat_001",
      "quantity": 1,
      "serial_number": "SN123456"
    },
    {
      "material_id": "mat_002",
      "quantity": 150
    }
  ],
  "equipment_used": [
    {
      "equipment_id": "equip_005",
      "hours": 4.0
    }
  ],
  "quality_checks": [
    {
      "check_id": "qc_001",
      "status": "passed",
      "performed_at": "2025-11-14T16:00:00Z"
    }
  ],
  "photo_ids": ["photo_001", "photo_002"],
  "customer_signature": {
    "signed_by": "David Johnson",
    "title": "Facilities Manager",
    "signature_data_url": "data:image/png;base64,iVBORw0KGg...",
    "signed_at": "2025-11-14T17:30:00Z",
    "satisfaction_rating": 5,
    "comments": "Excellent work"
  },
  "technician_signature": {
    "signature_data_url": "data:image/png;base64,iVBORw0KGg...",
    "signed_at": "2025-11-14T17:30:00Z"
  },
  "status": "submitted"
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "wcf_id": "wcf_001",
    "wcf_number": "WCF-2025-1114-001",
    "status": "submitted",
    "job_id": "job_789",
    "created_at": "2025-11-14T17:30:00Z",
    "pdf_url": "/api/v1/documents/wcf/wcf_001/pdf",
    "requires_approval": true,
    "approval_workflow": {
      "approvers": [
        {
          "user_id": "user_302",
          "name": "Sarah Williams",
          "role": "Superintendent"
        }
      ],
      "notification_sent": true
    }
  }
}
```

---

### Download WCF as PDF

```yaml
GET /api/v1/documents/wcf/{wcf_id}/pdf
```

**Response 200:**

Returns PDF file with `Content-Type: application/pdf`

**Response Headers:**

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="WCF-2025-1114-001.pdf"
Content-Length: 524288
```

---

## Document Management

### Upload Document

```yaml
POST /api/v1/documents/upload
```

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | file | Yes | Document file |
| category | string | Yes | Category: `contract`, `drawing`, `specification`, `report`, `submittal`, `other` |
| project_id | string | No | Associated project |
| job_id | string | No | Associated job |
| title | string | Yes | Document title |
| description | string | No | Document description |
| tags | JSON | No | Array of tags |
| access_level | string | No | Access: `public`, `internal`, `confidential` (default: `internal`) |
| version | string | No | Version number |

**cURL Example:**

```bash
curl -X POST https://api.fsm.example.com/api/v1/documents/upload \
  -H "Authorization: Bearer {token}" \
  -F "file=@electrical_drawings.pdf" \
  -F "category=drawing" \
  -F "project_id=proj_456" \
  -F "title=Electrical Drawings - Building A" \
  -F "description=Complete electrical drawings for Building A" \
  -F 'tags=["electrical","building_a","drawings"]' \
  -F "access_level=internal" \
  -F "version=2.1"
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "document_id": "doc_100",
    "filename": "electrical_drawings.pdf",
    "title": "Electrical Drawings - Building A",
    "category": "drawing",
    "version": "2.1",
    "size": 10485760,
    "mime_type": "application/pdf",
    "pages": 45,
    "url": "/api/v1/documents/doc_100/download",
    "preview_url": "/api/v1/documents/doc_100/preview",
    "thumbnail_url": "/api/v1/documents/doc_100/thumbnail",
    "project_id": "proj_456",
    "tags": ["electrical", "building_a", "drawings"],
    "access_level": "internal",
    "uploaded_at": "2025-11-14T16:00:00Z",
    "uploaded_by": {
      "user_id": "user_301",
      "name": "Michael Chen"
    },
    "processing_status": "completed",
    "ocr_enabled": true,
    "searchable": true,
    "checksum": "sha256:a1b2c3d4e5f6..."
  }
}
```

---

### Get Documents

```yaml
GET /api/v1/documents
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| category | string | No | Filter by category |
| project_id | string | No | Filter by project |
| job_id | string | No | Filter by job |
| tags | array | No | Filter by tags |
| search | string | No | Full-text search |
| date_from | string | No | Upload date from |
| date_to | string | No | Upload date to |
| page | integer | No | Page number |
| limit | integer | No | Items per page |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "document_id": "doc_100",
        "filename": "electrical_drawings.pdf",
        "title": "Electrical Drawings - Building A",
        "category": "drawing",
        "version": "2.1",
        "size": 10485760,
        "mime_type": "application/pdf",
        "pages": 45,
        "url": "/api/v1/documents/doc_100/download",
        "preview_url": "/api/v1/documents/doc_100/preview",
        "thumbnail_url": "/api/v1/documents/doc_100/thumbnail",
        "project_id": "proj_456",
        "project_name": "Downtown Office Complex",
        "tags": ["electrical", "building_a", "drawings"],
        "access_level": "internal",
        "uploaded_at": "2025-11-14T16:00:00Z",
        "uploaded_by": {
          "user_id": "user_301",
          "name": "Michael Chen"
        },
        "download_count": 23,
        "last_accessed": "2025-11-14T17:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total_items": 456,
      "total_pages": 10
    },
    "facets": {
      "categories": [
        {"category": "drawing", "count": 156},
        {"category": "specification", "count": 89},
        {"category": "report", "count": 78}
      ],
      "tags": [
        {"tag": "electrical", "count": 145},
        {"tag": "plumbing", "count": 98}
      ]
    }
  }
}
```

---

### Get Document Details

```yaml
GET /api/v1/documents/{document_id}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "document_id": "doc_100",
    "filename": "electrical_drawings.pdf",
    "title": "Electrical Drawings - Building A",
    "description": "Complete electrical drawings for Building A",
    "category": "drawing",
    "current_version": "2.1",
    "size": 10485760,
    "mime_type": "application/pdf",
    "pages": 45,
    "url": "/api/v1/documents/doc_100/download",
    "preview_url": "/api/v1/documents/doc_100/preview",
    "project_id": "proj_456",
    "project_name": "Downtown Office Complex",
    "tags": ["electrical", "building_a", "drawings"],
    "access_level": "internal",
    "metadata": {
      "author": "Design Architects LLC",
      "created_date": "2025-10-01",
      "software": "AutoCAD 2024",
      "drawing_numbers": ["E-1.0", "E-1.1", "E-2.0"]
    },
    "uploaded_at": "2025-11-14T16:00:00Z",
    "uploaded_by": {
      "user_id": "user_301",
      "name": "Michael Chen",
      "email": "mchen@buildtech.com"
    },
    "versions": [
      {
        "version": "2.1",
        "document_id": "doc_100",
        "size": 10485760,
        "uploaded_at": "2025-11-14T16:00:00Z",
        "uploaded_by": "user_301",
        "changes": "Updated circuit schedules",
        "current": true
      },
      {
        "version": "2.0",
        "document_id": "doc_099",
        "size": 10240000,
        "uploaded_at": "2025-11-01T10:00:00Z",
        "uploaded_by": "user_301",
        "changes": "Added emergency power circuits",
        "current": false
      },
      {
        "version": "1.0",
        "document_id": "doc_050",
        "size": 9728000,
        "uploaded_at": "2025-10-15T09:00:00Z",
        "uploaded_by": "user_301",
        "changes": "Initial release",
        "current": false
      }
    ],
    "related_documents": [
      {
        "document_id": "doc_101",
        "title": "Electrical Specifications",
        "relationship": "specification"
      }
    ],
    "permissions": {
      "can_download": true,
      "can_edit": true,
      "can_delete": false,
      "can_share": true
    },
    "activity": {
      "download_count": 23,
      "view_count": 45,
      "last_accessed": "2025-11-14T17:30:00Z",
      "last_accessed_by": "user_105"
    },
    "checksum": "sha256:a1b2c3d4e5f6...",
    "virus_scan": {
      "status": "clean",
      "scanned_at": "2025-11-14T16:01:00Z"
    }
  }
}
```

---

## Media Upload

### Upload Photo (Multipart)

```yaml
POST /api/v1/media/photos
```

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | file | Yes | Image file (JPEG, PNG, HEIC, WebP) |
| project_id | string | No | Associated project |
| job_id | string | No | Associated job |
| task_id | string | No | Associated task |
| caption | string | No | Photo caption |
| timestamp | string | Yes | Photo taken timestamp (ISO 8601) |
| location | JSON | No | GPS coordinates |
| metadata | JSON | No | EXIF and additional metadata |

**Response 201:**

```json
{
  "success": true,
  "data": {
    "photo_id": "photo_100",
    "filename": "IMG_20251114_083000.jpg",
    "url": "/api/v1/media/photo_100",
    "thumbnail_url": "/api/v1/media/thumbnail/photo_100",
    "size": 2457600,
    "mime_type": "image/jpeg",
    "dimensions": {
      "width": 4032,
      "height": 3024,
      "aspect_ratio": 1.33
    },
    "caption": "Panel installation in progress",
    "timestamp": "2025-11-14T08:30:00Z",
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "accuracy": 5.0
    },
    "exif": {
      "camera_make": "Apple",
      "camera_model": "iPhone 15 Pro",
      "iso": 100,
      "aperture": "f/1.8",
      "shutter_speed": "1/120",
      "flash": false,
      "orientation": "landscape"
    },
    "uploaded_at": "2025-11-14T16:30:00Z",
    "uploaded_by": "user_101",
    "processing_status": "completed",
    "ai_analysis": {
      "objects_detected": ["electrical_panel", "tools", "person"],
      "safety_violations": [],
      "quality_score": 0.92
    }
  }
}
```

---

### Upload Video (Chunked Upload)

```yaml
POST /api/v1/media/videos/initiate
```

Initiate chunked upload for large video files.

**Request Body:**

```json
{
  "filename": "site_walkthrough.mp4",
  "size": 104857600,
  "mime_type": "video/mp4",
  "duration_seconds": 180,
  "project_id": "proj_456",
  "job_id": "job_789",
  "title": "Daily site walkthrough - Building A",
  "description": "Complete walkthrough of electrical installations",
  "timestamp": "2025-11-14T17:00:00Z",
  "chunk_size": 5242880
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "upload_id": "upload_session_001",
    "video_id": "video_100",
    "total_chunks": 20,
    "chunk_size": 5242880,
    "upload_urls": [
      {
        "chunk_number": 1,
        "upload_url": "/api/v1/media/videos/upload_session_001/chunk/1"
      },
      {
        "chunk_number": 2,
        "upload_url": "/api/v1/media/videos/upload_session_001/chunk/2"
      }
    ],
    "expires_at": "2025-11-14T19:00:00Z"
  }
}
```

---

### Upload Video Chunk

```yaml
PUT /api/v1/media/videos/{upload_id}/chunk/{chunk_number}
```

**Content-Type:** `application/octet-stream`

**Request Body:** Binary chunk data

**Response 200:**

```json
{
  "success": true,
  "data": {
    "upload_id": "upload_session_001",
    "chunk_number": 1,
    "chunk_size": 5242880,
    "checksum": "md5:abc123...",
    "status": "uploaded",
    "next_chunk": 2
  }
}
```

---

### Complete Video Upload

```yaml
POST /api/v1/media/videos/{upload_id}/complete
```

**Request Body:**

```json
{
  "chunk_checksums": [
    {"chunk_number": 1, "checksum": "md5:abc123..."},
    {"chunk_number": 2, "checksum": "md5:def456..."}
  ]
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "video_id": "video_100",
    "upload_id": "upload_session_001",
    "filename": "site_walkthrough.mp4",
    "size": 104857600,
    "duration_seconds": 180,
    "processing_status": "processing",
    "estimated_completion": "2025-11-14T18:15:00Z",
    "status_url": "/api/v1/media/videos/video_100/status"
  }
}
```

---

## Media Download

### Download Document

```yaml
GET /api/v1/documents/{document_id}/download
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| version | string | No | Specific version to download |
| inline | boolean | No | Display inline vs download (default: false) |

**Response 200:**

Returns file with appropriate `Content-Type` header.

**Response Headers:**

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="electrical_drawings.pdf"
Content-Length: 10485760
ETag: "a1b2c3d4e5f6"
Cache-Control: private, max-age=3600
```

---

### Download Photo

```yaml
GET /api/v1/media/{photo_id}
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| size | string | No | Size: `thumbnail`, `medium`, `large`, `original` |
| format | string | No | Format: `jpeg`, `png`, `webp` |

**Response 200:**

Returns image file.

**Response Headers:**

```
Content-Type: image/jpeg
Content-Disposition: inline; filename="IMG_20251114_083000.jpg"
Content-Length: 2457600
ETag: "xyz789"
Cache-Control: public, max-age=31536000
```

---

### Stream Video

```yaml
GET /api/v1/media/videos/{video_id}/stream
```

Supports HTTP range requests for video streaming.

**Request Headers:**

```
Range: bytes=0-1048575
```

**Response 206 (Partial Content):**

**Response Headers:**

```
Content-Type: video/mp4
Content-Range: bytes 0-1048575/104857600
Content-Length: 1048576
Accept-Ranges: bytes
```

---

## Version Control

### Create New Version

```yaml
POST /api/v1/documents/{document_id}/versions
```

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | file | Yes | New version file |
| version | string | Yes | Version number |
| changes | string | Yes | Description of changes |
| change_type | string | No | Type: `minor`, `major`, `revision` |

**Response 201:**

```json
{
  "success": true,
  "data": {
    "document_id": "doc_102",
    "parent_document_id": "doc_100",
    "version": "2.2",
    "filename": "electrical_drawings_v2.2.pdf",
    "size": 10745856,
    "changes": "Added lighting control panel details",
    "change_type": "minor",
    "uploaded_at": "2025-11-14T17:00:00Z",
    "uploaded_by": "user_301",
    "is_current_version": true
  }
}
```

---

### Get Version History

```yaml
GET /api/v1/documents/{document_id}/versions
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "document_id": "doc_100",
    "current_version": "2.2",
    "versions": [
      {
        "version": "2.2",
        "document_id": "doc_102",
        "size": 10745856,
        "changes": "Added lighting control panel details",
        "change_type": "minor",
        "uploaded_at": "2025-11-14T17:00:00Z",
        "uploaded_by": {
          "user_id": "user_301",
          "name": "Michael Chen"
        },
        "download_url": "/api/v1/documents/doc_102/download",
        "is_current": true
      },
      {
        "version": "2.1",
        "document_id": "doc_100",
        "size": 10485760,
        "changes": "Updated circuit schedules",
        "change_type": "minor",
        "uploaded_at": "2025-11-14T16:00:00Z",
        "uploaded_by": {
          "user_id": "user_301",
          "name": "Michael Chen"
        },
        "download_url": "/api/v1/documents/doc_100/download?version=2.1",
        "is_current": false
      }
    ],
    "total_versions": 3
  }
}
```

---

### Compare Versions

```yaml
GET /api/v1/documents/{document_id}/versions/compare
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| version_a | string | Yes | First version |
| version_b | string | Yes | Second version |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "document_id": "doc_100",
    "version_a": {
      "version": "2.1",
      "document_id": "doc_100",
      "size": 10485760,
      "uploaded_at": "2025-11-14T16:00:00Z"
    },
    "version_b": {
      "version": "2.2",
      "document_id": "doc_102",
      "size": 10745856,
      "uploaded_at": "2025-11-14T17:00:00Z"
    },
    "differences": {
      "size_change_bytes": 260096,
      "size_change_percentage": 2.48,
      "pages_added": 2,
      "pages_removed": 0,
      "pages_modified": 3,
      "comparison_url": "/api/v1/documents/doc_100/versions/compare/visual?version_a=2.1&version_b=2.2"
    }
  }
}
```

---

## Real-Time Updates

### WebSocket Connection

```yaml
WSS /api/v1/documents/ws
```

**Connection URL:**

```
wss://api.fsm.example.com/api/v1/documents/ws?token={jwt_token}
```

**Subscribe to Document Updates:**

```json
{
  "type": "subscribe",
  "channels": [
    "documents.project.proj_456",
    "documents.category.drawing",
    "wcf.status_changes"
  ]
}
```

---

### WebSocket Events

#### Document Uploaded

```json
{
  "type": "document.uploaded",
  "timestamp": "2025-11-14T17:30:00Z",
  "data": {
    "document_id": "doc_150",
    "title": "Updated Floor Plans",
    "category": "drawing",
    "project_id": "proj_456",
    "uploaded_by": {
      "user_id": "user_301",
      "name": "Michael Chen"
    },
    "version": "1.0",
    "url": "/api/v1/documents/doc_150/download"
  }
}
```

#### WCF Status Changed

```json
{
  "type": "wcf.status_changed",
  "timestamp": "2025-11-14T18:00:00Z",
  "data": {
    "wcf_id": "wcf_001",
    "old_status": "submitted",
    "new_status": "approved",
    "approved_by": {
      "user_id": "user_302",
      "name": "Sarah Williams"
    },
    "job_id": "job_789"
  }
}
```

---

## Rate Limiting

### Rate Limit Configuration

| Endpoint Category | Requests | Time Window | Burst Allowed |
|-------------------|----------|-------------|---------------|
| Document Upload | 20 | 1 minute | 30 |
| Document Download | 100 | 1 minute | 150 |
| Media Upload (Single) | 20 | 1 minute | 25 |
| Media Upload (Batch) | 5 | 1 minute | 8 |
| Video Upload | 5 | 1 minute | 8 |
| Document Queries | 100 | 1 minute | 120 |
| WCF Operations | 30 | 1 minute | 40 |
| Version Control | 20 | 1 minute | 30 |

### File Size Limits

| File Type | Max Size | Notes |
|-----------|----------|-------|
| Photo | 25 MB | Auto-compressed if > 10MB |
| Document (PDF) | 100 MB | OCR processed if enabled |
| Video | 1 GB | Chunked upload required |
| Contract | 50 MB | Version control enabled |

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_FILE_TYPE | 415 | Unsupported file type |
| FILE_TOO_LARGE | 413 | File exceeds size limit |
| VIRUS_DETECTED | 422 | File failed virus scan |
| UPLOAD_INCOMPLETE | 400 | Chunked upload not completed |
| VERSION_CONFLICT | 409 | Version already exists |
| DOCUMENT_NOT_FOUND | 404 | Document not found |
| INSUFFICIENT_PERMISSIONS | 403 | Access denied |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |

---

**Version:** 1.0.0
**Last Updated:** 2025-11-14
**API Base URL:** `https://api.fsm.example.com`
