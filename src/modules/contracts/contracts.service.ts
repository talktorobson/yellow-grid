import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  ContractStatus,
  ContractSignerType,
  NotificationChannel,
  NotificationStatus,
  Prisma,
  SignatureMethod,
  SignatureStatus,
} from '@prisma/client';
import { GenerateContractDto } from './dto/generate-contract.dto';
import { SendContractDto } from './dto/send-contract.dto';
import { SignContractDto } from './dto/sign-contract.dto';
import { ContractQueryDto } from './dto/filter-contracts.dto';
import { ContractListResponseDto, ContractResponseDto } from './dto/contract-response.dto';
import { nanoid } from 'nanoid';
import { ESignatureService } from './esignature/esignature.service';
import { SignerRole, TabType } from './esignature/interfaces/esignature-provider.interface';

const CONTRACT_RELATIONS = {
  signatures: true,
  notifications: {
    orderBy: { createdAt: 'desc' },
  },
  template: {
    select: {
      id: true,
      code: true,
      version: true,
      name: true,
    },
  },
  serviceOrder: {
    select: {
      id: true,
      serviceId: true,
      state: true,
      countryCode: true,
      businessUnit: true,
      requestedStartDate: true,
      requestedEndDate: true,
      service: {
        select: {
          id: true,
          name: true,
          serviceType: true,
          contractTemplateId: true,
          requiresPreServiceContract: true,
        },
      },
      project: {
        select: {
          id: true,
          projectName: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
        },
      },
      assignedProvider: {
        select: {
          id: true,
          name: true,
        },
      },
      customerInfo: true,
      serviceAddress: true,
    },
  },
} satisfies Prisma.ContractInclude;

type ContractWithRelations = Prisma.ContractGetPayload<{ include: typeof CONTRACT_RELATIONS }>;
type ContractSignatureRelation = ContractWithRelations['signatures'][number];
type ContractNotificationRelation = ContractWithRelations['notifications'][number];
type ServiceOrderWithRelations = Prisma.ServiceOrderGetPayload<{
  include: {
    service: true;
    project: true;
    assignedProvider: true;
  };
}>;

