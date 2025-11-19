# Mobile Offline Conflict Resolution - Design Document

**Status**: DRAFT
**Priority**: P0 - BLOCKER
**Owner**: Mobile Team
**Estimated Effort**: 2-3 weeks
**Created**: 2025-11-18
**Last Updated**: 2025-11-18

---

## 1. Executive Summary

### Problem Statement
The Crew Field App (mobile) is documented as **offline-first** (product-docs/development/09-crew-field-app.md:4-9), but there is **NO specification** for what happens when:

1. **Technician makes changes offline** (updates assignment status, captures photos, fills WCF)
2. **Server-side changes occur simultaneously** (operator reschedules, reassigns, cancels)
3. **Technician reconnects** and sync worker attempts to push local changes

**Critical scenarios that WILL cause data loss**:

```
Scenario A: Assignment Rescheduling
15:00 - Technician goes offline, starts work on Assignment X
15:05 - Operator reschedules Assignment X to next week (server change)
15:30 - Technician completes assignment, takes 20 photos, fills WCF
15:45 - Technician comes back online, sync triggers
❓ What happens? WCF rejected? Photos lost? Assignment now has two "completed" states?

Scenario B: Assignment Reassignment
14:00 - Technician A downloads Assignment Y (offline mode)
14:15 - Operator reassigns Y to Technician B (server change)
14:20 - Technician B accepts, completes assignment (online)
15:00 - Technician A comes online, tries to sync "completed" status
❓ What happens? Overwrite Technician B's completion? Show error? Merge data?

Scenario C: Concurrent Status Updates
10:00 - Technician marks "Arrived on site" (offline)
10:02 - System auto-cancels assignment (customer unreachable, server change)
10:30 - Technician completes work, submits WCF (offline)
11:00 - Technician syncs
❓ What happens? WCF accepted? Payment processed? Assignment shows "cancelled" or "completed"?
```

### Impact
Without a **conflict resolution policy**, we will experience:
- ❌ **Data loss**: Technician photos/signatures lost after hours of work
- ❌ **Payment disputes**: Who gets paid if two techs complete same assignment?
- ❌ **Customer confusion**: "Why did installer show up after I cancelled?"
- ❌ **Operator frustration**: "I rescheduled this, why is it completed?"
- ❌ **Trust erosion**: Technicians stop using app after losing work

### Recommendation
Implement **conflict detection** + **conflict resolution policies** based on **data entity type** + **User-facing conflict UI** for irreconcilable conflicts.

---

## 2. Current State Analysis

### 2.1 Existing Documentation

**Offline-first mention**:
```
product-docs/development/09-crew-field-app.md:4
"This app must run offline-first (PWA + React Native wrapper)
and sync with FSM backend once connectivity is restored."

product-docs/development/09-crew-field-app.md:128-131
"Every mutation queues a local record with status `pending`.
Sync worker batches operations per assignment to `/crew/sync`.
Show sync badge if >0 pending items. Provide "Retry now" CTA when errors occur.
Media uploads use background tasks; display per-file progress + failure states."
```

**What's MISSING**:
- ❌ Conflict detection mechanism (versioning, ETags, timestamps)
- ❌ Conflict resolution rules per entity type
- ❌ UI for showing conflicts to technicians
- ❌ Merge strategies for different data types
- ❌ Rollback behavior when sync fails

### 2.2 Existing Implementation

**Current codebase check**:
- Mobile app exists: `/home/user/yellow-grid/mobile-app/`
- Sync logic: **Not yet implemented** (pre-development phase)
- Opportunity: **Design correctly from day 1**

---

## 3. Conflict Resolution Framework

### 3.1 Core Principles

1. **Prefer server state for business-critical data** (assignments, scheduling)
2. **Never lose user-generated content** (photos, signatures, notes)
3. **Merge when possible** (media uploads, checklist items)
4. **Human override for ambiguous cases** (show conflict UI)
5. **Audit trail for all conflicts** (who won, why, when)

### 3.2 Entity Classification

