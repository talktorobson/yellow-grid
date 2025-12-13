import { BookingService } from './booking.service';
import { RedisBitmapService } from './redis-bitmap.service';
import { SlotCalculatorService } from './slot-calculator.service';
import { ConfigService } from '@nestjs/config';
import { BookingStatus } from '@prisma/client';

const mockPrisma = {
  booking: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  workTeam: {
    findUnique: jest.fn(),
  },
  serviceOrder: {
    findMany: jest.fn(),
  },
  provider: {
    findMany: jest.fn(),
  },
};

const mockRedis = {
  reserveSlots: jest.fn(),
  releaseSlots: jest.fn(),
};

const slotCalculator = new SlotCalculatorService();

describe('BookingService', () => {
  let service: BookingService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.workTeam.findUnique.mockResolvedValue({ workingDays: [], shifts: [] });
    mockPrisma.booking.count.mockResolvedValue(0);
    service = new BookingService(
      mockPrisma as any,
      mockRedis as unknown as RedisBitmapService,
      slotCalculator,
      new ConfigService({ PREBOOK_TTL_HOURS: 48, PREBOOK_MAX_HOLDS_PER_CUSTOMER: 3 }),
    );
  });

  it('pre-books when slots are available', async () => {
    mockRedis.reserveSlots.mockResolvedValue(true);
    mockPrisma.booking.create.mockResolvedValue({ id: 'bk', status: BookingStatus.PRE_BOOKED });
    mockPrisma.workTeam.findUnique.mockResolvedValue({ workingDays: [], shifts: [] });
    mockPrisma.booking.count.mockResolvedValue(0);

    const result = await service.preBook({
      serviceOrderId: 'so1',
      providerId: 'p1',
      workTeamId: 'w1',
      bookingDate: '2025-01-01',
      startSlot: 1,
      endSlot: 3,
    });

    expect(result.id).toBe('bk');
    expect(mockRedis.reserveSlots).toHaveBeenCalled();
  });

  it('returns existing booking for idempotent holdReference', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({ id: 'existing' });
    mockPrisma.workTeam.findUnique.mockResolvedValue({ workingDays: [], shifts: [] });
    mockPrisma.booking.count.mockResolvedValue(0);

    const result = await service.preBook({
      serviceOrderId: 'so1',
      providerId: 'p1',
      workTeamId: 'w1',
      bookingDate: '2025-01-01',
      startSlot: 1,
      endSlot: 3,
      holdReference: 'hold-1',
    });

    expect(result.id).toBe('existing');
    expect(mockRedis.reserveSlots).not.toHaveBeenCalled();
  });

  it('confirms a booking', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({
      id: 'bk-1',
      status: BookingStatus.PRE_BOOKED,
    });
    mockPrisma.booking.update.mockResolvedValue({ id: 'bk-1', status: BookingStatus.CONFIRMED });

    const result = await service.confirm({ bookingId: 'bk-1' });

    expect(result.status).toBe(BookingStatus.CONFIRMED);
  });

  it('cancels and releases slots', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({
      id: 'bk-2',
      status: BookingStatus.PRE_BOOKED,
      workTeamId: 'w1',
      bookingDate: new Date('2025-01-01'),
      startSlot: 1,
      endSlot: 2,
    });
    mockPrisma.booking.update.mockResolvedValue({ id: 'bk-2', status: BookingStatus.CANCELLED });

    const result = await service.cancel({ bookingId: 'bk-2', reason: 'customer_cancelled' });
    expect(result.status).toBe(BookingStatus.CANCELLED);
    expect(mockRedis.releaseSlots).toHaveBeenCalled();
  });

  it('enforces hold limit per service order', async () => {
    mockPrisma.booking.count.mockResolvedValue(3); // at limit
    await expect(
      service.preBook({
        serviceOrderId: 'so-limit',
        providerId: 'p1',
        workTeamId: 'w1',
        bookingDate: '2025-01-01',
        startSlot: 1,
        endSlot: 2,
      }),
    ).rejects.toThrow('Maximum holds reached');
  });

  it('rejects when start slot is outside working shifts', async () => {
    mockPrisma.workTeam.findUnique.mockResolvedValue({
      workingDays: ['MON'],
      shifts: [{ startLocal: '08:00', endLocal: '16:00' }],
    });

    await expect(
      service.preBook({
        serviceOrderId: 'so1',
        providerId: 'p1',
        workTeamId: 'w1',
        bookingDate: '2025-01-06', // Monday
        startSlot: 80, // outside 08:00-16:00 window
        endSlot: 82,
      }),
    ).rejects.toThrow('outside working shifts');
  });

  describe('Calendar Features', () => {
    it('getScheduledOrders filters by providerIds and state', async () => {
      const mockOrders = [{ id: 'order-1' }];
      mockPrisma.serviceOrder.findMany.mockResolvedValue(mockOrders);

      const result = await service.getScheduledOrders({
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        providerIds: ['p1', 'p2'],
      });

      expect(mockPrisma.serviceOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedProviderId: { in: ['p1', 'p2'] },
            state: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
          }),
        }),
      );
      expect(result).toEqual(mockOrders);
    });

    it('getUtilizationMetrics calculates rates correctly', async () => {
      mockPrisma.provider.findMany.mockResolvedValue([{ id: 'p1', name: 'Provider 1' }]);

      // Mock orders: 2 orders of 4 hours (240 mins) each = 8 hours total
      mockPrisma.serviceOrder.findMany.mockResolvedValue([
        { estimatedDurationMinutes: 240 },
        { estimatedDurationMinutes: 240 },
      ]);

      const result = await service.getUtilizationMetrics({
        startDate: '2025-01-01', // Wednesday
        endDate: '2025-01-01', // 1 day
        providerIds: ['p1'],
      });

      // 1 day = 8 hours capacity
      // Scheduled = 8 hours
      // Utilization = 100%
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        providerId: 'p1',
        providerName: 'Provider 1',
        totalHours: 8,
        scheduledHours: 8,
        availableHours: 0,
        utilizationRate: 100,
      });
    });
  });
});
