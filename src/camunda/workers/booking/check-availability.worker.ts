import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Input variables for check-availability task
 */
interface CheckAvailabilityInput {
  serviceOrderId: string;
  providerId: string;
  workTeamId?: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledSlot: 'MORNING' | 'AFTERNOON' | 'EVENING';
  serviceDurationMinutes?: number;
}

/**
 * Slot ranges (15-min slots: 0-95)
 */
const SLOT_RANGES = {
  MORNING: { start: 32, end: 47 }, // 08:00 - 12:00
  AFTERNOON: { start: 48, end: 67 }, // 12:00 - 17:00
  EVENING: { start: 68, end: 83 }, // 17:00 - 21:00
};

/**
 * Output variables from check-availability task
 */
interface CheckAvailabilityOutput {
  isAvailable: boolean;
  availableSlots: Array<{
    date: string;
    slot: string;
    startSlotIndex: number;
    endSlotIndex: number;
    capacity: number;
  }>;
  suggestedDate?: string;
  suggestedSlot?: string;
  conflictReason?: string;
}

/**
 * Check Availability Worker
 *
 * Task Type: check-availability
 *
 * Verifies provider/work team availability for requested date/slot.
 * - Checks existing bookings for conflicts
 * - Checks work team calendar for planned absences
 * - Returns alternative slots if not available
 */
@Injectable()
export class CheckAvailabilityWorker extends BaseWorker<
  CheckAvailabilityInput,
  CheckAvailabilityOutput
