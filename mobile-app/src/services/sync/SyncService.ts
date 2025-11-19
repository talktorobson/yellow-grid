import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '../../db';
import apiClient from '../../api/client';

export class SyncService {
  private static instance: SyncService;
  private isSyncing = false;

  private constructor() {}

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  async sync() {
    if (this.isSyncing) {
      console.log('[SyncService] Sync already in progress');
      return;
    }

    this.isSyncing = true;

    try {
      await synchronize({
        database,
        pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
          console.log('[SyncService] Pulling changes...', { lastPulledAt });
          
          const response = await apiClient.get('/execution/sync/delta', {
            params: {
              last_pulled_at: lastPulledAt,
              schema_version: schemaVersion,
              migration,
            },
          });

          const { changes, timestamp } = response.data;
          return { changes, timestamp };
        },
        pushChanges: async ({ changes, lastPulledAt }) => {
          console.log('[SyncService] Pushing changes...', { changes });
          
          await apiClient.post('/execution/sync/delta', {
            changes,
            last_pulled_at: lastPulledAt,
          });
        },
        migrationsEnabledAtVersion: 1,
      });
      console.log('[SyncService] Sync completed successfully');
    } catch (error) {
      console.error('[SyncService] Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }
}
