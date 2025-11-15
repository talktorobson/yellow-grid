# Control Tower API Specification

## Overview

The Control Tower API provides comprehensive project management, task orchestration, calendar views, and Gantt chart data visualization. Designed for construction project managers and supervisors to monitor and control all aspects of field service operations.

---

## Table of Contents

1. [Control Tower Dashboard](#control-tower-dashboard)
2. [Task Management](#task-management)
3. [Calendar Views](#calendar-views)
4. [Gantt Chart Data](#gantt-chart-data)
5. [Resource Allocation](#resource-allocation)
6. [Real-Time Monitoring](#real-time-monitoring)
7. [Rate Limiting](#rate-limiting)

---

## Control Tower Dashboard

### Get Dashboard Overview

```yaml
GET /api/v1/control-tower/dashboard
```

Retrieve comprehensive dashboard data for control tower.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| project_ids | array | No | Filter by specific projects |
| date_from | string | No | Start date (ISO 8601) |
| date_to | string | No | End date (ISO 8601) |
| view_type | string | No | View type: `day`, `week`, `month`, `quarter` |
| include_metrics | boolean | No | Include performance metrics (default: true) |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_projects": 12,
      "active_projects": 8,
      "total_work_orders": 156,
      "active_work_orders": 89,
      "completed_today": 23,
      "overdue_tasks": 5,
      "critical_issues": 2,
      "workforce_utilization": 87.5,
      "budget_variance": -2.3,
      "schedule_variance": 1.5
    },
    "project_health": [
      {
        "project_id": "proj_456",
        "project_name": "Downtown Office Complex",
        "status": "on_track",
        "health_score": 92,
        "completion_percentage": 67.5,
        "budget_status": {
          "planned": 5000000,
          "actual": 3375000,
          "variance_percentage": 0.0,
          "forecast": 5000000
        },
        "schedule_status": {
          "planned_completion": "2025-12-31",
          "forecast_completion": "2025-12-28",
          "days_variance": -3,
          "critical_path_health": "good"
        },
        "resource_status": {
          "total_assigned": 45,
          "active_today": 38,
          "utilization_percentage": 84.4,
          "shortage_alerts": 0
        },
        "risk_indicators": {
          "high_risk_count": 0,
          "medium_risk_count": 3,
          "low_risk_count": 8,
          "trend": "improving"
        }
      }
    ],
    "workforce_status": {
      "total_workers": 234,
      "active_now": 187,
      "on_break": 12,
      "checked_out": 35,
      "by_trade": [
        {
          "trade": "electrician",
          "total": 45,
          "active": 38,
          "utilization": 84.4
        },
        {
          "trade": "plumber",
          "total": 32,
          "active": 28,
          "utilization": 87.5
        },
        {
          "trade": "hvac",
          "total": 28,
          "active": 24,
          "utilization": 85.7
        }
      ],
      "availability_forecast": {
        "today": 234,
        "tomorrow": 240,
        "next_week_avg": 235
      }
    },
    "critical_alerts": [
      {
        "alert_id": "alert_001",
        "type": "schedule_delay",
        "severity": "high",
        "project_id": "proj_457",
        "title": "Critical Path Delay - Foundation Work",
        "description": "Foundation work delayed by 2 days due to weather",
        "impact": "May delay subsequent electrical rough-in",
        "recommended_action": "Allocate additional resources to foundation crew",
        "created_at": "2025-11-14T08:30:00Z",
        "requires_action": true
      },
      {
        "alert_id": "alert_002",
        "type": "safety_incident",
        "severity": "high",
        "project_id": "proj_456",
        "title": "Safety Incident Reported",
        "description": "Minor injury on Floor 3 - medical attention provided",
        "impact": "OSHA reporting required within 24 hours",
        "recommended_action": "Complete incident report and notify safety officer",
        "created_at": "2025-11-14T10:15:00Z",
        "requires_action": true
      }
    ],
    "daily_metrics": {
      "productivity_index": 94.2,
      "safety_score": 98.5,
      "quality_score": 96.8,
      "schedule_performance_index": 1.02,
      "cost_performance_index": 1.01
    },
    "weather_impact": {
      "current_conditions": "partly_cloudy",
      "temperature_f": 68,
      "affected_projects": 0,
      "forecast_alerts": []
    },
    "updated_at": "2025-11-14T14:30:00Z"
  }
}
```

---

### Get Project Details

```yaml
GET /api/v1/control-tower/projects/{project_id}
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| project_id | string | Yes | Unique project identifier |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| include_gantt | boolean | No | Include Gantt chart data |
| include_resources | boolean | No | Include resource allocation |
| include_costs | boolean | No | Include cost breakdown |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "project_id": "proj_456",
    "project_name": "Downtown Office Complex",
    "project_code": "DOC-2025-001",
    "status": "in_progress",
    "phase": "construction",
    "health_score": 92,
    "start_date": "2025-06-01",
    "planned_completion": "2025-12-31",
    "forecast_completion": "2025-12-28",
    "completion_percentage": 67.5,
    "location": {
      "site_id": "site_001",
      "address": {
        "street": "123 Main Street",
        "city": "New York",
        "state": "NY",
        "postal_code": "10001"
      },
      "coordinates": {
        "latitude": 40.7128,
        "longitude": -74.0060
      }
    },
    "stakeholders": {
      "project_manager": {
        "user_id": "user_301",
        "name": "Michael Chen",
        "email": "mchen@example.com",
        "phone": "+1-555-0101"
      },
      "superintendent": {
        "user_id": "user_302",
        "name": "Sarah Williams",
        "email": "swilliams@example.com",
        "phone": "+1-555-0102"
      },
      "client_contact": {
        "name": "David Johnson",
        "company": "ABC Corporation",
        "email": "djohnson@abc.com",
        "phone": "+1-555-0103"
      }
    },
    "budget": {
      "total_budget": 5000000,
      "committed_costs": 3375000,
      "actual_costs": 3350000,
      "remaining_budget": 1650000,
      "variance": 25000,
      "variance_percentage": 0.74,
      "forecast_at_completion": 5000000,
      "cost_performance_index": 1.007,
      "by_category": [
        {
          "category": "labor",
          "budgeted": 2000000,
          "actual": 1340000,
          "variance": 660000
        },
        {
          "category": "materials",
          "budgeted": 2500000,
          "actual": 1680000,
          "variance": 820000
        },
        {
          "category": "equipment",
          "budgeted": 300000,
          "actual": 205000,
          "variance": 95000
        },
        {
          "category": "subcontractors",
          "budgeted": 200000,
          "actual": 125000,
          "variance": 75000
        }
      ]
    },
    "schedule": {
      "baseline_duration_days": 214,
      "current_duration_days": 211,
      "days_elapsed": 167,
      "days_remaining": 44,
      "schedule_performance_index": 1.014,
      "critical_path_length_days": 195,
      "float_days": 16,
      "milestones": [
        {
          "milestone_id": "ms_001",
          "name": "Foundation Complete",
          "planned_date": "2025-07-15",
          "actual_date": "2025-07-14",
          "status": "completed",
          "variance_days": -1
        },
        {
          "milestone_id": "ms_002",
          "name": "Structural Frame Complete",
          "planned_date": "2025-09-30",
          "actual_date": "2025-09-28",
          "status": "completed",
          "variance_days": -2
        },
        {
          "milestone_id": "ms_003",
          "name": "MEP Rough-In Complete",
          "planned_date": "2025-11-30",
          "forecast_date": "2025-11-28",
          "status": "in_progress",
          "variance_days": -2
        }
      ]
    },
    "work_packages": {
      "total": 45,
      "completed": 28,
      "in_progress": 12,
      "not_started": 5,
      "by_trade": [
        {
          "trade": "electrical",
          "total": 12,
          "completed": 7,
          "in_progress": 4,
          "not_started": 1
        },
        {
          "trade": "plumbing",
          "total": 10,
          "completed": 6,
          "in_progress": 3,
          "not_started": 1
        },
        {
          "trade": "hvac",
          "total": 8,
          "completed": 5,
          "in_progress": 2,
          "not_started": 1
        }
      ]
    },
    "resources": {
      "total_assigned": 45,
      "active_today": 38,
      "peak_workforce": 52,
      "average_utilization": 84.4,
      "by_trade": [
        {
          "trade": "electrician",
          "assigned": 12,
          "active": 10,
          "required_peak": 15
        },
        {
          "trade": "plumber",
          "assigned": 8,
          "active": 7,
          "required_peak": 10
        }
      ]
    },
    "quality_metrics": {
      "defects_total": 23,
      "defects_open": 5,
      "defects_closed": 18,
      "rework_percentage": 2.3,
      "inspection_pass_rate": 96.8,
      "quality_score": 96.8
    },
    "safety_metrics": {
      "incident_free_days": 167,
      "total_incidents": 2,
      "lost_time_incidents": 0,
      "near_misses": 8,
      "safety_score": 98.5,
      "last_safety_audit": "2025-11-01",
      "next_safety_audit": "2025-12-01"
    },
    "risks": [
      {
        "risk_id": "risk_001",
        "category": "schedule",
        "severity": "medium",
        "probability": "medium",
        "description": "Weather delays may impact exterior work",
        "impact": "Potential 2-3 day schedule slip",
        "mitigation": "Weather contingency plan in place",
        "owner": "user_302"
      }
    ],
    "updated_at": "2025-11-14T14:30:00Z"
  }
}
```

---

## Task Management

### Get Tasks

```yaml
GET /api/v1/control-tower/tasks
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| project_id | string | No | Filter by project |
| status | string | No | Filter by status |
| assigned_to | string | No | Filter by assignee |
| priority | string | No | Filter by priority: `low`, `medium`, `high`, `critical` |
| due_date_from | string | No | Start date for due date filter |
| due_date_to | string | No | End date for due date filter |
| view | string | No | View type: `list`, `board`, `timeline` |
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Items per page (default: 50, max: 200) |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "task_id": "task_001",
        "project_id": "proj_456",
        "work_package_id": "wp_012",
        "title": "Install electrical panel - Building A, Floor 3",
        "description": "Install main 200A electrical distribution panel",
        "status": "in_progress",
        "priority": "high",
        "assigned_to": {
          "user_id": "user_101",
          "name": "John Smith",
          "trade": "electrician",
          "current_location": {
            "latitude": 40.7128,
            "longitude": -74.0060,
            "last_update": "2025-11-14T14:15:00Z"
          }
        },
        "planned_start": "2025-11-14T08:00:00Z",
        "planned_end": "2025-11-14T17:00:00Z",
        "actual_start": "2025-11-14T08:15:00Z",
        "actual_end": null,
        "estimated_hours": 8.0,
        "actual_hours": 6.25,
        "completion_percentage": 75,
        "dependencies": {
          "predecessors": [
            {
              "task_id": "task_000",
              "title": "Rough-in electrical conduit",
              "type": "finish_to_start",
              "lag_days": 0,
              "status": "completed"
            }
          ],
          "successors": [
            {
              "task_id": "task_002",
              "title": "Connect panel feeders",
              "type": "finish_to_start",
              "lag_days": 0,
              "status": "not_started"
            }
          ]
        },
        "resources": {
          "labor": [
            {
              "user_id": "user_101",
              "name": "John Smith",
              "role": "lead_electrician",
              "hours_allocated": 8.0,
              "hours_actual": 6.25
            }
          ],
          "materials": [
            {
              "material_id": "mat_001",
              "name": "200A Panel",
              "quantity_required": 1,
              "quantity_used": 1,
              "cost": 1250.00
            }
          ],
          "equipment": [
            {
              "equipment_id": "equip_005",
              "name": "Lift - Scissor 20ft",
              "hours_allocated": 4.0,
              "hours_actual": 3.0,
              "cost_per_hour": 45.00
            }
          ]
        },
        "location": {
          "building": "Building A",
          "floor": "3",
          "zone": "Zone 3A",
          "coordinates": {
            "latitude": 40.7128,
            "longitude": -74.0060
          }
        },
        "constraints": [
          {
            "type": "must_start_on",
            "date": "2025-11-14",
            "reason": "Material delivery scheduled"
          }
        ],
        "critical_path": true,
        "float_days": 0,
        "variance": {
          "schedule_variance_hours": -1.75,
          "cost_variance": -125.00
        },
        "checklist": [
          {
            "item_id": "check_001",
            "description": "Verify power shutdown",
            "completed": true,
            "completed_at": "2025-11-14T08:20:00Z"
          },
          {
            "item_id": "check_002",
            "description": "Mount panel enclosure",
            "completed": true,
            "completed_at": "2025-11-14T12:30:00Z"
          },
          {
            "item_id": "check_003",
            "description": "Install main breaker",
            "completed": false,
            "completed_at": null
          }
        ],
        "attachments": [
          {
            "attachment_id": "att_001",
            "name": "electrical_diagram.pdf",
            "type": "application/pdf",
            "url": "/api/v1/media/download/att_001"
          }
        ],
        "created_at": "2025-11-10T09:00:00Z",
        "updated_at": "2025-11-14T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total_items": 156,
      "total_pages": 4,
      "has_next": true,
      "has_previous": false
    },
    "summary": {
      "total_tasks": 156,
      "by_status": {
        "not_started": 34,
        "in_progress": 89,
        "completed": 28,
        "on_hold": 5
      },
      "by_priority": {
        "critical": 8,
        "high": 45,
        "medium": 78,
        "low": 25
      },
      "overdue_count": 5,
      "critical_path_count": 34
    }
  }
}
```

---

### Create Task

```yaml
POST /api/v1/control-tower/tasks
```

**Request Body:**

```json
{
  "project_id": "proj_456",
  "work_package_id": "wp_012",
  "title": "Install fire alarm panel",
  "description": "Install and configure fire alarm control panel",
  "assigned_to": "user_102",
  "planned_start": "2025-11-15T08:00:00Z",
  "planned_end": "2025-11-15T17:00:00Z",
  "estimated_hours": 8.0,
  "priority": "high",
  "dependencies": {
    "predecessors": [
      {
        "task_id": "task_003",
        "type": "finish_to_start",
        "lag_days": 0
      }
    ]
  },
  "resources": {
    "labor": [
      {
        "user_id": "user_102",
        "role": "electrician",
        "hours_allocated": 8.0
      }
    ],
    "materials": [
      {
        "material_id": "mat_015",
        "quantity_required": 1
      }
    ]
  },
  "location": {
    "building": "Building A",
    "floor": "2",
    "zone": "Zone 2B"
  },
  "constraints": [
    {
      "type": "must_finish_on",
      "date": "2025-11-15",
      "reason": "Fire marshal inspection scheduled"
    }
  ],
  "checklist": [
    {
      "description": "Verify wiring connections"
    },
    {
      "description": "Program alarm zones"
    },
    {
      "description": "Test all devices"
    }
  ]
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "task_id": "task_150",
    "project_id": "proj_456",
    "work_package_id": "wp_012",
    "title": "Install fire alarm panel",
    "status": "not_started",
    "priority": "high",
    "planned_start": "2025-11-15T08:00:00Z",
    "planned_end": "2025-11-15T17:00:00Z",
    "critical_path": false,
    "float_days": 3,
    "created_at": "2025-11-14T14:45:00Z",
    "created_by": "user_301"
  }
}
```

---

### Update Task

```yaml
PATCH /api/v1/control-tower/tasks/{task_id}
```

**Request Body:**

```json
{
  "status": "in_progress",
  "completion_percentage": 50,
  "actual_start": "2025-11-14T08:15:00Z",
  "notes": "Work progressing on schedule",
  "updated_by": "user_101"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "task_id": "task_001",
    "status": "in_progress",
    "completion_percentage": 50,
    "actual_start": "2025-11-14T08:15:00Z",
    "updated_at": "2025-11-14T14:50:00Z",
    "impact_analysis": {
      "critical_path_affected": false,
      "dependent_tasks_count": 3,
      "schedule_impact_days": 0,
      "cost_impact": 0.00
    }
  }
}
```

---

## Calendar Views

### Get Calendar Data

```yaml
GET /api/v1/control-tower/calendar
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| view | string | Yes | View type: `day`, `week`, `month`, `agenda` |
| date | string | Yes | Reference date (ISO 8601) |
| project_ids | array | No | Filter by projects |
| resource_ids | array | No | Filter by resources |
| event_types | array | No | Filter: `task`, `milestone`, `inspection`, `meeting` |
| include_completed | boolean | No | Include completed items (default: false) |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "view": "week",
    "start_date": "2025-11-10",
    "end_date": "2025-11-16",
    "events": [
      {
        "event_id": "evt_001",
        "type": "task",
        "reference_id": "task_001",
        "title": "Install electrical panel - Building A, Floor 3",
        "project_id": "proj_456",
        "project_name": "Downtown Office Complex",
        "start": "2025-11-14T08:00:00Z",
        "end": "2025-11-14T17:00:00Z",
        "all_day": false,
        "status": "in_progress",
        "priority": "high",
        "assigned_to": {
          "user_id": "user_101",
          "name": "John Smith",
          "avatar_url": "/api/v1/users/user_101/avatar"
        },
        "location": {
          "building": "Building A",
          "floor": "3",
          "zone": "Zone 3A"
        },
        "color": "#FF5722",
        "critical_path": true,
        "completion_percentage": 75,
        "dependencies": ["task_000"],
        "resource_conflicts": false
      },
      {
        "event_id": "evt_002",
        "type": "milestone",
        "reference_id": "ms_003",
        "title": "MEP Rough-In Complete",
        "project_id": "proj_456",
        "project_name": "Downtown Office Complex",
        "start": "2025-11-30T17:00:00Z",
        "end": "2025-11-30T17:00:00Z",
        "all_day": false,
        "status": "on_track",
        "priority": "critical",
        "color": "#4CAF50",
        "baseline_date": "2025-11-30",
        "forecast_date": "2025-11-28",
        "variance_days": -2
      },
      {
        "event_id": "evt_003",
        "type": "inspection",
        "reference_id": "insp_001",
        "title": "Fire Marshal Inspection",
        "project_id": "proj_456",
        "project_name": "Downtown Office Complex",
        "start": "2025-11-15T10:00:00Z",
        "end": "2025-11-15T12:00:00Z",
        "all_day": false,
        "status": "scheduled",
        "priority": "high",
        "inspector": {
          "name": "Fire Marshal Johnson",
          "organization": "City Fire Department"
        },
        "location": {
          "building": "Building A",
          "floor": "All Floors"
        },
        "color": "#FF9800",
        "prerequisites_completed": false,
        "required_attendees": ["user_301", "user_302"]
      },
      {
        "event_id": "evt_004",
        "type": "meeting",
        "reference_id": "meet_001",
        "title": "Weekly Progress Review",
        "project_id": "proj_456",
        "project_name": "Downtown Office Complex",
        "start": "2025-11-14T15:00:00Z",
        "end": "2025-11-14T16:00:00Z",
        "all_day": false,
        "status": "scheduled",
        "priority": "medium",
        "attendees": [
          {
            "user_id": "user_301",
            "name": "Michael Chen",
            "role": "Project Manager",
            "response": "accepted"
          },
          {
            "user_id": "user_302",
            "name": "Sarah Williams",
            "role": "Superintendent",
            "response": "accepted"
          }
        ],
        "location": {
          "type": "virtual",
          "meeting_url": "https://meet.example.com/xyz123"
        },
        "color": "#2196F3",
        "agenda_items": [
          "Review weekly progress",
          "Discuss upcoming milestones",
          "Address open issues"
        ]
      }
    ],
    "resource_utilization": [
      {
        "date": "2025-11-14",
        "total_capacity_hours": 2000,
        "allocated_hours": 1750,
        "utilization_percentage": 87.5,
        "overallocated_resources": []
      }
    ],
    "conflicts": [
      {
        "conflict_id": "conflict_001",
        "type": "resource_overallocation",
        "severity": "medium",
        "resource_id": "user_105",
        "resource_name": "Mike Davis",
        "date": "2025-11-15",
        "allocated_hours": 12,
        "capacity_hours": 8,
        "conflicting_tasks": ["task_010", "task_015"],
        "recommended_action": "Reschedule one task or assign additional resource"
      }
    ],
    "weather_alerts": [
      {
        "date": "2025-11-15",
        "alert_type": "rain",
        "severity": "moderate",
        "impact": "May affect exterior work",
        "affected_tasks": ["task_025", "task_030"]
      }
    ]
  }
}
```

---

### Get Resource Calendar

```yaml
GET /api/v1/control-tower/calendar/resources/{resource_id}
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| resource_id | string | Yes | User/resource identifier |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| date_from | string | Yes | Start date (ISO 8601) |
| date_to | string | Yes | End date (ISO 8601) |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "resource": {
      "user_id": "user_101",
      "name": "John Smith",
      "trade": "electrician",
      "certifications": ["master_electrician", "arc_flash"],
      "base_location": "New York Office"
    },
    "availability": [
      {
        "date": "2025-11-14",
        "status": "available",
        "capacity_hours": 8,
        "allocated_hours": 8,
        "utilization_percentage": 100,
        "assignments": [
          {
            "task_id": "task_001",
            "title": "Install electrical panel",
            "project_id": "proj_456",
            "start": "2025-11-14T08:00:00Z",
            "end": "2025-11-14T17:00:00Z",
            "hours": 8,
            "travel_time_hours": 0.5
          }
        ],
        "time_off": null,
        "overtime_hours": 0
      },
      {
        "date": "2025-11-15",
        "status": "available",
        "capacity_hours": 8,
        "allocated_hours": 6,
        "utilization_percentage": 75,
        "assignments": [
          {
            "task_id": "task_150",
            "title": "Install fire alarm panel",
            "project_id": "proj_456",
            "start": "2025-11-15T08:00:00Z",
            "end": "2025-11-15T15:00:00Z",
            "hours": 6,
            "travel_time_hours": 0.25
          }
        ],
        "time_off": null,
        "overtime_hours": 0
      }
    ],
    "summary": {
      "total_days": 7,
      "working_days": 5,
      "time_off_days": 0,
      "total_hours_allocated": 42,
      "average_utilization": 87.5,
      "overtime_hours": 2.5,
      "unique_projects": 3
    }
  }
}
```

---

## Gantt Chart Data

### Get Gantt Chart Data

```yaml
GET /api/v1/control-tower/gantt
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| project_id | string | Yes | Project identifier |
| view_level | string | No | Detail level: `summary`, `work_package`, `task` |
| include_baseline | boolean | No | Include baseline dates (default: true) |
| include_dependencies | boolean | No | Include task dependencies (default: true) |
| include_critical_path | boolean | No | Highlight critical path (default: true) |
| date_from | string | No | Filter start date |
| date_to | string | No | Filter end date |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "project": {
      "project_id": "proj_456",
      "project_name": "Downtown Office Complex",
      "start_date": "2025-06-01",
      "end_date": "2025-12-31",
      "baseline_start": "2025-06-01",
      "baseline_end": "2025-12-31",
      "forecast_end": "2025-12-28",
      "completion_percentage": 67.5
    },
    "tasks": [
      {
        "task_id": "wp_001",
        "name": "Foundation Work",
        "type": "work_package",
        "start_date": "2025-06-01",
        "end_date": "2025-07-14",
        "baseline_start": "2025-06-01",
        "baseline_end": "2025-07-15",
        "duration_days": 44,
        "completion_percentage": 100,
        "status": "completed",
        "critical_path": true,
        "float_days": 0,
        "parent_id": null,
        "level": 1,
        "has_children": true,
        "expanded": true,
        "assigned_to": {
          "user_id": "user_302",
          "name": "Sarah Williams"
        },
        "cost": {
          "budgeted": 450000,
          "actual": 445000,
          "variance": 5000
        }
      },
      {
        "task_id": "task_005",
        "name": "Excavation",
        "type": "task",
        "start_date": "2025-06-01",
        "end_date": "2025-06-10",
        "baseline_start": "2025-06-01",
        "baseline_end": "2025-06-10",
        "duration_days": 10,
        "completion_percentage": 100,
        "status": "completed",
        "critical_path": true,
        "float_days": 0,
        "parent_id": "wp_001",
        "level": 2,
        "has_children": false,
        "dependencies": [],
        "assigned_to": {
          "user_id": "user_105",
          "name": "Mike Davis"
        },
        "resources": {
          "labor_hours": 400,
          "equipment": ["excavator", "dump_truck"]
        },
        "constraints": []
      },
      {
        "task_id": "task_006",
        "name": "Pour Foundation",
        "type": "task",
        "start_date": "2025-06-11",
        "end_date": "2025-06-25",
        "baseline_start": "2025-06-11",
        "baseline_end": "2025-06-25",
        "duration_days": 15,
        "completion_percentage": 100,
        "status": "completed",
        "critical_path": true,
        "float_days": 0,
        "parent_id": "wp_001",
        "level": 2,
        "has_children": false,
        "dependencies": [
          {
            "predecessor_id": "task_005",
            "type": "finish_to_start",
            "lag_days": 0
          }
        ],
        "assigned_to": {
          "user_id": "user_106",
          "name": "Tom Wilson"
        }
      },
      {
        "task_id": "wp_002",
        "name": "Structural Frame",
        "type": "work_package",
        "start_date": "2025-07-15",
        "end_date": "2025-09-28",
        "baseline_start": "2025-07-15",
        "baseline_end": "2025-09-30",
        "duration_days": 76,
        "completion_percentage": 100,
        "status": "completed",
        "critical_path": true,
        "float_days": 0,
        "parent_id": null,
        "level": 1,
        "has_children": true,
        "expanded": true,
        "dependencies": [
          {
            "predecessor_id": "wp_001",
            "type": "finish_to_start",
            "lag_days": 0
          }
        ],
        "assigned_to": {
          "user_id": "user_302",
          "name": "Sarah Williams"
        }
      },
      {
        "task_id": "wp_003",
        "name": "MEP Rough-In",
        "type": "work_package",
        "start_date": "2025-09-29",
        "end_date": "2025-11-28",
        "baseline_start": "2025-09-29",
        "baseline_end": "2025-11-30",
        "duration_days": 61,
        "completion_percentage": 72,
        "status": "in_progress",
        "critical_path": true,
        "float_days": 0,
        "parent_id": null,
        "level": 1,
        "has_children": true,
        "expanded": true,
        "dependencies": [
          {
            "predecessor_id": "wp_002",
            "type": "finish_to_start",
            "lag_days": 0
          }
        ],
        "assigned_to": {
          "user_id": "user_301",
          "name": "Michael Chen"
        }
      },
      {
        "task_id": "task_001",
        "name": "Install electrical panel - Building A, Floor 3",
        "type": "task",
        "start_date": "2025-11-14",
        "end_date": "2025-11-14",
        "baseline_start": "2025-11-14",
        "baseline_end": "2025-11-14",
        "duration_days": 1,
        "completion_percentage": 75,
        "status": "in_progress",
        "critical_path": true,
        "float_days": 0,
        "parent_id": "wp_003",
        "level": 2,
        "has_children": false,
        "dependencies": [
          {
            "predecessor_id": "task_000",
            "type": "finish_to_start",
            "lag_days": 0
          }
        ],
        "assigned_to": {
          "user_id": "user_101",
          "name": "John Smith"
        },
        "progress_indicator": {
          "planned_value": 8.0,
          "earned_value": 6.0,
          "actual_cost": 6.25
        }
      }
    ],
    "milestones": [
      {
        "milestone_id": "ms_001",
        "name": "Foundation Complete",
        "date": "2025-07-14",
        "baseline_date": "2025-07-15",
        "status": "completed",
        "variance_days": -1,
        "critical_path": true,
        "level": 1
      },
      {
        "milestone_id": "ms_002",
        "name": "Structural Frame Complete",
        "date": "2025-09-28",
        "baseline_date": "2025-09-30",
        "status": "completed",
        "variance_days": -2,
        "critical_path": true,
        "level": 1
      },
      {
        "milestone_id": "ms_003",
        "name": "MEP Rough-In Complete",
        "date": "2025-11-28",
        "baseline_date": "2025-11-30",
        "status": "on_track",
        "forecast_date": "2025-11-28",
        "variance_days": -2,
        "critical_path": true,
        "level": 1
      }
    ],
    "dependencies": [
      {
        "dependency_id": "dep_001",
        "from_task_id": "task_005",
        "to_task_id": "task_006",
        "type": "finish_to_start",
        "lag_days": 0,
        "critical": true
      },
      {
        "dependency_id": "dep_002",
        "from_task_id": "wp_001",
        "to_task_id": "wp_002",
        "type": "finish_to_start",
        "lag_days": 0,
        "critical": true
      }
    ],
    "critical_path": {
      "task_ids": ["task_005", "task_006", "wp_002", "task_001"],
      "total_duration_days": 195,
      "float_days": 0
    },
    "timeline": {
      "project_start": "2025-06-01",
      "project_end": "2025-12-28",
      "baseline_end": "2025-12-31",
      "today": "2025-11-14",
      "display_range": {
        "start": "2025-06-01",
        "end": "2026-01-31"
      }
    },
    "view_settings": {
      "zoom_level": "week",
      "show_baseline": true,
      "show_critical_path": true,
      "show_float": true,
      "color_by": "status"
    }
  }
}
```

---

### Export Gantt Chart

```yaml
POST /api/v1/control-tower/gantt/export
```

Export Gantt chart data in various formats.

**Request Body:**

```json
{
  "project_id": "proj_456",
  "format": "pdf",
  "options": {
    "include_baseline": true,
    "include_critical_path": true,
    "include_resource_names": true,
    "page_size": "A3",
    "orientation": "landscape",
    "date_range": {
      "start": "2025-06-01",
      "end": "2025-12-31"
    }
  }
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "export_id": "export_001",
    "format": "pdf",
    "status": "processing",
    "download_url": null,
    "estimated_completion": "2025-11-14T15:05:00Z",
    "check_status_url": "/api/v1/control-tower/gantt/export/export_001/status"
  }
}
```

---

## Resource Allocation

### Get Resource Allocation

```yaml
GET /api/v1/control-tower/resources/allocation
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| project_ids | array | No | Filter by projects |
| resource_ids | array | No | Filter by resources |
| date_from | string | Yes | Start date (ISO 8601) |
| date_to | string | Yes | End date (ISO 8601) |
| trade | string | No | Filter by trade |
| view | string | No | View: `timeline`, `heatmap`, `utilization` |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "resources": [
      {
        "user_id": "user_101",
        "name": "John Smith",
        "trade": "electrician",
        "capacity_hours_per_day": 8,
        "allocation": [
          {
            "date": "2025-11-14",
            "allocated_hours": 8,
            "utilization_percentage": 100,
            "assignments": [
              {
                "task_id": "task_001",
                "project_id": "proj_456",
                "hours": 8,
                "project_name": "Downtown Office Complex"
              }
            ],
            "overtime_hours": 0,
            "availability_status": "allocated"
          },
          {
            "date": "2025-11-15",
            "allocated_hours": 6,
            "utilization_percentage": 75,
            "assignments": [
              {
                "task_id": "task_150",
                "project_id": "proj_456",
                "hours": 6,
                "project_name": "Downtown Office Complex"
              }
            ],
            "overtime_hours": 0,
            "availability_status": "available"
          }
        ],
        "summary": {
          "total_allocated_hours": 40,
          "total_capacity_hours": 40,
          "average_utilization": 87.5,
          "overallocated_days": 0,
          "available_hours": 5
        }
      }
    ],
    "summary": {
      "total_resources": 234,
      "total_capacity_hours": 9360,
      "total_allocated_hours": 8190,
      "average_utilization": 87.5,
      "overallocated_resources": 3,
      "underutilized_resources": 12,
      "by_trade": [
        {
          "trade": "electrician",
          "count": 45,
          "utilization": 84.4
        },
        {
          "trade": "plumber",
          "count": 32,
          "utilization": 87.5
        }
      ]
    },
    "heatmap": [
      {
        "date": "2025-11-14",
        "utilization_percentage": 87.5,
        "heat_level": "high",
        "resource_count": 234,
        "allocated_count": 187
      }
    ]
  }
}
```

---

## Real-Time Monitoring

### WebSocket Connection

```yaml
WSS /api/v1/control-tower/ws
```

**Connection URL:**

```
wss://api.fsm.example.com/api/v1/control-tower/ws?token={jwt_token}&view={view_type}
```

**Subscribe to Channels:**

```json
{
  "type": "subscribe",
  "channels": [
    "project.proj_456",
    "tasks.all",
    "alerts.critical",
    "workforce.status"
  ]
}
```

---

### WebSocket Events

#### Task Status Updated

```json
{
  "type": "task.status_updated",
  "timestamp": "2025-11-14T15:30:00Z",
  "data": {
    "task_id": "task_001",
    "project_id": "proj_456",
    "old_status": "in_progress",
    "new_status": "completed",
    "completion_percentage": 100,
    "updated_by": "user_101",
    "impact": {
      "dependent_tasks_count": 3,
      "critical_path_affected": true,
      "schedule_impact_days": 0
    }
  }
}
```

#### Critical Alert

```json
{
  "type": "alert.critical",
  "timestamp": "2025-11-14T15:35:00Z",
  "data": {
    "alert_id": "alert_003",
    "severity": "critical",
    "type": "safety_incident",
    "project_id": "proj_456",
    "title": "Safety Incident - Immediate Action Required",
    "description": "Serious injury reported on Floor 5",
    "requires_immediate_action": true,
    "notification_sent_to": ["user_301", "user_302"]
  }
}
```

#### Resource Status Changed

```json
{
  "type": "resource.status_changed",
  "timestamp": "2025-11-14T15:40:00Z",
  "data": {
    "user_id": "user_101",
    "name": "John Smith",
    "old_status": "active",
    "new_status": "checked_out",
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "current_task": "task_001",
    "hours_worked_today": 8.5
  }
}
```

---

## Rate Limiting

### Rate Limit Configuration

| Endpoint Category | Requests | Time Window | Burst Allowed |
|-------------------|----------|-------------|---------------|
| Dashboard Queries | 60 | 1 minute | 80 |
| Task Queries | 100 | 1 minute | 120 |
| Task Updates | 30 | 1 minute | 40 |
| Calendar Views | 60 | 1 minute | 80 |
| Gantt Queries | 30 | 1 minute | 40 |
| Resource Queries | 60 | 1 minute | 80 |
| Exports | 10 | 5 minutes | 15 |
| WebSocket Messages | 120 | 1 minute | 150 |

### Rate Limit Headers

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1699968000
X-RateLimit-Burst: 80
X-RateLimit-Category: dashboard_queries
```

### Best Practices

1. **WebSocket for Real-Time**: Use WebSocket instead of polling
2. **Cache Dashboard Data**: Client-side cache for 30-60 seconds
3. **Batch Updates**: Use batch endpoints when updating multiple tasks
4. **Optimize Queries**: Request only necessary data with filters
5. **Progressive Loading**: Load calendar data incrementally

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_REQUEST | 400 | Malformed request |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Data conflict (e.g., task dependency) |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| EXPORT_FAILED | 500 | Export generation failed |
| CIRCULAR_DEPENDENCY | 422 | Circular task dependency detected |

---

**Version:** 1.0.0
**Last Updated:** 2025-11-14
**API Base URL:** `https://api.fsm.example.com`
