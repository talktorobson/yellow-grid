import { IsEnum, IsNumber, IsOptional, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SimulatorScenario {
    STANDARD_INSTALLATION = 'STANDARD_INSTALLATION',
    EMERGENCY_REPAIR = 'EMERGENCY_REPAIR',
    VIP_MAINTENANCE = 'VIP_MAINTENANCE',
    PROJECT_ROLLOUT = 'PROJECT_ROLLOUT',
}

export class SimulatorTriggerRequestDto {
    @ApiProperty({
        description: 'Scenario to simulate',
        enum: SimulatorScenario,
        example: SimulatorScenario.STANDARD_INSTALLATION,
    })
    @IsEnum(SimulatorScenario)
    scenario: SimulatorScenario;

    @ApiPropertyOptional({
        description: 'Number of orders to generate',
        default: 1,
        minimum: 1,
        maximum: 100,
    })
    @IsNumber()
    @Min(1)
    @Max(100)
    @IsOptional()
    count?: number;

    @ApiPropertyOptional({
        description: 'Overrides for generated data (deep merge)',
        example: { customer: { email: 'test@example.com' } },
    })
    @IsObject()
    @IsOptional()
    overrides?: Record<string, any>;
}
