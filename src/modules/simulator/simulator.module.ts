import { Module } from '@nestjs/common';
import { SimulatorController } from './simulator.controller';
import { SimulatorService } from './simulator.service';
import { SalesIntegrationModule } from '../sales-integration/sales-integration.module';

@Module({
    imports: [SalesIntegrationModule],
    controllers: [SimulatorController],
    providers: [SimulatorService],
})
export class SimulatorModule { }
