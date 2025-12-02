import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { ClsModule } from 'nestjs-cls';

// Common modules
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { KafkaModule } from './common/kafka/kafka.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { ConfigModuleApp } from './modules/config/config.module';
import { ServiceCatalogModule } from './modules/service-catalog/service-catalog.module';
import { ServiceOrdersModule } from './modules/service-orders/service-orders.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { ExecutionModule } from './modules/execution/execution.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { TechnicalVisitsModule } from './modules/technical-visits/technical-visits.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PerformanceModule } from './modules/performance/performance.module';
import { SalesIntegrationModule } from './modules/sales-integration/sales-integration.module';
import { CustomerPortalModule } from './modules/customer-portal/customer-portal.module';

// Controllers
import { AppController } from './app.controller';

/**
 * The root module of the application.
 *
 * This module imports all necessary common and feature modules,
 * configures the global application state (configuration, rate limiting, scheduling),
 * and defines the main application controller.
 */
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

    // Scheduled tasks
    ScheduleModule.forRoot(),

    // Context Local Storage (for Multi-tenancy)
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),

    // Common modules
    PrismaModule,
    RedisModule,
    KafkaModule,

    // Feature modules (Phase 1)
    AuthModule,
    UsersModule,
    ProvidersModule,
    ConfigModuleApp,
    ServiceCatalogModule,

    // Feature modules (Phase 2)
    ServiceOrdersModule,
    SchedulingModule,

    // Feature modules (Phase 3)
    ExecutionModule,
    ContractsModule,
    TechnicalVisitsModule,

    // Feature modules (Phase 4)
    TasksModule,
    NotificationsModule,
    DashboardModule,
    PerformanceModule,

    // Integration modules
    SalesIntegrationModule,

    // Customer facing modules
    CustomerPortalModule,
  ],
  controllers: [AppController],
})
export class AppModule { }
