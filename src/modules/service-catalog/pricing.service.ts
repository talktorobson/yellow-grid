import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GeographicService } from './geographic.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Pricing Context for calculation
 */
export interface PricingContext {
  serviceId: string;
  countryCode: string;
  businessUnit: string;
  postalCode?: string;
  isOvertime?: boolean;
  isWeekend?: boolean;
  isHoliday?: boolean;
  isUrgent?: boolean;
  durationMinutes?: number; // For hourly rate calculations
}

/**
 * Calculated Pricing Result
 */
export interface PricingResult {
  serviceId: string;
  serviceName: string;
  baseRate: number;
  currency: string;
  rateType: 'HOURLY' | 'FIXED';
  appliedMultipliers: {
    overtime?: number;
    weekend?: number;
    holiday?: number;
    urgent?: number;
  };
  finalRate: number;
  totalCost: number; // For fixed rate = finalRate, for hourly = finalRate * (durationMinutes / 60)
  pricingLevel: 'POSTAL_CODE' | 'COUNTRY_DEFAULT';
  postalCodeId?: string | null;
  validFrom: Date;
  validUntil?: Date | null;
}

/**
 * Pricing Service
 *
 * Handles service pricing lookup with postal code inheritance and multiplier application.
 * Implements 3-level pricing hierarchy:
 * 1. Postal code-specific pricing (highest priority)
 * 2. Country-level default pricing (fallback)
 * 3. Error if no pricing found
 */
