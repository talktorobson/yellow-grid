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
  ContractsService,
  CreateContractDto,
  SignContractDto,
} from './contracts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ContractStatus } from '../../common/types/schema.types';

@ApiTags('contracts')
@Controller('api/v1/contracts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contract by bundling service orders' })
  @ApiResponse({ status: 201, description: 'Contract created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid service orders' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async create(@Body() createContractDto: CreateContractDto) {
    return this.contractsService.create(createContractDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all contracts with filters' })
  @ApiResponse({ status: 200, description: 'List of contracts' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ContractStatus })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(
    @Query('projectId') projectId?: string,
    @Query('status') status?: ContractStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.contractsService.findAll({
      projectId,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('project/:projectId/stats')
  @ApiOperation({ summary: 'Get contract statistics for a project' })
  @ApiResponse({ status: 200, description: 'Contract statistics' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getProjectStats(@Param('projectId') projectId: string) {
    return this.contractsService.getProjectContractStats(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contract by ID' })
  @ApiResponse({ status: 200, description: 'Contract details' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async findOne(@Param('id') id: string) {
    return this.contractsService.findOne(id);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send contract to customer' })
  @ApiResponse({ status: 200, description: 'Contract sent successfully' })
  @ApiResponse({ status: 400, description: 'Contract not in correct status' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async send(@Param('id') id: string) {
    return this.contractsService.send(id);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Customer signs the contract (digital signature)' })
  @ApiResponse({ status: 200, description: 'Contract signed successfully' })
  @ApiResponse({ status: 400, description: 'Contract not in correct status or expired' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async sign(
    @Param('id') id: string,
    @Body() signatureData: SignContractDto,
  ) {
    return this.contractsService.sign(id, signatureData);
  }

  @Post(':id/refuse')
  @ApiOperation({ summary: 'Customer refuses the contract' })
  @ApiResponse({ status: 200, description: 'Contract refused' })
  @ApiResponse({ status: 400, description: 'Contract not in correct status' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async refuse(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.contractsService.refuse(id, body.reason);
  }

  @Post(':id/skip')
  @ApiOperation({ summary: 'Skip contract signature (operator derogation)' })
  @ApiResponse({ status: 200, description: 'Contract skipped' })
  @ApiResponse({ status: 400, description: 'Contract not in correct status' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async skip(
    @Param('id') id: string,
    @Body() body: { reason: string; operatorId: string },
  ) {
    return this.contractsService.skip(id, body.reason, body.operatorId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel contract (only from PENDING status)' })
  @ApiResponse({ status: 200, description: 'Contract cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Contract cannot be cancelled' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async cancel(@Param('id') id: string) {
    return this.contractsService.cancel(id);
  }
}
