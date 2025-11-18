/**
 * Duration Calculation Utility
 *
 * Implements comprehensive duration calculation for field service check-out operations.
 * Based on product-docs/api/06-execution-mobile-api.md
 * and product-docs/domain/06-execution-field-operations.md
 */

export interface TimeEntry {
  checkInTime: Date;
  checkOutTime: Date;
  breakTimeMinutes?: number;
  travelTimeMinutes?: number;
}

export interface DurationResult {
  /**
   * Total time from check-in to check-out in hours
   */
  totalHours: number;

  /**
   * Billable hours (total - breaks)
   */
  billableHours: number;

  /**
   * Regular hours (up to standard workday, typically 8 hours)
   */
  regularHours: number;

  /**
   * Overtime hours (beyond standard workday)
   */
  overtimeHours: number;

  /**
   * Double-time hours (if applicable, e.g., weekends/holidays)
   */
  doubleTimeHours: number;

  /**
   * Total minutes on site
   */
  totalMinutes: number;

  /**
   * Billable minutes (total - breaks)
   */
  billableMinutes: number;

  /**
   * Break time in minutes
   */
  breakTimeMinutes: number;

  /**
   * Travel time in minutes
   */
  travelTimeMinutes: number;

  /**
   * Whether this is a multi-day work session
   */
  isMultiDay: boolean;

  /**
   * Number of days spanned
   */
  daysSpanned: number;

  /**
   * Warnings or validation messages
   */
  warnings: string[];
}

export interface DurationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface OvertimeConfig {
  /**
   * Standard workday in hours (default: 8)
   */
  standardWorkdayHours: number;

  /**
   * Maximum allowed hours per day (default: 16)
   */
  maxHoursPerDay: number;

  /**
   * Whether to calculate double-time for weekends
   */
  doubleTimeOnWeekends: boolean;

  /**
   * Holiday dates for double-time calculation
   */
  holidays?: Date[];
}

const DEFAULT_OVERTIME_CONFIG: OvertimeConfig = {
  standardWorkdayHours: 8,
  maxHoursPerDay: 16,
  doubleTimeOnWeekends: false,
  holidays: [],
};

/**
 * Calculate comprehensive duration metrics from check-in to check-out
 *
 * Business Rules (from api/06-execution-mobile-api.md:427-487):
 * 1. Total hours = check-out time - check-in time
 * 2. Billable hours = total hours - break time
 * 3. Overtime = hours beyond standard workday (typically 8 hours)
 * 4. Break time is non-billable
 * 5. Multi-day sessions should be flagged for review
 */
export function calculateDuration(
  timeEntry: TimeEntry,
  config: Partial<OvertimeConfig> = {},
): DurationResult {
  const effectiveConfig: OvertimeConfig = {
    ...DEFAULT_OVERTIME_CONFIG,
    ...config,
  };

  const warnings: string[] = [];

  // Calculate total time on site in milliseconds
  const totalMilliseconds = timeEntry.checkOutTime.getTime() - timeEntry.checkInTime.getTime();
  const totalMinutes = Math.round(totalMilliseconds / 60000);
  const totalHours = totalMinutes / 60;

  // Handle break time
  const breakTimeMinutes = timeEntry.breakTimeMinutes ?? 0;
  const billableMinutes = Math.max(0, totalMinutes - breakTimeMinutes);
  const billableHours = billableMinutes / 60;

  // Handle travel time
  const travelTimeMinutes = timeEntry.travelTimeMinutes ?? 0;

  // Check for multi-day sessions
  const checkInDate = new Date(
    timeEntry.checkInTime.getFullYear(),
    timeEntry.checkInTime.getMonth(),
    timeEntry.checkInTime.getDate(),
  );
  const checkOutDate = new Date(
    timeEntry.checkOutTime.getFullYear(),
    timeEntry.checkOutTime.getMonth(),
    timeEntry.checkOutTime.getDate(),
  );
  const daysDifference = Math.floor((checkOutDate.getTime() - checkInDate.getTime()) / 86400000);
  const isMultiDay = daysDifference > 0;
  const daysSpanned = daysDifference + 1;

  if (isMultiDay) {
    warnings.push(
      `Multi-day work session detected (${daysSpanned} days). Consider reviewing for accuracy.`,
    );
  }

  // Check for excessively long shifts
  if (totalHours > effectiveConfig.maxHoursPerDay) {
    warnings.push(
      `Total hours (${totalHours.toFixed(2)}) exceeds maximum allowed (${effectiveConfig.maxHoursPerDay}). Please review.`,
    );
  }

  // Check for unreasonably high break time
  if (breakTimeMinutes > totalMinutes * 0.5) {
    warnings.push(
      `Break time (${breakTimeMinutes} minutes) is more than 50% of total time. Please verify.`,
    );
  }

  // Calculate regular hours and overtime
  let regularHours = Math.min(billableHours, effectiveConfig.standardWorkdayHours);
  let overtimeHours = Math.max(0, billableHours - effectiveConfig.standardWorkdayHours);
  let doubleTimeHours = 0;

  // Check for weekend/holiday double-time
  const checkInDay = timeEntry.checkInTime.getDay();
  const isWeekend = checkInDay === 0 || checkInDay === 6; // Sunday = 0, Saturday = 6

  const isHoliday =
    effectiveConfig.holidays?.some(
      (holiday) =>
        holiday.getFullYear() === timeEntry.checkInTime.getFullYear() &&
        holiday.getMonth() === timeEntry.checkInTime.getMonth() &&
        holiday.getDate() === timeEntry.checkInTime.getDate(),
    ) ?? false;

  if (effectiveConfig.doubleTimeOnWeekends && (isWeekend || isHoliday)) {
    // Convert all overtime to double-time on weekends/holidays
    doubleTimeHours = overtimeHours;
    overtimeHours = 0;

    if (isWeekend) {
      warnings.push('Weekend work detected. Overtime converted to double-time.');
    }
    if (isHoliday) {
      warnings.push('Holiday work detected. Overtime converted to double-time.');
    }
  }

  return {
    totalHours: parseFloat(totalHours.toFixed(2)),
    billableHours: parseFloat(billableHours.toFixed(2)),
    regularHours: parseFloat(regularHours.toFixed(2)),
    overtimeHours: parseFloat(overtimeHours.toFixed(2)),
    doubleTimeHours: parseFloat(doubleTimeHours.toFixed(2)),
    totalMinutes,
    billableMinutes,
    breakTimeMinutes,
    travelTimeMinutes,
    isMultiDay,
    daysSpanned,
    warnings,
  };
}

