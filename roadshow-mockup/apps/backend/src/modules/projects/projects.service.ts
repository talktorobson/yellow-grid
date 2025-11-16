import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AssignmentModeConfig, CountryCode } from '../../common/types/schema.types';

export interface CreateProjectDto {
  externalId?: string;
  worksiteStreet: string;
  worksiteCity: string;
  worksitePostal: string;
  worksiteCountry: CountryCode;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  assignmentMode?: AssignmentModeConfig;
  contacts?: Array<{
    name: string;
    role?: string;
    email?: string;
    phone?: string;
    isPrimary?: boolean;
  }>;
}

export interface UpdateProjectDto {
  worksiteStreet?: string;
  worksiteCity?: string;
  worksitePostal?: string;
  responsibleOperatorId?: string;
  assignmentMode?: AssignmentModeConfig;
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new project with contacts
   */
  async create(data: CreateProjectDto) {
    const { contacts, ...projectData } = data;

    // Get country config to determine assignment mode
    const country = await this.prisma.country.findUnique({
      where: { code: data.worksiteCountry },
    });

    const assignmentMode = data.assignmentMode || country?.projectOwnershipMode || AssignmentModeConfig.AUTO;

    const project = await this.prisma.project.create({
      data: {
        externalId: projectData.externalId,
        worksiteStreet: projectData.worksiteStreet,
        worksiteCity: projectData.worksiteCity,
        worksitePostal: projectData.worksitePostal,
        worksiteCountry: projectData.worksiteCountry,
        assignmentMode,
        totalEstimatedHours: 0,
        contacts: contacts ? {
          create: contacts.map(contact => ({
            name: contact.name,
            role: contact.role,
            email: contact.email,
            phone: contact.phone,
            isPrimary: contact.isPrimary ?? false,
          })),
        } : undefined,
      },
      include: {
        contacts: true,
        responsibleOperator: true,
      },
    });

    // Auto-assign Pilote du Chantier if AUTO mode
    if (assignmentMode === AssignmentModeConfig.AUTO) {
      await this.assignPiloteDuChantier(project.id, data.worksiteCountry);
    }

    return this.findOne(project.id);
  }

