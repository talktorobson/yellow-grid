import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CountryCode } from '../../common/types/schema.types';

export interface CreateAssignmentDto {
  serviceOrderId: string;
  providerId: string;
  workTeamId?: string;
  proposedDate?: Date;
  assignmentMode?: string; // DIRECT, OFFER, BROADCAST
  offerTimeoutHours?: number; // Default 4h
}

export interface AcceptAssignmentDto {
  acceptedDate?: Date; // If accepting with date change
  technicianNotes?: string;
}

export interface RefuseAssignmentDto {
  refusalReason: string;
  alternativeDate?: Date; // Counter-proposal
}

export interface NegotiateDateDto {
  proposedDate: Date;
  proposedBy: 'PROVIDER' | 'CUSTOMER';
  notes?: string;
}

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all assignments with filters
   */
  async findAll(filters?: {
    status?: string;
    providerId?: string;
    serviceOrderId?: string;
    expired?: boolean; // Show expired offers
  }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.providerId) {
      where.providerId = filters.providerId;
    }

    if (filters?.serviceOrderId) {
      where.serviceOrderId = filters.serviceOrderId;
    }

    if (filters?.expired === true) {
      where.offerExpiresAt = {
        lt: new Date(),
      };
      where.status = 'PENDING';
    }

    return this.prisma.assignment.findMany({
      where,
      include: {
        serviceOrder: {
          include: {
            project: {
              select: {
                worksiteCity: true,
              },
            },
          },
        },
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
        dateNegotiations: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get assignment by ID with full details
   */
  async findOne(id: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        serviceOrder: {
          include: {
            project: {
              include: {
                contacts: true,
              },
            },
          },
        },
        provider: {
          include: {
            workTeams: true,
          },
        },
        workTeam: true,
        dateNegotiations: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment ${id} not found`);
    }

    return assignment;
  }

  /**
   * Create a new assignment (offer to provider)
   */
  async create(data: CreateAssignmentDto) {
    // Validate service order exists
    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id: data.serviceOrderId },
      include: {
        project: true,
      },
    });

    if (!serviceOrder) {
      throw new NotFoundException(`Service Order ${data.serviceOrderId} not found`);
    }

    // Validate provider exists and is active
    const provider = await this.prisma.provider.findUnique({
      where: { id: data.providerId },
    });

    if (!provider) {
      throw new NotFoundException(`Provider ${data.providerId} not found`);
    }

    if (!provider.active) {
      throw new BadRequestException('Provider is not active');
    }

    if (provider.riskStatus === 'SUSPENDED') {
      throw new BadRequestException('Provider is suspended');
    }

    // Get country configuration
    const country = await this.prisma.country.findUnique({
      where: { code: serviceOrder.countryCode },
    });

    const offerTimeoutHours = data.offerTimeoutHours || country?.offerTimeoutHours || 4;
    const autoAccept = country?.providerAutoAccept || false;

    // Calculate offer expiration
    const offerExpiresAt = new Date();
    offerExpiresAt.setHours(offerExpiresAt.getHours() + offerTimeoutHours);

    // Store original date for negotiation tracking
    const originalDate = data.proposedDate || serviceOrder.scheduledDate;

    const assignment = await this.prisma.assignment.create({
      data: {
        serviceOrderId: data.serviceOrderId,
        providerId: data.providerId,
        workTeamId: data.workTeamId,
        status: autoAccept ? 'ACCEPTED' : 'PENDING',
        assignmentMode: data.assignmentMode || 'DIRECT',
        proposedDate: originalDate,
        offerExpiresAt: autoAccept ? null : offerExpiresAt,
        originalDate,
        dateNegotiationRound: 0,
      },
      include: {
        serviceOrder: true,
        provider: true,
        workTeam: true,
      },
    });

    // If auto-accept (ES, IT), mark as accepted immediately
    if (autoAccept) {
      console.log(`✅ Auto-accepted assignment for ${serviceOrder.countryCode} (provider auto-accept enabled)`);

      // Update service order status
      await this.prisma.serviceOrder.update({
        where: { id: data.serviceOrderId },
        data: {
          status: 'ASSIGNED',
        },
      });
    } else {
      // TODO: Send notification to provider
      // TODO: Schedule timeout task (4h)
      console.log(`📧 Offer sent to provider ${provider.name}, expires at ${offerExpiresAt}`);
    }

    return assignment;
  }

  /**
   * Update assignment
   */
  async update(id: string, data: any) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment ${id} not found`);
    }

    return this.prisma.assignment.update({
      where: { id },
      data,
    });
  }

  // ==================== PROVIDER ACCEPTANCE FLOW ====================

  /**
   * Provider accepts assignment
   */
  async accept(id: string, acceptance: AcceptAssignmentDto) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        serviceOrder: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment ${id} not found`);
    }

    if (assignment.status !== 'PENDING') {
      throw new BadRequestException(`Assignment must be PENDING to accept. Current status: ${assignment.status}`);
    }

    // Check if offer has expired
    if (assignment.offerExpiresAt && new Date() > assignment.offerExpiresAt) {
      throw new BadRequestException('Assignment offer has expired');
    }

    const finalDate = acceptance.acceptedDate || assignment.proposedDate;

    // If date is different, start negotiation
    if (acceptance.acceptedDate && acceptance.acceptedDate !== assignment.proposedDate) {
      return this.negotiateDate(id, {
        proposedDate: acceptance.acceptedDate,
        proposedBy: 'PROVIDER',
        notes: acceptance.technicianNotes,
      });
    }

    // Accept with original date
    const updated = await this.prisma.assignment.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedDate: finalDate,
        technicianNotes: acceptance.technicianNotes,
      },
    });

    // Update service order status
    await this.prisma.serviceOrder.update({
      where: { id: assignment.serviceOrderId },
      data: {
        status: 'ASSIGNED',
        scheduledDate: finalDate,
      },
    });

    // TODO: Send confirmation to customer
    // TODO: Send confirmation to operator
    console.log(`✅ Assignment ${id} accepted by provider`);

    return this.findOne(id);
  }

  /**
   * Provider refuses assignment
   */
  async refuse(id: string, refusal: RefuseAssignmentDto) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        serviceOrder: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment ${id} not found`);
    }

    if (assignment.status !== 'PENDING') {
      throw new BadRequestException(`Assignment must be PENDING to refuse. Current status: ${assignment.status}`);
    }

    // If alternative date provided, start negotiation
    if (refusal.alternativeDate) {
      return this.negotiateDate(id, {
        proposedDate: refusal.alternativeDate,
        proposedBy: 'PROVIDER',
        notes: refusal.refusalReason,
      });
    }

    // Complete refusal
    const updated = await this.prisma.assignment.update({
      where: { id },
      data: {
        status: 'REFUSED',
        refusalReason: refusal.refusalReason,
        refusedAt: new Date(),
      },
    });

    // TODO: Create task for operator to reassign
    // TODO: Send notification to operator
    // TODO: Log refusal in assignment transparency
    console.log(`❌ Assignment ${id} refused by provider: ${refusal.refusalReason}`);

    return this.findOne(id);
  }

  // ==================== DATE NEGOTIATION ====================

  /**
   * Negotiate date (max 3 rounds)
   */
  async negotiateDate(id: string, negotiation: NegotiateDateDto) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        serviceOrder: true,
        dateNegotiations: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment ${id} not found`);
    }

    if (assignment.status !== 'PENDING') {
      throw new BadRequestException('Can only negotiate dates for PENDING assignments');
    }

    const currentRound = assignment.dateNegotiationRound || 0;

    // Check if max rounds exceeded (3 rounds max)
    if (currentRound >= 3) {
      throw new BadRequestException('Maximum negotiation rounds (3) exceeded. Manual assignment required.');
    }

    // Create negotiation record
    const dateNegotiation = await this.prisma.dateNegotiation.create({
      data: {
        assignmentId: id,
        round: currentRound + 1,
        proposedDate: negotiation.proposedDate,
        proposedBy: negotiation.proposedBy,
        notes: negotiation.notes,
      },
    });

    // Update assignment
    const updated = await this.prisma.assignment.update({
      where: { id },
      data: {
        proposedDate: negotiation.proposedDate,
        dateNegotiationRound: currentRound + 1,
      },
    });

    // TODO: Send notification to other party (customer or provider)
    console.log(
      `🔄 Date negotiation round ${currentRound + 1}/3 for assignment ${id} by ${negotiation.proposedBy}`
    );

    // If round 3, create task for manual intervention
    if (currentRound + 1 >= 3) {
      // TODO: Create task via TasksService
      console.log(`⚠️ Assignment ${id} reached max negotiation rounds - manual intervention needed`);
    }

    return this.findOne(id);
  }

  /**
   * Customer accepts provider's counter-proposal
   */
  async acceptCounterProposal(id: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        serviceOrder: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment ${id} not found`);
    }

    if (assignment.status !== 'PENDING') {
      throw new BadRequestException('Assignment must be PENDING');
    }

    if (!assignment.dateNegotiationRound || assignment.dateNegotiationRound === 0) {
      throw new BadRequestException('No date negotiation in progress');
    }

    // Accept the proposed date
    const updated = await this.prisma.assignment.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedDate: assignment.proposedDate,
      },
    });

    // Update service order
    await this.prisma.serviceOrder.update({
      where: { id: assignment.serviceOrderId },
      data: {
        status: 'ASSIGNED',
        scheduledDate: assignment.proposedDate,
      },
    });

    console.log(`✅ Customer accepted counter-proposal for assignment ${id}`);

    return this.findOne(id);
  }

  /**
   * Customer refuses provider's counter-proposal
   */
  async refuseCounterProposal(id: string, reason: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment ${id} not found`);
    }

    if (assignment.status !== 'PENDING') {
      throw new BadRequestException('Assignment must be PENDING');
    }

    if (!assignment.dateNegotiationRound || assignment.dateNegotiationRound === 0) {
      throw new BadRequestException('No date negotiation in progress');
    }

    // Check if max rounds reached
    if (assignment.dateNegotiationRound >= 3) {
      // Mark as failed, need manual assignment
      const updated = await this.prisma.assignment.update({
        where: { id },
        data: {
          status: 'REFUSED',
          refusalReason: 'Date negotiation failed after 3 rounds',
        },
      });

      // TODO: Create high-priority task for manual assignment
      console.log(`❌ Date negotiation failed for assignment ${id} - manual assignment needed`);

      return this.findOne(id);
    }

    // Continue negotiation if under 3 rounds
    console.log(`🔄 Customer refused counter-proposal for assignment ${id}: ${reason}`);

    return this.findOne(id);
  }

  // ==================== TIMEOUT & EXPIRATION ====================

  /**
   * Get expired offers (past offerExpiresAt)
   */
  async getExpiredOffers(countryCode?: CountryCode) {
    const where: any = {
      status: 'PENDING',
      offerExpiresAt: {
        lt: new Date(),
      },
    };

    if (countryCode) {
      where.serviceOrder = {
        countryCode,
      };
    }

    return this.prisma.assignment.findMany({
      where,
      include: {
        serviceOrder: {
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
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Mark expired offer as timeout
   */
  async markAsTimeout(id: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment ${id} not found`);
    }

    if (assignment.status !== 'PENDING') {
      throw new BadRequestException('Assignment must be PENDING to timeout');
    }

    const updated = await this.prisma.assignment.update({
      where: { id },
      data: {
        status: 'TIMEOUT',
      },
    });

    // TODO: Create task for operator to reassign
    // TODO: Send alert
    console.log(`⏰ Assignment ${id} timed out - reassignment needed`);

    return updated;
  }

  // ==================== STATISTICS ====================

  /**
   * Get assignment statistics
   */
  async getStatistics(filters?: { countryCode?: CountryCode; providerId?: string }) {
    const where: any = {};

    if (filters?.countryCode) {
      where.serviceOrder = {
        countryCode: filters.countryCode,
      };
    }

    if (filters?.providerId) {
      where.providerId = filters.providerId;
    }

    const [
      total,
      byStatus,
      withNegotiation,
      expired,
      averageAcceptanceTime,
    ] = await Promise.all([
      this.prisma.assignment.count({ where }),
      this.prisma.assignment.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.assignment.count({
        where: {
          ...where,
          dateNegotiationRound: {
            gt: 0,
          },
        },
      }),
      this.prisma.assignment.count({
        where: {
          ...where,
          status: 'PENDING',
          offerExpiresAt: {
            lt: new Date(),
          },
        },
      }),
      this.calculateAverageAcceptanceTime(where),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc: any, item: any) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      withDateNegotiation: withNegotiation,
      expiredOffers: expired,
      averageAcceptanceTimeHours: averageAcceptanceTime,
    };
  }

  /**
   * Calculate average time from created to accepted (in hours)
   */
  private async calculateAverageAcceptanceTime(where: any): Promise<number | null> {
    const acceptedAssignments = await this.prisma.assignment.findMany({
      where: {
        ...where,
        status: 'ACCEPTED',
        acceptedAt: {
          not: null,
        },
      },
      select: {
        createdAt: true,
        acceptedAt: true,
      },
    });

    if (acceptedAssignments.length === 0) {
      return null;
    }

    const totalHours = acceptedAssignments.reduce((sum: number, assignment: any) => {
      const createdTime = new Date(assignment.createdAt).getTime();
      const acceptedTime = new Date(assignment.acceptedAt).getTime();
      const hours = (acceptedTime - createdTime) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);

    return totalHours / acceptedAssignments.length;
  }
}
