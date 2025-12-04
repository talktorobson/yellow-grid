import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, QueryUsersDto, AssignRoleDto, UpdateProfileDto } from './dto';

/**
 * Service for managing users in the system.
 *
 * Handles creation, retrieval, updates, deletion (soft delete), and role management for users.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new user.
   *
   * @param dto - The user creation data.
   * @param currentUserId - The ID of the user creating the account (optional).
   * @returns {Promise<UserResponseDto>} The created user.
   * @throws {ConflictException} If the email already exists.
   */
  async create(dto: CreateUserDto, currentUserId?: string) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Create user with OPERATOR role by default
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        countryCode: dto.countryCode,
        businessUnit: dto.businessUnit,
        isActive: dto.isActive ?? true,
        roles: {
          create: {
            role: {
              connectOrCreate: {
                where: { name: 'OPERATOR' },
                create: {
                  name: 'OPERATOR',
                  description: 'Default operator role',
                },
              },
            },
          },
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    this.logger.log(`User created: ${user.email} (${user.id}) by ${currentUserId || 'system'}`);

    return this.mapToResponse(user);
  }

  /**
   * Retrieves all users with pagination and filtering.
   *
   * @param query - Query parameters for filtering and pagination.
   * @param currentUserCountry - The country code of the current user.
   * @param currentUserBU - The business unit of the current user.
   * @returns A paginated list of users.
   */
  async findAll(query: QueryUsersDto, currentUserCountry: string, currentUserBU: string) {
    const { page = 1, limit = 20, search, countryCode, businessUnit, role, isActive } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      // Multi-tenancy: users can only see users in their country/BU
      countryCode: countryCode || currentUserCountry,
      businessUnit: businessUnit || currentUserBU,
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (role) {
      where.roles = {
        some: {
          role: {
            name: role,
          },
        },
      };
    }

    // Execute query with pagination
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user: any) => this.mapToResponse(user)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves a user by ID.
   *
   * @param id - The user ID.
   * @param currentUserCountry - The country code of the current user.
   * @param currentUserBU - The business unit of the current user.
   * @returns {Promise<UserResponseDto>} The user details.
   * @throws {NotFoundException} If the user is not found.
   */
  async findOne(id: string, currentUserCountry: string, currentUserBU: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        // Multi-tenancy filter
        countryCode: currentUserCountry,
        businessUnit: currentUserBU,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToResponse(user);
  }

  /**
   * Updates a user.
   *
   * @param id - The user ID.
   * @param dto - The update data.
   * @param currentUserId - The ID of the user performing the update.
   * @param currentUserCountry - The country code of the current user.
   * @param currentUserBU - The business unit of the current user.
   * @returns {Promise<UserResponseDto>} The updated user.
   * @throws {NotFoundException} If the user is not found.
   */
  async update(id: string, dto: UpdateUserDto, currentUserId: string, currentUserCountry: string, currentUserBU: string) {
    // Check if user exists in current tenant
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id,
        countryCode: currentUserCountry,
        businessUnit: currentUserBU,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Prepare update data
    const updateData: any = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      isActive: dto.isActive,
    };

    // Hash new password if provided
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
    }

    // Update user
    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    this.logger.log(`User updated: ${user.email} (${user.id}) by ${currentUserId}`);

    return this.mapToResponse(user);
  }

  /**
   * Deactivates (soft deletes) a user.
   *
   * @param id - The user ID.
   * @param currentUserId - The ID of the user performing the deletion.
   * @param currentUserCountry - The country code of the current user.
   * @param currentUserBU - The business unit of the current user.
   * @returns {Promise<{ message: string }>} A confirmation message.
   * @throws {ForbiddenException} If attempting to delete own account.
   * @throws {NotFoundException} If the user is not found.
   */
  async remove(id: string, currentUserId: string, currentUserCountry: string, currentUserBU: string) {
    // Prevent self-deletion
    if (id === currentUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    // Check if user exists in current tenant
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id,
        countryCode: currentUserCountry,
        businessUnit: currentUserBU,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Soft delete - just deactivate the user
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`User deleted (deactivated): ${existingUser.email} (${id}) by ${currentUserId}`);

    return { message: 'User successfully deleted' };
  }

  /**
   * Assigns a role to a user.
   *
   * @param userId - The user ID.
   * @param dto - The role assignment data.
   * @param currentUserId - The ID of the user performing the assignment.
   * @param currentUserCountry - The country code of the current user.
   * @param currentUserBU - The business unit of the current user.
   * @returns {Promise<UserResponseDto>} The updated user.
   * @throws {ConflictException} If the user already has the role.
   * @throws {NotFoundException} If the user is not found.
   */
  async assignRole(userId: string, dto: AssignRoleDto, currentUserId: string, currentUserCountry: string, currentUserBU: string) {
    // Check if user exists in current tenant
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        countryCode: currentUserCountry,
        businessUnit: currentUserBU,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has this role
    const hasRole = user.roles.some((ur: any) => ur.role.name === dto.roleName);
    if (hasRole) {
      throw new ConflictException('User already has this role');
    }

    // Get or create the role
    const role = await this.prisma.role.upsert({
      where: { name: dto.roleName },
      update: {},
      create: {
        name: dto.roleName,
        description: `${dto.roleName} role`,
      },
    });

    // Assign role to user
    await this.prisma.userRole.create({
      data: {
        userId,
        roleId: role.id,
      },
    });

    this.logger.log(`Role assigned: ${dto.roleName} to user ${userId} by ${currentUserId}`);

    return this.findOne(userId, currentUserCountry, currentUserBU);
  }

  /**
   * Revokes a role from a user.
   *
   * @param userId - The user ID.
   * @param roleName - The name of the role to revoke.
   * @param currentUserId - The ID of the user performing the revocation.
   * @param currentUserCountry - The country code of the current user.
   * @param currentUserBU - The business unit of the current user.
   * @returns {Promise<UserResponseDto>} The updated user.
   * @throws {NotFoundException} If the user or role is not found.
   * @throws {ForbiddenException} If attempting to remove the last role.
   */
  async revokeRole(userId: string, roleName: string, currentUserId: string, currentUserCountry: string, currentUserBU: string) {
    // Check if user exists in current tenant
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        countryCode: currentUserCountry,
        businessUnit: currentUserBU,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has this role
    const userRole = user.roles.find((ur: any) => ur.role.name === roleName);
    if (!userRole) {
      throw new NotFoundException('User does not have this role');
    }

    // Prevent removing last role
    if (user.roles.length === 1) {
      throw new ForbiddenException('Cannot remove last role from user');
    }

    // Revoke role
    await this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId: userRole.roleId,
        },
      },
    });

    this.logger.log(`Role revoked: ${roleName} from user ${userId} by ${currentUserId}`);

    return this.findOne(userId, currentUserCountry, currentUserBU);
  }

  // ===== PROFILE SELF-SERVICE METHODS =====

  /**
   * Get the current user's profile.
   *
   * @param userId - The ID of the current user.
   * @returns {Promise<UserResponseDto>} The user profile.
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToResponse(user);
  }

  /**
   * Update the current user's profile (self-service).
   * Only allows updating: firstName, lastName, phone
   *
   * @param userId - The ID of the current user.
   * @param updateProfileDto - The profile update data.
   * @returns {Promise<UserResponseDto>} The updated user profile.
   */
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: updateProfileDto.firstName ?? user.firstName,
        lastName: updateProfileDto.lastName ?? user.lastName,
        phone: updateProfileDto.phone ?? user.phone,
        updatedAt: new Date(),
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    this.logger.log(`User ${userId} updated their profile`);

    return this.mapToResponse(updatedUser);
  }

  /**
   * Upload/update the current user's avatar.
   * For now, stores URL directly. In production, integrate with GCS.
   *
   * @param userId - The ID of the current user.
   * @param avatarUrl - The avatar URL (or base64 data for now).
   * @param thumbnailUrl - Optional thumbnail URL.
   * @returns {Promise<UserResponseDto>} The updated user profile.
   */
  async uploadAvatar(userId: string, avatarUrl: string, thumbnailUrl?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl,
        avatarThumbnailUrl: thumbnailUrl ?? avatarUrl,
        updatedAt: new Date(),
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    this.logger.log(`User ${userId} updated their avatar`);

    return this.mapToResponse(updatedUser);
  }

  /**
   * Delete the current user's avatar.
   *
   * @param userId - The ID of the current user.
   * @returns {Promise<UserResponseDto>} The updated user profile.
   */
  async deleteAvatar(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: null,
        avatarThumbnailUrl: null,
        updatedAt: new Date(),
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    this.logger.log(`User ${userId} deleted their avatar`);

    return this.mapToResponse(updatedUser);
  }

  /**
   * Maps a user entity to a response DTO.
   *
   * @param user - The user entity.
   * @returns {UserResponseDto} The user response DTO (excluding password).
   */
  private mapToResponse(user: any) {
    const { password, ...userWithoutPassword } = user;

    return {
      ...userWithoutPassword,
      roles: user.roles.map((ur: any) => ur.role.name),
    };
  }
}