@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geographicService: GeographicService,
  ) {}

  /**
   * Calculate final price for a service given the context
   * @param context - Pricing calculation context
   * @returns Calculated pricing result with all multipliers applied
   */
  async calculatePrice(context: PricingContext): Promise<PricingResult> {
    // Step 1: Find applicable pricing (postal code or country default)
    const pricing = await this.findApplicablePricing(
      context.serviceId,
      context.countryCode,
      context.businessUnit,
      context.postalCode,
    );

    // Step 2: Get service details for result
    const service = await this.prisma.serviceCatalog.findUnique({
      where: { id: context.serviceId },
      select: { name: true },
    });

    if (!service) {
      throw new NotFoundException(`Service ${context.serviceId} not found`);
    }

    // Step 3: Calculate final rate with multipliers
    let baseRateNum = Number(pricing.baseRate);
    const appliedMultipliers: PricingResult['appliedMultipliers'] = {};

    if (context.isOvertime) {
      const multiplier = Number(pricing.overtimeMultiplier);
      baseRateNum *= multiplier;
      appliedMultipliers.overtime = multiplier;
    }

    if (context.isWeekend) {
      const multiplier = Number(pricing.weekendMultiplier);
      baseRateNum *= multiplier;
      appliedMultipliers.weekend = multiplier;
    }

    if (context.isHoliday) {
      const multiplier = Number(pricing.holidayMultiplier);
      baseRateNum *= multiplier;
      appliedMultipliers.holiday = multiplier;
    }

    if (context.isUrgent) {
      const multiplier = Number(pricing.urgentMultiplier);
      baseRateNum *= multiplier;
      appliedMultipliers.urgent = multiplier;
    }

    // Step 4: Calculate total cost based on rate type
    let totalCost = baseRateNum;
    if (pricing.rateType === 'HOURLY' && context.durationMinutes) {
      totalCost = baseRateNum * (context.durationMinutes / 60);
    }

    // Round to 2 decimal places
    const finalRate = Math.round(baseRateNum * 100) / 100;
    totalCost = Math.round(totalCost * 100) / 100;

    return {
      serviceId: context.serviceId,
      serviceName: service.name,
      baseRate: Number(pricing.baseRate),
      currency: pricing.currency,
      rateType: pricing.rateType,
      appliedMultipliers,
      finalRate,
      totalCost,
      pricingLevel: pricing.postalCodeId ? 'POSTAL_CODE' : 'COUNTRY_DEFAULT',
      postalCodeId: pricing.postalCodeId ?? undefined,
      validFrom: pricing.validFrom,
      validUntil: pricing.validUntil ?? undefined,
    };
  }

  /**
   * Find applicable pricing using inheritance model
   * Priority: Postal code-specific → Country default
   * @param serviceId - Service UUID
   * @param countryCode - Country code (ES, FR, IT, PL)
   * @param businessUnit - Business unit code
   * @param postalCode - Optional postal code for granular pricing
   * @returns Pricing record (postal code or country default)
   */
  async findApplicablePricing(
    serviceId: string,
    countryCode: string,
    businessUnit: string,
    postalCode?: string,
  ) {
    const now = new Date();
    let postalCodeId: string | null = null;

    // Step 1: Resolve postal code to ID if provided
    if (postalCode) {
      try {
        const postalEntity =
          await this.geographicService.findPostalCodeByCode(postalCode);
        postalCodeId = postalEntity.id;

        // Validate postal code belongs to country
        await this.geographicService.validatePostalCodeForCountry(
          postalCode,
          countryCode,
        );
      } catch (error) {
        this.logger.warn(
          `Postal code ${postalCode} not found or invalid, falling back to country default`,
        );
        // Continue with postalCodeId = null (will use country default)
      }
    }

    // Step 2: Try postal code-specific pricing first (if postal code was provided and found)
    if (postalCodeId) {
      const postalCodePricing = await this.prisma.servicePricing.findFirst({
        where: {
          serviceId,
          countryCode,
          businessUnit,
          postalCodeId,
          validFrom: { lte: now },
          OR: [{ validUntil: null }, { validUntil: { gte: now } }],
        },
        orderBy: { validFrom: 'desc' }, // Most recent pricing if multiple
      });

      if (postalCodePricing) {
        this.logger.debug(
          `Found postal code-specific pricing for service ${serviceId} in ${postalCode}`,
        );
        return postalCodePricing;
      }

      this.logger.debug(
        `No postal code-specific pricing found for ${postalCode}, falling back to country default`,
      );
    }

    // Step 3: Fall back to country-level default pricing (postalCodeId = null)
    const countryDefaultPricing = await this.prisma.servicePricing.findFirst({
      where: {
        serviceId,
        countryCode,
        businessUnit,
        postalCodeId: null, // Country default
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
      },
      orderBy: { validFrom: 'desc' },
    });

    if (countryDefaultPricing) {
      this.logger.debug(
        `Using country default pricing for service ${serviceId} in ${countryCode}/${businessUnit}`,
      );
      return countryDefaultPricing;
    }

    // Step 4: No pricing found - throw error
    throw new NotFoundException(
      `No pricing found for service ${serviceId} in ${countryCode}/${businessUnit}` +
        (postalCode ? ` (postal code: ${postalCode})` : ''),
    );
  }

  /**
   * Create or update pricing for a service
   * @param serviceId - Service UUID
   * @param countryCode - Country code
   * @param businessUnit - Business unit code
   * @param postalCode - Optional postal code for granular pricing (null = country default)
   * @param pricingData - Pricing configuration
   * @param createdBy - User who created the pricing
   * @returns Created pricing record
   */
  async createPricing(
    serviceId: string,
    countryCode: string,
    businessUnit: string,
    postalCode: string | null,
    pricingData: {
      baseRate: number;
      currency: string;
      rateType: 'HOURLY' | 'FIXED';
      overtimeMultiplier?: number;
      weekendMultiplier?: number;
      holidayMultiplier?: number;
      urgentMultiplier?: number;
      validFrom: Date;
      validUntil?: Date;
    },
    createdBy: string,
  ) {
    let postalCodeId: string | null = null;

    // Resolve postal code to ID if provided
    if (postalCode) {
      const postalEntity =
        await this.geographicService.findPostalCodeByCode(postalCode);
      postalCodeId = postalEntity.id;

      // Validate postal code belongs to country
      await this.geographicService.validatePostalCodeForCountry(
        postalCode,
        countryCode,
      );
    }

    // Create pricing record
    return this.prisma.servicePricing.create({
      data: {
        serviceId,
        countryCode,
        businessUnit,
        postalCodeId,
        baseRate: new Decimal(pricingData.baseRate),
        currency: pricingData.currency,
        rateType: pricingData.rateType,
        overtimeMultiplier: pricingData.overtimeMultiplier
          ? new Decimal(pricingData.overtimeMultiplier)
          : new Decimal(1.5),
        weekendMultiplier: pricingData.weekendMultiplier
          ? new Decimal(pricingData.weekendMultiplier)
          : new Decimal(1.3),
        holidayMultiplier: pricingData.holidayMultiplier
          ? new Decimal(pricingData.holidayMultiplier)
          : new Decimal(1.5),
        urgentMultiplier: pricingData.urgentMultiplier
          ? new Decimal(pricingData.urgentMultiplier)
          : new Decimal(1.2),
        validFrom: pricingData.validFrom,
        validUntil: pricingData.validUntil,
        createdBy,
      },
    });
  }

  /**
   * Get all pricing records for a service
   * @param serviceId - Service UUID
   * @param includeExpired - Include expired pricing records (default: false)
   * @returns List of pricing records
   */
  async getPricingForService(
    serviceId: string,
    includeExpired: boolean = false,
  ) {
    const now = new Date();
    const where: any = { serviceId };

    if (!includeExpired) {
      where.OR = [{ validUntil: null }, { validUntil: { gte: now } }];
    }

    return this.prisma.servicePricing.findMany({
      where,
      include: {
        postalCode: {
          include: {
            city: {
              include: {
                province: {
                  include: {
                    country: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { countryCode: 'asc' },
        { businessUnit: 'asc' },
        { postalCodeId: 'asc' },
        { validFrom: 'desc' },
      ],
    });
  }

  /**
   * Update multipliers for an existing pricing record
   * @param pricingId - Pricing record UUID
   * @param multipliers - New multiplier values
   * @param updatedBy - User who updated the pricing
   * @returns Updated pricing record
   */
  async updateMultipliers(
    pricingId: string,
    multipliers: {
      overtimeMultiplier?: number;
      weekendMultiplier?: number;
      holidayMultiplier?: number;
      urgentMultiplier?: number;
    },
    updatedBy: string,
  ) {
    const data: any = { updatedBy };

    if (multipliers.overtimeMultiplier !== undefined) {
      data.overtimeMultiplier = new Decimal(multipliers.overtimeMultiplier);
    }
    if (multipliers.weekendMultiplier !== undefined) {
      data.weekendMultiplier = new Decimal(multipliers.weekendMultiplier);
    }
    if (multipliers.holidayMultiplier !== undefined) {
      data.holidayMultiplier = new Decimal(multipliers.holidayMultiplier);
    }
    if (multipliers.urgentMultiplier !== undefined) {
      data.urgentMultiplier = new Decimal(multipliers.urgentMultiplier);
    }

    return this.prisma.servicePricing.update({
      where: { id: pricingId },
      data,
    });
  }

  /**
   * Expire a pricing record (set validUntil to now)
   * @param pricingId - Pricing record UUID
   * @param updatedBy - User who expired the pricing
   * @returns Updated pricing record
   */
  async expirePricing(pricingId: string, updatedBy: string) {
    return this.prisma.servicePricing.update({
      where: { id: pricingId },
      data: {
        validUntil: new Date(),
        updatedBy,
      },
    });
  }
}
