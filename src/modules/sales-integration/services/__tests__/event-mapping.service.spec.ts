import { Test, TestingModule } from '@nestjs/testing';
import { EventMappingService } from '../event-mapping.service';
import { KafkaService } from '../../../../common/kafka/kafka.service';
import { SalesSystem, OrderType, Priority } from '../../dto';

describe('EventMappingService', () => {
  let service: EventMappingService;
  let kafkaService: jest.Mocked<KafkaService>;

  beforeEach(async () => {
    const mockKafkaService = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventMappingService,
        { provide: KafkaService, useValue: mockKafkaService },
      ],
    }).compile();

    service = module.get<EventMappingService>(EventMappingService);
    kafkaService = module.get(KafkaService) as jest.Mocked<KafkaService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mapOrderIntakeToServiceOrderCreated', () => {
    it('should map order intake to FSM service order created event', async () => {
      const orderData: any = {
        externalOrderId: 'PX-TEST-001',
        salesSystem: SalesSystem.PYXIS,
        orderType: OrderType.INSTALLATION,
        priority: Priority.HIGH,
        externalReferences: {
          salesOrderId: 'SO-PYXIS-2025-001',
          projectId: 'PROJ-001',
          leadId: 'LEAD-001',
        },
        customer: {
          customerId: 'CUST-001',
        },
        requiredSkills: ['KITCHEN_INSTALL'],
        estimatedDuration: 120,
        schedulingPreferences: {
          preferredDate: '2025-02-01',
        },
        serviceItems: [],
        totalAmount: {},
      };

      await service.mapOrderIntakeToServiceOrderCreated(
        'PX-TEST-001',
        SalesSystem.PYXIS,
        orderData,
        'FSM-001',
        'corr-001',
      );

      expect(kafkaService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'fsm.service_order.created',
          messages: expect.arrayContaining([
            expect.objectContaining({
              key: 'FSM-001',
              value: expect.stringContaining('SERVICE_ORDER_CREATED'),
            }),
          ]),
        }),
      );
    });
  });

  describe('mapServiceOrderStatusToSalesSystemEvent', () => {
    it('should map FSM status update to sales system event', async () => {
      await service.mapServiceOrderStatusToSalesSystemEvent(
        'FSM-001',
        'PX-TEST-001',
        SalesSystem.PYXIS,
        'CREATED',
        'SCHEDULED',
        'corr-001',
      );

      expect(kafkaService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'sales.pyxis.status_update',
          messages: expect.arrayContaining([
            expect.objectContaining({
              key: 'PX-TEST-001',
            }),
          ]),
        }),
      );
    });
  });
});
