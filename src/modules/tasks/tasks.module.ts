import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskAssignmentService } from './services/task-assignment.service';
import { TaskSlaService } from './services/task-sla.service';
import { TaskEscalationService } from './services/task-escalation.service';
import { TaskAuditService } from './services/task-audit.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { KafkaModule } from '../../common/kafka/kafka.module';

@Module({
  imports: [PrismaModule, KafkaModule, ScheduleModule.forRoot()],
  controllers: [TasksController],
  providers: [
    TasksService,
    TaskAssignmentService,
    TaskSlaService,
    TaskEscalationService,
    TaskAuditService,
  ],
  exports: [TasksService],
})
export class TasksModule {}
