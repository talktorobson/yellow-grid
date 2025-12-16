# Mobile Profile Features Specification

**Version**: 1.0
**Status**: PLANNED
**Last Updated**: 2025-12-04
**Target Audience**: Work Teams (Field Technicians)

---

## Overview

This document specifies the functional requirements for all Profile screen features in the Yellow Grid Mobile App. These features enable Work Team members to manage their personal settings, work configuration, and app preferences.

---

## Feature Matrix

| # | Feature | Category | Priority | Backend Changes | Mobile Changes | Effort |
|---|---------|----------|----------|-----------------|----------------|--------|
| 1 | Change Profile Photo | Account | P2 | Minor | Moderate | 2 days |
| 2 | Personal Information | Account | P1 | None (existing) | Moderate | 2 days |
| 3 | Change Password | Account | P1 | Minor | Moderate | 2 days |
| 4 | Notification Settings | Account | P2 | None (existing) | Moderate | 3 days |
| 5 | Availability Settings | Work | P1 | None (existing) | Complex | 4 days |
| 6 | Service Areas | Work | P2 | None (existing) | Moderate | 3 days |
| 7 | Certifications | Work | P3 | None (existing) | Simple | 1 day |
| 8 | Language Settings | App | P2 | Minor | Moderate | 2 days |
| 9 | Dark Mode | App | P3 | None | Simple | 1 day |
| 10 | Sync Data | App | P2 | None (existing) | Simple | 1 day |
| 11 | Help & FAQ | Support | P3 | None | Simple | 1 day |
| 12 | Contact Support | Support | P3 | Minor | Simple | 1 day |
| 13 | Terms & Privacy | Support | P3 | None | Simple | 0.5 day |

**Total Estimated Effort**: 23.5 days (~5 weeks)

---

## Feature Specifications

### 1. Change Profile Photo

**Purpose**: Allow Work Team members to upload a profile photo for identification.

**User Story**: As a Work Team member, I want to upload my profile photo so customers and operators can identify me.

#### Backend Changes
```
Model: User
  - Add: avatarUrl String? @map("avatar_url")
  - Add: avatarThumbnailUrl String? @map("avatar_thumbnail_url")

API Endpoint:
  POST /api/v1/users/me/avatar
  - Accept: multipart/form-data
  - Max size: 5MB
  - Formats: JPEG, PNG, WebP
  - Returns: { avatarUrl, avatarThumbnailUrl }
  
  DELETE /api/v1/users/me/avatar
  - Removes avatar and thumbnail from GCS
```

#### Mobile Implementation
- New screen: `ProfilePhotoScreen.tsx`
- Image picker with camera option
- Crop/resize before upload (expo-image-picker + expo-image-manipulator)
- Show upload progress
- Update auth store with new avatar URL

#### Dependencies
- Existing GCS media upload service (`media-upload.service.ts`)
- Sharp for thumbnail generation (already implemented)

---

### 2. Personal Information (View/Edit)

**Purpose**: View and edit personal details like name, email, phone.

**User Story**: As a Work Team member, I want to update my contact information so operators can reach me.

#### Backend (Already Exists)
```
Existing endpoints:
  GET  /api/v1/users/me          # Get current user profile
  PATCH /api/v1/users/me         # Update profile fields
  
Editable fields:
  - firstName
  - lastName
  - phone
  - preferredLanguage
  
Read-only fields:
  - email (requires admin change)
  - role
  - workTeamId
  - providerId
```

#### Mobile Implementation
- New screen: `PersonalInfoScreen.tsx`
- Form with validation (phone E.164, names not empty)
- Save button with loading state
- Success/error feedback
- Navigate back on success

---

### 3. Change Password

**Purpose**: Allow users to change their password securely.

**User Story**: As a Work Team member, I want to change my password periodically for security.

#### Backend Changes
```
New endpoint:
  POST /api/v1/auth/change-password
  Body: {
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  }
  
Validation:
  - Verify currentPassword matches
  - newPassword: min 8 chars, 1 uppercase, 1 number
  - newPassword !== currentPassword
  - confirmPassword === newPassword
  
Response:
  - 200: Password changed, invalidate all refresh tokens
  - 400: Validation errors
  - 401: Current password incorrect
```

