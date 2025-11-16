import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { ServiceOrdersModule } from './modules/service-orders/service-orders.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { ExecutionsModule } from './modules/executions/executions.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ContractsModule } from './modules/contracts/contracts.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    ProjectsModule,
    ContractsModule,
    ProvidersModule,
    ServiceOrdersModule,
    AssignmentsModule,
    ExecutionsModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
