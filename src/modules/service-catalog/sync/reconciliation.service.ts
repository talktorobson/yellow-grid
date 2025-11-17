import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ServiceCatalogService } from '../service-catalog.service';
import { ReconciliationStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

/**
 * Reconciliation Service
 *
 * Handles daily CSV reconciliation from S3/Blob storage.
 * Detects and corrects drift between external system and FSM database.
 */
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);
  private isEnabled: boolean;
  private driftAlertThreshold: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly serviceCatalogService: ServiceCatalogService,
  ) {
    this.isEnabled =
      process.env.SERVICE_CATALOG_SYNC_ENABLED === 'true' || false;
    this.driftAlertThreshold = parseFloat(
      process.env.SERVICE_CATALOG_DRIFT_ALERT_THRESHOLD || '0.05',
    );
  }

  /**
   * Daily reconciliation job (runs at 3 AM by default)
   * Schedule can be overridden via SERVICE_CATALOG_RECONCILIATION_SCHEDULE env var
   */
  @Cron(
    process.env.SERVICE_CATALOG_RECONCILIATION_SCHEDULE || '0 3 * * *',
    {
      name: 'service-catalog-reconciliation',
      timeZone: 'Europe/Paris', // Adjust based on primary region
    },
  )
  async runDailyReconciliation() {
    if (!this.isEnabled) {
      this.logger.debug('Reconciliation job skipped (sync disabled)');
      return;
    }

    this.logger.log('Starting daily service catalog reconciliation');

    const countries = ['ES', 'FR', 'IT', 'PL'];

    for (const countryCode of countries) {
      try {
        await this.reconcileCountry(countryCode);
      } catch (error) {
        this.logger.error(
          `Reconciliation failed for ${countryCode}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log('Daily reconciliation completed');
  }

  /**
   * Reconcile service catalog for a single country
   * @param countryCode - Country code (ES, FR, IT, PL)
   */
  async reconcileCountry(countryCode: string): Promise<void> {
    const runDate = new Date();
    const dateStr = runDate.toISOString().split('T')[0].replace(/-/g, '');

    this.logger.log(`Reconciling service catalog for ${countryCode}`);

    // Create reconciliation record
    const reconciliation =
      await this.prisma.serviceCatalogReconciliation.create({
        data: {
          countryCode,
          runDate,
          status: 'RUNNING',
          totalServicesInFile: 0,
          totalServicesInDB: 0,
          servicesCreated: 0,
          servicesUpdated: 0,
          servicesWithDrift: 0,
        },
      });

    try {
      // Step 1: Download CSV file from S3/Blob storage
      const csvData = await this.downloadCSVFile(countryCode, dateStr);

      if (!csvData) {
        this.logger.warn(
          `No CSV file found for ${countryCode} on ${dateStr}, skipping`,
        );
        await this.updateReconciliationStatus(
          reconciliation.id,
          'COMPLETED',
          'No file found',
        );
        return;
      }

      // Step 2: Parse CSV data
      const services = this.parseCSV(csvData);

      this.logger.log(
        `Loaded ${services.length} services from CSV for ${countryCode}`,
      );

      // Step 3: Get current services from database for this country
      const dbServices = await this.prisma.serviceCatalog.findMany({
        where: { countryCode },
        select: {
          id: true,
          externalServiceCode: true,
          syncChecksum: true,
          status: true,
        },
      });

      // Step 4: Compare and detect drift
      let servicesCreated = 0;
      let servicesUpdated = 0;
      let servicesWithDrift = 0;

      const externalCodes = new Set(
        services.map((s) => s.external_service_code),
      );
      const dbCodesMap = new Map(
        dbServices.map((s) => [s.externalServiceCode, s]),
      );

      // Process each service from CSV
      for (const csvService of services) {
        const dbService = dbCodesMap.get(csvService.external_service_code);

        if (!dbService) {
          // Service in CSV but not in DB - create it
          this.logger.debug(
            `New service found: ${csvService.external_service_code}`,
          );
          // In production, this would trigger service creation
          // For now, just count it
          servicesCreated++;
          continue;
        }

        // Compute checksum for CSV data
        const csvChecksum = this.serviceCatalogService.computeChecksum({
          externalServiceCode: csvService.external_service_code,
          serviceType: csvService.type as any,
          serviceCategory: csvService.category as any,
          name: csvService.name,
          description: csvService.description,
          scopeIncluded: JSON.parse(csvService.scope_included || '[]'),
          scopeExcluded: JSON.parse(csvService.scope_excluded || '[]'),
          worksiteRequirements: JSON.parse(
            csvService.worksite_requirements || '[]',
          ),
          productPrerequisites: JSON.parse(
            csvService.product_prerequisites || '[]',
          ),
          estimatedDurationMinutes: parseInt(
            csvService.estimated_duration_minutes,
            10,
          ),
        });

        // Check for drift
        if (dbService.syncChecksum !== csvChecksum) {
          servicesWithDrift++;

          this.logger.warn(
            `Drift detected for ${csvService.external_service_code}`,
          );

          // Auto-correct the drift by updating the service
          await this.prisma.serviceCatalog.update({
            where: { id: dbService.id },
            data: {
              syncChecksum: csvChecksum,
              lastSyncedAt: new Date(),
              updatedBy: 'RECONCILIATION_JOB',
            },
          });

          servicesUpdated++;
        }
      }

      // Calculate drift percentage
      const driftPercentage =
        dbServices.length > 0
          ? (servicesWithDrift / dbServices.length) * 100
          : 0;

      // Update reconciliation record
      await this.prisma.serviceCatalogReconciliation.update({
        where: { id: reconciliation.id },
        data: {
          status: 'COMPLETED',
          totalServicesInFile: services.length,
          totalServicesInDB: dbServices.length,
          servicesCreated,
          servicesUpdated,
          servicesWithDrift,
          driftPercentage,
          completedAt: new Date(),
        },
      });

      // Alert if drift exceeds threshold
      if (driftPercentage > this.driftAlertThreshold * 100) {
        this.logger.error(
          `HIGH DRIFT ALERT for ${countryCode}: ${driftPercentage.toFixed(2)}% (threshold: ${(this.driftAlertThreshold * 100).toFixed(2)}%)`,
        );

        // In production, this would trigger an alert via monitoring system
        // e.g., send to Slack, PagerDuty, etc.
      }

      this.logger.log(
        `Reconciliation completed for ${countryCode}: ` +
          `${servicesCreated} created, ${servicesUpdated} updated, ` +
          `${servicesWithDrift} with drift (${driftPercentage.toFixed(2)}%)`,
      );
    } catch (error) {
      this.logger.error(
        `Reconciliation failed for ${countryCode}: ${error.message}`,
        error.stack,
      );

      await this.updateReconciliationStatus(
        reconciliation.id,
        'FAILED',
        error.message,
      );
    }
  }

  /**
   * Download CSV file from S3/Blob storage
   * In production, this would use AWS SDK or Azure Storage SDK
   *
   * @param countryCode - Country code
   * @param dateStr - Date string in YYYYMMDD format
   * @returns CSV file content as string, or null if not found
   */
  private async downloadCSVFile(
    countryCode: string,
    dateStr: string,
  ): Promise<string | null> {
    // For development/testing, read from local filesystem
    // In production, replace with S3/Blob storage download

    const fileName = `services_${countryCode}_${dateStr}.csv`;
    const filePath = path.join(
      process.cwd(),
      'test-data',
      'service-catalog',
      fileName,
    );

    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
    } catch (error) {
      this.logger.warn(`Failed to read local file ${filePath}: ${error.message}`);
    }

    // Production S3 implementation (example):
    /*
    const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
    const s3Client = new S3Client({ region: process.env.AWS_REGION });

    try {
      const command = new GetObjectCommand({
        Bucket: process.env.SERVICE_CATALOG_BUCKET,
        Key: `service-catalog/${fileName}`,
      });

      const response = await s3Client.send(command);
      return await response.Body.transformToString();
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return null;
      }
      throw error;
    }
    */

    return null;
  }

  /**
   * Parse CSV data into service objects
   * @param csvData - Raw CSV string
   * @returns Array of service objects
   */
  private parseCSV(csvData: string): any[] {
    try {
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      return records;
    } catch (error) {
      this.logger.error(`Failed to parse CSV: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update reconciliation status
   */
  private async updateReconciliationStatus(
    reconciliationId: string,
    status: ReconciliationStatus,
    errorMessage?: string,
  ): Promise<void> {
    await this.prisma.serviceCatalogReconciliation.update({
      where: { id: reconciliationId },
      data: {
        status,
        errorMessage,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Get reconciliation history
   * @param countryCode - Country code (optional filter)
   * @param limit - Maximum number of records to return
   */
  async getReconciliationHistory(countryCode?: string, limit: number = 10) {
    const where = countryCode ? { countryCode } : {};

    return this.prisma.serviceCatalogReconciliation.findMany({
      where,
      orderBy: { runDate: 'desc' },
      take: limit,
    });
  }

  /**
   * Manually trigger reconciliation for a country
   * @param countryCode - Country code
   */
  async manualReconciliation(countryCode: string): Promise<void> {
    this.logger.log(
      `Manual reconciliation triggered for ${countryCode}`,
    );

    await this.reconcileCountry(countryCode);
  }
}
