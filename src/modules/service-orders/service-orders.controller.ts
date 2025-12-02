import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ServiceOrdersService } from './service-orders.service';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { ScheduleServiceOrderDto } from './dto/schedule-service-order.dto';
import { AssignServiceOrderDto } from './dto/assign-service-order.dto';
import { ServiceOrderResponseDto } from './dto/service-order-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ServiceOrderState } from '@prisma/client';

/**
 * Controller for managing service orders.
 *
 * Handles creation, retrieval, updates, scheduling, assignment, cancellation, and deletion of service orders.
 */
@ApiTags('Service Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('service-orders')
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  /**
   * Creates a new service order.
   *
   * @param createDto - The service order creation data.
   * @param req - The HTTP request containing user info.
   * @returns {Promise<ServiceOrderResponseDto>} The created service order.
   */
  @Post()
  @Roles('ADMIN', 'OPERATOR')
  @ApiOperation({ summary: 'Create a new service order' })
  @ApiResponse({
    status: 201,
    description: 'Service order created successfully',
    type: ServiceOrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() createDto: CreateServiceOrderDto, @Request() req: any) {
    return this.serviceOrdersService.create(createDto, req.user?.email);
  }

  /**
   * Lists all service orders with optional filtering.
   *
   * @param skip - Number of records to skip.
   * @param take - Number of records to take.
   * @param countryCode - Filter by country code.
   * @param businessUnit - Filter by business unit.
   * @param state - Filter by service order state.
   * @param urgency - Filter by urgency level (URGENT, STANDARD, LOW).
   * @param assignedProviderId - Filter by assigned provider.
   * @param projectId - Filter by project ID.
   * @returns A list of service orders.
   */
  @Get()
  @Roles('ADMIN', 'OPERATOR', 'PROVIDER_MANAGER')
  @ApiOperation({ summary: 'List all service orders with filters' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'countryCode', required: false })
  @ApiQuery({ name: 'businessUnit', required: false })
  @ApiQuery({ name: 'state', required: false, enum: ServiceOrderState })
  @ApiQuery({ name: 'urgency', required: false })
  @ApiQuery({ name: 'assignedProviderId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiResponse({
    status: 200,
    description: 'List of service orders',
    type: [ServiceOrderResponseDto],
  })
  async findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('countryCode') countryCode?: string,
    @Query('businessUnit') businessUnit?: string,
    @Query('state') state?: ServiceOrderState,
    @Query('urgency') urgency?: string,
    @Query('assignedProviderId') assignedProviderId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.serviceOrdersService.findAll({
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      countryCode,
      businessUnit,
      state,
      urgency,
      assignedProviderId,
      projectId,
    });
  }

  /**
   * Retrieves a service order by ID.
   *
   * @param id - The service order ID.
   * @returns {Promise<ServiceOrderResponseDto>} The service order details.
   */
  @Get(':id')
  @Roles('ADMIN', 'OPERATOR', 'PROVIDER_MANAGER')
  @ApiOperation({ summary: 'Get a service order by ID' })
  @ApiResponse({
    status: 200,
    description: 'Service order details',
    type: ServiceOrderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Service order not found' })
  async findOne(@Param('id') id: string) {
    return this.serviceOrdersService.findOne(id);
  }

  /**
   * Updates a service order.
   *
   * @param id - The service order ID.
   * @param updateDto - The update data.
   * @param req - The HTTP request containing user info.
   * @returns {Promise<ServiceOrderResponseDto>} The updated service order.
   */
  @Patch(':id')
  @Roles('ADMIN', 'OPERATOR')
  @ApiOperation({ summary: 'Update a service order' })
  @ApiResponse({
    status: 200,
    description: 'Service order updated successfully',
    type: ServiceOrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Service order not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateServiceOrderDto,
    @Request() req: any,
  ) {
    return this.serviceOrdersService.update(id, updateDto, req.user?.email);
  }

  /**
   * Schedules a service order.
   *
   * @param id - The service order ID.
   * @param scheduleDto - The scheduling data.
   * @param req - The HTTP request containing user info.
   * @returns {Promise<ServiceOrderResponseDto>} The scheduled service order.
   */
  @Post(':id/schedule')
  @Roles('ADMIN', 'OPERATOR')
  @ApiOperation({ summary: 'Schedule a service order (assign time slot)' })
  @ApiResponse({
    status: 200,
    description: 'Service order scheduled successfully',
    type: ServiceOrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Service order not found' })
  async schedule(
    @Param('id') id: string,
    @Body() scheduleDto: ScheduleServiceOrderDto,
    @Request() req: any,
  ) {
    return this.serviceOrdersService.schedule(id, scheduleDto, req.user?.email);
  }

  /**
   * Assigns a provider to a service order.
   *
   * @param id - The service order ID.
   * @param assignDto - The assignment data.
   * @param req - The HTTP request containing user info.
   * @returns {Promise<ServiceOrderResponseDto>} The assigned service order.
   */
  @Post(':id/assign')
  @Roles('ADMIN', 'OPERATOR')
  @ApiOperation({ summary: 'Assign a provider to a service order' })
  @ApiResponse({
    status: 200,
    description: 'Provider assigned successfully',
    type: ServiceOrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Service order not found' })
  async assign(
    @Param('id') id: string,
    @Body() assignDto: AssignServiceOrderDto,
    @Request() req: any,
  ) {
    return this.serviceOrdersService.assign(id, assignDto, req.user?.email);
  }

  /**
   * Cancels a service order.
   *
   * @param id - The service order ID.
   * @param reason - The reason for cancellation.
   * @param req - The HTTP request containing user info.
   * @returns {Promise<ServiceOrderResponseDto>} The cancelled service order.
   */
  @Post(':id/cancel')
  @Roles('ADMIN', 'OPERATOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a service order' })
  @ApiResponse({
    status: 200,
    description: 'Service order cancelled successfully',
    type: ServiceOrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Service order not found' })
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    return this.serviceOrdersService.cancel(id, reason, req.user?.email);
  }

  /**
   * Retrieves unsatisfied dependencies for a service order.
   *
   * @param id - The service order ID.
   * @returns A list of unsatisfied dependencies.
   */
  @Get(':id/dependencies')
  @Roles('ADMIN', 'OPERATOR')
  @ApiOperation({ summary: 'Get unsatisfied dependencies for a service order' })
  @ApiResponse({
    status: 200,
    description: 'List of unsatisfied dependencies',
  })
  async getUnsatisfiedDependencies(@Param('id') id: string) {
    return this.serviceOrdersService.getUnsatisfiedDependencies(id);
  }

  /**
   * Deletes a service order.
   *
   * @param id - The service order ID.
   * @param req - The HTTP request containing user info.
   * @returns {Promise<void>}
   */
  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a service order (admin only, CREATED/CANCELLED states only)' })
  @ApiResponse({ status: 204, description: 'Service order deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete service order in current state' })
  @ApiResponse({ status: 404, description: 'Service order not found' })
  async remove(@Param('id') id: string, @Request() req: any) {
    await this.serviceOrdersService.remove(id, req.user?.email);
  }
}
