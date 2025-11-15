# Provider & Capacity Management API

## Overview

This document provides complete OpenAPI 3.1 specifications for Provider and Capacity Management endpoints. These APIs enable management of field service providers, their skills, certifications, availability, and capacity constraints.

## Table of Contents

1. [Provider API](#provider-api)
2. [Skills & Certifications API](#skills--certifications-api)
3. [Capacity Management API](#capacity-management-api)
4. [Availability API](#availability-api)
5. [Territory Management API](#territory-management-api)

---

## Provider API

### Endpoints Overview

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /v1/providers | List all providers | providers:read |
| POST | /v1/providers | Create new provider | providers:write |
| GET | /v1/providers/{id} | Get provider details | providers:read |
| PATCH | /v1/providers/{id} | Update provider | providers:write |
| DELETE | /v1/providers/{id} | Delete provider | providers:delete |
| GET | /v1/providers/{id}/stats | Get provider statistics | providers:read |
| POST | /v1/providers/{id}/suspend | Suspend provider | providers:manage |
| POST | /v1/providers/{id}/reactivate | Reactivate provider | providers:manage |

### OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: Provider Management API
  version: 1.0.0

servers:
  - url: https://api.fsm-platform.com/v1

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Provider:
      type: object
      required:
        - id
        - firstName
        - lastName
        - email
        - status
      properties:
        id:
          type: string
          format: uuid
          description: Unique provider identifier
          example: prov_123e4567-e89b-12d3-a456-426614174000
        firstName:
          type: string
          minLength: 1
          maxLength: 100
          description: Provider first name
          example: John
        lastName:
          type: string
          minLength: 1
          maxLength: 100
          description: Provider last name
          example: Doe
        email:
          type: string
          format: email
          description: Provider email address
          example: john.doe@provider.com
        phone:
          type: string
          pattern: '^\+?[1-9]\d{1,14}$'
          description: Provider phone number (E.164 format)
          example: "+12025551234"
        status:
          type: string
          enum: [active, inactive, suspended, pending]
          description: Current provider status
          example: active
        employmentType:
          type: string
          enum: [W2, 1099, contractor, employee]
          description: Employment classification
          example: contractor
        skills:
          type: array
          items:
            $ref: '#/components/schemas/Skill'
          description: Provider skills and proficiency levels
        certifications:
          type: array
          items:
            $ref: '#/components/schemas/Certification'
          description: Provider certifications
        address:
          $ref: '#/components/schemas/Address'
        homeLocation:
          $ref: '#/components/schemas/GeoLocation'
        territories:
          type: array
          items:
            type: string
            format: uuid
          description: Assigned territory IDs
          example: [terr_123e4567, terr_987e6543]
        hourlyRate:
          type: number
          format: decimal
          minimum: 0
          description: Hourly rate in USD
          example: 75.00
        maxWeeklyHours:
          type: integer
          minimum: 0
          maximum: 168
          description: Maximum weekly hours
          example: 40
        preferences:
          $ref: '#/components/schemas/ProviderPreferences'
        metadata:
          type: object
          additionalProperties: true
          description: Custom metadata
        createdAt:
          type: string
          format: date-time
          description: Creation timestamp
          example: "2025-11-14T10:30:00Z"
        updatedAt:
          type: string
          format: date-time
          description: Last update timestamp
          example: "2025-11-14T15:45:00Z"

    Skill:
      type: object
      required:
        - skillId
        - name
        - proficiency
      properties:
        skillId:
          type: string
          format: uuid
          description: Skill identifier
          example: skill_hvac_repair
        name:
          type: string
          description: Skill name
          example: HVAC Repair
        category:
          type: string
          description: Skill category
          example: Technical
        proficiency:
          type: string
          enum: [beginner, intermediate, advanced, expert]
          description: Proficiency level
          example: expert
        yearsExperience:
          type: integer
          minimum: 0
          description: Years of experience
          example: 8
        verified:
          type: boolean
          description: Whether skill is verified
          example: true
        verifiedAt:
          type: string
          format: date-time
          description: Verification timestamp

    Certification:
      type: object
      required:
        - certificationId
        - name
        - issuedBy
        - issuedDate
      properties:
        certificationId:
          type: string
          format: uuid
          description: Certification identifier
          example: cert_123e4567
        name:
          type: string
          description: Certification name
          example: EPA Universal Certification
        issuedBy:
          type: string
          description: Issuing organization
          example: Environmental Protection Agency
        certificationNumber:
          type: string
          description: Certificate number
          example: EPA-12345678
        issuedDate:
          type: string
          format: date
          description: Issue date
          example: "2020-05-15"
        expiryDate:
          type: string
          format: date
          description: Expiration date
          example: "2025-05-15"
        documentUrl:
          type: string
          format: uri
          description: Certificate document URL
          example: https://storage.fsm-platform.com/certs/cert_123.pdf
        verified:
          type: boolean
          description: Whether certification is verified
          example: true

    Address:
      type: object
      properties:
        street1:
          type: string
          example: 123 Main St
        street2:
          type: string
          example: Apt 4B
        city:
          type: string
          example: New York
        state:
          type: string
          pattern: '^[A-Z]{2}$'
          example: NY
        zipCode:
          type: string
          pattern: '^\d{5}(-\d{4})?$'
          example: "10001"
        country:
          type: string
          pattern: '^[A-Z]{2}$'
          default: US
          example: US

    GeoLocation:
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
          description: Latitude coordinate
          example: 40.7128
        longitude:
          type: number
          format: double
          minimum: -180
          maximum: 180
          description: Longitude coordinate
          example: -74.0060
        accuracy:
          type: number
          format: double
          description: Location accuracy in meters
          example: 10.5

    ProviderPreferences:
      type: object
      properties:
        preferredWorkDays:
          type: array
          items:
            type: string
            enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
          description: Preferred work days
          example: [monday, tuesday, wednesday, thursday, friday]
        preferredStartTime:
          type: string
          pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
          description: Preferred start time (24h format)
          example: "08:00"
        preferredEndTime:
          type: string
          pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
          description: Preferred end time (24h format)
          example: "17:00"
        maxDailyAssignments:
          type: integer
          minimum: 1
          description: Maximum daily assignments
          example: 6
        maxTravelDistance:
          type: number
          format: double
          description: Maximum travel distance in miles
          example: 50.0
        acceptsEmergency:
          type: boolean
          description: Accepts emergency assignments
          example: true
        acceptsWeekends:
          type: boolean
          description: Accepts weekend assignments
          example: false
        notificationPreferences:
          type: object
          properties:
            email:
              type: boolean
              example: true
            sms:
              type: boolean
              example: true
            push:
              type: boolean
              example: true

    CreateProviderRequest:
      type: object
      required:
        - firstName
        - lastName
        - email
        - phone
        - employmentType
      properties:
        firstName:
          type: string
          minLength: 1
          maxLength: 100
        lastName:
          type: string
          minLength: 1
          maxLength: 100
        email:
          type: string
          format: email
        phone:
          type: string
          pattern: '^\+?[1-9]\d{1,14}$'
        employmentType:
          type: string
          enum: [W2, 1099, contractor, employee]
        address:
          $ref: '#/components/schemas/Address'
        homeLocation:
          $ref: '#/components/schemas/GeoLocation'
        hourlyRate:
          type: number
          format: decimal
          minimum: 0
        maxWeeklyHours:
          type: integer
          minimum: 0
          maximum: 168
        territories:
          type: array
          items:
            type: string
            format: uuid
        skills:
          type: array
          items:
            type: object
            required:
              - skillId
              - proficiency
            properties:
              skillId:
                type: string
              proficiency:
                type: string
                enum: [beginner, intermediate, advanced, expert]
        preferences:
          $ref: '#/components/schemas/ProviderPreferences'

    UpdateProviderRequest:
      type: object
      properties:
        firstName:
          type: string
          minLength: 1
          maxLength: 100
        lastName:
          type: string
          minLength: 1
          maxLength: 100
        email:
          type: string
          format: email
        phone:
          type: string
          pattern: '^\+?[1-9]\d{1,14}$'
        status:
          type: string
          enum: [active, inactive]
        address:
          $ref: '#/components/schemas/Address'
        hourlyRate:
          type: number
          format: decimal
          minimum: 0
        maxWeeklyHours:
          type: integer
          minimum: 0
          maximum: 168
        preferences:
          $ref: '#/components/schemas/ProviderPreferences'

    ProviderStats:
      type: object
      properties:
        providerId:
          type: string
          format: uuid
        totalAssignments:
          type: integer
          description: Total completed assignments
          example: 247
        completionRate:
          type: number
          format: double
          description: Assignment completion rate (0-1)
          example: 0.96
        averageRating:
          type: number
          format: double
          minimum: 0
          maximum: 5
          description: Average customer rating
          example: 4.8
        onTimeRate:
          type: number
          format: double
          description: On-time arrival rate (0-1)
          example: 0.94
        hoursWorked:
          type: object
          properties:
            thisWeek:
              type: number
              example: 32.5
            thisMonth:
              type: number
              example: 145.0
            thisYear:
              type: number
              example: 1840.0
        revenue:
          type: object
          properties:
            thisWeek:
              type: number
              example: 2437.50
            thisMonth:
              type: number
              example: 10875.00
            thisYear:
              type: number
              example: 138000.00
        upcomingAssignments:
          type: integer
          description: Number of upcoming assignments
          example: 8

paths:
  /providers:
    get:
      summary: List providers
      description: Retrieve paginated list of providers with filtering
      operationId: listProviders
      tags:
        - Providers
      security:
        - bearerAuth: []
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: cursor
          in: query
          schema:
            type: string
        - name: status
          in: query
          schema:
            type: string
            enum: [active, inactive, suspended, pending]
        - name: skill
          in: query
          schema:
            type: string
          description: Filter by skill ID
        - name: territory
          in: query
          schema:
            type: string
          description: Filter by territory ID
        - name: search
          in: query
          schema:
            type: string
          description: Search by name, email, or phone
      responses:
        '200':
          description: Providers retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Provider'
                  pagination:
                    type: object
                    properties:
                      nextCursor:
                        type: string
                      hasMore:
                        type: boolean
                      totalCount:
                        type: integer
                      limit:
                        type: integer

    post:
      summary: Create provider
      description: Create a new field service provider
      operationId: createProvider
      tags:
        - Providers
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateProviderRequest'
      responses:
        '201':
          description: Provider created successfully
          headers:
            Location:
              schema:
                type: string
              description: URL of created provider
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Provider'
        '422':
          description: Validation error

  /providers/{id}:
    get:
      summary: Get provider
      description: Retrieve detailed provider information
      operationId: getProvider
      tags:
        - Providers
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: expand
          in: query
          schema:
            type: string
          description: Comma-separated relationships to expand
          example: skills,certifications,stats
      responses:
        '200':
          description: Provider retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Provider'
        '404':
          description: Provider not found

    patch:
      summary: Update provider
      description: Partially update provider information
      operationId: updateProvider
      tags:
        - Providers
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateProviderRequest'
      responses:
        '200':
          description: Provider updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Provider'
        '404':
          description: Provider not found
        '422':
          description: Validation error

    delete:
      summary: Delete provider
      description: Soft delete a provider (marks as inactive)
      operationId: deleteProvider
      tags:
        - Providers
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
        '204':
          description: Provider deleted successfully
        '404':
          description: Provider not found

  /providers/{id}/stats:
    get:
      summary: Get provider statistics
      description: Retrieve provider performance statistics
      operationId: getProviderStats
      tags:
        - Providers
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
          description: Statistics retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProviderStats'

  /providers/{id}/suspend:
    post:
      summary: Suspend provider
      description: Suspend a provider account
      operationId: suspendProvider
      tags:
        - Providers
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - reason
              properties:
                reason:
                  type: string
                  minLength: 10
                  description: Suspension reason
                notes:
                  type: string
                  description: Additional notes
      responses:
        '200':
          description: Provider suspended successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Provider'
```

### cURL Examples

#### List Providers

```bash
curl -X GET "https://api.fsm-platform.com/v1/providers?status=active&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Accept: application/json"
```

#### Create Provider

```bash
curl -X POST "https://api.fsm-platform.com/v1/providers" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@provider.com",
    "phone": "+12025551234",
    "employmentType": "contractor",
    "address": {
      "street1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "US"
    },
    "homeLocation": {
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "hourlyRate": 75.00,
    "maxWeeklyHours": 40,
    "skills": [
      {
        "skillId": "skill_hvac_repair",
        "proficiency": "expert"
      }
    ]
  }'
```

#### Get Provider with Expanded Data

```bash
curl -X GET "https://api.fsm-platform.com/v1/providers/prov_123e4567?expand=skills,certifications,stats" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Accept: application/json"
```

#### Update Provider

```bash
curl -X PATCH "https://api.fsm-platform.com/v1/providers/prov_123e4567" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "hourlyRate": 80.00,
    "maxWeeklyHours": 45,
    "preferences": {
      "maxDailyAssignments": 8,
      "acceptsEmergency": true
    }
  }'
```

#### Suspend Provider

```bash
curl -X POST "https://api.fsm-platform.com/v1/providers/prov_123e4567/suspend" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Multiple customer complaints regarding professionalism",
    "notes": "Pending investigation by HR department"
  }'
```

---

## Capacity Management API

### Real-Time Capacity Tracking

```yaml
components:
  schemas:
    ProviderCapacity:
      type: object
      properties:
        providerId:
          type: string
          format: uuid
        date:
          type: string
          format: date
        totalHours:
          type: number
          description: Total available hours for the day
          example: 8.0
        scheduledHours:
          type: number
          description: Hours already scheduled
          example: 5.5
        availableHours:
          type: number
          description: Remaining available hours
          example: 2.5
        assignments:
          type: array
          items:
            type: object
            properties:
              assignmentId:
                type: string
              startTime:
                type: string
                format: date-time
              endTime:
                type: string
                format: date-time
              duration:
                type: number
        utilizationRate:
          type: number
          format: double
          description: Utilization rate (0-1)
          example: 0.6875

paths:
  /providers/{id}/capacity:
    get:
      summary: Get provider capacity
      description: Retrieve provider capacity for date range
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - name: startDate
          in: query
          required: true
          schema:
            type: string
            format: date
        - name: endDate
          in: query
          required: true
          schema:
            type: string
            format: date
      responses:
        '200':
          description: Capacity data retrieved
          content:
            application/json:
              schema:
                type: object
                properties:
                  providerId:
                    type: string
                  dateRange:
                    type: object
                    properties:
                      start:
                        type: string
                        format: date
                      end:
                        type: string
                        format: date
                  dailyCapacity:
                    type: array
                    items:
                      $ref: '#/components/schemas/ProviderCapacity'
```

### cURL Example

```bash
curl -X GET "https://api.fsm-platform.com/v1/providers/prov_123e4567/capacity?startDate=2025-11-14&endDate=2025-11-20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Contact & Support

- API Documentation: https://docs.fsm-platform.com/api/providers
- Developer Portal: https://developers.fsm-platform.com
- Support: api-support@fsm-platform.com
