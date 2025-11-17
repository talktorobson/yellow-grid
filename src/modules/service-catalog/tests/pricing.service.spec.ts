import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PricingService, PricingContext } from '../pricing.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { GeographicService } from '../geographic.service';
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: GeographicService,
          useValue: mockGeographicService,
        },
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

  describe('calculatePrice', () => {
    const mockService = {
      id: 'service-1',
      name: 'HVAC Installation',
    };

    const basePricing = {
      id: 'pricing-1',
      serviceId: 'service-1',
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      postalCodeId: null,
      baseRate: new Decimal(150.00),
      currency: 'EUR',
      rateType: 'FIXED' as const,
      overtimeMultiplier: new Decimal(1.5),
      weekendMultiplier: new Decimal(1.3),
      holidayMultiplier: new Decimal(1.5),
      urgentMultiplier: new Decimal(1.2),
      validFrom: new Date('2025-01-01'),
      validUntil: null,
    };

    beforeEach(() => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(mockService);
    });

    it('should calculate base price without multipliers', async () => {
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(basePricing);

      const context: PricingContext = {
        serviceId: 'service-1',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      };

      const result = await service.calculatePrice(context);

      expect(result).toEqual({
        serviceId: 'service-1',
        serviceName: 'HVAC Installation',
        baseRate: 150.00,
        currency: 'EUR',
        rateType: 'FIXED',
        appliedMultipliers: {},
        finalRate: 150.00,
        totalCost: 150.00,
        pricingLevel: 'COUNTRY_DEFAULT',
        postalCodeId: null,
        validFrom: basePricing.validFrom,
        validUntil: null,
      });
    });

    it('should apply overtime multiplier', async () => {
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(basePricing);

      const context: PricingContext = {
        serviceId: 'service-1',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        isOvertime: true,
      };

      const result = await service.calculatePrice(context);

      expect(result.appliedMultipliers.overtime).toBe(1.5);
      expect(result.finalRate).toBe(225.00); // 150 * 1.5
      expect(result.totalCost).toBe(225.00);
    });

    it('should apply weekend multiplier', async () => {
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(basePricing);

      const context: PricingContext = {
        serviceId: 'service-1',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        isWeekend: true,
      };

      const result = await service.calculatePrice(context);

      expect(result.appliedMultipliers.weekend).toBe(1.3);
      expect(result.finalRate).toBe(195.00); // 150 * 1.3
    });

    it('should apply multiple multipliers (stacking)', async () => {
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(basePricing);

      const context: PricingContext = {
        serviceId: 'service-1',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        isOvertime: true,
        isWeekend: true,
        isUrgent: true,
      };

      const result = await service.calculatePrice(context);

      expect(result.appliedMultipliers.overtime).toBe(1.5);
      expect(result.appliedMultipliers.weekend).toBe(1.3);
      expect(result.appliedMultipliers.urgent).toBe(1.2);
      // 150 * 1.5 * 1.3 * 1.2 = 351
      expect(result.finalRate).toBe(351.00);
      expect(result.totalCost).toBe(351.00);
    });

    it('should calculate hourly rate with duration', async () => {
      const hourlyPricing = {
        ...basePricing,
        rateType: 'HOURLY' as const,
        baseRate: new Decimal(50.00),
      };
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(hourlyPricing);

      const context: PricingContext = {
        serviceId: 'service-1',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        durationMinutes: 180, // 3 hours
      };

      const result = await service.calculatePrice(context);

      expect(result.rateType).toBe('HOURLY');
      expect(result.finalRate).toBe(50.00);
      expect(result.totalCost).toBe(150.00); // 50 * 3
    });

    it('should use postal code-specific pricing when available', async () => {
      const postalCodePricing = {
        ...basePricing,
        postalCodeId: 'postal-1',
        baseRate: new Decimal(175.00), // Premium pricing for Madrid center
      };

      mockGeographicService.findPostalCodeByCode.mockResolvedValue({
        id: 'postal-1',
        code: '28001',
      });
      mockGeographicService.validatePostalCodeForCountry.mockResolvedValue(true);
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(postalCodePricing);

      const context: PricingContext = {
        serviceId: 'service-1',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        postalCode: '28001',
      };

      const result = await service.calculatePrice(context);

      expect(result.baseRate).toBe(175.00);
      expect(result.pricingLevel).toBe('POSTAL_CODE');
      expect(result.postalCodeId).toBe('postal-1');
    });

    it('should throw NotFoundException when service not found', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);

      const context: PricingContext = {
        serviceId: 'non-existent',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      };

      await expect(service.calculatePrice(context)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findApplicablePricing', () => {
    const basePricing = {
      id: 'pricing-1',
      serviceId: 'service-1',
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      postalCodeId: null,
      baseRate: new Decimal(150.00),
      validFrom: new Date('2025-01-01'),
      validUntil: null,
    };

    it('should return postal code-specific pricing first', async () => {
      const postalCodePricing = {
        ...basePricing,
        postalCodeId: 'postal-1',
        baseRate: new Decimal(175.00),
      };

      mockGeographicService.findPostalCodeByCode.mockResolvedValue({
        id: 'postal-1',
        code: '28001',
      });
      mockGeographicService.validatePostalCodeForCountry.mockResolvedValue(true);
      mockPrismaService.servicePricing.findFirst
        .mockResolvedValueOnce(postalCodePricing);

      const result = await service.findApplicablePricing(
        'service-1',
        'ES',
        'LM_ES',
        '28001',
      );

      expect(result.postalCodeId).toBe('postal-1');
      expect(Number(result.baseRate)).toBe(175.00);
    });

    it('should fall back to country default when no postal code pricing', async () => {
      mockGeographicService.findPostalCodeByCode.mockResolvedValue({
        id: 'postal-1',
        code: '28001',
      });
      mockGeographicService.validatePostalCodeForCountry.mockResolvedValue(true);
      mockPrismaService.servicePricing.findFirst
        .mockResolvedValueOnce(null) // No postal code pricing
        .mockResolvedValueOnce(basePricing); // Country default

      const result = await service.findApplicablePricing(
        'service-1',
        'ES',
        'LM_ES',
        '28001',
      );

      expect(result.postalCodeId).toBe(null);
      expect(Number(result.baseRate)).toBe(150.00);
    });

    it('should fall back to country default when postal code not found', async () => {
      mockGeographicService.findPostalCodeByCode.mockRejectedValue(
        new NotFoundException(),
      );
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(basePricing);

      const result = await service.findApplicablePricing(
        'service-1',
        'ES',
        'LM_ES',
        '99999',
      );

      expect(result.postalCodeId).toBe(null);
    });

    it('should throw NotFoundException when no pricing found', async () => {
      mockPrismaService.servicePricing.findFirst.mockResolvedValue(null);

      await expect(
        service.findApplicablePricing('service-1', 'ES', 'LM_ES'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findApplicablePricing('service-1', 'ES', 'LM_ES'),
      ).rejects.toThrow('No pricing found for service');
    });
  });

  describe('createPricing', () => {
    it('should create pricing with postal code', async () => {
      mockGeographicService.findPostalCodeByCode.mockResolvedValue({
        id: 'postal-1',
        code: '28001',
      });
      mockGeographicService.validatePostalCodeForCountry.mockResolvedValue(true);
      mockPrismaService.servicePricing.create.mockResolvedValue({
        id: 'pricing-1',
      });

      const pricingData = {
        baseRate: 175.00,
        currency: 'EUR',
        rateType: 'FIXED' as const,
        validFrom: new Date('2025-01-01'),
      };

      await service.createPricing(
        'service-1',
        'ES',
        'LM_ES',
        '28001',
        pricingData,
        'admin@example.com',
      );

      expect(prisma.servicePricing.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          serviceId: 'service-1',
          countryCode: 'ES',
          businessUnit: 'LM_ES',
          postalCodeId: 'postal-1',
          createdBy: 'admin@example.com',
        }),
      });
    });

    it('should create country default pricing when postal code is null', async () => {
      mockPrismaService.servicePricing.create.mockResolvedValue({
        id: 'pricing-1',
      });

      const pricingData = {
        baseRate: 150.00,
        currency: 'EUR',
        rateType: 'FIXED' as const,
        validFrom: new Date('2025-01-01'),
      };

      await service.createPricing(
        'service-1',
        'ES',
        'LM_ES',
        null,
        pricingData,
        'admin@example.com',
      );

      expect(prisma.servicePricing.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          postalCodeId: null,
        }),
      });
    });
  });

  describe('updateMultipliers', () => {
    it('should update multipliers for a pricing record', async () => {
      mockPrismaService.servicePricing.update.mockResolvedValue({
        id: 'pricing-1',
      });

      await service.updateMultipliers(
        'pricing-1',
        {
          overtimeMultiplier: 1.6,
          weekendMultiplier: 1.4,
        },
        'admin@example.com',
      );

      expect(prisma.servicePricing.update).toHaveBeenCalledWith({
        where: { id: 'pricing-1' },
        data: expect.objectContaining({
          updatedBy: 'admin@example.com',
        }),
      });
    });
  });

  describe('expirePricing', () => {
    it('should set validUntil to now', async () => {
      const now = new Date();
      jest.spyOn(global, 'Date').mockImplementationOnce(() => now as any);

      mockPrismaService.servicePricing.update.mockResolvedValue({
        id: 'pricing-1',
      });

      await service.expirePricing('pricing-1', 'admin@example.com');

      expect(prisma.servicePricing.update).toHaveBeenCalledWith({
        where: { id: 'pricing-1' },
        data: {
          validUntil: now,
          updatedBy: 'admin@example.com',
        },
      });
    });
  });
});
