import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

/**
 * Buffer Logic Service (PRD-Compliant - AHS Calendar BR-5)
 *
 * Implements buffer rules as scheduling window restrictions:
 * 1. GLOBAL BUFFER - Block bookings within N non-working days from today
 * 2. STATIC BUFFER - Block bookings within N non-working days from deliveryDate
 * 3. TRAVEL BUFFER - Add T minutes before/after each job (fixed from config)
 *
 * Non-working days = days that are:
 * - NOT in working days (e.g., weekends)
 * - OR bank holidays (from Nager.Date API + database)
 *
 * Error codes: BUFFER_WINDOW_VIOLATION, BANK_HOLIDAY
 */
@Injectable()
export class BufferLogicService {
  private readonly logger = new Logger(BufferLogicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validate booking window against Global and Static buffers (PRD BR-5)
   * Throws BadRequestException if violation occurs
   *
   * @param scheduledDate - Proposed booking date
   * @param countryCode - Country code (ES, FR, IT, PL)
   * @param businessUnit - Business unit (LM_ES, BD_FR, etc.)
   * @param deliveryDate - Optional delivery date for static buffer check
   */
  async validateBookingWindow(params: {
    scheduledDate: Date;
    countryCode: string;
    businessUnit: string;
    deliveryDate?: Date;
  }): Promise<void> {
    const { scheduledDate, countryCode, businessUnit, deliveryDate } = params;

    // Get calendar config for the BU
    const config = await this.getCalendarConfig(countryCode, businessUnit);

    // Get holidays for the year
    const holidays = await this.getHolidays(countryCode, scheduledDate.getFullYear());

    // Check if scheduled date itself is a non-working day
    if (this.isNonWorkingDay(scheduledDate, config, holidays)) {
      throw new BadRequestException(
        'BANK_HOLIDAY: Cannot book on non-working days or bank holidays',
      );
    }

    // GLOBAL BUFFER: scheduledDate must be at least N non-working days from today
    if (config.globalBufferNonWorkingDays > 0) {
      const earliestDate = await this.addNonWorkingDays(
        new Date(),
        config.globalBufferNonWorkingDays,
        config,
        holidays,
      );

      if (scheduledDate < earliestDate) {
        throw new BadRequestException(
          `BUFFER_WINDOW_VIOLATION: Cannot book within ${config.globalBufferNonWorkingDays} non-working days from today. Earliest bookable: ${this.formatDate(earliestDate)}`,
        );
      }
    }

    // STATIC BUFFER: if deliveryDate provided, scheduledDate must be at least N non-working days before it
    if (deliveryDate && config.staticBufferNonWorkingDays > 0) {
      const latestDate = await this.subtractNonWorkingDays(
        deliveryDate,
        config.staticBufferNonWorkingDays,
        config,
        holidays,
      );

      if (scheduledDate > latestDate) {
        throw new BadRequestException(
          `BUFFER_WINDOW_VIOLATION: Cannot book within ${config.staticBufferNonWorkingDays} non-working days of delivery date. Latest bookable: ${this.formatDate(latestDate)}`,
        );
      }
    }

    this.logger.log(
      `Booking window validated for ${countryCode}/${businessUnit} on ${this.formatDate(scheduledDate)}`,
    );
  }

  /**
   * Get earliest bookable date considering global buffer
   * Returns the first date that satisfies the global buffer constraint
   */
  async getEarliestBookableDate(
    countryCode: string,
    businessUnit: string,
  ): Promise<Date> {
    const config = await this.getCalendarConfig(countryCode, businessUnit);
    const today = new Date();
    const holidays = await this.getHolidays(countryCode, today.getFullYear());

    if (config.globalBufferNonWorkingDays === 0) {
      // No buffer, can book starting today (if it's a working day)
      return this.findNextWorkingDay(today, config, holidays);
    }

    // Add N non-working days from today
    return this.addNonWorkingDays(
      today,
      config.globalBufferNonWorkingDays,
      config,
      holidays,
    );
  }

  /**
   * Calculate travel buffer (fixed minutes from config, not distance-based)
   * PRD: "Add T minutes before/after each job for the same team within a day"
   */
  async calculateTravelBuffer(
    countryCode: string,
    businessUnit: string,
  ): Promise<{ minutes: number; reason: string }> {
    const config = await this.getCalendarConfig(countryCode, businessUnit);

    return {
      minutes: config.travelBufferMinutes,
      reason: `Travel buffer: ${config.travelBufferMinutes} minutes (spacing between jobs)`,
    };
  }

  /**
   * Store applied travel buffers for a service order
   * This is used when a work team has multiple jobs in one day
   */
  async storeTravelBuffer(
    serviceOrderId: string,
    travelBufferStart: number,
    travelBufferEnd: number,
    configRef: string,
  ): Promise<void> {
    // Delete existing buffer if any (upsert behavior)
    await this.prisma.serviceOrderBuffer.deleteMany({
      where: { serviceOrderId },
    });

    // Create new buffer record
    await this.prisma.serviceOrderBuffer.create({
      data: {
        serviceOrderId,
        travelBufferMinutesStart: travelBufferStart,
        travelBufferMinutesEnd: travelBufferEnd,
        reason: `Travel buffer applied: ${travelBufferStart}min before, ${travelBufferEnd}min after`,
        configRef,
      },
    });

    this.logger.log(
      `Stored travel buffer for service order ${serviceOrderId}: ${travelBufferStart}min + ${travelBufferEnd}min`,
    );
  }

  /**
   * Get stored travel buffer for a service order
   * Returns null if no travel buffer was applied
   */
  async getStoredTravelBuffer(serviceOrderId: string): Promise<{
    startMinutes: number;
    endMinutes: number;
    reason: string;
  } | null> {
    const buffer = await this.prisma.serviceOrderBuffer.findUnique({
      where: { serviceOrderId },
    });

    if (!buffer) {
      return null;
    }

    return {
      startMinutes: buffer.travelBufferMinutesStart,
      endMinutes: buffer.travelBufferMinutesEnd,
      reason: buffer.reason,
    };
  }

  // =========================================================================
  // NON-WORKING DAY CALCULATION HELPERS
  // =========================================================================

  /**
   * Add N non-working days to a date (skipping weekends and holidays)
   * Example: If today is Monday and N=3, returns Thursday (assuming Mon-Fri working, no holidays)
   */
  private async addNonWorkingDays(
    fromDate: Date,
    nonWorkingDays: number,
    config: any,
    holidays: Date[],
  ): Promise<Date> {
    let currentDate = new Date(fromDate);
    let daysAdded = 0;

    while (daysAdded < nonWorkingDays) {
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);

      // Check if this is a working day
      if (this.isWorkingDay(currentDate, config, holidays)) {
        daysAdded++;
      }
    }

    return currentDate;
  }

