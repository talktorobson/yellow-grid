# Scheduling & Availability API

## Overview

This document provides complete OpenAPI 3.1 specifications for Scheduling and Availability endpoints. These APIs enable intelligent provider availability search, schedule management, time slot optimization, and conflict detection.

## Table of Contents

1. [Availability Search API](#availability-search-api)
2. [Schedule Management API](#schedule-management-api)
3. [Time Slot API](#time-slot-api)
4. [Conflict Detection API](#conflict-detection-api)
5. [Bulk Scheduling API](#bulk-scheduling-api)

---

## Availability Search API

### Advanced Provider Availability Search

```yaml
openapi: 3.1.0
info:
  title: Scheduling & Availability API
  version: 1.0.0

components:
  schemas:
    AvailabilitySearchRequest:
      type: object
      required:
        - startDate
        - endDate
        - duration
      properties:
        startDate:
          type: string
          format: date
          description: Search start date
          example: "2025-11-14"
        endDate:
          type: string
          format: date
          description: Search end date
          example: "2025-11-20"
        duration:
          type: number
          format: double
          minimum: 0.25
          description: Required duration in hours
          example: 2.5
        requiredSkills:
          type: array
          items:
            type: object
            required:
              - skillId
            properties:
              skillId:
                type: string
                description: Required skill identifier
                example: skill_hvac_repair
              minimumProficiency:
                type: string
                enum: [beginner, intermediate, advanced, expert]
                default: intermediate
                description: Minimum required proficiency level
          description: Required skills and proficiency levels
        requiredCertifications:
          type: array
          items:
            type: string
          description: Required certification IDs
          example: [cert_epa_universal, cert_osha_30]
        location:
          $ref: '#/components/schemas/LocationConstraint'
        timePreferences:
          $ref: '#/components/schemas/TimePreferences'
        filters:
          $ref: '#/components/schemas/AvailabilityFilters'
        sortBy:
          type: string
          enum: [availability, distance, rating, cost, experience]
          default: availability
          description: Sort results by criteria
        limit:
          type: integer
          minimum: 1
          maximum: 100
          default: 20
          description: Maximum number of results

    LocationConstraint:
      type: object
      required:
        - latitude
        - longitude
      properties:
        latitude:
          type: number
          format: double
          minimum: -90
          maximum: 90
          example: 40.7128
        longitude:
          type: number
          format: double
          minimum: -180
          maximum: 180
          example: -74.0060
        maxDistance:
          type: number
          format: double
          description: Maximum distance in miles
          example: 25.0
        territoryId:
          type: string
          format: uuid
          description: Specific territory constraint

    TimePreferences:
      type: object
      properties:
        preferredDays:
          type: array
          items:
            type: string
            enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
          description: Preferred days of week
          example: [monday, tuesday, wednesday]
        preferredTimeRanges:
          type: array
          items:
            type: object
            properties:
              startTime:
                type: string
                pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
                description: Preferred start time (24h)
                example: "09:00"
              endTime:
                type: string
                pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
                description: Preferred end time (24h)
                example: "17:00"
          description: Preferred time ranges
        allowWeekends:
          type: boolean
          default: false
          description: Allow weekend scheduling
        allowAfterHours:
          type: boolean
          default: false
          description: Allow after-hours scheduling

    AvailabilityFilters:
      type: object
      properties:
        minRating:
          type: number
          format: double
          minimum: 0
          maximum: 5
          description: Minimum provider rating
          example: 4.0
        maxHourlyRate:
          type: number
          format: decimal
          minimum: 0
          description: Maximum hourly rate
          example: 100.00
        employmentTypes:
          type: array
          items:
            type: string
            enum: [W2, 1099, contractor, employee]
          description: Allowed employment types
        excludeProviders:
          type: array
          items:
            type: string
            format: uuid
          description: Provider IDs to exclude
        minExperience:
          type: integer
          minimum: 0
          description: Minimum years of experience
          example: 3

    AvailabilitySearchResponse:
      type: object
      properties:
        searchId:
          type: string
          format: uuid
          description: Unique search identifier
          example: search_123e4567-e89b-12d3-a456-426614174000
        searchParams:
          $ref: '#/components/schemas/AvailabilitySearchRequest'
        results:
          type: array
          items:
            $ref: '#/components/schemas/ProviderAvailability'
        summary:
          type: object
          properties:
            totalProviders:
              type: integer
              description: Total matching providers
              example: 12
            totalSlots:
              type: integer
              description: Total available time slots
              example: 87
            dateRange:
              type: object
              properties:
                start:
                  type: string
                  format: date
                end:
                  type: string
                  format: date
        generatedAt:
          type: string
          format: date-time
          description: Search execution timestamp

    ProviderAvailability:
      type: object
      properties:
        provider:
          $ref: '#/components/schemas/ProviderSummary'
        availableSlots:
          type: array
          items:
            $ref: '#/components/schemas/TimeSlot'
          description: Available time slots
        matchScore:
          type: number
          format: double
          minimum: 0
          maximum: 1
          description: Match score based on criteria (0-1)
          example: 0.87
        distance:
          type: number
          format: double
          description: Distance from location in miles
          example: 12.5
        estimatedTravelTime:
          type: integer
          description: Estimated travel time in minutes
          example: 25
        utilizationRate:
          type: number
          format: double
          description: Current utilization rate (0-1)
          example: 0.65

    ProviderSummary:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
          example: John Doe
        email:
          type: string
          format: email
        phone:
          type: string
        rating:
          type: number
          format: double
          example: 4.8
        completionRate:
          type: number
          format: double
          example: 0.96
        hourlyRate:
          type: number
          format: decimal
          example: 75.00
        skills:
          type: array
          items:
            type: object
            properties:
              name:
                type: string
              proficiency:
                type: string
        certifications:
          type: array
          items:
            type: object
            properties:
              name:
                type: string
              expiryDate:
                type: string
                format: date

    TimeSlot:
      type: object
      properties:
        slotId:
          type: string
          format: uuid
          description: Unique slot identifier
        startTime:
          type: string
          format: date-time
          description: Slot start time
          example: "2025-11-14T09:00:00Z"
        endTime:
          type: string
          format: date-time
          description: Slot end time
          example: "2025-11-14T12:00:00Z"
        duration:
          type: number
          format: double
          description: Slot duration in hours
          example: 3.0
        isPreferred:
          type: boolean
          description: Whether slot matches time preferences
          example: true
        cost:
          type: object
          properties:
            base:
              type: number
              format: decimal
              description: Base cost for slot
              example: 225.00
            premiums:
              type: object
              properties:
                weekend:
                  type: number
                  format: decimal
                  example: 0.00
                afterHours:
                  type: number
                  format: decimal
                  example: 0.00
                emergency:
                  type: number
                  format: decimal
                  example: 0.00
            total:
              type: number
              format: decimal
              description: Total cost including premiums
              example: 225.00
        conflicts:
          type: array
          items:
            type: object
          description: Any potential conflicts

paths:
  /availability/search:
    post:
      summary: Search provider availability
      description: |
        Intelligent search for provider availability based on skills, location,
        time preferences, and other criteria. Returns ranked results with
        available time slots.
      operationId: searchAvailability
      tags:
        - Availability
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AvailabilitySearchRequest'
            examples:
              basicSearch:
                summary: Basic availability search
                value:
                  startDate: "2025-11-14"
                  endDate: "2025-11-20"
                  duration: 2.5
                  requiredSkills:
                    - skillId: skill_hvac_repair
                      minimumProficiency: advanced
                  location:
                    latitude: 40.7128
                    longitude: -74.0060
                    maxDistance: 25.0
              advancedSearch:
                summary: Advanced search with preferences
                value:
                  startDate: "2025-11-14"
                  endDate: "2025-11-20"
                  duration: 4.0
                  requiredSkills:
                    - skillId: skill_hvac_repair
                      minimumProficiency: expert
                    - skillId: skill_electrical
                      minimumProficiency: intermediate
                  requiredCertifications:
                    - cert_epa_universal
                    - cert_osha_30
                  location:
                    latitude: 40.7128
                    longitude: -74.0060
                    maxDistance: 30.0
                  timePreferences:
                    preferredDays: [monday, tuesday, wednesday, thursday, friday]
                    preferredTimeRanges:
                      - startTime: "08:00"
                        endTime: "17:00"
                    allowWeekends: false
                    allowAfterHours: false
                  filters:
                    minRating: 4.5
                    maxHourlyRate: 90.00
                    minExperience: 5
                  sortBy: rating
                  limit: 10
      responses:
        '200':
          description: Availability search completed successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AvailabilitySearchResponse'
              examples:
                searchResults:
                  value:
                    searchId: search_123e4567-e89b-12d3-a456-426614174000
                    results:
                      - provider:
                          id: prov_123e4567
                          name: John Doe
                          email: john.doe@provider.com
                          phone: "+12025551234"
                          rating: 4.8
                          completionRate: 0.96
                          hourlyRate: 75.00
                          skills:
                            - name: HVAC Repair
                              proficiency: expert
                          certifications:
                            - name: EPA Universal
                              expiryDate: "2026-05-15"
                        availableSlots:
                          - slotId: slot_123e4567
                            startTime: "2025-11-14T09:00:00Z"
                            endTime: "2025-11-14T12:00:00Z"
                            duration: 3.0
                            isPreferred: true
                            cost:
                              base: 225.00
                              premiums:
                                weekend: 0.00
                                afterHours: 0.00
                                emergency: 0.00
                              total: 225.00
                          - slotId: slot_234e5678
                            startTime: "2025-11-15T13:00:00Z"
                            endTime: "2025-11-15T17:00:00Z"
                            duration: 4.0
                            isPreferred: true
                            cost:
                              base: 300.00
                              total: 300.00
                        matchScore: 0.95
                        distance: 12.5
                        estimatedTravelTime: 25
                        utilizationRate: 0.65
                    summary:
                      totalProviders: 8
                      totalSlots: 47
                      dateRange:
                        start: "2025-11-14"
                        end: "2025-11-20"
                    generatedAt: "2025-11-14T10:30:00Z"
        '400':
          description: Invalid search parameters
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              example:
                error:
                  code: INVALID_SEARCH_PARAMS
                  message: End date must be after start date
                  details:
                    field: endDate
        '422':
          description: Validation error
```

### cURL Examples

#### Basic Availability Search

```bash
curl -X POST "https://api.fsm-platform.com/v1/availability/search" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-11-14",
    "endDate": "2025-11-20",
    "duration": 2.5,
    "requiredSkills": [
      {
        "skillId": "skill_hvac_repair",
        "minimumProficiency": "advanced"
      }
    ],
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "maxDistance": 25.0
    }
  }'
```

#### Advanced Search with Filters

```bash
curl -X POST "https://api.fsm-platform.com/v1/availability/search" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-11-14",
    "endDate": "2025-11-20",
    "duration": 4.0,
    "requiredSkills": [
      {
        "skillId": "skill_hvac_repair",
        "minimumProficiency": "expert"
      }
    ],
    "requiredCertifications": ["cert_epa_universal"],
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "maxDistance": 30.0
    },
    "timePreferences": {
      "preferredDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
      "preferredTimeRanges": [
        {
          "startTime": "08:00",
          "endTime": "17:00"
        }
      ],
      "allowWeekends": false
    },
    "filters": {
      "minRating": 4.5,
      "maxHourlyRate": 90.00,
      "minExperience": 5
    },
    "sortBy": "rating",
    "limit": 10
  }'
```

---

## Schedule Management API

### Provider Schedule CRUD Operations

```yaml
components:
  schemas:
    Schedule:
      type: object
      properties:
        scheduleId:
          type: string
          format: uuid
        providerId:
          type: string
          format: uuid
        date:
          type: string
          format: date
        timeBlocks:
          type: array
          items:
            $ref: '#/components/schemas/TimeBlock'
        totalAvailableHours:
          type: number
          format: double
        scheduledHours:
          type: number
          format: double
        status:
          type: string
          enum: [draft, published, locked]
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    TimeBlock:
      type: object
      required:
        - startTime
        - endTime
        - type
      properties:
        blockId:
          type: string
          format: uuid
        startTime:
          type: string
          format: date-time
        endTime:
          type: string
          format: date-time
        type:
          type: string
          enum: [available, assigned, break, unavailable, blocked]
        assignmentId:
          type: string
          format: uuid
          description: Assignment ID if type is 'assigned'
        notes:
          type: string
          description: Optional notes

    CreateScheduleRequest:
      type: object
      required:
        - providerId
        - date
        - timeBlocks
      properties:
        providerId:
          type: string
          format: uuid
        date:
          type: string
          format: date
        timeBlocks:
          type: array
          items:
            type: object
            required:
              - startTime
              - endTime
              - type
            properties:
              startTime:
                type: string
                format: time
                example: "08:00"
              endTime:
                type: string
                format: time
                example: "12:00"
              type:
                type: string
                enum: [available, break, unavailable, blocked]
              notes:
                type: string

    BulkScheduleRequest:
      type: object
      required:
        - providerId
        - startDate
        - endDate
        - template
      properties:
        providerId:
          type: string
          format: uuid
        startDate:
          type: string
          format: date
        endDate:
          type: string
          format: date
        template:
          type: object
          description: Weekly template with time blocks per day
          properties:
            monday:
              type: array
              items:
                type: object
                properties:
                  startTime:
                    type: string
                  endTime:
                    type: string
                  type:
                    type: string
            tuesday:
              type: array
              items:
                type: object
            wednesday:
              type: array
              items:
                type: object
            thursday:
              type: array
              items:
                type: object
            friday:
              type: array
              items:
                type: object
            saturday:
              type: array
              items:
                type: object
            sunday:
              type: array
              items:
                type: object
        excludeDates:
          type: array
          items:
            type: string
            format: date
          description: Dates to exclude from bulk creation

paths:
  /schedules:
    post:
      summary: Create schedule
      description: Create a new schedule for a provider
      operationId: createSchedule
      tags:
        - Schedules
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateScheduleRequest'
      responses:
        '201':
          description: Schedule created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Schedule'

  /schedules/bulk:
    post:
      summary: Bulk create schedules
      description: Create schedules for multiple dates using a template
      operationId: bulkCreateSchedules
      tags:
        - Schedules
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BulkScheduleRequest'
            example:
              providerId: prov_123e4567
              startDate: "2025-11-14"
              endDate: "2025-12-14"
              template:
                monday:
                  - startTime: "08:00"
                    endTime: "12:00"
                    type: available
                  - startTime: "12:00"
                    endTime: "13:00"
                    type: break
                  - startTime: "13:00"
                    endTime: "17:00"
                    type: available
                tuesday:
                  - startTime: "08:00"
                    endTime: "17:00"
                    type: available
                wednesday:
                  - startTime: "08:00"
                    endTime: "17:00"
                    type: available
                thursday:
                  - startTime: "08:00"
                    endTime: "17:00"
                    type: available
                friday:
                  - startTime: "08:00"
                    endTime: "16:00"
                    type: available
                saturday: []
                sunday: []
              excludeDates:
                - "2025-11-28"
                - "2025-12-25"
      responses:
        '201':
          description: Schedules created successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  createdCount:
                    type: integer
                  schedules:
                    type: array
                    items:
                      $ref: '#/components/schemas/Schedule'

  /schedules/{id}:
    get:
      summary: Get schedule
      description: Retrieve schedule details
      operationId: getSchedule
      tags:
        - Schedules
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Schedule retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Schedule'
```

### cURL Examples

#### Create Single Schedule

```bash
curl -X POST "https://api.fsm-platform.com/v1/schedules" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "prov_123e4567",
    "date": "2025-11-14",
    "timeBlocks": [
      {
        "startTime": "08:00",
        "endTime": "12:00",
        "type": "available"
      },
      {
        "startTime": "12:00",
        "endTime": "13:00",
        "type": "break"
      },
      {
        "startTime": "13:00",
        "endTime": "17:00",
        "type": "available"
      }
    ]
  }'
```

#### Bulk Create Schedules

```bash
curl -X POST "https://api.fsm-platform.com/v1/schedules/bulk" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "prov_123e4567",
    "startDate": "2025-11-14",
    "endDate": "2025-12-14",
    "template": {
      "monday": [
        {"startTime": "08:00", "endTime": "17:00", "type": "available"}
      ],
      "tuesday": [
        {"startTime": "08:00", "endTime": "17:00", "type": "available"}
      ],
      "wednesday": [
        {"startTime": "08:00", "endTime": "17:00", "type": "available"}
      ],
      "thursday": [
        {"startTime": "08:00", "endTime": "17:00", "type": "available"}
      ],
      "friday": [
        {"startTime": "08:00", "endTime": "16:00", "type": "available"}
      ],
      "saturday": [],
      "sunday": []
    },
    "excludeDates": ["2025-11-28", "2025-12-25"]
  }'
```

---

## Conflict Detection API

```yaml
paths:
  /schedules/conflicts:
    post:
      summary: Detect schedule conflicts
      description: Check for scheduling conflicts before creating assignment
      operationId: detectConflicts
      tags:
        - Schedules
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - providerId
                - startTime
                - endTime
              properties:
                providerId:
                  type: string
                  format: uuid
                startTime:
                  type: string
                  format: date-time
                endTime:
                  type: string
                  format: date-time
                includeTravel:
                  type: boolean
                  default: true
                  description: Include travel time in conflict check
      responses:
        '200':
          description: Conflict check completed
          content:
            application/json:
              schema:
                type: object
                properties:
                  hasConflicts:
                    type: boolean
                  conflicts:
                    type: array
                    items:
                      type: object
                      properties:
                        type:
                          type: string
                          enum: [assignment, unavailable, break, travel]
                        startTime:
                          type: string
                          format: date-time
                        endTime:
                          type: string
                          format: date-time
                        assignmentId:
                          type: string
                        description:
                          type: string
```

### cURL Example

```bash
curl -X POST "https://api.fsm-platform.com/v1/schedules/conflicts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "prov_123e4567",
    "startTime": "2025-11-14T09:00:00Z",
    "endTime": "2025-11-14T12:00:00Z",
    "includeTravel": true
  }'
```

---

## Contact & Support

- API Documentation: https://docs.fsm-platform.com/api/scheduling
- Developer Portal: https://developers.fsm-platform.com
- Support: api-support@fsm-platform.com