| Entity Type | Conflict Policy | Rationale |
|-------------|-----------------|-----------|
| **Assignment Status** | Server-wins with alert | Operator has full context |
| **Assignment Metadata** (date, time, technician) | Server-wins | Critical business data |
| **Photos/Media** | Merge-always | Never lose technician work |
| **WCF Submission** | Version-check-required | Prevent duplicate payments |
| **Checklist Items** | Merge with timestamps | Track progress accurately |
| **Notes/Comments** | Merge with timestamps | Both perspectives valuable |
| **Inventory Consumption** | Server-wins (reject if stale) | Prevent inventory errors |

---

## 4. Conflict Detection Mechanism

### 4.1 Version Vectors

**Add version field to all sync-able entities**:

```typescript
// Database schema additions
interface Assignment {
  id: string;
  // ... existing fields
  version: number;          // ← NEW: Increment on every server change
  updatedAt: string;        // ISO 8601 timestamp
  syncHash: string;         // SHA-256 of canonical representation
}

interface Photo {
  id: string;
  assignmentId: string;
  localId: string;          // ← NEW: Client-generated UUID
  uploadedAt: string | null;
  version: number;
  // ... other fields
}

interface WCF {
  id: string;
  assignmentId: string;
  version: number;          // ← NEW
  submittedAt: string;
  serverReceivedAt: string | null;
  // ... other fields
}
```

### 4.2 Sync Request Format

```typescript
// POST /crew/sync
interface SyncRequest {
  deviceId: string;
  lastSyncAt: string;       // ISO timestamp of last successful sync
  changes: SyncChange[];
}

interface SyncChange {
  entityType: 'assignment' | 'photo' | 'wcf' | 'checklist' | 'note';
  entityId: string;
  localId?: string;         // For new entities created offline
  operation: 'create' | 'update' | 'delete';
  baseVersion: number;      // Version client had when making change
  data: Record<string, any>;
  timestamp: string;        // When change was made (client clock)
}

// Example
{
  "deviceId": "tech-123-pixel7",
  "lastSyncAt": "2025-11-18T15:00:00Z",
  "changes": [
    {
      "entityType": "assignment",
      "entityId": "assign-456",
      "operation": "update",
      "baseVersion": 5,        // Client had version 5
      "data": {
        "status": "completed",
        "completedAt": "2025-11-18T15:30:00Z"
      },
      "timestamp": "2025-11-18T15:30:05Z"
    },
    {
      "entityType": "photo",
      "entityId": null,
      "localId": "photo-local-789",
      "operation": "create",
      "baseVersion": 0,
      "data": {
        "assignmentId": "assign-456",
        "url": "file://local/photo-789.jpg",
        "caption": "Before installation",
        "takenAt": "2025-11-18T15:10:00Z"
      },
      "timestamp": "2025-11-18T15:10:05Z"
    }
  ]
}
```

### 4.3 Sync Response Format

