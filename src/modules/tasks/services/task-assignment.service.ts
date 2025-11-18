import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TaskType, TaskPriority } from '@prisma/client';

interface AssignmentScore {
  operatorId: string;
  score: number;
  breakdown: {
    roleMatch: number;
    expertiseMatch: number;
    workloadScore: number;
    availabilityScore: number;
    tenantMatch: number;
  };
}

@Injectable()
export class TaskAssignmentService {
  private readonly logger = new Logger(TaskAssignmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Automatically assign task to the most suitable operator
   */
  async autoAssignTask(
    taskId: string,
    taskType: TaskType,
    countryCode: string,
  ): Promise<string | null> {
    this.logger.log(`Auto-assigning task ${taskId} of type ${taskType}`);

    // Get all eligible operators for this task type
    // For now, we'll use a simplified approach - in production, this would
    // query based on roles, permissions, and task type assignments
    const operators = await this.getEligibleOperators(taskType, countryCode);

    if (operators.length === 0) {
      this.logger.warn(`No eligible operators found for task ${taskId}`);
      return null;
    }

    // Score each operator
    const scores: AssignmentScore[] = await Promise.all(
      operators.map((op) => this.scoreOperatorForTask(op.id, taskType)),
    );

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Assign to top scorer if score is acceptable (>= 40)
    if (scores.length > 0 && scores[0].score >= 40) {
      this.logger.log(
        `Assigning task ${taskId} to operator ${scores[0].operatorId} with score ${scores[0].score}`,
      );
      return scores[0].operatorId;
    }

    this.logger.warn(
      `No suitable operator found for task ${taskId} (top score: ${scores[0]?.score || 0})`,
    );
    return null;
  }

  /**
   * Get operators eligible for this task type
   */
  private async getEligibleOperators(taskType: TaskType, countryCode: string) {
    // Simplified query - in production, this would include role/permission checks
    return this.prisma.user.findMany({
      where: {
        userType: 'INTERNAL',
        isActive: true,
        countryCode,
      },
      select: {
        id: true,
        email: true,
        countryCode: true,
        businessUnit: true,
      },
    });
  }

  /**
   * Score an operator for a task
   */
  private async scoreOperatorForTask(
    operatorId: string,
    taskType: TaskType,
  ): Promise<AssignmentScore> {
    // 1. Role Match (30 points max) - simplified for now
    const roleMatch = 30; // Assume all returned operators have required permissions

    // 2. Expertise Match (25 points max) - based on past tasks completed
    const pastTasksOfType = await this.prisma.task.count({
      where: {
        completedBy: operatorId,
        taskType,
        status: 'COMPLETED',
      },
    });
    const expertiseMatch = Math.min(25, pastTasksOfType * 5);

    // 3. Workload Score (25 points max) - fewer current tasks = higher score
    const currentTasks = await this.prisma.task.count({
      where: {
        assignedTo: operatorId,
        status: {
          in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'],
        },
      },
    });
    const workloadScore = Math.max(0, 25 - currentTasks * 5);

    // 4. Availability Score (10 points max) - simplified
    const availabilityScore = 10; // Assume available for now

    // 5. Tenant Match (10 points max) - already filtered by country
    const tenantMatch = 10;

    const totalScore =
      roleMatch + expertiseMatch + workloadScore + availabilityScore + tenantMatch;

    return {
      operatorId,
      score: totalScore,
      breakdown: {
        roleMatch,
        expertiseMatch,
        workloadScore,
        availabilityScore,
        tenantMatch,
      },
    };
  }
}
