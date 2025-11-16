import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  CountryCode,
  SalesPotential,
  RiskLevel,
  ContractStatus,
} from '../../common/types/schema.types';

export interface CreateServiceOrderDto {
  projectId: string; // Required in v2
  externalId?: string;
  serviceType: string;
  priority?: string;
  countryCode: CountryCode;
  buCode?: string;
  storeCode?: string;
  scheduledDate?: Date;
  estimatedDuration?: number;

  // Sales integration
  salesOrderId?: string;
  salesProjectId?: string;
  salesLeadId?: string;
  salesSystemSource?: string;

  // Customer info
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface UpdateServiceOrderDto {
  status?: string;
  scheduledDate?: Date;
  estimatedDuration?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface AssessSalesPotentialDto {
  salesPotential: SalesPotential;
  salesPotentialScore: number;
  salesPreEstimationValue?: number;
  salesmanNotes?: string;
}

export interface AssessRiskDto {
  riskLevel: RiskLevel;
  riskScore: number;
  riskFactors?: any; // JSON object
}

export interface AcknowledgeRiskDto {
  acknowledgedBy: string;
}

export interface UpdateGoExecDto {
  goExecStatus: string; // OK, NOK
  goExecBlockReason?: string;
  paymentStatus?: string;
  productDeliveryStatus?: string;
}

export interface OverrideGoExecDto {
  overrideBy: string;
  reason: string;
}

@Injectable()
export class ServiceOrdersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all service orders with filters
   */
  async findAll(
    pagination: PaginationDto,
    filters?: {
      countryCode?: CountryCode;
      projectId?: string;
      status?: string;
      priority?: string;
      salesPotential?: SalesPotential;
      riskLevel?: RiskLevel;
      goExecStatus?: string;
      wcfStatus?: string;
    }
  ) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.countryCode) {
      where.countryCode = filters.countryCode;
    }

    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.salesPotential) {
      where.salesPotential = filters.salesPotential;
    }

    if (filters?.riskLevel) {
      where.riskLevel = filters.riskLevel;
    }

    if (filters?.goExecStatus) {
      where.goExecStatus = filters.goExecStatus;
    }

    if (filters?.wcfStatus) {
      where.wcfStatus = filters.wcfStatus;
    }

    const [orders, total] = await Promise.all([
      this.prisma.serviceOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          project: {
            select: {
              id: true,
              worksiteStreet: true,
              worksiteCity: true,
              responsibleOperator: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          assignment: {
            include: {
              provider: {
                select: {
                  id: true,
                  name: true,
                  tier: true,
                  riskStatus: true,
                },
              },
              workTeam: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          execution: {
            select: {
              id: true,
              status: true,
              checkInAt: true,
              checkOutAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.serviceOrder.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get service order by ID with full details
   */
  async findOne(id: string) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            contacts: true,
            responsibleOperator: true,
          },
        },
        assignment: {
          include: {
            provider: true,
            workTeam: true,
            dateNegotiations: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        },
        execution: true,
        assignmentLog: true,
        tvOrder: true,
        installOrder: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Service Order ${id} not found`);
    }

    // Parse risk factors if present
    const parsedOrder = {
      ...order,
      riskFactors: order.riskFactors ? JSON.parse(order.riskFactors as string) : null,
    };

    return parsedOrder;
  }

  /**
   * Create a new service order
   */
  async create(data: CreateServiceOrderDto) {
    // Validate project exists
    const project = await this.prisma.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${data.projectId} not found`);
    }

    const order = await this.prisma.serviceOrder.create({
      data: {
        projectId: data.projectId,
        externalId: data.externalId,
        serviceType: data.serviceType,
        priority: data.priority,
        countryCode: data.countryCode,
        buCode: data.buCode,
        storeCode: data.storeCode,
        status: 'CREATED',
        scheduledDate: data.scheduledDate,
        estimatedDuration: data.estimatedDuration,

        // Sales integration
        salesOrderId: data.salesOrderId,
        salesProjectId: data.salesProjectId,
        salesLeadId: data.salesLeadId,
        salesSystemSource: data.salesSystemSource,

        // Customer info
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
      },
      include: {
        project: true,
      },
    });

    // TODO: Auto-assess sales potential (AI model)
    // TODO: Auto-assess risk (AI model)
    // TODO: Update project total hours

    return order;
  }

  /**
   * Update service order
   */
  async update(id: string, data: UpdateServiceOrderDto) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Service Order ${id} not found`);
    }

    const updated = await this.prisma.serviceOrder.update({
      where: { id },
      data,
    });

    return updated;
  }

  // ==================== SALES POTENTIAL ASSESSMENT ====================

  /**
   * Assess sales potential (TV → Installation conversion likelihood)
   */
  async assessSalesPotential(id: string, assessment: AssessSalesPotentialDto) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Service Order ${id} not found`);
    }

    if (order.serviceType !== 'TECHNICAL_VISIT') {
      throw new BadRequestException('Sales potential assessment only applies to Technical Visits');
    }

    const updated = await this.prisma.serviceOrder.update({
      where: { id },
      data: {
        salesPotential: assessment.salesPotential,
        salesPotentialScore: assessment.salesPotentialScore,
        salesPotentialUpdatedAt: new Date(),
        salesPreEstimationValue: assessment.salesPreEstimationValue,
        salesmanNotes: assessment.salesmanNotes,
      },
    });

    // TODO: If HIGH potential, prioritize scheduling
    // TODO: Notify salesperson of assessment

    return updated;
  }

  /**
   * Get service orders by sales potential
   */
  async getBySalesPotential(potential: SalesPotential, countryCode?: CountryCode) {
    const where: any = {
      salesPotential: potential,
      serviceType: 'TECHNICAL_VISIT',
    };

    if (countryCode) {
      where.countryCode = countryCode;
    }

    return this.prisma.serviceOrder.findMany({
      where,
      include: {
        project: {
          select: {
            worksiteCity: true,
          },
        },
      },
      orderBy: {
        salesPotentialScore: 'desc',
      },
    });
  }

  // ==================== RISK ASSESSMENT ====================

  /**
   * Assess risk (probability of issues)
   */
  async assessRisk(id: string, assessment: AssessRiskDto) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Service Order ${id} not found`);
    }

    const updated = await this.prisma.serviceOrder.update({
      where: { id },
      data: {
        riskLevel: assessment.riskLevel,
        riskScore: assessment.riskScore,
        riskAssessedAt: new Date(),
        riskFactors: assessment.riskFactors ? JSON.stringify(assessment.riskFactors) : null,
      },
    });

    // Create high-priority task for HIGH/CRITICAL risk
    if ([RiskLevel.HIGH, RiskLevel.CRITICAL].includes(assessment.riskLevel)) {
      // TODO: Create task via TasksService
      // TODO: Send alert to operator
      console.log(`⚠️ High/Critical risk SO ${id} - Task creation needed`);
    }

    return updated;
  }

  /**
   * Acknowledge risk
   */
  async acknowledgeRisk(id: string, acknowledgement: AcknowledgeRiskDto) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Service Order ${id} not found`);
    }

    if (!order.riskLevel) {
      throw new BadRequestException('No risk assessment to acknowledge');
    }

    const updated = await this.prisma.serviceOrder.update({
      where: { id },
      data: {
        riskAcknowledgedBy: acknowledgement.acknowledgedBy,
        riskAcknowledgedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Get high-risk service orders
   */
  async getHighRiskOrders(countryCode?: CountryCode) {
    const where: any = {
      riskLevel: {
        in: [RiskLevel.HIGH, RiskLevel.CRITICAL],
      },
    };

    if (countryCode) {
      where.countryCode = countryCode;
    }

    return this.prisma.serviceOrder.findMany({
      where,
      include: {
        project: {
          select: {
            worksiteCity: true,
            responsibleOperator: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        riskScore: 'desc',
      },
    });
  }

  // ==================== GO EXECUTION MONITORING ====================

  /**
   * Update Go Execution status (payment + product delivery)
   */
  async updateGoExecStatus(id: string, update: UpdateGoExecDto) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Service Order ${id} not found`);
    }

    const updated = await this.prisma.serviceOrder.update({
      where: { id },
      data: {
        goExecStatus: update.goExecStatus,
        goExecBlockReason: update.goExecBlockReason,
        paymentStatus: update.paymentStatus,
        productDeliveryStatus: update.productDeliveryStatus,
      },
    });

    // If NOK, block execution check-in
    if (update.goExecStatus === 'NOK') {
      // Update related execution if exists
      const execution = await this.prisma.execution.findFirst({
        where: { assignmentId: order.assignment?.id },
      });

      if (execution) {
        await this.prisma.execution.update({
          where: { id: execution.id },
          data: {
            canCheckIn: false,
            blockedReason: update.goExecBlockReason,
          },
        });
      }

      // TODO: Create task for operator
      // TODO: Send alert to provider
      console.log(`🚫 Go Exec NOK for SO ${id} - Execution blocked`);
    }

    return updated;
  }

  /**
   * Override Go Exec block (operator derogation)
   */
  async overrideGoExec(id: string, override: OverrideGoExecDto) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Service Order ${id} not found`);
    }

    if (order.goExecStatus !== 'NOK') {
      throw new BadRequestException('Can only override NOK status');
    }

    const updated = await this.prisma.serviceOrder.update({
      where: { id },
      data: {
        goExecOverride: true,
        goExecOverrideBy: override.overrideBy,
        goExecOverrideAt: new Date(),
      },
    });

    // Unblock execution
    const execution = await this.prisma.execution.findFirst({
      where: { assignmentId: order.assignment?.id },
    });

    if (execution) {
      await this.prisma.execution.update({
        where: { id: execution.id },
        data: {
          canCheckIn: true,
          blockedReason: `Override by ${override.overrideBy}: ${override.reason}`,
        },
      });
    }

    // TODO: Log override in audit trail
    console.log(`✅ Go Exec override for SO ${id} by ${override.overrideBy}`);

    return updated;
  }

  /**
   * Get service orders with Go Exec issues
   */
  async getGoExecIssues(countryCode?: CountryCode) {
    const where: any = {
      goExecStatus: 'NOK',
      goExecOverride: false,
    };

    if (countryCode) {
      where.countryCode = countryCode;
    }

    return this.prisma.serviceOrder.findMany({
      where,
      include: {
        project: {
          select: {
            responsibleOperator: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        assignment: {
          include: {
            provider: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  // ==================== STATISTICS ====================

  /**
   * Get service order statistics
   */
  async getStatistics(countryCode?: CountryCode) {
    const where: any = {};

    if (countryCode) {
      where.countryCode = countryCode;
    }

    const [
      total,
      byStatus,
      highRisk,
      highPotential,
      goExecIssues,
      contractPending,
      wcfPending,
    ] = await Promise.all([
      this.prisma.serviceOrder.count({ where }),
      this.prisma.serviceOrder.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.serviceOrder.count({
        where: {
          ...where,
          riskLevel: { in: [RiskLevel.HIGH, RiskLevel.CRITICAL] },
        },
      }),
      this.prisma.serviceOrder.count({
        where: {
          ...where,
          salesPotential: SalesPotential.HIGH,
          serviceType: 'TECHNICAL_VISIT',
        },
      }),
      this.prisma.serviceOrder.count({
        where: {
          ...where,
          goExecStatus: 'NOK',
          goExecOverride: false,
        },
      }),
      this.prisma.serviceOrder.count({
        where: {
          ...where,
          contractStatus: { in: [ContractStatus.PENDING, ContractStatus.SENT] },
        },
      }),
      this.prisma.serviceOrder.count({
        where: {
          ...where,
          wcfStatus: { in: ['PENDING', 'SENT'] },
        },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc: any, item: any) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      highRiskCount: highRisk,
      highPotentialTVCount: highPotential,
      goExecIssuesCount: goExecIssues,
      contractPendingCount: contractPending,
      wcfPendingCount: wcfPending,
    };
  }
}
