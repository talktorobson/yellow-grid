import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  SlotAvailabilityRequestDto,
  SlotAvailabilityResponseDto,
  AvailableSlotDto,
  SlotType,
} from '../dto';
import {
  IntegrationAdapter,
  IntegrationContext,
  ValidationResult,
  HealthStatus,
} from '../interfaces';
import { RedisService } from '../../../common/redis/redis.service';

@Injectable()
export class SlotAvailabilityService
  implements
    IntegrationAdapter<
      SlotAvailabilityRequestDto,
      SlotAvailabilityResponseDto
    >
{
  readonly adapterId = 'slot-availability';
  readonly version = '1.0.0';
  private readonly logger = new Logger(SlotAvailabilityService.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(private readonly redisService: RedisService) {}

  async execute(
    request: SlotAvailabilityRequestDto,
    context: IntegrationContext,
  ): Promise<SlotAvailabilityResponseDto> {
    this.logger.log('Processing slot availability request');

    // Check cache first
    const cacheKey = this.generateCacheKey(request);
    const cached =
      await this.redisService.get<SlotAvailabilityResponseDto>(cacheKey);
    if (cached) {
      this.logger.log('Returning cached slot availability');
      return cached;
    }

    // Validate request
    const validation = this.validate(request);
    if (!validation.isValid) {
      throw new Error(
        `Validation failed: ${validation.errors.map((e) => e.message).join(', ')}`,
      );
    }

    // TODO: Integration with actual scheduling service
    // For now, return mock available slots
    const availableSlots = this.generateMockSlots(request);

    const response: SlotAvailabilityResponseDto = {
      availableSlots,
      totalSlotsFound: availableSlots.length,
      searchCriteria: request,
    };

    // Cache for 5 minutes
    await this.redisService.setex(
      cacheKey,
      this.CACHE_TTL,
      JSON.stringify(response),
    );

    return response;
  }

  validate(request: SlotAvailabilityRequestDto): ValidationResult {
    const errors = [];

    if (
      !request.serviceAddress?.latitude ||
      !request.serviceAddress?.longitude
    ) {
      errors.push({
        field: 'serviceAddress',
        message: 'Valid latitude and longitude are required',
      });
    }

    if (!request.estimatedDuration || request.estimatedDuration <= 0) {
      errors.push({
        field: 'estimatedDuration',
        message: 'Valid estimated duration is required',
      });
    }

    const startDate = new Date(request.dateRange.startDate);
    const endDate = new Date(request.dateRange.endDate);

    if (startDate >= endDate) {
      errors.push({
        field: 'dateRange',
        message: 'Start date must be before end date',
      });
    }

    const maxRange = 90 * 24 * 60 * 60 * 1000; // 90 days
    if (endDate.getTime() - startDate.getTime() > maxRange) {
      errors.push({
        field: 'dateRange',
        message: 'Date range cannot exceed 90 days',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  transform(externalResponse: unknown): SlotAvailabilityResponseDto {
    return externalResponse as SlotAvailabilityResponseDto;
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now();
    return {
      status: 'healthy',
      latency: Date.now() - start,
      lastChecked: new Date(),
    };
  }

  private generateCacheKey(request: SlotAvailabilityRequestDto): string {
    return createHash('md5').update(JSON.stringify(request)).digest('hex');
  }

  private generateMockSlots(
    request: SlotAvailabilityRequestDto,
  ): AvailableSlotDto[] {
    // Mock implementation - replace with actual scheduling logic
    const slots: AvailableSlotDto[] = [];
    const startDate = new Date(request.dateRange.startDate);

    for (let i = 0; i < 5; i++) {
      const slotDate = new Date(startDate);
      slotDate.setDate(slotDate.getDate() + i);

      slots.push({
        slotId: `slot-${Date.now()}-${i}`,
        date: slotDate.toISOString().split('T')[0],
        timeWindow: {
          start: new Date(
            slotDate.setHours(9, 0, 0, 0),
          ).toISOString(),
          end: new Date(slotDate.setHours(12, 0, 0, 0)).toISOString(),
        },
        slotType: SlotType.MORNING,
        technicianId: `tech-${i + 1}`,
        technicianName: `Technician ${i + 1}`,
        travelTime: 15 + i * 5,
        capacityRemaining: 3,
      });
    }

    return slots;
  }
}
