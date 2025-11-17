import { SetMetadata } from '@nestjs/common';

export const USER_TYPE_KEY = 'userType';

/**
 * Decorator to restrict endpoint access to specific user types
 *
 * @example
 * // Only internal users can access
 * @UserType('INTERNAL')
 * @Get('dashboard')
 * getDashboard() { }
 *
 * @example
 * // Only external providers can access
 * @UserType('EXTERNAL_PROVIDER')
 * @Get('jobs')
 * getJobs() { }
 *
 * @example
 * // Multiple user types allowed
 * @UserType('INTERNAL', 'EXTERNAL_PROVIDER')
 * @Get('work-teams/:id')
 * getWorkTeam() { }
 */
export const UserType = (...userTypes: string[]) => SetMetadata(USER_TYPE_KEY, userTypes);
