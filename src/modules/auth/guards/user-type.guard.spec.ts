import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserTypeGuard } from './user-type.guard';
import { USER_TYPE_KEY } from '../decorators/user-type.decorator';

describe('UserTypeGuard', () => {
  let guard: UserTypeGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserTypeGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<UserTypeGuard>(UserTypeGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    const createMockExecutionContext = (user: any): ExecutionContext => {
      return {
        switchToHttp: () => ({
          getRequest: () => ({
            user,
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;
    };

    it('should allow access if no user types specified', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const context = createMockExecutionContext({ userId: 'user-123' });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access if user type matches required type', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['INTERNAL']);

      const context = createMockExecutionContext({
        userId: 'user-123',
        userType: 'INTERNAL',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access if user type matches one of multiple required types', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['INTERNAL', 'EXTERNAL_PROVIDER']);

      const context = createMockExecutionContext({
        userId: 'user-123',
        userType: 'EXTERNAL_PROVIDER',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access if user type does not match', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['INTERNAL']);

      const context = createMockExecutionContext({
        userId: 'user-123',
        userType: 'EXTERNAL_PROVIDER',
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Access denied. Required user type: INTERNAL. Your user type: EXTERNAL_PROVIDER',
      );
    });

    it('should throw ForbiddenException if user not authenticated', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['INTERNAL']);

      const context = createMockExecutionContext(null);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User not authenticated');
    });

    it('should throw ForbiddenException if userType not in token', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['INTERNAL']);

      const context = createMockExecutionContext({
        userId: 'user-123',
        // userType missing
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User type not found in token');
    });

    it('should properly check metadata from handler and class', () => {
      const getAllAndOverrideSpy = jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['INTERNAL']);

      const mockHandler = jest.fn();
      const mockClass = jest.fn();
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { userId: 'user-123', userType: 'INTERNAL' },
          }),
        }),
        getHandler: () => mockHandler,
        getClass: () => mockClass,
      } as any;

      guard.canActivate(context);

      expect(getAllAndOverrideSpy).toHaveBeenCalledWith(USER_TYPE_KEY, [mockHandler, mockClass]);
    });

    it('should allow EXTERNAL_TECHNICIAN to access technician endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['EXTERNAL_TECHNICIAN']);

      const context = createMockExecutionContext({
        userId: 'user-123',
        userType: 'EXTERNAL_TECHNICIAN',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny EXTERNAL_TECHNICIAN access to provider endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['EXTERNAL_PROVIDER']);

      const context = createMockExecutionContext({
        userId: 'user-123',
        userType: 'EXTERNAL_TECHNICIAN',
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should deny INTERNAL users access to external endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['EXTERNAL_PROVIDER']);

      const context = createMockExecutionContext({
        userId: 'user-123',
        userType: 'INTERNAL',
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should handle empty user types array', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const context = createMockExecutionContext({
        userId: 'user-123',
        userType: 'INTERNAL',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
