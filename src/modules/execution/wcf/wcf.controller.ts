import { Body, Controller, Get, Param, Post, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WcfService } from './wcf.service';
import { GenerateWcfDto } from './dto/generate-wcf.dto';
import { SubmitWcfDto } from './dto/submit-wcf.dto';

@ApiTags('WCF')
@Controller('wcf')
export class WcfController {
  constructor(private readonly wcfService: WcfService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate WCF for a service order' })
  @ApiResponse({ status: 201, description: 'WCF generated successfully' })
  @ApiResponse({ status: 404, description: 'Service order not found' })
  async generate(@Body() dto: GenerateWcfDto) {
    return this.wcfService.generate(dto);
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit WCF with customer acceptance or refusal' })
  @ApiResponse({ status: 200, description: 'WCF submitted successfully' })
  @ApiResponse({ status: 404, description: 'WCF not found' })
  @ApiResponse({ status: 400, description: 'WCF already finalized' })
  async submit(@Body() dto: SubmitWcfDto) {
    return this.wcfService.submit(dto);
  }

  @Get('service-order/:serviceOrderId')
  @ApiOperation({ summary: 'Get latest WCF for a service order' })
  @ApiResponse({ status: 200, description: 'WCF found' })
  @ApiResponse({ status: 404, description: 'WCF not found' })
  async getByServiceOrder(@Param('serviceOrderId') serviceOrderId: string) {
    const wcf = await this.wcfService.get(serviceOrderId);
    if (!wcf) {
      throw new NotFoundException(`No WCF found for service order ${serviceOrderId}`);
    }
    return wcf;
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Get WCF by ID with full details' })
  @ApiResponse({ status: 200, description: 'WCF found' })
  @ApiResponse({ status: 404, description: 'WCF not found' })
  async getById(@Param('id') id: string) {
    return this.wcfService.getById(id);
  }

  @Get('number/:wcfNumber')
  @ApiOperation({ summary: 'Get WCF by WCF number' })
  @ApiResponse({ status: 200, description: 'WCF found' })
  @ApiResponse({ status: 404, description: 'WCF not found' })
  async getByWcfNumber(@Param('wcfNumber') wcfNumber: string) {
    return this.wcfService.getByWcfNumber(wcfNumber);
  }

  @Post(':id/finalize')
  @ApiOperation({ summary: 'Finalize WCF (make immutable)' })
  @ApiResponse({ status: 200, description: 'WCF finalized successfully' })
  @ApiResponse({ status: 404, description: 'WCF not found' })
  @ApiResponse({ status: 400, description: 'WCF not accepted or already finalized' })
  async finalize(
    @Param('id') id: string,
    @Body() body: { approvedBy: string }
  ) {
    return this.wcfService.finalize(id, body.approvedBy);
  }
}
