import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schema } from './schema';
import Job from './models/Job';
import Task from './models/Task';
import SyncStatus from './models/SyncStatus';

// First, create the adapter to the underlying database:
const adapter = new SQLiteAdapter({
  schema,
  // (You might want to comment out migrations for development purposes if you are frequently changing schema)
  // migrations,
  // dbName: 'myapp', // optional, defaults to the app's name
  jsi: true, /* Platform.OS === 'ios' */
  onSetUpError: error => {
    // Database failed to load -- offer the user to reload the app or log out
    console.error('Database setup error:', error);
  }
});

// Then, make a Watermelon database from it!
export const database = new Database({
  adapter,
  modelClasses: [
    Job,
    Task,
    SyncStatus,
  ],
});
