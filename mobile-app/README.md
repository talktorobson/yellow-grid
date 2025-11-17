# Yellow Grid Mobile App

React Native mobile application for field service technicians built with Expo.

## Project Status: Phase 3 - In Progress 🚧

### ✅ Completed (2/14)

1. **Project Setup** - Expo TypeScript project initialized
2. **Core Architecture** - Project structure and configuration files

### 🔄 In Progress (1/14)

- **Dependencies Installation** - Installing core packages

### ⏳ Pending (11/14)

- TypeScript & ESLint configuration
- Authentication implementation
- Job list screen
- Job detail screen
- Check-in/out UI with GPS
- Service execution tracking
- Media capture
- Offline sync
- Push notifications
- iOS build configuration
- Android build configuration

## Technology Stack

- **Framework**: React Native (Expo SDK 52+)
- **Language**: TypeScript 5.x
- **Navigation**: Expo Router (file-based)
- **State Management**: Zustand + React Query
- **Offline Database**: WatermelonDB
- **UI Components**: React Native Paper (Material Design)
- **Authentication**: JWT with Expo Secure Store
- **Media**: Expo Camera, Image Picker, Media Library
- **Location**: Expo Location
- **Notifications**: Expo Notifications

## Project Structure

```
mobile-app/
├── app/                          # Expo Router screens
├── src/
│   ├── api/                      # API clients
│   │   ├── client.ts             # ✅ Axios instance with interceptors
│   │   └── jobs.ts               # ✅ Jobs API endpoints
│   ├── components/               # Reusable components
│   │   ├── ui/                   # UI components
│   │   ├── job/                  # Job-specific components
│   │   └── media/                # Media components
│   ├── services/                 # Business logic
│   │   ├── auth/
│   │   │   └── AuthService.ts    # ✅ Authentication service
│   │   ├── location/
│   │   ├── sync/
│   │   ├── media/
│   │   └── notifications/
│   ├── store/                    # Zustand stores
│   ├── hooks/                    # Custom React hooks
│   ├── types/
│   │   └── api.ts                # ✅ TypeScript API types
│   ├── config/
│   │   └── env.ts                # ✅ Environment configuration
│   └── utils/                    # Utility functions
├── assets/                       # Static assets
└── docs/                         # Documentation
```

## Quick Start

### Prerequisites

- Node.js 20+ LTS
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
cd mobile-app
npm install
```

### Development

```bash
# Start Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web (for testing)
npm run web
```

### Environment Configuration

Create environment files:

**`.env.development`**:
```env
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_WS_URL=ws://localhost:3000/api/v1/mobile/ws
```

**`.env.staging`**:
```env
EXPO_PUBLIC_ENV=staging
EXPO_PUBLIC_API_URL=https://api-staging.yellow-grid.com/api/v1
EXPO_PUBLIC_WS_URL=wss://api-staging.yellow-grid.com/api/v1/mobile/ws
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

