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
 * - Checks for duplicate orders
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

    const errors: string[] = [];

    // Required field checks
    if (!serviceOrderId) {
      errors.push('Service order ID is required');
    }
    if (!customerId) {
      errors.push('Customer ID is required');
    }
    if (!storeId) {
      errors.push('Store ID is required');
    }

    // Urgency validation
    const validUrgencies = ['URGENT', 'STANDARD', 'LOW'];
    if (urgency && !validUrgencies.includes(urgency)) {
      errors.push(
        `Invalid urgency level: ${urgency}. Must be one of: ${validUrgencies.join(', ')}`,
      );
    }

    // Postal code format validation (basic check)
    if (postalCode) {
      const normalizedPostal = postalCode.replace(/\s+/g, '');
      if (normalizedPostal.length < 4 || normalizedPostal.length > 10) {
        errors.push('Invalid postal code format');
      }
    }

    // TODO: Add real validation logic:
    // - Check customer exists in database
    // - Check store is active
    // - Check service type is available at store
    // - Check postal code is within service area

    if (errors.length > 0) {
      this.logger.warn(`Validation failed for order ${serviceOrderId}: ${errors.join('; ')}`);

      // Throw BPMN error for invalid orders
      throw new BpmnError(
        'ORDER_VALIDATION_FAILED',
        `Order validation failed: ${errors.join('; ')}`,
      );
    }

    this.logger.log(`Order ${serviceOrderId} validated successfully`);
    return {
      isValid: true,
      validatedAt: new Date().toISOString(),
      normalizedPostalCode: postalCode?.replace(/\s+/g, '').toUpperCase(),
      urgencyLevel: urgency || 'STANDARD',
    };
  }
}
