import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { ServiceOrder, CheckIn, CheckOut, Photo, SyncQueueItem } from './models';

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'YellowGrid',
  jsi: true, // Use JSI for better performance
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [ServiceOrder, CheckIn, CheckOut, Photo, SyncQueueItem],
});
