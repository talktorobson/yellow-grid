# Unit Testing Standards

## Overview

Unit tests form the foundation of our testing strategy, providing fast feedback and comprehensive coverage of individual components, functions, and classes. This document establishes standards, patterns, and best practices for writing effective unit tests.

## Test Framework Setup

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/index.ts',
    '!src/test/**',
  ],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/core/state-machine/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  testTimeout: 10000,
  maxWorkers: '50%',
  globals: {
    'ts-jest': {
      isolatedModules: true,
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
};
```

### Test Setup File

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { mockLogger } from './mocks/logger.mock';
import { mockDatabase } from './mocks/database.mock';

// Global test configuration
beforeAll(() => {
  // Setup global mocks
  global.console = {
    ...console,
    error: jest.fn(),
    warn: jest.fn(),
  };
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();

  // Reset any singleton state
  mockLogger.reset();
  mockDatabase.reset();
});

afterEach(() => {
  // Cleanup after each test
  jest.restoreAllMocks();
});

afterAll(() => {
  // Final cleanup
  mockDatabase.close();
});

// Custom matchers
expect.extend({
  toBeValidState(received: any) {
    const pass = received && typeof received.name === 'string';
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid state`
          : `expected ${received} to be a valid state with name property`,
    };
  },
});

// Environment variables for testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
```

## Test Structure & Naming

### Standard Test Structure (AAA Pattern)

```typescript
describe('StateMachine', () => {
  // Group related tests
  describe('transition', () => {
    // Use descriptive test names that read like specifications
    it('should transition to target state when guard passes', () => {
      // Arrange: Setup test data and dependencies
      const machine = new StateMachine({
        initial: 'pending',
        states: {
          pending: { on: { APPROVE: 'approved' } },
          approved: {},
        },
      });

      // Act: Perform the action being tested
      const result = machine.transition('APPROVE');

      // Assert: Verify the outcome
      expect(result.state).toBe('approved');
      expect(result.success).toBe(true);
    });

    it('should remain in current state when guard fails', () => {
      // Arrange
      const guard = jest.fn(() => false);
      const machine = new StateMachine({
        initial: 'pending',
        states: {
          pending: {
            on: {
              APPROVE: {
                target: 'approved',
                guard,
              },
            },
          },
          approved: {},
        },
      });

      // Act
      const result = machine.transition('APPROVE');

      // Assert
      expect(result.state).toBe('pending');
      expect(result.success).toBe(false);
      expect(guard).toHaveBeenCalledTimes(1);
    });

    it('should throw error when event is not defined', () => {
      // Arrange
      const machine = new StateMachine({
        initial: 'pending',
        states: {
          pending: {},
        },
      });

      // Act & Assert
      expect(() => machine.transition('INVALID_EVENT')).toThrow(
        'Event INVALID_EVENT not defined for state pending'
      );
    });
  });
});
```

### Naming Conventions

```typescript
// ✅ GOOD: Descriptive, behavior-focused names
describe('UserValidator', () => {
  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {});
    it('should reject emails without @ symbol', () => {});
    it('should reject emails with invalid domain', () => {});
    it('should handle email case insensitively', () => {});
  });
});

// ❌ BAD: Implementation-focused names
describe('UserValidator', () => {
  describe('validateEmail', () => {
    it('test1', () => {});
    it('checks regex', () => {});
    it('works', () => {});
  });
});

// Test name templates
// - "should [expected behavior] when [condition]"
// - "should [expected behavior] for [input type]"
// - "should throw [error] when [invalid condition]"
// - "should handle [edge case]"
```

## TDD Workflow

### Red-Green-Refactor Cycle

```typescript
// STEP 1: RED - Write failing test first
describe('WorkflowEngine', () => {
  describe('executeWorkflow', () => {
    it('should execute all steps in sequence', async () => {
      // Arrange
      const steps = [
        { id: 'step1', action: jest.fn() },
        { id: 'step2', action: jest.fn() },
      ];
      const engine = new WorkflowEngine(steps);

      // Act
      await engine.execute();

      // Assert
      expect(steps[0].action).toHaveBeenCalled();
      expect(steps[1].action).toHaveBeenCalled();
      expect(steps[0].action).toHaveBeenCalledBefore(steps[1].action);
    });
  });
});

