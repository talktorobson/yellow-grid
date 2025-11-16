import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardMetrics(countryCode?: string) {
    const where: any = countryCode ? { countryCode } : {};

    const [
      totalOrders,
      activeOrders,
      completedOrders,
      totalProviders,
      activeProviders,
    ] = await Promise.all([
      this.prisma.serviceOrder.count({ where }),
      this.prisma.serviceOrder.count({
        where: { ...where, status: { in: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] } },
      }),
      this.prisma.serviceOrder.count({
        where: { ...where, status: 'COMPLETED' },
      }),
      this.prisma.provider.count({ where }),
      this.prisma.provider.count({
        where: { ...where, active: true },
      }),
    ]);

    return {
      totalOrders,
      activeOrders,
      completedOrders,
      totalProviders,
      activeProviders,
    };
  }

  async getProviderMetrics(providerId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        assignments: {
          include: {
            serviceOrder: true,
          },
        },
      },
    });

    if (!provider) {
      return null;
    }

    const totalAssignments = provider.assignments.length;
    const acceptedAssignments = provider.assignments.filter(
      (a: any) => a.status === 'ACCEPTED' || a.status === 'ASSIGNED',
    ).length;
    const completedJobs = provider.assignments.filter(
      (a: any) => a.serviceOrder.status === 'COMPLETED',
    ).length;

    return {
      provider: {
        id: provider.id,
        name: provider.name,
        rating: provider.rating,
      },
      metrics: {
        totalAssignments,
        acceptedAssignments,
        completedJobs,
        acceptanceRate: totalAssignments > 0 ? (acceptedAssignments / totalAssignments) * 100 : 0,
        completionRate: acceptedAssignments > 0 ? (completedJobs / acceptedAssignments) * 100 : 0,
      },
    };
  }
}
