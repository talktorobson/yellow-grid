# Assignment & Dispatch API

## Overview

This document provides complete OpenAPI 3.1 specifications for Assignment and Dispatch Management endpoints. These APIs enable work order assignment creation, provider offers, acceptance/rejection workflows, and funnel transparency tracking.

## Table of Contents

1. [Assignment API](#assignment-api)
2. [Provider Offers API](#provider-offers-api)
3. [Assignment Workflow API](#assignment-workflow-api)
4. [Funnel Transparency API](#funnel-transparency-api)
5. [Real-Time Dispatch API](#real-time-dispatch-api)

---

## Assignment API

### Complete Assignment Management

```yaml
openapi: 3.1.0
info:
  title: Assignment & Dispatch API
  version: 1.0.0
  description: Assignment creation, dispatch, and tracking APIs

servers:
  - url: https://api.fsm-platform.com/v1

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Assignment:
      type: object
      required:
        - id
        - workOrderId
        - status
        - scheduledStartTime
        - estimatedDuration
      properties:
        id:
          type: string
          format: uuid
          description: Unique assignment identifier
          example: assign_123e4567-e89b-12d3-a456-426614174000
        workOrderId:
          type: string
          format: uuid
          description: Associated work order ID
          example: wo_123e4567-e89b-12d3-a456-426614174000
        providerId:
          type: string
          format: uuid
          description: Assigned provider ID (null if unassigned)
          example: prov_123e4567-e89b-12d3-a456-426614174000
        status:
          type: string
          enum: [
            created,
            offered,
            accepted,
            rejected,
            assigned,
            en_route,
            in_progress,
            completed,
            cancelled
          ]
          description: Current assignment status
          example: assigned
        priority:
          type: string
          enum: [low, normal, high, urgent, emergency]
          default: normal
          description: Assignment priority level
          example: high
        scheduledStartTime:
          type: string
          format: date-time
          description: Scheduled start time
          example: "2025-11-14T09:00:00Z"
        scheduledEndTime:
          type: string
          format: date-time
          description: Scheduled end time
          example: "2025-11-14T12:00:00Z"
        estimatedDuration:
          type: number
          format: double
          description: Estimated duration in hours
          example: 3.0
        actualStartTime:
          type: string
          format: date-time
          description: Actual start time (when work began)
        actualEndTime:
          type: string
          format: date-time
          description: Actual end time (when work completed)
        location:
          $ref: '#/components/schemas/ServiceLocation'
        requiredSkills:
          type: array
          items:
            type: object
            properties:
              skillId:
                type: string
              name:
                type: string
              minimumProficiency:
                type: string
                enum: [beginner, intermediate, advanced, expert]
        requiredCertifications:
          type: array
          items:
            type: string
          description: Required certification IDs
        instructions:
          type: string
          description: Special instructions for provider
          example: Customer prefers morning appointments. Use side entrance.
        customerInfo:
          $ref: '#/components/schemas/CustomerInfo'
        costs:
          $ref: '#/components/schemas/AssignmentCosts'
        timeline:
          type: array
          items:
            $ref: '#/components/schemas/TimelineEvent'
          description: Assignment status change history
        metadata:
          type: object
          additionalProperties: true
          description: Custom metadata
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
        createdBy:
          type: string
          format: uuid
          description: User who created assignment

    ServiceLocation:
      type: object
      required:
        - address
        - coordinates
      properties:
        address:
          type: object
          properties:
            street1:
              type: string
              example: 456 Service St
            street2:
              type: string
            city:
              type: string
              example: New York
            state:
              type: string
              example: NY
            zipCode:
              type: string
              example: "10001"
            country:
              type: string
              default: US
        coordinates:
          type: object
          required:
            - latitude
            - longitude
          properties:
            latitude:
              type: number
              format: double
              example: 40.7128
            longitude:
              type: number
              format: double
              example: -74.0060
        accessInstructions:
          type: string
          description: Instructions for accessing location
          example: Ring buzzer #4B. Building code is 1234.
        parkingInfo:
          type: string
          description: Parking instructions
          example: Street parking available on north side.

    CustomerInfo:
      type: object
      properties:
        customerId:
          type: string
          format: uuid
        name:
          type: string
          example: Jane Customer
        email:
          type: string
          format: email
          example: jane@customer.com
        phone:
          type: string
          example: "+12025555678"
        preferredContactMethod:
          type: string
          enum: [phone, email, sms]
          example: phone
        specialNotes:
          type: string
          description: Special customer notes

    AssignmentCosts:
      type: object
      properties:
        baseRate:
          type: number
          format: decimal
          description: Base hourly rate
          example: 75.00
        estimatedLabor:
          type: number
          format: decimal
          description: Estimated labor cost
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
              example: 50.00
            holiday:
              type: number
              format: decimal
              example: 0.00
        travelCost:
          type: number
          format: decimal
          description: Estimated travel cost
          example: 25.00
        total:
          type: number
          format: decimal
          description: Total estimated cost
          example: 300.00
        actualCost:
          type: number
          format: decimal
          description: Actual cost (after completion)

    TimelineEvent:
      type: object
      properties:
        timestamp:
          type: string
          format: date-time
        event:
          type: string
          enum: [
            created,
            offered,
            accepted,
            rejected,
            assigned,
            en_route,
            arrived,
            started,
            paused,
            resumed,
            completed,
            cancelled
          ]
        actor:
          type: object
          properties:
            id:
              type: string
            type:
              type: string
              enum: [system, user, provider]
            name:
              type: string
        notes:
          type: string
        metadata:
          type: object

    CreateAssignmentRequest:
      type: object
      required:
        - workOrderId
        - scheduledStartTime
        - estimatedDuration
        - location
      properties:
        workOrderId:
          type: string
          format: uuid
        providerId:
          type: string
          format: uuid
          description: Optional direct assignment to provider
        scheduledStartTime:
          type: string
          format: date-time
        estimatedDuration:
          type: number
          format: double
          minimum: 0.25
        priority:
          type: string
          enum: [low, normal, high, urgent, emergency]
          default: normal
        requiredSkills:
          type: array
          items:
            type: object
            required:
              - skillId
            properties:
              skillId:
                type: string
              minimumProficiency:
                type: string
                enum: [beginner, intermediate, advanced, expert]
        requiredCertifications:
          type: array
          items:
            type: string
        location:
          $ref: '#/components/schemas/ServiceLocation'
        instructions:
          type: string
        customerInfo:
          $ref: '#/components/schemas/CustomerInfo'
        autoOffer:
          type: boolean
          default: false
          description: Automatically create offers for qualified providers
        metadata:
          type: object

    UpdateAssignmentRequest:
      type: object
      properties:
        scheduledStartTime:
          type: string
          format: date-time
        estimatedDuration:
          type: number
          format: double
        priority:
          type: string
          enum: [low, normal, high, urgent, emergency]
        instructions:
          type: string
        metadata:
          type: object

    AssignmentListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/Assignment'
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

paths:
  /assignments:
    get:
      summary: List assignments
      description: Retrieve paginated list of assignments with filtering
      operationId: listAssignments
      tags:
        - Assignments
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
            enum: [created, offered, accepted, rejected, assigned, en_route, in_progress, completed, cancelled]
          description: Filter by status
        - name: providerId
          in: query
          schema:
            type: string
            format: uuid
          description: Filter by provider ID
        - name: priority
          in: query
          schema:
            type: string
            enum: [low, normal, high, urgent, emergency]
          description: Filter by priority
        - name: startDate
          in: query
          schema:
            type: string
            format: date
          description: Filter by scheduled start date (from)
        - name: endDate
          in: query
          schema:
            type: string
            format: date
          description: Filter by scheduled start date (to)
        - name: sortBy
          in: query
          schema:
            type: string
            enum: [scheduledStartTime, priority, createdAt, status]
            default: scheduledStartTime
        - name: order
          in: query
          schema:
            type: string
            enum: [asc, desc]
            default: asc
      responses:
        '200':
          description: Assignments retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AssignmentListResponse'
              example:
                data:
                  - id: assign_123e4567
                    workOrderId: wo_123e4567
                    providerId: prov_123e4567
                    status: assigned
                    priority: high
                    scheduledStartTime: "2025-11-14T09:00:00Z"
                    scheduledEndTime: "2025-11-14T12:00:00Z"
                    estimatedDuration: 3.0
                    location:
                      address:
                        street1: 456 Service St
                        city: New York
                        state: NY
                        zipCode: "10001"
                      coordinates:
                        latitude: 40.7128
                        longitude: -74.0060
                    costs:
                      baseRate: 75.00
                      estimatedLabor: 225.00
                      premiums:
                        emergency: 50.00
                      travelCost: 25.00
                      total: 300.00
                pagination:
                  nextCursor: eyJpZCI6ImFzc2lnbl8xMjNlNDU2NyJ9
                  hasMore: true
                  totalCount: 87
                  limit: 20

    post:
      summary: Create assignment
      description: Create a new service assignment
      operationId: createAssignment
      tags:
        - Assignments
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateAssignmentRequest'
            examples:
              basicAssignment:
                summary: Basic assignment creation
                value:
                  workOrderId: wo_123e4567
                  scheduledStartTime: "2025-11-14T09:00:00Z"
                  estimatedDuration: 3.0
                  priority: normal
                  location:
                    address:
                      street1: 456 Service St
                      city: New York
                      state: NY
                      zipCode: "10001"
                    coordinates:
                      latitude: 40.7128
                      longitude: -74.0060
                  requiredSkills:
                    - skillId: skill_hvac_repair
                      minimumProficiency: advanced
                  customerInfo:
                    name: Jane Customer
                    email: jane@customer.com
                    phone: "+12025555678"
                    preferredContactMethod: phone
              directAssignment:
                summary: Direct provider assignment
                value:
                  workOrderId: wo_123e4567
                  providerId: prov_123e4567
                  scheduledStartTime: "2025-11-14T09:00:00Z"
                  estimatedDuration: 2.5
                  priority: high
                  location:
                    address:
                      street1: 456 Service St
                      city: New York
                      state: NY
                      zipCode: "10001"
                    coordinates:
                      latitude: 40.7128
                      longitude: -74.0060
                  instructions: Customer prefers morning appointments
              autoOfferAssignment:
                summary: Assignment with auto-offer
                value:
                  workOrderId: wo_123e4567
                  scheduledStartTime: "2025-11-14T09:00:00Z"
                  estimatedDuration: 4.0
                  priority: urgent
                  location:
                    address:
                      street1: 456 Service St
                      city: New York
                      state: NY
                      zipCode: "10001"
                    coordinates:
                      latitude: 40.7128
                      longitude: -74.0060
                  requiredSkills:
                    - skillId: skill_hvac_repair
                      minimumProficiency: expert
                  requiredCertifications:
                    - cert_epa_universal
                  autoOffer: true
      responses:
        '201':
          description: Assignment created successfully
          headers:
            Location:
              schema:
                type: string
              description: URL of created assignment
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Assignment'
        '422':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /assignments/{id}:
    get:
      summary: Get assignment
      description: Retrieve detailed assignment information
      operationId: getAssignment
      tags:
        - Assignments
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
          example: provider,workOrder,timeline
      responses:
        '200':
          description: Assignment retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Assignment'
        '404':
          description: Assignment not found

    patch:
      summary: Update assignment
      description: Partially update assignment information
      operationId: updateAssignment
      tags:
        - Assignments
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
              $ref: '#/components/schemas/UpdateAssignmentRequest'
      responses:
        '200':
          description: Assignment updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Assignment'
        '404':
          description: Assignment not found
        '422':
          description: Validation error

    delete:
      summary: Cancel assignment
      description: Cancel an assignment
      operationId: cancelAssignment
      tags:
        - Assignments
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
                  description: Cancellation reason
                notifyProvider:
                  type: boolean
                  default: true
                  description: Send notification to provider
      responses:
        '200':
          description: Assignment cancelled successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Assignment'
```

### cURL Examples

#### List Assignments

```bash
curl -X GET "https://api.fsm-platform.com/v1/assignments?status=assigned&priority=high&startDate=2025-11-14&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Accept: application/json"
```

#### Create Assignment

```bash
curl -X POST "https://api.fsm-platform.com/v1/assignments" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workOrderId": "wo_123e4567",
    "scheduledStartTime": "2025-11-14T09:00:00Z",
    "estimatedDuration": 3.0,
    "priority": "high",
    "location": {
      "address": {
        "street1": "456 Service St",
        "city": "New York",
        "state": "NY",
        "zipCode": "10001"
      },
      "coordinates": {
        "latitude": 40.7128,
        "longitude": -74.0060
      }
    },
    "requiredSkills": [
      {
        "skillId": "skill_hvac_repair",
        "minimumProficiency": "advanced"
      }
    ],
    "customerInfo": {
      "name": "Jane Customer",
      "email": "jane@customer.com",
      "phone": "+12025555678",
      "preferredContactMethod": "phone"
    }
  }'
```

---

## Provider Offers API

### Assignment Offer Management

```yaml
components:
  schemas:
    Offer:
      type: object
      properties:
        offerId:
          type: string
          format: uuid
          example: offer_123e4567-e89b-12d3-a456-426614174000
        assignmentId:
          type: string
          format: uuid
        providerId:
          type: string
          format: uuid
        status:
          type: string
          enum: [pending, accepted, rejected, expired, cancelled]
          example: pending
        offeredAt:
          type: string
          format: date-time
        expiresAt:
          type: string
          format: date-time
          description: Offer expiration time
        respondedAt:
          type: string
          format: date-time
          description: When provider responded
        assignmentSummary:
          type: object
          properties:
            scheduledStartTime:
              type: string
              format: date-time
            estimatedDuration:
              type: number
            location:
              $ref: '#/components/schemas/ServiceLocation'
            estimatedCost:
              type: number
              format: decimal
        response:
          type: object
          properties:
            accepted:
              type: boolean
            reason:
              type: string
            notes:
              type: string

    CreateOffersRequest:
      type: object
      required:
        - assignmentId
        - providerIds
      properties:
        assignmentId:
          type: string
          format: uuid
        providerIds:
          type: array
          items:
            type: string
            format: uuid
          minItems: 1
          maxItems: 50
          description: Provider IDs to send offers to
        expiresInMinutes:
          type: integer
          minimum: 5
          maximum: 1440
          default: 60
          description: Offer expiration time in minutes
        priority:
          type: string
          enum: [low, normal, high]
          default: normal

paths:
  /offers:
    post:
      summary: Create offers
      description: Send assignment offers to multiple providers
      operationId: createOffers
      tags:
        - Offers
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOffersRequest'
            example:
              assignmentId: assign_123e4567
              providerIds:
                - prov_123e4567
                - prov_234e5678
                - prov_345e6789
              expiresInMinutes: 30
              priority: high
      responses:
        '201':
          description: Offers created successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  offersCreated:
                    type: integer
                    example: 3
                  offers:
                    type: array
                    items:
                      $ref: '#/components/schemas/Offer'

  /offers/{id}/accept:
    post:
      summary: Accept offer
      description: Provider accepts an assignment offer
      operationId: acceptOffer
      tags:
        - Offers
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
        content:
          application/json:
            schema:
              type: object
              properties:
                notes:
                  type: string
                  description: Optional notes from provider
      responses:
        '200':
          description: Offer accepted successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Offer'
        '409':
          description: Offer already accepted by another provider

  /offers/{id}/reject:
    post:
      summary: Reject offer
      description: Provider rejects an assignment offer
      operationId: rejectOffer
      tags:
        - Offers
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
                  enum: [
                    unavailable,
                    too_far,
                    lacks_skills,
                    rate_too_low,
                    other
                  ]
                notes:
                  type: string
      responses:
        '200':
          description: Offer rejected successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Offer'
```

### cURL Examples

#### Create Offers

```bash
curl -X POST "https://api.fsm-platform.com/v1/offers" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assignmentId": "assign_123e4567",
    "providerIds": [
      "prov_123e4567",
      "prov_234e5678",
      "prov_345e6789"
    ],
    "expiresInMinutes": 30,
    "priority": "high"
  }'
```

#### Accept Offer

```bash
curl -X POST "https://api.fsm-platform.com/v1/offers/offer_123e4567/accept" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "I can arrive 15 minutes early if needed."
  }'
```

#### Reject Offer

```bash
curl -X POST "https://api.fsm-platform.com/v1/offers/offer_123e4567/reject" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "unavailable",
    "notes": "Already have another appointment at that time."
  }'
```

---

## Funnel Transparency API

### Assignment Funnel Tracking

```yaml
paths:
  /assignments/{id}/funnel:
    get:
      summary: Get assignment funnel
      description: Track assignment progress through offer/acceptance funnel
      operationId: getAssignmentFunnel
      tags:
        - Assignments
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
          description: Funnel data retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  assignmentId:
                    type: string
                  status:
                    type: string
                  funnel:
                    type: object
                    properties:
                      created:
                        type: object
                        properties:
                          timestamp:
                            type: string
                            format: date-time
                          actor:
                            type: string
                      offersCreated:
                        type: object
                        properties:
                          count:
                            type: integer
                          timestamp:
                            type: string
                            format: date-time
                          providers:
                            type: array
                            items:
                              type: object
                      responses:
                        type: object
                        properties:
                          accepted:
                            type: integer
                          rejected:
                            type: integer
                          pending:
                            type: integer
                          expired:
                            type: integer
                      assigned:
                        type: object
                        properties:
                          timestamp:
                            type: string
                            format: date-time
                          providerId:
                            type: string
                  timeline:
                    type: array
                    items:
                      type: object
              example:
                assignmentId: assign_123e4567
                status: assigned
                funnel:
                  created:
                    timestamp: "2025-11-14T08:00:00Z"
                    actor: user_dispatcher_001
                  offersCreated:
                    count: 5
                    timestamp: "2025-11-14T08:05:00Z"
                    providers:
                      - prov_123e4567
                      - prov_234e5678
                  responses:
                    accepted: 2
                    rejected: 2
                    pending: 0
                    expired: 1
                  assigned:
                    timestamp: "2025-11-14T08:15:00Z"
                    providerId: prov_123e4567
```

### cURL Example

```bash
curl -X GET "https://api.fsm-platform.com/v1/assignments/assign_123e4567/funnel" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Contact & Support

- API Documentation: https://docs.fsm-platform.com/api/assignments
- Developer Portal: https://developers.fsm-platform.com
- Support: api-support@fsm-platform.com
