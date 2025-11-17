import { Module } from '@nestjs/common';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';
import { ServiceOrderStateMachineService } from './service-order-state-machine.service';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { SchedulingModule } from '../scheduling/scheduling.module';

@Module({
  imports: [PrismaModule, SchedulingModule],
  controllers: [ServiceOrdersController, AssignmentsController],
  providers: [ServiceOrdersService, ServiceOrderStateMachineService, AssignmentsService],
  exports: [ServiceOrdersService, ServiceOrderStateMachineService, AssignmentsService],
})
export class ServiceOrdersModule {}
