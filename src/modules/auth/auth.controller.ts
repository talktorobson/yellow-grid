import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto, AuthResponseDto, ChangePasswordDto, ChangePasswordResponseDto } from './dto';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';

/**
 * Controller for handling authentication-related requests.
 *
 * Provides endpoints for user registration, login, token refreshing, logout, and retrieving current user details.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Registers a new user.
   *
   * @param dto - The registration data containing user details.
   * @returns {Promise<AuthResponseDto>} The authentication response containing tokens and user info.
   */
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User with this email already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  /**
   * Authenticates a user with email and password.
   *
   * @param dto - The login credentials.
   * @returns {Promise<AuthResponseDto>} The authentication response containing tokens and user info.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully logged in',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  /**
   * Refreshes the access token using a valid refresh token.
   *
   * @param dto - The refresh token data.
   * @returns {Promise<AuthResponseDto>} The new authentication response containing fresh tokens.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token successfully refreshed',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired refresh token',
  })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  /**
   * Logs out the user and revokes the refresh token.
   *
   * @param user - The current authenticated user payload.
   * @param dto - The refresh token to be revoked.
   * @returns {Promise<void>}
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'User successfully logged out',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  async logout(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RefreshTokenDto,
  ): Promise<void> {
    await this.authService.logout(user.userId, dto.refreshToken);
  }

  /**
   * Retrieves the currently authenticated user's information.
   *
   * @param user - The current authenticated user payload.
   * @returns The user details.
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current user information',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  async getCurrentUser(@CurrentUser() user: CurrentUserPayload) {
    return user;
  }

  /**
   * Changes the current user's password.
   *
   * @param user - The current authenticated user payload.
   * @param dto - The change password data.
   * @returns {Promise<ChangePasswordResponseDto>} Success response.
   */
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully',
    type: ChangePasswordResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error (passwords don\'t match, same as current, etc.)',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Current password is incorrect or not authenticated',
  })
  async changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<ChangePasswordResponseDto> {
    return this.authService.changePassword(user.userId, dto);
  }
}