type JsonRecord = Record<string, unknown>;

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eSignatureService: ESignatureService,
  ) {}

  async generate(dto: GenerateContractDto): Promise<ContractResponseDto> {
    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id: dto.serviceOrderId },
      include: {
        service: true,
        project: true,
        assignedProvider: true,
      },
    });

    if (!serviceOrder) {
      throw new NotFoundException(`Service order ${dto.serviceOrderId} not found`);
    }

    if (!serviceOrder.service.requiresPreServiceContract && !dto.allowOptionalContract) {
      throw new BadRequestException(
        'Service does not require a pre-service contract. Pass allowOptionalContract to override.',
      );
    }

    const templateId = dto.templateId ?? serviceOrder.service.contractTemplateId;

    if (!templateId) {
      throw new BadRequestException(
        'No contract template configured for this service. Provide templateId explicitly.',
      );
    }

    const template = await this.prisma.contractTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        code: true,
        version: true,
        bodyTemplate: true,
        defaultPayload: true,
      },
    });

    if (!template?.bodyTemplate) {
      throw new NotFoundException(
        `Contract template ${templateId} missing or has no body template`,
      );
    }

    const mergeData = this.buildMergePayload(serviceOrder, template, dto.mergeData);
    const documentBody = this.renderTemplate(template.bodyTemplate, mergeData);
    const mergeCustomer = this.asRecord(mergeData.customer);
    const signerName =
      this.getStringValue(mergeCustomer, 'name') ??
      serviceOrder.project?.customerName ??
      'Customer';
    const signatureCode = this.generateSignatureCode();
    const contractNumber = this.generateContractNumber(serviceOrder.countryCode);

    const customerEmail =
      dto.customerEmail ??
      this.extractCustomerField(serviceOrder.customerInfo, 'email') ??
      serviceOrder.project?.customerEmail ??
      null;
    const customerPhone =
      dto.customerPhone ??
      this.extractCustomerField(serviceOrder.customerInfo, 'phone') ??
      serviceOrder.project?.customerPhone ??
      null;

    const contract = await this.prisma.contract.create({
      data: {
        contractNumber,
        status: ContractStatus.GENERATED,
        serviceOrderId: serviceOrder.id,
        templateId,
        countryCode: serviceOrder.countryCode,
        businessUnit: serviceOrder.businessUnit,
        payload: mergeData as Prisma.InputJsonValue,
        documentBody,
        customerEmail,
        customerPhone,
        signatureCode,
        signatures: {
          create: {
            signerType: ContractSignerType.CUSTOMER,
            signerName,
            signerEmail: customerEmail,
            signerPhone: customerPhone,
            signatureMethod: dto.signatureMethod ?? SignatureMethod.TYPED,
            status: SignatureStatus.REQUESTED,
            verificationCode: signatureCode,
          },
        },
      },
      include: CONTRACT_RELATIONS,
    });

    this.logger.log(`Generated contract ${contract.contractNumber} for order ${serviceOrder.id}`);

    return this.mapToResponse(contract);
  }

  async send(contractId: string, dto: SendContractDto): Promise<ContractResponseDto> {
    const contract = await this.getContractOrFail(contractId);

    // Validate email is provided (required for e-signature)
    const customerEmail = dto.email ?? contract.customerEmail;
    if (!customerEmail) {
      throw new BadRequestException('Email is required to send contract for signature');
    }

    const customerPhone = dto.phone ?? contract.customerPhone;

    try {
      this.logger.log(`Sending contract ${contract.contractNumber} via e-signature provider`);

      // Prepare document for e-signature (convert HTML to PDF if needed)
      const documentContent = await this.prepareDocumentForSignature(contract);

      // Create envelope with e-signature provider
      const envelopeResponse = await this.eSignatureService.createEnvelope({
        contractId: contract.id,
        document: {
          name: `Contract_${contract.contractNumber}.pdf`,
          content: documentContent,
          fileExtension: 'pdf',
          documentId: contract.id,
        },
        signers: [
          {
            name: contract.signatures[0]?.signerName || 'Customer',
            email: customerEmail,
            role: SignerRole.SIGNER,
            routingOrder: 1,
            phoneNumber: customerPhone || undefined,
            requireIdVerification: false,
            tabs: [
              {
                type: TabType.SIGNATURE,
                label: 'Customer Signature',
                required: true,
                pageNumber: 1,
                xPosition: 100,
                yPosition: 650,
              },
              {
                type: TabType.DATE_SIGNED,
                label: 'Date Signed',
                required: true,
                pageNumber: 1,
                xPosition: 300,
                yPosition: 650,
              },
            ],
          },
        ],
        emailSubject: dto.message
          ? `Contract ${contract.contractNumber}: ${dto.message}`
          : `Please sign your contract ${contract.contractNumber}`,
        emailMessage:
          dto.message ||
          'Please review and sign the attached contract at your earliest convenience.',
        expiresAt: this.computeExpiry(dto.expiresInHours ?? 48),
        metadata: {
          contractId: contract.id,
          contractNumber: contract.contractNumber,
        },
      });

      this.logger.log(
        `E-signature envelope created: ${envelopeResponse.envelopeId} for contract ${contract.contractNumber}`,
      );

      // Send the envelope for signature
      await this.eSignatureService.sendForSignature({
        envelopeId: envelopeResponse.envelopeId,
      });

      this.logger.log(`E-signature envelope sent: ${envelopeResponse.envelopeId}`);

      // Update contract with provider envelope ID
      const updated = await this.prisma.contract.update({
        where: { id: contractId },
        data: {
          status: ContractStatus.SENT,
          sentAt: new Date(),
          expiresAt: this.computeExpiry(dto.expiresInHours ?? 48),
          customerEmail,
          customerPhone,
          // providerEnvelopeId: envelopeResponse.envelopeId,
          notifications: {
            create: {
              channel: NotificationChannel.EMAIL,
              destination: customerEmail,
              status: NotificationStatus.SENT,
              payload: {
                message: dto.message ?? 'Please review and sign your contract.',
                envelopeId: envelopeResponse.envelopeId,
              } as Prisma.InputJsonValue,
              sentAt: new Date(),
            },
          },
        },
        include: CONTRACT_RELATIONS,
      });

      this.logger.log(
        `Contract ${contract.contractNumber} sent for e-signature to ${customerEmail}`,
      );

      return this.mapToResponse(updated as any);
    } catch (error) {
      this.logger.error(
        `Failed to send contract ${contract.contractNumber} via e-signature: ${error.message}`,
        error.stack,
      );

      // Fall back to simple notification if e-signature fails
      this.logger.warn(`Falling back to legacy notification mode for contract ${contractId}`);
      return this.sendLegacyMode(contractId, dto, contract);
    }
  }

  /**
   * Legacy send mode (fallback when e-signature provider is unavailable)
   * This is the original implementation
   */
  private async sendLegacyMode(
    contractId: string,
    dto: SendContractDto,
    contract: ContractWithRelations,
  ): Promise<ContractResponseDto> {
    const channels: NotificationChannel[] = [];
    const sendEmail = dto.sendEmail ?? true;
    const sendSms = dto.sendSms ?? false;

    if (sendEmail) {
      const email = dto.email ?? contract.customerEmail;
      if (!email) {
        throw new BadRequestException('Email is required to send contract via email');
      }
      channels.push(NotificationChannel.EMAIL);
    }

    if (sendSms) {
      const phone = dto.phone ?? contract.customerPhone;
      if (!phone) {
        throw new BadRequestException('Phone number is required to send contract via SMS');
      }
      channels.push(NotificationChannel.SMS);
    }

    if (channels.length === 0) {
      throw new BadRequestException('Select at least one delivery channel');
    }

    const notificationsData = channels.map((channel) => ({
      channel,
      destination:
        channel === NotificationChannel.EMAIL
          ? (dto.email ?? contract.customerEmail!)
          : (dto.phone ?? contract.customerPhone!),
      status: NotificationStatus.SENT,
      payload: {
        message: dto.message ?? 'Please review and sign your contract.',
        verificationCode: contract.signatureCode,
      } as Prisma.InputJsonValue,
      sentAt: new Date(),
    }));

    const expiresAt = this.computeExpiry(dto.expiresInHours ?? 48);

    const updated = await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        status: ContractStatus.SENT,
        sentAt: new Date(),
        expiresAt,
        customerEmail: dto.email ?? contract.customerEmail,
        customerPhone: dto.phone ?? contract.customerPhone,
        notifications: {
          createMany: {
            data: notificationsData,
          },
        },
      },
      include: CONTRACT_RELATIONS,
    });

    for (const notification of notificationsData) {
      this.logger.log(
        `Contract ${contract.contractNumber} sent via ${notification.channel} to ${notification.destination}`,
      );
    }

    return this.mapToResponse(updated);
  }

  /**
   * Prepare document for e-signature
   * Converts contract HTML body to PDF (base64 encoded)
   */
  private async prepareDocumentForSignature(contract: ContractWithRelations): Promise<string> {
    // TODO: Implement HTML to PDF conversion
    // For now, return a placeholder base64-encoded PDF
    // In production, use a library like puppeteer or pdfkit to convert HTML to PDF

    const placeholderPdf = Buffer.from(
      `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 55
>>
stream
BT
/F1 12 Tf
100 700 Td
(Contract ${contract.contractNumber}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
422
%%EOF`,
      'utf-8',
    );

    return placeholderPdf.toString('base64');
  }

  async sign(contractId: string, dto: SignContractDto): Promise<ContractResponseDto> {
    const contract = await this.getContractOrFail(contractId);

    if (contract.signatureCode !== dto.verificationCode) {
      throw new BadRequestException('Invalid verification code');
    }

    if (contract.status === ContractStatus.SIGNED) {
      throw new BadRequestException('Contract already signed');
    }

    const now = new Date();
    const customerSignature = contract.signatures.find(
      (signature: ContractSignatureRelation) =>
        signature.signerType === ContractSignerType.CUSTOMER,
    );

    if (!customerSignature) {
      throw new BadRequestException('No customer signature request found');
    }

    const [updatedContract] = await this.prisma.$transaction([
      this.prisma.contract.update({
        where: { id: contractId },
        data: {
          status: ContractStatus.SIGNED,
          signedAt: now,
        },
        include: CONTRACT_RELATIONS,
      }),
      this.prisma.contractSignature.update({
        where: { id: customerSignature.id },
        data: {
          status: SignatureStatus.SIGNED,
          signedAt: now,
          signerName: dto.signerName,
          evidence: {
            signatureData: dto.signatureData,
            ipAddress: dto.ipAddress,
            userAgent: dto.userAgent,
          } as Prisma.InputJsonValue,
        },
      }),
    ]);

    this.logger.log(`Contract ${updatedContract.contractNumber} signed by ${dto.signerName}`);

    return this.mapToResponse(updatedContract as ContractWithRelations);
  }

  async findAll(query: ContractQueryDto): Promise<ContractListResponseDto> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 25;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ContractWhereInput = {};

    if (query.serviceOrderId) {
      where.serviceOrderId = query.serviceOrderId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.countryCode) {
      where.countryCode = query.countryCode;
    }

    if (query.businessUnit) {
      where.businessUnit = query.businessUnit;
    }

    const [items, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: CONTRACT_RELATIONS,
      }),
      this.prisma.contract.count({ where }),
    ]);

    return {
      data: items.map((item: ContractWithRelations) => this.mapToResponse(item)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string): Promise<ContractResponseDto> {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: CONTRACT_RELATIONS,
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${id} not found`);
    }

    return this.mapToResponse(contract);
  }

  private async getContractOrFail(id: string): Promise<ContractWithRelations> {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: CONTRACT_RELATIONS,
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${id} not found`);
    }

    return contract;
  }

  private buildMergePayload(
    serviceOrder: ServiceOrderWithRelations,
    template: { defaultPayload?: Prisma.JsonValue | null; code: string; version: number },
    overrides?: JsonRecord,
  ): JsonRecord {
    const customerInfo = this.asRecord(serviceOrder.customerInfo);
    const serviceAddress = this.asRecord(serviceOrder.serviceAddress);

    const basePayload: JsonRecord = {
      contract: {
        templateCode: template.code,
        templateVersion: template.version,
        generatedAt: new Date().toISOString(),
        contractNumberHint: this.generateContractNumber(serviceOrder.countryCode),
      },
      customer: {
        name: this.getStringValue(customerInfo, 'name') ?? serviceOrder.project?.customerName,
        email: this.getStringValue(customerInfo, 'email') ?? serviceOrder.project?.customerEmail,
        phone: this.getStringValue(customerInfo, 'phone') ?? serviceOrder.project?.customerPhone,
        address: serviceAddress,
      },
      service: {
        id: serviceOrder.serviceId,
        name: serviceOrder.service?.name,
        type: serviceOrder.service?.serviceType,
        requestedStartDate: serviceOrder.requestedStartDate,
        requestedEndDate: serviceOrder.requestedEndDate,
      },
      provider: serviceOrder.assignedProvider
        ? {
            id: serviceOrder.assignedProvider.id,
            name: serviceOrder.assignedProvider.name,
          }
        : undefined,
    };

    return this.mergePayloads(this.asRecord(template.defaultPayload), basePayload, overrides ?? {});
  }

  private mergePayloads(...payloads: Array<JsonRecord | null | undefined>): JsonRecord {
    return payloads.reduce<JsonRecord>((acc, payload) => {
      if (!payload || typeof payload !== 'object') {
        return acc;
      }
      return { ...acc, ...payload };
    }, {});
  }

  private asRecord(value: unknown): JsonRecord | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as JsonRecord;
  }

  private extractCustomerField(
    value: Prisma.JsonValue | null | undefined,
    field: string,
  ): string | null {
    const record = this.asRecord(value);
    const extracted = this.getStringValue(record, field);
    return extracted ?? null;
  }

  private getStringValue(record: JsonRecord | null | undefined, field: string): string | undefined {
    if (!record) {
      return undefined;
    }
    const rawValue = record[field];
    return typeof rawValue === 'string' ? rawValue : undefined;
  }

  private renderTemplate(template: string, data: JsonRecord): string {
    return template.replaceAll(/{{\s*([\w.]+)\s*}}/g, (_, token: string) => {
      const value = this.resolveTokenValue(data, token);

      if (value === undefined || value === null) {
        return '';
      }

      if (typeof value === 'object') {
        return JSON.stringify(value);
      }

      if (typeof value === 'string') {
        return value;
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return value.toString();
      }

      return '';
    });
  }

  private resolveTokenValue(source: JsonRecord, token: string): unknown {
    return token.split('.').reduce<unknown>((acc, key) => {
      if (acc === null || acc === undefined) {
        return undefined;
      }

      if (typeof acc !== 'object') {
        return undefined;
      }

      return (acc as Record<string, unknown>)[key];
    }, source);
  }

  private generateContractNumber(countryCode: string): string {
    return `CTR-${countryCode}-${nanoid(6).toUpperCase()}`;
  }

  private generateSignatureCode(): string {
    return `${Math.floor(100000 + Math.random() * 900000)}`; // 6-digit numeric code
  }

  private computeExpiry(hours: number): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + hours);
    return expiry;
  }

  private mapToResponse(contract: ContractWithRelations): ContractResponseDto {
    return {
      id: contract.id,
      contractNumber: contract.contractNumber,
      status: contract.status,
      serviceOrderId: contract.serviceOrderId,
      templateId: contract.templateId,
      customerEmail: contract.customerEmail,
      customerPhone: contract.customerPhone,
      sentAt: contract.sentAt,
      signedAt: contract.signedAt,
      expiresAt: contract.expiresAt,
      documentBody: contract.documentBody,
      payload: this.asRecord(contract.payload) ?? {},
      signatures: contract.signatures.map((signature: ContractSignatureRelation) => ({
        id: signature.id,
        signatureMethod: signature.signatureMethod,
        status: signature.status,
        signerName: signature.signerName,
        signerEmail: signature.signerEmail,
        signerPhone: signature.signerPhone,
        signedAt: signature.signedAt,
      })),
      notifications: contract.notifications.map((notification: ContractNotificationRelation) => ({
        id: notification.id,
        channel: notification.channel,
        status: notification.status,
        destination: notification.destination,
        sentAt: notification.sentAt,
      })),
    };
  }
}
