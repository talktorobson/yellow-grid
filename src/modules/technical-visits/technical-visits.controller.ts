import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TechnicalVisitsService } from './technical-visits.service';
import {
  RecordTvOutcomeDto,
  LinkInstallationDto,
  TvOutcomeResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Technical Visits')
@ApiBearerAuth()
@Controller('api/v1/technical-visits')
@UseGuards(JwtAuthGuard)
export class TechnicalVisitsController {
  constructor(
    private readonly technicalVisitsService: TechnicalVisitsService,
  ) {}

  @Post('outcomes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Record Technical Visit outcome',
    description:
      'Record the outcome of a Technical Visit (YES / YES-BUT / NO). This determines whether the linked installation can proceed.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'TV outcome recorded successfully',
    type: TvOutcomeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request (e.g., not a TV service order, missing modifications for YES_BUT)',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'TV service order or linked installation not found',
  })
  async recordOutcome(
    @Body() recordDto: RecordTvOutcomeDto,
    @CurrentUser('sub') userId: string,
  ): Promise<TvOutcomeResponseDto> {
    return this.technicalVisitsService.recordOutcome(recordDto, userId);
  }

  @Get('outcomes/:outcomeId')
  @ApiOperation({
    summary: 'Get TV outcome by ID',
    description: 'Retrieve a specific TV outcome record by its ID',
  })
  @ApiParam({
    name: 'outcomeId',
    description: 'TV Outcome ID',
    example: 'tvo_abc123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'TV outcome retrieved successfully',
    type: TvOutcomeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'TV outcome not found',
  })
  async getOutcome(
    @Param('outcomeId') outcomeId: string,
  ): Promise<TvOutcomeResponseDto> {
    return this.technicalVisitsService.getOutcome(outcomeId);
  }

  @Get('service-orders/:tvServiceOrderId/outcome')
  @ApiOperation({
    summary: 'Get TV outcome by TV service order ID',
    description: 'Retrieve the TV outcome for a specific TV service order',
  })
  @ApiParam({
    name: 'tvServiceOrderId',
    description: 'TV Service Order ID',
    example: 'so_tv_123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'TV outcome retrieved successfully',
    type: TvOutcomeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'TV outcome not found for this service order',
  })
  async getOutcomeByTvId(
    @Param('tvServiceOrderId') tvServiceOrderId: string,
  ): Promise<TvOutcomeResponseDto> {
    return this.technicalVisitsService.getOutcomeByTvId(tvServiceOrderId);
  }

  @Post(':tvServiceOrderId/link-installation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Link installation to TV',
    description: 'Link an installation service order to a TV. Creates a dependency if TV outcome blocks installation.',
  })
  @ApiParam({
    name: 'tvServiceOrderId',
    description: 'TV Service Order ID',
    example: 'so_tv_123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Installation linked successfully',
    type: TvOutcomeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'TV outcome or installation order not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid installation order (not INSTALLATION type)',
  })
  async linkInstallation(
    @Param('tvServiceOrderId') tvServiceOrderId: string,
    @Body() linkDto: LinkInstallationDto,
  ): Promise<TvOutcomeResponseDto> {
    return this.technicalVisitsService.linkInstallation(
      tvServiceOrderId,
      linkDto,
    );
  }

  @Patch('outcomes/:outcomeId/approve-scope-change')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve scope change for YES_BUT outcome',
    description:
      'Approve the scope change requested by a YES_BUT outcome. This unblocks the linked installation order.',
  })
  @ApiParam({
    name: 'outcomeId',
    description: 'TV Outcome ID',
    example: 'tvo_abc123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scope change approved successfully',
    type: TvOutcomeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'TV outcome not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Outcome is not YES_BUT or already approved',
  })
  async approveScopeChange(
    @Param('outcomeId') outcomeId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<TvOutcomeResponseDto> {
    return this.technicalVisitsService.approveScopeChange(outcomeId, userId);
  }
}
