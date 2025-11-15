# API Design Principles

## Purpose

Defines the REST API design standards, conventions, and best practices for the AHS Field Service Execution Platform.

## Core Principles

### 1. RESTful Design

Follow REST architectural constraints:
- **Stateless**: Each request contains all information needed
- **Resource-based**: URLs represent resources, not actions
- **HTTP methods**: Use appropriate verbs (GET, POST, PUT, PATCH, DELETE)
- **HATEOAS**: Include links to related resources (optional, use judiciously)

### 2. API-First Development

- **OpenAPI specification first**: Write spec before implementation
- **Contract testing**: Validate implementation against spec
- **Documentation auto-generated**: From OpenAPI spec
- **Client SDK generation**: Auto-generate TypeScript/Java clients

### 3. Consistency

- **Uniform naming**: camelCase for JSON, kebab-case for URLs
- **Standard error format**: Consistent across all endpoints
- **Pagination pattern**: Same approach for all list endpoints
- **Versioning strategy**: URL-based (`/api/v1/...`)

## URL Structure

### Base URL

```
https://api.ahs-fsm.{environment}.com
```

Environments:
- `dev` - Development
- `staging` - Staging  
- `prod` - Production (or omit environment: `api.ahs-fsm.com`)

### Resource Paths

```
/api/{version}/{resource}
/api/{version}/{resource}/{id}
/api/{version}/{resource}/{id}/{sub-resource}
```

Examples:
```
GET    /api/v1/providers
GET    /api/v1/providers/123e4567-e89b-12d3-a456-426614174000
GET    /api/v1/providers/123.../teams
POST   /api/v1/providers/123.../teams
GET    /api/v1/service-orders
GET    /api/v1/service-orders/456.../dependencies
```

### Naming Conventions

- **Plural nouns**: `/providers` not `/provider`
- **Kebab-case**: `/service-orders` not `/serviceOrders` or `/service_orders`
- **No trailing slashes**: `/providers` not `/providers/`
- **No verbs**: `/providers/123/activate` ❌ → `PATCH /providers/123 {status: 'active'}` ✅

## HTTP Methods

| Method | Usage | Idempotent | Safe |
|--------|-------|------------|------|
| **GET** | Retrieve resource(s) | Yes | Yes |
| **POST** | Create new resource | No | No |
| **PUT** | Replace entire resource | Yes | No |
| **PATCH** | Partial update | No* | No |
| **DELETE** | Remove resource | Yes | No |

*PATCH can be made idempotent with careful design

### Method Examples

```http
# GET - Retrieve
GET /api/v1/providers/123
Response: 200 OK

# POST - Create
POST /api/v1/providers
Body: { name: "ABC Services", ... }
Response: 201 Created
Location: /api/v1/providers/456

# PUT - Full replacement
PUT /api/v1/providers/123
Body: { <complete provider object> }
Response: 200 OK

# PATCH - Partial update
PATCH /api/v1/providers/123
Body: { status: "suspended" }
Response: 200 OK

# DELETE - Remove
DELETE /api/v1/providers/123
Response: 204 No Content
```

## Status Codes

### Success Codes

| Code | Meaning | Usage |
|------|---------|-------|
| **200 OK** | Success | GET, PUT, PATCH successful |
| **201 Created** | Created | POST successful, resource created |
| **202 Accepted** | Accepted | Async operation started |
| **204 No Content** | Success, no body | DELETE successful |

### Client Error Codes

| Code | Meaning | Usage |
|------|---------|-------|
| **400 Bad Request** | Invalid input | Validation failed |
| **401 Unauthorized** | Not authenticated | Missing/invalid token |
| **403 Forbidden** | Not authorized | Token valid, but insufficient permissions |
| **404 Not Found** | Resource not found | Invalid ID |
| **409 Conflict** | State conflict | Cannot delete due to dependencies |
| **422 Unprocessable Entity** | Semantic errors | Business rule violation |
| **429 Too Many Requests** | Rate limited | Exceeded rate limit |

### Server Error Codes

| Code | Meaning | Usage |
|------|---------|-------|
| **500 Internal Server Error** | Server error | Unexpected server failure |
| **503 Service Unavailable** | Service down | Maintenance or overload |

## Error Response Format

All errors return consistent JSON structure:

```typescript
interface ErrorResponse {
  error: {
    code: string;              // Machine-readable error code
    message: string;           // Human-readable message
    details?: ErrorDetail[];   // Optional additional details
    traceId: string;          // For support/debugging
  };
}

interface ErrorDetail {
  field?: string;             // Field name (for validation errors)
  message: string;            // Specific error message
  code?: string;              // Field-specific error code
}
```

### Examples