```typescript
interface SyncResponse {
  syncId: string;
  processedAt: string;
  results: SyncResult[];
  serverChanges: ServerChange[];  // Changes made server-side since lastSyncAt
}

interface SyncResult {
  localId?: string;
  entityId: string;
  entityType: string;
  status: 'success' | 'conflict' | 'rejected' | 'error';
  serverVersion?: number;     // New version after successful sync
  conflict?: ConflictDetails; // If status === 'conflict'
  error?: string;             // If status === 'error'
}

interface ConflictDetails {
  reason: string;
  clientVersion: number;
  serverVersion: number;
  clientData: Record<string, any>;
  serverData: Record<string, any>;
  resolution: 'manual_required' | 'server_wins' | 'merge_applied';
  mergedData?: Record<string, any>;  // If merge_applied
}

interface ServerChange {
  entityType: string;
  entityId: string;
  operation: 'update' | 'delete';
  currentVersion: number;
  data: Record<string, any>;
  changedAt: string;
}

// Example response with conflict
{
  "syncId": "sync-abc123",
  "processedAt": "2025-11-18T15:45:00Z",
  "results": [
    {
      "entityId": "assign-456",
      "entityType": "assignment",
      "status": "conflict",
      "conflict": {
        "reason": "Assignment was rescheduled by operator while you were offline",
        "clientVersion": 5,
        "serverVersion": 7,
        "clientData": {
          "status": "completed",
          "completedAt": "2025-11-18T15:30:00Z"
        },
        "serverData": {
          "status": "scheduled",
          "scheduledDate": "2025-11-25",
          "rescheduledBy": "operator-789",
          "rescheduledReason": "Customer requested new date"
        },
        "resolution": "manual_required"
      }
    },
    {
      "localId": "photo-local-789",
      "entityId": "photo-123",
      "entityType": "photo",
      "status": "success",
      "serverVersion": 1
    }
  ],
  "serverChanges": [
    {
      "entityType": "assignment",
      "entityId": "assign-789",
      "operation": "update",
      "currentVersion": 3,
      "data": {
        "status": "cancelled",
        "cancelledBy": "system",
        "cancelReason": "Customer unreachable"
      },
      "changedAt": "2025-11-18T15:20:00Z"
    }
  ]
}
```

---

## 5. Conflict Resolution Policies

### 5.1 Policy 1: Assignment Status Updates

**Rule**: **Server-wins** for status changes

**Logic**:
```typescript
async function resolveAssignmentStatusConflict(
  clientChange: SyncChange,
  serverState: Assignment
): Promise<SyncResult> {
  // Server changed while client was offline
  if (clientChange.baseVersion < serverState.version) {

    // Special case: Client marked "completed", server rescheduled
    if (
      clientChange.data.status === 'completed' &&
      serverState.status === 'scheduled'
    ) {
      return {
        entityId: serverState.id,
        entityType: 'assignment',
        status: 'conflict',
        conflict: {
          reason: 'Assignment was rescheduled while you were completing it',
          clientVersion: clientChange.baseVersion,
          serverVersion: serverState.version,
          clientData: clientChange.data,
          serverData: serverState,
          resolution: 'manual_required',  // Show conflict UI
        },
      };
    }

    // Default: Server wins, notify client
    return {
      entityId: serverState.id,
      entityType: 'assignment',
      status: 'conflict',
      conflict: {
        reason: `Assignment status changed from ${clientChange.data.status} to ${serverState.status} by operator`,
        clientVersion: clientChange.baseVersion,
        serverVersion: serverState.version,
        clientData: clientChange.data,
        serverData: serverState,
        resolution: 'server_wins',
      },
    };
  }

  // No conflict: Apply client change
  await updateAssignment(serverState.id, clientChange.data);
  return {
    entityId: serverState.id,
    entityType: 'assignment',
    status: 'success',
    serverVersion: serverState.version + 1,
  };
}
```

**User Experience**:
```
┌─────────────────────────────────────────┐
│ ⚠️ Sync Conflict Detected               │
├─────────────────────────────────────────┤
│ Assignment #SX-375742                   │
│                                         │
│ You marked this assignment as           │
│ COMPLETED at 3:30 PM                    │
│                                         │
│ But the operator RESCHEDULED it to      │
│ November 25 at 2:15 PM                  │
│                                         │
│ Reason: "Customer requested new date"   │
│                                         │
│ Your photos and notes have been saved.  │
│                                         │
│ What would you like to do?              │
│                                         │
│ [Keep Server Version (Rescheduled)]     │
│ [Report Issue to Operator]              │
│                                         │
│ [View Details]                          │
└─────────────────────────────────────────┘
```

### 5.2 Policy 2: Photos & Media

**Rule**: **Merge-always** (never lose technician work)