#### Mobile Implementation
- New screen: `ChangePasswordScreen.tsx`
- Three password fields with visibility toggle
- Password strength indicator
- Validation feedback
- Force re-login on success (security best practice)

---

### 4. Notification Settings

**Purpose**: Configure notification preferences (push, email, SMS).

**User Story**: As a Work Team member, I want to control which notifications I receive and through which channels.

#### Backend (Already Exists)
```
Model: NotificationPreference (exists)
  - emailEnabled
  - smsEnabled
  - pushEnabled
  - eventPreferences (JSON for per-event settings)
  - quietHoursEnabled
  - quietHoursStart/End
  - quietHoursTimezone

Existing endpoints:
  GET  /api/v1/notifications/preferences/:userId
  PUT  /api/v1/notifications/preferences/:userId
  POST /api/v1/notifications/preferences/:userId/opt-out/:channel
  POST /api/v1/notifications/preferences/:userId/opt-in/:channel
```

#### Mobile Implementation
- New screen: `NotificationSettingsScreen.tsx`
- Channel toggles (Push, Email, SMS)
- Event-specific toggles:
  - New assignment alerts
  - Schedule changes
  - Chat messages
  - System announcements
- Quiet hours configuration
- Timezone picker

---

### 5. Availability Settings

**Purpose**: Set working hours and days for scheduling purposes.

**User Story**: As a Work Team member, I want to set my availability so I'm only assigned jobs during my working hours.

#### Backend (Already Exists - WorkTeamCalendar model)
```
Models:
  WorkTeamCalendar
    - inheritFromProvider
    - workingDays (bitmap)
    - morningShiftStart/End
    - afternoonShiftStart/End
    - eveningShiftStart/End
    - lunchBreakStart
    - lunchBreakDurationMinutes
    - maxDailyAssignments
  
  PlannedAbsence
    - startDate, endDate
    - absenceType (VACATION, SICK_LEAVE, TRAINING, etc.)
    - status (PENDING, APPROVED, REJECTED)
    - reason
    
API (may need new endpoints):
  GET  /api/v1/work-teams/:id/calendar
  PUT  /api/v1/work-teams/:id/calendar
  GET  /api/v1/work-teams/:id/absences
  POST /api/v1/work-teams/:id/absences
  DELETE /api/v1/work-teams/:id/absences/:absenceId
```

#### Mobile Implementation
- New screen: `AvailabilitySettingsScreen.tsx`
- Weekly schedule grid (Mon-Sun)
- Shift toggles (morning, afternoon, evening)
- Shift time pickers
- Lunch break configuration
- Max daily jobs slider
- Planned absences section:
  - List of upcoming absences
  - Add new absence (date range picker)
  - Delete pending absences

---

### 6. Service Areas (View Only)

**Purpose**: View assigned intervention zones and coverage areas.

**User Story**: As a Work Team member, I want to see my service areas so I know my coverage zone.

#### Backend (Already Exists)
```
Models:
  WorkTeamZoneAssignment
    - workTeamId
    - interventionZoneId
    - isActive
    
  InterventionZone
    - name
    - zoneType (PRIMARY, SECONDARY, OVERFLOW)
    - postalCodes (array)
    - boundaryGeoJson (polygon)
    
API (may need new endpoint):
  GET /api/v1/work-teams/:id/zones
  Returns: list of zones with postal codes and map polygons
```

#### Mobile Implementation
- New screen: `ServiceAreasScreen.tsx`
- List of assigned zones with:
  - Zone name
  - Type badge (Primary/Secondary/Overflow)
  - Postal codes
- Optional: Map view with zone polygons (react-native-maps)
- Read-only (zones assigned by provider admin)

---

### 7. Certifications (View Only)

**Purpose**: View held certifications and expiry dates.

**User Story**: As a Work Team member, I want to see my certifications so I know which services I'm qualified for.

#### Backend (Already Exists)
```
Model: WorkTeamCertification
  - certificationName
  - certificationNumber
  - issuingAuthority
  - issueDate
  - expiryDate
  - isActive
  
API (may need new endpoint):
  GET /api/v1/work-teams/:id/certifications
```

