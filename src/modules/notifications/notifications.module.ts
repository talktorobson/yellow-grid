import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { KafkaModule } from '@/common/kafka/kafka.module';

// Providers
import { TwilioProvider } from './providers/twilio.provider';
import { SendGridProvider } from './providers/sendgrid.provider';

// Services
import { NotificationsService } from './services/notifications.service';
import { TemplateEngineService } from './services/template-engine.service';
import { NotificationPreferencesService } from './services/notification-preferences.service';
import { NotificationEventHandlerService } from './services/event-handler.service';

// Controllers
import { NotificationsController } from './controllers/notifications.controller';
import { WebhooksController } from './controllers/webhooks.controller';

@Module({
  imports: [ConfigModule, PrismaModule, KafkaModule],
  providers: [
    // External providers
    TwilioProvider,
    SendGridProvider,

    // Services
    NotificationsService,
    TemplateEngineService,
    NotificationPreferencesService,
    NotificationEventHandlerService,
  ],
  controllers: [NotificationsController, WebhooksController],
  exports: [
    NotificationsService,
    TemplateEngineService,
    NotificationPreferencesService,
    NotificationEventHandlerService,
  ],
})
export class NotificationsModule {}
