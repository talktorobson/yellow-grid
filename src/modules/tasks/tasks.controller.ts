import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { CancelTaskDto } from './dto/cancel-task.dto';
import { PauseSlaDto } from './dto/pause-sla.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - duplicate task or invalid service order',
  })
  async create(@Body() createTaskDto: CreateTaskDto, @Request() req) {
    return this.tasksService.create(createTaskDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all tasks with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Tasks retrieved successfully',
  })
  async findAll(@Query() query: QueryTasksDto) {
    return this.tasksService.findAll(query);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get operator dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
  })
  async getOperatorDashboard(@Request() req) {
    return this.tasksService.getOperatorDashboard(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Task retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  async findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task details' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req,
  ) {
    return this.tasksService.update(id, updateTaskDto, req.user.userId);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign task to operator' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Task assigned successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot assign task in current status',
  })
  async assign(
    @Param('id') id: string,
    @Body() assignTaskDto: AssignTaskDto,
    @Request() req,
  ) {
    return this.tasksService.assign(id, assignTaskDto, req.user.userId);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start working on a task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Task started successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot start task in current status',
  })
  async start(@Param('id') id: string, @Request() req) {
    return this.tasksService.start(id, req.user.userId);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Task completed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot complete task in current status',
  })
  async complete(
    @Param('id') id: string,
    @Body() completeTaskDto: CompleteTaskDto,
    @Request() req,
  ) {
    return this.tasksService.complete(id, completeTaskDto, req.user.userId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Task cancelled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel task in current status',
  })
  async cancel(
    @Param('id') id: string,
    @Body() cancelTaskDto: CancelTaskDto,
    @Request() req,
  ) {
    return this.tasksService.cancel(id, cancelTaskDto, req.user.userId);
  }

  @Post(':id/sla/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause SLA clock for a task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'SLA paused successfully',
  })
  async pauseSla(@Param('id') id: string, @Body() pauseSlaDto: PauseSlaDto) {
    return this.tasksService.pauseSla(id, pauseSlaDto);
  }

  @Post(':id/sla/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume SLA clock for a task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'SLA resumed successfully',
  })
  async resumeSla(@Param('id') id: string) {
    return this.tasksService.resumeSla(id);
  }
}
