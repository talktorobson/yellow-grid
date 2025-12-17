import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { UpdateSystemConfigDto, UpdateCountryConfigDto, UpdateBusinessUnitConfigDto } from './dto';

/**
 * Service to manage system-wide, country-specific, and business-unit-specific configurations.
 *
 * Persists configuration in the database and provides default values when necessary.
 */
@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // SYSTEM CONFIG (Key-Value Store)
  // ============================================================================

  /**
   * Retrieves all system configuration entries.
   *
   * @returns {Promise<Record<string, any>>} A key-value map of system configurations.
   */
  async getSystemConfig() {
    // Get all system config entries
    const configs = await this.prisma.systemConfig.findMany({});

    // Convert to object format
    const result: Record<string, any> = {};
    configs.forEach((config: any) => {
      result[config.key] = config.value;
    });

    // Add defaults if empty
    if (Object.keys(result).length === 0) {
      return this.getDefaultSystemConfig();
    }

    return result;
  }

  /**
   * Updates system configuration entries.
   *
   * @param dto - The new configuration values.
   * @param currentUserId - The ID of the user performing the update.
   * @returns {Promise<Record<string, any>>} The updated system configuration.
   */
  async updateSystemConfig(dto: UpdateSystemConfigDto, currentUserId: string) {
    // Update or create each config key
    const updates: Promise<any>[] = [];

    if (dto.featureFlags) {
      updates.push(
        this.prisma.systemConfig.upsert({
          where: { key: 'featureFlags' },
          create: {
            key: 'featureFlags',
            value: dto.featureFlags as any,
            description: 'Feature flags configuration',
          },
          update: {
            value: dto.featureFlags as any,
          },
        }),
      );
    }

    if (dto.emailConfig) {
      updates.push(
        this.prisma.systemConfig.upsert({
          where: { key: 'emailConfig' },
          create: {
            key: 'emailConfig',
            value: dto.emailConfig as any,
            description: 'Email configuration',
          },
          update: {
            value: dto.emailConfig as any,
          },
        }),
      );
    }

    if (dto.smsConfig) {
      updates.push(
        this.prisma.systemConfig.upsert({
          where: { key: 'smsConfig' },
          create: {
            key: 'smsConfig',
            value: dto.smsConfig as any,
            description: 'SMS configuration',
          },
          update: {
            value: dto.smsConfig as any,
          },
        }),
      );
    }

    if (dto.additionalSettings) {
      updates.push(
        this.prisma.systemConfig.upsert({
          where: { key: 'additionalSettings' },
          create: {
            key: 'additionalSettings',
            value: dto.additionalSettings as any,
            description: 'Additional settings',
          },
          update: {
            value: dto.additionalSettings as any,
          },
        }),
      );
    }

    await Promise.all(updates);

    this.logger.log(`System config updated by ${currentUserId}`);
    return this.getSystemConfig();
  }

  /**
   * Retrieves the default system configuration.
   *
   * @returns The default configuration object.
   */
  private getDefaultSystemConfig() {
    return {
      featureFlags: {
        aiRiskAssessment: true,
        aiSalesPotential: true,
        autoProjectOwnership: false,
        mobileApp: true,
        eSignature: true,
      },
      emailConfig: null,
      smsConfig: null,
      additionalSettings: null,
    };
  }

  // ============================================================================
  // COUNTRY CONFIG
  // ============================================================================

  /**
   * Retrieves configuration for a specific country.
   *
   * @param countryCode - The ISO country code.
   * @returns {Promise<CountryConfig>} The country configuration.
   */
  async getCountryConfig(countryCode: string) {
    // Validate country code
    this.validateCountryCode(countryCode);

    const config = await this.prisma.countryConfig.findUnique({
      where: { countryCode },
    });

    if (!config) {
      // Return default country config
      return this.createDefaultCountryConfig(countryCode);
    }

    return config;
  }

  /**
   * Updates configuration for a specific country.
   *
   * @param countryCode - The ISO country code.
   * @param dto - The new configuration values.
   * @param currentUserId - The ID of the user performing the update.
   * @returns {Promise<CountryConfig>} The updated country configuration.
   */
  async updateCountryConfig(
    countryCode: string,
    dto: UpdateCountryConfigDto,
    currentUserId: string,
  ) {
    // Validate country code
    this.validateCountryCode(countryCode);

    let config = await this.prisma.countryConfig.findUnique({
      where: { countryCode },
    });

    const countryDefaults = this.getCountryDefaults(countryCode);

    if (!config) {
      // Create initial country config
      config = await this.prisma.countryConfig.create({
        data: {
          countryCode,
          timezone: dto.timezone || countryDefaults.timezone,
          locale: dto.locale || countryDefaults.locale,
          currency: dto.currency || countryDefaults.currency,
          workingDays: dto.workingDays
            ? (dto.workingDays as any)
            : (countryDefaults.workingDays as any),
          globalBufferDays: countryDefaults.globalBufferDays,
          staticBufferDays: countryDefaults.staticBufferDays,
          autoAccept:
            dto.autoAcceptAssignments !== undefined
              ? dto.autoAcceptAssignments
              : countryDefaults.autoAcceptAssignments,
        },
      });

      this.logger.log(`Country config created for ${countryCode} by ${currentUserId}`);
    } else {
      // Update existing config
      const updateData: any = {};
      if (dto.timezone) updateData.timezone = dto.timezone;
      if (dto.locale) updateData.locale = dto.locale;
      if (dto.currency) updateData.currency = dto.currency;
      if (dto.workingDays) updateData.workingDays = dto.workingDays as any;
      if (dto.autoAcceptAssignments !== undefined)
        updateData.autoAccept = dto.autoAcceptAssignments;

      config = await this.prisma.countryConfig.update({
        where: { countryCode },
        data: updateData,
      });

      this.logger.log(`Country config updated for ${countryCode} by ${currentUserId}`);
    }

    return config;
  }

  /**
   * Creates a default configuration for a country.
   *
   * @param countryCode - The ISO country code.
   * @returns {Promise<CountryConfig>} The newly created configuration.
   */
  private async createDefaultCountryConfig(countryCode: string) {
    const defaults = this.getCountryDefaults(countryCode);

    const config = await this.prisma.countryConfig.create({
      data: {
        countryCode,
        timezone: defaults.timezone,
        locale: defaults.locale,
        currency: defaults.currency,
        workingDays: defaults.workingDays as any,
        globalBufferDays: defaults.globalBufferDays,
        staticBufferDays: defaults.staticBufferDays,
        autoAccept: defaults.autoAcceptAssignments,
      },
    });

    this.logger.log(`Default country config created for ${countryCode}`);
    return config;
  }

  private readonly VALID_COUNTRIES = ['FR', 'ES', 'IT', 'PL', 'RO', 'PT'];

  /**
   * Validates if a country code is supported.
   *
   * @param countryCode - The ISO country code to check.
   * @throws {NotFoundException} If the country code is not supported.
   */
  private validateCountryCode(countryCode: string) {
    if (!this.VALID_COUNTRIES.includes(countryCode)) {
      throw new NotFoundException(
        `Country code '${countryCode}' is not supported. Valid codes: ${this.VALID_COUNTRIES.join(', ')}`,
      );
    }
  }

  /**
   * Gets default settings for a specific country.
   *
   * @param countryCode - The ISO country code.
   * @returns The default settings object.
   */
  private getCountryDefaults(countryCode: string) {
    const defaults: Record<string, any> = {
      FR: {
        timezone: 'Europe/Paris',
        locale: 'fr-FR',
        currency: 'EUR',
        workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        globalBufferDays: 2,
        staticBufferDays: 1,
        autoAcceptAssignments: false,
      },
      ES: {
        timezone: 'Europe/Madrid',
        locale: 'es-ES',
        currency: 'EUR',
        workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        globalBufferDays: 2,
        staticBufferDays: 1,
        autoAcceptAssignments: true, // ES has auto-accept
      },
      IT: {
        timezone: 'Europe/Rome',
        locale: 'it-IT',
        currency: 'EUR',
        workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        globalBufferDays: 2,
        staticBufferDays: 1,
        autoAcceptAssignments: true, // IT has auto-accept
      },
      PL: {
        timezone: 'Europe/Warsaw',
        locale: 'pl-PL',
        currency: 'PLN',
        workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        globalBufferDays: 2,
        staticBufferDays: 1,
        autoAcceptAssignments: false,
      },
      RO: {
        timezone: 'Europe/Bucharest',
        locale: 'ro-RO',
        currency: 'RON',
        workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        globalBufferDays: 2,
        staticBufferDays: 1,
        autoAcceptAssignments: false,
      },
      PT: {
        timezone: 'Europe/Lisbon',
        locale: 'pt-PT',
        currency: 'EUR',
        workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        globalBufferDays: 2,
        staticBufferDays: 1,
        autoAcceptAssignments: false,
      },
    };

    return defaults[countryCode];
  }

  // ============================================================================
  // BUSINESS UNIT CONFIG
  // ============================================================================

  /**
   * Retrieves configuration for a business unit within a country.
   *
   * @param countryCode - The ISO country code.
   * @param businessUnit - The business unit identifier.
   * @returns {Promise<BusinessUnitConfig>} The business unit configuration.
   */
  async getBusinessUnitConfig(countryCode: string, businessUnit: string) {
    const buKey = `${businessUnit}_${countryCode}`;
    const config = await this.prisma.businessUnitConfig.findUnique({
      where: { businessUnit: buKey },
    });

    if (!config) {
      // Return default BU config
      return this.createDefaultBusinessUnitConfig(countryCode, businessUnit);
    }

    return config;
  }

  /**
   * Updates configuration for a business unit within a country.
   *
   * @param countryCode - The ISO country code.
   * @param businessUnit - The business unit identifier.
   * @param dto - The new configuration values.
   * @param currentUserId - The ID of the user performing the update.
   * @returns {Promise<BusinessUnitConfig>} The updated business unit configuration.
   */
  async updateBusinessUnitConfig(
    countryCode: string,
    businessUnit: string,
    dto: UpdateBusinessUnitConfigDto,
    currentUserId: string,
  ) {
    const buKey = `${businessUnit}_${countryCode}`;
    let config = await this.prisma.businessUnitConfig.findUnique({
      where: { businessUnit: buKey },
    });

    const buDefaults = this.getBusinessUnitDefaults(businessUnit);

    if (!config) {
      // Create initial BU config
      config = await this.prisma.businessUnitConfig.create({
        data: {
          businessUnit: buKey,
          countryCode,
          name: dto.businessUnitName || buDefaults.businessUnitName,
          isActive: true,
          email: null,
          phone: null,
        },
      });

      this.logger.log(
        `Business unit config created for ${countryCode}/${businessUnit} by ${currentUserId}`,
      );
    } else {
      // Update existing config
      const updateData: any = {};
      if (dto.businessUnitName) updateData.name = dto.businessUnitName;

      config = await this.prisma.businessUnitConfig.update({
        where: { businessUnit: buKey },
        data: updateData,
      });

      this.logger.log(
        `Business unit config updated for ${countryCode}/${businessUnit} by ${currentUserId}`,
      );
    }

    return config;
  }

  /**
   * Creates a default configuration for a business unit.
   *
   * @param countryCode - The ISO country code.
   * @param businessUnit - The business unit identifier.
   * @returns {Promise<BusinessUnitConfig>} The newly created configuration.
   */
  private async createDefaultBusinessUnitConfig(countryCode: string, businessUnit: string) {
    const defaults = this.getBusinessUnitDefaults(businessUnit);
    const buKey = `${businessUnit}_${countryCode}`;

    const config = await this.prisma.businessUnitConfig.create({
      data: {
        businessUnit: buKey,
        countryCode,
        name: defaults.businessUnitName,
        isActive: true,
        email: null,
        phone: null,
      },
    });

    this.logger.log(`Default business unit config created for ${countryCode}/${businessUnit}`);
    return config;
  }

  /**
   * Gets default settings for a specific business unit.
   *
   * @param businessUnit - The business unit identifier.
   * @returns The default settings object.
   */
  private getBusinessUnitDefaults(businessUnit: string) {
    const defaults: Record<string, any> = {
      DIY_STORE: {
        businessUnitName: 'DIY Store',
      },
      PRO_STORE: {
        businessUnitName: 'Pro Store',
      },
    };

    return defaults[businessUnit] || defaults.DIY_STORE;
  }
}
