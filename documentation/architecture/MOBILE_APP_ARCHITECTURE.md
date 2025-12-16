# Mobile App Architecture

## Overview

React Native mobile app for Yellow Grid Field Service Management platform using Expo framework.

## Technology Stack

### Core Framework
- **React Native**: 0.76+
- **Expo SDK**: 52+
- **TypeScript**: 5.x
- **Expo Router**: File-based navigation

### State Management
- **Zustand**: Lightweight state management
- **React Query**: Server state & caching
- **MMKV**: Fast key-value storage

### Offline-First
- **WatermelonDB**: Reactive offline database
- **NetInfo**: Network state detection
- **React Query Persist**: Offline query caching

### UI/UX
- **React Native Paper**: Material Design components
- **React Native Reanimated**: Smooth animations
- **React Native Gesture Handler**: Touch interactions

### Media & Location
- **Expo Camera**: Camera access
- **Expo Media Library**: Photo/video management
- **Expo Location**: GPS tracking
- **Expo Image Picker**: Image selection

### Push Notifications
- **Expo Notifications**: Push notification handling
- **Firebase Cloud Messaging**: Notification delivery

### Authentication
- **Expo Secure Store**: Secure token storage
- **JWT Decode**: Token parsing
- **Axios**: HTTP client with interceptors

### Testing
- **Jest**: Unit testing
- **React Native Testing Library**: Component testing
- **Detox**: E2E testing

## Project Structure

```
mobile-app/
├── app/                          # Expo Router app directory
│   ├── (auth)/                   # Authentication flow
│   │   ├── login.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/                   # Main app tabs
│   │   ├── jobs/                 # Jobs tab
│   │   │   ├── index.tsx         # Job list
│   │   │   ├── [id].tsx          # Job details
│   │   │   └── _layout.tsx
│   │   ├── schedule.tsx          # Schedule tab
│   │   ├── profile.tsx           # Profile tab
│   │   └── _layout.tsx
│   ├── _layout.tsx               # Root layout
│   └── +not-found.tsx
│
├── src/
│   ├── api/                      # API client
│   │   ├── client.ts             # Axios instance
│   │   ├── auth.ts               # Auth endpoints
│   │   ├── jobs.ts               # Job endpoints
│   │   ├── media.ts              # Media upload
│   │   └── sync.ts               # Sync endpoints
│   │
│   ├── components/               # Reusable components
│   │   ├── ui/                   # UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Loading.tsx
│   │   ├── job/                  # Job components
│   │   │   ├── JobCard.tsx
│   │   │   ├── JobStatus.tsx
│   │   │   └── TaskList.tsx
│   │   └── media/                # Media components
│   │       ├── PhotoCapture.tsx
│   │       ├── PhotoGallery.tsx
│   │       └── VideoPlayer.tsx
│   │
│   ├── hooks/                    # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useJobs.ts
│   │   ├── useLocation.ts
│   │   ├── useOfflineSync.ts
│   │   └── useNotifications.ts
│   │
│   ├── services/                 # Business logic
│   │   ├── auth/
│   │   │   ├── AuthService.ts
│   │   │   └── TokenManager.ts
│   │   ├── location/
│   │   │   ├── LocationService.ts
│   │   │   └── GeofenceService.ts
│   │   ├── sync/
│   │   │   ├── SyncManager.ts
│   │   │   ├── ConflictResolver.ts
│   │   │   └── OfflineQueue.ts
│   │   ├── media/
│   │   │   ├── MediaUploadService.ts
│   │   │   └── PhotoCompressor.ts
│   │   └── notifications/
│   │       └── PushService.ts
│   │
│   ├── store/                    # State management
│   │   ├── auth.store.ts
│   │   ├── jobs.store.ts
│   │   ├── sync.store.ts
│   │   └── ui.store.ts
│   │
│   ├── db/                       # WatermelonDB schema
│   │   ├── schema.ts
│   │   ├── models/
│   │   │   ├── Job.ts
│   │   │   ├── Task.ts
│   │   │   ├── CheckIn.ts
│   │   │   └── Photo.ts
│   │   └── migrations/
│   │
│   ├── types/                    # TypeScript types
│   │   ├── api.ts
│   │   ├── models.ts
│   │   └── navigation.ts
│   │
│   ├── utils/                    # Utilities
│   │   ├── date.ts
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   └── constants.ts
│   │
│   └── config/                   # Configuration
│       ├── api.config.ts
│       ├── env.ts
│       └── theme.ts
│
├── assets/                       # Static assets
│   ├── fonts/
│   ├── images/
│   └── icons/
│
├── e2e/                          # E2E tests
│   └── jobs.e2e.ts
│
├── app.json                      # Expo configuration
├── eas.json                      # EAS Build configuration
├── tsconfig.json
└── package.json
```

## Key Features Implementation

### 1. Authentication Flow

```typescript
// src/services/auth/AuthService.ts
class AuthService {
  async login(email: string, password: string): Promise<AuthResult>
  async refreshToken(): Promise<string>
  async logout(): Promise<void>
  isAuthenticated(): boolean
}
```

**Storage**: Expo Secure Store for JWT tokens
**Auto-refresh**: Axios interceptor for token refresh
**Biometrics**: Optional fingerprint/face ID

### 2. Offline-First Sync