#### Mobile Implementation
- New screen: `CertificationsScreen.tsx`
- List of certifications with:
  - Name and issuing authority
  - Expiry date with status indicator:
    - 🟢 Valid (>30 days)
    - 🟡 Expiring soon (≤30 days)
    - 🔴 Expired
  - Certification number
- Read-only (certifications managed by provider admin)

---

### 8. Language Settings

**Purpose**: Change app display language.

**User Story**: As a Work Team member working in a multi-language country, I want to use the app in my preferred language.

#### Backend Changes
```
User model update:
  - preferredLanguage already exists
  
No new endpoints needed - uses existing PATCH /api/v1/users/me
```

#### Mobile Implementation
- New screen: `LanguageSettingsScreen.tsx`
- List of supported languages:
  - 🇬🇧 English
  - 🇫🇷 Français
  - 🇪🇸 Español
  - 🇮🇹 Italiano
  - 🇵🇹 Português
- i18n integration (react-i18next or expo-localization)
- Persist selection to:
  - AsyncStorage (immediate UI change)
  - Backend (sync user preference)
- App restarts with new language

---

### 9. Dark Mode

**Purpose**: Toggle between light and dark theme.

**User Story**: As a Work Team member working in various lighting conditions, I want to use dark mode to reduce eye strain.

#### Backend
- No backend changes needed (local preference)

#### Mobile Implementation
- Add to auth store or new settings store:
  - `theme: 'light' | 'dark' | 'system'`
- Update theme provider with dynamic colors
- Persist to AsyncStorage
- System default option respects device setting

---

### 10. Sync Data

**Purpose**: Manually trigger offline data synchronization.

**User Story**: As a Work Team member, I want to manually sync my data when I have good connectivity.

#### Backend (Already Exists)
```
Existing endpoint:
  POST /api/v1/execution/sync
  
Sync service already implemented in mobile app (sync.service.ts)
```

#### Mobile Implementation
- Trigger manual sync on press
- Show sync status:
  - Last sync timestamp
  - Number of pending changes
  - Sync progress indicator
- Success/error feedback
- Already have `SyncService` - just need UI wrapper

---

### 11. Help & FAQ

**Purpose**: Access help documentation and FAQs.

**User Story**: As a Work Team member, I want to access help articles to solve common issues.

#### Backend
- No backend (static content or external CMS)

#### Mobile Implementation
- New screen: `HelpFaqScreen.tsx`
- Accordion-style FAQ sections:
  - Getting Started
  - Using the App
  - Troubleshooting
  - Contact Information
- Open external links in WebView/browser
- Deep links to specific help topics

---

### 12. Contact Support

**Purpose**: Reach support team via multiple channels.

**User Story**: As a Work Team member, I want to contact support when I need help.

#### Backend Changes (Optional)
```
Optional endpoint for in-app tickets:
  POST /api/v1/support/tickets
  Body: {
    subject: string,
    message: string,
    category: string,
    attachments?: string[]
  }
```

#### Mobile Implementation
- New screen: `ContactSupportScreen.tsx`
- Contact options:
  - 📞 Call support hotline (Linking.openURL('tel:'))
  - 📧 Email support (Linking.openURL('mailto:'))
  - 💬 In-app chat (optional - uses existing chat infrastructure)
  - 🎫 Submit ticket (optional)
- Include device info in emails:
  - App version
  - Device model
  - OS version
  - User ID

---

### 13. Terms & Privacy

**Purpose**: View legal documents (Terms of Service, Privacy Policy).

**User Story**: As a Work Team member, I want to review the terms and privacy policy.

#### Backend
- No backend (static content or external URLs)

#### Mobile Implementation
- New screen: `TermsPrivacyScreen.tsx`
- Two sections:
  - Terms of Service (WebView or external link)
  - Privacy Policy (WebView or external link)
- Last updated date display
- Accept/acknowledge tracking (if required)

---

## Implementation Phases

### Phase 1: Core Account Features (Week 1-2)
1. Personal Information - P1
2. Change Password - P1
3. Availability Settings - P1

### Phase 2: Notification & Localization (Week 3)
4. Notification Settings - P2
5. Language Settings - P2

