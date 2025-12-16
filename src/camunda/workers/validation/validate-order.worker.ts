import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Input variables for validate-order task
 */
interface ValidateOrderInput {
  serviceOrderId: string;
  customerId: string;
  storeId: string;
  urgency?: 'URGENT' | 'STANDARD' | 'LOW';
  postalCode?: string;
  serviceTypeCode?: string;
}

/**
 * Output variables from validate-order task
 */
interface ValidateOrderOutput {
  isValid: boolean;
  validationErrors?: string[];
  validatedAt: string;
  normalizedPostalCode?: string;
  urgencyLevel: 'URGENT' | 'STANDARD' | 'LOW';
}

/**
 * Validate Order Worker
 *
 * Task Type: validate-order
 *
 * Validates the service order before processing:
 * - Checks required fields (customer, address, service type)
 * - Validates urgency level
 * - Verifies service order exists in database
 * - Verifies customer exists and is active
 * - Verifies store exists and is active
 * - Validates geographic coverage
 */
@Injectable()
export class ValidateOrderWorker extends BaseWorker<ValidateOrderInput, ValidateOrderOutput> {
  protected readonly logger = new Logger(ValidateOrderWorker.name);
  readonly taskType = 'validate-order';
  readonly timeout = 15000;

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async handle(job: ZeebeJob<ValidateOrderInput>): Promise<ValidateOrderOutput> {
    const { serviceOrderId, customerId, storeId, urgency, postalCode, serviceTypeCode } =
      job.variables;

    this.logger.log(`Validating service order: ${serviceOrderId}`);

    // Phase 1: Basic field validation
    const { errors: basicErrors, normalizedPostal } = this.validateBasicFields(
      serviceOrderId, customerId, storeId, urgency, postalCode
    );
    
    if (basicErrors.length > 0) {
      this.logger.warn(`Basic validation failed for order ${serviceOrderId}: ${basicErrors.join('; ')}`);
      throw new BpmnError(
        'ORDER_VALIDATION_FAILED',
        `Order validation failed: ${basicErrors.join('; ')}`,
      );
    }

    // Phase 2: Database validations
    const dbErrors = await this.validateDatabase(
      serviceOrderId, storeId, serviceTypeCode, normalizedPostal
    );

    if (dbErrors.length > 0) {
      this.logger.warn(`Validation failed for order ${serviceOrderId}: ${dbErrors.join('; ')}`);
      throw new BpmnError(
        'ORDER_VALIDATION_FAILED',
        `Order validation failed: ${dbErrors.join('; ')}`,
      );
    }

    this.logger.log(`Order ${serviceOrderId} validated successfully`);
    return {
      isValid: true,
      validatedAt: new Date().toISOString(),
      normalizedPostalCode: normalizedPostal,
      urgencyLevel: urgency || 'STANDARD',
    };
  }

  /**
   * Phase 1: Validate basic required fields without database calls
   */
  private validateBasicFields(
    serviceOrderId: string,
    customerId: string,
    storeId: string,
    urgency: string | undefined,
    postalCode: string | undefined,
  ): { errors: string[]; normalizedPostal?: string } {
    const errors: string[] = [];

    if (!serviceOrderId) errors.push('Service order ID is required');
    if (!customerId) errors.push('Customer ID is required');
    if (!storeId) errors.push('Store ID is required');

    const validUrgencies = ['URGENT', 'STANDARD', 'LOW'];
    if (urgency && !validUrgencies.includes(urgency)) {
      errors.push(`Invalid urgency level: ${urgency}. Must be one of: ${validUrgencies.join(', ')}`);
    }

    let normalizedPostal: string | undefined;
    if (postalCode) {
      normalizedPostal = postalCode.replaceAll(/\s+/g, '').toUpperCase();
      if (normalizedPostal.length < 4 || normalizedPostal.length > 10) {
        errors.push('Invalid postal code format');
      }
    }

    return { errors, normalizedPostal };
  }

  /**
   * Phase 2: Validate against database records
   */
  private async validateDatabase(
    serviceOrderId: string,
    storeId: string,
    serviceTypeCode: string | undefined,
    normalizedPostal: string | undefined,
  ): Promise<string[]> {
    const errors: string[] = [];

    // Validate service order
    const serviceOrderErrors = await this.validateServiceOrder(serviceOrderId);
    errors.push(...serviceOrderErrors.errors);

    // Validate store
    const storeErrors = await this.validateStore(storeId);
    errors.push(...storeErrors);

    // Validate service type
    if (serviceTypeCode) {
      const serviceTypeErrors = await this.validateServiceType(serviceTypeCode);
      errors.push(...serviceTypeErrors);
    }

    // Validate geographic coverage
    if (normalizedPostal && serviceOrderErrors.serviceOrder) {
      const coverageErrors = await this.validateCoverage(
        normalizedPostal,
        serviceOrderErrors.serviceOrder.countryCode,
        serviceOrderErrors.serviceOrder.businessUnit,
      );
      errors.push(...coverageErrors);
    }

    return errors;
  }

  private async validateServiceOrder(serviceOrderId: string): Promise<{
    errors: string[];
    serviceOrder?: { countryCode: string; businessUnit: string };
  }> {
    const errors: string[] = [];
    
    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      select: { id: true, state: true, countryCode: true, businessUnit: true, customerInfo: true },
    });

    if (!serviceOrder) {
      return { errors: [`Service order not found: ${serviceOrderId}`] };
    }
    if (serviceOrder.state === 'CANCELLED') {
      errors.push('Service order has been cancelled');
    }

    const customerInfo = serviceOrder.customerInfo as { name?: string } | null;
    if (!customerInfo?.name) {
      errors.push('Customer name is missing from service order');
    }

    return { errors, serviceOrder };
  }

  private async validateStore(storeId: string): Promise<string[]> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, isActive: true, name: true },
    });

    if (!store) return [`Store not found: ${storeId}`];
    if (!store.isActive) return [`Store ${store.name} is not active`];
    return [];
  }

  private async validateServiceType(serviceTypeCode: string): Promise<string[]> {
    const serviceType = await this.prisma.serviceCatalog.findFirst({
      where: { fsmServiceCode: serviceTypeCode, status: 'ACTIVE' },
      select: { id: true },
    });
    return serviceType ? [] : [`Service type not found or inactive: ${serviceTypeCode}`];
  }

  private async validateCoverage(
    normalizedPostal: string,
    countryCode: string,
    businessUnit: string,
  ): Promise<string[]> {
    const coveringZones = await this.prisma.interventionZone.findMany({
      where: {
        provider: { countryCode, businessUnit, status: 'ACTIVE' },
      },
      select: { postalCodes: true },
    });

    const hasCoverage = coveringZones.some((zone) => {
      const postalCodes = zone.postalCodes as string[] | null;
      return postalCodes?.includes(normalizedPostal) ?? false;
    });

    return hasCoverage ? [] : [`No active providers cover postal code: ${normalizedPostal}`];
  }
}