**Logic**:
```typescript
async function resolvePhotoConflict(
  clientChange: SyncChange,
  serverState: Assignment
): Promise<SyncResult> {
  // Even if assignment was cancelled/rescheduled, save photos

  // Upload photo to cloud storage
  const uploadedUrl = await uploadPhotoToS3(
    clientChange.data.url,
    clientChange.data.assignmentId
  );

  // Create photo record, link to assignment history
  const photo = await createPhoto({
    assignmentId: clientChange.data.assignmentId,
    url: uploadedUrl,
    caption: clientChange.data.caption,
    takenAt: clientChange.data.takenAt,
    uploadedBy: clientChange.deviceId,
    uploadedAt: new Date().toISOString(),
    metadata: {
      capturedOffline: true,
      assignmentVersionAtCapture: clientChange.baseVersion,
    },
  });

  return {
    localId: clientChange.localId,
    entityId: photo.id,
    entityType: 'photo',
    status: 'success',
    serverVersion: 1,
  };
}
```

**Key principle**: Photos are **evidence**, even if assignment status changed. Always preserve.

### 5.3 Policy 3: WCF Submissions

**Rule**: **Version-check-required** (prevent duplicate payments)

**Logic**:
```typescript
async function resolveWCFConflict(
  clientChange: SyncChange,
  serverState: Assignment
): Promise<SyncResult> {
  // Check if assignment is still in completable state
  const completableStatuses = ['assigned', 'accepted', 'in_progress'];

  if (!completableStatuses.includes(serverState.status)) {
    return {
      entityId: serverState.id,
      entityType: 'wcf',
      status: 'rejected',
      error: `Cannot submit WCF: Assignment status is ${serverState.status}`,
    };
  }

  // Check if WCF already exists (another tech completed it)
  const existingWCF = await findWCFByAssignment(serverState.id);
  if (existingWCF) {
    return {
      entityId: serverState.id,
      entityType: 'wcf',
      status: 'conflict',
      conflict: {
        reason: 'Another technician already submitted WCF for this assignment',
        clientVersion: clientChange.baseVersion,
        serverVersion: serverState.version,
        clientData: clientChange.data,
        serverData: existingWCF,
        resolution: 'manual_required',
      },
    };
  }

  // All good: Create WCF
  const wcf = await createWCF({
    assignmentId: serverState.id,
    ...clientChange.data,
    submittedAt: clientChange.timestamp,
    serverReceivedAt: new Date().toISOString(),
  });

  // Update assignment status to completed
  await updateAssignment(serverState.id, {
    status: 'completed',
    completedAt: clientChange.timestamp,
    version: serverState.version + 1,
  });

  return {
    localId: clientChange.localId,
    entityId: wcf.id,
    entityType: 'wcf',
    status: 'success',
    serverVersion: 1,
  };
}
```

**User Experience for Duplicate WCF**:
```
┌─────────────────────────────────────────┐
│ ⚠️ Cannot Submit Work Closing Form      │
├─────────────────────────────────────────┤
│ Assignment #SX-375742                   │
│                                         │
│ This assignment was already completed   │
│ by another technician:                  │
│                                         │
│ Completed by: Maria Santos              │
│ Completed at: Nov 18, 2:45 PM           │
│                                         │
│ Your work has been saved separately     │
│ for review.                             │
│                                         │
│ [Contact Dispatcher]                    │
│ [View Other Technician's WCF]           │
└─────────────────────────────────────────┘
```

### 5.4 Policy 4: Checklist Items

**Rule**: **Merge with timestamps**

**Logic**:
```typescript
async function resolveChecklistConflict(
  clientChange: SyncChange,
  serverState: Checklist
): Promise<SyncResult> {
  // Merge checklist items (both client and server may have marked different items)

  const clientItems = clientChange.data.items;
  const serverItems = serverState.items;

  const mergedItems = [];

  // For each item, take the latest completion timestamp
  for (const item of clientItems) {
    const serverItem = serverItems.find(si => si.id === item.id);

    if (!serverItem) {
      mergedItems.push(item);
      continue;
    }

    // Both have the item, merge by timestamp
    if (item.completedAt && serverItem.completedAt) {
      const clientTime = new Date(item.completedAt);
      const serverTime = new Date(serverItem.completedAt);

      mergedItems.push(clientTime > serverTime ? item : serverItem);
    } else if (item.completedAt) {
      mergedItems.push(item);
    } else {
      mergedItems.push(serverItem);
    }
  }

  // Update checklist
  await updateChecklist(serverState.id, {
    items: mergedItems,
    version: serverState.version + 1,
  });

  return {
    entityId: serverState.id,
    entityType: 'checklist',
    status: 'success',
    serverVersion: serverState.version + 1,
  };
}
```

