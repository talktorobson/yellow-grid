import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GeographicService } from './geographic.service';
import { NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('PricingService', () => {
  let service: PricingService;
  let prisma: PrismaService;
  let geographicService: GeographicService;

  const mockPrismaService = {
    serviceCatalog: {
      findUnique: jest.fn(),
    },
    servicePricing: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockGeographicService = {
    findPostalCodeByCode: jest.fn(),
    validatePostalCodeForCountry: jest.fn(),
  };

  const mockPricing = {
    id: 'pricing-uuid-1',
    serviceId: 'service-uuid-1',
    countryCode: 'ES',
    businessUnit: 'LM',
    postalCodeId: null,
    baseRate: new Decimal(100),
    currency: 'EUR',
    rateType: 'FIXED' as const,
    overtimeMultiplier: new Decimal(1.5),
    weekendMultiplier: new Decimal(1.3),
    holidayMultiplier: new Decimal(1.5),
    urgentMultiplier: new Decimal(1.2),
    validFrom: new Date('2025-01-01'),
    validUntil: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'system',
    updatedBy: 'system',
  };

  const mockPostalCode = {
    id: 'postal-uuid-1',
    code: '28001',
    cityId: 'city-uuid-1',
    city: {
      id: 'city-uuid-1',
      code: '28',
      name: 'Madrid',
      provinceId: 'province-uuid-1',
      province: {
        id: 'province-uuid-1',
        code: '28',
        name: 'Madrid',
        countryCode: 'ES',
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: GeographicService, useValue: mockGeographicService },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    prisma = module.get<PrismaService>(PrismaService);
    geographicService = module.get<GeographicService>(GeographicService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // CALCULATE PRICE
  // ============================================================================

  describe('calculatePrice', () => {
    const context = {
      serviceId: 'service-uuid-1',
      countryCode: 'ES',
      businessUnit: 'LM',
    };

    const mockService = {
      name: 'Air Conditioning Installation',
    };

    beforeEach(() => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(mockService);
    });

    it('should calculate price with base rate (no multipliers)', async () => {
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(mockPricing);

      const result = await service.calculatePrice(context);

      expect(result).toEqual({
        serviceId: 'service-uuid-1',
        serviceName: 'Air Conditioning Installation',
        baseRate: 100,
        currency: 'EUR',
        rateType: 'FIXED',
        appliedMultipliers: {},
        finalRate: 100,
        totalCost: 100,
        pricingLevel: 'COUNTRY_DEFAULT',
        postalCodeId: undefined,
        validFrom: mockPricing.validFrom,
        validUntil: undefined,
      });
    });

    it('should apply overtime multiplier', async () => {
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(mockPricing);

      const result = await service.calculatePrice({
        ...context,
        isOvertime: true,
      });

      expect(result.appliedMultipliers.overtime).toBe(1.5);
      expect(result.finalRate).toBe(150); // 100 * 1.5
      expect(result.totalCost).toBe(150);
    });

    it('should apply weekend multiplier', async () => {
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(mockPricing);

      const result = await service.calculatePrice({
        ...context,
        isWeekend: true,
      });

      expect(result.appliedMultipliers.weekend).toBe(1.3);
      expect(result.finalRate).toBe(130); // 100 * 1.3
      expect(result.totalCost).toBe(130);
    });

    it('should apply holiday multiplier', async () => {
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(mockPricing);

      const result = await service.calculatePrice({
        ...context,
        isHoliday: true,
      });

      expect(result.appliedMultipliers.holiday).toBe(1.5);
      expect(result.finalRate).toBe(150); // 100 * 1.5
      expect(result.totalCost).toBe(150);
    });

    it('should apply urgent multiplier', async () => {
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(mockPricing);

      const result = await service.calculatePrice({
        ...context,
        isUrgent: true,
      });

      expect(result.appliedMultipliers.urgent).toBe(1.2);
      expect(result.finalRate).toBe(120); // 100 * 1.2
      expect(result.totalCost).toBe(120);
    });

    it('should apply multiple multipliers (multiplicative)', async () => {
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(mockPricing);

      const result = await service.calculatePrice({
        ...context,
        isOvertime: true,
        isWeekend: true,
      });

      expect(result.appliedMultipliers.overtime).toBe(1.5);
      expect(result.appliedMultipliers.weekend).toBe(1.3);
      expect(result.finalRate).toBe(195); // 100 * 1.5 * 1.3
      expect(result.totalCost).toBe(195);
    });

    it('should calculate total cost for hourly rate', async () => {
      const hourlyPricing = { ...mockPricing, rateType: 'HOURLY' as const };
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(hourlyPricing);

      const result = await service.calculatePrice({
        ...context,
        durationMinutes: 180, // 3 hours
      });

      expect(result.rateType).toBe('HOURLY');
      expect(result.finalRate).toBe(100); // Rate per hour
      expect(result.totalCost).toBe(300); // 100 * 3
    });

    it('should calculate total cost for hourly rate with multipliers', async () => {
      const hourlyPricing = { ...mockPricing, rateType: 'HOURLY' as const };
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(hourlyPricing);

      const result = await service.calculatePrice({
        ...context,
        durationMinutes: 120, // 2 hours
        isOvertime: true, // 1.5x
      });

      expect(result.finalRate).toBe(150); // 100 * 1.5
      expect(result.totalCost).toBe(300); // 150 * 2
    });

    it('should round to 2 decimal places', async () => {
      const pricingWith33 = {
        ...mockPricing,
        baseRate: new Decimal(33.33),
        overtimeMultiplier: new Decimal(1.5),
      };
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(pricingWith33);

      const result = await service.calculatePrice({
        ...context,
        isOvertime: true,
      });

      expect(result.finalRate).toBe(50); // 33.33 * 1.5 = 49.995, rounded to 50
    });

    it('should throw NotFoundException if service not found', async () => {
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(mockPricing);
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);

      await expect(service.calculatePrice(context)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.calculatePrice(context)).rejects.toThrow(
        'Service service-uuid-1 not found',
      );
    });
  });

  // ============================================================================
  // FIND APPLICABLE PRICING (Inheritance)
  // ============================================================================

  describe('findApplicablePricing', () => {
    it('should return country default pricing when no postal code provided', async () => {
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(mockPricing);

      const result = await service.findApplicablePricing(
        'service-uuid-1',
        'ES',
        'LM',
      );

      expect(result).toEqual(mockPricing);
      expect(prisma.servicePricing.findFirst).toHaveBeenCalledWith({
        where: {
          serviceId: 'service-uuid-1',
          countryCode: 'ES',
          businessUnit: 'LM',
          postalCodeId: null,
          validFrom: { lte: expect.any(Date) },
          OR: [{ validUntil: null }, { validUntil: { gte: expect.any(Date) } }],
        },
        orderBy: { validFrom: 'desc' },
      });
    });

    it('should return postal code-specific pricing when available', async () => {
      mockGeographicService.findPostalCodeByCode.mockResolvedValue(mockPostalCode);
      mockGeographicService.validatePostalCodeForCountry.mockResolvedValue(true);

      const postalCodePricing = { ...mockPricing, postalCodeId: 'postal-uuid-1' };
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(
        postalCodePricing,
      );

      const result = await service.findApplicablePricing(
        'service-uuid-1',
        'ES',
        'LM',
        '28001',
      );

      expect(result).toEqual(postalCodePricing);
      expect(result.postalCodeId).toBe('postal-uuid-1');
      expect(geographicService.findPostalCodeByCode).toHaveBeenCalledWith('28001');
    });

    it('should fall back to country default if postal code pricing not found', async () => {
      mockGeographicService.findPostalCodeByCode.mockResolvedValue(mockPostalCode);
      mockGeographicService.validatePostalCodeForCountry.mockResolvedValue(true);

      mockPrismaService.servicePricing.findFirst
        .mockResolvedValueOnce(null) // Postal code pricing not found
        .mockResolvedValueOnce(mockPricing); // Country default found

      const result = await service.findApplicablePricing(
        'service-uuid-1',
        'ES',
        'LM',
        '28001',
      );

      expect(result).toEqual(mockPricing);
      expect(result.postalCodeId).toBeNull();
      expect(prisma.servicePricing.findFirst).toHaveBeenCalledTimes(2);
    });

    it('should fall back to country default if postal code not found', async () => {
      mockGeographicService.findPostalCodeByCode.mockRejectedValue(
        new NotFoundException('Postal code not found'),
      );

      mockPrismaService.servicePricing.findFirst.mockResolvedValue(mockPricing);

      const result = await service.findApplicablePricing(
        'service-uuid-1',
        'ES',
        'LM',
        'INVALID',
      );

      expect(result).toEqual(mockPricing);
      expect(result.postalCodeId).toBeNull();
    });

    it('should fall back to country default if postal code validation fails', async () => {
      mockGeographicService.findPostalCodeByCode.mockResolvedValue(mockPostalCode);
      mockGeographicService.validatePostalCodeForCountry.mockRejectedValue(
        new NotFoundException('Postal code does not belong to country'),
      );

      mockPrismaService.servicePricing.findFirst.mockResolvedValue(mockPricing);

      const result = await service.findApplicablePricing(
        'service-uuid-1',
        'ES',
        'LM',
        '75001', // French postal code in Spain query
      );

      expect(result).toEqual(mockPricing);
    });

    it('should throw NotFoundException if no pricing found', async () => {
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(null);

      await expect(
        service.findApplicablePricing('service-uuid-1', 'ES', 'LM'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findApplicablePricing('service-uuid-1', 'ES', 'LM'),
      ).rejects.toThrow(
        'No pricing found for service service-uuid-1 in ES/LM',
      );
    });

    it('should include postal code in error message when provided', async () => {
      mockGeographicService.findPostalCodeByCode.mockResolvedValue(mockPostalCode);
      mockGeographicService.validatePostalCodeForCountry.mockResolvedValue(true);
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(null);

      await expect(
        service.findApplicablePricing('service-uuid-1', 'ES', 'LM', '28001'),
      ).rejects.toThrow('(postal code: 28001)');
    });

    it('should filter by valid date range', async () => {
      const now = new Date();
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(mockPricing);

      await service.findApplicablePricing('service-uuid-1', 'ES', 'LM');

      expect(prisma.servicePricing.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            validFrom: { lte: expect.any(Date) },
            OR: [
              { validUntil: null },
              { validUntil: { gte: expect.any(Date) } },
            ],
          }),
        }),
      );
    });

    it('should order by validFrom desc to get most recent pricing', async () => {
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(mockPricing);

      await service.findApplicablePricing('service-uuid-1', 'ES', 'LM');

      expect(prisma.servicePricing.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { validFrom: 'desc' },
        }),
      );
    });
  });

  // ============================================================================
  // CREATE PRICING
  // ============================================================================

  describe('createPricing', () => {
    const pricingData = {
      baseRate: 150,
      currency: 'EUR',
      rateType: 'FIXED' as const,
      overtimeMultiplier: 1.6,
      weekendMultiplier: 1.4,
      holidayMultiplier: 1.6,
      urgentMultiplier: 1.3,
      validFrom: new Date('2025-02-01'),
      validUntil: new Date('2025-12-31'),
    };

    it('should create country default pricing', async () => {
      mockPrismaService.servicePricing.create.mockResolvedValue({
        ...mockPricing,
        ...pricingData,
      });

      const result = await service.createPricing(
        'service-uuid-1',
        'ES',
        'LM',
        null,
        pricingData,
        'admin@test.com',
      );

      expect(prisma.servicePricing.create).toHaveBeenCalledWith({
        data: {
          serviceId: 'service-uuid-1',
          countryCode: 'ES',
          businessUnit: 'LM',
          postalCodeId: null,
          baseRate: new Decimal(150),
          currency: 'EUR',
          rateType: 'FIXED',
          overtimeMultiplier: new Decimal(1.6),
          weekendMultiplier: new Decimal(1.4),
          holidayMultiplier: new Decimal(1.6),
          urgentMultiplier: new Decimal(1.3),
          validFrom: pricingData.validFrom,
          validUntil: pricingData.validUntil,
          createdBy: 'admin@test.com',
        },
      });
    });

    it('should create postal code-specific pricing', async () => {
      mockGeographicService.findPostalCodeByCode.mockResolvedValue(mockPostalCode);
      mockGeographicService.validatePostalCodeForCountry.mockResolvedValue(true);
      mockPrismaService.servicePricing.create.mockResolvedValue({
        ...mockPricing,
        postalCodeId: 'postal-uuid-1',
      });

      await service.createPricing(
        'service-uuid-1',
        'ES',
        'LM',
        '28001',
        pricingData,
        'admin@test.com',
      );

      expect(geographicService.findPostalCodeByCode).toHaveBeenCalledWith('28001');
      expect(
        geographicService.validatePostalCodeForCountry,
      ).toHaveBeenCalledWith('28001', 'ES');
      expect(prisma.servicePricing.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            postalCodeId: 'postal-uuid-1',
          }),
        }),
      );
    });

    it('should use default multipliers if not provided', async () => {
      const minimalPricingData = {
        baseRate: 100,
        currency: 'EUR',
        rateType: 'FIXED' as const,
        validFrom: new Date('2025-01-01'),
      };

      mockPrismaService.servicePricing.create.mockResolvedValue(mockPricing);

      await service.createPricing(
        'service-uuid-1',
        'ES',
        'LM',
        null,
        minimalPricingData,
        'admin@test.com',
      );

      expect(prisma.servicePricing.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            overtimeMultiplier: new Decimal(1.5),
            weekendMultiplier: new Decimal(1.3),
            holidayMultiplier: new Decimal(1.5),
            urgentMultiplier: new Decimal(1.2),
          }),
        }),
      );
    });
  });

  // ============================================================================
  // GET PRICING FOR SERVICE
  // ============================================================================

  describe('getPricingForService', () => {
    it('should get all active pricing for a service', async () => {
      const pricingRecords = [mockPricing];
      mockPrismaService.servicePricing.findMany.mockResolvedValue(pricingRecords);

      const result = await service.getPricingForService('service-uuid-1');

      expect(result).toEqual(pricingRecords);
      expect(prisma.servicePricing.findMany).toHaveBeenCalledWith({
        where: {
          serviceId: 'service-uuid-1',
          OR: [
            { validUntil: null },
            { validUntil: { gte: expect.any(Date) } },
          ],
        },
        include: expect.any(Object),
        orderBy: [
          { countryCode: 'asc' },
          { businessUnit: 'asc' },
          { postalCodeId: 'asc' },
          { validFrom: 'desc' },
        ],
      });
    });

    it('should include expired pricing when requested', async () => {
      mockPrismaService.servicePricing.findMany.mockResolvedValue([]);

      await service.getPricingForService('service-uuid-1', true);

      expect(prisma.servicePricing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            serviceId: 'service-uuid-1',
          },
        }),
      );
    });
  });

  // ============================================================================
  // UPDATE MULTIPLIERS
  // ============================================================================

  describe('updateMultipliers', () => {
    it('should update overtime multiplier', async () => {
      const updated = { ...mockPricing, overtimeMultiplier: new Decimal(1.8) };
      mockPrismaService.servicePricing.update.mockResolvedValue(updated);

      await service.updateMultipliers(
        'pricing-uuid-1',
        { overtimeMultiplier: 1.8 },
        'admin@test.com',
      );

      expect(prisma.servicePricing.update).toHaveBeenCalledWith({
        where: { id: 'pricing-uuid-1' },
        data: {
          overtimeMultiplier: new Decimal(1.8),
          updatedBy: 'admin@test.com',
        },
      });
    });

    it('should update multiple multipliers', async () => {
      mockPrismaService.servicePricing.update.mockResolvedValue(mockPricing);

      await service.updateMultipliers(
        'pricing-uuid-1',
        {
          overtimeMultiplier: 1.7,
          weekendMultiplier: 1.5,
          urgentMultiplier: 1.25,
        },
        'admin@test.com',
      );

      expect(prisma.servicePricing.update).toHaveBeenCalledWith({
        where: { id: 'pricing-uuid-1' },
        data: {
          overtimeMultiplier: new Decimal(1.7),
          weekendMultiplier: new Decimal(1.5),
          urgentMultiplier: new Decimal(1.25),
          updatedBy: 'admin@test.com',
        },
      });
    });

    it('should not update multipliers not provided', async () => {
      mockPrismaService.servicePricing.update.mockResolvedValue(mockPricing);

      await service.updateMultipliers(
        'pricing-uuid-1',
        { overtimeMultiplier: 1.6 },
        'admin@test.com',
      );

      const callArgs = (prisma.servicePricing.update as jest.Mock).mock.calls[0][0];
      expect(callArgs.data).not.toHaveProperty('weekendMultiplier');
      expect(callArgs.data).not.toHaveProperty('holidayMultiplier');
    });
  });

  // ============================================================================
  // EXPIRE PRICING
  // ============================================================================

  describe('expirePricing', () => {
    it('should set validUntil to now', async () => {
      const expired = { ...mockPricing, validUntil: new Date() };
      mockPrismaService.servicePricing.update.mockResolvedValue(expired);

      await service.expirePricing('pricing-uuid-1', 'admin@test.com');

      expect(prisma.servicePricing.update).toHaveBeenCalledWith({
        where: { id: 'pricing-uuid-1' },
        data: {
          validUntil: expect.any(Date),
          updatedBy: 'admin@test.com',
        },
      });
    });
  });
});
