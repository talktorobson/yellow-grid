import { Test, TestingModule } from '@nestjs/testing';
import { ContractsService } from './contracts.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  ContractSignerType,
  ContractStatus,
  NotificationChannel,
  NotificationStatus,
  SignatureMethod,
  SignatureStatus,
} from '@prisma/client';

type PrismaMock = {
  serviceOrder: { findUnique: jest.Mock };
  contractTemplate: { findUnique: jest.Mock };
  contract: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
  contractSignature: { update: jest.Mock };
  $transaction: jest.Mock;
};

const baseServiceOrder = {
  id: 'service-order-id',
  serviceId: 'service-id',
  countryCode: 'ES',
  businessUnit: 'LM_ES',
  customerInfo: {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+34600000000',
  },
  serviceAddress: {
    street: 'Gran Via',
    city: 'Madrid',
  },
  requestedStartDate: new Date('2025-02-01T08:00:00Z'),
  requestedEndDate: new Date('2025-02-02T18:00:00Z'),
  service: {
    id: 'service-id',
    name: 'HVAC Install',
    serviceType: 'INSTALLATION',
    requiresPreServiceContract: true,
    contractTemplateId: 'template-id',
  },
  project: {
    id: 'project-id',
    projectName: 'Madrid Install',
    customerName: 'Ada Lovelace',
    customerEmail: 'ada@example.com',
    customerPhone: '+34600000000',
  },
  assignedProvider: {
    id: 'provider-id',
    name: 'CoolAir',
  },
};

const template = {
  id: 'template-id',
  code: 'PRE_SERVICE_ES',
  version: 2,
  bodyTemplate: '<h1>Hello {{customer.name}}</h1>',
  defaultPayload: {
    locale: 'es-ES',
  },
};

const contractRecord = {
  id: 'contract-id',
  contractNumber: 'CTR-ES-123456',
  serviceOrderId: baseServiceOrder.id,
  templateId: template.id,
  status: ContractStatus.GENERATED,
  countryCode: 'ES',
  businessUnit: 'LM_ES',
  customerEmail: 'ada@example.com',
  customerPhone: '+34600000000',
  sentAt: null,
  signedAt: null,
  expiresAt: null,
  documentBody: '<h1>Hello Ada</h1>',
  payload: {
    customer: {
      name: 'Ada Lovelace',
    },
  },
  signatureCode: '123456',
  signatures: [
    {
      id: 'signature-id',
      signerType: ContractSignerType.CUSTOMER,
      signerName: 'Ada Lovelace',
      signerEmail: 'ada@example.com',
      signerPhone: '+34600000000',
      signatureMethod: SignatureMethod.TYPED,
      status: SignatureStatus.REQUESTED,
      signedAt: null,
      verificationCode: '123456',
    },
  ],
  notifications: [],
  template: null,
  serviceOrder: null,
};

const prismaMocks: PrismaMock = {
  serviceOrder: {
    findUnique: jest.fn(),
  },
  contractTemplate: {
    findUnique: jest.fn(),
  },
  contract: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  contractSignature: {
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('ContractsService', () => {
  let service: ContractsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        {
          provide: PrismaService,
          useValue: prismaMocks,
        },
      ],
    }).compile();

    service = module.get(ContractsService);
    for (const group of Object.values(prismaMocks)) {
      if (group && typeof group === 'object') {
        for (const maybeMock of Object.values(group)) {
          if (typeof maybeMock === 'function' && 'mockReset' in maybeMock) {
            (maybeMock as jest.Mock).mockReset();
          }
        }
      }
    }
  });

  describe('generate', () => {
    it('creates a contract with merged payload and signature seed', async () => {
      prismaMocks.serviceOrder.findUnique.mockResolvedValueOnce(baseServiceOrder);
      prismaMocks.contractTemplate.findUnique.mockResolvedValueOnce(template);
      prismaMocks.contract.create.mockResolvedValueOnce(contractRecord);

      const result = await service.generate({ serviceOrderId: baseServiceOrder.id });

      expect(prismaMocks.contract.create).toHaveBeenCalled();
      expect(result.status).toBe(ContractStatus.GENERATED);
      expect(result.signatures).toHaveLength(1);
    });
  });

  describe('send', () => {
    it('sends notifications via requested channels', async () => {
      const contractReady = {
        ...contractRecord,
        status: ContractStatus.GENERATED,
      };

      prismaMocks.contract.findUnique.mockResolvedValueOnce(contractReady);
      prismaMocks.contract.update.mockResolvedValueOnce({
        ...contractReady,
        status: ContractStatus.SENT,
        notifications: [
          {
            id: 'notif-id',
            channel: NotificationChannel.EMAIL,
            destination: 'ada@example.com',
            sentAt: new Date(),
            status: NotificationStatus.SENT,
          },
        ],
      });

      const response = await service.send('contract-id', {
        sendEmail: true,
        sendSms: false,
      });

      expect(prismaMocks.contract.update).toHaveBeenCalled();
      expect(response.status).toBe(ContractStatus.SENT);
      expect(response.notifications[0].channel).toBe(NotificationChannel.EMAIL);
    });
  });

  describe('sign', () => {
    it('marks the contract and signature as signed', async () => {
      prismaMocks.contract.findUnique.mockResolvedValueOnce(contractRecord);

      const updatedContract = {
        ...contractRecord,
        status: ContractStatus.SIGNED,
        signedAt: new Date(),
      };

      prismaMocks.contract.update.mockResolvedValueOnce(updatedContract);
      prismaMocks.contractSignature.update.mockResolvedValueOnce({
        ...contractRecord.signatures[0],
        status: SignatureStatus.SIGNED,
      });

      prismaMocks.$transaction.mockImplementationOnce((operations: Promise<unknown>[]) =>
        Promise.all(operations),
      );

      const response = await service.sign('contract-id', {
        signerName: 'Ada Lovelace',
        signatureData: 'Ada Lovelace',
        verificationCode: '123456',
      });

      expect(prismaMocks.contractSignature.update).toHaveBeenCalled();
      expect(response.status).toBe(ContractStatus.SIGNED);
    });
  });
});
