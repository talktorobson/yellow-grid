import { TaskType, TaskPriority, TaskStatus } from '@prisma/client';

export class Task {
  id: string;
  taskType: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  serviceOrderId: string;
  context: any;

  // Assignment
  assignedTo?: string;
  assignedBy?: string;
  assignedAt?: Date;

  // SLA Tracking
  createdAt: Date;
  slaDeadline: Date;
  slaPaused: boolean;
  slaPausedAt?: Date;
  slaPauseReason?: string;
  totalPausedMinutes: number;

  // Escalation
  escalationLevel: number;
  escalatedAt?: Date;

  // Completion
  startedAt?: Date;
  completedAt?: Date;
  completedBy?: string;
  resolutionNotes?: string;
  resolutionTime?: number;
  withinSLA?: boolean;

  // Cancellation
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;

  // Metadata
  countryCode: string;
  businessUnit: string;
  updatedAt: Date;
}
