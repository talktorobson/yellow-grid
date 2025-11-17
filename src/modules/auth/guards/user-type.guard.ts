import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { USER_TYPE_KEY } from '../decorators/user-type.decorator';

/**
 * Guard to restrict endpoint access based on user type
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, UserTypeGuard)
 * @UserType('INTERNAL')
 * @Get('dashboard')
 * getDashboard() { }
 */
@Injectable()
export class UserTypeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredUserTypes = this.reflector.getAllAndOverride<string[]>(USER_TYPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no user types specified, allow access
    if (!requiredUserTypes || requiredUserTypes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.userType) {
      throw new ForbiddenException('User type not found in token');
    }

    // Check if user's type is in the allowed types
    const hasRequiredUserType = requiredUserTypes.includes(user.userType);

    if (!hasRequiredUserType) {
      throw new ForbiddenException(
        `Access denied. Required user type: ${requiredUserTypes.join(' or ')}. Your user type: ${user.userType}`,
      );
    }

    return true;
  }
}