### 5.5 Policy 5: Notes/Comments

**Rule**: **Merge-always** (append both)

**Logic**:
```typescript
async function resolveNoteConflict(
  clientChange: SyncChange,
  serverState: Assignment
): Promise<SyncResult> {
  // Always create new note, never overwrite
  const note = await createNote({
    assignmentId: clientChange.data.assignmentId,
    content: clientChange.data.content,
    createdBy: clientChange.deviceId,
    createdAt: clientChange.timestamp,
    createdOffline: true,
  });

  return {
    localId: clientChange.localId,
    entityId: note.id,
    entityType: 'note',
    status: 'success',
    serverVersion: 1,
  };
}
```

---

## 6. Mobile Client Implementation

### 6.1 Local Database Schema (WatermelonDB)

```typescript
// mobile-app/src/db/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: 'assignments',
      columns: [
        { name: 'remote_id', type: 'string', isIndexed: true },
        { name: 'version', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'scheduled_date', type: 'string' },
        { name: 'sync_status', type: 'string' },  // 'synced' | 'pending' | 'conflict'
        { name: 'last_synced_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'photos',
      columns: [
        { name: 'remote_id', type: 'string', isOptional: true },
        { name: 'assignment_id', type: 'string', isIndexed: true },
        { name: 'local_uri', type: 'string' },
        { name: 'remote_url', type: 'string', isOptional: true },
        { name: 'upload_status', type: 'string' },  // 'pending' | 'uploading' | 'uploaded' | 'failed'
        { name: 'taken_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'entity_type', type: 'string' },
        { name: 'entity_id', type: 'string' },
        { name: 'local_id', type: 'string', isOptional: true },
        { name: 'operation', type: 'string' },
        { name: 'base_version', type: 'number' },
        { name: 'data', type: 'string' },  // JSON
        { name: 'timestamp', type: 'number' },
        { name: 'retry_count', type: 'number' },
        { name: 'status', type: 'string' },  // 'pending' | 'processing' | 'failed' | 'conflict'
      ],
    }),
    tableSchema({
      name: 'conflicts',
      columns: [
        { name: 'sync_queue_id', type: 'string' },
        { name: 'entity_type', type: 'string' },
        { name: 'entity_id', type: 'string' },
        { name: 'client_data', type: 'string' },  // JSON
        { name: 'server_data', type: 'string' },  // JSON
        { name: 'reason', type: 'string' },
        { name: 'resolution_status', type: 'string' },  // 'pending' | 'resolved' | 'ignored'
        { name: 'detected_at', type: 'number' },
      ],
    }),
  ],
});
```

### 6.2 Sync Service

