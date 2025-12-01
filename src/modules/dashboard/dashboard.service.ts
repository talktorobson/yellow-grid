import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ServiceOrderState, AssignmentState, TaskStatus } from '@prisma/client';
import { DateTime } from 'luxon';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      totalOrders,
      pendingOrders,
      ordersByStatus,
      totalAssignments,
      pendingAssignments,
      acceptedAssignments,
      totalProviders,
      activeProviders,
      totalTasks,
      pendingTasks,
      overdueTasks,
    ] = await Promise.all([
      // Service Orders
      this.prisma.serviceOrder.count(),
      this.prisma.serviceOrder.count({
        where: { state: { in: [ServiceOrderState.CREATED, ServiceOrderState.SCHEDULED] } },
      }),
      this.prisma.serviceOrder.groupBy({
        by: ['state'],
        _count: true,
      }),

      // Assignments
      this.prisma.assignment.count(),
      this.prisma.assignment.count({
        where: { state: AssignmentState.OFFERED },
      }),
      this.prisma.assignment.count({
        where: { state: AssignmentState.ACCEPTED },
      }),

      // Providers
      this.prisma.provider.count(),
      this.prisma.provider.count({
        where: { status: 'ACTIVE' },
      }),

      // Tasks
      this.prisma.task.count(),
      this.prisma.task.count({
        where: { status: { not: TaskStatus.COMPLETED } },
      }),
      this.prisma.task.count({
        where: {
          status: { not: TaskStatus.COMPLETED },
          slaDeadline: { lt: new Date() },
        },
      }),
    ]);

    const statusMap = ordersByStatus.reduce((acc, curr) => {
      acc[curr.state] = curr._count;
      return acc;
    }, {} as Record<string, number>);

    return {
      serviceOrders: {
        total: totalOrders,
        pending: pendingOrders,
        byStatus: {
          CREATED: statusMap[ServiceOrderState.CREATED] || 0,
          SCHEDULED: statusMap[ServiceOrderState.SCHEDULED] || 0,
          ASSIGNED: statusMap[ServiceOrderState.ASSIGNED] || 0,
          IN_PROGRESS: statusMap[ServiceOrderState.IN_PROGRESS] || 0,
          COMPLETED: statusMap[ServiceOrderState.COMPLETED] || 0,
        },
      },
      assignments: {
        total: totalAssignments,
        pending: pendingAssignments,
        accepted: acceptedAssignments,
      },
      providers: {
        total: totalProviders,
        active: activeProviders,
      },
      tasks: {
        total: totalTasks,
        pending: pendingTasks,
        overdue: overdueTasks,
      },
    };
  }

  async getAnalytics(range: string) {
    let days = 30;
    if (range === '7d') {
      days = 7;
    } else if (range === '90d') {
      days = 90;
    }
    
    const startDate = DateTime.now().minus({ days }).startOf('day').toJSDate();
    const previousStartDate = DateTime.now().minus({ days: days * 2 }).startOf('day').toJSDate();

    // Helper to calculate percentage change
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    const getTrend = (change: number) => {
      if (change > 0) return 'up';
      if (change < 0) return 'down';
      return 'stable';
    };

    // 1. Service Orders Analytics
    const [currentOrders, previousOrders] = await Promise.all([
      this.prisma.serviceOrder.count({ where: { createdAt: { gte: startDate } } }),
      this.prisma.serviceOrder.count({
        where: { createdAt: { gte: previousStartDate, lt: startDate } },
      }),
    ]);

    const [currentCompleted, previousCompleted] = await Promise.all([
      this.prisma.serviceOrder.count({
        where: { state: ServiceOrderState.COMPLETED, updatedAt: { gte: startDate } },
      }),
      this.prisma.serviceOrder.count({
        where: { state: ServiceOrderState.COMPLETED, updatedAt: { gte: previousStartDate, lt: startDate } },
      }),
    ]);

    // Avg Completion Time (Mock calculation for now as it requires complex aggregation)
    // In a real implementation, we would query the difference between created and completed dates
    const avgCompletionTime = { value: 4.2, change: -5.2, trend: 'down' };

    // Success Rate (Completed / (Completed + Cancelled))
    // Simplified: Completed / Total Created in period
    const successRateValue = currentOrders > 0 ? (currentCompleted / currentOrders) * 100 : 0;
    const prevSuccessRateValue = previousOrders > 0 ? (previousCompleted / previousOrders) * 100 : 0;
    const successRateChange = calculateChange(successRateValue, prevSuccessRateValue);

    // 2. Assignments Analytics
    const [currentAssignments, previousAssignments] = await Promise.all([
      this.prisma.assignment.count({ where: { createdAt: { gte: startDate } } }),
      this.prisma.assignment.count({
        where: { createdAt: { gte: previousStartDate, lt: startDate } },
      }),
    ]);

    const [currentAccepted, previousAccepted] = await Promise.all([
      this.prisma.assignment.count({
        where: { state: AssignmentState.ACCEPTED, createdAt: { gte: startDate } },
      }),
      this.prisma.assignment.count({
        where: { state: AssignmentState.ACCEPTED, createdAt: { gte: previousStartDate, lt: startDate } },
      }),
    ]);

    const acceptanceRateValue =
      currentAssignments > 0 ? (currentAccepted / currentAssignments) * 100 : 0;
    const prevAcceptanceRateValue =
      previousAssignments > 0 ? (previousAccepted / previousAssignments) * 100 : 0;
    const acceptanceRateChange = calculateChange(acceptanceRateValue, prevAcceptanceRateValue);

    // 3. Providers Analytics
    const totalProviders = await this.prisma.provider.count();
    const activeProviders = await this.prisma.provider.count({ where: { status: 'ACTIVE' } });
    const activeRateValue = totalProviders > 0 ? (activeProviders / totalProviders) * 100 : 0;

    // 4. Trends (Daily counts for the period)
    // This is a simplified version. For production, use raw SQL date_trunc or similar.
    const labels: string[] = [];
    const serviceOrdersTrend: number[] = [];
    const completionsTrend: number[] = [];
    const assignmentsTrend: number[] = [];

    // Generate last 7-10 data points for the chart
    const trendPoints = Math.min(days, 14); // Max 14 points to keep chart readable
    const interval = Math.ceil(days / trendPoints);

    for (let i = trendPoints - 1; i >= 0; i--) {
      const date = DateTime.now().minus({ days: i * interval }).startOf('day');
      const nextDate = date.plus({ days: interval });
      labels.push(date.toFormat('MMM dd'));

      const [orders, completions, assignments] = await Promise.all([
        this.prisma.serviceOrder.count({
          where: { createdAt: { gte: date.toJSDate(), lt: nextDate.toJSDate() } },
        }),
        this.prisma.serviceOrder.count({
          where: {
            state: ServiceOrderState.COMPLETED,
            updatedAt: { gte: date.toJSDate(), lt: nextDate.toJSDate() },
          },
        }),
        this.prisma.assignment.count({
          where: { createdAt: { gte: date.toJSDate(), lt: nextDate.toJSDate() } },
        }),
      ]);

      serviceOrdersTrend.push(orders);
      completionsTrend.push(completions);
      assignmentsTrend.push(assignments);
    }

    return {
      serviceOrders: {
        total: {
          value: currentOrders,
          change: calculateChange(currentOrders, previousOrders),
          trend: getTrend(calculateChange(currentOrders, previousOrders)),
        },
        completed: {
          value: currentCompleted,
          change: calculateChange(currentCompleted, previousCompleted),
          trend: getTrend(calculateChange(currentCompleted, previousCompleted)),
        },
        avgCompletionTime,
        successRate: {
          value: Number(successRateValue.toFixed(1)),
          change: successRateChange,
          trend: getTrend(successRateChange),
        },
      },
      assignments: {
        total: {
          value: currentAssignments,
          change: calculateChange(currentAssignments, previousAssignments),
          trend: getTrend(calculateChange(currentAssignments, previousAssignments)),
        },
        acceptanceRate: {
          value: Number(acceptanceRateValue.toFixed(1)),
          change: acceptanceRateChange,
          trend: getTrend(acceptanceRateChange),
        },
        avgResponseTime: { value: 2.8, change: -8.1, trend: 'down' }, // Mock
      },
      providers: {
        total: { value: totalProviders, change: 5, trend: 'up' }, // Mock change
        activeRate: { value: Number(activeRateValue.toFixed(1)), change: 1.8, trend: 'up' }, // Mock change
        utilization: { value: 76.5, change: 4.2, trend: 'up' }, // Mock
      },
      trends: {
        labels,
        serviceOrders: serviceOrdersTrend,
        completions: completionsTrend,
        assignments: assignmentsTrend,
      },
    };
  }

  /**
   * Build action object for critical actions
   */
  private buildAction(config: {
    id: string;
    type: string;
    title: string;
    count: number;
    singular: string;
    plural: string;
    priority: 'critical' | 'high' | 'medium';
    link: string;
  }) {
    const description = config.count === 1 ? config.singular : config.plural;
    return {
      id: config.id,
      type: config.type,
      title: config.title,
      description,
      count: config.count,
      priority: config.priority,
      link: config.link,
    };
  }

  /**
   * Get critical actions requiring immediate attention
   */
  async getCriticalActions() {
    const now = new Date();
    const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const activeStates = [ServiceOrderState.CREATED, ServiceOrderState.SCHEDULED, ServiceOrderState.ASSIGNED];
    const activeTaskStatuses = [TaskStatus.OPEN, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS];

    const [
      unassignedHighPriority,
      overdueServiceOrders,
      slaAtRisk,
      pendingAssignments,
      failedAssignments,
      escalatedTasks,
    ] = await Promise.all([
      // P1 = High priority (24-72h response), unassigned
      this.prisma.serviceOrder.count({
        where: { state: ServiceOrderState.CREATED, priority: 'P1', assignedProviderId: null },
      }),
      this.prisma.serviceOrder.count({
        where: { state: { in: activeStates }, requestedEndDate: { lt: now } },
      }),
      this.prisma.serviceOrder.count({
        where: { state: { in: activeStates }, requestedEndDate: { gt: now, lt: fourHoursFromNow } },
      }),
      this.prisma.assignment.count({ where: { state: AssignmentState.OFFERED } }),
      // DECLINED = Rejected by provider
      this.prisma.assignment.count({
        where: { state: { in: [AssignmentState.DECLINED, AssignmentState.EXPIRED] }, updatedAt: { gte: oneDayAgo } },
      }),
      this.prisma.task.count({
        where: { escalationLevel: { gt: 0 }, status: { in: activeTaskStatuses } },
      }),
    ]);

    const actionConfigs = [
      { count: unassignedHighPriority, id: 'unassigned-urgent', type: 'UNASSIGNED', title: 'Unassigned P1 Orders',
        singular: '1 high-priority service order needs assignment', plural: `${unassignedHighPriority} high-priority service orders need assignment`,
        priority: 'critical' as const, link: '/service-orders?state=CREATED&priority=P1' },
      { count: overdueServiceOrders, id: 'overdue-orders', type: 'OVERDUE', title: 'Overdue Service Orders',
        singular: '1 service order is past the scheduled date', plural: `${overdueServiceOrders} service orders are past the scheduled date`,
        priority: 'critical' as const, link: '/service-orders?overdue=true' },
      { count: slaAtRisk, id: 'sla-at-risk', type: 'SLA_RISK', title: 'SLA At Risk',
        singular: '1 service order due within 4 hours', plural: `${slaAtRisk} service orders due within 4 hours`,
        priority: 'high' as const, link: '/service-orders?slaRisk=true' },
      { count: pendingAssignments, id: 'pending-assignments', type: 'PENDING_RESPONSE', title: 'Pending Provider Responses',
        singular: '1 assignment awaiting provider response', plural: `${pendingAssignments} assignments awaiting provider response`,
        priority: 'medium' as const, link: '/assignments?state=OFFERED' },
      { count: failedAssignments, id: 'failed-assignments', type: 'FAILED_ASSIGNMENT', title: 'Failed Assignments',
        singular: '1 assignment declined/expired in last 24h', plural: `${failedAssignments} assignments declined/expired in last 24h`,
        priority: 'high' as const, link: '/assignments?failed=true' },
      { count: escalatedTasks, id: 'escalated-tasks', type: 'ESCALATED', title: 'Escalated Tasks',
        singular: '1 task has been escalated', plural: `${escalatedTasks} tasks have been escalated`,
        priority: 'high' as const, link: '/tasks?escalated=true' },
    ];

    const actions = actionConfigs
      .filter(cfg => cfg.count > 0)
      .map(cfg => this.buildAction(cfg));

    const priorityOrder = { critical: 0, high: 1, medium: 2 };
    actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return actions;
  }

  /**
   * Get priority tasks for dashboard
   */
  async getPriorityTasks(limit: number = 10) {
    const tasks = await this.prisma.task.findMany({
      where: {
        status: { in: [TaskStatus.OPEN, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS] },
      },
      orderBy: [
        { escalationLevel: 'desc' },
        { priority: 'desc' },
        { slaDeadline: 'asc' },
      ],
      take: limit,
    });

    // Get service order details for tasks
    const serviceOrderIds = [...new Set(tasks.map(t => t.serviceOrderId))];
    const serviceOrders = await this.prisma.serviceOrder.findMany({
      where: { id: { in: serviceOrderIds } },
      select: { id: true, externalServiceOrderId: true, customerInfo: true, priority: true },
    });
    const serviceOrderMap = new Map(serviceOrders.map(so => [so.id, so]));

    // Get assignee details if assignedTo is set
    const assigneeIds = tasks.filter(t => t.assignedTo).map(t => t.assignedTo as string);
    const assignees = assigneeIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: assigneeIds } },
          select: { id: true, email: true, firstName: true, lastName: true },
        })
      : [];
    const assigneeMap = new Map(assignees.map(a => [a.id, a]));

    return tasks.map((task) => {
      const now = new Date();
      const deadline = task.slaDeadline ? new Date(task.slaDeadline) : null;
      const isOverdue = deadline ? deadline < now : false;
      const hoursRemaining = deadline
        ? Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60) * 10) / 10
        : null;

      const assignee = task.assignedTo ? assigneeMap.get(task.assignedTo) : null;
      const serviceOrder = serviceOrderMap.get(task.serviceOrderId);

      return {
        id: task.id,
        title: task.taskType.replaceAll('_', ' '),
        description: (task.context as any)?.description || null,
        type: task.taskType,
        status: task.status,
        priority: task.priority,
        escalationLevel: task.escalationLevel,
        serviceOrderId: task.serviceOrderId,
        serviceOrderExternalId: serviceOrder?.externalServiceOrderId || null,
        customerName: (serviceOrder?.customerInfo as any)?.name || 'Unknown',
        assignee: assignee
          ? {
              id: assignee.id,
              name: `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim() || assignee.email,
            }
          : null,
        slaDeadline: task.slaDeadline,
        isOverdue,
        hoursRemaining,
        createdAt: task.createdAt,
      };
    });
  }
}