/**
 * Validate check-out timing and duration
 *
 * Business Rules (from domain/06-execution-field-operations.md:900-916):
 * 1. Check-out time must be after check-in time
 * 2. Total duration should be reasonable (not negative, not excessively long)
 * 3. Break time should not exceed total time
 * 4. Multi-day sessions should be flagged for review
 */
export function validateCheckOutTiming(timeEntry: TimeEntry): DurationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate check-out is after check-in
  if (timeEntry.checkOutTime <= timeEntry.checkInTime) {
    errors.push(
      `Check-out time (${timeEntry.checkOutTime.toISOString()}) must be after check-in time (${timeEntry.checkInTime.toISOString()})`,
    );
  }

  // Calculate duration for additional validation
  const totalMilliseconds = timeEntry.checkOutTime.getTime() - timeEntry.checkInTime.getTime();
  const totalMinutes = Math.round(totalMilliseconds / 60000);
  const totalHours = totalMinutes / 60;

  // Validate break time
  const breakTimeMinutes = timeEntry.breakTimeMinutes ?? 0;
  if (breakTimeMinutes < 0) {
    errors.push('Break time cannot be negative');
  }

  if (breakTimeMinutes > totalMinutes) {
    errors.push(
      `Break time (${breakTimeMinutes} minutes) cannot exceed total duration (${totalMinutes} minutes)`,
    );
  }

  // Validate travel time
  const travelTimeMinutes = timeEntry.travelTimeMinutes ?? 0;
  if (travelTimeMinutes < 0) {
    errors.push('Travel time cannot be negative');
  }

  // Check for very short duration (less than 15 minutes)
  if (totalMinutes > 0 && totalMinutes < 15) {
    warnings.push(
      `Very short work session detected (${totalMinutes} minutes). Please verify this is correct.`,
    );
  }

  // Check for excessively long duration (more than 24 hours)
  if (totalHours > 24) {
    warnings.push(
      `Work session exceeds 24 hours (${totalHours.toFixed(2)} hours). This may indicate a multi-day project or data entry error.`,
    );
  }

  // Check for missing break on long shifts
  if (totalHours > 6 && breakTimeMinutes === 0) {
    warnings.push(
      `No break time recorded for a ${totalHours.toFixed(2)}-hour shift. Labor regulations may require breaks.`,
    );
  }

  // Check for future times
  const now = new Date();
  if (timeEntry.checkOutTime > now) {
    errors.push(`Check-out time cannot be in the future`);
  }

  if (timeEntry.checkInTime > now) {
    errors.push(`Check-in time cannot be in the future`);
  }

  // Check for very old check-ins (more than 7 days ago)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (timeEntry.checkInTime < sevenDaysAgo) {
    warnings.push(
      `Check-in time is more than 7 days ago. Please verify this is correct and not a delayed submission.`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Calculate cost based on duration and hourly rates
 */
export function calculateCost(
  durationResult: DurationResult,
  rates: {
    regularRate: number;
    overtimeRate?: number;
    doubleTimeRate?: number;
  },
): {
  regularCost: number;
  overtimeCost: number;
  doubleTimeCost: number;
  totalCost: number;
} {
  const overtimeRate = rates.overtimeRate ?? rates.regularRate * 1.5;
  const doubleTimeRate = rates.doubleTimeRate ?? rates.regularRate * 2.0;

  const regularCost = durationResult.regularHours * rates.regularRate;
  const overtimeCost = durationResult.overtimeHours * overtimeRate;
  const doubleTimeCost = durationResult.doubleTimeHours * doubleTimeRate;
  const totalCost = regularCost + overtimeCost + doubleTimeCost;

  return {
    regularCost: parseFloat(regularCost.toFixed(2)),
    overtimeCost: parseFloat(overtimeCost.toFixed(2)),
    doubleTimeCost: parseFloat(doubleTimeCost.toFixed(2)),
    totalCost: parseFloat(totalCost.toFixed(2)),
  };
}

/**
 * Format duration result for API response
 */
export function formatDurationForResponse(durationResult: DurationResult) {
  return {
    total_hours: durationResult.totalHours,
    billable_hours: durationResult.billableHours,
    regular_hours: durationResult.regularHours,
    overtime_hours: durationResult.overtimeHours,
    double_time_hours: durationResult.doubleTimeHours,
    total_minutes: durationResult.totalMinutes,
    billable_minutes: durationResult.billableMinutes,
    break_time_minutes: durationResult.breakTimeMinutes,
    travel_time_minutes: durationResult.travelTimeMinutes,
    is_multi_day: durationResult.isMultiDay,
    days_spanned: durationResult.daysSpanned,
    warnings: durationResult.warnings,
  };
}