```typescript
// mobile-app/src/services/sync/SyncService.ts
import { Q } from '@nozbe/watermelondb';
import { database } from '../db';
import { apiClient } from '../api/client';

export class SyncService {
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;

  async startAutoSync(intervalMs: number = 60000) {
    this.syncInterval = setInterval(() => {
      this.sync();
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async sync(): Promise<SyncSummary> {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping');
      return;
    }

    this.isSyncing = true;

    try {
      // 1. Gather pending changes from sync queue
      const syncQueue = database.collections.get('sync_queue');
      const pendingChanges = await syncQueue
        .query(Q.where('status', 'pending'))
        .fetch();

      if (pendingChanges.length === 0) {
        // No local changes, just pull server changes
        await this.pullServerChanges();
        return { pushed: 0, pulled: 0, conflicts: 0 };
      }

      // 2. Build sync request
      const syncRequest: SyncRequest = {
        deviceId: await this.getDeviceId(),
        lastSyncAt: await this.getLastSyncTimestamp(),
        changes: pendingChanges.map(item => ({
          entityType: item.entityType,
          entityId: item.entityId,
          localId: item.localId,
          operation: item.operation,
          baseVersion: item.baseVersion,
          data: JSON.parse(item.data),
          timestamp: new Date(item.timestamp).toISOString(),
        })),
      };

      // 3. Send to server
      const response: SyncResponse = await apiClient.post('/crew/sync', syncRequest);

      // 4. Process results
      const conflicts = [];
      for (const result of response.results) {
        if (result.status === 'success') {
          await this.markSyncItemSuccess(result);
        } else if (result.status === 'conflict') {
          await this.handleConflict(result);
          conflicts.push(result);
        } else if (result.status === 'rejected' || result.status === 'error') {
          await this.markSyncItemFailed(result);
        }
      }

      // 5. Apply server changes
      await this.applyServerChanges(response.serverChanges);

      // 6. Update last sync timestamp
      await this.setLastSyncTimestamp(response.processedAt);

      return {
        pushed: response.results.filter(r => r.status === 'success').length,
        pulled: response.serverChanges.length,
        conflicts: conflicts.length,
      };

    } finally {
      this.isSyncing = false;
    }
  }

  private async handleConflict(result: SyncResult) {
    // Store conflict for user resolution
    const conflictsCollection = database.collections.get('conflicts');

    await database.write(async () => {
      await conflictsCollection.create(conflict => {
        conflict.entityType = result.entityType;
        conflict.entityId = result.entityId;
        conflict.clientData = JSON.stringify(result.conflict.clientData);
        conflict.serverData = JSON.stringify(result.conflict.serverData);
        conflict.reason = result.conflict.reason;
        conflict.resolutionStatus = 'pending';
        conflict.detectedAt = Date.now();
      });
    });

    // Mark sync queue item as conflict
    const syncQueue = database.collections.get('sync_queue');
    const item = await syncQueue.find(result.localId || result.entityId);
    await item.update(record => {
      record.status = 'conflict';
    });

    // Show notification
    await this.showConflictNotification(result);
  }

  private async showConflictNotification(result: SyncResult) {
    // Mobile notification
    // ...
  }

  // ... other methods
}

interface SyncSummary {
  pushed: number;
  pulled: number;
  conflicts: number;
}
```

### 6.3 Conflict Resolution UI

```typescript
// mobile-app/src/screens/ConflictsScreen.tsx
import React from 'react';
import { View, Text, Button, FlatList } from 'react-native';
import { useConflicts } from '../hooks/useConflicts';

export function ConflictsScreen() {
  const { conflicts, resolveConflict } = useConflicts();

  return (
    <View>
      <Text>Sync Conflicts ({conflicts.length})</Text>
      <FlatList
        data={conflicts}
        renderItem={({ item }) => (
          <ConflictCard
            conflict={item}
            onResolve={(resolution) => resolveConflict(item.id, resolution)}
          />
        )}
      />
    </View>
  );
}

function ConflictCard({ conflict, onResolve }) {
  const clientData = JSON.parse(conflict.clientData);
  const serverData = JSON.parse(conflict.serverData);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>⚠️ {conflict.entityType} Conflict</Text>
      <Text style={styles.reason}>{conflict.reason}</Text>

      <View style={styles.comparison}>
        <View style={styles.column}>
          <Text style={styles.label}>Your Change</Text>
          <Text>{JSON.stringify(clientData, null, 2)}</Text>
        </View>
        <View style={styles.column}>
          <Text style={styles.label}>Server Version</Text>
          <Text>{JSON.stringify(serverData, null, 2)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title="Keep Server Version"
          onPress={() => onResolve('server')}
        />
        <Button
          title="Report to Operator"
          onPress={() => onResolve('report')}
        />
      </View>
    </View>
  );
}
```

---

## 7. Backend Implementation

### 7.1 Sync Controller

