import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MediaUploadService } from '../media-upload.service';
import { GenerateWcfDto } from './dto/generate-wcf.dto';
import { SubmitWcfDto } from './dto/submit-wcf.dto';
import { WcfStatus, WcfSignerType, SignatureMethod, SignatureStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

interface WcfRecord {
  id: string;
  wcfNumber: string;
  serviceOrderId: string;
  pdfUrl: string | null;
  thumbnailUrl: string | null;
  accepted: boolean | null;
  signatureDataUrl?: string;
  refusalReason?: string;
  version: number;
  status: WcfStatus;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class WcfService {
  private readonly logger = new Logger(WcfService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaUploadService: MediaUploadService,
  ) {}

  /**
   * Generate a unique WCF number
   * Format: WCF-{COUNTRY}-{YEAR}-{SEQUENCE}
   */
  private async generateWcfNumber(countryCode: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `WCF-${countryCode}-${year}`;

    // Find the latest WCF number for this year and country
    const latest = await this.prisma.workCompletionForm.findFirst({
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
    if (latest) {
      // Extract sequence number from latest WCF number
      const match = latest.wcfNumber.match(/-(\d+)$/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}-${sequence.toString().padStart(6, '0')}`;
  }

  /**
   * Generate WCF for a service order
   */
  async generate(dto: GenerateWcfDto): Promise<WcfRecord> {
    this.logger.debug(`Generating WCF for service order: ${dto.serviceOrderId}`);

    // Fetch service order to get metadata
    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id: dto.serviceOrderId },
      include: {
        assignedProvider: true,
        assignedWorkTeam: true,
      },
    });

    if (!serviceOrder) {
      throw new NotFoundException(`Service order ${dto.serviceOrderId} not found`);
    }

    // Generate WCF number
    const wcfNumber = await this.generateWcfNumber(serviceOrder.countryCode);

    // Create WCF record
    const wcf = await this.prisma.workCompletionForm.create({
      data: {
        wcfNumber,
        version: 1,
        serviceOrderId: dto.serviceOrderId,
        countryCode: serviceOrder.countryCode,
        businessUnit: serviceOrder.businessUnit,

        // Party information from DTO and service order
        customerInfo: serviceOrder.customerInfo,
        technicianInfo: {
          name: dto.technicianName || 'Unknown Technician',
        },
        providerInfo: {
          id: serviceOrder.assignedProviderId,
          name: serviceOrder.assignedProvider?.name || 'Unknown Provider',
        },

        // Service execution details
        serviceDate: new Date(),
        serviceLocation: serviceOrder.serviceAddress,

        // Work performed - stub for now
        workSummary: 'Work completion pending customer acceptance',
        workDetails: {
          description: 'Service completed',
          tasksCompleted: [],
          issuesFound: [],
          issuesResolved: [],
        },

        // Initialize totals
        totalLaborHours: 0,
        totalMaterials: 0,
        totalEquipment: 0,

        // Status
        status: WcfStatus.DRAFT,
      },
    });

    this.logger.log(`Generated WCF ${wcfNumber} for service order ${dto.serviceOrderId}`);

    return this.mapToWcfRecord(wcf);
  }

  /**
   * Submit WCF with customer acceptance/refusal
   */
  async submit(dto: SubmitWcfDto): Promise<WcfRecord> {
    this.logger.debug(`Submitting WCF for service order: ${dto.serviceOrderId}`);

    // Find existing WCF for this service order
    const existing = await this.prisma.workCompletionForm.findFirst({
      where: { serviceOrderId: dto.serviceOrderId },
      orderBy: { version: 'desc' },
    });

    if (!existing) {
      throw new NotFoundException(
        `No WCF found for service order ${dto.serviceOrderId}. Please generate one first.`
      );
    }

    // Check if WCF is already finalized
    if (existing.status === WcfStatus.FINALIZED) {
      throw new BadRequestException(`WCF ${existing.wcfNumber} is already finalized and cannot be modified`);
    }

    // Update WCF with customer acceptance
    const updated = await this.prisma.workCompletionForm.update({
      where: { id: existing.id },
      data: {
        customerAccepted: dto.accepted,
        customerAcceptedAt: dto.accepted ? new Date() : null,
        refusalReason: dto.accepted ? null : dto.refusalReason,
        status: dto.accepted ? WcfStatus.SIGNED : WcfStatus.REJECTED,
        submittedAt: new Date(),
        version: existing.version + 1,
      },
    });

    // If customer provided signature, create signature record
    if (dto.signatureDataUrl) {
      await this.prisma.wcfSignature.create({
        data: {
          wcfId: updated.id,
          signerType: WcfSignerType.CUSTOMER,
          signerName: (existing.customerInfo as any)?.name || 'Customer',
          signerEmail: (existing.customerInfo as any)?.email,
          signatureMethod: SignatureMethod.DRAWN,
          signatureDataUrl: dto.signatureDataUrl,
          status: SignatureStatus.COMPLETED,
          signedAt: new Date(),
        },
      });
    }

    this.logger.log(
      `WCF ${updated.wcfNumber} submitted with ${dto.accepted ? 'acceptance' : 'refusal'}`
    );

    return this.mapToWcfRecord(updated);
  }

  /**
   * Get WCF by service order ID
   */
  async get(serviceOrderId: string): Promise<WcfRecord | null> {
    this.logger.debug(`Retrieving WCF for service order: ${serviceOrderId}`);

    const wcf = await this.prisma.workCompletionForm.findFirst({
      where: { serviceOrderId },
      orderBy: { version: 'desc' },
    });

    if (!wcf) {
      return null;
    }

    return this.mapToWcfRecord(wcf);
  }

  /**
   * Get WCF by ID
   */
  async getById(id: string): Promise<WcfRecord> {
    this.logger.debug(`Retrieving WCF by ID: ${id}`);

    const wcf = await this.prisma.workCompletionForm.findUnique({
      where: { id },
      include: {
        materials: true,
        equipment: true,
        labor: true,
        photos: true,
        qualityChecks: true,
        signatures: true,
      },
    });

    if (!wcf) {
      throw new NotFoundException(`WCF ${id} not found`);
    }

    return this.mapToWcfRecord(wcf);
  }

  /**
   * Get WCF by WCF number
   */
  async getByWcfNumber(wcfNumber: string): Promise<WcfRecord> {
    this.logger.debug(`Retrieving WCF by number: ${wcfNumber}`);

    const wcf = await this.prisma.workCompletionForm.findUnique({
      where: { wcfNumber },
      include: {
        materials: true,
        equipment: true,
        labor: true,
        photos: true,
        qualityChecks: true,
        signatures: true,
      },
    });

    if (!wcf) {
      throw new NotFoundException(`WCF ${wcfNumber} not found`);
    }

    return this.mapToWcfRecord(wcf);
  }

  /**
   * Add labor entry to WCF
   */
  async addLabor(wcfId: string, labor: {
    technicianId: string;
    technicianName: string;
    role: string;
    startTime: Date;
    endTime: Date;
    breakMinutes?: number;
    hourlyRate?: number;
  }): Promise<void> {
    const wcf = await this.prisma.workCompletionForm.findUnique({
      where: { id: wcfId },
    });

    if (!wcf) {
      throw new NotFoundException(`WCF ${wcfId} not found`);
    }

    if (wcf.status === WcfStatus.FINALIZED) {
      throw new BadRequestException(`WCF is finalized and cannot be modified`);
    }

    const totalMinutes = Math.floor((labor.endTime.getTime() - labor.startTime.getTime()) / 60000);
    const netMinutes = totalMinutes - (labor.breakMinutes || 0);

    await this.prisma.wcfLabor.create({
      data: {
        wcfId,
        technicianId: labor.technicianId,
        technicianName: labor.technicianName,
        role: labor.role,
        startTime: labor.startTime,
        endTime: labor.endTime,
        breakMinutes: labor.breakMinutes,
        totalMinutes,
        netMinutes,
        hourlyRate: labor.hourlyRate,
        totalCost: labor.hourlyRate ? (netMinutes / 60) * labor.hourlyRate : null,
      },
    });

    // Update total labor hours on WCF
    const totalLaborHours = await this.calculateTotalLaborHours(wcfId);
    await this.prisma.workCompletionForm.update({
      where: { id: wcfId },
      data: { totalLaborHours },
    });

    this.logger.log(`Added labor entry to WCF ${wcfId}`);
  }

  /**
   * Add photo to WCF
   */
  async addPhoto(wcfId: string, photo: {
    photoType: string;
    photoUrl: string;
    photoGcsPath: string;
    thumbnailUrl?: string;
    caption?: string;
    sequence: number;
    originalFilename?: string;
    contentType: string;
    fileSize: number;
    capturedAt: Date;
    capturedBy?: string;
  }): Promise<void> {
    const wcf = await this.prisma.workCompletionForm.findUnique({
      where: { id: wcfId },
    });

    if (!wcf) {
      throw new NotFoundException(`WCF ${wcfId} not found`);
    }

    await this.prisma.wcfPhoto.create({
      data: {
        wcfId,
        photoType: photo.photoType as any,
        photoUrl: photo.photoUrl,
        photoGcsPath: photo.photoGcsPath,
        thumbnailUrl: photo.thumbnailUrl,
        caption: photo.caption,
        sequence: photo.sequence,
        originalFilename: photo.originalFilename,
        contentType: photo.contentType,
        fileSize: photo.fileSize,
        capturedAt: photo.capturedAt,
        capturedBy: photo.capturedBy,
      },
    });

    this.logger.log(`Added photo to WCF ${wcfId}`);
  }

  /**
   * Calculate total labor hours for a WCF
   */
  private async calculateTotalLaborHours(wcfId: string): Promise<number> {
    const laborEntries = await this.prisma.wcfLabor.findMany({
      where: { wcfId },
    });

    const totalMinutes = laborEntries.reduce((sum, entry) => sum + entry.netMinutes, 0);
    return totalMinutes / 60;
  }

  /**
   * Map Prisma model to WcfRecord interface
   */
  private mapToWcfRecord(wcf: any): WcfRecord {
    return {
      id: wcf.id,
      wcfNumber: wcf.wcfNumber,
      serviceOrderId: wcf.serviceOrderId,
      pdfUrl: wcf.pdfUrl,
      thumbnailUrl: wcf.thumbnailUrl,
      accepted: wcf.customerAccepted,
      signatureDataUrl: undefined, // Not stored in main record
      refusalReason: wcf.refusalReason,
      version: wcf.version,
      status: wcf.status,
      createdAt: wcf.createdAt,
      updatedAt: wcf.updatedAt,
    };
  }

  /**
   * Finalize WCF (make it immutable)
   */
  async finalize(wcfId: string, approvedBy: string): Promise<WcfRecord> {
    const wcf = await this.prisma.workCompletionForm.findUnique({
      where: { id: wcfId },
    });

    if (!wcf) {
      throw new NotFoundException(`WCF ${wcfId} not found`);
    }

    if (wcf.status === WcfStatus.FINALIZED) {
      throw new BadRequestException(`WCF is already finalized`);
    }

    if (!wcf.customerAccepted) {
      throw new BadRequestException(`Cannot finalize WCF that has not been accepted by customer`);
    }

    const updated = await this.prisma.workCompletionForm.update({
      where: { id: wcfId },
      data: {
        status: WcfStatus.FINALIZED,
        approvedAt: new Date(),
        approvedBy,
      },
    });

    this.logger.log(`WCF ${updated.wcfNumber} finalized by ${approvedBy}`);

    return this.mapToWcfRecord(updated);
  }
}
