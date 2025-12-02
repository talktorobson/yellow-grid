import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ServiceOrdersService } from './service-orders.service';
import { ServiceOrderStateMachineService } from './service-order-state-machine.service';
import { BufferLogicService } from '../scheduling/buffer-logic.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ServiceOrderState, ServiceUrgency } from '@prisma/client';

describe('ServiceOrdersService', () => {
  let service: ServiceOrdersService;
  let prismaService: PrismaService;
  let stateMachine: ServiceOrderStateMachineService;

  const mockPrismaService = {
    serviceCatalog: {
      findUnique: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
    provider: {
      findUnique: jest.fn(),
    },
    workTeam: {
      findUnique: jest.fn(),
    },
    serviceOrder: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    serviceOrderDependency: {
      findMany: jest.fn(),
    },
  };

  const mockStateMachine = {
    validateTransition: jest.fn(),
    isTerminalState: jest.fn(),
  };

  const mockBufferLogic = {
    validateBookingWindow: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceOrdersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ServiceOrderStateMachineService,
          useValue: mockStateMachine,
        },
        {
          provide: BufferLogicService,
          useValue: mockBufferLogic,
        },
      ],
    }).compile();

    service = module.get<ServiceOrdersService>(ServiceOrdersService);
    prismaService = module.get<PrismaService>(PrismaService);
    stateMachine = module.get<ServiceOrderStateMachineService>(ServiceOrderStateMachineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      serviceId: 'service-id',
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      customerInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+34600000000',
        address: {
          street: 'Calle Test',
          city: 'Madrid',
          postalCode: '28001',
          country: 'ES',
        },
      },
      serviceAddress: {
        street: 'Calle Test',
        city: 'Madrid',
        postalCode: '28001',
        countryCode: 'ES',
      },
      serviceType: 'INSTALLATION' as any,
      urgency: ServiceUrgency.STANDARD,
      estimatedDurationMinutes: 120,
      requestedStartDate: '2025-01-20T08:00:00Z',
      requestedEndDate: '2025-01-25T18:00:00Z',
    };

    it('should create a service order successfully', async () => {
      const mockService = { id: 'service-id', name: 'Test Service' };
      const mockServiceOrder = {
        id: 'order-id',
        ...createDto,
        state: ServiceOrderState.CREATED,
        riskLevel: 'LOW',
        createdBy: 'user@example.com',
        createdAt: new Date(),
      };

      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(mockService);
      mockPrismaService.serviceOrder.create.mockResolvedValue(mockServiceOrder);

      const result = await service.create(createDto, 'user@example.com');

      expect(result).toEqual(mockServiceOrder);
      expect(mockPrismaService.serviceCatalog.findUnique).toHaveBeenCalledWith({
        where: { id: 'service-id' },
      });
      expect(mockPrismaService.serviceOrder.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if service does not exist', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto, 'user@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if project does not exist', async () => {
      const mockService = { id: 'service-id', name: 'Test Service' };
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(mockService);
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      const dtoWithProject = { ...createDto, projectId: 'project-id' };

      await expect(service.create(dtoWithProject, 'user@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if project country/BU does not match', async () => {
      const mockService = { id: 'service-id', name: 'Test Service' };
      const mockProject = {
        id: 'project-id',
        countryCode: 'FR',
        businessUnit: 'LM_FR',
      };

      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(mockService);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);

      const dtoWithProject = { ...createDto, projectId: 'project-id' };

      await expect(service.create(dtoWithProject, 'user@example.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if end date before start date', async () => {
      const mockService = { id: 'service-id', name: 'Test Service' };
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(mockService);

      const invalidDto = {
        ...createDto,
        requestedStartDate: '2025-01-25T08:00:00Z',
        requestedEndDate: '2025-01-20T18:00:00Z',
      };

      await expect(service.create(invalidDto, 'user@example.com')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated service orders', async () => {
      const mockOrders = [
        { id: 'order-1', state: ServiceOrderState.CREATED },
        { id: 'order-2', state: ServiceOrderState.SCHEDULED },
      ];

      mockPrismaService.serviceOrder.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.serviceOrder.count.mockResolvedValue(2);

      const result = await service.findAll({ skip: 0, take: 10 });

      expect(result).toEqual({ data: mockOrders, total: 2 });
      expect(mockPrismaService.serviceOrder.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should filter by country code', async () => {
      mockPrismaService.serviceOrder.findMany.mockResolvedValue([]);
      mockPrismaService.serviceOrder.count.mockResolvedValue(0);

      await service.findAll({ countryCode: 'ES' });

      expect(mockPrismaService.serviceOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { countryCode: 'ES' },
        }),
      );
    });

    it('should filter by state', async () => {
      mockPrismaService.serviceOrder.findMany.mockResolvedValue([]);
      mockPrismaService.serviceOrder.count.mockResolvedValue(0);

      await service.findAll({ state: ServiceOrderState.SCHEDULED });

      expect(mockPrismaService.serviceOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { state: ServiceOrderState.SCHEDULED },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a service order by ID', async () => {
      const mockOrder = {
        id: 'order-id',
        state: ServiceOrderState.CREATED,
        project: {},
        service: {},
      };

      mockPrismaService.serviceOrder.findUnique.mockResolvedValue(mockOrder);

      const result = await service.findOne('order-id');

      expect(result).toEqual(mockOrder);
      expect(mockPrismaService.serviceOrder.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-id' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if service order not found', async () => {
      mockPrismaService.serviceOrder.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a service order', async () => {
      const mockOrder = {
        id: 'order-id',
        state: ServiceOrderState.CREATED,
      };
      const updatedOrder = {
        ...mockOrder,
        urgency: ServiceUrgency.URGENT,
      };

      mockPrismaService.serviceOrder.findUnique.mockResolvedValue(mockOrder);
      mockStateMachine.isTerminalState.mockReturnValue(false);
      mockPrismaService.serviceOrder.update.mockResolvedValue(updatedOrder);

      const result = await service.update(
        'order-id',
        { urgency: ServiceUrgency.URGENT },
        'user@example.com',
      );

      expect(result).toEqual(updatedOrder);
    });

    it('should throw BadRequestException if order in terminal state', async () => {
      const mockOrder = {
        id: 'order-id',
        state: ServiceOrderState.CLOSED,
      };

      mockPrismaService.serviceOrder.findUnique.mockResolvedValue(mockOrder);
      mockStateMachine.isTerminalState.mockReturnValue(true);

      await expect(
        service.update('order-id', {}, 'user@example.com'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('schedule', () => {
    const scheduleDto = {
      scheduledDate: '2025-01-22',
      scheduledStartTime: '2025-01-22T09:00:00Z',
      scheduledEndTime: '2025-01-22T11:00:00Z',
    };

    it('should schedule a service order', async () => {
      const mockOrder = {
        id: 'order-id',
        state: ServiceOrderState.CREATED,
        requestedStartDate: new Date('2025-01-20T00:00:00Z'),
        requestedEndDate: new Date('2025-01-25T23:59:59Z'),
      };

      mockPrismaService.serviceOrder.findUnique.mockResolvedValue(mockOrder);
      mockStateMachine.validateTransition.mockReturnValue(undefined);
      mockPrismaService.serviceOrderDependency.findMany.mockResolvedValue([]);
      mockPrismaService.serviceOrder.update.mockResolvedValue({
        ...mockOrder,
        state: ServiceOrderState.SCHEDULED,
        scheduledDate: new Date(scheduleDto.scheduledDate),
      });

      const result = await service.schedule('order-id', scheduleDto, 'user@example.com');

      expect(result.state).toBe(ServiceOrderState.SCHEDULED);
      expect(mockStateMachine.validateTransition).toHaveBeenCalledWith(
        ServiceOrderState.CREATED,
        ServiceOrderState.SCHEDULED,
        'Cannot schedule order',
      );
    });

    it('should throw BadRequestException if scheduled time outside window', async () => {
      const mockOrder = {
        id: 'order-id',
        state: ServiceOrderState.CREATED,
        requestedStartDate: new Date('2025-01-20T00:00:00Z'),
        requestedEndDate: new Date('2025-01-21T23:59:59Z'),
      };

      mockPrismaService.serviceOrder.findUnique.mockResolvedValue(mockOrder);
      mockStateMachine.validateTransition.mockReturnValue(undefined);

      await expect(
        service.schedule('order-id', scheduleDto, 'user@example.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if dependencies not satisfied', async () => {
      const mockOrder = {
        id: 'order-id',
        state: ServiceOrderState.CREATED,
        requestedStartDate: new Date('2025-01-20T00:00:00Z'),
        requestedEndDate: new Date('2025-01-25T23:59:59Z'),
      };

      const mockDependencies = [
        {
          id: 'dep-1',
          dependencyType: 'REQUIRES_COMPLETION',
          blockedOrder: { state: ServiceOrderState.IN_PROGRESS },
        },
      ];

      mockPrismaService.serviceOrder.findUnique.mockResolvedValue(mockOrder);
      mockStateMachine.validateTransition.mockReturnValue(undefined);
      mockPrismaService.serviceOrderDependency.findMany.mockResolvedValue(mockDependencies);

      await expect(
        service.schedule('order-id', scheduleDto, 'user@example.com'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('assign', () => {
    const assignDto = {
      providerId: 'provider-id',
      workTeamId: 'team-id',
    };

    it('should assign a provider to service order', async () => {
      const mockOrder = {
        id: 'order-id',
        state: ServiceOrderState.SCHEDULED,
        scheduledDate: new Date(),
      };

      const mockProvider = { id: 'provider-id', name: 'Test Provider' };
      const mockWorkTeam = { id: 'team-id', providerId: 'provider-id' };

      mockPrismaService.serviceOrder.findUnique.mockResolvedValue(mockOrder);
      mockStateMachine.validateTransition.mockReturnValue(undefined);
      mockPrismaService.provider.findUnique.mockResolvedValue(mockProvider);
      mockPrismaService.workTeam.findUnique.mockResolvedValue(mockWorkTeam);
      mockPrismaService.serviceOrder.update.mockResolvedValue({
        ...mockOrder,
        state: ServiceOrderState.ASSIGNED,
        assignedProviderId: 'provider-id',
      });

      const result = await service.assign('order-id', assignDto, 'user@example.com');

      expect(result.state).toBe(ServiceOrderState.ASSIGNED);
    });

    it('should throw BadRequestException if not scheduled first', async () => {
      const mockOrder = {
        id: 'order-id',
        state: ServiceOrderState.SCHEDULED,
        scheduledDate: null,
      };

      mockPrismaService.serviceOrder.findUnique.mockResolvedValue(mockOrder);
      mockStateMachine.validateTransition.mockReturnValue(undefined);

      await expect(
        service.assign('order-id', assignDto, 'user@example.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if provider not found', async () => {
      const mockOrder = {
        id: 'order-id',
        state: ServiceOrderState.SCHEDULED,
        scheduledDate: new Date(),
      };

      mockPrismaService.serviceOrder.findUnique.mockResolvedValue(mockOrder);
      mockStateMachine.validateTransition.mockReturnValue(undefined);
      mockPrismaService.provider.findUnique.mockResolvedValue(null);

      await expect(
        service.assign('order-id', assignDto, 'user@example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if work team does not belong to provider', async () => {
      const mockOrder = {
        id: 'order-id',
        state: ServiceOrderState.SCHEDULED,
        scheduledDate: new Date(),
      };

      const mockProvider = { id: 'provider-id', name: 'Test Provider' };
      const mockWorkTeam = { id: 'team-id', providerId: 'different-provider-id' };

      mockPrismaService.serviceOrder.findUnique.mockResolvedValue(mockOrder);
      mockStateMachine.validateTransition.mockReturnValue(undefined);
      mockPrismaService.provider.findUnique.mockResolvedValue(mockProvider);
      mockPrismaService.workTeam.findUnique.mockResolvedValue(mockWorkTeam);

      await expect(
        service.assign('order-id', assignDto, 'user@example.com'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel a service order', async () => {
      const mockOrder = {
        id: 'order-id',
        state: ServiceOrderState.SCHEDULED,
      };

      mockPrismaService.serviceOrder.findUnique.mockResolvedValue(mockOrder);
      mockStateMachine.validateTransition.mockReturnValue(undefined);
      mockPrismaService.serviceOrder.update.mockResolvedValue({
        ...mockOrder,
        state: ServiceOrderState.CANCELLED,
      });

      const result = await service.cancel('order-id', 'Customer request', 'user@example.com');

      expect(result.state).toBe(ServiceOrderState.CANCELLED);
      expect(mockStateMachine.validateTransition).toHaveBeenCalledWith(
        ServiceOrderState.SCHEDULED,
        ServiceOrderState.CANCELLED,
        'Cannot cancel order',
      );
    });
  });

  describe('getUnsatisfiedDependencies', () => {
    it('should return empty array if no dependencies', async () => {
      mockPrismaService.serviceOrderDependency.findMany.mockResolvedValue([]);

      const result = await service.getUnsatisfiedDependencies('order-id');

      expect(result).toEqual([]);
    });

    it('should filter out satisfied REQUIRES_COMPLETION dependencies', async () => {
      const mockDependencies = [
        {
          id: 'dep-1',
          dependencyType: 'REQUIRES_COMPLETION',
          blockedOrder: { state: ServiceOrderState.COMPLETED },
        },
        {
          id: 'dep-2',
          dependencyType: 'REQUIRES_COMPLETION',
          blockedOrder: { state: ServiceOrderState.IN_PROGRESS },
        },
      ];

      mockPrismaService.serviceOrderDependency.findMany.mockResolvedValue(mockDependencies);

      const result = await service.getUnsatisfiedDependencies('order-id');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('dep-2');
    });

    it('should filter out satisfied REQUIRES_VALIDATION dependencies', async () => {
      const mockDependencies = [
        {
          id: 'dep-1',
          dependencyType: 'REQUIRES_VALIDATION',
          blockedOrder: { state: ServiceOrderState.VALIDATED },
        },
        {
          id: 'dep-2',
          dependencyType: 'REQUIRES_VALIDATION',
          blockedOrder: { state: ServiceOrderState.COMPLETED },
        },
      ];

      mockPrismaService.serviceOrderDependency.findMany.mockResolvedValue(mockDependencies);

      const result = await service.getUnsatisfiedDependencies('order-id');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('dep-2');
    });
  });

  describe('remove', () => {
    it('should delete service order in CREATED state', async () => {
      const mockOrder = {
        id: 'order-id',
        state: ServiceOrderState.CREATED,
      };

      mockPrismaService.serviceOrder.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.serviceOrder.delete.mockResolvedValue(mockOrder);

      await service.remove('order-id', 'user@example.com');

      expect(mockPrismaService.serviceOrder.delete).toHaveBeenCalledWith({
        where: { id: 'order-id' },
      });
    });

    it('should delete service order in CANCELLED state', async () => {
      const mockOrder = {
        id: 'order-id',
        state: ServiceOrderState.CANCELLED,
      };

      mockPrismaService.serviceOrder.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.serviceOrder.delete.mockResolvedValue(mockOrder);

      await service.remove('order-id', 'user@example.com');

      expect(mockPrismaService.serviceOrder.delete).toHaveBeenCalled();
    });

    it('should throw BadRequestException if order in non-deletable state', async () => {
      const mockOrder = {
        id: 'order-id',
        state: ServiceOrderState.IN_PROGRESS,
      };

      mockPrismaService.serviceOrder.findUnique.mockResolvedValue(mockOrder);

      await expect(service.remove('order-id', 'user@example.com')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
