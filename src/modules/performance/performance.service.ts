import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PerformanceQueryDto } from './dto/performance-query.dto';

@Injectable()
export class PerformanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary(query: PerformanceQueryDto) {
    const { startDate, endDate, countryCode, businessUnit } = query;

    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    if (countryCode) where.countryCode = countryCode;
    if (businessUnit) where.businessUnit = businessUnit;

    const totalServiceOrders = await this.prisma.serviceOrder.count({ where });

    const completedServiceOrders = await this.prisma.serviceOrder.count({
      where: {
        ...where,
        state: { in: ['COMPLETED', 'VALIDATED', 'CLOSED'] },
      },
    });

    const overallCompletionRate =
      totalServiceOrders > 0 ? (completedServiceOrders / totalServiceOrders) * 100 : 0;

    // Mock top performers for now as we don't have enough data/logic for complex ranking
    const topPerformers = {
      operators: [
        { id: '1', name: 'Alice Operator', score: 98 },
        { id: '2', name: 'Bob Manager', score: 95 },
      ],
      providers: [
        { id: '1', name: 'FastFix Inc.', score: 99 },
        { id: '2', name: 'Reliable Techs', score: 97 },
      ],
    };

    const alerts = [
      {
        type: 'warning',
        message: 'High volume of P1 tickets in Madrid',
        entity: 'Region',
        entityId: 'ES-MD',
      },
    ];

    return {
      totalServiceOrders,
      completedServiceOrders,
      overallCompletionRate: Number(overallCompletionRate.toFixed(1)),
      averageCustomerSatisfaction: 4.5, // Mock
      topPerformers,
      alerts,
    };
  }

  async getOperatorPerformance(query: PerformanceQueryDto) {
    // In a real scenario, we would group service orders by operator (e.g. createdBy or assignedOperatorId)
    // For now, we'll return mock data to satisfy the frontend contract

    const operators = [
      {
        operatorId: 'op-1',
        operatorName: 'Alice Operator',
        countryCode: 'ES',
        metrics: {
          totalServiceOrders: 150,
          completedServiceOrders: 142,
          completionRate: 94.6,
          averageCompletionTime: 2.5,
          onTimeDeliveryRate: 98,
          customerSatisfactionScore: 4.8,
          activeServiceOrders: 8,
          p1ResponseTime: 2.1,
          p2ResponseTime: 24.5,
        },
        period: {
          startDate: query.startDate || '2025-01-01',
          endDate: query.endDate || '2025-01-31',
        },
        trends: {
          completionRateTrend: 'up',
          satisfactionTrend: 'stable',
        },
      },
      {
        operatorId: 'op-2',
        operatorName: 'Bob Manager',
        countryCode: 'FR',
        metrics: {
          totalServiceOrders: 120,
          completedServiceOrders: 110,
          completionRate: 91.6,
          averageCompletionTime: 3.1,
          onTimeDeliveryRate: 95,
          customerSatisfactionScore: 4.6,
          activeServiceOrders: 10,
          p1ResponseTime: 2.5,
          p2ResponseTime: 28.0,
        },
        period: {
          startDate: query.startDate || '2025-01-01',
          endDate: query.endDate || '2025-01-31',
        },
        trends: {
          completionRateTrend: 'stable',
          satisfactionTrend: 'up',
        },
      },
    ];

    return {
      operators,
      total: operators.length,
    };
  }

  async getProviderPerformance(query: PerformanceQueryDto) {
    const { startDate, endDate, countryCode, businessUnit, providerId } = query;

    // Build where clause for filtering
    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    if (countryCode) where.countryCode = countryCode;
    if (businessUnit) where.businessUnit = businessUnit;
    if (providerId) where.assignedProviderId = providerId;

    // Get providers with their service orders
    const providers = await this.prisma.provider.findMany({
      where: providerId ? { id: providerId } : {},
      include: {
        serviceOrders: {
          where,
          select: {
            id: true,
            state: true,
            createdAt: true,
            updatedAt: true,
            scheduledDate: true,
          },
        },
        _count: {
          select: {
            serviceOrders: true,
          },
        },
      },
      take: 50,
    });

    const providerMetrics = providers.map((provider) => {
      const orders = provider.serviceOrders;
      const totalAssignments = orders.length;
      const completedOrders = orders.filter((o) =>
        ['COMPLETED', 'VALIDATED', 'CLOSED'].includes(o.state),
      );
      const completedAssignments = completedOrders.length;
      const completionRate =
        totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

      // Calculate average completion time (in days)
      let avgCompletionTime = 0;
      if (completedOrders.length > 0) {
        const totalDays = completedOrders.reduce((sum, order) => {
          const created = new Date(order.createdAt);
          const updated = new Date(order.updatedAt);
          return sum + (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        }, 0);
        avgCompletionTime = totalDays / completedOrders.length;
      }

      // Calculate on-time delivery rate
      const scheduledOrders = orders.filter((o) => o.scheduledDate);
      const onTimeOrders = scheduledOrders.filter((o) => {
        if (!o.scheduledDate) return false;
        const scheduled = new Date(o.scheduledDate);
        const completed = new Date(o.updatedAt);
        return completed <= scheduled || ['COMPLETED', 'VALIDATED', 'CLOSED'].includes(o.state);
      });
      const onTimeRate =
        scheduledOrders.length > 0 ? (onTimeOrders.length / scheduledOrders.length) * 100 : 100;

      return {
        providerId: provider.id,
        providerName: provider.name,
        countryCode: provider.countryCode,
        metrics: {
          totalAssignments,
          completedAssignments,
          completionRate: Number(completionRate.toFixed(1)),
          acceptanceRate: 95, // Would need acceptance tracking
          averageCompletionTime: Number(avgCompletionTime.toFixed(1)),
          onTimeDeliveryRate: Number(onTimeRate.toFixed(1)),
          qualityScore: 4.5, // Would need quality tracking
          customerRating: 4.7, // Would need rating tracking
          repeatIssueRate: 5, // Would need issue tracking
          responseTime: 2.5, // Would need response time tracking
        },
        period: {
          startDate: startDate || '2025-01-01',
          endDate: endDate || new Date().toISOString().split('T')[0],
        },
        trends: {
          completionRateTrend: 'up' as const,
          qualityTrend: 'stable' as const,
        },
      };
    });

    return {
      providers: providerMetrics,
      total: providerMetrics.length,
    };
  }
}
