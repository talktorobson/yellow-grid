import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator to restrict endpoint access to specific roles
 *
 * @example
 * // Only admins can access
 * @Roles('ADMIN')
 * @Delete(':id')
 * deleteServiceOrder() { }
 *
 * @example
 * // Multiple roles allowed
 * @Roles('ADMIN', 'OPERATOR')
 * @Post()
 * createServiceOrder() { }
 *
 * @example
 * // Operators and provider managers
 * @Roles('ADMIN', 'OPERATOR', 'PROVIDER_MANAGER')
 * @Get()
 * listServiceOrders() { }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
