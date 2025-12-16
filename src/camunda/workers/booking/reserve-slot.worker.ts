import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Input variables for reserve-slot task
 */
interface ReserveSlotInput {
  serviceOrderId: string;
  providerId: string;
  workTeamId: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledSlot: 'MORNING' | 'AFTERNOON' | 'EVENING';
  startSlotIndex?: number;
  endSlotIndex?: number;
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
 * Output variables from reserve-slot task
 */
interface ReserveSlotOutput {
  bookingId: string;
  reservedAt: string;
  expiresAt: string;
  startSlot: number;
  endSlot: number;
}

/**
 * Reserve Slot Worker
 *
 * Task Type: reserve-slot
 *
 * Creates a calendar booking reservation for the service order.
 * - Creates Booking record with PRE_BOOKED status
 * - Updates ServiceOrder with scheduled date/time
 * - Reservation expires if not confirmed
 */
@Injectable()
export class ReserveSlotWorker extends BaseWorker<ReserveSlotInput, ReserveSlotOutput> {
  protected readonly logger = new Logger(ReserveSlotWorker.name);
  readonly taskType = 'reserve-slot';
  readonly timeout = 15000;
  private readonly holdTtlHours = 48;

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async handle(job: ZeebeJob<ReserveSlotInput>): Promise<ReserveSlotOutput> {
    const {
      serviceOrderId,
      providerId,
      workTeamId,
      scheduledDate,
      scheduledSlot,
      startSlotIndex,
      endSlotIndex,
      serviceDurationMinutes = 60,
    } = job.variables;

    this.logger.log(
      `Reserving slot for order ${serviceOrderId}: ${scheduledDate} ${scheduledSlot} (team: ${workTeamId})`,
    );

    // Calculate slot indices if not provided
    const slotRange = SLOT_RANGES[scheduledSlot];
    const requiredSlots = Math.ceil(serviceDurationMinutes / 15);
    const startSlot = startSlotIndex ?? slotRange.start;
    const endSlot = endSlotIndex ?? Math.min(startSlot + requiredSlots - 1, slotRange.end);

    const bookingDate = new Date(scheduledDate);
    const reservedAt = new Date();
    const expiresAt = new Date(reservedAt.getTime() + this.holdTtlHours * 60 * 60 * 1000);

    // Generate idempotency key for this reservation
    const holdReference = `${serviceOrderId}-${scheduledDate}-${startSlot}-${endSlot}`;

    // Check for existing reservation (idempotency)
    const existingBooking = await this.prisma.booking.findUnique({
      where: { holdReference },
    });

    if (existingBooking) {
      this.logger.log(`Reservation already exists: ${existingBooking.id}`);
      return {
        bookingId: existingBooking.id,
        reservedAt: existingBooking.createdAt.toISOString(),
        expiresAt: existingBooking.expiresAt?.toISOString() || expiresAt.toISOString(),
        startSlot: existingBooking.startSlot,
        endSlot: existingBooking.endSlot,
      };
    }

    // Check for conflicts
    const conflictingBooking = await this.prisma.booking.findFirst({
      where: {
        workTeamId,
        bookingDate,
        status: { in: ['PRE_BOOKED', 'CONFIRMED'] },
        OR: [
          { AND: [{ startSlot: { lte: startSlot } }, { endSlot: { gte: startSlot } }] },
          { AND: [{ startSlot: { lte: endSlot } }, { endSlot: { gte: endSlot } }] },
          { AND: [{ startSlot: { gte: startSlot } }, { endSlot: { lte: endSlot } }] },
        ],
      },
    });

    if (conflictingBooking) {
      throw new BpmnError(
        'SLOT_NOT_AVAILABLE',
        `Slot ${startSlot}-${endSlot} on ${scheduledDate} is already booked`,
      );
    }

    // Create booking and update service order in transaction
    const booking = await this.prisma.$transaction(async (tx) => {
      // Create booking record
      const newBooking = await tx.booking.create({
        data: {
          serviceOrderId,
          providerId,
          workTeamId,
          bookingDate,
          startSlot,
          endSlot,
          durationMinutes: serviceDurationMinutes,
          shift: this.getShiftCode(scheduledSlot),
          bookingType: 'SERVICE_ORDER',
          status: 'PRE_BOOKED',
          expiresAt,
          holdReference,
          createdBy: 'camunda-reserve-slot',
        },
      });

      // Calculate actual scheduled time from slot index
      const hours = Math.floor(startSlot / 4);
      const minutes = (startSlot % 4) * 15;
      const scheduledStartTime = new Date(bookingDate);
      scheduledStartTime.setHours(hours, minutes, 0, 0);

      const endHours = Math.floor(endSlot / 4);
      const endMinutes = ((endSlot % 4) + 1) * 15;
      const scheduledEndTime = new Date(bookingDate);
      scheduledEndTime.setHours(endHours, endMinutes, 0, 0);

      // Update service order with scheduled times
      await tx.serviceOrder.update({
        where: { id: serviceOrderId },
        data: {
          scheduledDate: bookingDate,
          scheduledStartTime,
          scheduledEndTime,
          assignedWorkTeamId: workTeamId,
        },
      });

      return newBooking;
    });

    this.logger.log(
      `Slot reserved: ${booking.id} (${startSlot}-${endSlot} on ${scheduledDate}), expires ${expiresAt.toISOString()}`,
    );

    return {
      bookingId: booking.id,
      reservedAt: reservedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      startSlot,
      endSlot,
    };
  }

  private getShiftCode(slot: string): 'M' | 'A' | 'E' {
    switch (slot) {
      case 'MORNING':
        return 'M';
      case 'AFTERNOON':
        return 'A';
      default:
        return 'E';
    }
  }
}
