import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard to restrict endpoint access based on user roles
 *
 * This guard checks if the authenticated user has at least one of the required roles.
 * It works in conjunction with JWT authentication and expects the user object
 * to have a 'roles' property containing an array of role objects with 'name' field.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('ADMIN', 'OPERATOR')
 * @Post()
 * createServiceOrder() { }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Extract role names from user.roles array
    // Handle both array of strings (from JWT) and array of objects (from DB)
    const userRoles = user.roles || [];
    const userRoleNames = userRoles.map((role: any) => {
      if (typeof role === 'string') {
        return role;
      }
      return role.name;
    });

    if (userRoleNames.length === 0) {
      throw new ForbiddenException('User has no assigned roles');
    }

    // Check if user has at least one of the required roles
    const hasRequiredRole = requiredRoles.some(role => userRoleNames.includes(role));

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Access denied. Required role: ${requiredRoles.join(' or ')}. Your roles: ${userRoleNames.join(', ')}`,
      );
    }

    return true;
  }
}
