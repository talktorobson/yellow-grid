import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class SyncStatus extends Model {
  static readonly table = 'sync_status';

  @field('entity_type') entityType!: string;
  @field('last_sync_token') lastSyncToken!: string;
  @date('last_sync_time') lastSyncTime!: Date;
}
