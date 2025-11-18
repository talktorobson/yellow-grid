/**
 * Duration Calculation Utility Tests
 */

import {
  calculateDuration,
  validateCheckOutTiming,
  calculateCost,
  formatDurationForResponse,
  type TimeEntry,
  type OvertimeConfig,
} from './duration-calculation.util';

describe('Duration Calculation Utility', () => {
  describe('calculateDuration', () => {
    it('should calculate basic duration correctly', () => {
      const checkInTime = new Date('2025-01-15T08:00:00Z');
      const checkOutTime = new Date('2025-01-15T17:00:00Z');

      const result = calculateDuration({
        checkInTime,
        checkOutTime,
      });

      expect(result.totalHours).toBe(9);
      expect(result.totalMinutes).toBe(540);
      expect(result.billableHours).toBe(9);
      expect(result.billableMinutes).toBe(540);
      expect(result.regularHours).toBe(8);
      expect(result.overtimeHours).toBe(1);
      expect(result.isMultiDay).toBe(false);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle break time correctly', () => {
      const checkInTime = new Date('2025-01-15T08:00:00Z');
      const checkOutTime = new Date('2025-01-15T17:00:00Z');

      const result = calculateDuration({
        checkInTime,
        checkOutTime,
        breakTimeMinutes: 60, // 1 hour lunch
      });

      expect(result.totalHours).toBe(9);
      expect(result.totalMinutes).toBe(540);
      expect(result.billableHours).toBe(8); // 9 hours - 1 hour break
      expect(result.billableMinutes).toBe(480);
      expect(result.breakTimeMinutes).toBe(60);
      expect(result.regularHours).toBe(8);
      expect(result.overtimeHours).toBe(0);
    });

    it('should calculate overtime correctly', () => {
      const checkInTime = new Date('2025-01-15T08:00:00Z');
      const checkOutTime = new Date('2025-01-15T19:00:00Z'); // 11 hours

      const result = calculateDuration({
        checkInTime,
        checkOutTime,
        breakTimeMinutes: 30,
      });

      expect(result.totalHours).toBe(11);
      expect(result.billableHours).toBe(10.5); // 11 - 0.5 break
      expect(result.regularHours).toBe(8);
      expect(result.overtimeHours).toBe(2.5);
    });

    it('should detect multi-day sessions', () => {
      const checkInTime = new Date('2025-01-15T22:00:00Z');
      const checkOutTime = new Date('2025-01-16T06:00:00Z'); // Next day

      const result = calculateDuration({
        checkInTime,
        checkOutTime,
      });

      expect(result.totalHours).toBe(8);
      expect(result.isMultiDay).toBe(true);
      expect(result.daysSpanned).toBe(2);
      expect(result.warnings).toContain(
        expect.stringContaining('Multi-day work session detected'),
      );
    });

    it('should warn about excessive hours', () => {
      const checkInTime = new Date('2025-01-15T06:00:00Z');
      const checkOutTime = new Date('2025-01-16T00:00:00Z'); // 18 hours

      const result = calculateDuration(
        {
          checkInTime,
          checkOutTime,
        },
        {
          standardWorkdayHours: 8,
          maxHoursPerDay: 16,
          doubleTimeOnWeekends: false,
        },
      );

      expect(result.totalHours).toBe(18);
      expect(result.warnings).toContain(
        expect.stringContaining('exceeds maximum allowed'),
      );
    });

    it('should warn about excessive break time', () => {
      const checkInTime = new Date('2025-01-15T08:00:00Z');
      const checkOutTime = new Date('2025-01-15T17:00:00Z');

      const result = calculateDuration({
        checkInTime,
        checkOutTime,
        breakTimeMinutes: 300, // 5 hours of breaks (> 50% of 9 hours)
      });

      expect(result.warnings).toContain(
        expect.stringContaining('more than 50% of total time'),
      );
    });

    it('should calculate double-time for weekends when configured', () => {
      // Saturday
      const checkInTime = new Date('2025-01-18T08:00:00Z'); // Saturday
      const checkOutTime = new Date('2025-01-18T18:00:00Z'); // 10 hours

      const result = calculateDuration(
        {
          checkInTime,
          checkOutTime,
        },
        {
          standardWorkdayHours: 8,
          maxHoursPerDay: 16,
          doubleTimeOnWeekends: true,
        },
      );

      expect(result.regularHours).toBe(8);
      expect(result.overtimeHours).toBe(0);
      expect(result.doubleTimeHours).toBe(2);
      expect(result.warnings).toContain(
        expect.stringContaining('Weekend work detected'),
      );
    });

    it('should handle travel time', () => {
      const checkInTime = new Date('2025-01-15T08:00:00Z');
      const checkOutTime = new Date('2025-01-15T17:00:00Z');

      const result = calculateDuration({
        checkInTime,
        checkOutTime,
        travelTimeMinutes: 30,
      });

      expect(result.travelTimeMinutes).toBe(30);
      expect(result.totalHours).toBe(9);
    });

    it('should handle zero-break time correctly', () => {
      const checkInTime = new Date('2025-01-15T08:00:00Z');
      const checkOutTime = new Date('2025-01-15T12:00:00Z'); // 4 hours

      const result = calculateDuration({
        checkInTime,
        checkOutTime,
        breakTimeMinutes: 0,
      });

      expect(result.breakTimeMinutes).toBe(0);
      expect(result.billableHours).toBe(result.totalHours);
    });

    it('should round hours to 2 decimal places', () => {
      const checkInTime = new Date('2025-01-15T08:00:00Z');
      const checkOutTime = new Date('2025-01-15T08:37:00Z'); // 37 minutes

      const result = calculateDuration({
        checkInTime,
        checkOutTime,
      });

      expect(result.totalHours).toBe(0.62); // 37/60 = 0.6166... rounded to 0.62
      expect(typeof result.totalHours).toBe('number');
    });
  });

  describe('validateCheckOutTiming', () => {
    it('should validate correct check-out timing', () => {
      const checkInTime = new Date('2025-01-15T08:00:00Z');
      const checkOutTime = new Date('2025-01-15T17:00:00Z');

      const result = validateCheckOutTiming({
        checkInTime,
        checkOutTime,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject check-out before check-in', () => {
      const checkInTime = new Date('2025-01-15T17:00:00Z');
      const checkOutTime = new Date('2025-01-15T08:00:00Z'); // Earlier!

      const result = validateCheckOutTiming({
        checkInTime,
        checkOutTime,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('must be after check-in time'),
      );
    });

    it('should reject negative break time', () => {
      const checkInTime = new Date('2025-01-15T08:00:00Z');
      const checkOutTime = new Date('2025-01-15T17:00:00Z');

      const result = validateCheckOutTiming({
        checkInTime,
        checkOutTime,
        breakTimeMinutes: -30,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Break time cannot be negative');
    });

    it('should reject break time exceeding total duration', () => {
      const checkInTime = new Date('2025-01-15T08:00:00Z');
      const checkOutTime = new Date('2025-01-15T12:00:00Z'); // 4 hours = 240 min

      const result = validateCheckOutTiming({
        checkInTime,
        checkOutTime,
        breakTimeMinutes: 300, // 5 hours
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('cannot exceed total duration'),
      );
    });

    it('should warn about very short sessions', () => {
      const checkInTime = new Date('2025-01-15T08:00:00Z');
      const checkOutTime = new Date('2025-01-15T08:10:00Z'); // 10 minutes

      const result = validateCheckOutTiming({
        checkInTime,
        checkOutTime,
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        expect.stringContaining('Very short work session'),
      );
    });

    it('should warn about very long sessions', () => {
      const checkInTime = new Date('2025-01-15T08:00:00Z');
      const checkOutTime = new Date('2025-01-16T10:00:00Z'); // 26 hours

      const result = validateCheckOutTiming({
        checkInTime,
        checkOutTime,
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        expect.stringContaining('exceeds 24 hours'),
      );
    });

    it('should warn about missing breaks on long shifts', () => {
      const checkInTime = new Date('2025-01-15T08:00:00Z');
      const checkOutTime = new Date('2025-01-15T18:00:00Z'); // 10 hours

      const result = validateCheckOutTiming({
        checkInTime,
        checkOutTime,
        breakTimeMinutes: 0,
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        expect.stringContaining('No break time recorded'),
      );
    });

    it('should reject negative travel time', () => {
      const checkInTime = new Date('2025-01-15T08:00:00Z');
      const checkOutTime = new Date('2025-01-15T17:00:00Z');

      const result = validateCheckOutTiming({
        checkInTime,
        checkOutTime,
        travelTimeMinutes: -15,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Travel time cannot be negative');
    });

    it('should reject future check-out times', () => {
      const checkInTime = new Date();
      const checkOutTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

      const result = validateCheckOutTiming({
        checkInTime,
        checkOutTime,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Check-out time cannot be in the future');
    });

    it('should reject future check-in times', () => {
      const checkInTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const checkOutTime = new Date(Date.now() + 25 * 60 * 60 * 1000);

      const result = validateCheckOutTiming({
        checkInTime,
        checkOutTime,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Check-in time cannot be in the future');
    });

    it('should warn about old check-ins', () => {
      const checkInTime = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const checkOutTime = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000);

      const result = validateCheckOutTiming({
        checkInTime,
        checkOutTime,
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        expect.stringContaining('more than 7 days ago'),
      );
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost correctly with regular hours only', () => {
      const durationResult = {
        totalHours: 8,
        billableHours: 8,
        regularHours: 8,
        overtimeHours: 0,
        doubleTimeHours: 0,
        totalMinutes: 480,
        billableMinutes: 480,
        breakTimeMinutes: 0,
        travelTimeMinutes: 0,
        isMultiDay: false,
        daysSpanned: 1,
        warnings: [],
      };

      const cost = calculateCost(durationResult, {
        regularRate: 50,
      });

      expect(cost.regularCost).toBe(400);
      expect(cost.overtimeCost).toBe(0);
      expect(cost.doubleTimeCost).toBe(0);
      expect(cost.totalCost).toBe(400);
    });

    it('should calculate cost with overtime at 1.5x rate', () => {
      const durationResult = {
        totalHours: 10,
        billableHours: 10,
        regularHours: 8,
        overtimeHours: 2,
        doubleTimeHours: 0,
        totalMinutes: 600,
        billableMinutes: 600,
        breakTimeMinutes: 0,
        travelTimeMinutes: 0,
        isMultiDay: false,
        daysSpanned: 1,
        warnings: [],
      };

      const cost = calculateCost(durationResult, {
        regularRate: 50,
      });

      expect(cost.regularCost).toBe(400); // 8 * $50
      expect(cost.overtimeCost).toBe(150); // 2 * ($50 * 1.5)
      expect(cost.totalCost).toBe(550);
    });

    it('should calculate cost with double-time at 2x rate', () => {
      const durationResult = {
        totalHours: 10,
        billableHours: 10,
        regularHours: 8,
        overtimeHours: 0,
        doubleTimeHours: 2,
        totalMinutes: 600,
        billableMinutes: 600,
        breakTimeMinutes: 0,
        travelTimeMinutes: 0,
        isMultiDay: false,
        daysSpanned: 1,
        warnings: [],
      };

      const cost = calculateCost(durationResult, {
        regularRate: 50,
      });

      expect(cost.regularCost).toBe(400); // 8 * $50
      expect(cost.doubleTimeCost).toBe(200); // 2 * ($50 * 2)
      expect(cost.totalCost).toBe(600);
    });

    it('should allow custom overtime and double-time rates', () => {
      const durationResult = {
        totalHours: 12,
        billableHours: 12,
        regularHours: 8,
        overtimeHours: 2,
        doubleTimeHours: 2,
        totalMinutes: 720,
        billableMinutes: 720,
        breakTimeMinutes: 0,
        travelTimeMinutes: 0,
        isMultiDay: false,
        daysSpanned: 1,
        warnings: [],
      };

      const cost = calculateCost(durationResult, {
        regularRate: 50,
        overtimeRate: 80,
        doubleTimeRate: 110,
      });

      expect(cost.regularCost).toBe(400); // 8 * $50
      expect(cost.overtimeCost).toBe(160); // 2 * $80
      expect(cost.doubleTimeCost).toBe(220); // 2 * $110
      expect(cost.totalCost).toBe(780);
    });

    it('should round costs to 2 decimal places', () => {
      const durationResult = {
        totalHours: 8.33,
        billableHours: 8.33,
        regularHours: 8,
        overtimeHours: 0.33,
        doubleTimeHours: 0,
        totalMinutes: 500,
        billableMinutes: 500,
        breakTimeMinutes: 0,
        travelTimeMinutes: 0,
        isMultiDay: false,
        daysSpanned: 1,
        warnings: [],
      };

      const cost = calculateCost(durationResult, {
        regularRate: 50,
      });

      expect(typeof cost.totalCost).toBe('number');
      expect(cost.totalCost.toString()).toMatch(/^\d+\.\d{1,2}$/);
    });
  });

  describe('formatDurationForResponse', () => {
    it('should format duration result correctly', () => {
      const durationResult = {
        totalHours: 9.5,
        billableHours: 8.5,
        regularHours: 8,
        overtimeHours: 0.5,
        doubleTimeHours: 0,
        totalMinutes: 570,
        billableMinutes: 510,
        breakTimeMinutes: 60,
        travelTimeMinutes: 30,
        isMultiDay: false,
        daysSpanned: 1,
        warnings: ['Test warning'],
      };

      const formatted = formatDurationForResponse(durationResult);

      expect(formatted).toEqual({
        total_hours: 9.5,
        billable_hours: 8.5,
        regular_hours: 8,
        overtime_hours: 0.5,
        double_time_hours: 0,
        total_minutes: 570,
        billable_minutes: 510,
        break_time_minutes: 60,
        travel_time_minutes: 30,
        is_multi_day: false,
        days_spanned: 1,
        warnings: ['Test warning'],
      });
    });
  });
});
