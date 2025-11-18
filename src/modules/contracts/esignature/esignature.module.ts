import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ESignatureConfig } from './config/esignature.config';
import { ESignatureProviderFactory } from './esignature-provider.factory';
import { ESignatureService } from './esignature.service';
import { ESignatureWebhookController } from './esignature-webhook.controller';
import { PrismaModule } from '../../../common/prisma/prisma.module';

/**
 * E-Signature Module
 *
 * Provides e-signature integration services with support for multiple providers:
 * - DocuSign
 * - Adobe Sign
 * - Mock (for testing)
 *
 * Features:
 * - Provider-agnostic abstraction layer
 * - Automatic retry with exponential backoff
 * - Webhook event processing
 * - Configuration-driven provider selection
 */
@Module({
  imports: [
    ConfigModule, // For environment variables
    PrismaModule, // For database access in webhook handler
  ],
  controllers: [ESignatureWebhookController],
  providers: [ESignatureConfig, ESignatureProviderFactory, ESignatureService],
  exports: [ESignatureService], // Export for use in other modules
})
export class ESignatureModule {}
