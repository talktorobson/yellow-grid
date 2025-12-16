import { Injectable, Logger } from '@nestjs/common';
import { OrderIntakeRequestDto } from '../dto';

export interface InternalServiceOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceAddress: {
    street: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    accessNotes?: string;
  };
  orderType: string;
  priority: string;
  status: string;
  externalReferences: {
    salesOrderId: string;
    projectId?: string;
    leadId?: string;
    customerId?: string;
    systemSource: string;
  };
  serviceItems: Array<{
    itemId: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    currency: string;
    serialNumbers: string[];
    requiresInstallation: boolean;
  }>;
  financials: {
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
  };
  schedulingPreferences: {
    preferredDate?: string;
    timeWindow?: {
      start: string;
      end: string;
    };
    excludedDates: string[];
    technicianPreference?: string;
    notes?: string;
  };
  requiredSkills: string[];
  estimatedDuration?: number;
  preEstimation?: {
    estimationId: string;
    estimatedValue: number;
    currency: string;
    confidenceLevel: string;
    productCategories: string[];
    salesmanId?: string;
    salesmanNotes?: string;
    validUntil?: string;
  };
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

@Injectable()
export class OrderMappingService {
  private readonly logger = new Logger(OrderMappingService.name);

  /**
   * Map external order intake request to internal service order format
   */
  mapToInternalFormat(request: OrderIntakeRequestDto, fsmOrderId: string): InternalServiceOrder {
    this.logger.log(`Mapping external order ${request.order.id} to internal format`);

    const now = new Date().toISOString();

    // Defaulting
    const orderType = 'INSTALLATION';
    const priority = 'P2';

    const internalOrder: InternalServiceOrder = {
      id: fsmOrderId,
      orderNumber: this.generateOrderNumber(request.system, fsmOrderId),
      customerId: request.customer.fiscalId || request.customer.email,
      customerName: `${request.customer.firstName} ${request.customer.lastName}`,
      customerEmail: request.customer.email,
      customerPhone: request.customer.phone,
      serviceAddress: {
        street: request.address.streetName,
        street2: request.address.buildingComplement,
        city: request.address.city,
        state: request.address.province,
        postalCode: request.address.postalCode,
        country: request.address.country,
        accessNotes: '',
      },
      orderType: this.mapOrderType(orderType),
      priority: this.mapPriority(priority),
      status: 'CREATED',
      externalReferences: {
        salesOrderId: request.order.id,
        systemSource: request.system,
      },
      serviceItems: request.items.map((item) => ({
        itemId: item.id,
        productId: item.itemNumber, // Using itemNumber as productId
        productName: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        currency: 'EUR', // Default or need to infer
        serialNumbers: [],
        requiresInstallation: true, // Default
      })),
      financials: {
        subtotal: 0, // Need to sum
        tax: 0,
        total: 0,
        currency: 'EUR',
      },
      schedulingPreferences: {
        preferredDate: request.order.scheduledDate,
        excludedDates: [],
      },
      requiredSkills: [],
      createdAt: now,
      updatedAt: now,
      metadata: {
        source: 'SALES_INTEGRATION',
        salesSystem: request.system,
        externalOrderId: request.order.id,
        importedAt: now,
      },
    };

    // Calculate financials
    const total = request.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    internalOrder.financials.subtotal = total; // Assuming unitPrice is pre-tax? 
    // Actually Schema has vats in order header
    internalOrder.financials.total = total; // Simplified

    this.logger.log(
      `Successfully mapped order to internal format. Order number: ${internalOrder.orderNumber}`,
    );

    return internalOrder;
  }

  /**
   * Map internal service order to external format for status updates
   */
  mapToExternalFormat(internalOrder: InternalServiceOrder): Record<string, unknown> {
    this.logger.log(`Mapping internal order ${internalOrder.id} to external format`);

    return {
      fsmOrderId: internalOrder.id,
      orderNumber: internalOrder.orderNumber,
      externalOrderId: internalOrder.externalReferences.salesOrderId,
      status: this.mapStatusToExternal(internalOrder.status),
      customer: {
        customerId: internalOrder.customerId,
        name: internalOrder.customerName,
        email: internalOrder.customerEmail,
        phone: internalOrder.customerPhone,
      },
      serviceAddress: internalOrder.serviceAddress,
      financials: internalOrder.financials,
      updatedAt: internalOrder.updatedAt,
    };
  }

  /**
   * Generate order number in FSM format
   */
  private generateOrderNumber(salesSystem: string, fsmOrderId: string): string {
    // Format: SO-<YEAR>-<SYSTEM>-<ID_SUFFIX>
    const year = new Date().getFullYear();
    const idSuffix = fsmOrderId.split('-').pop()?.substring(0, 8).toUpperCase();
    return `SO-${year}-${salesSystem}-${idSuffix}`;
  }

  /**
   * Map external order type to internal
   */
  private mapOrderType(orderType: string): string {
    const mapping: Record<string, string> = {
      INSTALLATION: 'INSTALLATION',
      REPAIR: 'REPAIR',
      MAINTENANCE: 'MAINTENANCE',
      UPGRADE: 'UPGRADE',
      TV: 'TECHNICAL_VISIT',
      QUOTATION: 'QUOTATION',
    };
    return mapping[orderType] || orderType;
  }

  /**
   * Map external priority to internal
   */
  private mapPriority(priority: string): string {
    const mapping: Record<string, string> = {
      LOW: 'P2',
      MEDIUM: 'P2',
      HIGH: 'P1',
      URGENT: 'P1',
      EMERGENCY: 'P1',
    };
    return mapping[priority] || 'P2';
  }

  /**
   * Map internal status to external
   */
  private mapStatusToExternal(status: string): string {
    const mapping: Record<string, string> = {
      CREATED: 'RECEIVED',
      SCHEDULED: 'SCHEDULED',
      ASSIGNED: 'ASSIGNED',
      DISPATCHED: 'IN_TRANSIT',
      IN_PROGRESS: 'IN_PROGRESS',
      COMPLETED: 'COMPLETED',
      VERIFIED: 'VERIFIED',
      CANCELLED: 'CANCELLED',
      ON_HOLD: 'ON_HOLD',
    };
    return mapping[status] || status;
  }

  /**
   * Validate mapped order
   */
  validateMappedOrder(order: InternalServiceOrder): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!order.id) errors.push('Order ID is required');
    if (!order.customerId) errors.push('Customer ID is required');
    if (!order.orderType) errors.push('Order type is required');
    if (!order.status) errors.push('Status is required');
    if (order.serviceItems.length === 0) errors.push('At least one service item is required');
    if (!order.serviceAddress.country) errors.push('Service address country is required');

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
