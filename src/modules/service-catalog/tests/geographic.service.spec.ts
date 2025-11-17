import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GeographicService } from '../geographic.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

describe('GeographicService', () => {
  let service: GeographicService;
  let prisma: PrismaService;

  const mockPrismaService = {
    postalCode: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    country: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    province: {
      findMany: jest.fn(),
    },
    city: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeographicService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<GeographicService>(GeographicService);
    prisma = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findPostalCodeByCode', () => {
    const mockPostalCode = {
      id: 'postal-1',
      code: '28001',
      cityId: 'city-1',
      city: {
        id: 'city-1',
        code: 'MAD',
        name: 'Madrid',
        provinceId: 'province-1',
        province: {
          id: 'province-1',
          code: '28',
          name: 'Madrid',
          countryCode: 'ES',
          country: {
            id: 'country-1',
            code: 'ES',
            name: 'Spain',
            timezone: 'Europe/Madrid',
            currency: 'EUR',
            locale: 'es-ES',
          },
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return postal code with full hierarchy', async () => {
      mockPrismaService.postalCode.findFirst.mockResolvedValue(mockPostalCode);

      const result = await service.findPostalCodeByCode('28001');

      expect(result).toEqual(mockPostalCode);
      expect(prisma.postalCode.findFirst).toHaveBeenCalledWith({
        where: { code: '28001' },
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
      });
    });

    it('should throw NotFoundException when postal code not found', async () => {
      mockPrismaService.postalCode.findFirst.mockResolvedValue(null);

      await expect(service.findPostalCodeByCode('99999')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findPostalCodeByCode('99999')).rejects.toThrow(
        'Postal code 99999 not found in geographic database',
      );
    });
  });

  describe('findCountryByCode', () => {
    const mockCountry = {
      id: 'country-1',
      code: 'ES',
      name: 'Spain',
      timezone: 'Europe/Madrid',
      currency: 'EUR',
      locale: 'es-ES',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return country by code', async () => {
      mockPrismaService.country.findUnique.mockResolvedValue(mockCountry);

      const result = await service.findCountryByCode('ES');

      expect(result).toEqual(mockCountry);
      expect(prisma.country.findUnique).toHaveBeenCalledWith({
        where: { code: 'ES' },
      });
    });

    it('should throw NotFoundException when country not found', async () => {
      mockPrismaService.country.findUnique.mockResolvedValue(null);

      await expect(service.findCountryByCode('XX')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findCountryByCode('XX')).rejects.toThrow(
        'Country with code XX not found',
      );
    });
  });

  describe('findAllCountries', () => {
    const mockCountries = [
      { id: '1', code: 'ES', name: 'Spain', timezone: 'Europe/Madrid', currency: 'EUR', locale: 'es-ES' },
      { id: '2', code: 'FR', name: 'France', timezone: 'Europe/Paris', currency: 'EUR', locale: 'fr-FR' },
      { id: '3', code: 'IT', name: 'Italy', timezone: 'Europe/Rome', currency: 'EUR', locale: 'it-IT' },
      { id: '4', code: 'PL', name: 'Poland', timezone: 'Europe/Warsaw', currency: 'PLN', locale: 'pl-PL' },
    ];

    it('should return all countries ordered by code', async () => {
      mockPrismaService.country.findMany.mockResolvedValue(mockCountries);

      const result = await service.findAllCountries();

      expect(result).toEqual(mockCountries);
      expect(prisma.country.findMany).toHaveBeenCalledWith({
        orderBy: { code: 'asc' },
      });
    });
  });

  describe('getGeographicHierarchy', () => {
    const mockPostalCode = {
      id: 'postal-1',
      code: '28001',
      cityId: 'city-1',
      city: {
        id: 'city-1',
        code: 'MAD',
        name: 'Madrid',
        provinceId: 'province-1',
        province: {
          id: 'province-1',
          code: '28',
          name: 'Madrid',
          countryCode: 'ES',
          country: {
            id: 'country-1',
            code: 'ES',
            name: 'Spain',
            timezone: 'Europe/Madrid',
            currency: 'EUR',
            locale: 'es-ES',
          },
        },
      },
    };

    it('should return structured hierarchy', async () => {
      mockPrismaService.postalCode.findFirst.mockResolvedValue(mockPostalCode);

      const result = await service.getGeographicHierarchy('28001');

      expect(result).toEqual({
        postalCode: {
          id: 'postal-1',
          code: '28001',
        },
        city: {
          id: 'city-1',
          code: 'MAD',
          name: 'Madrid',
        },
        province: {
          id: 'province-1',
          code: '28',
          name: 'Madrid',
        },
        country: {
          id: 'country-1',
          code: 'ES',
          name: 'Spain',
          timezone: 'Europe/Madrid',
          currency: 'EUR',
          locale: 'es-ES',
        },
      });
    });
  });

  describe('validatePostalCodeForCountry', () => {
    const mockPostalCode = {
      id: 'postal-1',
      code: '28001',
      city: {
        province: {
          countryCode: 'ES',
        },
      },
    };

    it('should return true when postal code belongs to country', async () => {
      mockPrismaService.postalCode.findFirst.mockResolvedValue(mockPostalCode);

      const result = await service.validatePostalCodeForCountry('28001', 'ES');

      expect(result).toBe(true);
    });

    it('should throw NotFoundException when postal code does not belong to country', async () => {
      mockPrismaService.postalCode.findFirst.mockResolvedValue(mockPostalCode);

      await expect(
        service.validatePostalCodeForCountry('28001', 'FR'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.validatePostalCodeForCountry('28001', 'FR'),
      ).rejects.toThrow('Postal code 28001 does not belong to country FR');
    });
  });

  describe('searchPostalCodes', () => {
    const mockResults = [
      {
        id: 'postal-1',
        code: '28001',
        city: {
          name: 'Madrid',
          province: {
            name: 'Madrid',
            country: { name: 'Spain' },
          },
        },
      },
      {
        id: 'postal-2',
        code: '28002',
        city: {
          name: 'Madrid',
          province: {
            name: 'Madrid',
            country: { name: 'Spain' },
          },
        },
      },
    ];

    it('should search postal codes by prefix', async () => {
      mockPrismaService.postalCode.findMany.mockResolvedValue(mockResults);

      const result = await service.searchPostalCodes('280');

      expect(result).toEqual(mockResults);
      expect(prisma.postalCode.findMany).toHaveBeenCalledWith({
        where: {
          code: {
            startsWith: '280',
          },
        },
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
        take: 20,
        orderBy: { code: 'asc' },
      });
    });

    it('should filter by country code when provided', async () => {
      mockPrismaService.postalCode.findMany.mockResolvedValue(mockResults);

      await service.searchPostalCodes('280', 'ES', 10);

      expect(prisma.postalCode.findMany).toHaveBeenCalledWith({
        where: {
          code: {
            startsWith: '280',
          },
          city: {
            province: {
              countryCode: 'ES',
            },
          },
        },
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
        take: 10,
        orderBy: { code: 'asc' },
      });
    });
  });

  describe('findPostalCodesByCity', () => {
    const mockPostalCodes = [
      { id: '1', code: '28001', cityId: 'city-1' },
      { id: '2', code: '28002', cityId: 'city-1' },
      { id: '3', code: '28003', cityId: 'city-1' },
    ];

    it('should return postal codes for a city', async () => {
      mockPrismaService.postalCode.findMany.mockResolvedValue(mockPostalCodes);

      const result = await service.findPostalCodesByCity('city-1');

      expect(result).toEqual(mockPostalCodes);
      expect(prisma.postalCode.findMany).toHaveBeenCalledWith({
        where: { cityId: 'city-1' },
        orderBy: { code: 'asc' },
      });
    });
  });
});
