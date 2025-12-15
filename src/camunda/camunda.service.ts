import { Injectable, Logger } from '@nestjs/common';
import { Camunda8 } from '@camunda8/sdk';
import * as path from 'path';
import * as fs from 'fs';
import { CamundaConfig } from './camunda.config';

// Workers
import { ValidateOrderWorker } from './workers/validation/validate-order.worker';
import { FindProvidersWorker } from './workers/assignment/find-providers.worker';
import { RankProvidersWorker } from './workers/assignment/rank-providers.worker';
import { AutoAssignProviderWorker } from './workers/assignment/auto-assign-provider.worker';
import { SendOfferWorker } from './workers/assignment/send-offer.worker';
import { CheckAvailabilityWorker } from './workers/booking/check-availability.worker';
import { ReserveSlotWorker } from './workers/booking/reserve-slot.worker';
import { GoCheckWorker } from './workers/execution/go-check.worker';
import { SendNotificationWorker } from './workers/notification/send-notification.worker';

@Injectable()
export class CamundaService {
  private readonly logger = new Logger(CamundaService.name);
  private client: Camunda8 | null = null;
  private zeebe: any = null;

  constructor(
    private readonly config: CamundaConfig,
    // Workers injected for registration
    private readonly validateOrderWorker: ValidateOrderWorker,
    private readonly findProvidersWorker: FindProvidersWorker,
    private readonly rankProvidersWorker: RankProvidersWorker,
    private readonly autoAssignProviderWorker: AutoAssignProviderWorker,
    private readonly sendOfferWorker: SendOfferWorker,
    private readonly checkAvailabilityWorker: CheckAvailabilityWorker,
    private readonly reserveSlotWorker: ReserveSlotWorker,
    private readonly goCheckWorker: GoCheckWorker,
    private readonly sendNotificationWorker: SendNotificationWorker,
  ) {}

  async initialize(): Promise<void> {
    const sdkConfig = this.config.getSdkConfig();

    this.logger.log(`Connecting to Zeebe at ${sdkConfig.ZEEBE_ADDRESS}...`);

    this.client = new Camunda8(sdkConfig);
    this.zeebe = this.client.getZeebeGrpcApiClient();

    // Deploy processes
    await this.deployProcesses();

    // Register workers
    this.registerWorkers();

    this.logger.log('Camunda 8 client initialized and workers registered');
  }

  async shutdown(): Promise<void> {
    if (this.zeebe) {
      await this.zeebe.close();
      this.logger.log('Zeebe client closed');
    }
  }

  /**
   * Deploy all BPMN processes from the camunda/processes directory
   */
  private async deployProcesses(): Promise<void> {
    const processDir = path.join(process.cwd(), 'camunda', 'processes');

    if (!fs.existsSync(processDir)) {
      this.logger.warn(`Process directory not found: ${processDir}`);
      return;
    }

    const files = fs.readdirSync(processDir).filter((f) => f.endsWith('.bpmn'));

    for (const file of files) {
      const filePath = path.join(processDir, file);
      try {
        const result = await this.zeebe.deployResource({ processFilename: filePath });
        const deployment = result.deployments[0];
        if (deployment.process) {
          this.logger.log(
            `Deployed process: ${deployment.process.bpmnProcessId} (v${deployment.process.version})`,
          );
        }
      } catch (error) {
        this.logger.error(`Failed to deploy ${file}: ${error.message}`);
      }
    }
  }

  /**
   * Register all Zeebe workers
   */
  private registerWorkers(): void {
    const workers = [
      this.validateOrderWorker,
      this.findProvidersWorker,
      this.rankProvidersWorker,
      this.autoAssignProviderWorker,
      this.sendOfferWorker,
      this.checkAvailabilityWorker,
      this.reserveSlotWorker,
      this.goCheckWorker,
      this.sendNotificationWorker,
    ];

    for (const worker of workers) {
      this.zeebe.createWorker({
        taskType: worker.taskType,
        taskHandler: worker.createHandler(),
        timeout: worker.timeout,
      });
      this.logger.log(`Registered worker: ${worker.taskType}`);
    }
  }

  /**
   * Start a new service order workflow
   */
  async startServiceOrderWorkflow(
    serviceOrderId: string,
    variables: Record<string, any>,
  ): Promise<string> {
    if (!this.zeebe) {
      throw new Error('Camunda client not initialized');
    }

    const result = await this.zeebe.createProcessInstance({
      bpmnProcessId: 'ServiceOrderLifecycle',
      variables: {
        serviceOrderId,
        ...variables,
      },
    });

    this.logger.log(`Started service order workflow: ${result.processInstanceKey}`);
    return result.processInstanceKey.toString();
  }

  /**
   * Start a new assignment sub-process
   */
  async startAssignmentWorkflow(
    serviceOrderId: string,
    variables: Record<string, any>,
  ): Promise<string> {
    if (!this.zeebe) {
      throw new Error('Camunda client not initialized');
    }

    const result = await this.zeebe.createProcessInstance({
      bpmnProcessId: 'ProviderAssignment',
      variables: {
        serviceOrderId,
        ...variables,
      },
    });

    this.logger.log(`Started assignment workflow: ${result.processInstanceKey}`);
    return result.processInstanceKey.toString();
  }

  /**
   * Publish a message to correlate with a running process instance
   */
  async publishMessage(
    messageName: string,
    correlationKey: string,
    variables: Record<string, any> = {},
  ): Promise<void> {
    if (!this.zeebe) {
      throw new Error('Camunda client not initialized');
    }

    await this.zeebe.publishMessage({
      name: messageName,
      correlationKey,
      variables,
      timeToLive: 3600000, // 1 hour
    });

    this.logger.log(`Published message: ${messageName} (correlation: ${correlationKey})`);
  }

  /**
   * Cancel a running process instance
   */
  async cancelProcessInstance(processInstanceKey: string): Promise<void> {
    if (!this.zeebe) {
      throw new Error('Camunda client not initialized');
    }

    await this.zeebe.cancelProcessInstance(processInstanceKey);
    this.logger.log(`Cancelled process instance: ${processInstanceKey}`);
  }

  /**
   * Get Zeebe client for advanced operations
   */
  getZeebeClient(): any {
    return this.zeebe;
  }

  /**
   * Get Operate client for monitoring
   */
  getOperateClient(): any {
    return this.client?.getOperateApiClient();
  }

  /**
   * Get Tasklist client for human tasks
   */
  getTasklistClient(): any {
    return this.client?.getTasklistApiClient();
  }
}
