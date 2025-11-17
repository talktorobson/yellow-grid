import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Geographic Service
 *
 * Handles postal code resolution and geographic hierarchy navigation.
 * Supports 3-level hierarchy: Country → Province → City → Postal Code
 */
@Injectable()
export class GeographicService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find postal code by code string with full hierarchy
   * @param postalCode - Postal code string (e.g., "28001", "75001")
   * @returns Postal code with city, province, and country relations
   */
  async findPostalCodeByCode(postalCode: string) {
    const result = await this.prisma.postalCode.findFirst({
      where: { code: postalCode },
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

    if (!result) {
      throw new NotFoundException(
        `Postal code ${postalCode} not found in geographic database`,
      );
    }

    return result;
  }

  /**
   * Find postal codes by city ID
   * @param cityId - City UUID
   * @returns List of postal codes for the city
   */
  async findPostalCodesByCity(cityId: string) {
    return this.prisma.postalCode.findMany({
      where: { cityId },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Find city by postal code (convenience method)
   * @param postalCode - Postal code string
   * @returns City with province and country
   */
  async findCityByPostalCode(postalCode: string) {
    const postal = await this.findPostalCodeByCode(postalCode);
    return postal.city;
  }

  /**
   * Find country by country code
   * @param countryCode - 2-3 letter country code (ES, FR, IT, PL)
   * @returns Country entity
   */
  async findCountryByCode(countryCode: string) {
    const country = await this.prisma.country.findUnique({
      where: { code: countryCode },
    });

    if (!country) {
      throw new NotFoundException(
        `Country with code ${countryCode} not found`,
      );
    }

    return country;
  }

  /**
   * Find all countries
   * @returns List of all countries in the system
   */
  async findAllCountries() {
    return this.prisma.country.findMany({
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Find provinces by country code
   * @param countryCode - Country code (ES, FR, IT, PL)
   * @returns List of provinces for the country
   */
  async findProvincesByCountry(countryCode: string) {
    return this.prisma.province.findMany({
      where: { countryCode },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find cities by province ID
   * @param provinceId - Province UUID
   * @returns List of cities for the province
   */
  async findCitiesByProvince(provinceId: string) {
    return this.prisma.city.findMany({
      where: { provinceId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get full geographic hierarchy for a postal code
   * Useful for displaying breadcrumb navigation or full address
   * @param postalCode - Postal code string
   * @returns Structured hierarchy object
   */
  async getGeographicHierarchy(postalCode: string) {
    const postal = await this.findPostalCodeByCode(postalCode);

    return {
      postalCode: {
        id: postal.id,
        code: postal.code,
      },
      city: {
        id: postal.city.id,
        code: postal.city.code,
        name: postal.city.name,
      },
      province: {
        id: postal.city.province.id,
        code: postal.city.province.code,
        name: postal.city.province.name,
      },
      country: {
        id: postal.city.province.country.id,
        code: postal.city.province.country.code,
        name: postal.city.province.country.name,
        timezone: postal.city.province.country.timezone,
        currency: postal.city.province.country.currency,
        locale: postal.city.province.country.locale,
      },
    };
  }

  /**
   * Validate if a postal code exists in a specific country
   * @param postalCode - Postal code string
   * @param countryCode - Expected country code
   * @returns true if postal code belongs to country, throws otherwise
   */
  async validatePostalCodeForCountry(
    postalCode: string,
    countryCode: string,
  ): Promise<boolean> {
    const postal = await this.findPostalCodeByCode(postalCode);

    if (postal.city.province.countryCode !== countryCode) {
      throw new NotFoundException(
        `Postal code ${postalCode} does not belong to country ${countryCode}`,
      );
    }

    return true;
  }

  /**
   * Search postal codes by partial match
   * @param searchTerm - Partial postal code to search
   * @param countryCode - Optional country filter
   * @param limit - Maximum results to return (default: 20)
   * @returns List of matching postal codes with city/province/country
   */
  async searchPostalCodes(
    searchTerm: string,
    countryCode?: string,
    limit: number = 20,
  ) {
    const where: any = {
      code: {
        startsWith: searchTerm,
      },
    };

    // Filter by country if provided
    if (countryCode) {
      where.city = {
        province: {
          countryCode,
        },
      };
    }

    return this.prisma.postalCode.findMany({
      where,
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
      take: limit,
      orderBy: { code: 'asc' },
    });
  }
}
