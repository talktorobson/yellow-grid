import { ExecutionService } from './execution.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ServiceOrderState } from '@prisma/client';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  serviceOrder: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  serviceOrderCheckIn: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  serviceOrderCheckOut: {
    create: jest.fn(),
  },
};

describe('ExecutionService', () => {
  let service: ExecutionService;

  const mockServiceOrderWithLocation = {
    id: 'so1',
    countryCode: 'ES',
    serviceAddress: {
      street: '123 Main St',
      city: 'Madrid',
      postalCode: '28001',
      lat: 40.4168,
      lng: -3.7038,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExecutionService(mockPrisma as unknown as PrismaService);
    mockPrisma.serviceOrder.findUnique.mockResolvedValue(mockServiceOrderWithLocation);
    mockPrisma.serviceOrder.update.mockResolvedValue({});
  });

  describe('checkIn', () => {
    it('records check-in and moves SO to IN_PROGRESS when within geofence', async () => {
      mockPrisma.serviceOrderCheckIn.create.mockResolvedValue({ id: 'ci1' });
      const result = await service.checkIn({
        serviceOrderId: 'so1',
        providerId: 'p1',
        workTeamId: 'w1',
        technicianUserId: 'u1',
        occurredAt: new Date().toISOString(),
        lat: 40.4169, // Very close to service location (40.4168, -3.7038)
        lng: -3.7039,
        accuracy: 10,
      });

      expect(result.id).toBe('ci1');
      expect(mockPrisma.serviceOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ state: ServiceOrderState.IN_PROGRESS }) }),
      );
    });

    it('allows check-in when service order has no location data', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so1',
        countryCode: 'ES',
        serviceAddress: { street: '123 Main St' }, // No lat/lng
      });
      mockPrisma.serviceOrderCheckIn.create.mockResolvedValue({ id: 'ci1' });

      const result = await service.checkIn({
        serviceOrderId: 'so1',
        providerId: 'p1',
        workTeamId: 'w1',
        technicianUserId: 'u1',
        occurredAt: new Date().toISOString(),
        lat: 40.4169,
        lng: -3.7039,
        accuracy: 10,
      });

      expect(result.id).toBe('ci1');
      expect(mockPrisma.serviceOrderCheckIn.create).toHaveBeenCalled();
    });

    it('rejects check-in with poor GPS accuracy (>50m)', async () => {
      await expect(
        service.checkIn({
          serviceOrderId: 'so1',
          providerId: 'p1',
          workTeamId: 'w1',
          technicianUserId: 'u1',
          occurredAt: new Date().toISOString(),
          lat: 40.4169,
          lng: -3.7039,
          accuracy: 60, // Poor accuracy
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.serviceOrderCheckIn.create).not.toHaveBeenCalled();
    });

    it('rejects check-in outside geofence radius (100m-500m)', async () => {
      await expect(
        service.checkIn({
          serviceOrderId: 'so1',
          providerId: 'p1',
          workTeamId: 'w1',
          technicianUserId: 'u1',
          occurredAt: new Date().toISOString(),
          lat: 40.4188, // ~250m away from service location
          lng: -3.7058,
          accuracy: 10,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.serviceOrderCheckIn.create).not.toHaveBeenCalled();
    });

    it('requires supervisor approval for check-in >500m away', async () => {
      await expect(
        service.checkIn({
          serviceOrderId: 'so1',
          providerId: 'p1',
          workTeamId: 'w1',
          technicianUserId: 'u1',
          occurredAt: new Date().toISOString(),
          lat: 40.4218, // ~700m away from service location
          lng: -3.7138,
          accuracy: 10,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.serviceOrderCheckIn.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when service order does not exist', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.checkIn({
          serviceOrderId: 'so1',
          providerId: 'p1',
          workTeamId: 'w1',
          technicianUserId: 'u1',
          occurredAt: new Date().toISOString(),
          lat: 40.4169,
          lng: -3.7039,
          accuracy: 10,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('accepts check-in with undefined GPS accuracy when within geofence', async () => {
      mockPrisma.serviceOrderCheckIn.create.mockResolvedValue({ id: 'ci1' });

      const result = await service.checkIn({
        serviceOrderId: 'so1',
        providerId: 'p1',
        workTeamId: 'w1',
        technicianUserId: 'u1',
        occurredAt: new Date().toISOString(),
        lat: 40.4169,
        lng: -3.7039,
        // accuracy: undefined (not provided)
      });

      expect(result.id).toBe('ci1');
      expect(mockPrisma.serviceOrderCheckIn.create).toHaveBeenCalled();
    });
  });

  describe('checkOut', () => {
    it('rejects checkout without check-in', async () => {
      mockPrisma.serviceOrderCheckIn.findFirst.mockResolvedValue(null);
      await expect(
        service.checkOut({
          serviceOrderId: 'so1',
          technicianUserId: 'u1',
          occurredAt: new Date().toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('processes checkout successfully when check-in exists', async () => {
      const checkInTime = new Date('2024-01-01T08:00:00Z');
      const checkOutTime = new Date('2024-01-01T17:00:00Z');

      mockPrisma.serviceOrderCheckIn.findFirst.mockResolvedValue({
        id: 'ci1',
        occurredAt: checkInTime,
      });
      mockPrisma.serviceOrderCheckOut.create.mockResolvedValue({ id: 'co1' });

      const result = await service.checkOut({
        serviceOrderId: 'so1',
        technicianUserId: 'u1',
        occurredAt: checkOutTime.toISOString(),
      });

      expect(result.id).toBe('co1');
      expect(mockPrisma.serviceOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ state: ServiceOrderState.COMPLETED }) }),
      );
    });
  });
});
