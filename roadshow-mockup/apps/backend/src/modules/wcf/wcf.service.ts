import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WCFStatus } from '../../common/types/schema.types';

export interface CreateWCFDto {
  executionId: string;
  customerNotes?: string;
  photos?: string[]; // Array of photo URLs
  defects?: Array<{
    description: string;
    severity?: string;
    photo?: string;
  }>;
}

export interface SignWCFDto {
  signatureData: string; // Base64 signature image
  customerName: string;
  customerEmail?: string;
  acceptance: 'OK' | 'WITH_RESERVES' | 'REFUSED';
  reserves?: string; // Description of reserves
  refusalReason?: string;
}

@Injectable()
export class WCFService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create WCF after execution check-out
   * Auto-triggered when provider checks out
   */
  async create(data: CreateWCFDto) {
    // Validate execution exists and is checked out
    const execution = await this.prisma.execution.findUnique({
      where: { id: data.executionId },
      include: {
        assignment: {
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
          },
        },
      },
    });

    if (!execution) {
      throw new NotFoundException(`Execution ${data.executionId} not found`);
    }

    if (execution.status !== 'CHECKED_OUT') {
      throw new BadRequestException(
        `WCF can only be created for checked-out executions. Current status: ${execution.status}`
      );
    }

    // Check if WCF already exists
    const existing = await this.prisma.workClosingForm.findFirst({
      where: { executionId: data.executionId },
    });

    if (existing) {
      throw new BadRequestException('WCF already exists for this execution');
    }

    // Generate WCF number
    const wcfNumber = await this.generateWCFNumber();

    // Create WCF
    const wcf = await this.prisma.workClosingForm.create({
      data: {
        executionId: data.executionId,
        wcfNumber,
        status: WCFStatus.PENDING,
        customerNotes: data.customerNotes,
        photos: data.photos ? JSON.stringify(data.photos) : null,
        defects: data.defects ? JSON.stringify(data.defects) : null,
      },
    });

    // Link WCF to service order
    const serviceOrderId = execution.assignment.serviceOrder.id;
    await this.prisma.serviceOrder.update({
      where: { id: serviceOrderId },
      data: {
        wcfId: wcf.id,
        wcfStatus: WCFStatus.PENDING,
      },
    });

    // TODO: Auto-send WCF to customer (email/SMS)
    // TODO: Generate PDF from template
    // TODO: Create task for operator to follow up if not signed within 48h

    return this.findOne(wcf.id);
  }

  /**
   * Get all WCFs with filters
   */
  async findAll(filters?: {
    status?: WCFStatus;
    serviceOrderId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.serviceOrderId) {
      where.execution = {
        assignment: {
          serviceOrderId: filters.serviceOrderId,
        },
      };
    }

    const [wcfs, total] = await Promise.all([
      this.prisma.workClosingForm.findMany({
        where,
        include: {
          execution: {
            include: {
              assignment: {
                include: {
                  serviceOrder: {
                    select: {
                      id: true,
                      externalId: true,
                      serviceType: true,
                    },
                  },
                  provider: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.workClosingForm.count({ where }),
    ]);

    return {
      data: wcfs,
      total,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0,
    };
  }

  /**
   * Get WCF by ID
   */
  async findOne(id: string) {
    const wcf = await this.prisma.workClosingForm.findUnique({
      where: { id },
      include: {
        execution: {
          include: {
            assignment: {
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
                provider: true,
              },
            },
          },
        },
      },
    });

    if (!wcf) {
      throw new NotFoundException(`WCF ${id} not found`);
    }

    return wcf;
  }

  /**
   * Send WCF to customer
   */
  async send(id: string) {
    const wcf = await this.prisma.workClosingForm.findUnique({
      where: { id },
    });

    if (!wcf) {
      throw new NotFoundException(`WCF ${id} not found`);
    }

    if (wcf.status !== WCFStatus.PENDING) {
      throw new BadRequestException(
        `WCF can only be sent from PENDING status. Current status: ${wcf.status}`
      );
    }

    const updated = await this.prisma.workClosingForm.update({
      where: { id },
      data: {
        status: WCFStatus.SENT,
        sentAt: new Date(),
      },
    });

    // Update service order
    await this.updateServiceOrderWCFStatus(id, WCFStatus.SENT);

    // TODO: Send email/SMS to customer with WCF
    // TODO: Generate PDF
    // TODO: Schedule follow-up task if not signed in 48h

    return this.findOne(id);
  }

  /**
   * Customer signs WCF
   */
  async sign(id: string, signatureData: SignWCFDto) {
    const wcf = await this.prisma.workClosingForm.findUnique({
      where: { id },
      include: {
        execution: {
          include: {
            assignment: {
              include: {
                serviceOrder: true,
                provider: true,
              },
            },
          },
        },
      },
    });

    if (!wcf) {
      throw new NotFoundException(`WCF ${id} not found`);
    }

    if (wcf.status !== WCFStatus.SENT) {
      throw new BadRequestException(
        `WCF can only be signed from SENT status. Current status: ${wcf.status}`
      );
    }

    // Determine status based on acceptance type
    let newStatus: WCFStatus;
    switch (signatureData.acceptance) {
      case 'OK':
        newStatus = WCFStatus.SIGNED_OK;
        break;
      case 'WITH_RESERVES':
        newStatus = WCFStatus.SIGNED_WITH_RESERVES;
        break;
      case 'REFUSED':
        newStatus = WCFStatus.REFUSED;
        break;
      default:
        throw new BadRequestException('Invalid acceptance type');
    }

    // Update WCF
    const updated = await this.prisma.workClosingForm.update({
      where: { id },
      data: {
        status: newStatus,
        signedAt: new Date(),
        signatureData: signatureData.signatureData,
        customerName: signatureData.customerName,
        customerEmail: signatureData.customerEmail,
        reserves: signatureData.reserves,
        refusalReason: signatureData.refusalReason,
      },
    });

    // Update service order
    await this.updateServiceOrderWCFStatus(id, newStatus);

    // Handle post-signature actions based on acceptance
    await this.handlePostSignature(wcf, signatureData.acceptance);

    return this.findOne(id);
  }

  /**
   * Handle actions after WCF signature
   */
  private async handlePostSignature(wcf: any, acceptance: string) {
    const serviceOrderId = wcf.execution.assignment.serviceOrderId;
    const providerId = wcf.execution.assignment.provider.id;

    if (acceptance === 'OK') {
      // Customer accepted work completely
      // 1. Mark service order as ready for payment
      await this.prisma.serviceOrder.update({
        where: { id: serviceOrderId },
        data: {
          providerPaymentStatus: 'READY_FOR_INVOICE',
        },
      });

      // 2. TODO: Generate provider invoice
      // 3. TODO: Send notification to provider to sign invoice
      // 4. TODO: Update provider performance metrics (positive)

      console.log(`✅ WCF ${wcf.id} accepted OK - ready for provider payment`);
    } else if (acceptance === 'WITH_RESERVES') {
      // Customer has reserves
      // 1. Create task for operator to review reserves
      // 2. TODO: Send alert to operator
      // 3. TODO: May need rework or partial payment

      console.log(`⚠️ WCF ${wcf.id} accepted with reserves - operator review needed`);
    } else if (acceptance === 'REFUSED') {
      // Customer refused work
      // 1. Create high-priority task for operator
      // 2. Mark service order for rework
      await this.prisma.serviceOrder.update({
        where: { id: serviceOrderId },
        data: {
          status: 'REWORK_NEEDED',
        },
      });

      // 3. TODO: Send urgent alert to operator
      // 4. TODO: Update provider performance metrics (negative)
      // 5. TODO: May need to reassign to different provider

      console.log(`❌ WCF ${wcf.id} refused - rework needed`);
    }
  }

  /**
   * Update service order WCF status
   */
  private async updateServiceOrderWCFStatus(wcfId: string, status: WCFStatus) {
    const wcf = await this.prisma.workClosingForm.findUnique({
      where: { id: wcfId },
      include: {
        execution: {
          include: {
            assignment: true,
          },
        },
      },
    });

    if (wcf) {
      await this.prisma.serviceOrder.update({
        where: { id: wcf.execution.assignment.serviceOrderId },
        data: {
          wcfStatus: status,
          wcfSentAt: status === WCFStatus.SENT ? new Date() : undefined,
          wcfSignedAt: [
            WCFStatus.SIGNED_OK,
            WCFStatus.SIGNED_WITH_RESERVES,
            WCFStatus.REFUSED,
          ].includes(status)
            ? new Date()
            : undefined,
        },
      });
    }
  }

  /**
   * Add defect to WCF (before sending)
   */
  async addDefect(
    id: string,
    defect: {
      description: string;
      severity?: string;
      photo?: string;
    }
  ) {
    const wcf = await this.prisma.workClosingForm.findUnique({
      where: { id },
    });

    if (!wcf) {
      throw new NotFoundException(`WCF ${id} not found`);
    }

    if (wcf.status !== WCFStatus.PENDING) {
      throw new BadRequestException('Can only add defects to pending WCFs');
    }

    const existingDefects = wcf.defects ? JSON.parse(wcf.defects as string) : [];
    const updatedDefects = [...existingDefects, defect];

    await this.prisma.workClosingForm.update({
      where: { id },
      data: {
        defects: JSON.stringify(updatedDefects),
      },
    });

    return this.findOne(id);
  }

  /**
   * Generate unique WCF number
   * Format: WCF-{Year}-{SequentialNumber}
   * Example: WCF-2025-001234
   */
  private async generateWCFNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `WCF-${year}`;

    const lastWCF = await this.prisma.workClosingForm.findFirst({
      where: {
        wcfNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        wcfNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastWCF) {
      const lastSequence = parseInt(lastWCF.wcfNumber.split('-')[2], 10);
      sequence = lastSequence + 1;
    }

    const wcfNumber = `${prefix}-${sequence.toString().padStart(6, '0')}`;
    return wcfNumber;
  }

  /**
   * Get WCF statistics
   */
  async getStatistics(filters?: { projectId?: string }) {
    const where: any = {};

    if (filters?.projectId) {
      where.execution = {
        assignment: {
          serviceOrder: {
            projectId: filters.projectId,
          },
        },
      };
    }

    const wcfs = await this.prisma.workClosingForm.findMany({
      where,
      select: {
        status: true,
        createdAt: true,
        sentAt: true,
        signedAt: true,
      },
    });

    const stats = {
      total: wcfs.length,
      pending: wcfs.filter((w: any) => w.status === WCFStatus.PENDING).length,
      sent: wcfs.filter((w: any) => w.status === WCFStatus.SENT).length,
      signedOk: wcfs.filter((w: any) => w.status === WCFStatus.SIGNED_OK).length,
      signedWithReserves: wcfs.filter((w: any) => w.status === WCFStatus.SIGNED_WITH_RESERVES).length,
      refused: wcfs.filter((w: any) => w.status === WCFStatus.REFUSED).length,
      acceptanceRate: this.calculateAcceptanceRate(wcfs),
      averageSigningTime: this.calculateAverageSigningTime(wcfs),
    };

    return stats;
  }

  /**
   * Calculate acceptance rate (OK + WITH_RESERVES / Total signed)
   */
  private calculateAcceptanceRate(wcfs: any[]): number | null {
    const signed = wcfs.filter((w: any) =>
      [WCFStatus.SIGNED_OK, WCFStatus.SIGNED_WITH_RESERVES, WCFStatus.REFUSED].includes(w.status)
    );

    if (signed.length === 0) {
      return null;
    }

    const accepted = signed.filter((w: any) =>
      [WCFStatus.SIGNED_OK, WCFStatus.SIGNED_WITH_RESERVES].includes(w.status)
    );

    return (accepted.length / signed.length) * 100;
  }

  /**
   * Calculate average time from sent to signed (in hours)
   */
  private calculateAverageSigningTime(wcfs: any[]): number | null {
    const signed = wcfs.filter((w: any) => w.sentAt && w.signedAt);

    if (signed.length === 0) {
      return null;
    }

    const totalHours = signed.reduce((sum: number, wcf: any) => {
      const sentTime = new Date(wcf.sentAt).getTime();
      const signedTime = new Date(wcf.signedAt).getTime();
      const hours = (signedTime - sentTime) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);

    return totalHours / signed.length;
  }
}
