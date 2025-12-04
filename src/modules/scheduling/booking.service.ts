import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisBitmapService } from './redis-bitmap.service';
import { SlotCalculatorService } from './slot-calculator.service';
import { BookingStatus } from '@prisma/client';

export interface PreBookRequest {
  serviceOrderId: string;
  providerId: string;
  workTeamId: string;
  bookingDate: string; // YYYY-MM-DD
  startSlot: number;
  endSlot: number;
  durationMinutes?: number;
  holdReference?: string;
}

export interface ConfirmBookingRequest {
  bookingId?: string;
  holdReference?: string;
}

export interface CancelBookingRequest {
  bookingId: string;
  reason?: string;
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  private readonly holdTtlHours: number;
  private readonly maxHoldsPerServiceOrder: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisBitmap: RedisBitmapService,
    private readonly slotCalculator: SlotCalculatorService,
    private readonly configService: ConfigService,
  ) {
    this.holdTtlHours = this.configService.get<number>('PREBOOK_TTL_HOURS', 48);
    this.maxHoldsPerServiceOrder = this.configService.get<number>('PREBOOK_MAX_HOLDS_PER_CUSTOMER', 3);
  }

  async preBook(request: PreBookRequest) {
    const durationMinutes =
      request.durationMinutes ??
      (request.endSlot - request.startSlot + 1) * SlotCalculatorService.SLOT_MINUTES;

    if (request.startSlot < 0 || request.endSlot >= SlotCalculatorService.SLOTS_PER_DAY) {
      throw new BadRequestException('Invalid slot range');
    }

    if (request.endSlot < request.startSlot) {
      throw new BadRequestException('End slot must be after start slot');
    }

    await this.ensureShiftAllowsStart(request.workTeamId, request.bookingDate, request.startSlot, request.endSlot);
    await this.enforceHoldLimit(request.serviceOrderId);

    // Idempotency check
    if (request.holdReference) {
      const existing = await this.prisma.booking.findUnique({
        where: { holdReference: request.holdReference },
      });
      if (existing) {
        return existing;
      }
    }

    // Reserve slots atomically
    const reserved = await this.redisBitmap.reserveSlots({
      workTeamId: request.workTeamId,
      bookingDate: request.bookingDate,
      startSlot: request.startSlot,
      endSlot: request.endSlot,
    });
    if (!reserved) {
      throw new BadRequestException('Requested slots are not available');
    }

    const expiresAt = new Date(Date.now() + this.holdTtlHours * 60 * 60 * 1000);

    const booking = await this.prisma.booking.create({
      data: {
        serviceOrderId: request.serviceOrderId,
        providerId: request.providerId,
        workTeamId: request.workTeamId,
        bookingDate: new Date(request.bookingDate),
        startSlot: request.startSlot,
        endSlot: request.endSlot,
        durationMinutes,
        bookingType: 'SERVICE_ORDER',
        status: BookingStatus.PRE_BOOKED,
        expiresAt,
        holdReference: request.holdReference,
      },
    });

    this.logger.log(`Pre-booked slots ${request.startSlot}-${request.endSlot} for workTeam ${request.workTeamId}`);
    return booking;
  }

  async confirm(request: ConfirmBookingRequest) {
    const booking = await this.findBooking(request);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.status === BookingStatus.CONFIRMED) {
      return booking;
    }
    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.EXPIRED) {
      throw new BadRequestException('Booking is not active');
    }

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CONFIRMED,
        confirmedAt: new Date(),
        expiresAt: null,
      },
    });

    this.logger.log(`Confirmed booking ${booking.id}`);
    return updated;
  }

  async cancel(request: CancelBookingRequest) {
    const booking = await this.prisma.booking.findUnique({ where: { id: request.bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    await this.redisBitmap.releaseSlots({
      workTeamId: booking.workTeamId,
      bookingDate: booking.bookingDate.toISOString().substring(0, 10),
      startSlot: booking.startSlot,
      endSlot: booking.endSlot,
    });

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: request.reason,
      },
    });

    this.logger.log(`Cancelled booking ${booking.id}`);
    return updated;
  }

  async expire(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    await this.redisBitmap.releaseSlots({
      workTeamId: booking.workTeamId,
      bookingDate: booking.bookingDate.toISOString().substring(0, 10),
      startSlot: booking.startSlot,
      endSlot: booking.endSlot,
    });

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.EXPIRED,
        expiresAt: new Date(),
      },
    });
    return updated;
  }

  async getAvailability(params: {
    workTeamId: string;
    bookingDate: string;
    durationMinutes?: number;
  }): Promise<{ availableStartSlots: number[]; availability: boolean[] }> {
    const availability = await this.redisBitmap.getAvailability(params.workTeamId, params.bookingDate);
    const availableStartSlots: number[] = [];

    const requiredSlots = params.durationMinutes
      ? Math.ceil(params.durationMinutes / SlotCalculatorService.SLOT_MINUTES)
      : 1;

    for (let i = 0; i < availability.length; i++) {
      const slice = availability.slice(i, i + requiredSlots);
      if (slice.length === requiredSlots && slice.every(Boolean)) {
        availableStartSlots.push(i);
      }
    }

    return { availableStartSlots, availability };
  }

  async getScheduledOrders(params: {
    startDate: string;
    endDate: string;
    providerIds?: string[];
    countryCode?: string;
  }) {
    const { startDate, endDate, providerIds, countryCode } = params;
    
    // Ensure end date covers the full day
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return this.prisma.serviceOrder.findMany({
      where: {
        scheduledDate: {
          gte: new Date(startDate),
          lte: end,
        },
        ...(providerIds && providerIds.length > 0 && { assignedProviderId: { in: providerIds } }),
        ...(countryCode && { countryCode }),
        state: {
          in: ['ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'],
        },
      },
      include: {
        assignedProvider: true,
        project: true,
      },
    });
  }

  async getUtilizationMetrics(params: {
    startDate: string;
    endDate: string;
    providerIds?: string[];
  }) {
    const { startDate, endDate, providerIds } = params;
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get all providers if not specified
    const providers = await this.prisma.provider.findMany({
      where: {
        ...(providerIds && providerIds.length > 0 && { id: { in: providerIds } }),
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    const providerCount = providers.length;
    const providerIdsList = providers.map(p => p.id);

    // Get all orders for these providers in the range
    const orders = await this.prisma.serviceOrder.findMany({
      where: {
        assignedProviderId: { in: providerIdsList },
        scheduledDate: {
          gte: start,
          lte: end,
        },
        state: {
          in: ['ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'],
        },
      },
      select: {
        scheduledDate: true,
        estimatedDurationMinutes: true,
      },
    });

    const dailyMetrics: Record<string, { scheduledMinutes: number; totalCapacityMinutes: number }> = {};

    // Initialize days
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dailyMetrics[dateStr] = {
        scheduledMinutes: 0,
        totalCapacityMinutes: providerCount * 8 * 60, // 8 hours per provider
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate orders
    for (const order of orders) {
      if (!order.scheduledDate) continue;
      const dateStr = order.scheduledDate.toISOString().split('T')[0];
      
      if (dailyMetrics[dateStr]) {
        dailyMetrics[dateStr].scheduledMinutes += (order.estimatedDurationMinutes || 0);
      }
    }

    // Format result
    return Object.entries(dailyMetrics).map(([date, metrics]) => {
      const scheduledHours = metrics.scheduledMinutes / 60;
      const totalHours = metrics.totalCapacityMinutes / 60;
      const availableHours = Math.max(0, totalHours - scheduledHours);
      const utilizationRate = totalHours > 0 ? (scheduledHours / totalHours) : 0;

      return {
        date,
        totalHours,
        scheduledHours,
        availableHours,
        utilizationRate: Number(utilizationRate.toFixed(2)),
      };
    });
  }

  async getProviderAvailability(params: {
    startDate: string;
    endDate: string;
    providerIds?: string[];
    countryCode?: string;
  }) {
    const { startDate, endDate, providerIds, countryCode } = params;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const providers = await this.prisma.provider.findMany({
      where: {
        ...(providerIds && providerIds.length > 0 && { id: { in: providerIds } }),
        ...(countryCode && { countryCode }),
        status: 'ACTIVE',
      },
      include: {
        workTeams: true,
      },
    });

    const result = [];

    // Iterate days
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      for (const provider of providers) {
        // Simplified: Use the first work team's shift or default 08:00-17:00
        const workTeam = provider.workTeams[0];
        let shifts = [{ start: '08:00', end: '17:00' }];
        
        if (workTeam && workTeam.shifts && Array.isArray(workTeam.shifts)) {
             const teamShifts = workTeam.shifts as any[];
             if (teamShifts.length > 0) {
                 shifts = teamShifts.map(s => ({ start: s.startLocal, end: s.endLocal }));
             }
        }

        // Get orders for this day
        const orders = await this.prisma.serviceOrder.findMany({
          where: {
            assignedProviderId: provider.id,
            scheduledDate: {
              gte: new Date(dateStr + 'T00:00:00Z'),
              lt: new Date(dateStr + 'T23:59:59Z'),
            },
            state: { in: ['SCHEDULED', 'IN_PROGRESS'] }
          }
        });

        const slots = [];
        // Create available slots from shifts
        for (const shift of shifts) {
            slots.push({
                id: `slot-${provider.id}-${dateStr}-${shift.start}`,
                providerId: provider.id,
                startTime: `${dateStr}T${shift.start}:00`,
                endTime: `${dateStr}T${shift.end}:00`,
                status: 'available'
            });
        }

        // Mark busy slots
        for (const order of orders) {
             if (!order.scheduledDate) continue;
             const orderStart = new Date(order.scheduledDate);
             const orderEnd = new Date(orderStart.getTime() + (order.estimatedDurationMinutes || 60) * 60000);
             
             slots.push({
                id: `order-${order.id}`,
                providerId: provider.id,
                startTime: orderStart.toISOString(),
                endTime: orderEnd.toISOString(),
                status: 'busy'
             });
        }

        result.push({
            providerId: provider.id,
            providerName: provider.name,
            date: dateStr,
            slots,
            totalAvailableHours: 8, // Mock
            utilization: orders.length > 0 ? 0.5 : 0 // Mock
        });
      }
    }

    return result;
  }

  private async findBooking(request: ConfirmBookingRequest) {
    if (request.bookingId) {
      return this.prisma.booking.findUnique({ where: { id: request.bookingId } });
    }
    if (request.holdReference) {
      return this.prisma.booking.findUnique({ where: { holdReference: request.holdReference } });
    }
    throw new BadRequestException('bookingId or holdReference is required');
  }

  private async ensureShiftAllowsStart(
    workTeamId: string,
    bookingDate: string,
    startSlot: number,
    endSlot: number,
  ): Promise<void> {
    const workTeam = await this.prisma.workTeam.findUnique({
      where: { id: workTeamId },
      select: { workingDays: true, shifts: true },
    });

    if (!workTeam) {
      throw new BadRequestException('Work team not found');
    }

    const date = new Date(bookingDate);
    const weekday = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][date.getUTCDay()];
    const workingDays: string[] = Array.isArray(workTeam.workingDays)
      ? (workTeam.workingDays as string[]).filter(Boolean)
      : [];

    if (workingDays.length && !workingDays.includes(weekday)) {
      throw new BadRequestException('Requested day is not a working day');
    }

    const shifts: Array<{ startLocal: string; endLocal: string }> = Array.isArray(workTeam.shifts)
      ? (workTeam.shifts as any)
      : [];

    if (shifts.length === 0) {
      // If no shift data, allow for now
      return;
    }

    const slotFromTime = (time: string) => {
      const [h, m] = time.split(':').map((v) => parseInt(v, 10));
      return Math.floor((h * 60 + m) / SlotCalculatorService.SLOT_MINUTES);
    };

    const inAnyShift = shifts.some((shift) => {
      const shiftStart = slotFromTime(shift.startLocal);
      const shiftEnd = slotFromTime(shift.endLocal);
      // HasStart check: start must fall inside shift, and end must not exceed shift end
      return (
        this.slotCalculator.hasStartInShift(startSlot, shiftStart, shiftEnd) && endSlot < shiftEnd
      );
    });

    if (!inAnyShift) {
      throw new BadRequestException('Requested start time is outside working shifts');
    }
  }

  private async enforceHoldLimit(serviceOrderId: string): Promise<void> {
    if (!this.maxHoldsPerServiceOrder || this.maxHoldsPerServiceOrder <= 0) {
      return;
    }

    const activeHolds = await this.prisma.booking.count({
      where: {
        serviceOrderId,
        status: BookingStatus.PRE_BOOKED,
        expiresAt: { gt: new Date() },
      },
    });

    if (activeHolds >= this.maxHoldsPerServiceOrder) {
      throw new BadRequestException('Maximum holds reached for this service order');
    }
  }
}