// STEP 2: GREEN - Implement minimal code to pass
class WorkflowEngine {
  constructor(private steps: Step[]) {}

  async execute() {
    for (const step of this.steps) {
      await step.action();
    }
  }
}

// STEP 3: REFACTOR - Improve code while keeping tests green
class WorkflowEngine {
  constructor(
    private steps: Step[],
    private logger: Logger = new ConsoleLogger()
  ) {}

  async execute(): Promise<ExecutionResult> {
    const results: StepResult[] = [];

    for (const step of this.steps) {
      try {
        this.logger.info(`Executing step: ${step.id}`);
        await step.action();
        results.push({ stepId: step.id, success: true });
      } catch (error) {
        this.logger.error(`Step ${step.id} failed`, error);
        results.push({ stepId: step.id, success: false, error });
        throw error;
      }
    }

    return { steps: results, success: true };
  }
}
```

### TDD Best Practices

1. **Write the test first**: Forces thinking about API design
2. **Keep tests simple**: One assertion per test when possible
3. **Test behavior, not implementation**: Avoid coupling to internal structure
4. **Red phase is important**: Verify test actually fails
5. **Small iterations**: Make minimal changes to pass each test

## Mocking Strategies

### When to Mock

```typescript
// ✅ MOCK: External dependencies
const apiClient = {
  get: jest.fn(),
  post: jest.fn(),
};

// ✅ MOCK: Database calls
const userRepository = {
  findById: jest.fn(),
  save: jest.fn(),
};

// ✅ MOCK: Time-dependent behavior
jest.useFakeTimers();
jest.setSystemTime(new Date('2024-01-01'));

// ❌ DON'T MOCK: Pure functions
// Just test them directly
function add(a: number, b: number): number {
  return a + b;
}

// ❌ DON'T MOCK: Simple objects
// Use real instances
const config = { timeout: 1000 };
```

### Mock Patterns

#### 1. Jest Mock Functions

```typescript
describe('UserService', () => {
  it('should call repository with correct parameters', async () => {
    // Create mock
    const mockRepository = {
      findById: jest.fn().mockResolvedValue({ id: 1, name: 'John' }),
    };

    const service = new UserService(mockRepository);

    // Execute
    const user = await service.getUser(1);

    // Verify
    expect(mockRepository.findById).toHaveBeenCalledWith(1);
    expect(mockRepository.findById).toHaveBeenCalledTimes(1);
    expect(user).toEqual({ id: 1, name: 'John' });
  });
});
```

#### 2. Module Mocking

```typescript
// __mocks__/logger.ts
export const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  reset: function () {
    this.info.mockReset();
    this.error.mockReset();
    this.warn.mockReset();
    this.debug.mockReset();
  },
};

export class Logger {
  static getInstance() {
    return mockLogger;
  }
}

// test file
jest.mock('@/utils/logger');

import { Logger } from '@/utils/logger';

describe('Feature', () => {
  beforeEach(() => {
    (Logger.getInstance() as any).reset();
  });

  it('should log info message', () => {
    const logger = Logger.getInstance();
    logger.info('test message');
    expect(logger.info).toHaveBeenCalledWith('test message');
  });
});
```

#### 3. Spy Pattern

```typescript
describe('NotificationService', () => {
  it('should send email after successful registration', async () => {
    const emailService = new EmailService();
    const sendSpy = jest.spyOn(emailService, 'send');

    const notificationService = new NotificationService(emailService);
    await notificationService.notifyRegistration('user@example.com');

    expect(sendSpy).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Welcome',
      template: 'registration',
    });

    sendSpy.mockRestore();
  });
});
```

#### 4. Factory Pattern for Test Data

```typescript
// test/factories/user.factory.ts
import { User } from '@/models/user';

let userIdCounter = 1;

