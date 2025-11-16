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
import { ProjectsService, CreateProjectDto, UpdateProjectDto } from './projects.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CountryCode, AssignmentModeConfig } from '../../common/types/schema.types';

@ApiTags('projects')
@Controller('api/v1/projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  async create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects with filters' })
  @ApiResponse({ status: 200, description: 'List of projects' })
  @ApiQuery({ name: 'countryCode', required: false, enum: CountryCode })
  @ApiQuery({ name: 'responsibleOperatorId', required: false })
  @ApiQuery({ name: 'assignmentMode', required: false, enum: AssignmentModeConfig })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(
    @Query('countryCode') countryCode?: CountryCode,
    @Query('responsibleOperatorId') responsibleOperatorId?: string,
    @Query('assignmentMode') assignmentMode?: AssignmentModeConfig,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.projectsService.findAll({
      countryCode,
      responsibleOperatorId,
      assignmentMode,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('operator-workloads')
  @ApiOperation({ summary: 'Get operator workload dashboard' })
  @ApiResponse({ status: 200, description: 'Operator workload statistics' })
  @ApiQuery({ name: 'countryCode', required: false, enum: CountryCode })
  async getOperatorWorkloads(@Query('countryCode') countryCode?: CountryCode) {
    return this.projectsService.getOperatorWorkloads(countryCode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiResponse({ status: 200, description: 'Project details' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update project' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project (only if no service orders)' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete project with service orders' })
  async remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  @Post(':id/reassign-pilote')
  @ApiOperation({ summary: 'Manually reassign Pilote du Chantier' })
  @ApiResponse({ status: 200, description: 'Pilote du Chantier reassigned' })
  @ApiResponse({ status: 404, description: 'Project or operator not found' })
  async reassignPilote(
    @Param('id') id: string,
    @Body() body: { operatorId: string },
  ) {
    return this.projectsService.reassignPiloteDuChantier(id, body.operatorId);
  }

  @Post(':id/contacts')
  @ApiOperation({ summary: 'Add contact to project' })
  @ApiResponse({ status: 201, description: 'Contact added successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async addContact(
    @Param('id') id: string,
    @Body() contact: {
      name: string;
      role?: string;
      email?: string;
      phone?: string;
      isPrimary?: boolean;
    },
  ) {
    return this.projectsService.addContact(id, contact);
  }

  @Post(':id/update-hours')
  @ApiOperation({ summary: 'Recalculate total estimated hours for project' })
  @ApiResponse({ status: 200, description: 'Hours updated successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async updateTotalHours(@Param('id') id: string) {
    const totalHours = await this.projectsService.updateTotalEstimatedHours(id);
    return {
      projectId: id,
      totalEstimatedHours: totalHours,
      message: 'Total hours updated successfully',
    };
  }
}
