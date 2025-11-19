import { Test, TestingModule } from '@nestjs/testing';
import { KafkaConsumerService, MessageHandler } from './kafka-consumer.service';
import { KafkaProducerService } from './kafka-producer.service';

describe('KafkaConsumerService', () => {
  let service: KafkaConsumerService;
  let producerService: KafkaProducerService;

  const mockProducerService = {
    send: jest.fn(),
    getStatus: jest.fn().mockReturnValue({
      connected: true,
      brokers: ['localhost:9092'],
    }),
  };

  beforeEach(async () => {
    // Set KAFKA_ENABLED=false to avoid actual Kafka connections in tests
    process.env.KAFKA_ENABLED = 'false';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KafkaConsumerService,
        {
          provide: KafkaProducerService,
          useValue: mockProducerService,
        },
      ],
    }).compile();

    service = module.get<KafkaConsumerService>(KafkaConsumerService);
    producerService = module.get<KafkaProducerService>(KafkaProducerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should be disabled when KAFKA_ENABLED=false', () => {
      const status = service.getStatus();
      expect(status.enabled).toBe(false);
    });

    it('should have no consumers when disabled', () => {
      const status = service.getStatus();
      expect(status.totalConsumers).toBe(0);
      expect(status.consumerGroups).toHaveLength(0);
    });
  });

  describe('subscribe', () => {
    it('should skip subscription when Kafka is disabled', async () => {
      const handler: MessageHandler = jest.fn();

      await service.subscribe({
        groupId: 'test-group',
        topics: ['test-topic'],
        handler,
      });

      const status = service.getStatus();
      expect(status.totalConsumers).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('should return correct status when disabled', () => {
      const status = service.getStatus();

      expect(status).toEqual({
        enabled: false,
        consumerGroups: [],
        totalConsumers: 0,
      });
    });
  });

  describe('disconnect', () => {
    it('should handle disconnect gracefully when Kafka is disabled', async () => {
      await expect(service.disconnect('test-group')).resolves.not.toThrow();
    });
  });

  describe('disconnectAll', () => {
    it('should handle disconnectAll gracefully when Kafka is disabled', async () => {
      await expect(service.disconnectAll()).resolves.not.toThrow();
    });
  });
});

describe('KafkaConsumerService (enabled)', () => {
  let service: KafkaConsumerService;
  let producerService: KafkaProducerService;

  const mockProducerService = {
    send: jest.fn(),
    getStatus: jest.fn().mockReturnValue({
      connected: true,
      brokers: ['localhost:9092'],
    }),
  };

  beforeEach(async () => {
    // Enable Kafka for these tests (but we'll mock the actual Kafka client)
    process.env.KAFKA_ENABLED = 'true';
    process.env.KAFKA_BROKERS = 'localhost:9092';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KafkaConsumerService,
        {
          provide: KafkaProducerService,
          useValue: mockProducerService,
        },
      ],
    }).compile();

    service = module.get<KafkaConsumerService>(KafkaConsumerService);
    producerService = module.get<KafkaProducerService>(KafkaProducerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.KAFKA_ENABLED;
    delete process.env.KAFKA_BROKERS;
  });

  it('should be enabled when KAFKA_ENABLED=true', () => {
    const status = service.getStatus();
    expect(status.enabled).toBe(true);
  });

  // Note: We can't fully test subscription without mocking KafkaJS
  // These tests would require more complex mocking
  // For production, integration tests are more valuable
});
