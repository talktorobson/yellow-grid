import { Injectable, BadRequestException, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { StatusUpdateDto } from './dto/status-update.dto';
import { ServiceOrderState } from '@prisma/client';
import { validateGeofence, type GeoLocation } from './utils/geofence.util';

@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkIn(dto: CheckInDto) {
    const prismaAny = this.prisma as any;
    const serviceOrder = await this.prisma.serviceOrder.findUnique({ where: { id: dto.serviceOrderId } });
    if (!serviceOrder) throw new NotFoundException('Service order not found');

    // Geofence validation (product-docs/domain/06-execution-field-operations.md:883-888)
    // Extract service location from serviceAddress JSON field
    const serviceAddress = serviceOrder.serviceAddress as any;
    if (!serviceAddress?.lat || !serviceAddress?.lng) {
      this.logger.warn(`Service order ${dto.serviceOrderId} missing location data, skipping geofence validation`);
    } else {
      const checkInLocation: GeoLocation = { lat: dto.lat, lng: dto.lng };
      const serviceLocation: GeoLocation = { lat: serviceAddress.lat, lng: serviceAddress.lng };

      const geofenceResult = validateGeofence(
        checkInLocation,
        serviceLocation,
        dto.accuracy,
        {
          radiusMeters: 100, // Default radius from API spec
          minAccuracyMeters: 50, // Per domain spec
          supervisorApprovalThresholdMeters: 500, // Per domain spec
        },
      );

      if (!geofenceResult.valid) {
        if (geofenceResult.requiresSupervisorApproval) {
          // Distance >500m requires supervisor approval
          this.logger.error(
            `Check-in rejected for service order ${dto.serviceOrderId}: ${geofenceResult.message}`,
          );
          throw new ForbiddenException(
            `Check-in location requires supervisor approval. ${geofenceResult.message}`,
          );
        } else {
          // Within 100m-500m range, requires manual check-in with justification
          this.logger.warn(
            `Check-in warning for service order ${dto.serviceOrderId}: ${geofenceResult.message}`,
          );
          // Note: Could add a 'requiresJustification' flag in DTO to allow manual override
          throw new BadRequestException(
            `Check-in outside geofence radius. ${geofenceResult.message}`,
          );
        }
      }

      this.logger.log(
        `Geofence validation passed for service order ${dto.serviceOrderId}: ${geofenceResult.message}`,
      );
    }

    const record = await prismaAny.serviceOrderCheckIn.create({
      data: {
        serviceOrderId: dto.serviceOrderId,
        providerId: dto.providerId,
        workTeamId: dto.workTeamId,
        technicianUserId: dto.technicianUserId,
        occurredAt: new Date(dto.occurredAt),
        lat: dto.lat,
        lng: dto.lng,
        accuracy: dto.accuracy ?? null,
        notes: dto.notes ?? null,
      },
    });

    // Transition to IN_PROGRESS when check-in happens
    await this.prisma.serviceOrder.update({
      where: { id: dto.serviceOrderId },
      data: {
        state: ServiceOrderState.IN_PROGRESS,
        stateChangedAt: new Date(),
      },
    });

    this.logger.log(`Check-in recorded for service order ${dto.serviceOrderId} by ${dto.technicianUserId}`);
    return record;
  }

  async checkOut(dto: CheckOutDto) {
    const prismaAny = this.prisma as any;
    const checkIn = await prismaAny.serviceOrderCheckIn?.findFirst?.({
      where: { serviceOrderId: dto.serviceOrderId },
      orderBy: { occurredAt: 'desc' },
    });
    if (!checkIn) throw new BadRequestException('No check-in found for this service order');

    const occurredAt = new Date(dto.occurredAt);
    const durationMinutes =
      dto.durationMinutes ??
      Math.max(0, Math.round((occurredAt.getTime() - checkIn.occurredAt.getTime()) / 60000));

    const record = await prismaAny.serviceOrderCheckOut.create({
      data: {
        serviceOrderId: dto.serviceOrderId,
        technicianUserId: dto.technicianUserId,
        occurredAt,
        durationMinutes,
        notes: dto.notes ?? null,
      },
    });

    // Transition to COMPLETED on checkout
    await this.prisma.serviceOrder.update({
      where: { id: dto.serviceOrderId },
      data: {
        state: ServiceOrderState.COMPLETED,
        stateChangedAt: new Date(),
      },
    });

    this.logger.log(`Check-out recorded for service order ${dto.serviceOrderId} by ${dto.technicianUserId}`);
    return record;
  }

  async updateStatus(dto: StatusUpdateDto) {
    const serviceOrder = await this.prisma.serviceOrder.findUnique({ where: { id: dto.serviceOrderId } });
    if (!serviceOrder) throw new NotFoundException('Service order not found');

    // Basic validation: disallow regressions from CLOSED/CANCELLED
    if (serviceOrder.state === ServiceOrderState.CLOSED || serviceOrder.state === ServiceOrderState.CANCELLED) {
      throw new BadRequestException('Service order is terminal');
    }

    const updated = await this.prisma.serviceOrder.update({
      where: { id: dto.serviceOrderId },
      data: {
        state: dto.newStatus,
        stateChangedAt: new Date(),
      },
    });

    this.logger.log(`Service order ${dto.serviceOrderId} status updated to ${dto.newStatus}`);
    return updated;
  }

  async offlineSync(ops: Array<Record<string, any>>) {
    // Placeholder: in production, apply conflict resolution per op type.
    this.logger.log(`Received offline sync batch with ${ops.length} ops`);
    return { processed: ops.length };
  }
}