### Phase 3: Profile Enhancement (Week 4)
6. Change Profile Photo - P2
7. Service Areas - P2
8. Sync Data - P2

### Phase 4: View-Only & Support (Week 5)
9. Certifications - P3
10. Dark Mode - P3
11. Help & FAQ - P3
12. Contact Support - P3
13. Terms & Privacy - P3

---

## Navigation Structure

```
Profile (Tab)
├── ProfileScreen.tsx (main)
│   ├── Account Section
│   │   ├── PersonalInfoScreen.tsx
│   │   ├── ChangePasswordScreen.tsx
│   │   └── NotificationSettingsScreen.tsx
│   ├── Work Section
│   │   ├── AvailabilitySettingsScreen.tsx
│   │   ├── ServiceAreasScreen.tsx
│   │   └── CertificationsScreen.tsx
│   ├── App Section
│   │   ├── LanguageSettingsScreen.tsx
│   │   └── (Dark Mode - inline toggle)
│   │   └── (Sync Data - action button)
│   └── Support Section
│       ├── HelpFaqScreen.tsx
│       ├── ContactSupportScreen.tsx
│       └── TermsPrivacyScreen.tsx
```

---

## API Summary

### New Endpoints Required
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/users/me/avatar` | POST | Upload profile photo |
| `/api/v1/users/me/avatar` | DELETE | Remove profile photo |
| `/api/v1/auth/change-password` | POST | Change password |
| `/api/v1/work-teams/:id/calendar` | GET | Get team calendar |
| `/api/v1/work-teams/:id/calendar` | PUT | Update team calendar |
| `/api/v1/work-teams/:id/absences` | GET | List absences |
| `/api/v1/work-teams/:id/absences` | POST | Request absence |
| `/api/v1/work-teams/:id/absences/:id` | DELETE | Cancel absence |
| `/api/v1/work-teams/:id/zones` | GET | Get zone assignments |
| `/api/v1/work-teams/:id/certifications` | GET | Get certifications |

### Existing Endpoints to Use
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/users/me` | GET | Get user profile |
| `/api/v1/users/me` | PATCH | Update profile |
| `/api/v1/notifications/preferences/:id` | GET/PUT | Notification prefs |
| `/api/v1/execution/sync` | POST | Trigger sync |

---

## Database Changes

### User Model Additions
```prisma
model User {
  // Existing fields...
  
  // NEW: Profile photo
  avatarUrl          String? @map("avatar_url")
  avatarThumbnailUrl String? @map("avatar_thumbnail_url")
}
```

---

## Mobile Files to Create

```
mobile/src/screens/profile/
├── ProfileScreen.tsx (existing - update navigation)
├── PersonalInfoScreen.tsx
├── ChangePasswordScreen.tsx
├── NotificationSettingsScreen.tsx
├── AvailabilitySettingsScreen.tsx
├── ServiceAreasScreen.tsx
├── CertificationsScreen.tsx
├── LanguageSettingsScreen.tsx
├── HelpFaqScreen.tsx
├── ContactSupportScreen.tsx
└── TermsPrivacyScreen.tsx

mobile/src/services/
├── profile.service.ts (avatar upload, password change)
└── settings.service.ts (preferences, language)

mobile/src/store/
└── settings.store.ts (theme, language preferences)

mobile/src/i18n/
├── index.ts
├── en.json
├── fr.json
├── es.json
├── it.json
└── pt.json
```

---

## Success Criteria

1. ✅ All 13 features implemented and functional
2. ✅ All screens have proper loading and error states
3. ✅ Offline support where applicable (settings cache)
4. ✅ Proper form validation with user feedback
5. ✅ Consistent UI following design system
6. ✅ i18n support in at least 5 languages
7. ✅ Unit tests for all service methods
8. ✅ E2E tests for critical flows (password change, availability)

---

## Related Documents

- `documentation/implementation/IMPLEMENTATION_TRACKING.md` - Overall project progress
- `documentation/domain/02-provider-capacity-domain.md` - Provider/WorkTeam data model
- `mobile/README.md` - Mobile app architecture
- `documentation/architecture/MOBILE_APP_ARCHITECTURE.md` - Technical design
