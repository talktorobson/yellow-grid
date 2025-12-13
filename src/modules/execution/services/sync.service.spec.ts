import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  DeltaSyncRequestDto,
  ConflictResolutionStrategy,
  ChangeOperation,
  EntityType,
  ClientChangeDto,
} from '../dto/delta-sync.dto';
import {
  ServiceOrderState,
  ConflictResolution,
  SyncOperationType,
  SyncOperationStatus,
} from '@prisma/client';

describe('SyncService', () => {
  let service: SyncService;
  let prisma: PrismaService;

  const mockDeviceSync = {
    id: 'device-sync-123',
    deviceId: 'device-mobile-001',
    userId: 'user-101',
    syncToken: 'sync-token-xyz',
    lastSyncAt: new Date('2025-01-01T00:00:00Z'),
    lastSuccessfulSyncAt: new Date('2025-01-01T00:00:00Z'),
    consecutiveFailures: 0,
    totalSyncOperations: 10,
    totalConflicts: 0,
    pendingUploadCount: 0,
    pendingUploadBytes: BigInt(0),
    countryCode: 'FR',
    businessUnit: 'LM_FR',
    isActive: true,
    lastActivityAt: new Date(),
    devicePlatform: 'iOS',
    deviceModel: 'iPhone 14 Pro',
    appVersion: '2.5.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-101',
    email: 'tech@example.com',
    workTeamId: 'team-001',
    workTeam: {
      id: 'team-001',
      name: 'Team Alpha',
    },
  };

  const mockServiceOrder = {
    id: 'so-123',
    state: ServiceOrderState.ASSIGNED,
    version: 1,
    updatedAt: new Date('2025-01-01T12:00:00Z'),
    lastModifiedBy: 'user-101',
    scheduledDate: new Date('2025-01-10T08:00:00Z'),
    scheduledStartTime: new Date('2025-01-10T08:00:00Z'),
    scheduledEndTime: new Date('2025-01-10T17:00:00Z'),
    serviceAddress: { lat: 48.8566, lng: 2.3522, street: '123 Main St', city: 'Paris' },
    customerInfo: { name: 'John Doe', phone: '+33612345678' },
    urgency: 'URGENT',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: PrismaService,
          useValue: {
            deviceSync: {
              findFirst: jest.fn(),
              update: jest.fn(),
              upsert: jest.fn(),
              count: jest.fn(),
            },
            serviceOrder: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              create: jest.fn(),
              count: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processDeltaSync', () => {
    it('should process delta sync successfully with no conflicts', async () => {
      const request: DeltaSyncRequestDto = {
        syncToken: 'sync-token-xyz',
        deviceId: 'device-mobile-001',
        serviceOrders: [
          {
            entityType: EntityType.SERVICE_ORDER,
            entityId: 'so-123',
            operation: ChangeOperation.UPDATE,
            version: 1,
            data: { state: ServiceOrderState.IN_PROGRESS },
            timestamp: '2025-01-01T12:30:00Z',
          },
        ],
        conflictResolutionStrategy: ConflictResolutionStrategy.SERVER_WINS,
      };

      jest.spyOn(prisma.deviceSync, 'findFirst').mockResolvedValue(mockDeviceSync);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.serviceOrder, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.deviceSync, 'update').mockResolvedValue(mockDeviceSync);

      const transactionMock = jest.fn(async (callback) => {
        const mockTx = {
          serviceOrder: {
            findUnique: jest.fn().mockResolvedValue(mockServiceOrder),
            update: jest.fn().mockResolvedValue({ ...mockServiceOrder, version: 2 }),
          },
          syncOperation: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });
      jest.spyOn(prisma, '$transaction').mockImplementation(transactionMock);

      const result = await service.processDeltaSync('user-101', request);

      expect(result).toBeDefined();
      expect(result.conflicts).toHaveLength(0);
      expect(result.appliedChanges.serviceOrdersUpdated).toBe(1);
      expect(result.appliedChanges.operationsFailed).toBe(0);
      expect(result.syncToken).toBeDefined();
      expect(result.serverTime).toBeDefined();
    });

    it('should detect conflicts when server version is higher', async () => {
      const request: DeltaSyncRequestDto = {
        syncToken: 'sync-token-xyz',
        deviceId: 'device-mobile-001',
        serviceOrders: [
          {
            entityType: EntityType.SERVICE_ORDER,
            entityId: 'so-123',
            operation: ChangeOperation.UPDATE,
            version: 1,
            data: { state: ServiceOrderState.IN_PROGRESS },
            timestamp: '2025-01-01T12:30:00Z',
          },
        ],
        conflictResolutionStrategy: ConflictResolutionStrategy.SERVER_WINS,
      };

      const higherVersionServiceOrder = { ...mockServiceOrder, version: 3 };

      jest.spyOn(prisma.deviceSync, 'findFirst').mockResolvedValue(mockDeviceSync);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.serviceOrder, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.deviceSync, 'update').mockResolvedValue(mockDeviceSync);

      const transactionMock = jest.fn(async (callback) => {
        const mockTx = {
          serviceOrder: {
            findUnique: jest.fn().mockResolvedValue(higherVersionServiceOrder),
            update: jest.fn(),
          },
          syncOperation: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });
      jest.spyOn(prisma, '$transaction').mockImplementation(transactionMock);

      const result = await service.processDeltaSync('user-101', request);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].serverVersion).toBe(3);
      expect(result.conflicts[0].clientVersion).toBe(1);
      expect(result.conflicts[0].resolution).toBe(ConflictResolutionStrategy.SERVER_WINS);
      expect(result.appliedChanges.serviceOrdersUpdated).toBe(0); // Update skipped due to conflict
    });

    it('should apply client wins strategy correctly', async () => {
      const request: DeltaSyncRequestDto = {
        syncToken: 'sync-token-xyz',
        deviceId: 'device-mobile-001',
        serviceOrders: [
          {
            entityType: EntityType.SERVICE_ORDER,
            entityId: 'so-123',
            operation: ChangeOperation.UPDATE,
            version: 1,
            data: { state: ServiceOrderState.COMPLETED },
            timestamp: '2025-01-01T12:30:00Z',
          },
        ],
        conflictResolutionStrategy: ConflictResolutionStrategy.CLIENT_WINS,
      };

      const higherVersionServiceOrder = {
        ...mockServiceOrder,
        version: 3,
        state: ServiceOrderState.IN_PROGRESS,
      };

      jest.spyOn(prisma.deviceSync, 'findFirst').mockResolvedValue(mockDeviceSync);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.serviceOrder, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.deviceSync, 'update').mockResolvedValue(mockDeviceSync);

      const transactionMock = jest.fn(async (callback) => {
        const mockTx = {
          serviceOrder: {
            findUnique: jest.fn().mockResolvedValue(higherVersionServiceOrder),
            update: jest.fn().mockResolvedValue({
              ...higherVersionServiceOrder,
              version: 4,
              state: ServiceOrderState.COMPLETED,
            }),
          },
          syncOperation: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });
      jest.spyOn(prisma, '$transaction').mockImplementation(transactionMock);

      const result = await service.processDeltaSync('user-101', request);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].resolution).toBe(ConflictResolutionStrategy.CLIENT_WINS);
      expect(result.appliedChanges.serviceOrdersUpdated).toBe(1); // Update applied despite conflict
    });

    it('should process time entry changes (check-ins)', async () => {
      const request: DeltaSyncRequestDto = {
        syncToken: 'sync-token-xyz',
        deviceId: 'device-mobile-001',
        timeEntries: [
          {
            entityType: EntityType.CHECK_IN,
            operation: ChangeOperation.CREATE,
            data: {
              serviceOrderId: 'so-123',
              providerId: 'prov-001',
              workTeamId: 'team-001',
              lat: 48.8566,
              lng: 2.3522,
              accuracy: 10,
            },
            timestamp: '2025-01-01T08:00:00Z',
          },
        ],
        conflictResolutionStrategy: ConflictResolutionStrategy.SERVER_WINS,
      };

      jest.spyOn(prisma.deviceSync, 'findFirst').mockResolvedValue(mockDeviceSync);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.serviceOrder, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.deviceSync, 'update').mockResolvedValue(mockDeviceSync);

      const transactionMock = jest.fn(async (callback) => {
        const mockTx = {
          serviceOrderCheckIn: {
            create: jest.fn().mockResolvedValue({ id: 'checkin-001' }),
          },
          syncOperation: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });
      jest.spyOn(prisma, '$transaction').mockImplementation(transactionMock);

      const result = await service.processDeltaSync('user-101', request);

      expect(result.appliedChanges.timeEntriesCreated).toBe(1);
      expect(result.appliedChanges.operationsFailed).toBe(0);
    });

    it('should process media upload references', async () => {
      const request: DeltaSyncRequestDto = {
        syncToken: 'sync-token-xyz',
        deviceId: 'device-mobile-001',
        mediaUploads: [
          {
            offlineId: 'offline-photo-001',
            entityType: EntityType.SERVICE_ORDER,
            entityId: 'so-123',
            metadata: { sizeBytes: 2048576, priority: 'high' },
            timestamp: '2025-01-01T10:00:00Z',
          },
        ],
        conflictResolutionStrategy: ConflictResolutionStrategy.SERVER_WINS,
      };

      jest.spyOn(prisma.deviceSync, 'findFirst').mockResolvedValue(mockDeviceSync);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.serviceOrder, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.deviceSync, 'update').mockResolvedValue(mockDeviceSync);

      const transactionMock = jest.fn(async (callback) => {
        const mockTx = {
          syncOperation: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });
      jest.spyOn(prisma, '$transaction').mockImplementation(transactionMock);

      const result = await service.processDeltaSync('user-101', request);

      expect(result.pendingUploads).toHaveLength(1);
      expect(result.pendingUploads[0].offlineId).toBe('offline-photo-001');
      expect(result.pendingUploads[0].priority).toBe('high');
      expect(result.appliedChanges.mediaPendingUpload).toBe(1);
    });

    it('should throw BadRequestException for invalid sync token', async () => {
      const request: DeltaSyncRequestDto = {
        syncToken: 'invalid-token',
        deviceId: 'device-mobile-001',
        conflictResolutionStrategy: ConflictResolutionStrategy.SERVER_WINS,
      };

      jest.spyOn(prisma.deviceSync, 'findFirst').mockResolvedValue(null);

      await expect(service.processDeltaSync('user-101', request)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync status for valid device', async () => {
      jest.spyOn(prisma.deviceSync, 'findFirst').mockResolvedValue(mockDeviceSync);

      const result = await service.getSyncStatus('device-mobile-001', 'user-101');

      expect(result).toBeDefined();
      expect(result.deviceId).toBe('device-mobile-001');
      expect(result.syncToken).toBe('sync-token-xyz');
      expect(result.syncHealth.status).toBe('healthy');
      expect(result.syncHealth.consecutiveFailures).toBe(0);
    });

    it('should throw NotFoundException for invalid device', async () => {
      jest.spyOn(prisma.deviceSync, 'findFirst').mockResolvedValue(null);

      await expect(service.getSyncStatus('invalid-device', 'user-101')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should report degraded health for devices with failures', async () => {
      const degradedDeviceSync = { ...mockDeviceSync, consecutiveFailures: 2 };
      jest.spyOn(prisma.deviceSync, 'findFirst').mockResolvedValue(degradedDeviceSync);

      const result = await service.getSyncStatus('device-mobile-001', 'user-101');

      expect(result.syncHealth.status).toBe('degraded');
      expect(result.syncHealth.consecutiveFailures).toBe(2);
    });

    it('should report unhealthy status for devices with many failures', async () => {
      const unhealthyDeviceSync = { ...mockDeviceSync, consecutiveFailures: 5 };
      jest.spyOn(prisma.deviceSync, 'findFirst').mockResolvedValue(unhealthyDeviceSync);

      const result = await service.getSyncStatus('device-mobile-001', 'user-101');

      expect(result.syncHealth.status).toBe('unhealthy');
      expect(result.syncHealth.consecutiveFailures).toBe(5);
    });
  });

  describe('initializeSync', () => {
    it('should create new device sync on first initialization', async () => {
      const request = {
        userId: 'user-101',
        deviceId: 'device-mobile-002',
        includeAttachments: true,
        maxAttachmentSizeMb: 50,
        compressionEnabled: true,
      };

      jest.spyOn(prisma.deviceSync, 'upsert').mockResolvedValue(mockDeviceSync);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.serviceOrder, 'count').mockResolvedValue(5);

      const result = await service.initializeSync(request);

      expect(result).toBeDefined();
      expect(result.syncToken).toBeDefined();
      expect(result.syncPackageId).toBeDefined();
      expect(result.contents.jobsCount).toBe(5);
      expect(result.downloadUrl).toContain('/api/v1/mobile/sync/download/');
      expect(result.checksum).toBeDefined();
    });

    it('should update existing device sync on re-initialization', async () => {
      const request = {
        userId: 'user-101',
        deviceId: 'device-mobile-001',
        includeAttachments: false,
        maxAttachmentSizeMb: 25,
        compressionEnabled: true,
      };

      const updatedDeviceSync = { ...mockDeviceSync, syncToken: 'new-sync-token' };
      jest.spyOn(prisma.deviceSync, 'upsert').mockResolvedValue(updatedDeviceSync);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.serviceOrder, 'count').mockResolvedValue(10);

      const result = await service.initializeSync(request);

      expect(result.contents.jobsCount).toBe(10);
      expect(result.packageSizeBytes).toBeGreaterThan(0);
    });

    it('should handle users without work teams', async () => {
      const request = {
        userId: 'user-102',
        deviceId: 'device-mobile-003',
      };

      const userWithoutTeam = { ...mockUser, workTeamId: null, workTeam: null };
      jest.spyOn(prisma.deviceSync, 'upsert').mockResolvedValue(mockDeviceSync);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(userWithoutTeam as any);

      const result = await service.initializeSync(request);

      expect(result.contents.jobsCount).toBe(0);
    });
  });

  describe('Conflict Resolution Strategies', () => {
    it('should resolve conflicts with LAST_WRITE_WINS based on timestamps', async () => {
      const request: DeltaSyncRequestDto = {
        syncToken: 'sync-token-xyz',
        deviceId: 'device-mobile-001',
        serviceOrders: [
          {
            entityType: EntityType.SERVICE_ORDER,
            entityId: 'so-123',
            operation: ChangeOperation.UPDATE,
            version: 1,
            data: { state: ServiceOrderState.COMPLETED, timestamp: '2025-01-01T14:00:00Z' },
            timestamp: '2025-01-01T14:00:00Z',
          },
        ],
        conflictResolutionStrategy: ConflictResolutionStrategy.LAST_WRITE_WINS,
      };

      const olderServerData = {
        ...mockServiceOrder,
        version: 2,
        updatedAt: new Date('2025-01-01T12:00:00Z'),
      };

      jest.spyOn(prisma.deviceSync, 'findFirst').mockResolvedValue(mockDeviceSync);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.serviceOrder, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.deviceSync, 'update').mockResolvedValue(mockDeviceSync);

      const transactionMock = jest.fn(async (callback) => {
        const mockTx = {
          serviceOrder: {
            findUnique: jest.fn().mockResolvedValue(olderServerData),
            update: jest.fn().mockResolvedValue({ ...olderServerData, version: 3 }),
          },
          syncOperation: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });
      jest.spyOn(prisma, '$transaction').mockImplementation(transactionMock);

      const result = await service.processDeltaSync('user-101', request);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].resolution).toBe(ConflictResolutionStrategy.LAST_WRITE_WINS);
      // Client timestamp is newer, so client should win
      expect(result.appliedChanges.serviceOrdersUpdated).toBe(1);
    });

    it('should merge conflicts with MERGE strategy', async () => {
      const request: DeltaSyncRequestDto = {
        syncToken: 'sync-token-xyz',
        deviceId: 'device-mobile-001',
        serviceOrders: [
          {
            entityType: EntityType.SERVICE_ORDER,
            entityId: 'so-123',
            operation: ChangeOperation.UPDATE,
            version: 1,
            data: { state: ServiceOrderState.IN_PROGRESS, notes: 'Updated from mobile' },
            timestamp: '2025-01-01T12:30:00Z',
          },
        ],
        conflictResolutionStrategy: ConflictResolutionStrategy.MERGE,
      };

      const serverData = {
        ...mockServiceOrder,
        version: 2,
        priority: 'P2', // This field only exists on server
      };

      jest.spyOn(prisma.deviceSync, 'findFirst').mockResolvedValue(mockDeviceSync);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.serviceOrder, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.deviceSync, 'update').mockResolvedValue(mockDeviceSync);

      const transactionMock = jest.fn(async (callback) => {
        const mockTx = {
          serviceOrder: {
            findUnique: jest.fn().mockResolvedValue(serverData),
            update: jest.fn().mockResolvedValue({ ...serverData, version: 3 }),
          },
          syncOperation: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });
      jest.spyOn(prisma, '$transaction').mockImplementation(transactionMock);

      const result = await service.processDeltaSync('user-101', request);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].resolution).toBe(ConflictResolutionStrategy.MERGE);
      expect(result.appliedChanges.serviceOrdersUpdated).toBe(1);
    });
  });
});
