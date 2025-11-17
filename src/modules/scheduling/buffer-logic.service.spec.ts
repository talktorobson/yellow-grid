import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BufferLogicService } from './buffer-logic.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { of } from 'rxjs';

describe('BufferLogicService', () => {
  let service: BufferLogicService;

  const mockPrismaService = {
    calendarConfig: {
      findUnique: jest.fn(),
    },
    holiday: {
      findMany: jest.fn(),
    },
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BufferLogicService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<BufferLogicService>(BufferLogicService);
  });

  it('throws on holiday/non-working day', async () => {
    mockPrismaService.calendarConfig.findUnique.mockResolvedValue({
      workingDays: [1, 2, 3, 4, 5],
      globalBufferNonWorkingDays: 0,
      staticBufferNonWorkingDays: 0,
    });
    mockPrismaService.holiday.findMany.mockResolvedValue([{ date: new Date('2025-12-25') }]);

    await expect(
      service.validateBookingWindow({
        scheduledDate: new Date('2025-12-25'),
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when inside global buffer window', async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    mockPrismaService.calendarConfig.findUnique.mockResolvedValue({
      workingDays: [1, 2, 3, 4, 5],
      globalBufferNonWorkingDays: 2,
      staticBufferNonWorkingDays: 0,
    });
    mockPrismaService.holiday.findMany.mockResolvedValue([]);

    await expect(
      service.validateBookingWindow({
        scheduledDate: tomorrow,
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('passes for valid working day outside buffer', async () => {
    const today = new Date();
    const future = new Date(today);
    // Find next weekday (Mon-Fri)
    while (![1, 2, 3, 4, 5].includes(future.getDay())) {
      future.setDate(future.getDate() + 1);
    }
    // Ensure outside buffer window
    future.setDate(future.getDate() + 3);

    mockPrismaService.calendarConfig.findUnique.mockResolvedValue({
      workingDays: [1, 2, 3, 4, 5],
      globalBufferNonWorkingDays: 2,
      staticBufferNonWorkingDays: 0,
    });
    mockPrismaService.holiday.findMany.mockResolvedValue([]);

    await expect(
      service.validateBookingWindow({
        scheduledDate: future,
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      }),
    ).resolves.not.toThrow();
  });

  it('isPublicHoliday returns true for API holiday', async () => {
    mockHttpService.get.mockReturnValue(
      of({ data: [{ date: '2025-12-25', name: 'Christmas' }] }),
    );

    const result = await service.isPublicHoliday('ES', new Date('2025-12-25'));
    expect(result).toBe(true);
  });
});
