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
    const { serviceOrderId, workTeamId, scheduledDate, scheduledSlot } = job.variables;

    // Simplified stub for infrastructure testing
    // TODO: Implement full calendar booking logic
    this.logger.log(
      `Reserving slot for order ${serviceOrderId}: ${scheduledDate} ${scheduledSlot} (team: ${workTeamId})`
    );

    const reservedAt = new Date();
    const expiresAt = new Date(reservedAt.getTime() + 30 * 60 * 1000);

    return {
      bookingId: `booking-${Date.now()}`,
      reservedAt: reservedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }
}
