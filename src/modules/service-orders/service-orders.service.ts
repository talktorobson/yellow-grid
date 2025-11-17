import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ServiceOrderStateMachineService } from './service-order-state-machine.service';
import { BufferLogicService } from '../scheduling/buffer-logic.service';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { ScheduleServiceOrderDto } from './dto/schedule-service-order.dto';
import { AssignServiceOrderDto } from './dto/assign-service-order.dto';
import { ServiceOrder, ServiceOrderState, Prisma } from '@prisma/client';

@Injectable()
export class ServiceOrdersService {
  private readonly logger = new Logger(ServiceOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: ServiceOrderStateMachineService,
    private readonly bufferLogic: BufferLogicService,
  ) {}

  /**
   * Create a new service order
   */
  async create(
    createDto: CreateServiceOrderDto,
    userId?: string,
  ): Promise<ServiceOrder> {
    this.logger.log(`Creating service order for service ${createDto.serviceId}`);

    // Validate service exists
    const service = await this.prisma.serviceCatalog.findUnique({
      where: { id: createDto.serviceId },
    });

    if (!service) {
      throw new NotFoundException(`Service ${createDto.serviceId} not found`);
    }

    // Validate project if provided
    if (createDto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: createDto.projectId },
      });

      if (!project) {
        throw new NotFoundException(`Project ${createDto.projectId} not found`);
      }

      // Validate multi-tenancy
      if (
        project.countryCode !== createDto.countryCode ||
        project.businessUnit !== createDto.businessUnit
      ) {
        throw new BadRequestException(
          'Project country/business unit must match service order',
        );
      }
    }

    // Validate scheduling window
    const requestedStart = new Date(createDto.requestedStartDate);
    const requestedEnd = new Date(createDto.requestedEndDate);

    if (requestedStart >= requestedEnd) {
      throw new BadRequestException(
        'Requested end date must be after start date',
      );
    }

    // Create service order
    const serviceOrder = await this.prisma.serviceOrder.create({
      data: {
        ...createDto,
        customerInfo: createDto.customerInfo as unknown as Prisma.InputJsonValue,
        serviceAddress: createDto.serviceAddress as unknown as Prisma.InputJsonValue,
        state: ServiceOrderState.CREATED,
        riskLevel: 'LOW', // Default risk level, will be updated by ML model
        createdBy: userId,
      },
    });

    this.logger.log(`Service order ${serviceOrder.id} created successfully`);

    return serviceOrder;
  }

  /**
   * Find all service orders with optional filters
   */
  async findAll(params: {
    skip?: number;
    take?: number;
    countryCode?: string;
    businessUnit?: string;
    state?: ServiceOrderState;
    priority?: string;
    assignedProviderId?: string;
    projectId?: string;
  }): Promise<{ data: ServiceOrder[]; total: number }> {
    const { skip = 0, take = 50, ...filters } = params;

    const where: Prisma.ServiceOrderWhereInput = {};

    if (filters.countryCode) {
      where.countryCode = filters.countryCode;
    }

    if (filters.businessUnit) {
      where.businessUnit = filters.businessUnit;
    }

    if (filters.state) {
      where.state = filters.state;
    }

    if (filters.priority) {
      where.priority = filters.priority as any;
    }

    if (filters.assignedProviderId) {
      where.assignedProviderId = filters.assignedProviderId;
    }

    if (filters.projectId) {
      where.projectId = filters.projectId;
    }

    const [data, total] = await Promise.all([
      this.prisma.serviceOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          project: {
            select: {
              id: true,
              projectName: true,
              status: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              serviceType: true,
              serviceCategory: true,
            },
          },
          assignedProvider: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          assignedWorkTeam: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.serviceOrder.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Find a single service order by ID
   */
  async findOne(id: string): Promise<ServiceOrder> {
    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        project: true,
        service: true,
        assignedProvider: true,
        assignedWorkTeam: true,
        dependencies: {
          include: {
            blockedOrder: {
              select: {
                id: true,
                state: true,
                serviceType: true,
              },
            },
          },
        },
        dependents: {
          include: {
            dependentOrder: {
              select: {
                id: true,
                state: true,
                serviceType: true,
              },
            },
          },
        },
        buffers: true,
        assignments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        bookings: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        riskFactors: true,
      },
    });

    if (!serviceOrder) {
      throw new NotFoundException(`Service order ${id} not found`);
    }

    return serviceOrder;
  }

  /**
   * Update a service order
   */
  async update(
    id: string,
    updateDto: UpdateServiceOrderDto,
    userId?: string,
  ): Promise<ServiceOrder> {
    const serviceOrder = await this.findOne(id);

    // Prevent updates to terminal states
    if (this.stateMachine.isTerminalState(serviceOrder.state)) {
      throw new BadRequestException(
        `Cannot update service order in ${serviceOrder.state} state`,
      );
    }

    const updated = await this.prisma.serviceOrder.update({
      where: { id },
      data: {
        ...updateDto,
        customerInfo: updateDto.customerInfo
          ? (updateDto.customerInfo as unknown as Prisma.InputJsonValue)
          : undefined,
        serviceAddress: updateDto.serviceAddress
          ? (updateDto.serviceAddress as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    });

    this.logger.log(`Service order ${id} updated by ${userId || 'system'}`);

    return updated;
  }

  /**
   * Schedule a service order (transition to SCHEDULED state)
   */
  async schedule(
    id: string,
    scheduleDto: ScheduleServiceOrderDto,
    userId?: string,
  ): Promise<ServiceOrder> {
    const serviceOrder = await this.findOne(id);

    // Validate state transition
    this.stateMachine.validateTransition(
      serviceOrder.state,
      ServiceOrderState.SCHEDULED,
      'Cannot schedule order',
    );

    // Validate scheduled time is within scheduling window
    const scheduledStart = new Date(scheduleDto.scheduledStartTime);
    const requestedStart = new Date(serviceOrder.requestedStartDate);
    const requestedEnd = new Date(serviceOrder.requestedEndDate);

    if (scheduledStart < requestedStart || scheduledStart > requestedEnd) {
      throw new BadRequestException(
        'Scheduled time must be within the requested scheduling window',
      );
    }

    // Validate scheduled end time is after start time
    const scheduledEnd = new Date(scheduleDto.scheduledEndTime);
    if (scheduledEnd <= scheduledStart) {
      throw new BadRequestException(
        'Scheduled end time must be after start time',
      );
    }

    // Check dependencies
    const unsatisfiedDeps = await this.getUnsatisfiedDependencies(id);
    if (unsatisfiedDeps.length > 0) {
      throw new BadRequestException(
        `Cannot schedule with unsatisfied dependencies: ${unsatisfiedDeps.map(d => d.id).join(', ')}`,
      );
    }

    // PRD BR-5: Validate booking window (global buffer)
    // Note: Static buffer (deliveryDate) will be implemented when dependency linking is added
    await this.bufferLogic.validateBookingWindow({
      scheduledDate: new Date(scheduleDto.scheduledDate),
      countryCode: serviceOrder.countryCode,
      businessUnit: serviceOrder.businessUnit,
    });

    this.logger.log(
      `Buffer validation passed for ${serviceOrder.countryCode}/${serviceOrder.businessUnit} on ${scheduleDto.scheduledDate}`,
    );

    // Update service order
    const updated = await this.prisma.serviceOrder.update({
      where: { id },
      data: {
        scheduledDate: new Date(scheduleDto.scheduledDate),
        scheduledStartTime: scheduledStart,
        scheduledEndTime: scheduledEnd,
        state: ServiceOrderState.SCHEDULED,
        stateChangedAt: new Date(),
      },
    });

    this.logger.log(
      `Service order ${id} scheduled for ${scheduleDto.scheduledDate} by ${userId || 'system'}`,
    );

    return updated;
  }

  /**
   * Assign a provider to a service order (transition to ASSIGNED state)
   */
  async assign(
    id: string,
    assignDto: AssignServiceOrderDto,
    userId?: string,
  ): Promise<ServiceOrder> {
    const serviceOrder = await this.findOne(id);

    // Validate state transition
    this.stateMachine.validateTransition(
      serviceOrder.state,
      ServiceOrderState.ASSIGNED,
      'Cannot assign provider',
    );

    // Must be scheduled first
    if (!serviceOrder.scheduledDate) {
      throw new BadRequestException('Cannot assign provider before scheduling');
    }

    // Validate provider exists
    const provider = await this.prisma.provider.findUnique({
      where: { id: assignDto.providerId },
    });

    if (!provider) {
      throw new NotFoundException(`Provider ${assignDto.providerId} not found`);
    }

    // Validate work team if provided
    if (assignDto.workTeamId) {
      const workTeam = await this.prisma.workTeam.findUnique({
        where: { id: assignDto.workTeamId },
      });

      if (!workTeam) {
        throw new NotFoundException(`Work team ${assignDto.workTeamId} not found`);
      }

      if (workTeam.providerId !== assignDto.providerId) {
        throw new BadRequestException('Work team does not belong to provider');
      }
    }

    // Update service order
    const updated = await this.prisma.serviceOrder.update({
      where: { id },
      data: {
        assignedProviderId: assignDto.providerId,
        assignedWorkTeamId: assignDto.workTeamId,
        state: ServiceOrderState.ASSIGNED,
        stateChangedAt: new Date(),
      },
    });

    this.logger.log(
      `Service order ${id} assigned to provider ${assignDto.providerId} by ${userId || 'system'}`,
    );

    return updated;
  }

  /**
   * Cancel a service order
   */
  async cancel(id: string, reason: string, userId?: string): Promise<ServiceOrder> {
    const serviceOrder = await this.findOne(id);

    // Validate state transition
    this.stateMachine.validateTransition(
      serviceOrder.state,
      ServiceOrderState.CANCELLED,
      'Cannot cancel order',
    );

    const updated = await this.prisma.serviceOrder.update({
      where: { id },
      data: {
        state: ServiceOrderState.CANCELLED,
        stateChangedAt: new Date(),
      },
    });

    this.logger.log(
      `Service order ${id} cancelled by ${userId || 'system'}. Reason: ${reason}`,
    );

    return updated;
  }

  /**
   * Get unsatisfied dependencies for a service order
   */
  async getUnsatisfiedDependencies(id: string) {
    const dependencies = await this.prisma.serviceOrderDependency.findMany({
      where: { dependentOrderId: id },
      include: {
        blockedOrder: true,
      },
    });

    return dependencies.filter(dep => {
      if (dep.dependencyType === 'REQUIRES_COMPLETION') {
        return dep.blockedOrder.state !== ServiceOrderState.COMPLETED &&
               dep.blockedOrder.state !== ServiceOrderState.VALIDATED &&
               dep.blockedOrder.state !== ServiceOrderState.CLOSED;
      }
      if (dep.dependencyType === 'REQUIRES_VALIDATION') {
        return dep.blockedOrder.state !== ServiceOrderState.VALIDATED &&
               dep.blockedOrder.state !== ServiceOrderState.CLOSED;
      }
      return false;
    });
  }

  /**
   * Soft delete (archive) a service order
   */
  async remove(id: string, userId?: string): Promise<void> {
    const serviceOrder = await this.findOne(id);

    // Only allow deletion of CREATED or CANCELLED orders
    if (
      serviceOrder.state !== ServiceOrderState.CREATED &&
      serviceOrder.state !== ServiceOrderState.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot delete service order in ${serviceOrder.state} state. Only CREATED or CANCELLED orders can be deleted.`,
      );
    }

    await this.prisma.serviceOrder.delete({
      where: { id },
    });

    this.logger.log(`Service order ${id} deleted by ${userId || 'system'}`);
  }
}