export class UserFactory {
  static build(overrides: Partial<User> = {}): User {
    return {
      id: userIdCounter++,
      email: `user${userIdCounter}@example.com`,
      name: 'Test User',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static buildAdmin(overrides: Partial<User> = {}): User {
    return this.build({ role: 'admin', ...overrides });
  }

  static buildMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  static reset(): void {
    userIdCounter = 1;
  }
}

// Usage in tests
describe('UserService', () => {
  beforeEach(() => {
    UserFactory.reset();
  });

  it('should filter admin users', () => {
    const users = [
      UserFactory.build(),
      UserFactory.buildAdmin(),
      UserFactory.build(),
    ];

    const admins = filterAdmins(users);

    expect(admins).toHaveLength(1);
    expect(admins[0].role).toBe('admin');
  });
});
```

## Testing State Machines

### Core State Machine Tests

```typescript
describe('StateMachine', () => {
  describe('initialization', () => {
    it('should start in initial state', () => {
      const machine = new StateMachine({
        initial: 'idle',
        states: {
          idle: {},
          running: {},
        },
      });

      expect(machine.getCurrentState()).toBe('idle');
    });

    it('should throw error if initial state not defined', () => {
      expect(
        () =>
          new StateMachine({
            initial: 'invalid',
            states: { idle: {} },
          })
      ).toThrow('Initial state "invalid" not found in state definitions');
    });
  });

  describe('transitions', () => {
    it('should handle simple transitions', () => {
      const machine = new StateMachine({
        initial: 'idle',
        states: {
          idle: { on: { START: 'running' } },
          running: { on: { STOP: 'idle' } },
        },
      });

      machine.transition('START');
      expect(machine.getCurrentState()).toBe('running');

      machine.transition('STOP');
      expect(machine.getCurrentState()).toBe('idle');
    });

    it('should execute entry and exit actions', () => {
      const onEntry = jest.fn();
      const onExit = jest.fn();

      const machine = new StateMachine({
        initial: 'idle',
        states: {
          idle: {
            on: { START: 'running' },
            onExit,
          },
          running: {
            onEntry,
          },
        },
      });

      machine.transition('START');

      expect(onExit).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'idle',
          to: 'running',
          event: 'START',
        })
      );
      expect(onEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'idle',
          to: 'running',
          event: 'START',
        })
      );
    });

    it('should evaluate guards before transition', () => {
      const guard = jest.fn(() => false);

      const machine = new StateMachine({
        initial: 'idle',
        states: {
          idle: {
            on: {
              START: {
                target: 'running',
                guard,
              },
            },
          },
          running: {},
        },
      });

      const result = machine.transition('START');

      expect(guard).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(machine.getCurrentState()).toBe('idle');
    });

