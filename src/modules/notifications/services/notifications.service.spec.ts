import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { KafkaProducerService } from '@/common/kafka/kafka-producer.service';
import { TwilioProvider } from '../providers/twilio.provider';
import { SendGridProvider } from '../providers/sendgrid.provider';
import { TemplateEngineService } from './template-engine.service';
import { NotificationPreferencesService } from './notification-preferences.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaService: PrismaService;
  let twilioProvider: TwilioProvider;
  let sendGridProvider: SendGridProvider;
  let templateEngine: TemplateEngineService;
  let preferencesService: NotificationPreferencesService;
  let kafkaProducer: KafkaProducerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: {
            notification: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: KafkaProducerService,
          useValue: {
            send: jest.fn(),
          },
        },
        {
          provide: TwilioProvider,
          useValue: {
            sendSms: jest.fn(),
          },
        },
        {
          provide: SendGridProvider,
          useValue: {
            sendEmail: jest.fn(),
          },
        },
        {
          provide: TemplateEngineService,
          useValue: {
            renderTemplate: jest.fn(),
          },
        },
        {
          provide: NotificationPreferencesService,
          useValue: {
            shouldSendNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prismaService = module.get<PrismaService>(PrismaService);
    twilioProvider = module.get<TwilioProvider>(TwilioProvider);
    sendGridProvider = module.get<SendGridProvider>(SendGridProvider);
    templateEngine = module.get<TemplateEngineService>(TemplateEngineService);
    preferencesService = module.get<NotificationPreferencesService>(NotificationPreferencesService);
    kafkaProducer = module.get<KafkaProducerService>(KafkaProducerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendNotification', () => {
    it('should send an email notification successfully', async () => {
      // Arrange
      const mockNotification = {
        id: 'notification-123',
        recipientEmail: 'user@example.com',
        channel: 'EMAIL',
        status: 'PENDING',
      };

      const mockRenderedTemplate = {
        subject: 'Order Assigned',
        body: '<p>Your order has been assigned</p>',
      };

      jest.spyOn(preferencesService, 'shouldSendNotification').mockResolvedValue(true);
      jest.spyOn(templateEngine, 'renderTemplate').mockResolvedValue(mockRenderedTemplate);
      jest.spyOn(prismaService.notification, 'create').mockResolvedValue(mockNotification as any);
      jest.spyOn(sendGridProvider, 'sendEmail').mockResolvedValue({
        success: true,
        messageId: 'sg-123',
      });
      jest.spyOn(prismaService.notification, 'update').mockResolvedValue({} as any);
      jest.spyOn(kafkaProducer, 'send').mockResolvedValue([]);

      // Act
      const result = await service.sendNotification({
        templateCode: 'ORDER_ASSIGNED',
        recipientId: 'user-123',
        recipientEmail: 'user@example.com',
        channel: 'EMAIL',
        eventType: 'order.assigned',
        language: 'en',
        variables: {
          orderNumber: 'ORD-12345',
        },
      });

      // Assert
      expect(result).toBe('notification-123');
      expect(sendGridProvider.sendEmail).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: 'Order Assigned',
        html: '<p>Your order has been assigned</p>',
      });
      expect(kafkaProducer.send).toHaveBeenCalledWith(
        'communications.notification.sent',
        expect.objectContaining({
          notificationId: 'notification-123',
          channel: 'EMAIL',
        }),
      );
    });

    it('should send an SMS notification successfully', async () => {
      // Arrange
      const mockNotification = {
        id: 'notification-456',
        recipientPhone: '+33612345678',
        channel: 'SMS',
        status: 'PENDING',
      };

      const mockRenderedTemplate = {
        shortMessage: 'Order assigned: ORD-12345',
        body: 'Order assigned: ORD-12345',
      };

      jest.spyOn(preferencesService, 'shouldSendNotification').mockResolvedValue(true);
      jest.spyOn(templateEngine, 'renderTemplate').mockResolvedValue(mockRenderedTemplate);
      jest.spyOn(prismaService.notification, 'create').mockResolvedValue(mockNotification as any);
      jest.spyOn(twilioProvider, 'sendSms').mockResolvedValue({
        success: true,
        messageId: 'twilio-123',
      });
      jest.spyOn(prismaService.notification, 'update').mockResolvedValue({} as any);
      jest.spyOn(kafkaProducer, 'send').mockResolvedValue([]);

      // Act
      const result = await service.sendNotification({
        templateCode: 'ORDER_ASSIGNED',
        recipientId: 'user-123',
        recipientPhone: '+33612345678',
        channel: 'SMS',
        eventType: 'order.assigned',
        language: 'en',
        variables: {
          orderNumber: 'ORD-12345',
        },
      });

      // Assert
      expect(result).toBe('notification-456');
      expect(twilioProvider.sendSms).toHaveBeenCalledWith({
        to: '+33612345678',
        body: 'Order assigned: ORD-12345',
      });
    });

    it('should skip notification if user preferences do not allow', async () => {
      // Arrange
      jest.spyOn(preferencesService, 'shouldSendNotification').mockResolvedValue(false);

      // Act
      const result = await service.sendNotification({
        templateCode: 'ORDER_ASSIGNED',
        recipientId: 'user-123',
        recipientEmail: 'user@example.com',
        channel: 'EMAIL',
        eventType: 'order.assigned',
        language: 'en',
        variables: {},
      });

      // Assert
      expect(result).toBeNull();
      expect(templateEngine.renderTemplate).not.toHaveBeenCalled();
      expect(sendGridProvider.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle notification failure', async () => {
      // Arrange
      const mockNotification = {
        id: 'notification-789',
        recipientEmail: 'user@example.com',
        channel: 'EMAIL',
        status: 'PENDING',
      };

      const mockRenderedTemplate = {
        subject: 'Order Assigned',
        body: '<p>Your order has been assigned</p>',
      };

      jest.spyOn(preferencesService, 'shouldSendNotification').mockResolvedValue(true);
      jest.spyOn(templateEngine, 'renderTemplate').mockResolvedValue(mockRenderedTemplate);
      jest.spyOn(prismaService.notification, 'create').mockResolvedValue(mockNotification as any);
      jest.spyOn(sendGridProvider, 'sendEmail').mockResolvedValue({
        success: false,
        error: 'Invalid email address',
        errorCode: 'INVALID_EMAIL',
      });
      jest.spyOn(prismaService.notification, 'update').mockResolvedValue({} as any);
      jest.spyOn(kafkaProducer, 'send').mockResolvedValue([]);

      // Act & Assert
      const result = await service.sendNotification({
        templateCode: 'ORDER_ASSIGNED',
        recipientId: 'user-123',
        recipientEmail: 'user@example.com',
        channel: 'EMAIL',
        eventType: 'order.assigned',
        language: 'en',
        variables: {},
      });

      expect(result).toBe('notification-789');
      expect(prismaService.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'notification-789' },
          data: expect.objectContaining({ status: 'FAILED' }),
        }),
      );

      expect(prismaService.notification.update).toHaveBeenCalledWith({
        where: { id: 'notification-789' },
        data: expect.objectContaining({
          status: 'FAILED',
        }),
      });
    });
  });

  describe('getNotifications', () => {
    it('should retrieve notifications for a user', async () => {
      // Arrange
      const mockNotifications = [
        { id: '1', recipientId: 'user-123', channel: 'EMAIL' },
        { id: '2', recipientId: 'user-123', channel: 'SMS' },
      ];

      jest
        .spyOn(prismaService.notification, 'findMany')
        .mockResolvedValue(mockNotifications as any);

      // Act
      const result = await service.getNotifications('user-123');

      // Assert
      expect(result).toEqual(mockNotifications);
      expect(prismaService.notification.findMany).toHaveBeenCalledWith({
        where: {
          recipientId: 'user-123',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
        skip: 0,
      });
    });

    it('should filter notifications by channel and status', async () => {
      // Arrange
      const mockNotifications = [
        { id: '1', recipientId: 'user-123', channel: 'EMAIL', status: 'SENT' },
      ];

      jest
        .spyOn(prismaService.notification, 'findMany')
        .mockResolvedValue(mockNotifications as any);

      // Act
      const result = await service.getNotifications('user-123', {
        channel: 'EMAIL',
        status: 'SENT',
        limit: 10,
        offset: 0,
      });

      // Assert
      expect(result).toEqual(mockNotifications);
      expect(prismaService.notification.findMany).toHaveBeenCalledWith({
        where: {
          recipientId: 'user-123',
          channel: 'EMAIL',
          status: 'SENT',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
        skip: 0,
      });
    });
  });
});