  /**
   * Find all projects with filters
   */
  async findAll(filters?: {
    countryCode?: CountryCode;
    responsibleOperatorId?: string;
    assignmentMode?: AssignmentModeConfig;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters?.countryCode) {
      where.worksiteCountry = filters.countryCode;
    }

    if (filters?.responsibleOperatorId) {
      where.responsibleOperatorId = filters.responsibleOperatorId;
    }

    if (filters?.assignmentMode) {
      where.assignmentMode = filters.assignmentMode;
    }

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          contacts: true,
          responsibleOperator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              serviceOrders: true,
              contracts: true,
            },
          },
        },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data: projects,
      total,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0,
    };
  }

  /**
   * Find project by ID
   */
  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        contacts: true,
        responsibleOperator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        serviceOrders: {
          select: {
            id: true,
            externalId: true,
            serviceType: true,
            status: true,
            scheduledDate: true,
            estimatedDuration: true,
          },
          orderBy: {
            scheduledDate: 'asc',
          },
        },
        contracts: {
          select: {
            id: true,
            contractNumber: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            serviceOrders: true,
            contracts: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return project;
  }

  /**
   * Update project
   */
  async update(id: string, data: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data,
      include: {
        contacts: true,
        responsibleOperator: true,
      },
    });

    return updated;
  }

  /**
   * Delete project (soft delete - only if no service orders)
   */
  async remove(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            serviceOrders: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    if (project._count.serviceOrders > 0) {
      throw new Error('Cannot delete project with service orders');
    }

    await this.prisma.project.delete({
      where: { id },
    });

    return { deleted: true };
  }

  /**
   * AUTO-ASSIGN Pilote du Chantier (Project Owner)
   * Uses workload balancing algorithm based on totalEstimatedHours
   */
  async assignPiloteDuChantier(projectId: string, countryCode: CountryCode) {
    // Get all operators for this country
    const operators = await this.prisma.user.findMany({
      where: {
        countryCode,
        role: 'OPERATOR',
        active: true,
      },
      include: {
        ownedProjects: {
          select: {
            totalEstimatedHours: true,
          },
        },
      },
    });

    if (operators.length === 0) {
      console.warn(`No operators found for country ${countryCode}`);
      return null;
    }

    // Calculate current workload for each operator (sum of totalEstimatedHours)
    const operatorWorkloads = operators.map((operator: any) => {
      const totalHours = operator.ownedProjects.reduce(
        (sum: number, project: any) => sum + (project.totalEstimatedHours || 0),
        0
      );

      return {
        operatorId: operator.id,
        operatorName: operator.name,
        currentWorkloadHours: totalHours,
      };
    });

    // Sort by workload (ascending) - assign to operator with least workload
    operatorWorkloads.sort((a: any, b: any) => a.currentWorkloadHours - b.currentWorkloadHours);

    const selectedOperator = operatorWorkloads[0];

    // Assign the operator to the project
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        responsibleOperatorId: selectedOperator.operatorId,
      },
    });

    console.log(
      `✅ Pilote du Chantier assigned: ${selectedOperator.operatorName} ` +
      `(current workload: ${selectedOperator.currentWorkloadHours}h)`
    );

    return selectedOperator;
  }

  /**
   * Manually reassign Pilote du Chantier
   */
  async reassignPiloteDuChantier(projectId: string, newOperatorId: string) {
    const [project, operator] = await Promise.all([
      this.prisma.project.findUnique({ where: { id: projectId } }),
      this.prisma.user.findUnique({ where: { id: newOperatorId } }),
    ]);

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    if (!operator || operator.role !== 'OPERATOR') {
      throw new NotFoundException(`Operator ${newOperatorId} not found`);
    }

    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        responsibleOperatorId: newOperatorId,
      },
    });

    return this.findOne(projectId);
  }

  /**
   * Update project's total estimated hours (called when SOs are added/updated)
   */
  async updateTotalEstimatedHours(projectId: string) {
    const serviceOrders = await this.prisma.serviceOrder.findMany({
      where: { projectId },
      select: {
        estimatedDuration: true,
      },
    });

    const totalHours = serviceOrders.reduce(
      (sum: number, so: any) => sum + (so.estimatedDuration || 0),
      0
    );

    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        totalEstimatedHours: totalHours,
      },
    });

    return totalHours;
  }

  /**
   * PROJECT AUTO-ASSOCIATION
   * Match service order to existing project by customer info
   * Returns matching project ID or null if no match
   */
  async findMatchingProject(criteria: {
    worksiteStreet: string;
    worksitePostal: string;
    countryCode: CountryCode;
  }): Promise<string | null> {
    // Try exact match on worksite address
    const exactMatch = await this.prisma.project.findFirst({
      where: {
        worksiteStreet: criteria.worksiteStreet,
        worksitePostal: criteria.worksitePostal,
        worksiteCountry: criteria.countryCode,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (exactMatch) {
      return exactMatch.id;
    }

    // TODO: Fuzzy matching using AI/ML for similar addresses
    // For now, return null if no exact match

    return null;
  }

  /**
   * Add contact to project
   */
  async addContact(projectId: string, contact: {
    name: string;
    role?: string;
    email?: string;
    phone?: string;
    isPrimary?: boolean;
  }) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const newContact = await this.prisma.projectContact.create({
      data: {
        projectId,
        name: contact.name,
        role: contact.role,
        email: contact.email,
        phone: contact.phone,
        isPrimary: contact.isPrimary ?? false,
      },
    });

    return newContact;
  }

  /**
   * Get operator workload dashboard
   */
  async getOperatorWorkloads(countryCode?: CountryCode) {
    const where: any = {
      role: 'OPERATOR',
      active: true,
    };

    if (countryCode) {
      where.countryCode = countryCode;
    }

    const operators = await this.prisma.user.findMany({
      where,
      include: {
        ownedProjects: {
          select: {
            id: true,
            totalEstimatedHours: true,
            serviceOrders: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
    });

    return operators.map((operator: any) => {
      const projectCount = operator.ownedProjects.length;
      const totalHours = operator.ownedProjects.reduce(
        (sum: number, project: any) => sum + (project.totalEstimatedHours || 0),
        0
      );
      const activeSOCount = operator.ownedProjects.reduce(
        (sum: number, project: any) => sum + project.serviceOrders.filter(
          (so: any) => ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(so.status)
        ).length,
        0
      );

      return {
        operatorId: operator.id,
        operatorName: operator.name,
        operatorEmail: operator.email,
        countryCode: operator.countryCode,
        projectCount,
        totalEstimatedHours: totalHours,
        activeServiceOrderCount: activeSOCount,
      };
    });
  }
}
