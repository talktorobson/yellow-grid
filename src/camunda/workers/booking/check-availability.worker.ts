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
    const { providerId, scheduledDate, scheduledSlot } = job.variables;

    // Simplified stub for infrastructure testing
    // TODO: Implement full availability checking logic
    this.logger.log(
      `Checking availability for provider ${providerId} on ${scheduledDate} ${scheduledSlot}`
    );

    // For now, always return available
    return {
      isAvailable: true,
      availableSlots: [{
        date: scheduledDate,
        slot: scheduledSlot,
        capacity: 3,
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
