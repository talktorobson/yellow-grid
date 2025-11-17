import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';
import { AssignmentMode } from '@prisma/client';

class CreateAssignmentDto {
  serviceOrderId: string;
  providerIds: string[];
  workTeamId?: string;
  requestedDate?: Date;
  requestedSlot?: string;
}

class AssignmentResponseDto {
  assignmentIds: string[];
}

@ApiTags('Assignments')
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post('direct')
  @ApiOperation({ summary: 'Direct assignment to specific provider' })
  @ApiResponse({ status: 201, type: AssignmentResponseDto })
  async direct(@Body() dto: CreateAssignmentDto): Promise<AssignmentResponseDto> {
    const assignments = await this.assignmentsService.createAssignments({
      ...dto,
      mode: AssignmentMode.DIRECT,
    });
    return { assignmentIds: assignments.map((a) => a.id) };
  }

  @Post('offer')
  @ApiOperation({ summary: 'Offer assignment to specific provider (await acceptance)' })
  @ApiResponse({ status: 201, type: AssignmentResponseDto })
  async offer(@Body() dto: CreateAssignmentDto): Promise<AssignmentResponseDto> {
    const assignments = await this.assignmentsService.createAssignments({
      ...dto,
      mode: AssignmentMode.OFFER,
    });
    return { assignmentIds: assignments.map((a) => a.id) };
  }

  @Post('broadcast')
  @ApiOperation({ summary: 'Broadcast assignment to multiple providers (first-come-first-served)' })
  @ApiResponse({ status: 201, type: AssignmentResponseDto })
  async broadcast(@Body() dto: CreateAssignmentDto): Promise<AssignmentResponseDto> {
    const assignments = await this.assignmentsService.createAssignments({
      ...dto,
      mode: AssignmentMode.BROADCAST,
    });
    return { assignmentIds: assignments.map((a) => a.id) };
  }

  @Post('auto-accept')
  @ApiOperation({ summary: 'Auto-accept assignment (ES/IT default, or explicit auto)' })
  @ApiResponse({ status: 201, type: AssignmentResponseDto })
  async autoAccept(@Body() dto: CreateAssignmentDto): Promise<AssignmentResponseDto> {
    const assignments = await this.assignmentsService.createAssignments({
      ...dto,
      mode: AssignmentMode.AUTO_ACCEPT,
    });
    return { assignmentIds: assignments.map((a) => a.id) };
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Provider accepts assignment' })
  async accept(@Param('id') id: string) {
    return this.assignmentsService.acceptAssignment(id);
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Provider declines assignment' })
  async decline(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.assignmentsService.declineAssignment(id, reason);
  }
}
