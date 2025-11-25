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
}


