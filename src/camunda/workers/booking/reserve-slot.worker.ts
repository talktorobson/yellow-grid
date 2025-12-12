import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Input variables for reserve-slot task
 */
interface ReserveSlotInput {
  serviceOrderId: string;
  providerId: string;
  workTeamId: string;
  scheduledDate: string;
  scheduledSlot: 'MORNING' | 'AFTERNOON' | 'EVENING';
  serviceDurationMinutes?: number;
}

/**
 * Output variables from reserve-slot task
 */
interface ReserveSlotOutput {
  bookingId: string;
  reservedAt: string;
  expiresAt: string;
}

/**
 * Reserve Slot Worker
 * 
 * Task Type: reserve-slot
 * 
 * Creates a calendar booking reservation for the service order.
 * The reservation can be temporary (pending confirmation) or permanent.
 */
@Injectable()
export class ReserveSlotWorker extends BaseWorker<ReserveSlotInput, ReserveSlotOutput> {
  protected readonly logger = new Logger(ReserveSlotWorker.name);
  readonly taskType = 'reserve-slot';
  readonly timeout = 15000;

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
      serviceDurationMinutes = 120,
    } = job.variables;

    // Verify work team belongs to provider
    const workTeam = await this.prisma.workTeam.findFirst({
      where: {
        id: workTeamId,
        providerId: providerId,
        status: 'ACTIVE',
      },
    });

    if (!workTeam) {
      throw new BpmnError(
        'BPMN_INVALID_WORK_TEAM',
        `Work team ${workTeamId} not found or not active for provider ${providerId}`
      );
    }

    const reservedAt = new Date();
    // Reservation expires in 30 minutes if not confirmed
    const expiresAt = new Date(reservedAt.getTime() + 30 * 60 * 1000);

    // Create calendar booking
    const booking = await this.prisma.calendarBooking.create({
      data: {
        workTeamId,
        serviceOrderId,
        date: new Date(scheduledDate),
        slot: scheduledSlot,
        durationMinutes: serviceDurationMinutes,
        status: 'PENDING',
        createdAt: reservedAt,
      },
    });

    this.logger.log(
      `Reserved slot for order ${serviceOrderId}: ${scheduledDate} ${scheduledSlot} ` +
      `(team: ${workTeamId}, expires: ${expiresAt.toISOString()})`
    );

    return {
      bookingId: booking.id,
      reservedAt: reservedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }
}
