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
});
