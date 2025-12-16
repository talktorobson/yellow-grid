# Coding Standards

## Purpose

Defines TypeScript/JavaScript coding standards, style guidelines, and best practices for the AHS Field Service Execution Platform.

## TypeScript Style Guide

### General Principles

1. **Type safety first**: Avoid `any`, use proper types
2. **Explicit over implicit**: Declare types even when inferred
3. **Immutability**: Prefer `const`, use readonly where appropriate
4. **Pure functions**: Minimize side effects
5. **Single responsibility**: One function, one purpose

### Naming Conventions

```typescript
// Classes: PascalCase
class ProviderService {}
class ServiceOrderRepository {}

// Interfaces & Types: PascalCase with descriptive names
interface ProviderDto {}
type ServiceOrderStatus = 'created' | 'assigned' | 'completed';

// Functions & Variables: camelCase
function calculateBufferDays(orderDate: Date): number {}
const assignmentRun = await service.distribute(orderId);

// Constants: UPPER_SNAKE_CASE
const MAX_ASSIGNMENT_RETRIES = 3;
const DEFAULT_BUFFER_DAYS = 7;

// Private class members: prefix with underscore (optional)
class ProviderService {
  private _cache: Map<string, Provider> = new Map();
  private readonly _logger: Logger;
}

// Enums: PascalCase for enum, UPPER_SNAKE_CASE for values
enum ServiceType {
  INSTALLATION = 'INSTALLATION',
  TECHNICAL_VISIT = 'TECHNICAL_VISIT',
  MAINTENANCE = 'MAINTENANCE',
}

// Boolean variables: Use is/has/can prefix
const isBlocked = order.status === 'blocked';
const hasP1Service = provider.servicePreferences.some(p => p.level === 'P1');
const canPerformInstallation = team.capabilities.installation;
```

### Type Declarations

```typescript
// ✅ Good: Explicit return types
function getProvider(id: string): Promise<Provider | null> {
  return this.providerRepository.findById(id);
}

// ❌ Bad: Implicit return type
function getProvider(id: string) {
  return this.providerRepository.findById(id);
}

// ✅ Good: Interface for object shapes
interface CreateProviderDto {
  name: string;
  countryCode: string;
  buCode: string;
  canPerformTV: boolean;
  canPerformInstallation: boolean;
}

// ❌ Bad: Inline type
function createProvider(provider: {
  name: string;
  countryCode: string;
  // ...
}) {}

// ✅ Good: Use unknown over any
function parseJson(json: string): unknown {
  return JSON.parse(json);
}

// ❌ Bad: Using any
function parseJson(json: string): any {
  return JSON.parse(json);
}

// ✅ Good: Narrow types with type guards
function isProvider(obj: unknown): obj is Provider {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj
  );
}
```

### Async/Await

```typescript
// ✅ Good: Use async/await
async function assignServiceOrder(orderId: string): Promise<Assignment> {
  const order = await this.orderRepository.findById(orderId);
  if (!order) {
    throw new NotFoundException('Service order not found');
  }
  
  const candidates = await this.providerService.findCandidates(order);
  const scored = await this.scoringService.score(candidates, order);
  const assignment = await this.assignmentService.create(scored[0]);
  
  return assignment;
}

// ❌ Bad: Promise chains
function assignServiceOrder(orderId: string): Promise<Assignment> {
  return this.orderRepository.findById(orderId)
    .then(order => {
      if (!order) throw new NotFoundException('Service order not found');
      return this.providerService.findCandidates(order);
    })
    .then(candidates => this.scoringService.score(candidates))
    // ...
}

// ✅ Good: Error handling
async function processOrder(orderId: string): Promise<void> {
  try {
    await this.assignmentService.assign(orderId);
    await this.notificationService.notify(orderId);
  } catch (error) {
    this.logger.error('Failed to process order', { orderId, error });
    throw error; // Re-throw or handle appropriately
  }
}
```

### Null/Undefined Handling

```typescript
// ✅ Good: Use optional chaining and nullish coalescing
const teamName = provider.workTeams?.[0]?.name ?? 'Unknown';

// ✅ Good: Explicit null checks
if (order.assignedProvider === null) {
  // handle unassigned case
}

// ❌ Bad: Implicit falsy checks (0, '', false are also falsy!)
if (!order.assignedProvider) {
  // might incorrectly trigger
}

// ✅ Good: Use strict equality
if (status === null) {}
if (status === undefined) {}

// ❌ Bad: Loose equality
if (status == null) {} // matches both null and undefined
```

## NestJS Patterns

### Controller Structure

```typescript
import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('providers')
@Controller('api/v1/providers')
export class ProviderController {
  constructor(private readonly providerService: ProviderService) {}

  @Get()
  @ApiOperation({ summary: 'List providers' })
  @ApiResponse({ status: 200, type: [ProviderDto] })
  async listProviders(
    @Query() query: ListProvidersQueryDto,
  ): Promise<ProviderDto[]> {
    return this.providerService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get provider by ID' })
  @ApiResponse({ status: 200, type: ProviderDto })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async getProvider(@Param('id') id: string): Promise<ProviderDto> {
    return this.providerService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create provider' })
  @ApiResponse({ status: 201, type: ProviderDto })
  async createProvider(@Body() dto: CreateProviderDto): Promise<ProviderDto> {
    return this.providerService.create(dto);
  }
}
```