```typescript
// src/modules/execution/controllers/crew-sync.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { SyncService } from '../services/sync.service';

@Controller('crew/sync')
export class CrewSyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  async sync(@Body() request: SyncRequest): Promise<SyncResponse> {
    return this.syncService.processSync(request);
  }
}
```

### 7.2 Sync Service

```typescript
// src/modules/execution/services/sync.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConflictResolver } from './conflict-resolver.service';

@Injectable()
export class SyncService {
  constructor(
    private prisma: PrismaService,
    private conflictResolver: ConflictResolver,
  ) {}

  async processSync(request: SyncRequest): Promise<SyncResponse> {
    const results: SyncResult[] = [];

    // Process each change
    for (const change of request.changes) {
      const result = await this.processSingleChange(change);
      results.push(result);
    }

    // Get server changes since last sync
    const serverChanges = await this.getServerChangesSince(request.lastSyncAt);

    return {
      syncId: generateUUID(),
      processedAt: new Date().toISOString(),
      results,
      serverChanges,
    };
  }

  private async processSingleChange(change: SyncChange): Promise<SyncResult> {
    switch (change.entityType) {
      case 'assignment':
        return this.conflictResolver.resolveAssignmentConflict(change);
      case 'photo':
        return this.conflictResolver.resolvePhotoConflict(change);
      case 'wcf':
        return this.conflictResolver.resolveWCFConflict(change);
      case 'checklist':
        return this.conflictResolver.resolveChecklistConflict(change);
      case 'note':
        return this.conflictResolver.resolveNoteConflict(change);
      default:
        return {
          entityId: change.entityId,
          entityType: change.entityType,
          status: 'error',
          error: `Unknown entity type: ${change.entityType}`,
        };
    }
  }

  private async getServerChangesSince(timestamp: string): Promise<ServerChange[]> {
    // Query all entities modified after timestamp
    // This includes assignments rescheduled, cancelled, etc.
    const assignments = await this.prisma.assignment.findMany({
      where: {
        updatedAt: { gt: new Date(timestamp) },
      },
    });

    return assignments.map(a => ({
      entityType: 'assignment',
      entityId: a.id,
      operation: 'update',
      currentVersion: a.version,
      data: a,
      changedAt: a.updatedAt.toISOString(),
    }));
  }
}
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

```typescript
// tests/sync/conflict-resolution.spec.ts
describe('ConflictResolver', () => {
  describe('Assignment Status Conflicts', () => {
    it('should detect conflict when client completes rescheduled assignment', async () => {
      const clientChange: SyncChange = {
        entityType: 'assignment',
        entityId: 'assign-123',
        operation: 'update',
        baseVersion: 5,
        data: { status: 'completed' },
        timestamp: '2025-11-18T15:30:00Z',
      };

      const serverState: Assignment = {
        id: 'assign-123',
        version: 7,
        status: 'scheduled',
        scheduledDate: '2025-11-25',
        // ...
      };

      const result = await resolver.resolveAssignmentConflict(clientChange);

      expect(result.status).toBe('conflict');
      expect(result.conflict.resolution).toBe('manual_required');
    });

    it('should merge photos even if assignment was cancelled', async () => {
      const clientChange: SyncChange = {
        entityType: 'photo',
        localId: 'photo-local-456',
        operation: 'create',
        baseVersion: 0,
        data: { assignmentId: 'assign-123', url: 'file://...' },
        timestamp: '2025-11-18T15:10:00Z',
      };

      const serverState: Assignment = {
        id: 'assign-123',
        version: 6,
        status: 'cancelled',  // ← Assignment cancelled
        // ...
      };

      const result = await resolver.resolvePhotoConflict(clientChange);

      expect(result.status).toBe('success');  // Photo still saved
      expect(result.entityId).toBeDefined();
    });
  });
});
```

### 8.2 Integration Tests

```typescript
describe('Sync E2E', () => {
  it('should handle offline completion -> server reschedule -> sync', async () => {
    // 1. Technician downloads assignment (version 5)
    const assignment = await api.get('/crew/assignments/assign-123');
    expect(assignment.version).toBe(5);

    // 2. Technician goes offline, completes work
    const offlineChanges = [
      { entityType: 'assignment', operation: 'update', baseVersion: 5, data: { status: 'completed' } },
      { entityType: 'photo', operation: 'create', data: { assignmentId: 'assign-123' } },
      { entityType: 'wcf', operation: 'create', data: { assignmentId: 'assign-123' } },
    ];

    // 3. Meanwhile, operator reschedules (version 5 → 7)
    await operatorApi.patch('/assignments/assign-123', {
      scheduledDate: '2025-11-25',
    });

    // 4. Technician comes back online, syncs
    const syncResponse = await api.post('/crew/sync', {
      deviceId: 'tech-123',
      lastSyncAt: '2025-11-18T14:00:00Z',
      changes: offlineChanges,
    });

    // 5. Expect conflict for assignment, success for photo/WCF preservation
    expect(syncResponse.results[0].status).toBe('conflict');
    expect(syncResponse.results[1].status).toBe('success'); // Photo saved
    expect(syncResponse.results[2].status).toBe('rejected'); // WCF rejected (assignment rescheduled)
  });
});
```

---

## 9. Monitoring & Observability

### 9.1 Metrics to Track

```typescript
// Prometheus metrics
const syncConflictsTotal = new Counter({
  name: 'crew_sync_conflicts_total',
  help: 'Total number of sync conflicts detected',
  labelNames: ['entity_type', 'resolution'],
});

