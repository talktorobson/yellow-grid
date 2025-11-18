import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { KafkaProducerService } from '../../common/kafka/kafka-producer.service';
import {
  RecordTvOutcomeDto,
  LinkInstallationDto,
  TvOutcomeResponseDto,
  TvOutcomeRecordedEvent,
  TvOutcomeEnum,
} from './dto';
import {
  TvOutcome,
  ServiceType,
  DependencyType,
  ServiceOrderState,
} from '@prisma/client';

@Injectable()
export class TechnicalVisitsService {
  private readonly logger = new Logger(TechnicalVisitsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  /**
   * Record a Technical Visit outcome (YES / YES-BUT / NO)
   */
  async recordOutcome(
    recordDto: RecordTvOutcomeDto,
    userId: string,
  ): Promise<TvOutcomeResponseDto> {
    this.logger.log(
      `Recording TV outcome ${recordDto.outcome} for service order ${recordDto.tvServiceOrderId}`,
    );

    // Validate TV service order exists and is correct type
    const tvServiceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id: recordDto.tvServiceOrderId },
      include: { service: true },
    });

    if (!tvServiceOrder) {
      throw new NotFoundException(
        `TV Service Order ${recordDto.tvServiceOrderId} not found`,
      );
    }

    // Validate service type is CONFIRMATION_TV or QUOTATION_TV
    if (
      tvServiceOrder.service.serviceType !== ServiceType.CONFIRMATION_TV &&
      tvServiceOrder.service.serviceType !== ServiceType.QUOTATION_TV
    ) {
      throw new BadRequestException(
        `Service order ${recordDto.tvServiceOrderId} is not a Technical Visit (type: ${tvServiceOrder.service.serviceType})`,
      );
    }

    // Validate TV must be COMPLETED before recording outcome
    if (tvServiceOrder.state !== ServiceOrderState.COMPLETED) {
      throw new BadRequestException(
        `TV service order must be in COMPLETED state before recording outcome (current: ${tvServiceOrder.state})`,
      );
    }

    // Validate modifications are provided for YES_BUT outcome
    if (
      recordDto.outcome === TvOutcome.YES_BUT &&
      (!recordDto.modifications || recordDto.modifications.length === 0)
    ) {
      throw new BadRequestException(
        'Modifications are required for YES_BUT outcome',
      );
    }

    // Validate linked installation order if provided
    let linkedInstallationOrder = null;
    if (recordDto.linkedInstallationOrderId) {
      linkedInstallationOrder = await this.prisma.serviceOrder.findUnique({
        where: { id: recordDto.linkedInstallationOrderId },
        include: { service: true },
      });

      if (!linkedInstallationOrder) {
        throw new NotFoundException(
          `Linked installation order ${recordDto.linkedInstallationOrderId} not found`,
        );
      }

      // Validate it's an installation type
      if (
        linkedInstallationOrder.service.serviceType !==
        ServiceType.INSTALLATION
      ) {
        throw new BadRequestException(
          `Linked service order ${recordDto.linkedInstallationOrderId} is not an INSTALLATION (type: ${linkedInstallationOrder.service.serviceType})`,
        );
      }

      // Validate same project/customer
      if (
        linkedInstallationOrder.projectId !== tvServiceOrder.projectId &&
        tvServiceOrder.projectId
      ) {
        throw new BadRequestException(
          'TV and Installation orders must belong to the same project',
        );
      }
    }

    // Determine if installation should be blocked
    const shouldBlockInstallation =
      recordDto.outcome === TvOutcome.NO ||
      recordDto.outcome === TvOutcome.YES_BUT;

    // Create TV outcome record
    const tvOutcome = await this.prisma.technicalVisitOutcome.create({
      data: {
        tvServiceOrderId: recordDto.tvServiceOrderId,
        linkedInstallationOrderId: recordDto.linkedInstallationOrderId,
        outcome: recordDto.outcome,
        modifications: recordDto.modifications
          ? (recordDto.modifications as any)
          : null,
        technicianNotes: recordDto.technicianNotes,
        recordedBy: userId,
        installationBlocked: shouldBlockInstallation,
        scopeChangeRequested:
          recordDto.outcome === TvOutcome.YES_BUT ? true : false,
        scopeChangeRequestedAt:
          recordDto.outcome === TvOutcome.YES_BUT ? new Date() : null,
      },
    });

    // If installation is linked, create/update dependency
    if (recordDto.linkedInstallationOrderId && shouldBlockInstallation) {
      await this.createInstallationDependency(
        tvServiceOrder.id,
        recordDto.linkedInstallationOrderId,
      );
    }

    // If outcome is YES and installation was previously blocked, unblock it
    if (recordDto.outcome === TvOutcome.YES && recordDto.linkedInstallationOrderId) {
      await this.unblockInstallation(
        recordDto.linkedInstallationOrderId,
        tvOutcome.id,
      );
    }

    // Publish Kafka event for downstream consumers
    await this.publishTvOutcomeRecordedEvent(tvOutcome, tvServiceOrder);

    this.logger.log(
      `TV outcome recorded: ${tvOutcome.id} (outcome: ${recordDto.outcome}, blocked: ${shouldBlockInstallation})`,
    );

    return this.mapToResponseDto(tvOutcome);
  }

  /**
   * Link an installation order to a TV
   */
  async linkInstallation(
    tvServiceOrderId: string,
    linkDto: LinkInstallationDto,
  ): Promise<TvOutcomeResponseDto> {
    this.logger.log(
      `Linking installation ${linkDto.installationServiceOrderId} to TV ${tvServiceOrderId}`,
    );

    // Find existing TV outcome
    const tvOutcome = await this.prisma.technicalVisitOutcome.findUnique({
      where: { tvServiceOrderId },
    });

    if (!tvOutcome) {
      throw new NotFoundException(
        `No TV outcome found for service order ${tvServiceOrderId}`,
      );
    }

    // Validate installation order
    const installationOrder = await this.prisma.serviceOrder.findUnique({
      where: { id: linkDto.installationServiceOrderId },
      include: { service: true },
    });

    if (!installationOrder) {
      throw new NotFoundException(
        `Installation order ${linkDto.installationServiceOrderId} not found`,
      );
    }

    if (installationOrder.service.serviceType !== ServiceType.INSTALLATION) {
      throw new BadRequestException(
        `Service order ${linkDto.installationServiceOrderId} is not an INSTALLATION`,
      );
    }

    // Update TV outcome with linked installation
    const updated = await this.prisma.technicalVisitOutcome.update({
      where: { id: tvOutcome.id },
      data: {
        linkedInstallationOrderId: linkDto.installationServiceOrderId,
      },
    });

    // Create dependency if installation should be blocked
    if (tvOutcome.installationBlocked) {
      await this.createInstallationDependency(
        tvServiceOrderId,
        linkDto.installationServiceOrderId,
      );
    }

    this.logger.log(
      `Installation ${linkDto.installationServiceOrderId} linked to TV ${tvServiceOrderId}`,
    );

    return this.mapToResponseDto(updated);
  }

  /**
   * Get TV outcome by TV service order ID
   */
  async getOutcomeByTvId(tvServiceOrderId: string): Promise<TvOutcomeResponseDto> {
    const tvOutcome = await this.prisma.technicalVisitOutcome.findUnique({
      where: { tvServiceOrderId },
    });

    if (!tvOutcome) {
      throw new NotFoundException(
        `No TV outcome found for service order ${tvServiceOrderId}`,
      );
    }

    return this.mapToResponseDto(tvOutcome);
  }

  /**
   * Get TV outcome by outcome ID
   */
  async getOutcome(outcomeId: string): Promise<TvOutcomeResponseDto> {
    const tvOutcome = await this.prisma.technicalVisitOutcome.findUnique({
      where: { id: outcomeId },
    });

    if (!tvOutcome) {
      throw new NotFoundException(`TV outcome ${outcomeId} not found`);
    }

    return this.mapToResponseDto(tvOutcome);
  }

  /**
   * Approve scope change for YES_BUT outcome
   */
  async approveScopeChange(
    outcomeId: string,
    approvedBy: string,
  ): Promise<TvOutcomeResponseDto> {
    this.logger.log(`Approving scope change for TV outcome ${outcomeId}`);

    const tvOutcome = await this.prisma.technicalVisitOutcome.findUnique({
      where: { id: outcomeId },
    });

    if (!tvOutcome) {
      throw new NotFoundException(`TV outcome ${outcomeId} not found`);
    }

    if (tvOutcome.outcome !== TvOutcome.YES_BUT) {
      throw new BadRequestException(
        'Scope change approval is only applicable for YES_BUT outcomes',
      );
    }

    if (tvOutcome.scopeChangeApproved) {
      throw new BadRequestException('Scope change already approved');
    }

    // Approve scope change
    const updated = await this.prisma.technicalVisitOutcome.update({
      where: { id: outcomeId },
      data: {
        scopeChangeApproved: true,
        scopeChangeApprovedAt: new Date(),
        scopeChangeApprovedBy: approvedBy,
      },
    });

    // Unblock installation if it was linked and blocked
    if (updated.linkedInstallationOrderId) {
      await this.unblockInstallation(updated.linkedInstallationOrderId, outcomeId);
    }

    this.logger.log(
      `Scope change approved for TV outcome ${outcomeId} by ${approvedBy}`,
    );

    return this.mapToResponseDto(updated);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Create dependency between TV and installation order
   */
  private async createInstallationDependency(
    tvServiceOrderId: string,
    installationServiceOrderId: string,
  ): Promise<void> {
    // Check if dependency already exists
    const existing = await this.prisma.serviceOrderDependency.findFirst({
      where: {
        dependentOrderId: installationServiceOrderId,
        blocksOrderId: tvServiceOrderId,
      },
    });

    if (existing) {
      this.logger.debug(
        `Dependency already exists between TV ${tvServiceOrderId} and Installation ${installationServiceOrderId}`,
      );
      return;
    }

    // Create dependency: Installation depends on TV outcome
    await this.prisma.serviceOrderDependency.create({
      data: {
        dependentOrderId: installationServiceOrderId, // Installation is dependent
        blocksOrderId: tvServiceOrderId, // TV blocks the installation
        dependencyType: DependencyType.TV_OUTCOME,
        staticBufferDays: 0, // No static buffer for TV dependencies
      },
    });

    this.logger.log(
      `Created TV dependency: Installation ${installationServiceOrderId} blocked by TV ${tvServiceOrderId}`,
    );
  }

  /**
   * Unblock installation order
   */
  private async unblockInstallation(
    installationServiceOrderId: string,
    tvOutcomeId: string,
  ): Promise<void> {
    // Update TV outcome to mark installation as unblocked
    await this.prisma.technicalVisitOutcome.update({
      where: { id: tvOutcomeId },
      data: {
        installationBlocked: false,
        installationUnblockedAt: new Date(),
      },
    });

    // Remove TV dependency from installation order
    const tvOutcome = await this.prisma.technicalVisitOutcome.findUnique({
      where: { id: tvOutcomeId },
    });

    if (tvOutcome) {
      await this.prisma.serviceOrderDependency.deleteMany({
        where: {
          dependentOrderId: installationServiceOrderId,
          blocksOrderId: tvOutcome.tvServiceOrderId,
          dependencyType: DependencyType.TV_OUTCOME,
        },
      });

      this.logger.log(
        `Installation ${installationServiceOrderId} unblocked (TV outcome: ${tvOutcomeId})`,
      );
    }
  }

  /**
   * Publish TV outcome recorded event to Kafka
   *
   * Event: projects.tv_outcome.recorded
   * Topic: fsm.projects
   * Partition key: {country_code}_{tv_service_order_id}
   *
   * Consumers:
   * - Orchestration Service: Unblock/cancel installation orders
   * - Sales Adapter: Send modifications for repricing (YES_BUT) or cancellation (NO)
   * - Assignment Service: Re-assign installation if needed
   */
  private async publishTvOutcomeRecordedEvent(
    tvOutcome: any,
    tvServiceOrder: any,
  ): Promise<void> {
    try {
      // Map Prisma TvOutcome enum to event TvOutcomeEnum
      const outcomeMap: Record<TvOutcome, TvOutcomeEnum> = {
        [TvOutcome.YES]: TvOutcomeEnum.YES,
        [TvOutcome.YES_BUT]: TvOutcomeEnum.YES_BUT,
        [TvOutcome.NO]: TvOutcomeEnum.NO,
      };

      // Build event payload
      const eventPayload: Omit<
        TvOutcomeRecordedEvent,
        'event_id' | 'event_name' | 'event_timestamp'
      > = {
        tv_service_order_id: tvOutcome.tvServiceOrderId,
        linked_installation_order_id: tvOutcome.linkedInstallationOrderId,
        outcome: outcomeMap[tvOutcome.outcome],
        modifications: tvOutcome.modifications
          ? tvOutcome.modifications.map((mod: any) => ({
              description: mod.description,
              extra_duration_min: mod.extraDurationMin,
            }))
          : null,
        recorded_by: tvOutcome.recordedBy,
        country_code: tvServiceOrder.countryCode,
        business_unit: tvServiceOrder.businessUnit,
        project_id: tvServiceOrder.projectId,
        external_sales_order_id: tvServiceOrder.externalSalesOrderId,
        external_project_id: tvServiceOrder.externalProjectId,
        sales_system_source: tvServiceOrder.externalSystemSource,
        technician_notes: tvOutcome.technicianNotes,
      };

      // Publish to Kafka
      // Partition key ensures all events for same country/TV order go to same partition
      const partitionKey = `${tvServiceOrder.countryCode}_${tvOutcome.tvServiceOrderId}`;

      await this.kafkaProducer.sendEvent(
        'projects.tv_outcome.recorded',
        eventPayload,
        tvOutcome.id, // Use outcome ID as correlation ID
      );

      this.logger.log(
        `📤 Published TV outcome event: ${tvOutcome.outcome} | TV SO: ${tvOutcome.tvServiceOrderId} | Key: ${partitionKey}`,
      );
    } catch (error) {
      // Log error but don't fail the request
      // Event publishing is asynchronous and should not block the main flow
      this.logger.error(
        `❌ Failed to publish TV outcome event for ${tvOutcome.tvServiceOrderId}:`,
        error,
      );
      // TODO: In production, consider:
      // 1. Retry logic with exponential backoff
      // 2. Dead letter queue for failed events
      // 3. Event outbox pattern for guaranteed delivery
    }
  }

  /**
   * Map Prisma entity to response DTO
   */
  private mapToResponseDto(tvOutcome: any): TvOutcomeResponseDto {
    return {
      id: tvOutcome.id,
      tvServiceOrderId: tvOutcome.tvServiceOrderId,
      linkedInstallationOrderId: tvOutcome.linkedInstallationOrderId,
      outcome: tvOutcome.outcome,
      modifications: tvOutcome.modifications,
      technicianNotes: tvOutcome.technicianNotes,
      scopeChangeRequested: tvOutcome.scopeChangeRequested,
      scopeChangeRequestedAt: tvOutcome.scopeChangeRequestedAt,
      scopeChangeApproved: tvOutcome.scopeChangeApproved,
      scopeChangeApprovedAt: tvOutcome.scopeChangeApprovedAt,
      scopeChangeApprovedBy: tvOutcome.scopeChangeApprovedBy,
      installationBlocked: tvOutcome.installationBlocked,
      installationUnblockedAt: tvOutcome.installationUnblockedAt,
      recordedAt: tvOutcome.recordedAt,
      recordedBy: tvOutcome.recordedBy,
      createdAt: tvOutcome.createdAt,
      updatedAt: tvOutcome.updatedAt,
    };
  }
}
