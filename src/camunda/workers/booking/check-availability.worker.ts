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
  scheduledDate: string;
  scheduledSlot: 'MORNING' | 'AFTERNOON' | 'EVENING';
  serviceDurationMinutes?: number;
}

/**
 * Output variables from check-availability task
 */
interface CheckAvailabilityOutput {
  isAvailable: boolean;
  availableSlots: Array<{
    date: string;
    slot: string;
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
 * Returns alternative slots if not available.
 */
@Injectable()
export class CheckAvailabilityWorker extends BaseWorker<CheckAvailabilityInput, CheckAvailabilityOutput> {
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
      serviceDurationMinutes = 120,
    } = job.variables;

    const date = new Date(scheduledDate);
    const dayOfWeek = date.getDay(); // 0 = Sunday

    // Get provider working schedule
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        workingSchedule: true,
        workTeams: workTeamId
          ? { where: { id: workTeamId } }
          : { where: { status: 'ACTIVE' } },
      },
    });

    if (!provider) {
      return {
        isAvailable: false,
        availableSlots: [],
        conflictReason: 'Provider not found',
      };
    }

    // Check if provider works on this day
    const schedule = provider.workingSchedule;
    if (!schedule) {
      return {
        isAvailable: false,
        availableSlots: [],
        conflictReason: 'No working schedule configured',
      };
    }

    // Check working days
    const workingDays = schedule.workingDays || [];
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    
    if (!workingDays.includes(dayNames[dayOfWeek])) {
      return {
        isAvailable: false,
        availableSlots: await this.findAlternativeSlots(providerId, date, 7),
        conflictReason: `Provider does not work on ${dayNames[dayOfWeek]}`,
      };
    }

    // Check slot availability
    const slotWorking = {
      MORNING: schedule.morningShift,
      AFTERNOON: schedule.afternoonShift,
      EVENING: schedule.eveningShift,
    };

    if (!slotWorking[scheduledSlot]) {
      const availableSlots = Object.entries(slotWorking)
        .filter(([_, works]) => works)
        .map(([slot]) => ({
          date: scheduledDate,
          slot,
          capacity: 1,
        }));

      return {
        isAvailable: false,
        availableSlots,
        conflictReason: `Provider does not work ${scheduledSlot} shift`,
        suggestedSlot: availableSlots[0]?.slot,
      };
    }

    // Check existing bookings
    const existingBookings = await this.prisma.calendarBooking.count({
      where: {
        workTeamId: workTeamId || { in: provider.workTeams.map((t: any) => t.id) },
        date: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lt: new Date(date.setHours(23, 59, 59, 999)),
        },
        slot: scheduledSlot,
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
    });

    const maxCapacity = schedule.maxOrdersPerSlot || 3;
    
    if (existingBookings >= maxCapacity) {
      return {
        isAvailable: false,
        availableSlots: await this.findAlternativeSlots(providerId, date, 7),
        conflictReason: `Slot at capacity (${existingBookings}/${maxCapacity})`,
      };
    }

    this.logger.log(
      `Availability confirmed for ${providerId} on ${scheduledDate} ${scheduledSlot}`
    );

    return {
      isAvailable: true,
      availableSlots: [{
        date: scheduledDate,
        slot: scheduledSlot,
        capacity: maxCapacity - existingBookings,
      }],
    };
  }

  /**
   * Find alternative available slots in the next N days
   */
  private async findAlternativeSlots(
    providerId: string,
    startDate: Date,
    days: number,
  ): Promise<Array<{ date: string; slot: string; capacity: number }>> {
    const slots: Array<{ date: string; slot: string; capacity: number }> = [];
    
    // Simplified: return next 3 available morning slots
    for (let i = 1; i <= days && slots.length < 3; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Skip weekends for simplicity
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      slots.push({
        date: date.toISOString().split('T')[0],
        slot: 'MORNING',
        capacity: 1,
      });
    }
    
    return slots;
  }
}
