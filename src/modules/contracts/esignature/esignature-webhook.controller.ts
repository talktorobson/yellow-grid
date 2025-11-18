import { Controller, Post, Body, Headers, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { ESignatureService } from './esignature.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { WebhookEventType } from './interfaces/esignature-provider.interface';
import { ContractStatus, SignatureStatus } from '@prisma/client';

/**
 * E-Signature Webhook Controller
 *
 * Handles webhook callbacks from e-signature providers (DocuSign, Adobe Sign).
 * Updates contract and signature status based on events.
 */
@Controller('api/v1/webhooks/esignature')
export class ESignatureWebhookController {
  private readonly logger = new Logger(ESignatureWebhookController.name);

  constructor(
    private readonly eSignatureService: ESignatureService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generic webhook endpoint for all e-signature providers
   * The provider implementation will validate the signature and parse the event
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ): Promise<{ received: boolean }> {
    try {
      this.logger.log('Received e-signature webhook event');

      // Process the webhook through the provider
      const eventData = await this.eSignatureService.processWebhook(payload, headers);

      this.logger.log(
        `Processing webhook event: ${eventData.eventType} for envelope ${eventData.envelopeId}`,
      );

      // Handle the event
      await this.handleWebhookEvent(eventData);

      return { received: true };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`, error.stack);

      // Return 200 anyway to prevent provider from retrying invalid requests
      // (provider signature validation failures should not trigger retries)
      return { received: false };
    }
  }

  /**
   * DocuSign-specific webhook endpoint (if needed for backward compatibility)
   */
  @Post('docusign')
  @HttpCode(HttpStatus.OK)
  async handleDocuSignWebhook(
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ): Promise<{ received: boolean }> {
    return this.handleWebhook(payload, headers);
  }

  /**
   * Adobe Sign-specific webhook endpoint (if needed for backward compatibility)
   */
  @Post('adobe-sign')
  @HttpCode(HttpStatus.OK)
  async handleAdobeSignWebhook(
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ): Promise<{ received: boolean }> {
    return this.handleWebhook(payload, headers);
  }

  // ==========================================================================
  // Event Handling
  // ==========================================================================

  private async handleWebhookEvent(eventData: any): Promise<void> {
    const { eventType, envelopeId, signer } = eventData;

    // Find contract by provider envelope ID
    const contract = await this.prisma.contract.findFirst({
      where: {
        providerEnvelopeId: envelopeId,
      },
      include: {
        signatures: true,
      },
    });

    if (!contract) {
      this.logger.warn(`Contract not found for envelope ${envelopeId}`);
      return;
    }

    this.logger.log(`Found contract ${contract.contractNumber} for envelope ${envelopeId}`);

    // Handle event based on type
    switch (eventType) {
      case WebhookEventType.ENVELOPE_SENT:
        await this.handleEnvelopeSent(contract.id);
        break;

      case WebhookEventType.ENVELOPE_DELIVERED:
        await this.handleEnvelopeDelivered(contract.id);
        break;

      case WebhookEventType.ENVELOPE_COMPLETED:
        await this.handleEnvelopeCompleted(contract.id, envelopeId);
        break;

      case WebhookEventType.ENVELOPE_DECLINED:
        await this.handleEnvelopeDeclined(contract.id, eventData.data?.reason);
        break;

      case WebhookEventType.ENVELOPE_VOIDED:
        await this.handleEnvelopeVoided(contract.id, eventData.data?.reason);
        break;

      case WebhookEventType.RECIPIENT_SENT:
        if (signer) {
          await this.handleRecipientSent(contract.id, signer.email);
        }
        break;

      case WebhookEventType.RECIPIENT_DELIVERED:
        if (signer) {
          await this.handleRecipientDelivered(contract.id, signer.email);
        }
        break;

      case WebhookEventType.RECIPIENT_SIGNED:
        if (signer) {
          await this.handleRecipientSigned(contract.id, signer);
        }
        break;

      case WebhookEventType.RECIPIENT_DECLINED:
        if (signer) {
          await this.handleRecipientDeclined(contract.id, signer.email, eventData.data?.reason);
        }
        break;

      case WebhookEventType.RECIPIENT_AUTHENTICATION_FAILED:
        if (signer) {
          await this.handleRecipientAuthFailed(contract.id, signer.email);
        }
        break;

      default:
        this.logger.warn(`Unhandled webhook event type: ${eventType}`);
    }
  }

  private async handleEnvelopeSent(contractId: string): Promise<void> {
    await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        status: ContractStatus.SENT,
        sentAt: new Date(),
      },
    });

    this.logger.log(`Contract ${contractId} marked as SENT`);
  }

  private async handleEnvelopeDelivered(contractId: string): Promise<void> {
    // Contract status remains SENT, but we could track this event
    this.logger.log(`Envelope delivered for contract ${contractId}`);
  }

  private async handleEnvelopeCompleted(
    contractId: string,
    envelopeId: string,
  ): Promise<void> {
    try {
      // Download the signed document
      this.logger.log(`Downloading signed document for contract ${contractId}`);

      const signedDoc = await this.eSignatureService.downloadSignedDocument(envelopeId);

      // Update contract with signed document
      await this.prisma.contract.update({
        where: { id: contractId },
        data: {
          status: ContractStatus.SIGNED,
          signedAt: new Date(),
          signedDocumentUrl: `esignature://${envelopeId}`, // Placeholder - should store in GCS/S3
          signedDocumentChecksum: signedDoc.checksum,
        },
      });

      this.logger.log(`Contract ${contractId} marked as SIGNED`);
    } catch (error) {
      this.logger.error(
        `Failed to download signed document for contract ${contractId}: ${error.message}`,
        error.stack,
      );
      // Don't throw - we'll retry later if needed
    }
  }

  private async handleEnvelopeDeclined(contractId: string, reason?: string): Promise<void> {
    await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        status: ContractStatus.CANCELLED,
        // Could store decline reason in metadata
      },
    });

    this.logger.log(`Contract ${contractId} declined: ${reason || 'No reason provided'}`);
  }

  private async handleEnvelopeVoided(contractId: string, reason?: string): Promise<void> {
    await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        status: ContractStatus.CANCELLED,
        // Could store void reason in metadata
      },
    });

    this.logger.log(`Contract ${contractId} voided: ${reason || 'No reason provided'}`);
  }

  private async handleRecipientSent(contractId: string, email: string): Promise<void> {
    const signature = await this.prisma.contractSignature.findFirst({
      where: {
        contractId,
        signerEmail: email,
      },
    });

    if (signature) {
      await this.prisma.contractSignature.update({
        where: { id: signature.id },
        data: {
          status: SignatureStatus.REQUESTED,
        },
      });

      this.logger.log(`Signature request sent to ${email} for contract ${contractId}`);
    }
  }

  private async handleRecipientDelivered(contractId: string, email: string): Promise<void> {
    const signature = await this.prisma.contractSignature.findFirst({
      where: {
        contractId,
        signerEmail: email,
      },
    });

    if (signature) {
      await this.prisma.contractSignature.update({
        where: { id: signature.id },
        data: {
          status: SignatureStatus.REQUESTED,
          // Could track "viewed" timestamp
        },
      });

      this.logger.log(`Signature request delivered to ${email} for contract ${contractId}`);
    }
  }

  private async handleRecipientSigned(
    contractId: string,
    signer: { email: string; name: string; signedAt?: Date; ipAddress?: string },
  ): Promise<void> {
    const signature = await this.prisma.contractSignature.findFirst({
      where: {
        contractId,
        signerEmail: signer.email,
      },
    });

    if (signature) {
      await this.prisma.contractSignature.update({
        where: { id: signature.id },
        data: {
          status: SignatureStatus.SIGNED,
          signedAt: signer.signedAt || new Date(),
          signerName: signer.name,
          evidence: {
            ipAddress: signer.ipAddress,
            signedAt: signer.signedAt?.toISOString(),
          },
        },
      });

      this.logger.log(`Signature completed by ${signer.email} for contract ${contractId}`);
    }
  }

  private async handleRecipientDeclined(
    contractId: string,
    email: string,
    reason?: string,
  ): Promise<void> {
    const signature = await this.prisma.contractSignature.findFirst({
      where: {
        contractId,
        signerEmail: email,
      },
    });

    if (signature) {
      await this.prisma.contractSignature.update({
        where: { id: signature.id },
        data: {
          status: SignatureStatus.REQUESTED, // Keep as requested since Prisma doesn't have DECLINED
          // Could store decline reason in evidence
        },
      });

      this.logger.log(
        `Signature declined by ${email} for contract ${contractId}: ${reason || 'No reason'}`,
      );
    }
  }

  private async handleRecipientAuthFailed(contractId: string, email: string): Promise<void> {
    this.logger.warn(
      `Authentication failed for ${email} on contract ${contractId}. ` +
        'Signer may need to re-attempt verification.',
    );
    // Could send notification or track failed attempts
  }
}
