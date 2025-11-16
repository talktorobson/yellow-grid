import {
  Controller,
  Get,
  Post,
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
  WCFService,
  CreateWCFDto,
  SignWCFDto,
} from './wcf.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WCFStatus } from '../../common/types/schema.types';

@ApiTags('wcf')
@Controller('api/v1/wcf')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WCFController {
  constructor(private readonly wcfService: WCFService) {}

  @Post()
  @ApiOperation({ summary: 'Create WCF after execution check-out' })
  @ApiResponse({ status: 201, description: 'WCF created successfully' })
  @ApiResponse({ status: 400, description: 'Execution not in correct status' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async create(@Body() createWCFDto: CreateWCFDto) {
    return this.wcfService.create(createWCFDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all WCFs with filters' })
  @ApiResponse({ status: 200, description: 'List of WCFs' })
  @ApiQuery({ name: 'status', required: false, enum: WCFStatus })
  @ApiQuery({ name: 'serviceOrderId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(
    @Query('status') status?: WCFStatus,
    @Query('serviceOrderId') serviceOrderId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.wcfService.findAll({
      status,
      serviceOrderId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get WCF statistics' })
  @ApiResponse({ status: 200, description: 'WCF statistics' })
  @ApiQuery({ name: 'projectId', required: false })
  async getStatistics(@Query('projectId') projectId?: string) {
    return this.wcfService.getStatistics({ projectId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get WCF by ID' })
  @ApiResponse({ status: 200, description: 'WCF details' })
  @ApiResponse({ status: 404, description: 'WCF not found' })
  async findOne(@Param('id') id: string) {
    return this.wcfService.findOne(id);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send WCF to customer' })
  @ApiResponse({ status: 200, description: 'WCF sent successfully' })
  @ApiResponse({ status: 400, description: 'WCF not in correct status' })
  @ApiResponse({ status: 404, description: 'WCF not found' })
  async send(@Param('id') id: string) {
    return this.wcfService.send(id);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Customer signs WCF' })
  @ApiResponse({ status: 200, description: 'WCF signed successfully' })
  @ApiResponse({ status: 400, description: 'WCF not in correct status' })
  @ApiResponse({ status: 404, description: 'WCF not found' })
  async sign(
    @Param('id') id: string,
    @Body() signatureData: SignWCFDto,
  ) {
    return this.wcfService.sign(id, signatureData);
  }

  @Post(':id/defects')
  @ApiOperation({ summary: 'Add defect to WCF (before sending)' })
  @ApiResponse({ status: 200, description: 'Defect added successfully' })
  @ApiResponse({ status: 400, description: 'Cannot add defects to non-pending WCF' })
  @ApiResponse({ status: 404, description: 'WCF not found' })
  async addDefect(
    @Param('id') id: string,
    @Body() defect: {
      description: string;
      severity?: string;
      photo?: string;
    },
  ) {
    return this.wcfService.addDefect(id, defect);
  }
}