### Service Layer

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ProviderService {
  constructor(
    private readonly providerRepository: ProviderRepository,
    private readonly logger: Logger,
  ) {}

  async findById(id: string): Promise<ProviderDto> {
    const provider = await this.providerRepository.findById(id);
    
    if (!provider) {
      throw new NotFoundException(`Provider ${id} not found`);
    }

    return this.toDto(provider);
  }

  async create(dto: CreateProviderDto): Promise<ProviderDto> {
    // Validate
    await this.validateProvider(dto);

    // Create entity
    const provider = Provider.create(dto);

    // Persist
    await this.providerRepository.save(provider);

    // Emit event
    await this.eventBus.publish(
      new ProviderCreatedEvent(provider.id, provider.name)
    );

    // Return DTO
    return this.toDto(provider);
  }

  private toDto(provider: Provider): ProviderDto {
    return {
      id: provider.id,
      name: provider.name,
      status: provider.status,
      createdAt: provider.createdAt,
    };
  }
}
```

### DTOs with Validation

```typescript
import { IsString, IsBoolean, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProviderDto {
  @ApiProperty({ example: 'ABC Home Services' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: ['FR', 'ES', 'IT'] })
  @IsString()
  @MaxLength(2)
  countryCode: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50)
  buCode: string;

  @ApiProperty()
  @IsBoolean()
  canPerformTV: boolean;

  @ApiProperty()
  @IsBoolean()
  canPerformInstallation: boolean;

  @ApiPropertyOptional({ enum: ['require_own_tv', 'accept_third_party_tv'] })
  @IsOptional()
  @IsEnum(['require_own_tv', 'accept_third_party_tv'])
  tvInstallationPolicy?: string;
}
```

## Error Handling

### Custom Exceptions

```typescript
// Domain exception
export class BusinessRuleViolationException extends Error {
  constructor(
    public readonly rule: string,
    public readonly details: Record<string, any>,
  ) {
    super(`Business rule violation: ${rule}`);
    this.name = 'BusinessRuleViolationException';
  }
}

// Usage
if (order.status === 'blocked') {
  throw new BusinessRuleViolationException('ORDER_BLOCKED', {
    orderId: order.id,
    blockingReason: order.blockingReason,
  });
}
```

### Exception Filters

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500;

    const errorResponse = {
      error: {
        code: this.getErrorCode(exception),
        message: this.getErrorMessage(exception),
        traceId: request.headers['x-trace-id'] || 'unknown',
        details: this.getErrorDetails(exception),
      },
    };

    this.logger.error('Exception caught', {
      exception,
      traceId: errorResponse.error.traceId,
    });

    response.status(status).json(errorResponse);
  }
}
```

## Logging

### Structured Logging

```typescript
import { Logger } from '@nestjs/common';

export class ProviderService {
  private readonly logger = new Logger(ProviderService.name);

  async create(dto: CreateProviderDto): Promise<ProviderDto> {
    this.logger.log('Creating provider', {
      name: dto.name,
      country: dto.countryCode,
    });

    try {
      const provider = await this.providerRepository.save(dto);
      
      this.logger.log('Provider created successfully', {
        providerId: provider.id,
        name: provider.name,
      });

      return this.toDto(provider);
    } catch (error) {
      this.logger.error('Failed to create provider', {
        dto,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}
```

### Log Levels

- **error**: Failures, exceptions
- **warn**: Degraded state, retries, deprecated usage
- **log**: Important business events (assignment created, order completed)
- **debug**: Detailed diagnostic info (only in dev)
- **verbose**: Very detailed (only in dev)

## Testing Standards

### Unit Test Structure

```typescript
describe('ProviderService', () => {
  let service: ProviderService;
  let repository: jest.Mocked<ProviderRepository>;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      save: jest.fn(),
    } as any;

    service = new ProviderService(repository, new Logger());
  });

  describe('findById', () => {
    it('should return provider when found', async () => {
      // Arrange
      const provider = { id: '123', name: 'Test Provider' };
      repository.findById.mockResolvedValue(provider);

      // Act
      const result = await service.findById('123');

      // Assert
      expect(result).toEqual(provider);
      expect(repository.findById).toHaveBeenCalledWith('123');
    });

    it('should throw NotFoundException when not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById('123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
```

## Code Organization

### File Structure

```
src/
├── modules/
│   ├── providers/
│   │   ├── controllers/
│   │   │   └── provider.controller.ts
│   │   ├── services/
│   │   │   ├── provider.service.ts
│   │   │   └── provider-scoring.service.ts
│   │   ├── repositories/
│   │   │   └── provider.repository.ts
│   │   ├── dto/
│   │   │   ├── create-provider.dto.ts
│   │   │   ├── update-provider.dto.ts
│   │   │   └── provider.dto.ts
│   │   ├── entities/
│   │   │   └── provider.entity.ts
│   │   ├── events/
│   │   │   └── provider-created.event.ts
│   │   └── providers.module.ts
```

### File Naming

- Controllers: `*.controller.ts`
- Services: `*.service.ts`
- Repositories: `*.repository.ts`
- DTOs: `*.dto.ts`
- Entities: `*.entity.ts`
- Events: `*.event.ts`
- Tests: `*.spec.ts`

## ESLint Configuration

```json
{
  "extends": [
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended"
  ],
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_"
    }],
    "no-console": "warn",
    "max-len": ["error", { "code": 120 }],
    "complexity": ["error", 10]
  }
}
```

## Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "avoid"
}
```

## Pre-commit Hooks

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "jest --bail --findRelatedTests"
    ]
  }
}
```

## Code Review Checklist

Before submitting PR:
- [ ] No `any` types
- [ ] All functions have return types
- [ ] Error handling present
- [ ] Tests added (unit + integration)
- [ ] No hardcoded values (use config)
- [ ] Logging added for important operations
- [ ] DTOs validated with class-validator
- [ ] OpenAPI documentation updated
- [ ] No console.log statements
- [ ] ESLint/Prettier passing

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-14
