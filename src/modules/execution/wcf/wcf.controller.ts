import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WcfService } from './wcf.service';
import { GenerateWcfDto } from './dto/generate-wcf.dto';
import { SubmitWcfDto } from './dto/submit-wcf.dto';

@ApiTags('WCF')
@Controller('wcf')
export class WcfController {
  constructor(private readonly wcfService: WcfService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate WCF PDF (template engine stub)' })
  @ApiResponse({ status: 201, description: 'WCF generated' })
  generate(@Body() dto: GenerateWcfDto) {
    return this.wcfService.generate(dto);
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit WCF with acceptance or refusal and signature' })
  @ApiResponse({ status: 201, description: 'WCF submitted' })
  submit(@Body() dto: SubmitWcfDto) {
    return this.wcfService.submit(dto);
  }

  @Get(':serviceOrderId')
  @ApiOperation({ summary: 'Get WCF record for a service order' })
  get(@Param('serviceOrderId') serviceOrderId: string) {
    return this.wcfService.get(serviceOrderId);
  }
}
