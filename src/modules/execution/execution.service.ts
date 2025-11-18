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

    // Find the most recent check-in for this service order
    const checkIn = await prismaAny.serviceOrderCheckIn?.findFirst?.({
      where: { serviceOrderId: dto.serviceOrderId },
      orderBy: { occurredAt: 'desc' },
    });
    if (!checkIn) {
      throw new BadRequestException('No check-in found for this service order. Cannot check out without check-in.');
    }

    const occurredAt = new Date(dto.occurredAt);
    const checkInTime = new Date(checkIn.occurredAt);

    // Import duration calculation utilities
    const { calculateDuration, validateCheckOutTiming, formatDurationForResponse } = require('./utils/duration-calculation.util');

    // Validate timing first
    const validationResult = validateCheckOutTiming({
      checkInTime,
      checkOutTime: occurredAt,
      breakTimeMinutes: dto.breakTimeMinutes,
      travelTimeMinutes: dto.travelTimeMinutes,
    });

    if (!validationResult.valid) {
      this.logger.error(
        `Check-out validation failed for service order ${dto.serviceOrderId}: ${validationResult.errors.join(', ')}`,
      );
      throw new BadRequestException(
        `Check-out validation failed: ${validationResult.errors.join('; ')}`,
      );
    }

    // Log warnings if any
    if (validationResult.warnings.length > 0) {
      this.logger.warn(
        `Check-out warnings for service order ${dto.serviceOrderId}: ${validationResult.warnings.join(', ')}`,
      );
    }

    // Calculate comprehensive duration metrics
    const durationResult = calculateDuration(
      {
        checkInTime,
        checkOutTime: occurredAt,
        breakTimeMinutes: dto.breakTimeMinutes,
        travelTimeMinutes: dto.travelTimeMinutes,
      },
      {
        standardWorkdayHours: 8,
        maxHoursPerDay: 16,
        doubleTimeOnWeekends: false, // Configure based on business rules
      },
    );

    // Use manual override if provided, otherwise use calculated duration
    const finalDurationMinutes = dto.durationMinutesOverride ?? durationResult.totalMinutes;

    if (dto.durationMinutesOverride) {
      this.logger.warn(
        `Manual duration override used for service order ${dto.serviceOrderId}: ${dto.durationMinutesOverride} minutes (calculated: ${durationResult.totalMinutes} minutes)`,
      );
    }

    // Validate completion requirements per domain spec
    // (product-docs/domain/06-execution-field-operations.md:900-916)
    this.validateCompletionRequirements(dto, durationResult);

    // Log all warnings from duration calculation
    if (durationResult.warnings.length > 0) {
      this.logger.warn(
        `Duration calculation warnings for service order ${dto.serviceOrderId}: ${durationResult.warnings.join(', ')}`,
      );
    }

    // Create check-out record with comprehensive data
    const record = await prismaAny.serviceOrderCheckOut.create({
      data: {
        serviceOrderId: dto.serviceOrderId,
        technicianUserId: dto.technicianUserId,
        occurredAt,
        durationMinutes: finalDurationMinutes,
        breakTimeMinutes: dto.breakTimeMinutes ?? 0,
        travelTimeMinutes: dto.travelTimeMinutes ?? 0,
        totalHours: durationResult.totalHours,
        billableHours: durationResult.billableHours,
        regularHours: durationResult.regularHours,
        overtimeHours: durationResult.overtimeHours,
        completionStatus: dto.completionStatus,
        workSummary: dto.workSummary ? JSON.stringify(dto.workSummary) : null,
        materialsUsed: dto.materialsUsed ? JSON.stringify(dto.materialsUsed) : null,
        customerSignature: dto.customerSignature ? JSON.stringify(dto.customerSignature) : null,
        technicianSignature: dto.technicianSignature ? JSON.stringify(dto.technicianSignature) : null,
        location: dto.location ? JSON.stringify(dto.location) : null,
        notes: dto.notes ?? null,
        isMultiDay: durationResult.isMultiDay,
        warnings: durationResult.warnings.length > 0 ? JSON.stringify(durationResult.warnings) : null,
      },
    });

    // Determine final state based on completion status
    let finalState = ServiceOrderState.COMPLETED;
    if (dto.completionStatus === 'INCOMPLETE' || dto.completionStatus === 'PARTIALLY_COMPLETED') {
      finalState = ServiceOrderState.IN_PROGRESS; // Keep in progress if not fully complete
    } else if (dto.completionStatus === 'CANCELLED') {
      finalState = ServiceOrderState.CANCELLED;
    } else if (dto.completionStatus === 'REQUIRES_FOLLOWUP') {
      finalState = ServiceOrderState.COMPLETED; // Mark as completed but may need follow-up
    }

    // Update service order state
    await this.prisma.serviceOrder.update({
      where: { id: dto.serviceOrderId },
      data: {
        state: finalState,
        stateChangedAt: new Date(),
      },
    });

    this.logger.log(
      `Check-out recorded for service order ${dto.serviceOrderId} by ${dto.technicianUserId}. ` +
        `Duration: ${durationResult.totalHours}h total, ${durationResult.billableHours}h billable. ` +
        `Status: ${dto.completionStatus}`,
    );

    // Return enhanced response with duration breakdown
    return {
      ...record,
      durationBreakdown: formatDurationForResponse(durationResult),
    };
  }

  /**
   * Validate completion requirements per domain specification
   * Based on product-docs/domain/06-execution-field-operations.md:900-916
   */
  private validateCompletionRequirements(dto: CheckOutDto, durationResult: any): void {
    const warnings: string[] = [];

    // 1. Customer signature required for completed jobs (unless waived)
    if (dto.completionStatus === 'COMPLETED' && !dto.customerSignature) {
      warnings.push(
        'Customer signature is recommended for completed jobs. Consider adding signature for better documentation.',
      );
    }

    // 2. Material documentation should be present for installations/repairs
    if (dto.materialsUsed && dto.materialsUsed.length > 0) {
      // Check for serial numbers on installed equipment
      const materialsWithoutSerials = dto.materialsUsed.filter(
        (m) => m.installed && (!m.serialNumbers || m.serialNumbers.length === 0),
      );
      if (materialsWithoutSerials.length > 0) {
        warnings.push(
          `Serial numbers missing for ${materialsWithoutSerials.length} installed material(s). This is required for equipment tracking.`,
        );
      }
    }

    // 3. Work summary validation
    if (!dto.workSummary || !dto.workSummary.description) {
      warnings.push('Work summary description is recommended for proper documentation.');
    }

    if (dto.workSummary && dto.workSummary.tasksCompleted.length === 0) {
      warnings.push('No tasks marked as completed in work summary.');
    }

    // 4. Incomplete job handling
    if (
      dto.completionStatus === 'INCOMPLETE' ||
      dto.completionStatus === 'PARTIALLY_COMPLETED' ||
      dto.completionStatus === 'REQUIRES_FOLLOWUP'
    ) {
      if (!dto.notes && !dto.workSummary?.issuesEncountered) {
        throw new BadRequestException(
          'Notes or issues description required for incomplete/partial completions.',
        );
      }
    }

    // Log all warnings
    if (warnings.length > 0) {
      this.logger.warn(`Completion validation warnings: ${warnings.join('; ')}`);
    }
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
