import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { BufferLogicService } from './buffer-logic.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { of, throwError } from 'rxjs';

describe('BufferLogicService (PRD-Compliant)', () => {
  let service: BufferLogicService;
  let prismaService: PrismaService;
  let httpService: HttpService;

  const mockPrismaService = {
    calendarConfig: {
      findUnique: jest.fn(),
    },
    holiday: {
      findMany: jest.fn(),
    },
    serviceOrderBuffer: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  // Default calendar config: Mon-Fri working, 3 days global buffer, 2 days static buffer, 30min travel
  const defaultCalendarConfig = {
    id: 'config-1',
    countryCode: 'ES',
    businessUnit: 'LM_ES',
    workingDays: [1, 2, 3, 4, 5], // Monday-Friday
    timezone: 'Europe/Madrid',
    morningShiftStart: '08:00',
    morningShiftEnd: '14:00',
    afternoonShiftStart: '14:00',
    afternoonShiftEnd: '20:00',
    eveningShiftStart: null,
    eveningShiftEnd: null,
    globalBufferNonWorkingDays: 3,
    staticBufferNonWorkingDays: 2,
    travelBufferMinutes: 30,
    crossDayAllowed: false,
    holidayRegion: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BufferLogicService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<BufferLogicService>(BufferLogicService);
    prismaService = module.get<PrismaService>(PrismaService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateBookingWindow', () => {
    it('should allow booking on a working day outside global buffer window', async () => {
      mockPrismaService.calendarConfig.findUnique.mockResolvedValue(defaultCalendarConfig);
      mockPrismaService.holiday.findMany.mockResolvedValue([]);

      // Far future working day (Monday, well beyond buffer window)
      const scheduledDate = new Date('2025-12-15'); // Monday - working day

      await expect(
        service.validateBookingWindow({
          scheduledDate,
          countryCode: 'ES',
          businessUnit: 'LM_ES',
        }),
      ).resolves.not.toThrow();
    });

    it('should reject booking within global buffer window', async () => {
      mockPrismaService.calendarConfig.findUnique.mockResolvedValue(defaultCalendarConfig);
      mockPrismaService.holiday.findMany.mockResolvedValue([]);

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      await expect(
        service.validateBookingWindow({
          scheduledDate: tomorrow,
          countryCode: 'ES',
          businessUnit: 'LM_ES',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject booking on a weekend', async () => {
      mockPrismaService.calendarConfig.findUnique.mockResolvedValue(defaultCalendarConfig);
      mockPrismaService.holiday.findMany.mockResolvedValue([]);

      const scheduledDate = new Date('2025-01-04'); // Saturday

      await expect(
        service.validateBookingWindow({
          scheduledDate,
          countryCode: 'ES',
          businessUnit: 'LM_ES',
        }),
      ).rejects.toThrow('BANK_HOLIDAY');
    });

    it('should reject booking on a public holiday', async () => {
      mockPrismaService.calendarConfig.findUnique.mockResolvedValue(defaultCalendarConfig);
      mockPrismaService.holiday.findMany.mockResolvedValue([
        { date: new Date('2025-01-06') }, // Monday holiday
      ]);

      const scheduledDate = new Date('2025-01-06'); // Holiday

      await expect(
        service.validateBookingWindow({
          scheduledDate,
          countryCode: 'ES',
          businessUnit: 'LM_ES',
        }),
      ).rejects.toThrow('BANK_HOLIDAY');
    });

    it('should validate static buffer when deliveryDate is provided', async () => {
      mockPrismaService.calendarConfig.findUnique.mockResolvedValue(defaultCalendarConfig);
      mockPrismaService.holiday.findMany.mockResolvedValue([]);

      const deliveryDate = new Date('2025-01-10'); // Friday
      const scheduledDate = new Date('2025-01-09'); // Thursday (too close)

      await expect(
        service.validateBookingWindow({
          scheduledDate,
          countryCode: 'ES',
          businessUnit: 'LM_ES',
          deliveryDate,
        }),
      ).rejects.toThrow('BUFFER_WINDOW_VIOLATION');
    });

    it('should throw if calendar config not found', async () => {
      mockPrismaService.calendarConfig.findUnique.mockResolvedValue(null);

      await expect(
        service.validateBookingWindow({
          scheduledDate: new Date('2025-01-10'),
          countryCode: 'FR',
          businessUnit: 'LM_FR',
        }),
      ).rejects.toThrow('Calendar configuration not found');
    });
  });

  describe('getEarliestBookableDate', () => {
    it('should return earliest date considering global buffer', async () => {
      mockPrismaService.calendarConfig.findUnique.mockResolvedValue(defaultCalendarConfig);
      mockPrismaService.holiday.findMany.mockResolvedValue([]);

      const earliest = await service.getEarliestBookableDate('ES', 'LM_ES');

      expect(earliest).toBeInstanceOf(Date);
    });

    it('should return working day if global buffer is 0', async () => {
      const configNoBuffer = {
        ...defaultCalendarConfig,
        globalBufferNonWorkingDays: 0,
      };
      mockPrismaService.calendarConfig.findUnique.mockResolvedValue(configNoBuffer);
      mockPrismaService.holiday.findMany.mockResolvedValue([]);

      const earliest = await service.getEarliestBookableDate('ES', 'LM_ES');

      expect(earliest).toBeInstanceOf(Date);
    });
  });

  describe('calculateTravelBuffer', () => {
    it('should return travel buffer from config', async () => {
      mockPrismaService.calendarConfig.findUnique.mockResolvedValue(defaultCalendarConfig);

      const result = await service.calculateTravelBuffer('ES', 'LM_ES');

      expect(result.minutes).toBe(30);
      expect(result.reason).toContain('30 minutes');
    });

    it('should return 0 if no travel buffer configured', async () => {
      const configNoTravel = {
        ...defaultCalendarConfig,
        travelBufferMinutes: 0,
      };
      mockPrismaService.calendarConfig.findUnique.mockResolvedValue(configNoTravel);

      const result = await service.calculateTravelBuffer('ES', 'LM_ES');

      expect(result.minutes).toBe(0);
    });
  });

  describe('storeTravelBuffer', () => {
    it('should store travel buffer for service order', async () => {
      mockPrismaService.serviceOrderBuffer.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.serviceOrderBuffer.create.mockResolvedValue({
        id: 'buffer-1',
        serviceOrderId: 'order-1',
        travelBufferMinutesStart: 15,
        travelBufferMinutesEnd: 15,
        reason: 'Travel buffer applied: 15min before, 15min after',
        configRef: 'config-1',
        appliedAt: new Date(),
      });

      await service.storeTravelBuffer('order-1', 15, 15, 'config-1');

      expect(mockPrismaService.serviceOrderBuffer.deleteMany).toHaveBeenCalledWith({
        where: { serviceOrderId: 'order-1' },
      });
      expect(mockPrismaService.serviceOrderBuffer.create).toHaveBeenCalledWith({
        data: {
          serviceOrderId: 'order-1',
          travelBufferMinutesStart: 15,
          travelBufferMinutesEnd: 15,
          reason: expect.stringContaining('15min before, 15min after'),
          configRef: 'config-1',
        },
      });
    });
  });

  describe('getStoredTravelBuffer', () => {
    it('should retrieve stored travel buffer', async () => {
      mockPrismaService.serviceOrderBuffer.findUnique.mockResolvedValue({
        id: 'buffer-1',
        serviceOrderId: 'order-1',
        travelBufferMinutesStart: 15,
        travelBufferMinutesEnd: 15,
        reason: 'Travel buffer applied',
        configRef: 'config-1',
        appliedAt: new Date(),
      });

      const result = await service.getStoredTravelBuffer('order-1');

      expect(result).not.toBeNull();
      expect(result?.startMinutes).toBe(15);
      expect(result?.endMinutes).toBe(15);
    });

    it('should return null if no buffer stored', async () => {
      mockPrismaService.serviceOrderBuffer.findUnique.mockResolvedValue(null);

      const result = await service.getStoredTravelBuffer('order-999');

      expect(result).toBeNull();
    });
  });

  describe('isPublicHoliday', () => {
    it('should return true for public holidays from Nager.Date API', async () => {
      const mockHolidays = [
        { date: '2025-01-01', name: 'New Year' },
        { date: '2025-12-25', name: 'Christmas' },
      ];

      mockHttpService.get.mockReturnValue(
        of({ data: mockHolidays }),
      );

      const result = await service.isPublicHoliday('ES', new Date('2025-12-25'));

      expect(result).toBe(true);
    });

    it('should return false for non-holidays', async () => {
      const mockHolidays = [
        { date: '2025-01-01', name: 'New Year' },
      ];

      mockHttpService.get.mockReturnValue(
        of({ data: mockHolidays }),
      );

      const result = await service.isPublicHoliday('ES', new Date('2025-06-15'));

      expect(result).toBe(false);
    });

    it('should return false on API error', async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      const result = await service.isPublicHoliday('ES', new Date('2025-12-25'));

      expect(result).toBe(false);
    });
  });
});