**Validation Error (400)**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "INVALID_FORMAT"
      },
      {
        "field": "workTeams",
        "message": "At least one work team is required",
        "code": "REQUIRED_FIELD"
      }
    ],
    "traceId": "7d8f9a0b-1c2d-3e4f-5a6b-7c8d9e0f1a2b"
  }
}
```

**Authorization Error (403)**:
```json
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "You do not have permission to perform this action",
    "details": [{
      "message": "Required permission: providers.edit in scope: FR/Leroy Merlin"
    }],
    "traceId": "..."
  }
}
```

**Business Rule Violation (422)**:
```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Cannot assign service order",
    "details": [{
      "message": "Service order is blocked awaiting TV outcome"
    }],
    "traceId": "..."
  }
}
```

## Pagination

### Cursor-Based Pagination (Preferred)

For large datasets and consistent ordering:

**Request**:
```http
GET /api/v1/service-orders?limit=50&cursor=eyJpZCI6IjEyMyIsImNyZWF0ZWRBdCI6IjIwMjUtMDEtMTQifQ
```

**Response**:
```json
{
  "data": [ /* array of items */ ],
  "pagination": {
    "limit": 50,
    "hasNext": true,
    "nextCursor": "eyJpZCI6IjQ1NiIsImNyZWF0ZWRBdCI6IjIwMjUtMDEtMTMifQ"
  }
}
```

### Offset-Based Pagination

For simple cases with stable datasets:

**Request**:
```http
GET /api/v1/providers?offset=100&limit=50
```

**Response**:
```json
{
  "data": [ /* array of items */ ],
  "pagination": {
    "offset": 100,
    "limit": 50,
    "total": 1523
  }
}
```

## Filtering & Sorting

### Filtering

Use query parameters:
```http
GET /api/v1/service-orders?status=assigned&countryCode=FR&scheduledDate[gte]=2025-01-14
```

**Operators**:
- `field=value` - Exact match
- `field[gte]=value` - Greater than or equal
- `field[lte]=value` - Less than or equal
- `field[in]=val1,val2` - In list
- `field[contains]=value` - Contains (for strings)

### Sorting

```http
GET /api/v1/providers?sort=name:asc
GET /api/v1/service-orders?sort=scheduledDate:desc,createdAt:asc
```

## Field Selection

Client can request specific fields:
```http
GET /api/v1/providers?fields=id,name,status
```

Response:
```json
{
  "data": [
    { "id": "123", "name": "ABC Services", "status": "active" }
  ]
}
```

## Versioning

### URL Versioning (Chosen Strategy)

```
/api/v1/...
/api/v2/...
```

**Rationale**:
- Simple and explicit
- Easy to route
- Clear in logs and monitoring

### Version Lifecycle

- **v1**: Current stable
- **v2-beta**: Preview of next version (optional)
- **Deprecation**: 12 months notice before removal

**Deprecation Header**:
```http
HTTP/1.1 200 OK
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Deprecation: true
Link: </api/v2/providers>; rel="successor-version"
```

## Authentication & Authorization

### JWT Bearer Token

All requests (except public endpoints) require JWT:

```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Scopes in Response

For multi-tenant APIs, indicate applied scope:

```http
X-Tenant-Scope: FR/Leroy Merlin
```

## Rate Limiting

### Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1642176000
```

### 429 Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "API rate limit exceeded",
    "details": [{
      "message": "Limit: 1000 requests per hour. Resets at 2025-01-14T15:00:00Z"
    }],
    "traceId": "..."
  }
}
```

## Request/Response Examples

### Create Provider

**Request**:
```http
POST /api/v1/providers HTTP/1.1
Host: api.ahs-fsm.com
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "ABC Home Services",
  "legalName": "ABC Home Services SARL",
  "taxId": "FR12345678901",
  "email": "contact@abc-services.fr",
  "phone": "+33123456789",
  "address": {
    "street": "123 Rue de la Paix",
    "city": "Paris",
    "postalCode": "75001",
    "country": "FR"
  },
  "type": "company",
  "canPerformTV": true,
  "canPerformInstallation": true,
  "tvInstallationPolicy": "accept_third_party_tv",
  "countryCode": "FR",
  "buCode": "Leroy Merlin"
}
```

**Response**:
```http
HTTP/1.1 201 Created
Location: /api/v1/providers/7d8f9a0b-1c2d-3e4f-5a6b-7c8d9e0f1a2b
Content-Type: application/json

{
  "id": "7d8f9a0b-1c2d-3e4f-5a6b-7c8d9e0f1a2b",
  "name": "ABC Home Services",
  "status": "active",
  "tier": 3,
  "createdAt": "2025-01-14T10:30:00Z",
  "updatedAt": "2025-01-14T10:30:00Z"
}
```

## OpenAPI Specification Template

```yaml
openapi: 3.1.0
info:
  title: AHS Field Service API
  version: 1.0.0
  description: Field service management platform API
servers:
  - url: https://api.ahs-fsm.com/api/v1
    description: Production
paths:
  /providers:
    get:
      summary: List providers
      operationId: listProviders
      tags: [Providers]
      parameters:
        - name: countryCode
          in: query
          schema:
            type: string
        - name: status
          in: query
          schema:
            type: string
            enum: [active, on_watch, suspended]
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProviderList'
components:
  schemas:
    Provider:
      type: object
      required: [id, name, status]
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        status:
          type: string
          enum: [active, on_watch, suspended]
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
security:
  - bearerAuth: []
```

## Best Practices Summary

1. ✅ **Use nouns, not verbs** in URLs
2. ✅ **Plural resource names**
3. ✅ **Proper HTTP methods and status codes**
4. ✅ **Consistent error format** with trace IDs
5. ✅ **Cursor-based pagination** for large datasets
6. ✅ **Field filtering** to reduce payload
7. ✅ **Rate limiting headers**
8. ✅ **Comprehensive OpenAPI specs**
9. ✅ **JWT authentication**
10. ✅ **Versioning via URL**

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-14
