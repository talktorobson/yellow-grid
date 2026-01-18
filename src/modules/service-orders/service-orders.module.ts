import { Module, forwardRef } from '@nestjs/common';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';
import { ServiceOrderStateMachineService } from './service-order-state-machine.service';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { ServiceOrdersEventHandler } from './service-orders.event-handler';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, SchedulingModule, forwardRef(() => NotificationsModule)],
  controllers: [ServiceOrdersController, AssignmentsController],
  providers: [
    ServiceOrdersService,
    ServiceOrderStateMachineService,
    AssignmentsService,
    ServiceOrdersEventHandler,
  ],
  exports: [ServiceOrdersService, ServiceOrderStateMachineService, AssignmentsService],
})
export class ServiceOrdersModule {}
