import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContractsService } from './contracts.service';
import { GenerateContractDto } from './dto/generate-contract.dto';
import { SendContractDto } from './dto/send-contract.dto';
import { SignContractDto } from './dto/sign-contract.dto';
import { ContractQueryDto } from './dto/filter-contracts.dto';

@ApiTags('contracts')
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @ApiOperation({ summary: 'Generate a pre-service contract from a template' })
  generate(@Body() dto: GenerateContractDto) {
    return this.contractsService.generate(dto);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send the contract via email/SMS and start signature capture' })
  send(@Param('id') id: string, @Body() dto: SendContractDto) {
    return this.contractsService.send(id, dto);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Capture an electronic signature for the contract' })
  sign(@Param('id') id: string, @Body() dto: SignContractDto) {
    return this.contractsService.sign(id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List contracts with filtering and pagination' })
  findAll(@Query() query: ContractQueryDto) {
    return this.contractsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single contract with status and history' })
  findOne(@Param('id') id: string) {
    return this.contractsService.findOne(id);
  }
}
