import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, AssignRoleDto, UserResponseDto, QueryUsersDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully created',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User with this email already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async create(@Body() dto: CreateUserDto, @CurrentUser() user: CurrentUserPayload) {
    return this.usersService.create(dto, user.userId);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all users with pagination and filters (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'countryCode', required: false, enum: ['FR', 'ES', 'IT', 'PL'] })
  @ApiQuery({ name: 'businessUnit', required: false, enum: ['LEROY_MERLIN', 'BRICO_DEPOT'] })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of users with pagination',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions - Admin role required',
  })
  async findAll(@Query() query: QueryUsersDto, @CurrentUser() user: CurrentUserPayload) {
    return this.usersService.findAll(query, user.countryCode, user.businessUnit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User details',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.usersService.findOne(id, user.countryCode, user.businessUnit);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user (Admin or self)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully updated',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot update other users without admin role',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    // Users can update themselves, or admins can update anyone
    const isAdmin = user.roles.includes('ADMIN');
    const isSelf = id === user.userId;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Non-admins cannot change isActive status
    if (!isAdmin && dto.isActive !== undefined) {
      throw new ForbiddenException('Only admins can change user active status');
    }

    return this.usersService.update(id, dto, user.userId, user.countryCode, user.businessUnit);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update user (Admin or self)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully updated',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot update other users without admin role',
  })
  async patch(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    // Users can update themselves, or admins can update anyone
    const isAdmin = user.roles.includes('ADMIN');
    const isSelf = id === user.userId;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Non-admins cannot change isActive status
    if (!isAdmin && dto.isActive !== undefined) {
      throw new ForbiddenException('Only admins can change user active status');
    }

    return this.usersService.update(id, dto, user.userId, user.countryCode, user.businessUnit);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'User successfully deleted',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot delete your own account',
  })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.usersService.remove(id, user.userId, user.countryCode, user.businessUnit);
  }

  @Post(':id/roles')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Assign role to user (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role successfully assigned',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User already has this role',
  })
  async assignRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.assignRole(id, dto, user.userId, user.countryCode, user.businessUnit);
  }

  @Delete(':id/roles/:roleName')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke role from user (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role successfully revoked',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found or does not have this role',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot remove last role from user',
  })
  async revokeRole(
    @Param('id') id: string,
    @Param('roleName') roleName: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.revokeRole(id, roleName, user.userId, user.countryCode, user.businessUnit);
  }
}
