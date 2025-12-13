import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TechnicalVisitsService } from './technical-visits.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { KafkaProducerService } from '../../common/kafka/kafka-producer.service';
import { TvOutcome, ServiceType, DependencyType, ServiceOrderState } from '@prisma/client';
import { RecordTvOutcomeDto } from './dto';

describe('TechnicalVisitsService', () => {
  let service: TechnicalVisitsService;
  let prismaService: PrismaService;
  let kafkaProducer: KafkaProducerService;

  const mockPrismaService = {
    serviceOrder: {
      findUnique: jest.fn(),
    },
    technicalVisitOutcome: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    serviceOrderDependency: {
      findFirst: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockKafkaProducerService = {
    sendEvent: jest.fn().mockResolvedValue([{ partition: 0, offset: '123' }]),
    isProducerConnected: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TechnicalVisitsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: KafkaProducerService,
          useValue: mockKafkaProducerService,
        },
      ],
    }).compile();

    service = module.get<TechnicalVisitsService>(TechnicalVisitsService);
    prismaService = module.get<PrismaService>(PrismaService);
    kafkaProducer = module.get<KafkaProducerService>(KafkaProducerService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordOutcome', () => {
    const tvServiceOrderId = 'so_tv_123';
    const installationOrderId = 'so_install_456';
    const userId = 'user_tech_001';

    const tvServiceOrder = {
      id: tvServiceOrderId,
      state: ServiceOrderState.COMPLETED,
      projectId: 'proj_123',
      service: {
        id: 'svc_tv',
        serviceType: ServiceType.CONFIRMATION_TV,
      },
    };

    const installationOrder = {
      id: installationOrderId,
      projectId: 'proj_123',
      service: {
        id: 'svc_install',
        serviceType: ServiceType.INSTALLATION,
      },
    };

    it('should record YES outcome successfully', async () => {
      const recordDto: RecordTvOutcomeDto = {
        tvServiceOrderId,
        linkedInstallationOrderId: installationOrderId,
        outcome: TvOutcome.YES,
        technicianNotes: 'All requirements met',
      };

      const expectedOutcome = {
        id: 'tvo_123',
        tvServiceOrderId,
        linkedInstallationOrderId: installationOrderId,
        outcome: TvOutcome.YES,
        modifications: null,
        technicianNotes: 'All requirements met',
        recordedBy: userId,
        installationBlocked: false,
        scopeChangeRequested: false,
        scopeChangeRequestedAt: null,
        scopeChangeApproved: null,
        scopeChangeApprovedAt: null,
        scopeChangeApprovedBy: null,
        installationUnblockedAt: null,
        recordedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.serviceOrder.findUnique
        .mockResolvedValueOnce(tvServiceOrder) // TV service order
        .mockResolvedValueOnce(installationOrder); // Installation order

      mockPrismaService.technicalVisitOutcome.create.mockResolvedValue(expectedOutcome);

      const result = await service.recordOutcome(recordDto, userId);

      expect(result).toBeDefined();
      expect(result.outcome).toBe(TvOutcome.YES);
      expect(result.installationBlocked).toBe(false);

      // Should create outcome with installationBlocked=false for YES
      expect(mockPrismaService.technicalVisitOutcome.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            installationBlocked: false,
            scopeChangeRequested: false,
          }),
        }),
      );

      // Should NOT create dependency for YES outcome
      expect(mockPrismaService.serviceOrderDependency.create).not.toHaveBeenCalled();

      // Should publish Kafka event
      expect(mockKafkaProducerService.sendEvent).toHaveBeenCalledWith(
        'projects.tv_outcome.recorded',
        expect.objectContaining({
          tv_service_order_id: tvServiceOrderId,
          outcome: 'YES',
        }),
        expect.any(String), // correlation ID
      );
    });

    it('should record YES_BUT outcome and block installation', async () => {
      const modifications = [
        {
          description: 'Additional electrical work required',
          extraDurationMin: 60,
          reason: 'Outlet not compliant',
        },
      ];

      const recordDto: RecordTvOutcomeDto = {
        tvServiceOrderId,
        linkedInstallationOrderId: installationOrderId,
        outcome: TvOutcome.YES_BUT,
        modifications,
        technicianNotes: 'Modifications required',
      };

      const expectedOutcome = {
        id: 'tvo_123',
        tvServiceOrderId,
        linkedInstallationOrderId: installationOrderId,
        outcome: TvOutcome.YES_BUT,
        modifications,
        technicianNotes: 'Modifications required',
        recordedBy: userId,
        installationBlocked: true,
        scopeChangeRequested: true,
        scopeChangeRequestedAt: expect.any(Date),
        scopeChangeApproved: null,
        scopeChangeApprovedAt: null,
        scopeChangeApprovedBy: null,
        installationUnblockedAt: null,
        recordedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.serviceOrder.findUnique
        .mockResolvedValueOnce(tvServiceOrder)
        .mockResolvedValueOnce(installationOrder);

      mockPrismaService.technicalVisitOutcome.create.mockResolvedValue(expectedOutcome);

      mockPrismaService.serviceOrderDependency.findFirst.mockResolvedValue(null);

      const result = await service.recordOutcome(recordDto, userId);

      expect(result).toBeDefined();
      expect(result.outcome).toBe(TvOutcome.YES_BUT);
      expect(result.installationBlocked).toBe(true);
      expect(result.scopeChangeRequested).toBe(true);

      // Should create dependency for YES_BUT
      expect(mockPrismaService.serviceOrderDependency.create).toHaveBeenCalledWith({
        data: {
          dependentOrderId: installationOrderId,
          blocksOrderId: tvServiceOrderId,
          dependencyType: DependencyType.TV_OUTCOME,
          staticBufferDays: 0,
        },
      });

      // Should publish Kafka event with modifications
      expect(mockKafkaProducerService.sendEvent).toHaveBeenCalledWith(
        'projects.tv_outcome.recorded',
        expect.objectContaining({
          tv_service_order_id: tvServiceOrderId,
          outcome: 'YES_BUT',
          modifications: expect.arrayContaining([
            expect.objectContaining({
              description: 'Additional electrical work required',
            }),
          ]),
        }),
        expect.any(String),
      );
    });

    it('should record NO outcome and block installation', async () => {
      const recordDto: RecordTvOutcomeDto = {
        tvServiceOrderId,
        linkedInstallationOrderId: installationOrderId,
        outcome: TvOutcome.NO,
        technicianNotes: 'Cannot proceed with installation',
      };

      const expectedOutcome = {
        id: 'tvo_123',
        tvServiceOrderId,
        linkedInstallationOrderId: installationOrderId,
        outcome: TvOutcome.NO,
        modifications: null,
        technicianNotes: 'Cannot proceed with installation',
        recordedBy: userId,
        installationBlocked: true,
        scopeChangeRequested: false,
        scopeChangeRequestedAt: null,
        scopeChangeApproved: null,
        scopeChangeApprovedAt: null,
        scopeChangeApprovedBy: null,
        installationUnblockedAt: null,
        recordedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.serviceOrder.findUnique
        .mockResolvedValueOnce(tvServiceOrder)
        .mockResolvedValueOnce(installationOrder);

      mockPrismaService.technicalVisitOutcome.create.mockResolvedValue(expectedOutcome);

      mockPrismaService.serviceOrderDependency.findFirst.mockResolvedValue(null);

      const result = await service.recordOutcome(recordDto, userId);

      expect(result).toBeDefined();
      expect(result.outcome).toBe(TvOutcome.NO);
      expect(result.installationBlocked).toBe(true);

      // Should create dependency for NO
      expect(mockPrismaService.serviceOrderDependency.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if TV service order not found', async () => {
      const recordDto: RecordTvOutcomeDto = {
        tvServiceOrderId,
        outcome: TvOutcome.YES,
      };

      mockPrismaService.serviceOrder.findUnique.mockResolvedValue(null);

      await expect(service.recordOutcome(recordDto, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if service order is not TV type', async () => {
      const recordDto: RecordTvOutcomeDto = {
        tvServiceOrderId,
        outcome: TvOutcome.YES,
      };

      const nonTvServiceOrder = {
        ...tvServiceOrder,
        service: {
          id: 'svc_install',
          serviceType: ServiceType.INSTALLATION,
        },
      };

      mockPrismaService.serviceOrder.findUnique.mockResolvedValue(nonTvServiceOrder);

      await expect(service.recordOutcome(recordDto, userId)).rejects.toThrow(BadRequestException);
      await expect(service.recordOutcome(recordDto, userId)).rejects.toThrow(
        /not a Technical Visit/,
      );
    });

    it('should throw BadRequestException if TV not COMPLETED', async () => {
      const recordDto: RecordTvOutcomeDto = {
        tvServiceOrderId,
        outcome: TvOutcome.YES,
      };

      const incompleteTvOrder = {
        ...tvServiceOrder,
        state: ServiceOrderState.IN_PROGRESS,
      };

      mockPrismaService.serviceOrder.findUnique.mockResolvedValue(incompleteTvOrder);

      await expect(service.recordOutcome(recordDto, userId)).rejects.toThrow(BadRequestException);
      await expect(service.recordOutcome(recordDto, userId)).rejects.toThrow(
        /must be in COMPLETED state/,
      );
    });

    it('should throw BadRequestException if YES_BUT without modifications', async () => {
      const recordDto: RecordTvOutcomeDto = {
        tvServiceOrderId,
        outcome: TvOutcome.YES_BUT,
        // Missing modifications
      };

      mockPrismaService.serviceOrder.findUnique.mockResolvedValue(tvServiceOrder);

      await expect(service.recordOutcome(recordDto, userId)).rejects.toThrow(BadRequestException);
      await expect(service.recordOutcome(recordDto, userId)).rejects.toThrow(
        /Modifications are required/,
      );
    });

    it('should throw BadRequestException if linked order is not INSTALLATION type', async () => {
      const recordDto: RecordTvOutcomeDto = {
        tvServiceOrderId,
        linkedInstallationOrderId: installationOrderId,
        outcome: TvOutcome.YES,
      };

      const nonInstallOrder = {
        ...installationOrder,
        service: {
          id: 'svc_maint',
          serviceType: ServiceType.MAINTENANCE,
        },
      };

      mockPrismaService.serviceOrder.findUnique
        .mockResolvedValueOnce(tvServiceOrder)
        .mockResolvedValueOnce(nonInstallOrder);

      await expect(service.recordOutcome(recordDto, userId)).rejects.toThrow(BadRequestException);
      await expect(service.recordOutcome(recordDto, userId)).rejects.toThrow(/not an INSTALLATION/);
    });
  });

  describe('approveScopeChange', () => {
    const outcomeId = 'tvo_123';
    const userId = 'user_manager_001';
    const installationOrderId = 'so_install_456';

    it('should approve scope change for YES_BUT outcome', async () => {
      const tvOutcome = {
        id: outcomeId,
        tvServiceOrderId: 'so_tv_123',
        linkedInstallationOrderId: installationOrderId,
        outcome: TvOutcome.YES_BUT,
        installationBlocked: true,
        scopeChangeRequested: true,
        scopeChangeApproved: null,
      };

      const updatedOutcome = {
        ...tvOutcome,
        scopeChangeApproved: true,
        scopeChangeApprovedAt: new Date(),
        scopeChangeApprovedBy: userId,
        installationBlocked: false,
        installationUnblockedAt: new Date(),
      };

      mockPrismaService.technicalVisitOutcome.findUnique
        .mockResolvedValueOnce(tvOutcome)
        .mockResolvedValueOnce(updatedOutcome);

      mockPrismaService.technicalVisitOutcome.update.mockResolvedValue(updatedOutcome);

      const result = await service.approveScopeChange(outcomeId, userId);

      expect(result).toBeDefined();
      expect(result.scopeChangeApproved).toBe(true);
      expect(result.scopeChangeApprovedBy).toBe(userId);
      expect(result.installationBlocked).toBe(false);

      // Should update outcome with approval
      expect(mockPrismaService.technicalVisitOutcome.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: outcomeId },
          data: expect.objectContaining({
            scopeChangeApproved: true,
            scopeChangeApprovedBy: userId,
          }),
        }),
      );

      // Should delete dependency to unblock installation
      expect(mockPrismaService.serviceOrderDependency.deleteMany).toHaveBeenCalled();
    });

    it('should throw BadRequestException if outcome is not YES_BUT', async () => {
      const tvOutcome = {
        id: outcomeId,
        tvServiceOrderId: 'so_tv_123',
        outcome: TvOutcome.YES,
      };

      mockPrismaService.technicalVisitOutcome.findUnique.mockResolvedValue(tvOutcome);

      await expect(service.approveScopeChange(outcomeId, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.approveScopeChange(outcomeId, userId)).rejects.toThrow(
        /only applicable for YES_BUT/,
      );
    });

    it('should throw BadRequestException if already approved', async () => {
      const tvOutcome = {
        id: outcomeId,
        tvServiceOrderId: 'so_tv_123',
        outcome: TvOutcome.YES_BUT,
        scopeChangeApproved: true,
      };

      mockPrismaService.technicalVisitOutcome.findUnique.mockResolvedValue(tvOutcome);

      await expect(service.approveScopeChange(outcomeId, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.approveScopeChange(outcomeId, userId)).rejects.toThrow(
        /already approved/,
      );
    });
  });

  describe('getOutcome', () => {
    it('should return TV outcome by ID', async () => {
      const outcomeId = 'tvo_123';
      const tvOutcome = {
        id: outcomeId,
        tvServiceOrderId: 'so_tv_123',
        outcome: TvOutcome.YES,
        installationBlocked: false,
      };

      mockPrismaService.technicalVisitOutcome.findUnique.mockResolvedValue(tvOutcome);

      const result = await service.getOutcome(outcomeId);

      expect(result).toBeDefined();
      expect(result.id).toBe(outcomeId);
      expect(result.outcome).toBe(TvOutcome.YES);
    });

    it('should throw NotFoundException if outcome not found', async () => {
      const outcomeId = 'tvo_not_found';

      mockPrismaService.technicalVisitOutcome.findUnique.mockResolvedValue(null);

      await expect(service.getOutcome(outcomeId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOutcomeByTvId', () => {
    it('should return TV outcome by TV service order ID', async () => {
      const tvServiceOrderId = 'so_tv_123';
      const tvOutcome = {
        id: 'tvo_123',
        tvServiceOrderId,
        outcome: TvOutcome.YES,
        installationBlocked: false,
      };

      mockPrismaService.technicalVisitOutcome.findUnique.mockResolvedValue(tvOutcome);

      const result = await service.getOutcomeByTvId(tvServiceOrderId);

      expect(result).toBeDefined();
      expect(result.tvServiceOrderId).toBe(tvServiceOrderId);
    });

    it('should throw NotFoundException if outcome not found', async () => {
      const tvServiceOrderId = 'so_tv_not_found';

      mockPrismaService.technicalVisitOutcome.findUnique.mockResolvedValue(null);

      await expect(service.getOutcomeByTvId(tvServiceOrderId)).rejects.toThrow(NotFoundException);
    });
  });
});