  /**
   * Subtract N non-working days from a date (going backwards, skipping weekends and holidays)
   * Example: If deliveryDate is Friday and N=2, returns Wednesday (assuming Mon-Fri working, no holidays)
   */
  private async subtractNonWorkingDays(
    fromDate: Date,
    nonWorkingDays: number,
    config: any,
    holidays: Date[],
  ): Promise<Date> {
    let currentDate = new Date(fromDate);
    let daysSubtracted = 0;

    while (daysSubtracted < nonWorkingDays) {
      // Move to previous day
      currentDate.setDate(currentDate.getDate() - 1);

      // Check if this is a working day
      if (this.isWorkingDay(currentDate, config, holidays)) {
        daysSubtracted++;
      }
    }

    return currentDate;
  }

  /**
   * Find the next working day from a given date (inclusive)
   * If the given date is a working day, returns it
   */
  private findNextWorkingDay(fromDate: Date, config: any, holidays: Date[]): Date {
    let currentDate = new Date(fromDate);

    while (!this.isWorkingDay(currentDate, config, holidays)) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return currentDate;
  }

  /**
   * Check if a date is a working day (not weekend, not holiday)
   * Working day = in workingDays array AND not a holiday
   */
  private isWorkingDay(date: Date, config: any, holidays: Date[]): boolean {
    // Check if weekend
    const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const workingDays = config.workingDays as number[]; // e.g., [1,2,3,4,5] for Mon-Fri

    if (!workingDays.includes(dayOfWeek)) {
      return false; // Weekend
    }

    // Check if holiday
    if (this.isHoliday(date, holidays)) {
      return false; // Holiday
    }

    return true; // Working day
  }

  /**
   * Check if a date is a non-working day (weekend or holiday)
   */
  private isNonWorkingDay(date: Date, config: any, holidays: Date[]): boolean {
    return !this.isWorkingDay(date, config, holidays);
  }

  /**
   * Check if date is in holidays array
   */
  private isHoliday(date: Date, holidays: Date[]): boolean {
    const dateString = this.formatDate(date);
    return holidays.some(holiday => this.formatDate(holiday) === dateString);
  }

  // =========================================================================
  // CALENDAR CONFIG & HOLIDAY HELPERS
  // =========================================================================

  /**
   * Get calendar config for business unit
   * Throws if config not found
   */
  private async getCalendarConfig(
    countryCode: string,
    businessUnit: string,
  ): Promise<any> {
    const config = await this.prisma.calendarConfig.findUnique({
      where: {
        countryCode_businessUnit: {
          countryCode,
          businessUnit,
        },
      },
    });

    if (!config) {
      throw new BadRequestException(
        `Calendar configuration not found for ${countryCode}/${businessUnit}`,
      );
    }

    return config;
  }

  /**
   * Get holidays for a country/year from database
   * Database is synced daily from Nager.Date API + manual overrides
   */
  private async getHolidays(countryCode: string, year: number): Promise<Date[]> {
    const holidays = await this.prisma.holiday.findMany({
      where: {
        countryCode,
        date: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      },
      select: { date: true },
    });

    return holidays.map(h => new Date(h.date));
  }

  /**
   * Check if a date is a public holiday using Nager.Date API (real-time check)
   * For operational use, prefer database holidays (getHolidays)
   * This method is useful for admin/diagnostic purposes
   */
  async isPublicHoliday(countryCode: string, date: Date): Promise<boolean> {
    try {
      const year = date.getFullYear();
      const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`;

      const response = await firstValueFrom(
        this.httpService.get<Array<{ date: string; name: string }>>(url, {
          timeout: 5000,
        }),
      );

      const holidays = response.data;
      const dateString = this.formatDate(date);

      return holidays.some(holiday => holiday.date === dateString);
    } catch (error) {
      this.logger.error(`Failed to fetch holidays from Nager.Date API: ${error.message}`);
      return false;
    }
  }

  /**
   * Format date as YYYY-MM-DD (ISO 8601 date part)
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
