import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserRole } from '@/modules/auth/dto/user-role.enum';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Get dashboard summary statistics' })
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Get('analytics')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Get advanced analytics data' })
  async getAnalytics(@Query('range') range: string = '30d') {
    return this.dashboardService.getAnalytics(range);
  }

  @Get('critical-actions')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Get critical actions requiring immediate attention' })
  async getCriticalActions() {
    return this.dashboardService.getCriticalActions();
  }

  @Get('priority-tasks')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Get priority tasks for dashboard' })
  async getPriorityTasks(@Query('limit') limit: string = '10') {
    return this.dashboardService.getPriorityTasks(Number.parseInt(limit, 10));
  }
}
