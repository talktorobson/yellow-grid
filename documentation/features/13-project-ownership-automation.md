# Project Ownership ("Pilote du Chantier") - Automation Specification

**Document Version**: 1.0
**Last Updated**: 2025-01-16
**Owner**: Product & Engineering
**Status**: Specification
**Gap Filled**: Project Ownership Automation Logic

---

## Table of Contents

1. [Overview](#1-overview)
2. [Country-Specific Assignment Modes](#2-country-specific-assignment-modes)
3. [Workload Balancing Algorithm](#3-workload-balancing-algorithm)
4. [Auto-Assignment Logic](#4-auto-assignment-logic)
5. [Manual Assignment Workflow](#5-manual-assignment-workflow)
6. [Batch Reassignment](#6-batch-reassignment)
7. [Notification Filtering by Owner](#7-notification-filtering-by-owner)
8. [Business Rules](#8-business-rules)
9. [Data Model Updates](#9-data-model-updates)
10. [API Contracts](#10-api-contracts)

---

## 1. Overview

### 1.1 Purpose

The **Project Ownership** (French: "Pilote du Chantier") system assigns a single responsible operator to each customer project. This operator becomes the primary contact for:
- Customer communications
- Provider communications
- Task assignments and escalations
- Project-level decisions and approvals

### 1.2 Key Benefits

**For Operators**:
- Focus on their portfolio of projects
- Receive only relevant notifications
- Build customer relationships
- Clear accountability

**For Customers**:
- Single point of contact
- Faster response times
- Better service continuity

**For Platform**:
- Clear task routing
- Workload balancing
- Performance tracking per operator

### 1.3 Assignment Modes

```typescript
enum ProjectAssignmentMode {
  AUTO = 'AUTO',     // System auto-assigns based on workload
  MANUAL = 'MANUAL', // Supervisor manually assigns
}
```

**Mode Configuration**: Per-country configuration

| Country | Default Mode | Reason |
|---------|--------------|--------|
| ES (Spain) | AUTO | High volume, balanced workload needed |
| FR (France) | MANUAL | Complex projects, manual oversight preferred |
| IT (Italy) | AUTO | Standardized processes, auto-balance works well |
| PL (Poland) | MANUAL | Growing market, manual control preferred |

---

## 2. Country-Specific Assignment Modes

### 2.1 Configuration Table

```typescript
interface CountryProjectAssignmentConfig {
  countryCode: CountryCode;
  defaultMode: ProjectAssignmentMode;
  allowModeOverride: boolean; // Can operators/supervisors change mode per project?
  maxProjectsPerOperator: number;
  workloadBalancingEnabled: boolean;
}

const PROJECT_ASSIGNMENT_CONFIG: Record<CountryCode, CountryProjectAssignmentConfig> = {
  ES: {
    countryCode: 'ES',
    defaultMode: ProjectAssignmentMode.AUTO,
    allowModeOverride: true,
    maxProjectsPerOperator: 50,
    workloadBalancingEnabled: true
  },
  FR: {
    countryCode: 'FR',
    defaultMode: ProjectAssignmentMode.MANUAL,
    allowModeOverride: true,
    maxProjectsPerOperator: 30,
    workloadBalancingEnabled: false
  },
  IT: {
    countryCode: 'IT',
    defaultMode: ProjectAssignmentMode.AUTO,
    allowModeOverride: true,
    maxProjectsPerOperator: 50,
    workloadBalancingEnabled: true
  },
  PL: {
    countryCode: 'PL',
    defaultMode: ProjectAssignmentMode.MANUAL,
    allowModeOverride: true,
    maxProjectsPerOperator: 25,
    workloadBalancingEnabled: false
  }
};
```

---

## 3. Workload Balancing Algorithm

### 3.1 Workload Calculation

**Workload Metric**: Total estimated hours across all active projects

```typescript
interface OperatorWorkload {
  operatorId: string;
  activeProjectCount: number;
  totalWorkloadHours: number; // Sum of SO estimated durations
  averageProjectHours: number;
  utilizationPercentage: number; // totalWorkloadHours / availableHours
}

class WorkloadCalculator {
  async calculateOperatorWorkload(
    operatorId: string,
    countryCode: CountryCode
  ): Promise<OperatorWorkload> {
    // Get all active projects for operator
    const projects = await projectRepo.find({
      responsibleOperatorId: operatorId,
      status: { $in: ['Planning', 'Scheduled', 'InProgress'] }
    });

    // For each project, sum SO estimated durations
    let totalWorkloadHours = 0;
    for (const project of projects) {
      const serviceOrders = await serviceOrderRepo.findByProject(project.id);
      const projectHours = serviceOrders.reduce(
        (sum, so) => sum + so.estimatedDuration.hours,
        0
      );
      totalWorkloadHours += projectHours;
    }

    // Get operator working hours capacity
    const operator = await operatorRepo.findById(operatorId);
    const availableHours = this.calculateAvailableHours(operator, countryCode);

    return {
      operatorId,
      activeProjectCount: projects.length,
      totalWorkloadHours,
      averageProjectHours: totalWorkloadHours / (projects.length || 1),
      utilizationPercentage: (totalWorkloadHours / availableHours) * 100
    };
  }

  private calculateAvailableHours(
    operator: Operator,
    countryCode: CountryCode
  ): number {
    // Standard working hours per week (country-specific)
    const WEEKLY_HOURS: Record<CountryCode, number> = {
      ES: 40,
      FR: 35,
      IT: 40,
      PL: 40
    };

    // Calculate for next 4 weeks
    const weeksAhead = 4;
    return WEEKLY_HOURS[countryCode] * weeksAhead;
  }
}
```

### 3.2 Balancing Strategy

**Goal**: Distribute projects evenly by minimizing variance in operator workload

```typescript
class ProjectAssignmentBalancer {
  async findBestOperatorForAssignment(
    countryCode: CountryCode,
    estimatedProjectHours: number
  ): Promise<string | null> {
    // Get all eligible operators for this country
    const operators = await operatorRepo.findByCountry(countryCode, {
      status: 'ACTIVE',
      hasProjectOwnerPermission: true
    });

    if (operators.length === 0) {
      return null; // No eligible operators
    }

    // Calculate current workload for each operator
    const workloads = await Promise.all(
      operators.map(op => this.workloadCalculator.calculateOperatorWorkload(op.id, countryCode))
    );

    // Filter out operators who are at max capacity
    const config = PROJECT_ASSIGNMENT_CONFIG[countryCode];
    const availableOperators = workloads.filter(w =>
      w.activeProjectCount < config.maxProjectsPerOperator &&
      w.utilizationPercentage < 90 // Don't assign if >90% utilized
    );

    if (availableOperators.length === 0) {
      return null; // All operators at capacity
    }

    // Find operator with lowest workload
    const leastBusy = availableOperators.sort((a, b) =>
      a.totalWorkloadHours - b.totalWorkloadHours
    )[0];

    return leastBusy.operatorId;
  }
}
```

---

## 4. Auto-Assignment Logic

### 4.1 Trigger: Project Creation

```typescript
// Event: projects.project.created
eventBus.subscribe('projects.project.created', async (event) => {
  const project = await projectRepo.findById(event.projectId);
  const country = project.countryCode;
  const config = PROJECT_ASSIGNMENT_CONFIG[country];

  // Check if auto-assignment enabled for this country
  if (config.defaultMode !== ProjectAssignmentMode.AUTO) {
    return; // Skip auto-assignment for MANUAL countries
  }

  // Calculate estimated project hours
  const serviceOrders = await serviceOrderRepo.findByProject(project.id);
  const estimatedProjectHours = serviceOrders.reduce(
    (sum, so) => sum + so.estimatedDuration.hours,
    0
  );

  // Find best operator
  const balancer = new ProjectAssignmentBalancer();
  const assignedOperatorId = await balancer.findBestOperatorForAssignment(
    country,
    estimatedProjectHours
  );

  if (assignedOperatorId) {
    // Assign operator to project
    await project.assignResponsibleOperator(
      assignedOperatorId,
      'SYSTEM',
      ProjectAssignmentMode.AUTO
    );

    await projectRepo.save(project);

    // Send notification to operator
    await notificationService.send({
      recipientId: assignedOperatorId,
      type: 'PROJECT_ASSIGNED',
      priority: 'MEDIUM',
      title: `New Project Assigned: ${project.name}`,
      message: `You have been assigned as responsible operator for project ${project.name} (${serviceOrders.length} service orders)`,
      actionUrl: `/projects/${project.id}`
    });

    // Emit event
    await eventBus.publish({
      event: 'projects.operator.assigned',
      projectId: project.id,
      operatorId: assignedOperatorId,
      assignmentMode: 'AUTO',
      workloadHours: estimatedProjectHours
    });
  } else {
    // No operators available → Create task for supervisor
    await taskService.createTask({
      type: 'PROJECT_ASSIGNMENT_REQUIRED',
      projectId: project.id,
      priority: 'HIGH',
      assignedToRole: 'PROJECT_SUPERVISOR',
      title: 'Manual Project Assignment Required',
      description: `No operators available for auto-assignment. Project ${project.name} requires manual operator assignment.`,
      context: {
        projectId: project.id,
        estimatedHours: estimatedProjectHours,
        serviceOrderCount: serviceOrders.length
      }
    });
  }
});
```

### 4.2 Project Entity Methods

```typescript
// ADD to domain/03-project-service-order-domain.md
class Project extends AggregateRoot<ProjectId> {
  // ... existing fields ...

  assignResponsibleOperator(
    operatorId: string,
    assignedBy: string, // 'SYSTEM' or user ID
    mode: ProjectAssignmentMode
  ): Result<void> {
    // Cannot reassign if project is completed/cancelled
    if (this._status === ProjectStatus.Completed || this._status === ProjectStatus.Cancelled) {
      return Result.fail(`Cannot assign operator to ${this._status} project`);
    }

    const previousOperatorId = this._responsibleOperatorId;
    this._responsibleOperatorId = operatorId;
    this._assignmentMode = mode;
    this._assignedAt = DateTime.now();
    this._assignedBy = assignedBy;

    this.addDomainEvent(
      new ProjectOperatorAssigned(
        this._id,
        operatorId,
        mode,
        assignedBy,
        previousOperatorId
      )
    );

    return Result.ok();
  }

  calculateWorkloadHours(serviceOrders: ServiceOrder[]): number {
    return serviceOrders.reduce((sum, so) => sum + so.estimatedDuration.hours, 0);
  }

  reassignOperator(
    newOperatorId: string,
    reassignedBy: string,
    reason: string
  ): Result<void> {
    if (!this._responsibleOperatorId) {
      return Result.fail('No operator currently assigned');
    }

    const previousOperatorId = this._responsibleOperatorId;
    return this.assignResponsibleOperator(newOperatorId, reassignedBy, this._assignmentMode);
  }
}
```

---

## 5. Manual Assignment Workflow

### 5.1 Supervisor Assignment UI

```typescript
// API: POST /api/v1/projects/{projectId}/assign-operator
interface AssignOperatorRequest {
  operatorId: string;
  assignmentMode: ProjectAssignmentMode;
  notes?: string;
}

class ProjectController {
  async assignOperator(req: Request, res: Response): Promise<void> {
    const { projectId } = req.params;
    const { operatorId, assignmentMode, notes } = req.body;
    const assignedBy = req.user.id;

    const project = await projectRepo.findById(projectId);

    const result = project.assignResponsibleOperator(
      operatorId,
      assignedBy,
      assignmentMode
    );

    if (result.isFailure) {
      return res.status(400).json({ error: result.error });
    }

    await projectRepo.save(project);

    // Send notification to newly assigned operator
    await notificationService.send({
      recipientId: operatorId,
      type: 'PROJECT_ASSIGNED',
      priority: 'MEDIUM',
      title: `Project Assigned: ${project.name}`,
      message: notes || `You have been assigned to project ${project.name}`,
      actionUrl: `/projects/${projectId}`
    });

    res.json({ success: true, projectId, operatorId });
  }
}
```

---

## 6. Batch Reassignment

### 6.1 Use Case

**Scenario**: Operator goes on long leave, need to reassign all their projects

### 6.2 Batch Reassignment API

```typescript
// API: POST /api/v1/projects/batch-reassign
interface BatchReassignRequest {
  fromOperatorId: string;
  toOperatorId?: string; // If null, auto-distribute
  filterCriteria?: {
    status?: ProjectStatus[];
    countryCode?: CountryCode;
    createdAfter?: Date;
  };
  reason: string;
}

interface BatchReassignResponse {
  totalProjects: number;
  reassignedCount: number;
  failedCount: number;
  assignments: {
    projectId: string;
    newOperatorId: string;
    success: boolean;
    error?: string;
  }[];
}

class ProjectBatchService {
  async batchReassignProjects(
    request: BatchReassignRequest,
    reassignedBy: string
  ): Promise<BatchReassignResponse> {
    // Find projects to reassign
    const query: any = {
      responsibleOperatorId: request.fromOperatorId,
      status: { $in: request.filterCriteria?.status || ['Planning', 'Scheduled', 'InProgress'] }
    };

    if (request.filterCriteria?.countryCode) {
      query.countryCode = request.filterCriteria.countryCode;
    }

    const projects = await projectRepo.find(query);

    const assignments = [];
    let reassignedCount = 0;
    let failedCount = 0;

    for (const project of projects) {
      try {
        let newOperatorId: string;

        if (request.toOperatorId) {
          // Assign all to specific operator
          newOperatorId = request.toOperatorId;
        } else {
          // Auto-distribute using workload balancing
          const serviceOrders = await serviceOrderRepo.findByProject(project.id);
          const estimatedHours = project.calculateWorkloadHours(serviceOrders);

          const balancer = new ProjectAssignmentBalancer();
          newOperatorId = await balancer.findBestOperatorForAssignment(
            project.countryCode,
            estimatedHours
          );

          if (!newOperatorId) {
            throw new Error('No available operators for assignment');
          }
        }

        // Reassign
        const result = project.reassignOperator(
          newOperatorId,
          reassignedBy,
          request.reason
        );

        if (result.isFailure) {
          throw new Error(result.error);
        }

        await projectRepo.save(project);

        // Send notification
        await notificationService.send({
          recipientId: newOperatorId,
          type: 'PROJECT_ASSIGNED',
          priority: 'MEDIUM',
          title: `Project Assigned: ${project.name}`,
          message: `Project reassigned from ${request.fromOperatorId}. Reason: ${request.reason}`,
          actionUrl: `/projects/${project.id}`
        });

        assignments.push({
          projectId: project.id,
          newOperatorId,
          success: true
        });

        reassignedCount++;
      } catch (error) {
        assignments.push({
          projectId: project.id,
          newOperatorId: null,
          success: false,
          error: error.message
        });
        failedCount++;
      }
    }

    return {
      totalProjects: projects.length,
      reassignedCount,
      failedCount,
      assignments
    };
  }
}
```

---

## 7. Notification Filtering by Owner

### 7.1 Principle

**Rule**: Operators receive notifications ONLY for projects they own

**Exceptions**:
- System-wide announcements
- Direct @mentions from other users
- Role-based notifications (e.g., all supervisors)

### 7.2 Notification Routing Logic

```typescript
class NotificationRouter {
  async shouldSendToOperator(
    notification: Notification,
    operatorId: string
  ): Promise<boolean> {
    // System-wide notifications → send to all
    if (notification.scope === 'ALL_OPERATORS') {
      return true;
    }

    // Direct mentions → send
    if (notification.mentionedUserIds?.includes(operatorId)) {
      return true;
    }

    // Role-based → check if operator has role
    if (notification.targetRole) {
      const operator = await operatorRepo.findById(operatorId);
      return operator.roles.includes(notification.targetRole);
    }

    // Project-related → check if operator is project owner
    if (notification.projectId) {
      const project = await projectRepo.findById(notification.projectId);
      return project.responsibleOperatorId === operatorId;
    }

    // Service order-related → check if operator owns the project
    if (notification.serviceOrderId) {
      const so = await serviceOrderRepo.findById(notification.serviceOrderId);
      if (so.projectId) {
        const project = await projectRepo.findById(so.projectId);
        return project.responsibleOperatorId === operatorId;
      }
    }

    // Task-related → check if task is assigned to operator
    if (notification.taskId) {
      const task = await taskRepo.findById(notification.taskId);
      return task.assignedTo === operatorId;
    }

    // Default: don't send
    return false;
  }
}
```

### 7.3 Example Scenarios

| Event | Project Owner | Other Operator | Reasoning |
|-------|--------------|---------------|-----------|
| Service order created in Project A | ✅ Receives | ❌ Does not receive | Only project owner notified |
| Customer message on Project A | ✅ Receives | ❌ Does not receive | Communication goes to owner |
| Provider accepts job in Project A | ✅ Receives | ❌ Does not receive | Assignment updates to owner |
| System-wide maintenance alert | ✅ Receives | ✅ Receives | All operators notified |
| Task assigned to Operator B | ❌ Does not receive | ✅ Receives (if Operator B) | Task assignee notified |

---

## 8. Business Rules

### 8.1 Assignment Constraints

1. **One Owner Per Project**: Each project has exactly one responsible operator (0..1 before assignment, 1 after)
2. **Capacity Limits**: Operators cannot exceed max projects per country config
3. **Active Operators Only**: Only ACTIVE status operators can be assigned
4. **Permission Check**: Operator must have `PROJECT_OWNER` permission
5. **Country Match**: Operator must be authorized for the project's country

### 8.2 Reassignment Rules

1. **In-Progress Projects**: Allowed, but requires justification
2. **Completed Projects**: Not allowed
3. **Notification**: Previous owner receives notification of reassignment
4. **Handover**: Previous owner's open tasks auto-reassigned to new owner

### 8.3 Workload Rebalancing

```typescript
// Cron job: Every Monday at 00:00
cron.schedule('0 0 * * 1', async () => {
  const countries = ['ES', 'IT']; // AUTO mode countries only

  for (const country of countries) {
    const config = PROJECT_ASSIGNMENT_CONFIG[country];
    if (!config.workloadBalancingEnabled) continue;

    // Get all operators in country
    const operators = await operatorRepo.findByCountry(country, { status: 'ACTIVE' });

    // Calculate workload variance
    const workloads = await Promise.all(
      operators.map(op => workloadCalculator.calculateOperatorWorkload(op.id, country))
    );

    const avgWorkload = workloads.reduce((sum, w) => sum + w.totalWorkloadHours, 0) / workloads.length;
    const variance = workloads.reduce(
      (sum, w) => sum + Math.pow(w.totalWorkloadHours - avgWorkload, 2),
      0
    ) / workloads.length;

    // If variance is high, suggest rebalancing
    if (variance > 100) { // Threshold: 100 hours² variance
      await taskService.createTask({
        type: 'WORKLOAD_REBALANCING_SUGGESTED',
        priority: 'LOW',
        assignedToRole: 'PROJECT_SUPERVISOR',
        title: `Workload Rebalancing Suggested for ${country}`,
        description: `Operator workload variance is high (${Math.sqrt(variance).toFixed(1)} hours std dev). Consider manual reassignment.`,
        context: { country, workloads, variance }
      });
    }
  }
});
```

---

## 9. Data Model Updates

### 9.1 Project Entity Additions

```typescript
// ENHANCE: documentation/domain/03-project-service-order-domain.md
interface Project {
  // ... existing fields ...

  // Project Ownership (v2.0)
  responsibleOperatorId?: string;
  assignmentMode: ProjectAssignmentMode; // 'AUTO' | 'MANUAL'
  assignedAt?: DateTime;
  assignedBy?: string; // 'SYSTEM' or user ID
  workloadHours?: number; // Cached calculation of total SO hours
  lastWorkloadCalculatedAt?: DateTime;
}

enum ProjectAssignmentMode {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}
```

### 9.2 Operator Entity Additions

```typescript
// ENHANCE: documentation/domain/02-provider-capacity-domain.md (if Operator domain exists)
interface Operator {
  // ... existing fields ...

  // Workload tracking
  activeProjectCount: number;
  totalWorkloadHours: number;
  maxProjectCapacity: number; // Per-country config
  utilizationPercentage: number;
  lastWorkloadUpdatedAt: DateTime;
}
```

### 9.3 Database Schema

```sql
-- ENHANCE: documentation/infrastructure/02-database-design.md

-- Add columns to projects table
ALTER TABLE app.projects
ADD COLUMN responsible_operator_id UUID REFERENCES auth.users(id),
ADD COLUMN assignment_mode VARCHAR(20) DEFAULT 'MANUAL' CHECK (assignment_mode IN ('AUTO', 'MANUAL')),
ADD COLUMN assigned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN assigned_by VARCHAR(255), -- 'SYSTEM' or user ID
ADD COLUMN workload_hours DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN last_workload_calculated_at TIMESTAMP WITH TIME ZONE;

-- Add index for fast filtering by responsible operator
CREATE INDEX idx_projects_responsible_operator ON app.projects(responsible_operator_id) WHERE responsible_operator_id IS NOT NULL;

-- Add index for assignment mode queries
CREATE INDEX idx_projects_assignment_mode ON app.projects(assignment_mode, country_code);
```

---

## 10. API Contracts

### 10.1 Assign Operator to Project

**POST** `/api/v1/projects/{projectId}/assign-operator`

**Request**:
```json
{
  "operatorId": "usr_abc123",
  "assignmentMode": "MANUAL",
  "notes": "Operator has experience with kitchen installations"
}
```

**Response**:
```json
{
  "projectId": "proj_456",
  "responsibleOperatorId": "usr_abc123",
  "assignmentMode": "MANUAL",
  "assignedAt": "2025-01-16T15:00:00Z",
  "assignedBy": "usr_supervisor_789"
}
```

---

### 10.2 Get Operator Workload

**GET** `/api/v1/operators/{operatorId}/workload?countryCode=ES`

**Response**:
```json
{
  "operatorId": "usr_abc123",
  "countryCode": "ES",
  "activeProjectCount": 12,
  "totalWorkloadHours": 240,
  "averageProjectHours": 20,
  "utilizationPercentage": 75,
  "maxProjectCapacity": 50,
  "availableCapacity": 38,
  "calculatedAt": "2025-01-16T15:00:00Z"
}
```

---

### 10.3 Batch Reassign Projects

**POST** `/api/v1/projects/batch-reassign`

**Request**:
```json
{
  "fromOperatorId": "usr_abc123",
  "toOperatorId": null,
  "filterCriteria": {
    "status": ["Planning", "Scheduled", "InProgress"],
    "countryCode": "ES"
  },
  "reason": "Operator on sick leave for 4 weeks"
}
```

**Response**:
```json
{
  "totalProjects": 12,
  "reassignedCount": 12,
  "failedCount": 0,
  "assignments": [
    {
      "projectId": "proj_1",
      "newOperatorId": "usr_def456",
      "success": true
    },
    {
      "projectId": "proj_2",
      "newOperatorId": "usr_ghi789",
      "success": true
    }
  ]
}
```

---

## Appendix A: Configuration Examples

### Spain (ES) - Auto Mode

```json
{
  "countryCode": "ES",
  "defaultMode": "AUTO",
  "allowModeOverride": true,
  "maxProjectsPerOperator": 50,
  "workloadBalancingEnabled": true,
  "rebalancingFrequency": "WEEKLY",
  "highVarianceThreshold": 100
}
```

### France (FR) - Manual Mode

```json
{
  "countryCode": "FR",
  "defaultMode": "MANUAL",
  "allowModeOverride": true,
  "maxProjectsPerOperator": 30,
  "workloadBalancingEnabled": false
}
```

---

**Document Status**: Complete
**Implementation Priority**: HIGH (critical for operator experience)
**Estimated Effort**: 2-3 weeks (backend + frontend)
**Dependencies**: Operator permission system, notification service
**Maintained By**: Product & Engineering Teams
