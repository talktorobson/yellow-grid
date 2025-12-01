import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('Notification Webhooks')
@Controller('notifications/webhooks')
@Public() // Webhooks need to be public
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post('twilio')
  @ApiOperation({ summary: 'Receive Twilio delivery status webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @HttpCode(HttpStatus.OK)
  async handleTwilioWebhook(@Body() body: any, @Headers() headers: any) {
    this.logger.log('Received Twilio webhook');

    try {
      // TODO: Verify Twilio signature
      // const signature = headers['x-twilio-signature'];
      // const isValid = validateTwilioSignature(signature, body);

      // Log webhook for processing
      await this.prisma.notificationWebhook.create({
        data: {
          notificationId: body.MessageSid, // Will be processed async
          provider: 'twilio',
          event: body.MessageStatus || 'unknown',
          payload: body,
        },
      });

      // Update notification status if we can find it
      const notification = await this.prisma.notification.findFirst({
        where: {
          providerMessageId: body.MessageSid,
        },
      });

      if (notification) {
        const statusMap: Record<string, string> = {
          delivered: 'DELIVERED',
          sent: 'SENT',
          failed: 'FAILED',
          undelivered: 'FAILED',
        };

        const status = statusMap[body.MessageStatus] || notification.status;

        await this.prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: status as any,
            ...(body.MessageStatus === 'delivered' && {
              deliveredAt: new Date(),
            }),
          },
        });

        this.logger.log(
          `Updated notification ${notification.id} status to ${status}`,
        );
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to process Twilio webhook: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @Post('sendgrid')
  @ApiOperation({ summary: 'Receive SendGrid delivery status webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @HttpCode(HttpStatus.OK)
  async handleSendGridWebhook(@Body() body: any[], @Headers() headers: any) {
    this.logger.log(`Received SendGrid webhook with ${body.length} events`);

    try {
      // SendGrid sends an array of events
      for (const event of body) {
        // Log webhook for processing
        await this.prisma.notificationWebhook.create({
          data: {
            notificationId: event['sg_message_id'], // Will be processed async
            provider: 'sendgrid',
            event: event.event || 'unknown',
            payload: event,
          },
        });

        // Update notification status if we can find it
        const notification = await this.prisma.notification.findFirst({
          where: {
            providerMessageId: event['sg_message_id'],
          },
        });

        if (notification) {
          const statusMap: Record<string, string> = {
            delivered: 'DELIVERED',
            bounce: 'BOUNCED',
            dropped: 'FAILED',
            open: 'READ',
            click: 'READ',
          };

          const status = statusMap[event.event] || notification.status;

          const updateData: any = {
            status,
          };

          // Update specific timestamps based on event
          if (event.event === 'delivered') {
            updateData.deliveredAt = new Date(event.timestamp * 1000);
          } else if (event.event === 'open') {
            updateData.readAt = new Date(event.timestamp * 1000);
          } else if (event.event === 'click') {
            updateData.clickedAt = new Date(event.timestamp * 1000);
          }

          await this.prisma.notification.update({
            where: { id: notification.id },
            data: updateData,
          });

          this.logger.log(
            `Updated notification ${notification.id} status to ${status}`,
          );
        }
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to process SendGrid webhook: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