**`.env.production`**:
```env
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_API_URL=https://api.yellow-grid.com/api/v1
EXPO_PUBLIC_WS_URL=wss://api.yellow-grid.com/api/v1/mobile/ws
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

## Implemented Features

### Configuration & API Client (✅ Complete)

**Environment Configuration** (`src/config/env.ts`):
- Multi-environment support (dev, staging, production)
- Expo public environment variables
- API base URL, WebSocket URL configuration
- Logging and monitoring configuration

**API Client** (`src/api/client.ts`):
- Axios instance with authentication interceptors
- Automatic token refresh on 401 errors
- Error handling and logging
- Network error detection
- Rate limit handling
- Device info headers

**Type Definitions** (`src/types/api.ts`):
- Complete TypeScript types for all API endpoints
- Jobs, tasks, check-in/out types
- Media upload types
- Offline sync types
- WebSocket event types
- Based on official API specification

### Authentication Service (✅ Complete)

**AuthService** (`src/services/auth/AuthService.ts`):
- Login with email/password
- Logout and clear credentials
- Automatic token refresh before expiration
- Secure token storage with Expo Secure Store
- JWT token decoding and validation
- Session restoration on app launch
- Singleton pattern for global access

**Features**:
- ✅ Secure token storage (encrypted)
- ✅ Auto-refresh 5 minutes before expiration
- ✅ Session persistence across app restarts
- ✅ Biometric authentication support (ready for implementation)
- ✅ Error handling and recovery

### Jobs API (✅ Complete)

**Jobs Endpoints** (`src/api/jobs.ts`):
```typescript
getJobs(params)              // List assigned jobs with filters
getJobById(jobId)            // Get job details
updateJobStatus(jobId, data) // Update job status
checkIn(jobId, data)         // Check in to job
checkOut(jobId, data)        // Check out from job
getTodaysJobs()              // Helper: Get today's jobs
getJobsByStatus(status)      // Helper: Filter by status
refreshJobs(syncToken)       // Pull-to-refresh with sync
```

**Features**:
- ✅ Complete CRUD operations
- ✅ Offline-first data sync support
- ✅ GPS location tracking for check-in/out
- ✅ TypeScript type safety
- ✅ Error handling

## Next Steps

### Immediate (Week 1)

1. **Complete dependency installation**
2. **Configure TypeScript/ESLint**
3. **Set up Zustand stores**:
   - Auth store
   - Jobs store
   - Sync store
   - UI store
4. **Implement custom hooks**:
   - `useAuth()` - Authentication state
   - `useJobs()` - Jobs management with React Query

### Short-term (Week 2-3)

5. **Create UI screens**:
   - Login screen
   - Job list screen
   - Job detail screen
   - Check-in/out flow
6. **Implement location services**:
   - GPS tracking
   - Geofence validation
   - Background location
7. **Media capture**:
   - Camera integration
   - Photo compression
   - Upload queue

### Medium-term (Week 4-5)

8. **Offline sync**:
   - WatermelonDB setup
   - Sync manager
   - Conflict resolution
9. **Push notifications**:
   - Firebase integration
   - Notification handlers
   - Local notifications
10. **Testing**:
    - Unit tests
    - Component tests
    - E2E tests

### Long-term (Week 6+)

11. **Build configuration**:
    - EAS Build setup
    - iOS provisioning
    - Android signing
12. **Distribution**:
    - TestFlight beta
    - Google Play internal testing
    - Production deployment

## Architecture Highlights

### Authentication Flow

```
User enters credentials
  ↓
AuthService.login()
  ↓
Store JWT in Expo Secure Store
  ↓
Schedule auto-refresh (exp - 5min)
  ↓
API Client adds Bearer token to all requests
  ↓
On 401: Auto-refresh token
  ↓
If refresh fails: Logout user
```

### Offline-First Strategy

```
User action (e.g., check-in)
  ↓
Save to local WatermelonDB
  ↓
Add to sync queue
  ↓
Update UI immediately
  ↓
If online:
  - Upload to server
  - Update with server ID
  - Remove from queue
If offline:
  - Keep in queue
  - Sync when online
  - Handle conflicts
```

### API Error Handling

```
Request fails
  ↓
Check error type:
  - 401 Unauthorized → Refresh token
  - 429 Rate Limit → Show retry message
  - Network Error → Enable offline mode
  - Other → Show error message
  ↓
Log error with trace ID
  ↓
Return user-friendly error
```

## API Documentation

Refer to backend API documentation:
- **Mobile API**: `/product-docs/api/06-execution-mobile-api.md`
- **Field Operations**: `/product-docs/domain/06-execution-field-operations.md`
- **RBAC**: `/product-docs/security/02-rbac-model.md`

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage

# Run E2E tests (Detox)
npm run test:e2e
```

## Building for Production

### iOS

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios
```

### Android

```bash
# Build for Android
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android
```

## Troubleshooting

### Common Issues

**Metro bundler errors**:
```bash
# Clear cache
npm start -- --clear

# Or
npx expo start -c
```

**Dependency conflicts**:
```bash
# Clear node_modules
rm -rf node_modules
npm install
```

**iOS simulator issues**:
```bash
# Reset simulator
xcrun simctl erase all
```

**Android emulator issues**:
```bash
# Cold boot emulator
$ANDROID_HOME/tools/emulator @Pixel_5_API_31 -wipe-data
```

## Resources

- **Expo Docs**: https://docs.expo.dev/
- **React Native**: https://reactnative.dev/
- **React Query**: https://tanstack.com/query/latest
- **WatermelonDB**: https://nozbe.github.io/WatermelonDB/
- **Zustand**: https://docs.pmnd.rs/zustand/

## Contributing

See main repository CONTRIBUTING.md for guidelines.

## License

Copyright © 2025 Yellow Grid Platform. All rights reserved.

---

**Version**: 0.1.0 (Phase 3 - In Development)
**Last Updated**: 2025-11-17
**Team**: Mobile Development Team A + B
