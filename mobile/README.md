# Yellow Grid Mobile App

React Native mobile application for field service technicians using the Yellow Grid Platform.

## Overview

This is the mobile companion app for Yellow Grid FSM Platform, built with React Native and Expo. It allows field technicians to:

- View assigned service orders
- Check in/out at job sites with GPS tracking
- Complete service checklists
- Capture photos and videos
- Collect customer signatures
- Work offline with automatic sync
- Receive push notifications for new assignments

## Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Navigation**: React Navigation (Stack + Tabs)
- **State Management**: Zustand
- **Data Fetching**: React Query (TanStack Query)
- **Offline Storage**: WatermelonDB
- **Secure Storage**: Expo SecureStore
- **UI Components**: Custom components with Expo Vector Icons

## Project Structure

```
mobile/
├── src/
│   ├── components/       # Reusable UI components
│   ├── screens/          # Screen components
│   │   ├── auth/         # Authentication screens
│   │   ├── service-orders/   # Service order screens
│   │   ├── executions/   # Field execution screens
│   │   └── profile/      # User profile screens
│   ├── navigation/       # Navigation configuration
│   ├── store/            # Zustand state stores
│   ├── services/         # API services
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   ├── config/           # App configuration
│   └── database/         # WatermelonDB schemas
├── assets/               # Images, fonts, etc.
├── App.tsx              # Root component
├── app.json             # Expo configuration
└── package.json         # Dependencies

```

## Installation

### Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- For iOS development: Xcode (macOS only)
- For Android development: Android Studio

### Setup

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Run on iOS simulator (macOS only):
   ```bash
   npm run ios
   ```

5. Run on Android emulator:
   ```bash
   npm run android
   ```

6. Run in web browser (for testing):
   ```bash
   npm run web
   ```

## Development

### Environment Configuration

Create a `.env` file in the mobile directory:

```env
API_BASE_URL=http://localhost:3000/api/v1
```

### Code Structure

#### State Management

The app uses Zustand for state management with three main stores:

- **authStore**: User authentication and session
- **serviceOrderStore**: Service order data and filters
- **executionStore**: Check-in/out and field execution state

#### API Integration

All API calls go through the `apiService` which handles:

- Automatic token refresh
- Request/response interceptors
- Error handling
- File uploads

#### Navigation

Three-level navigation structure:

1. **Root Navigator**: Auth vs Main app
2. **Main Tab Navigator**: Service Orders, Executions, Profile
3. **Stack Navigators**: Nested screens within each tab

### Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run in web browser
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check

## Features Implemented

### ✅ Phase 1 Complete

- [x] Project setup with Expo and TypeScript
- [x] TypeScript configuration with path aliases
- [x] ESLint and Prettier configuration
- [x] Zustand state stores setup
- [x] React Query configuration
- [x] API service with token refresh
- [x] Navigation structure (Auth + Main + Tabs)
- [x] Authentication screen and flow
- [x] Service Orders list screen with search
- [x] Service Order detail screen
- [x] Profile screen
- [x] Check-in/out hooks with GPS tracking

### ✅ Phase 2 Complete

- [x] Check-in screen with GPS tracking and safety hazard reporting
- [x] Check-out screen with comprehensive forms
  - [x] Work description and tasks completed
  - [x] Materials used tracking
  - [x] Customer feedback and ratings
  - [x] Next visit scheduling
- [x] Media capture with camera integration
  - [x] Photo capture screen
  - [x] Gallery picker integration
  - [x] Photo preview and retake
- [x] Signature capture component (SVG-based)
- [x] Push notifications infrastructure
  - [x] Token registration
  - [x] Notification handlers
  - [x] Deep linking navigation

### 🚧 In Progress

- [ ] Offline-first sync with WatermelonDB
- [ ] Video recording support
- [ ] Media gallery view
- [ ] Photo upload to backend

### 📋 Todo

- [ ] iOS build configuration for TestFlight
- [ ] Android build configuration for Google Play
- [ ] E2E testing setup
- [ ] Performance optimization
- [ ] Accessibility features

## API Integration

### Authentication

```typescript
// Login
const { login } = useAuthStore();
await login({ email, password });

// Logout
const { logout } = useAuthStore();
await logout();
```

### Service Orders

```typescript
// Fetch assigned orders
const { data: orders } = useAssignedServiceOrders();

// Get single order
const { data: order } = useServiceOrder(orderId);

// Accept assignment
const acceptMutation = useAcceptAssignment();
await acceptMutation.mutateAsync(orderId);
```

### Check-In/Out

```typescript
// Check in
const checkInMutation = useCheckIn();
await checkInMutation.mutateAsync({
  serviceOrderId,
  customerPresent: true,
  siteAccessNotes: 'Access code: 1234',
});

// Check out
const checkOutMutation = useCheckOut();
await checkOutMutation.mutateAsync({
  serviceOrderId,
  completionStatus: 'COMPLETED',
  workPerformed: { ... },
});
```

## Permissions

The app requires the following permissions:

- **Location**: For GPS tracking during check-in/out
- **Camera**: For capturing photos/videos
- **Photo Library**: For selecting media
- **Notifications**: For push notifications

These are configured in `app.json` and requested at runtime.

## Build & Deployment

### Development Build

```bash
# iOS
expo build:ios -t simulator

# Android
expo build:android -t apk
```

### Production Build

```bash
# iOS (for App Store)
expo build:ios -t archive

# Android (for Play Store)
expo build:android -t app-bundle
```

### TestFlight Distribution (iOS)

1. Create an App Store Connect app
2. Configure bundle identifier in `app.json`
3. Build archive: `expo build:ios`
4. Upload to App Store Connect
5. Distribute via TestFlight

### Google Play Beta (Android)

1. Create Google Play Console app
2. Configure package name in `app.json`
3. Build app bundle: `expo build:android -t app-bundle`
4. Upload to Play Console
5. Create beta track

## Troubleshooting

### Common Issues

**Metro bundler errors**:
```bash
expo start -c
```

**iOS build issues**:
```bash
cd ios && pod install && cd ..
```

**Android build issues**:
```bash
cd android && ./gradlew clean && cd ..
```

**TypeScript errors**:
```bash
npm run type-check
```

## Contributing

### Code Style

- Follow TypeScript strict mode
- Use functional components with hooks
- Follow naming conventions in codebase
- Write unit tests for utilities and hooks
- Write integration tests for screens

### Git Workflow

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit: `git commit -m "feat: add my feature"`
3. Push to remote: `git push origin feature/my-feature`
4. Create pull request

## License

Proprietary - Yellow Grid Platform

## Support

For questions or issues, contact the development team.

---

**Version**: 1.0.0
**Last Updated**: 2025-11-17
**Minimum iOS**: 13.0
**Minimum Android**: API 21 (Android 5.0)
