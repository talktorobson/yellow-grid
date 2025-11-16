import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ContractStatus, SignatureType } from '../../common/types/schema.types';

export interface CreateContractDto {
  projectId: string;
  serviceOrderIds: string[]; // Bundle multiple SOs
  templateId?: string;
  signatureType?: SignatureType;
  customerNotes?: string;
  validUntil?: Date;
}

export interface SignContractDto {
  signatureData?: string; // Base64 image or signature hash
  signedAt?: Date;
  customerName?: string;
  customerEmail?: string;
}

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new contract by bundling service orders
   */
  async create(data: CreateContractDto) {
    // Validate project exists
    const project = await this.prisma.project.findUnique({
      where: { id: data.projectId },
      include: {
        serviceOrders: {
          where: {
            id: { in: data.serviceOrderIds },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${data.projectId} not found`);
    }

    // Validate all service orders belong to this project
    if (project.serviceOrders.length !== data.serviceOrderIds.length) {
      throw new BadRequestException('Some service orders do not belong to this project');
    }

    // Validate service orders are in correct status for contracting
    const invalidOrders = project.serviceOrders.filter(
      (so: any) => !['CREATED', 'SCHEDULED'].includes(so.status)
    );

    if (invalidOrders.length > 0) {
      throw new BadRequestException(
        `Service orders must be in CREATED or SCHEDULED status. Invalid: ${invalidOrders.map((so: any) => so.id).join(', ')}`
      );
    }

    // Generate contract number
    const contractNumber = await this.generateContractNumber(project.worksiteCountry);

    // Determine signature type (default to DIGITAL)
    const signatureType = data.signatureType || SignatureType.DIGITAL;

    // Calculate valid until (default 30 days)
    const validUntil = data.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Create contract
    const contract = await this.prisma.contract.create({
      data: {
        projectId: data.projectId,
        contractNumber,
        templateId: data.templateId,
        signatureType,
        status: ContractStatus.PENDING,
        customerNotes: data.customerNotes,
        validUntil,
      },
      include: {
        project: {
          include: {
            contacts: true,
          },
        },
      },
    });

    // Link service orders to contract
    await this.prisma.serviceOrder.updateMany({
      where: {
        id: { in: data.serviceOrderIds },
      },
      data: {
        contractId: contract.id,
        contractStatus: ContractStatus.PENDING,
      },
    });

    // TODO: Schedule auto-send after configured hours (from Country.contractAutoSendHours)
    // For now, we'll implement manual send only

    return this.findOne(contract.id);
  }

  /**
   * Get all contracts with filters
   */
  async findAll(filters?: {
    projectId?: string;
    status?: ContractStatus;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const [contracts, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              worksiteStreet: true,
              worksiteCity: true,
              contacts: true,
            },
          },
          _count: {
            select: {
              // serviceOrders: true,  // Will be available after relation is set up
            },
          },
        },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.contract.count({ where }),
    ]);

    return {
      data: contracts,
      total,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0,
    };
  }

  /**
   * Get contract by ID
   */
  async findOne(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            contacts: true,
            serviceOrders: {
              where: {
                contractId: id,
              },
              select: {
                id: true,
                externalId: true,
                serviceType: true,
                scheduledDate: true,
                estimatedDuration: true,
              },
            },
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${id} not found`);
    }

    return contract;
  }

  /**
   * Send contract to customer (email or other channel)
   */
  async send(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            contacts: true,
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${id} not found`);
    }

    if (contract.status !== ContractStatus.PENDING) {
      throw new BadRequestException(
        `Contract can only be sent from PENDING status. Current status: ${contract.status}`
      );
    }

    // Update contract status
    const updated = await this.prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.SENT,
        sentAt: new Date(),
      },
      include: {
        project: {
          include: {
            contacts: true,
          },
        },
      },
    });

    // Update linked service orders
    await this.prisma.serviceOrder.updateMany({
      where: {
        contractId: id,
      },
      data: {
        contractStatus: ContractStatus.SENT,
        contractSentAt: new Date(),
      },
    });

    // TODO: Send email/SMS to customer with contract PDF
    // TODO: Generate contract PDF from template
    // TODO: Create task for operator to follow up

    return updated;
  }

  /**
   * Customer signs the contract (digital signature)
   */
  async sign(id: string, signatureData: SignContractDto) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${id} not found`);
    }

    if (contract.status !== ContractStatus.SENT) {
      throw new BadRequestException(
        `Contract can only be signed from SENT status. Current status: ${contract.status}`
      );
    }

    // Check if contract is still valid
    if (contract.validUntil && new Date() > contract.validUntil) {
      throw new BadRequestException('Contract has expired');
    }

    const signedAt = signatureData.signedAt || new Date();

    // Update contract
    const updated = await this.prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.SIGNED,
        signedAt,
        signatureData: signatureData.signatureData,
        customerName: signatureData.customerName,
        customerEmail: signatureData.customerEmail,
      },
    });

    // Update linked service orders - now ready for assignment!
    await this.prisma.serviceOrder.updateMany({
      where: {
        contractId: id,
      },
      data: {
        contractStatus: ContractStatus.SIGNED,
        contractSignedAt: signedAt,
        // Status transitions to next step (ready for assignment)
      },
    });

    // TODO: Trigger assignment workflow for linked service orders
    // TODO: Send confirmation email to customer
    // TODO: Notify operator of signed contract

    return this.findOne(id);
  }

  /**
   * Customer refuses the contract
   */
  async refuse(id: string, reason?: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${id} not found`);
    }

    if (contract.status !== ContractStatus.SENT) {
      throw new BadRequestException(
        `Contract can only be refused from SENT status. Current status: ${contract.status}`
      );
    }

    // Update contract
    const updated = await this.prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.REFUSED,
        refusedAt: new Date(),
        refusalReason: reason,
      },
    });

    // Update linked service orders
    await this.prisma.serviceOrder.updateMany({
      where: {
        contractId: id,
      },
      data: {
        contractStatus: ContractStatus.REFUSED,
      },
    });

    // TODO: Create high-priority task for operator to contact customer
    // TODO: Send alert to project owner (Pilote du Chantier)
    // TODO: Log reason in service order timeline

    return this.findOne(id);
  }

  /**
   * Skip contract signature (operator derogation)
   */
  async skip(id: string, reason: string, operatorId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${id} not found`);
    }

    if (!['PENDING', 'SENT'].includes(contract.status)) {
      throw new BadRequestException(
        `Contract can only be skipped from PENDING or SENT status. Current status: ${contract.status}`
      );
    }

    // Update contract
    const updated = await this.prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.SKIPPED,
        skipReason: reason,
        skippedBy: operatorId,
        skippedAt: new Date(),
      },
    });

    // Update linked service orders - allow them to proceed
    await this.prisma.serviceOrder.updateMany({
      where: {
        contractId: id,
      },
      data: {
        contractStatus: ContractStatus.SKIPPED,
      },
    });

    // TODO: Log derogation in audit trail
    // TODO: Notify management of contract skip (if required by country rules)

    return this.findOne(id);
  }

  /**
   * Cancel contract (before sending)
   */
  async cancel(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${id} not found`);
    }

    if (contract.status !== ContractStatus.PENDING) {
      throw new BadRequestException(
        `Contract can only be cancelled from PENDING status. Current status: ${contract.status}`
      );
    }

    // Delete contract
    await this.prisma.contract.delete({
      where: { id },
    });

    // Unlink service orders
    await this.prisma.serviceOrder.updateMany({
      where: {
        contractId: id,
      },
      data: {
        contractId: null,
        contractStatus: null,
      },
    });

    return { deleted: true };
  }

  /**
   * Generate unique contract number
   * Format: {CountryCode}-{Year}-{SequentialNumber}
   * Example: ES-2025-001234
   */
  private async generateContractNumber(countryCode: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `${countryCode}-${year}`;

    // Get the last contract for this country and year
    const lastContract = await this.prisma.contract.findFirst({
      where: {
        contractNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        contractNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastContract) {
      // Extract sequence from last contract number
      const lastSequence = parseInt(lastContract.contractNumber.split('-')[2], 10);
      sequence = lastSequence + 1;
    }

    const contractNumber = `${prefix}-${sequence.toString().padStart(6, '0')}`;
    return contractNumber;
  }

  /**
   * Get contract statistics for a project
   */
  async getProjectContractStats(projectId: string) {
    const contracts = await this.prisma.contract.findMany({
      where: { projectId },
      select: {
        id: true,
        status: true,
        createdAt: true,
        sentAt: true,
        signedAt: true,
      },
    });

    const stats = {
      total: contracts.length,
      pending: contracts.filter((c: any) => c.status === ContractStatus.PENDING).length,
      sent: contracts.filter((c: any) => c.status === ContractStatus.SENT).length,
      signed: contracts.filter((c: any) => c.status === ContractStatus.SIGNED).length,
      refused: contracts.filter((c: any) => c.status === ContractStatus.REFUSED).length,
      skipped: contracts.filter((c: any) => c.status === ContractStatus.SKIPPED).length,
      averageSigningTime: this.calculateAverageSigningTime(contracts),
    };

    return stats;
  }

  /**
   * Calculate average time from sent to signed (in hours)
   */
  private calculateAverageSigningTime(contracts: any[]): number | null {
    const signedContracts = contracts.filter(
      c => c.status === ContractStatus.SIGNED && c.sentAt && c.signedAt
    );

    if (signedContracts.length === 0) {
      return null;
    }

    const totalHours = signedContracts.reduce((sum: number, contract: any) => {
      const sentTime = new Date(contract.sentAt).getTime();
      const signedTime = new Date(contract.signedAt).getTime();
      const hours = (signedTime - sentTime) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);

    return totalHours / signedContracts.length;
  }
}
