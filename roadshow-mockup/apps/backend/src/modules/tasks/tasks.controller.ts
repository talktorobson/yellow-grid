import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import {
  TasksService,
  CreateTaskDto,
  CreateAlertDto,
} from './tasks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  TaskType,
  TaskPriority,
  TaskStatus,
  AlertType,
  AlertSeverity,
} from '../../common/types/schema.types';

@ApiTags('tasks')
@Controller('api/v1/tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // ==================== TASK ENDPOINTS ====================

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  async createTask(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.createTask(createTaskDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks with filters' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  @ApiQuery({ name: 'assignedToId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiQuery({ name: 'priority', required: false, enum: TaskPriority })
  @ApiQuery({ name: 'type', required: false, enum: TaskType })
  @ApiQuery({ name: 'serviceOrderId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAllTasks(
    @Query('assignedToId') assignedToId?: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: TaskPriority,
    @Query('type') type?: TaskType,
    @Query('serviceOrderId') serviceOrderId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.tasksService.findAllTasks({
      assignedToId,
      status,
      priority,
      type,
      serviceOrderId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('operator/:operatorId/stats')
  @ApiOperation({ summary: 'Get task statistics for operator' })
  @ApiResponse({ status: 200, description: 'Task statistics' })
  async getOperatorStats(@Param('operatorId') operatorId: string) {
    return this.tasksService.getOperatorTaskStats(operatorId);
  }

  @Get('operator/:operatorId/count')
  @ApiOperation({ summary: 'Get pending task count for operator' })
  @ApiResponse({ status: 200, description: 'Pending task count' })
  async getPendingCount(@Param('operatorId') operatorId: string) {
    const count = await this.tasksService.getPendingTaskCount(operatorId);
    return { count };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiResponse({ status: 200, description: 'Task details' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findOneTask(@Param('id') id: string) {
    return this.tasksService.findOneTask(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update task' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async updateTask(
    @Param('id') id: string,
    @Body()
    data: {
      status?: TaskStatus;
      priority?: TaskPriority;
      assignedToId?: string;
      dueDate?: Date;
      description?: string;
      resolution?: string;
    }
  ) {
    return this.tasksService.updateTask(id, data);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign task to operator' })
  @ApiResponse({ status: 200, description: 'Task assigned successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async assignTask(
    @Param('id') id: string,
    @Body() body: { operatorId: string }
  ) {
    return this.tasksService.assignTask(id, body.operatorId);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Mark task as in progress' })
  @ApiResponse({ status: 200, description: 'Task started' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async startTask(@Param('id') id: string) {
    return this.tasksService.startTask(id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete task' })
  @ApiResponse({ status: 200, description: 'Task completed successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async completeTask(
    @Param('id') id: string,
    @Body() body: { resolution?: string }
  ) {
    return this.tasksService.completeTask(id, body.resolution);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel task' })
  @ApiResponse({ status: 200, description: 'Task cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async cancelTask(
    @Param('id') id: string,
    @Body() body: { reason?: string }
  ) {
    return this.tasksService.cancelTask(id, body.reason);
  }

  // ==================== ALERT ENDPOINTS ====================

  @Post('alerts')
  @ApiOperation({ summary: 'Create a new alert' })
  @ApiResponse({ status: 201, description: 'Alert created successfully' })
  async createAlert(@Body() createAlertDto: CreateAlertDto) {
    return this.tasksService.createAlert(createAlertDto);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get all alerts with filters' })
  @ApiResponse({ status: 200, description: 'List of alerts' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'severity', required: false, enum: AlertSeverity })
  @ApiQuery({ name: 'type', required: false, enum: AlertType })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiQuery({ name: 'serviceOrderId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAllAlerts(
    @Query('userId') userId?: string,
    @Query('severity') severity?: AlertSeverity,
    @Query('type') type?: AlertType,
    @Query('isRead') isRead?: string,
    @Query('serviceOrderId') serviceOrderId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.tasksService.findAllAlerts({
      userId,
      severity,
      type,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      serviceOrderId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('alerts/user/:userId/unread-count')
  @ApiOperation({ summary: 'Get unread alert count for user' })
  @ApiResponse({ status: 200, description: 'Unread alert count' })
  async getUnreadAlertCount(@Param('userId') userId: string) {
    const count = await this.tasksService.getUnreadAlertCount(userId);
    return { count };
  }

  @Get('alerts/:id')
  @ApiOperation({ summary: 'Get alert by ID' })
  @ApiResponse({ status: 200, description: 'Alert details' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async findOneAlert(@Param('id') id: string) {
    return this.tasksService.findOneAlert(id);
  }

  @Post('alerts/:id/read')
  @ApiOperation({ summary: 'Mark alert as read' })
  @ApiResponse({ status: 200, description: 'Alert marked as read' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async markAlertAsRead(@Param('id') id: string) {
    return this.tasksService.markAlertAsRead(id);
  }

  @Post('alerts/user/:userId/read-all')
  @ApiOperation({ summary: 'Mark all alerts as read for user' })
  @ApiResponse({ status: 200, description: 'All alerts marked as read' })
  async markAllAlertsAsRead(@Param('userId') userId: string) {
    return this.tasksService.markAllAlertsAsRead(userId);
  }

  @Post('alerts/:id/create-task')
  @ApiOperation({ summary: 'Create task from alert' })
  @ApiResponse({ status: 201, description: 'Task created from alert' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async createTaskFromAlert(
    @Param('id') id: string,
    @Body() body: { assignedToId?: string }
  ) {
    return this.tasksService.createTaskFromAlert(id, body.assignedToId);
  }

  @Delete('alerts/:id')
  @ApiOperation({ summary: 'Delete alert' })
  @ApiResponse({ status: 200, description: 'Alert deleted successfully' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async deleteAlert(@Param('id') id: string) {
    return this.tasksService.deleteAlert(id);
  }
}