> {
  protected readonly logger = new Logger(CheckAvailabilityWorker.name);
  readonly taskType = 'check-availability';
  readonly timeout = 15000;

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async handle(job: ZeebeJob<CheckAvailabilityInput>): Promise<CheckAvailabilityOutput> {
    const {
      providerId,
      workTeamId,
      scheduledDate,
      scheduledSlot,
      serviceDurationMinutes = 60,
    } = job.variables;

    this.logger.log(
      `Checking availability for ${workTeamId || providerId} on ${scheduledDate} ${scheduledSlot}`,
    );

    const slotRange = SLOT_RANGES[scheduledSlot];
    const requiredSlots = Math.ceil(serviceDurationMinutes / 15);
    const bookingDate = new Date(scheduledDate);

    // Get work team if not specified, find one from provider
    let teamId = workTeamId;
    if (!teamId) {
      const workTeam = await this.prisma.workTeam.findFirst({
        where: { providerId, status: 'ACTIVE' },
        select: { id: true },
      });
      teamId = workTeam?.id;
    }

    if (!teamId) {
      this.logger.warn(`No active work team found for provider ${providerId}`);
      return {
        isAvailable: false,
        availableSlots: [],
        conflictReason: 'No active work team available',
      };
    }

    // Check for planned absences in work team calendar
    const workTeamCalendar = await this.prisma.workTeamCalendar.findUnique({
      where: { workTeamId: teamId },
      include: {
        plannedAbsences: {
          where: {
            startDate: { lte: bookingDate },
            endDate: { gte: bookingDate },
            status: 'APPROVED',
          },
        },
      },
    });

    if (workTeamCalendar?.plannedAbsences.length) {
      const absence = workTeamCalendar.plannedAbsences[0];
      this.logger.log(`Work team ${teamId} has planned absence on ${scheduledDate}`);
      // Find alternative slots
      const alternatives = await this.findAlternativeSlots(teamId, bookingDate, 7);
      return {
        isAvailable: false,
        availableSlots: alternatives,
        conflictReason: absence.reason || `Planned ${absence.absenceType.toLowerCase()}`,
        suggestedDate: alternatives[0]?.date,
        suggestedSlot: alternatives[0]?.slot,
      };
    }

    // Check existing bookings for slot conflicts
    const existingBookings = await this.prisma.booking.findMany({
      where: {
        workTeamId: teamId,
        bookingDate,
        status: { in: ['PRE_BOOKED', 'CONFIRMED'] },
        // Check for overlap: existing booking overlaps with requested slot range
        OR: [
          {
            // Existing booking starts within requested range
            startSlot: { gte: slotRange.start, lte: slotRange.end },
          },
          {
            // Existing booking ends within requested range
            endSlot: { gte: slotRange.start, lte: slotRange.end },
          },
          {
            // Existing booking spans the entire requested range
            AND: [
              { startSlot: { lte: slotRange.start } },
              { endSlot: { gte: slotRange.end } },
            ],
          },
        ],
      },
      select: { id: true, startSlot: true, endSlot: true },
    });

    // Calculate available capacity in the slot
    const bookedSlots = new Set<number>();
    for (const booking of existingBookings) {
      for (let s = booking.startSlot; s <= booking.endSlot; s++) {
        bookedSlots.add(s);
      }
    }

    // Find contiguous free slots within the range
    const freeRanges: Array<{ start: number; end: number }> = [];
    let rangeStart: number | null = null;

    for (let s = slotRange.start; s <= slotRange.end; s++) {
      if (bookedSlots.has(s)) {
        if (rangeStart !== null) {
          freeRanges.push({ start: rangeStart, end: s - 1 });
          rangeStart = null;
        }
      } else {
        rangeStart ??= s;
      }
    }
    if (rangeStart !== null) {
      freeRanges.push({ start: rangeStart, end: slotRange.end });
    }

    // Check if any free range can accommodate the service
    const viableRange = freeRanges.find((r) => r.end - r.start + 1 >= requiredSlots);

    if (viableRange) {
      this.logger.log(`Slot available: ${viableRange.start}-${viableRange.end}`);
      return {
        isAvailable: true,
        availableSlots: [
          {
            date: scheduledDate,
            slot: scheduledSlot,
            startSlotIndex: viableRange.start,
            endSlotIndex: viableRange.start + requiredSlots - 1,
            capacity: freeRanges.length,
          },
        ],
      };
    }

    // Not enough contiguous slots - find alternatives
    this.logger.log(`Insufficient capacity on ${scheduledDate} ${scheduledSlot}`);
    const alternatives = await this.findAlternativeSlots(teamId, bookingDate, 7);

    return {
      isAvailable: false,
      availableSlots: alternatives,
      conflictReason: 'Requested slot has conflicting bookings',
      suggestedDate: alternatives[0]?.date,
      suggestedSlot: alternatives[0]?.slot,
    };
  }

  /**
   * Find alternative available slots in the next N days
   */
  private async findAlternativeSlots(
    workTeamId: string,
    startDate: Date,
    days: number,
  ): Promise<Array<{ date: string; slot: string; startSlotIndex: number; endSlotIndex: number; capacity: number }>> {
    const slots: Array<{ date: string; slot: string; startSlotIndex: number; endSlotIndex: number; capacity: number }> = [];

    for (let i = 1; i <= days && slots.length < 3; i++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(checkDate.getDate() + i);

      // Skip weekends
      if (checkDate.getDay() === 0 || checkDate.getDay() === 6) continue;

      const dateStr = checkDate.toISOString().split('T')[0];

      // Check if date has planned absence
      const calendar = await this.prisma.workTeamCalendar.findUnique({
        where: { workTeamId },
        include: {
          plannedAbsences: {
            where: {
              startDate: { lte: checkDate },
              endDate: { gte: checkDate },
              status: 'APPROVED',
            },
          },
        },
      });
      if (calendar?.plannedAbsences.length) continue;

      // Check morning slot availability
      const morningBookings = await this.prisma.booking.count({
        where: {
          workTeamId,
          bookingDate: checkDate,
          status: { in: ['PRE_BOOKED', 'CONFIRMED'] },
          startSlot: { gte: SLOT_RANGES.MORNING.start, lte: SLOT_RANGES.MORNING.end },
        },
      });

      if (morningBookings < 4) {
        // Max 4 bookings per slot assumed
        slots.push({
          date: dateStr,
          slot: 'MORNING',
          startSlotIndex: SLOT_RANGES.MORNING.start,
          endSlotIndex: SLOT_RANGES.MORNING.start + 3,
          capacity: 4 - morningBookings,
        });
      }
    }

    return slots;
  }
}
