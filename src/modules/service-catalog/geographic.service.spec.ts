import { Test, TestingModule } from '@nestjs/testing';
import { GeographicService } from './geographic.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

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

  const mockCountry = {
    id: 'country-uuid-1',
    code: 'ES',
    name: 'Spain',
    timezone: 'Europe/Madrid',
    currency: 'EUR',
    locale: 'es-ES',
  };

  const mockProvince = {
    id: 'province-uuid-1',
    code: '28',
    name: 'Madrid',
    countryCode: 'ES',
    country: mockCountry,
  };

  const mockCity = {
    id: 'city-uuid-1',
    code: '28',
    name: 'Madrid',
    provinceId: 'province-uuid-1',
    province: mockProvince,
  };

  const mockPostalCode = {
    id: 'postal-uuid-1',
    code: '28001',
    cityId: 'city-uuid-1',
    city: mockCity,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeographicService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GeographicService>(GeographicService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // POSTAL CODE METHODS
  // ============================================================================

  describe('findPostalCodeByCode', () => {
    it('should find postal code with full hierarchy', async () => {
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

  describe('findPostalCodesByCity', () => {
    it('should find all postal codes for a city', async () => {
      const postalCodes = [
        { ...mockPostalCode, code: '28001' },
        { ...mockPostalCode, code: '28002', id: 'postal-uuid-2' },
        { ...mockPostalCode, code: '28003', id: 'postal-uuid-3' },
      ];
      mockPrismaService.postalCode.findMany.mockResolvedValue(postalCodes);

      const result = await service.findPostalCodesByCity('city-uuid-1');

      expect(result).toEqual(postalCodes);
      expect(prisma.postalCode.findMany).toHaveBeenCalledWith({
        where: { cityId: 'city-uuid-1' },
        orderBy: { code: 'asc' },
      });
    });
  });

  describe('findCityByPostalCode', () => {
    it('should find city by postal code', async () => {
      mockPrismaService.postalCode.findFirst.mockResolvedValue(mockPostalCode);

      const result = await service.findCityByPostalCode('28001');

      expect(result).toEqual(mockCity);
    });

    it('should throw NotFoundException when postal code not found', async () => {
      mockPrismaService.postalCode.findFirst.mockResolvedValue(null);

      await expect(service.findCityByPostalCode('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('searchPostalCodes', () => {
    it('should search postal codes by prefix', async () => {
      const results = [mockPostalCode];
      mockPrismaService.postalCode.findMany.mockResolvedValue(results);

      const result = await service.searchPostalCodes('280');

      expect(result).toEqual(results);
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
      mockPrismaService.postalCode.findMany.mockResolvedValue([mockPostalCode]);

      await service.searchPostalCodes('28', 'ES');

      expect(prisma.postalCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            code: {
              startsWith: '28',
            },
            city: {
              province: {
                countryCode: 'ES',
              },
            },
          },
        }),
      );
    });

    it('should respect limit parameter', async () => {
      mockPrismaService.postalCode.findMany.mockResolvedValue([mockPostalCode]);

      await service.searchPostalCodes('28', undefined, 10);

      expect(prisma.postalCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });

    it('should use default limit of 20', async () => {
      mockPrismaService.postalCode.findMany.mockResolvedValue([mockPostalCode]);

      await service.searchPostalCodes('28');

      expect(prisma.postalCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        }),
      );
    });
  });

  // ============================================================================
  // COUNTRY METHODS
  // ============================================================================

  describe('findCountryByCode', () => {
    it('should find country by code', async () => {
      mockPrismaService.country.findUnique.mockResolvedValue(mockCountry);

      const result = await service.findCountryByCode('ES');

      expect(result).toEqual(mockCountry);
      expect(prisma.country.findUnique).toHaveBeenCalledWith({
        where: { code: 'ES' },
      });
    });

    it('should throw NotFoundException when country not found', async () => {
      mockPrismaService.country.findUnique.mockResolvedValue(null);

      await expect(service.findCountryByCode('ZZ')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findCountryByCode('ZZ')).rejects.toThrow(
        'Country with code ZZ not found',
      );
    });
  });

  describe('findAllCountries', () => {
    it('should find all countries ordered by code', async () => {
      const countries = [
        mockCountry,
        { ...mockCountry, id: 'country-uuid-2', code: 'FR', name: 'France' },
        { ...mockCountry, id: 'country-uuid-3', code: 'IT', name: 'Italy' },
      ];
      mockPrismaService.country.findMany.mockResolvedValue(countries);

      const result = await service.findAllCountries();

      expect(result).toEqual(countries);
      expect(prisma.country.findMany).toHaveBeenCalledWith({
        orderBy: { code: 'asc' },
      });
    });
  });

  // ============================================================================
  // PROVINCE METHODS
  // ============================================================================

  describe('findProvincesByCountry', () => {
    it('should find provinces by country code', async () => {
      const provinces = [
        mockProvince,
        {
          ...mockProvince,
          id: 'province-uuid-2',
          code: '08',
          name: 'Barcelona',
        },
      ];
      mockPrismaService.province.findMany.mockResolvedValue(provinces);

      const result = await service.findProvincesByCountry('ES');

      expect(result).toEqual(provinces);
      expect(prisma.province.findMany).toHaveBeenCalledWith({
        where: { countryCode: 'ES' },
        orderBy: { name: 'asc' },
      });
    });
  });

  // ============================================================================
  // CITY METHODS
  // ============================================================================

  describe('findCitiesByProvince', () => {
    it('should find cities by province ID', async () => {
      const cities = [
        mockCity,
        { ...mockCity, id: 'city-uuid-2', name: 'Getafe' },
      ];
      mockPrismaService.city.findMany.mockResolvedValue(cities);

      const result = await service.findCitiesByProvince('province-uuid-1');

      expect(result).toEqual(cities);
      expect(prisma.city.findMany).toHaveBeenCalledWith({
        where: { provinceId: 'province-uuid-1' },
        orderBy: { name: 'asc' },
      });
    });
  });

  // ============================================================================
  // GEOGRAPHIC HIERARCHY
  // ============================================================================

  describe('getGeographicHierarchy', () => {
    it('should return structured hierarchy for postal code', async () => {
      mockPrismaService.postalCode.findFirst.mockResolvedValue(mockPostalCode);

      const result = await service.getGeographicHierarchy('28001');

      expect(result).toEqual({
        postalCode: {
          id: 'postal-uuid-1',
          code: '28001',
        },
        city: {
          id: 'city-uuid-1',
          code: '28',
          name: 'Madrid',
        },
        province: {
          id: 'province-uuid-1',
          code: '28',
          name: 'Madrid',
        },
        country: {
          id: 'country-uuid-1',
          code: 'ES',
          name: 'Spain',
          timezone: 'Europe/Madrid',
          currency: 'EUR',
          locale: 'es-ES',
        },
      });
    });

    it('should throw NotFoundException when postal code not found', async () => {
      mockPrismaService.postalCode.findFirst.mockResolvedValue(null);

      await expect(service.getGeographicHierarchy('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================================
  // VALIDATION
  // ============================================================================

  describe('validatePostalCodeForCountry', () => {
    it('should return true when postal code belongs to country', async () => {
      mockPrismaService.postalCode.findFirst.mockResolvedValue(mockPostalCode);

      const result = await service.validatePostalCodeForCountry('28001', 'ES');

      expect(result).toBe(true);
    });

    it('should throw NotFoundException when postal code does not belong to country', async () => {
      const frenchPostalCode = {
        ...mockPostalCode,
        code: '75001',
        city: {
          ...mockCity,
          province: {
            ...mockProvince,
            countryCode: 'FR',
          },
        },
      };
      mockPrismaService.postalCode.findFirst.mockResolvedValue(frenchPostalCode);

      await expect(
        service.validatePostalCodeForCountry('75001', 'ES'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.validatePostalCodeForCountry('75001', 'ES'),
      ).rejects.toThrow('Postal code 75001 does not belong to country ES');
    });

    it('should throw NotFoundException when postal code not found', async () => {
      mockPrismaService.postalCode.findFirst.mockResolvedValue(null);

      await expect(
        service.validatePostalCodeForCountry('INVALID', 'ES'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
