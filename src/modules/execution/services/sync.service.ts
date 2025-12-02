import { Injectable, Logger, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  DeltaSyncRequestDto,
  DeltaSyncResponseDto,
  SyncConflictDto,
  ServerChangeDto,
  ClientChangeDto,
  ConflictResolutionStrategy,
  ChangeOperation,
  EntityType,
  AppliedChangesDto,
  PendingUploadDto,
  SyncStatusResponseDto,
  InitializeSyncRequestDto,
  InitializeSyncResponseDto,
} from '../dto/delta-sync.dto';
import { ConflictResolution, SyncOperationType, SyncOperationStatus } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process delta sync: apply client changes and return server changes
   */
  async processDeltaSync(userId: string, request: DeltaSyncRequestDto): Promise<DeltaSyncResponseDto> {
    const startTime = Date.now();

    // Validate sync token and get device sync state
    const deviceSync = await this.validateAndGetDeviceSync(request.syncToken, request.deviceId, userId);

    const conflicts: SyncConflictDto[] = [];
    const appliedChanges: AppliedChangesDto = {
      serviceOrdersUpdated: 0,
      timeEntriesCreated: 0,
      mediaPendingUpload: 0,
      tasksUpdated: 0,
      operationsFailed: 0,
    };
    const pendingUploads: PendingUploadDto[] = [];

    // Process client changes in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Process service order changes
      if (request.serviceOrders && request.serviceOrders.length > 0) {
        const result = await this.processServiceOrderChanges(
          tx,
          request.serviceOrders,
          request.conflictResolutionStrategy || ConflictResolutionStrategy.SERVER_WINS,
          userId,
        );
        conflicts.push(...result.conflicts);
        appliedChanges.serviceOrdersUpdated += result.successCount;
        appliedChanges.operationsFailed += result.failureCount;
      }

      // Process time entry changes (check-ins/outs)
      if (request.timeEntries && request.timeEntries.length > 0) {
        const result = await this.processTimeEntryChanges(tx, request.timeEntries, userId);
        appliedChanges.timeEntriesCreated += result.successCount;
        appliedChanges.operationsFailed += result.failureCount;
      }

      // Process task updates
      if (request.taskUpdates && request.taskUpdates.length > 0) {
        const result = await this.processTaskUpdates(tx, request.taskUpdates, userId);
        appliedChanges.tasksUpdated += result.successCount;
        appliedChanges.operationsFailed += result.failureCount;
      }

      // Process media upload references
      if (request.mediaUploads && request.mediaUploads.length > 0) {
        const result = await this.processMediaUploadReferences(request.mediaUploads);
        pendingUploads.push(...result.pendingUploads);
        appliedChanges.mediaPendingUpload += result.pendingUploads.length;
      }

      // Record sync operation
      await this.recordSyncOperation(tx as any, deviceSync.id, {
        operationType: SyncOperationType.DELTA_SYNC,
        syncToken: request.syncToken,
        status: conflicts.length > 0 ? SyncOperationStatus.CONFLICT : SyncOperationStatus.SUCCESS,
        conflictCount: conflicts.length,
        appliedCount:
          appliedChanges.serviceOrdersUpdated +
          appliedChanges.timeEntriesCreated +
          appliedChanges.tasksUpdated,
      });
    });

    // Generate new sync token
    const newSyncToken = await this.generateSyncToken(deviceSync.id);

    // Get server changes since last sync
    const serverChanges = await this.getServerChangesSinceLastSync(deviceSync.lastSyncAt, userId);

    // Update device sync state
    await this.updateDeviceSyncState(deviceSync.id, newSyncToken, conflicts.length);

    const processingTimeMs = Date.now() - startTime;

    return {
      syncToken: newSyncToken,
      serverTime: new Date().toISOString(),
      conflicts,
      serverChanges,
      appliedChanges,
      pendingUploads,
      processingTimeMs,
    };
  }

  /**
   * Process service order changes with conflict detection
   */
  private async processServiceOrderChanges(
    tx: any,
    changes: ClientChangeDto[],
    strategy: ConflictResolutionStrategy,
    userId: string,
  ): Promise<{ conflicts: SyncConflictDto[]; successCount: number; failureCount: number }> {
    const conflicts: SyncConflictDto[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const change of changes) {
      try {
        if (change.operation === ChangeOperation.UPDATE && change.entityId) {
          // Fetch current server version
          const serverEntity = await tx.serviceOrder.findUnique({
            where: { id: change.entityId },
            select: { version: true, state: true, updatedAt: true, lastModifiedBy: true },
          });

          if (!serverEntity) {
            this.logger.warn(`Service order ${change.entityId} not found, skipping update`);
            failureCount++;
            continue;
          }

          // Detect conflict
          if (change.version && serverEntity.version > change.version) {
            this.logger.warn(
              `Conflict detected for service order ${change.entityId}: server v${serverEntity.version}, client v${change.version}`,
            );

            const conflict = await this.resolveConflict(
              tx,
              {
                entityType: EntityType.SERVICE_ORDER,
                entityId: change.entityId,
                clientVersion: change.version,
                serverVersion: serverEntity.version,
                clientData: change.data,
                serverData: serverEntity,
              },
              strategy,
              userId,
            );

            conflicts.push(conflict);

            // If server wins, skip the update
            if (strategy === ConflictResolutionStrategy.SERVER_WINS) {
              continue;
            }
          }

          // Apply update with version increment
          await tx.serviceOrder.update({
            where: { id: change.entityId },
            data: {
              ...change.data,
              version: { increment: 1 },
              lastModifiedBy: userId,
              updatedAt: new Date(),
            },
          });

          successCount++;
        } else if (change.operation === ChangeOperation.CREATE) {
          // Create new service order
          await tx.serviceOrder.create({
            data: {
              ...change.data,
              version: 1,
              lastModifiedBy: userId,
              createdBy: userId,
            },
          });
          successCount++;
        }
      } catch (error) {
        this.logger.error(`Failed to process service order change: ${error.message}`, error.stack);
        failureCount++;
      }
    }

    return { conflicts, successCount, failureCount };
  }

  /**
   * Process time entry changes (check-ins/outs)
   */
  private async processTimeEntryChanges(
    tx: any,
    changes: ClientChangeDto[],
    userId: string,
  ): Promise<{ successCount: number; failureCount: number }> {
    let successCount = 0;
    let failureCount = 0;

    for (const change of changes) {
      try {
        if (change.operation === ChangeOperation.CREATE) {
          // Determine if this is a check-in or check-out based on data
          if (change.entityType === EntityType.CHECK_IN) {
            await tx.serviceOrderCheckIn.create({
              data: {
                ...change.data,
                technicianUserId: userId,
                occurredAt: new Date(change.timestamp),
              },
            });
          } else if (change.entityType === EntityType.CHECK_OUT) {
            await tx.serviceOrderCheckOut.create({
              data: {
                ...change.data,
                technicianUserId: userId,
                occurredAt: new Date(change.timestamp),
              },
            });
          }
          successCount++;
        }
      } catch (error) {
        this.logger.error(`Failed to process time entry change: ${error.message}`, error.stack);
        failureCount++;
      }
    }

    return { successCount, failureCount };
  }

  /**
   * Process task updates
   */
  private async processTaskUpdates(
    tx: any,
    changes: ClientChangeDto[],
    userId: string,
  ): Promise<{ successCount: number; failureCount: number }> {
    let successCount = 0;
    let failureCount = 0;

    for (const change of changes) {
      try {
        if (change.operation === ChangeOperation.UPDATE && change.entityId) {
          await tx.task.update({
            where: { id: change.entityId },
            data: {
              ...change.data,
              updatedAt: new Date(),
            },
          });
          successCount++;
        }
      } catch (error) {
        this.logger.error(`Failed to process task update: ${error.message}`, error.stack);
        failureCount++;
      }
    }

    return { successCount, failureCount };
  }

  /**
   * Process media upload references (generate upload URLs)
   */
  private async processMediaUploadReferences(mediaUploads: any[]): Promise<{ pendingUploads: PendingUploadDto[] }> {
    const pendingUploads: PendingUploadDto[] = mediaUploads.map((upload) => ({
      offlineId: upload.offlineId,
      uploadUrl: `/api/v1/mobile/media/photos`, // Actual endpoint
      priority: upload.metadata?.priority || 'medium',
      estimatedSizeBytes: upload.metadata?.sizeBytes,
    }));

    return { pendingUploads };
  }

  /**
   * Resolve conflict between client and server data
   */
  private async resolveConflict(
    tx: any,
    conflictData: {
      entityType: EntityType;
      entityId: string;
      clientVersion: number;
      serverVersion: number;
      clientData: any;
      serverData: any;
    },
    strategy: ConflictResolutionStrategy,
    userId: string,
  ): Promise<SyncConflictDto> {
    let resolvedValue: any;
    let appliedResolution: ConflictResolution;

    switch (strategy) {
      case ConflictResolutionStrategy.SERVER_WINS:
        resolvedValue = conflictData.serverData;
        appliedResolution = ConflictResolution.SERVER_WINS;
        break;

      case ConflictResolutionStrategy.CLIENT_WINS:
        resolvedValue = conflictData.clientData;
        appliedResolution = ConflictResolution.CLIENT_WINS;
        break;

      case ConflictResolutionStrategy.LAST_WRITE_WINS:
        // Compare timestamps (if available in data)
        const clientTimestamp = new Date(conflictData.clientData.timestamp || 0).getTime();
        const serverTimestamp = new Date(conflictData.serverData.updatedAt || 0).getTime();
        resolvedValue = clientTimestamp > serverTimestamp ? conflictData.clientData : conflictData.serverData;
        appliedResolution = ConflictResolution.LAST_WRITE_WINS;
        break;

      case ConflictResolutionStrategy.MERGE:
        // Simple field-level merge: client fields override server, but preserve server-only fields
        resolvedValue = { ...conflictData.serverData, ...conflictData.clientData };
        appliedResolution = ConflictResolution.MERGED;
        break;

      default:
        resolvedValue = conflictData.serverData;
        appliedResolution = ConflictResolution.SERVER_WINS;
    }

    // Return conflict details
    return {
      entityType: conflictData.entityType,
      entityId: conflictData.entityId,
      field: 'multiple', // Could be enhanced to track specific fields
      clientValue: conflictData.clientData,
      serverValue: conflictData.serverData,
      serverVersion: conflictData.serverVersion,
      clientVersion: conflictData.clientVersion,
      resolution: strategy,
      resolvedValue,
      lastModifiedBy: conflictData.serverData.lastModifiedBy || 'system',
      lastModifiedAt: conflictData.serverData.updatedAt || new Date().toISOString(),
    };
  }

  /**
   * Get server changes since last sync
   */
  private async getServerChangesSinceLastSync(
    lastSyncAt: Date,
    userId: string,
  ): Promise<DeltaSyncResponseDto['serverChanges']> {
    // Find service orders modified since last sync for this user's work teams
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { workTeam: true },
    });

    if (!user?.workTeamId) {
      return {
        serviceOrders: [],
        timeEntries: [],
        taskUpdates: [],
        attachments: [],
        referenceDataUpdates: [],
      };
    }

    const modifiedServiceOrders = await this.prisma.serviceOrder.findMany({
      where: {
        assignedWorkTeamId: user.workTeamId,
        updatedAt: { gt: lastSyncAt },
      },
      select: {
        id: true,
        state: true,
        version: true,
        updatedAt: true,
        scheduledDate: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
        serviceAddress: true,
        customerInfo: true,
        urgency: true,
      },
      take: 50, // Limit to avoid large payloads
    });

    const serverChanges: ServerChangeDto[] = modifiedServiceOrders.map((so) => ({
      entityType: EntityType.SERVICE_ORDER,
      entityId: so.id,
      operation: ChangeOperation.UPDATE,
      data: so,
      version: so.version,
      lastModifiedAt: so.updatedAt.toISOString(),
    }));

    return {
      serviceOrders: serverChanges,
      timeEntries: [],
      taskUpdates: [],
      attachments: [],
      referenceDataUpdates: [],
    };
  }

  /**
   * Validate sync token and get device sync state
   */
  private async validateAndGetDeviceSync(syncToken: string, deviceId: string, userId: string) {
    const deviceSync = await this.prisma.deviceSync.findFirst({
      where: {
        syncToken,
        deviceId,
        userId,
        isActive: true,
      },
    });

    if (!deviceSync) {
      throw new BadRequestException('Invalid sync token or device');
    }

    return deviceSync;
  }

  /**
   * Generate new sync token
   */
  private async generateSyncToken(deviceSyncId: string): Promise<string> {
    const randomPart = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(`${deviceSyncId}:${Date.now()}:${randomPart}`).digest('hex');
    return hash.substring(0, 64); // 64 character token
  }

  /**
   * Update device sync state
   */
  private async updateDeviceSyncState(deviceSyncId: string, newSyncToken: string, conflictCount: number) {
    await this.prisma.deviceSync.update({
      where: { id: deviceSyncId },
      data: {
        syncToken: newSyncToken,
        lastSyncAt: new Date(),
        lastSuccessfulSyncAt: new Date(),
        consecutiveFailures: 0,
        totalSyncOperations: { increment: 1 },
        totalConflicts: { increment: conflictCount },
        lastActivityAt: new Date(),
      },
    });
  }

  /**
   * Record sync operation for audit
   */
  private async recordSyncOperation(
    tx: any,
    deviceSyncId: string,
    data: {
      operationType: SyncOperationType;
      syncToken: string;
      status: SyncOperationStatus;
      conflictCount: number;
      appliedCount: number;
    },
  ) {
    await tx.syncOperation.create({
      data: {
        deviceSyncId,
        operationType: data.operationType,
        entityType: 'multiple',
        operation: 'sync',
        syncToken: data.syncToken,
        status: data.status,
        conflictDetected: data.conflictCount > 0,
        conflictDetails: {
          conflictCount: data.conflictCount,
          appliedCount: data.appliedCount,
        },
      },
    });
  }

  /**
   * Get sync status for a device
   */
  async getSyncStatus(deviceId: string, userId: string): Promise<SyncStatusResponseDto> {
    const deviceSync = await this.prisma.deviceSync.findFirst({
      where: { deviceId, userId, isActive: true },
    });

    if (!deviceSync) {
      throw new NotFoundException('Device sync not found');
    }

    return {
      deviceId: deviceSync.deviceId,
      lastSyncTime: deviceSync.lastSyncAt.toISOString(),
      syncToken: deviceSync.syncToken,
      pendingUploads: {
        count: deviceSync.pendingUploadCount,
        totalSizeBytes: Number(deviceSync.pendingUploadBytes),
        items: [], // Would be populated from actual pending upload queue
      },
      pendingDownloads: {
        count: 0,
        totalSizeBytes: 0,
        items: [],
      },
      conflicts: {
        count: 0,
        requiresResolution: false,
      },
      syncHealth: {
        status: deviceSync.consecutiveFailures === 0 ? 'healthy' : deviceSync.consecutiveFailures < 3 ? 'degraded' : 'unhealthy',
        lastSuccessfulSync: deviceSync.lastSuccessfulSyncAt.toISOString(),
        consecutiveFailures: deviceSync.consecutiveFailures,
        storageAvailableBytes: 0, // Would come from client
      },
    };
  }

  /**
   * Initialize sync for a new device
   */
  async initializeSync(request: InitializeSyncRequestDto): Promise<InitializeSyncResponseDto> {
    // Create or update device sync record
    const syncToken = await this.generateSyncToken(request.deviceId);

    const deviceSync = await this.prisma.deviceSync.upsert({
      where: { deviceId: request.deviceId },
      create: {
        deviceId: request.deviceId,
        userId: request.userId,
        syncToken,
        lastSyncAt: new Date(),
        lastSuccessfulSyncAt: new Date(),
        countryCode: 'FR', // Should come from user context
        businessUnit: 'LM_FR', // Should come from user context
      },
      update: {
        syncToken,
        lastSyncAt: new Date(),
        isActive: true,
      },
    });

    // Get user's assigned jobs for initial sync
    const user = await this.prisma.user.findUnique({
      where: { id: request.userId },
      include: { workTeam: true },
    });

    const jobsCount = user?.workTeamId
      ? await this.prisma.serviceOrder.count({
          where: {
            assignedWorkTeamId: user.workTeamId,
            state: { in: ['SCHEDULED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] },
          },
        })
      : 0;

    const packageId = randomBytes(16).toString('hex');
    const estimatedSize = jobsCount * 50000; // ~50KB per job estimate

    return {
      syncPackageId: packageId,
      syncToken,
      packageSizeBytes: estimatedSize,
      estimatedDownloadTimeSeconds: Math.ceil(estimatedSize / 1000000), // Assume 1MB/s
      contents: {
        jobsCount,
        attachmentsCount: 0,
        materialsCount: 0,
        referenceData: ['service_types', 'task_templates', 'material_catalog'],
      },
      downloadUrl: `/api/v1/mobile/sync/download/${packageId}`,
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      checksum: createHash('sha256').update(packageId).digest('hex'),
    };
  }
}