const syncDurationSeconds = new Histogram({
  name: 'crew_sync_duration_seconds',
  help: 'Time taken to process sync request',
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

const syncChangesProcessed = new Counter({
  name: 'crew_sync_changes_processed_total',
  help: 'Total changes processed in sync',
  labelNames: ['entity_type', 'status'],
});
```

### 9.2 Alerts

```yaml
# Alert if conflict rate > 5%
- alert: HighSyncConflictRate
  expr: |
    sum(rate(crew_sync_conflicts_total[5m]))
    / sum(rate(crew_sync_changes_processed_total[5m])) > 0.05
  for: 10m
  annotations:
    summary: "High sync conflict rate detected"
    description: "{{ $value | humanizePercentage }} of syncs resulting in conflicts"
```

---

## 10. Success Criteria

- [ ] Zero data loss incidents in beta testing (500 offline sessions)
- [ ] <2% conflict rate in production
- [ ] 100% of photos preserved even in conflict scenarios
- [ ] <500ms sync latency for 10 changes
- [ ] Conflict UI understandable by technicians (95% resolution without support calls)

---

## 11. Rollout Plan

### Week 1: Backend Implementation
- [ ] Add `version` field to all sync-able tables
- [ ] Implement conflict resolver service
- [ ] Create `/crew/sync` endpoint
- [ ] Write unit tests

### Week 2: Mobile Implementation
- [ ] Update WatermelonDB schema with sync_queue, conflicts
- [ ] Implement SyncService
- [ ] Create conflict resolution UI
- [ ] Write integration tests

### Week 3: Beta Testing
- [ ] Deploy to staging
- [ ] 10 internal technicians test for 1 week
- [ ] Simulate offline scenarios (airplane mode testing)
- [ ] Gather feedback on conflict UI

### Week 4: Production Rollout
- [ ] Deploy to production
- [ ] Monitor conflict rate
- [ ] On-call support for first 2 weeks
- [ ] Iterate based on real-world conflicts

---

## 12. References

- [Conflict-Free Replicated Data Types (CRDTs)](https://crdt.tech/)
- [Operational Transformation](https://en.wikipedia.org/wiki/Operational_transformation)
- [WatermelonDB Sync](https://nozbe.github.io/WatermelonDB/Advanced/Sync.html)
- Yellow Grid: product-docs/development/09-crew-field-app.md

---

**Document Status**: Ready for review
**Next Steps**: Review with mobile team, schedule design session