```typescript
// src/services/sync/SyncManager.ts
class SyncManager {
  async syncJobs(): Promise<SyncResult>
  async syncMedia(): Promise<SyncResult>
  async resolveConflicts(): Promise<ConflictResolution[]>
  getQueueStatus(): QueueStatus
}
```

**Strategy**:
- WatermelonDB for local storage
- React Query for server state
- Background sync when online
- Conflict resolution with server-wins default

### 3. GPS Tracking & Geofencing

```typescript
// src/services/location/LocationService.ts
class LocationService {
  async getCurrentLocation(): Promise<Location>
  async startTracking(): Promise<void>
  async checkGeofence(jobLocation: Location): Promise<boolean>
  async checkIn(jobId: string, location: Location): Promise<CheckInResult>
}
```

**Permissions**: Request location always (for background tracking)
**Accuracy**: High accuracy for check-in (< 50m)
**Battery**: Balanced mode for tracking

### 4. Media Capture & Upload

```typescript
// src/services/media/MediaUploadService.ts
class MediaUploadService {
  async capturePhoto(jobId: string): Promise<Photo>
  async uploadPhoto(photo: Photo): Promise<UploadResult>
  async uploadBatch(photos: Photo[]): Promise<BatchResult>
  compressImage(uri: string, quality: number): Promise<string>
}
```

**Compression**: Reduce image size before upload
**Queue**: Background upload queue with retry
**Progress**: Upload progress tracking

### 5. Push Notifications

```typescript
// src/services/notifications/PushService.ts
class PushService {
  async registerDevice(): Promise<string>
  async handleNotification(notification: Notification): Promise<void>
  async scheduleLocal(notification: LocalNotification): Promise<void>
}
```

**Types**:
- Job assigned
- Job updated
- Message received
- Schedule change

## Data Flow

### Job List Screen

```
User opens app
  ↓
Check network status
  ↓
If online:
  - Fetch jobs from API (React Query)
  - Update local database (WatermelonDB)
  - Display jobs
If offline:
  - Load jobs from local database
  - Display with offline indicator
```

### Check-In Flow

```
User navigates to job
  ↓
Request location permission
  ↓
Get current GPS location
  ↓
Verify geofence (within 100m)
  ↓
Capture arrival photo
  ↓
Submit check-in:
  - If online: POST to API immediately
  - If offline: Queue for later sync
  ↓
Update UI with check-in status
```

### Media Upload Flow

```
User captures photo
  ↓
Compress image (70% quality)
  ↓
Save to local database with offline ID
  ↓
Add to upload queue
  ↓
If online:
  - Upload immediately
  - Update with server ID
  - Remove from queue
If offline:
  - Keep in queue
  - Upload when online
  - Handle conflicts
```

## Security

### Token Management
- JWT stored in Expo Secure Store (encrypted)
- Auto-refresh before expiration
- Clear on logout

### API Communication
- HTTPS only
- Certificate pinning (production)
- Request signing for sensitive operations

### Data Protection
- Encrypt local database
- Clear cache on logout
- Secure photo storage

## Performance Optimization

### List Virtualization
- FlatList with `windowSize` optimization
- Lazy loading images
- Pagination (50 items per page)

### Image Optimization
- Progressive JPEG compression
- Thumbnail generation (200x200)
- Lazy loading with placeholders

### Database Queries
- Indexed columns for fast queries
- Batch operations
- Lazy loading relationships

## Testing Strategy

### Unit Tests
- Business logic (services, utilities)
- State management (stores)
- API client

### Component Tests
- UI components
- Screen navigation
- User interactions

### E2E Tests
- Critical flows:
  - Login
  - Job list → Job detail
  - Check-in → Check-out
  - Photo capture → Upload

## Build & Deployment

### Development
```bash
npm start              # Start Expo dev server
npm run ios            # iOS simulator
npm run android        # Android emulator
```

### Production Builds

**EAS Build** (Expo Application Services):

```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production
```

### Distribution

**iOS**:
- TestFlight for beta testing
- App Store for production

**Android**:
- Google Play Internal Testing
- Google Play Beta Track
- Google Play Production

## Environment Configuration

```typescript
// src/config/env.ts
export const config = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL,
  WS_URL: process.env.EXPO_PUBLIC_WS_URL,
  SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
  ENVIRONMENT: process.env.EXPO_PUBLIC_ENV || 'development'
};
```

### Environment Files
- `.env.development` - Local development
- `.env.staging` - Staging environment
- `.env.production` - Production environment

## Monitoring & Analytics

### Error Tracking
- **Sentry**: Crash reporting and error tracking
- **Expo Application Services**: Build and deployment analytics

### Analytics
- **Expo Analytics**: User behavior tracking
- **Custom Events**:
  - Job viewed
  - Check-in completed
  - Photo uploaded
  - Sync completed

## Next Steps

1. ✅ Initialize Expo project
2. Install core dependencies
3. Set up folder structure
4. Configure TypeScript & ESLint
5. Set up WatermelonDB
6. Implement authentication
7. Create job list screen
8. Implement check-in/out
9. Add media capture
10. Build offline sync
11. Add push notifications
12. Configure builds

---

**Version**: 1.0.0
**Last Updated**: 2025-11-17
**Owner**: Mobile Team