    it('should pass context to guards', () => {
      const guard = jest.fn((context) => context.isAllowed);

      const machine = new StateMachine(
        {
          initial: 'idle',
          states: {
            idle: {
              on: {
                START: {
                  target: 'running',
                  guard,
                },
              },
            },
            running: {},
          },
        },
        { isAllowed: true }
      );

      machine.transition('START');

      expect(guard).toHaveBeenCalledWith(
        expect.objectContaining({ isAllowed: true })
      );
      expect(machine.getCurrentState()).toBe('running');
    });
  });

  describe('hierarchical states', () => {
    it('should support nested states', () => {
      const machine = new StateMachine({
        initial: 'workflow',
        states: {
          workflow: {
            initial: 'editing',
            states: {
              editing: {
                on: { SUBMIT: 'reviewing' },
              },
              reviewing: {
                on: { APPROVE: 'approved' },
              },
              approved: {
                type: 'final',
              },
            },
          },
        },
      });

      expect(machine.getCurrentState()).toBe('workflow.editing');

      machine.transition('SUBMIT');
      expect(machine.getCurrentState()).toBe('workflow.reviewing');
    });
  });

  describe('parallel states', () => {
    it('should handle parallel state regions', () => {
      const machine = new StateMachine({
        type: 'parallel',
        states: {
          upload: {
            initial: 'idle',
            states: {
              idle: { on: { START_UPLOAD: 'uploading' } },
              uploading: {},
            },
          },
          validation: {
            initial: 'idle',
            states: {
              idle: { on: { START_VALIDATION: 'validating' } },
              validating: {},
            },
          },
        },
      });

      expect(machine.getCurrentState()).toEqual({
        upload: 'idle',
        validation: 'idle',
      });

      machine.transition('START_UPLOAD');
      expect(machine.getCurrentState()).toEqual({
        upload: 'uploading',
        validation: 'idle',
      });
    });
  });
});
```

### Testing Async State Machines

```typescript
describe('AsyncStateMachine', () => {
  it('should handle async actions', async () => {
    const asyncAction = jest
      .fn()
      .mockResolvedValue({ data: 'success' });

    const machine = new AsyncStateMachine({
      initial: 'idle',
      states: {
        idle: {
          on: {
            FETCH: {
              target: 'loading',
              action: asyncAction,
            },
          },
        },
        loading: {
          on: {
            SUCCESS: 'success',
            ERROR: 'error',
          },
        },
        success: {},
        error: {},
      },
    });

    const promise = machine.transition('FETCH');

    expect(machine.getCurrentState()).toBe('loading');
    expect(asyncAction).toHaveBeenCalled();

    await promise;

    expect(machine.getCurrentState()).toBe('success');
  });

  it('should handle async action errors', async () => {
    const asyncAction = jest
      .fn()
      .mockRejectedValue(new Error('Network error'));

    const machine = new AsyncStateMachine({
      initial: 'idle',
      states: {
        idle: {
          on: {
            FETCH: {
              target: 'loading',
              action: asyncAction,
            },
          },
        },
        loading: {
          on: {
            ERROR: 'error',
          },
        },
        error: {},
      },
    });

    await machine.transition('FETCH');

    expect(machine.getCurrentState()).toBe('error');
    expect(machine.getContext().error).toEqual(
      new Error('Network error')
    );
  });
});
```

## Testing React Components

### Component Testing with React Testing Library

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkflowBuilder } from '@/components/WorkflowBuilder';

describe('WorkflowBuilder', () => {
  it('should render workflow builder form', () => {
    render(<WorkflowBuilder />);

    expect(screen.getByLabelText('Workflow Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('should add new state when button clicked', async () => {
    const user = userEvent.setup();
    render(<WorkflowBuilder />);

    const addButton = screen.getByRole('button', { name: /add state/i });
    await user.click(addButton);

    expect(screen.getByLabelText('State Name')).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<WorkflowBuilder onSubmit={onSubmit} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Workflow name is required')).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should call onSubmit with workflow data', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<WorkflowBuilder onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Workflow Name'), 'Approval Flow');
    await user.type(
      screen.getByLabelText('Description'),
      'Standard approval process'
    );

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Approval Flow',
        description: 'Standard approval process',
        states: [],
      });
    });
  });
});
```

### Testing Custom Hooks

```typescript
import { renderHook, act } from '@testing-library/react';
import { useStateMachine } from '@/hooks/useStateMachine';

describe('useStateMachine', () => {
  it('should initialize with initial state', () => {
    const { result } = renderHook(() =>
      useStateMachine({
        initial: 'idle',
        states: { idle: {}, running: {} },
      })
    );

    expect(result.current.state).toBe('idle');
  });

  it('should transition to new state', () => {
    const { result } = renderHook(() =>
      useStateMachine({
        initial: 'idle',
        states: {
          idle: { on: { START: 'running' } },
          running: {},
        },
      })
    );

    act(() => {
      result.current.send('START');
    });

    expect(result.current.state).toBe('running');
  });

  it('should update context on transition', () => {
    const { result } = renderHook(() =>
      useStateMachine(
        {
          initial: 'idle',
          states: {
            idle: {
              on: {
                INCREMENT: {
                  target: 'idle',
                  action: (context) => ({ count: context.count + 1 }),
                },
              },
            },
          },
        },
        { count: 0 }
      )
    );

    act(() => {
      result.current.send('INCREMENT');
    });

    expect(result.current.context.count).toBe(1);
  });
});
```

## Coverage Best Practices

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html

# Check coverage thresholds
npm run test:coverage -- --coverageThreshold='{"global":{"branches":80,"functions":80,"lines":80,"statements":80}}'
```

### Coverage Configuration

```javascript
// jest.config.js - Detailed coverage config
module.exports = {
  // ... other config
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/**/*.test.{ts,tsx}',
    '!src/test/**',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '\\.mock\\.',
  ],
  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json'],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/core/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
```

### What Coverage Doesn't Tell You

```typescript
// ❌ 100% coverage doesn't mean bug-free
function divide(a: number, b: number): number {
  return a / b; // No zero check!
}

test('divide', () => {
  expect(divide(10, 2)).toBe(5); // Passes, 100% coverage
});

