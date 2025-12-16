import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SimulatorService } from './simulator.service';
import { SimulatorTriggerRequestDto } from './dto/simulator-trigger-request.dto';

@ApiTags('Simulator')
@Controller('simulator')
export class SimulatorController {
    constructor(private readonly simulatorService: SimulatorService) { }

    @Post('sales/trigger')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Trigger Sales System Simulation',
        description: 'Generates mock orders and injects them into the Sales Integration layer.',
    })
    @ApiResponse({
        status: 200,
        description: 'Simulation completed',
        schema: {
            type: 'object',
            properties: {
                generatedCount: { type: 'number' },
                scenario: { type: 'string' },
                orderIds: { type: 'array', items: { type: 'string' } },
                errors: { type: 'array', items: { type: 'string' } },
            },
        },
    })
    async triggerSimulation(@Body() request: SimulatorTriggerRequestDto) {
        return this.simulatorService.trigger(request);
    }
}
