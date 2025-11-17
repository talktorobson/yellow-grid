import { Q } from '@nozbe/watermelondb';
import { database } from '@database/index';
import { SyncQueueItem } from '@database/models';
import { apiService } from './api.service';
import type { ServiceOrder as ServiceOrderType } from '@types/service-order.types';
import type { CheckIn as CheckInType, CheckOut as CheckOutType } from '@types/checkin-checkout.types';

class SyncService {
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;

  async startAutoSync(intervalMs: number = 30000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Initial sync
    await this.syncAll();

    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      this.syncAll();
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async syncAll(): Promise<void> {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return;
    }

    this.isSyncing = true;

    try {
      // 1. Pull data from server
      await this.pullFromServer();

      // 2. Process sync queue (push to server)
      await this.processQueueToServer();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async pullFromServer(): Promise<void> {
    try {
      // Fetch service orders from server
      const serviceOrders = await apiService.get<ServiceOrderType[]>('/service-orders/assigned');

      // Update local database
      await database.write(async () => {
        for (const order of serviceOrders) {
          const serviceOrdersCollection = database.get('service_orders');

          // Check if exists
          const existingOrders = await serviceOrdersCollection
            .query(Q.where('server_id', order.id))
            .fetch();

          if (existingOrders.length > 0) {
            // Update existing
            await existingOrders[0].update((record) => {
              Object.assign(record, {
                orderNumber: order.orderNumber,
                projectId: order.projectId,
                projectName: order.projectName,
                serviceType: order.serviceType,
                priority: order.priority,
                status: order.status,
                scheduledDate: order.scheduledDate,
                scheduledTimeSlot: order.scheduledTimeSlot,
                estimatedDuration: order.estimatedDuration,
                customer: order.customer,
                siteAddress: order.siteAddress,
                products: order.products,
                serviceDescription: order.serviceDescription,
                specialInstructions: order.specialInstructions,
                syncedAt: new Date(),
              });
            });
          } else {
            // Create new
            await serviceOrdersCollection.create((record) => {
              Object.assign(record, {
                serverId: order.id,
                orderNumber: order.orderNumber,
                projectId: order.projectId,
                projectName: order.projectName,
                serviceType: order.serviceType,
                priority: order.priority,
                status: order.status,
                scheduledDate: order.scheduledDate,
                scheduledTimeSlot: order.scheduledTimeSlot,
                estimatedDuration: order.estimatedDuration,
                customer: order.customer,
                siteAddress: order.siteAddress,
                products: order.products,
                serviceDescription: order.serviceDescription,
                specialInstructions: order.specialInstructions,
                syncedAt: new Date(),
              });
            });
          }
        }
      });

      console.log(`Synced ${serviceOrders.length} service orders from server`);
    } catch (error) {
      console.error('Error pulling from server:', error);
      throw error;
    }
  }

  private async processQueueToServer(): Promise<void> {
    try {
      const queueCollection = database.get<SyncQueueItem>('sync_queue');
      const pendingItems = await queueCollection
        .query(Q.where('status', 'PENDING'))
        .fetch();

      for (const item of pendingItems) {
        try {
          // Mark as in progress
          await database.write(async () => {
            await item.update((record) => {
              record.status = 'IN_PROGRESS';
            });
          });

          // Process based on entity type
          await this.syncQueueItem(item);

          // Mark as completed
          await database.write(async () => {
            await item.update((record) => {
              record.status = 'COMPLETED';
            });
          });
        } catch (error) {
          console.error(`Error syncing queue item ${item.id}:`, error);

          // Mark as failed and increment retry count
          await database.write(async () => {
            await item.update((record) => {
              record.status = item.retryCount >= 3 ? 'FAILED' : 'PENDING';
              record.retryCount = item.retryCount + 1;
              record.lastError = error instanceof Error ? error.message : 'Unknown error';
            });
          });
        }
      }

      console.log(`Processed ${pendingItems.length} queue items`);
    } catch (error) {
      console.error('Error processing queue:', error);
      throw error;
    }
  }

  private async syncQueueItem(item: SyncQueueItem): Promise<void> {
    const payload = JSON.parse(item.payload);

    switch (item.entityType) {
      case 'check_in':
        if (item.operation === 'CREATE') {
          const response = await apiService.post<CheckInType>('/check-ins', payload);
          // Update local record with server ID
          const checkInsCollection = database.get('check_ins');
          const checkIn = await checkInsCollection.find(item.entityId);
          await database.write(async () => {
            await checkIn.update((record) => {
              Object.assign(record, {
                serverId: response.id,
                syncedAt: new Date(),
              });
            });
          });
        }
        break;

      case 'check_out':
        if (item.operation === 'CREATE') {
          const response = await apiService.post<CheckOutType>('/check-outs', payload);
          const checkOutsCollection = database.get('check_outs');
          const checkOut = await checkOutsCollection.find(item.entityId);
          await database.write(async () => {
            await checkOut.update((record) => {
              Object.assign(record, {
                serverId: response.id,
                syncedAt: new Date(),
              });
            });
          });
        }
        break;

      case 'photo':
        if (item.operation === 'CREATE') {
          // Upload photo file
          const photo = payload;
          const file = {
            uri: photo.uri,
            type: 'image/jpeg',
            name: `photo_${Date.now()}.jpg`,
          };

          const response = await apiService.uploadFile<{ url: string }>(
            '/media/upload',
            file,
            { serviceOrderId: photo.serviceOrderId, type: photo.type }
          );

          // Update local record
          const photosCollection = database.get('photos');
          const photoRecord = await photosCollection.find(item.entityId);
          await database.write(async () => {
            await photoRecord.update((record) => {
              Object.assign(record, {
                uploaded: true,
                uploadedUrl: response.url,
                syncedAt: new Date(),
              });
            });
          });
        }
        break;

      default:
        console.warn(`Unknown entity type: ${item.entityType}`);
    }
  }

  async queueForSync(
    entityType: string,
    entityId: string,
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    payload: unknown
  ): Promise<void> {
    await database.write(async () => {
      const queueCollection = database.get<SyncQueueItem>('sync_queue');
      await queueCollection.create((record) => {
        record.entityType = entityType;
        record.entityId = entityId;
        record.operation = operation;
        record.payload = JSON.stringify(payload);
        record.retryCount = 0;
        record.status = 'PENDING';
      });
    });

    console.log(`Queued ${operation} for ${entityType}:${entityId}`);
  }

  async getQueueStatus(): Promise<{
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
  }> {
    const queueCollection = database.get<SyncQueueItem>('sync_queue');

    const [pending, inProgress, completed, failed] = await Promise.all([
      queueCollection.query(Q.where('status', 'PENDING')).fetchCount(),
      queueCollection.query(Q.where('status', 'IN_PROGRESS')).fetchCount(),
      queueCollection.query(Q.where('status', 'COMPLETED')).fetchCount(),
      queueCollection.query(Q.where('status', 'FAILED')).fetchCount(),
    ]);

    return { pending, inProgress, completed, failed };
  }

  async clearCompletedQueue(): Promise<void> {
    const queueCollection = database.get<SyncQueueItem>('sync_queue');
    const completed = await queueCollection.query(Q.where('status', 'COMPLETED')).fetch();

    await database.write(async () => {
      for (const item of completed) {
        await item.markAsDeleted();
      }
    });

    console.log(`Cleared ${completed.length} completed queue items`);
  }
}

export const syncService = new SyncService();