// ✅ Good tests catch edge cases
test('divide throws on zero divisor', () => {
  expect(() => divide(10, 0)).toThrow('Cannot divide by zero');
});
```

## Performance Testing

### Testing Performance of Units

```typescript
describe('StateMachine Performance', () => {
  it('should handle 1000 transitions in reasonable time', () => {
    const machine = new StateMachine({
      initial: 'state1',
      states: {
        state1: { on: { NEXT: 'state2' } },
        state2: { on: { NEXT: 'state1' } },
      },
    });

    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      machine.transition('NEXT');
    }

    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100); // Should complete in <100ms
  });

  it('should not leak memory', () => {
    const machines: StateMachine[] = [];

    const initialMemory = process.memoryUsage().heapUsed;

    // Create many instances
    for (let i = 0; i < 1000; i++) {
      machines.push(
        new StateMachine({
          initial: 'idle',
          states: { idle: {} },
        })
      );
    }

    // Clear references
    machines.length = 0;
    global.gc?.(); // Requires --expose-gc flag

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be minimal after GC
    expect(memoryIncrease).toBeLessThan(1024 * 1024); // < 1MB
  });
});
```

## Common Testing Scenarios

### Testing Error Handling

```typescript
describe('Error Handling', () => {
  it('should throw specific error for invalid input', () => {
    expect(() => validateEmail('')).toThrow(ValidationError);
    expect(() => validateEmail('')).toThrow('Email is required');
  });

  it('should catch and transform errors', async () => {
    const repository = {
      save: jest.fn().mockRejectedValue(new DatabaseError('Connection failed')),
    };

    const service = new UserService(repository);

    await expect(service.createUser({ email: 'test@example.com' }))
      .rejects
      .toThrow(ServiceError);
  });
});
```

### Testing Async Code

```typescript
describe('Async Operations', () => {
  it('should handle promises', async () => {
    const result = await fetchData();
    expect(result).toBeDefined();
  });

  it('should handle async/await errors', async () => {
    await expect(fetchInvalidData()).rejects.toThrow();
  });

  it('should handle callbacks', (done) => {
    fetchDataWithCallback((error, data) => {
      expect(error).toBeNull();
      expect(data).toBeDefined();
      done();
    });
  });
});
```

### Testing Timers

```typescript
describe('Timer Functions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should execute after delay', () => {
    const callback = jest.fn();
    scheduleTask(callback, 1000);

    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should clear timeout', () => {
    const callback = jest.fn();
    const id = scheduleTask(callback, 1000);

    cancelTask(id);

    jest.advanceTimersByTime(1000);

    expect(callback).not.toHaveBeenCalled();
  });
});
```

## Debugging Tests

### Useful Debugging Techniques

```typescript
// 1. Use test.only to focus on single test
test.only('debug this test', () => {
  // Only this test runs
});

// 2. Use console.log (temporary)
test('debugging', () => {
  const result = complexFunction();
  console.log('Result:', result);
  expect(result).toBeDefined();
});

// 3. Use debugger statement
test('debugging with debugger', () => {
  const data = getData();
  debugger; // Pauses execution in debug mode
  expect(data).toBeTruthy();
});

// 4. Screen debug for React components
test('debug component', () => {
  const { debug } = render(<MyComponent />);
  debug(); // Prints component HTML
});

// 5. Use --verbose flag
// npm test -- --verbose
```

### Common Test Failures

```typescript
// 1. Async timing issues
// ❌ BAD
test('async test', () => {
  fetchData().then(data => {
    expect(data).toBeDefined(); // May not run!
  });
});

// ✅ GOOD
test('async test', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});

// 2. Mock not reset between tests
// ✅ Always clear mocks
beforeEach(() => {
  jest.clearAllMocks();
});

// 3. Shared state between tests
// ✅ Use beforeEach for setup
let user;
beforeEach(() => {
  user = createUser(); // Fresh instance per test
});
```

## CI Integration

### Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand"
  }
}
```

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Unit Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
```

## Summary

Unit testing standards provide:
- Fast feedback during development
- Confidence in refactoring
- Living documentation
- Bug prevention

Key takeaways:
1. Follow AAA pattern (Arrange, Act, Assert)
2. Use TDD workflow (Red, Green, Refactor)
3. Mock external dependencies only
4. Aim for 80%+ coverage, 95%+ for critical code
5. Keep tests simple, focused, and fast
6. Use factories for test data
7. Name tests descriptively
8. Run tests in CI/CD pipeline
