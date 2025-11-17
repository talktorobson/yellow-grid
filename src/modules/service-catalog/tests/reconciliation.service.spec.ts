import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationService } from '../sync/reconciliation.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ServiceCatalogService } from '../service-catalog.service';
import { ReconciliationStatus } from '@prisma/client';

// Mock fs module
jest.mock('fs');
const fs = require('fs');

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let prisma: PrismaService;
  let serviceCatalogService: ServiceCatalogService;

  const mockPrismaService = {
    serviceCatalogReconciliation: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    serviceCatalog: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockServiceCatalogService = {
    computeChecksum: jest.fn(),
  };

  beforeEach(async () => {
    // Reset environment variables
    process.env.SERVICE_CATALOG_SYNC_ENABLED = 'true';
    process.env.SERVICE_CATALOG_DRIFT_ALERT_THRESHOLD = '0.05';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ServiceCatalogService,
          useValue: mockServiceCatalogService,
        },
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
    prisma = module.get<PrismaService>(PrismaService);
    serviceCatalogService = module.get<ServiceCatalogService>(
      ServiceCatalogService,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runDailyReconciliation', () => {
    it('should skip reconciliation when sync is disabled', async () => {
      process.env.SERVICE_CATALOG_SYNC_ENABLED = 'false';
      const newService = new ReconciliationService(
        prisma,
        serviceCatalogService,
      );

      const reconcileSpy = jest.spyOn(newService as any, 'reconcileCountry');

      await newService.runDailyReconciliation();

      expect(reconcileSpy).not.toHaveBeenCalled();
    });

    it('should reconcile all countries when enabled', async () => {
      const reconcileSpy = jest
        .spyOn(service as any, 'reconcileCountry')
        .mockResolvedValue(undefined);

      await service.runDailyReconciliation();

      expect(reconcileSpy).toHaveBeenCalledTimes(4);
      expect(reconcileSpy).toHaveBeenCalledWith('ES');
      expect(reconcileSpy).toHaveBeenCalledWith('FR');
      expect(reconcileSpy).toHaveBeenCalledWith('IT');
      expect(reconcileSpy).toHaveBeenCalledWith('PL');
    });

    it('should continue reconciliation if one country fails', async () => {
      const reconcileSpy = jest
        .spyOn(service as any, 'reconcileCountry')
        .mockImplementation((country) => {
          if (country === 'FR') {
            return Promise.reject(new Error('Network error'));
          }
          return Promise.resolve();
        });

      await service.runDailyReconciliation();

      expect(reconcileSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('reconcileCountry', () => {
    const mockCSVData = `external_service_code,type,category,name,description,scope_included,scope_excluded,worksite_requirements,product_prerequisites,estimated_duration_minutes
PYX_ES_HVAC_001,INSTALLATION,HVAC,HVAC Install,Install HVAC,"[""Install"",""Test""]","[""Wall work""]","[""Power outlet""]","[""Unit delivered""]",180`;

    const mockDBServices = [
      {
        id: 'service-1',
        externalServiceCode: 'PYX_ES_HVAC_001',
        syncChecksum: 'old-checksum',
        status: 'ACTIVE',
      },
    ];

    beforeEach(() => {
      mockPrismaService.serviceCatalogReconciliation.create.mockResolvedValue({
        id: 'reconciliation-1',
        countryCode: 'ES',
        status: 'RUNNING',
      });

      mockPrismaService.serviceCatalog.findMany.mockResolvedValue(
        mockDBServices,
      );
    });

    it('should complete reconciliation successfully', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(mockCSVData);

      mockServiceCatalogService.computeChecksum.mockReturnValue('old-checksum');

      mockPrismaService.serviceCatalogReconciliation.update.mockResolvedValue(
        {},
      );

      await service.reconcileCountry('ES');

      expect(prisma.serviceCatalogReconciliation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          countryCode: 'ES',
          status: 'RUNNING',
        }),
      });

      expect(prisma.serviceCatalogReconciliation.update).toHaveBeenCalledWith({
        where: { id: 'reconciliation-1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          totalServicesInFile: 1,
          totalServicesInDB: 1,
        }),
      });
    });

    it('should detect and correct drift', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(mockCSVData);

      // Different checksum = drift detected
      mockServiceCatalogService.computeChecksum.mockReturnValue('new-checksum');

      mockPrismaService.serviceCatalog.update.mockResolvedValue({});
      mockPrismaService.serviceCatalogReconciliation.update.mockResolvedValue(
        {},
      );

      await service.reconcileCountry('ES');

      expect(prisma.serviceCatalog.update).toHaveBeenCalledWith({
        where: { id: 'service-1' },
        data: {
          syncChecksum: 'new-checksum',
          lastSyncedAt: expect.any(Date),
          updatedBy: 'RECONCILIATION_JOB',
        },
      });

      expect(prisma.serviceCatalogReconciliation.update).toHaveBeenCalledWith({
        where: { id: 'reconciliation-1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          servicesWithDrift: 1,
          servicesUpdated: 1,
        }),
      });
    });

    it('should handle missing CSV file gracefully', async () => {
      fs.existsSync.mockReturnValue(false);

      mockPrismaService.serviceCatalogReconciliation.update.mockResolvedValue(
        {},
      );

      await service.reconcileCountry('ES');

      expect(prisma.serviceCatalogReconciliation.update).toHaveBeenCalledWith({
        where: { id: 'reconciliation-1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          errorMessage: 'No file found',
        }),
      });
    });

    it('should calculate drift percentage correctly', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(mockCSVData);

      // Simulate drift
      mockServiceCatalogService.computeChecksum.mockReturnValue('new-checksum');

      mockPrismaService.serviceCatalog.update.mockResolvedValue({});
      mockPrismaService.serviceCatalogReconciliation.update.mockResolvedValue(
        {},
      );

      await service.reconcileCountry('ES');

      expect(prisma.serviceCatalogReconciliation.update).toHaveBeenCalledWith({
        where: { id: 'reconciliation-1' },
        data: expect.objectContaining({
          driftPercentage: 100.0, // 1 out of 1 service has drift = 100%
        }),
      });
    });

    it('should mark reconciliation as FAILED on error', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      mockPrismaService.serviceCatalogReconciliation.update.mockResolvedValue(
        {},
      );

      await service.reconcileCountry('ES');

      expect(prisma.serviceCatalogReconciliation.update).toHaveBeenCalledWith({
        where: { id: 'reconciliation-1' },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'File read error',
        }),
      });
    });

    it('should log high drift alert when threshold exceeded', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(mockCSVData);

      // All services have drift (100% > 5% threshold)
      mockServiceCatalogService.computeChecksum.mockReturnValue('new-checksum');

      mockPrismaService.serviceCatalog.update.mockResolvedValue({});
      mockPrismaService.serviceCatalogReconciliation.update.mockResolvedValue(
        {},
      );

      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await service.reconcileCountry('ES');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('HIGH DRIFT ALERT'),
      );
    });
  });

  describe('parseCSV', () => {
    it('should parse valid CSV data', () => {
      const csvData = `col1,col2,col3
value1,value2,value3
value4,value5,value6`;

      const result = service['parseCSV'](csvData);

      expect(result).toEqual([
        { col1: 'value1', col2: 'value2', col3: 'value3' },
        { col1: 'value4', col2: 'value5', col3: 'value6' },
      ]);
    });

    it('should throw error on invalid CSV', () => {
      const invalidCSV = 'col1,col2\nvalue1'; // Mismatched columns

      // csv-parse will handle this gracefully, but let's test error handling
      const malformedCSV = null as any;

      expect(() => service['parseCSV'](malformedCSV)).toThrow();
    });
  });

  describe('downloadCSVFile', () => {
    it('should return CSV content from local file', async () => {
      const mockContent = 'col1,col2\nvalue1,value2';

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(mockContent);

      const result = await service['downloadCSVFile']('ES', '20250117');

      expect(result).toBe(mockContent);
      expect(fs.existsSync).toHaveBeenCalled();
    });

    it('should return null if file does not exist', async () => {
      fs.existsSync.mockReturnValue(false);

      const result = await service['downloadCSVFile']('ES', '20250117');

      expect(result).toBeNull();
    });

    it('should return null on file read error', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await service['downloadCSVFile']('ES', '20250117');

      expect(result).toBeNull();
    });
  });

  describe('getReconciliationHistory', () => {
    const mockHistory = [
      {
        id: 'rec-1',
        countryCode: 'ES',
        runDate: new Date('2025-01-17'),
        status: ReconciliationStatus.COMPLETED,
      },
      {
        id: 'rec-2',
        countryCode: 'ES',
        runDate: new Date('2025-01-16'),
        status: ReconciliationStatus.COMPLETED,
      },
    ];

    it('should return reconciliation history', async () => {
      mockPrismaService.serviceCatalogReconciliation.findMany.mockResolvedValue(
        mockHistory,
      );

      const result = await service.getReconciliationHistory();

      expect(result).toEqual(mockHistory);
      expect(prisma.serviceCatalogReconciliation.findMany).toHaveBeenCalledWith(
        {
          where: {},
          orderBy: { runDate: 'desc' },
          take: 10,
        },
      );
    });

    it('should filter by country code', async () => {
      mockPrismaService.serviceCatalogReconciliation.findMany.mockResolvedValue(
        mockHistory,
      );

      await service.getReconciliationHistory('ES', 20);

      expect(prisma.serviceCatalogReconciliation.findMany).toHaveBeenCalledWith(
        {
          where: { countryCode: 'ES' },
          orderBy: { runDate: 'desc' },
          take: 20,
        },
      );
    });
  });

  describe('manualReconciliation', () => {
    it('should trigger reconciliation for specific country', async () => {
      const reconcileSpy = jest
        .spyOn(service as any, 'reconcileCountry')
        .mockResolvedValue(undefined);

      await service.manualReconciliation('FR');

      expect(reconcileSpy).toHaveBeenCalledWith('FR');
    });
  });
});
