import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';

/**
 * Test Data Factory
 * Provides convenient methods to create test data with realistic defaults
 */
export class TestDataFactory {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a test user
   */
  async createUser(overrides: any = {}) {
    const defaults = {
      email: faker.internet.email().toLowerCase(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: faker.phone.number('+34#########'),
      passwordHash: '$2b$10$hashedPasswordExample', // Mock hash
      userType: 'INTERNAL_OPERATOR',
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      status: 'ACTIVE',
    };

    return this.prisma.user.create({
      data: { ...defaults, ...overrides },
    });
  }

  /**
   * Create a test provider
   */
  async createProvider(overrides: any = {}) {
    const defaults = {
      name: faker.company.name(),
      legalName: faker.company.name() + ' S.L.',
      email: faker.internet.email().toLowerCase(),
      phone: faker.phone.number('+34#########'),
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      status: 'ACTIVE',
      taxId: 'ES' + faker.string.numeric(9),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        postalCode: faker.location.zipCode(),
        country: 'ES',
      },
      bankAccount: {
        bankName: faker.company.name() + ' Bank',
        accountNumber: 'ES' + faker.string.numeric(22),
        swiftCode: faker.string.alphanumeric(11).toUpperCase(),
      },
      onboardingStatus: 'COMPLETED',
    };

    return this.prisma.provider.create({
      data: { ...defaults, ...overrides },
    });
  }

  /**
   * Create a test work team
   */
  async createWorkTeam(providerId: string, overrides: any = {}) {
    const defaults = {
      providerId,
      name: 'Team ' + faker.string.alpha(5).toUpperCase(),
      status: 'ACTIVE',
      capacity: faker.number.int({ min: 1, max: 5 }),
      serviceRadius: faker.number.int({ min: 10, max: 50 }),
      baseLocation: {
        latitude: faker.location.latitude(),
        longitude: faker.location.longitude(),
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        postalCode: faker.location.zipCode(),
      },
      countryCode: 'ES',
      businessUnit: 'LM_ES',
    };

    return this.prisma.workTeam.create({
      data: { ...defaults, ...overrides },
    });
  }

  /**
   * Create a test technician
   */
  async createTechnician(workTeamId: string, overrides: any = {}) {
    const defaults = {
      workTeamId,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email().toLowerCase(),
      phone: faker.phone.number('+34#########'),
      status: 'ACTIVE',
      skills: ['INSTALLATION', 'REPAIR'],
      certifications: ['CERT_A'],
      deviceId: faker.string.uuid(),
      countryCode: 'ES',
      businessUnit: 'LM_ES',
    };

    return this.prisma.technician.create({
      data: { ...defaults, ...overrides },
    });
  }

  /**
   * Create a test project
   */
  async createProject(overrides: any = {}) {
    const defaults = {
      projectNumber: 'PRJ-' + faker.string.alphanumeric(8).toUpperCase(),
      status: 'ACTIVE',
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      storeCode: 'LM' + faker.string.numeric(3),
      customerInfo: {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
        phone: faker.phone.number('+34#########'),
        address: {
          street: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.state(),
          postalCode: faker.location.zipCode(),
          country: 'ES',
        },
      },
      serviceAddress: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        postalCode: faker.location.zipCode(),
        country: 'ES',
        latitude: faker.location.latitude(),
        longitude: faker.location.longitude(),
      },
    };

    return this.prisma.project.create({
      data: { ...defaults, ...overrides },
    });
  }

  /**
   * Create a test service order
   */
  async createServiceOrder(projectId: string, overrides: any = {}) {
    const defaults = {
      projectId,
      orderNumber: 'SO-' + faker.string.alphanumeric(10).toUpperCase(),
      serviceType: 'INSTALLATION',
      priority: 'P2',
      status: 'CREATED',
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      description: faker.lorem.sentence(),
      estimatedDuration: faker.number.int({ min: 60, max: 240 }),
      requiredSkills: ['INSTALLATION'],
    };

    return this.prisma.serviceOrder.create({
      data: { ...defaults, ...overrides },
    });
  }

  /**
   * Create a test assignment
   */
  async createAssignment(serviceOrderId: string, providerId: string, overrides: any = {}) {
    const defaults = {
      serviceOrderId,
      providerId,
      status: 'PENDING',
      assignmentMode: 'DIRECT',
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      score: faker.number.float({ min: 0, max: 100, multipleOf: 0.01 }),
      scoringDetails: {
        skillMatch: faker.number.float({ min: 0, max: 30 }),
        availability: faker.number.float({ min: 0, max: 25 }),
        distance: faker.number.float({ min: 0, max: 20 }),
        performance: faker.number.float({ min: 0, max: 15 }),
        workload: faker.number.float({ min: 0, max: 10 }),
      },
    };

    return this.prisma.assignment.create({
      data: { ...defaults, ...overrides },
    });
  }

  /**
   * Create a test contract
   */
  async createContract(serviceOrderId: string, overrides: any = {}) {
    const defaults = {
      serviceOrderId,
      contractNumber: 'CTR-' + faker.string.alphanumeric(10).toUpperCase(),
      contractType: 'PRE_SERVICE',
      status: 'DRAFT',
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      terms: faker.lorem.paragraph(),
      amount: faker.number.float({ min: 50, max: 500, multipleOf: 0.01 }),
    };

    return this.prisma.contract.create({
      data: { ...defaults, ...overrides },
    });
  }

  /**
   * Create a test technical visit
   */
  async createTechnicalVisit(projectId: string, overrides: any = {}) {
    const defaults = {
      projectId,
      visitNumber: 'TV-' + faker.string.alphanumeric(10).toUpperCase(),
      status: 'CREATED',
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      purpose: 'PRE_INSTALLATION_ASSESSMENT',
    };

    return this.prisma.technicalVisit.create({
      data: { ...defaults, ...overrides },
    });
  }

  /**
   * Create a test task
   */
  async createTask(serviceOrderId: string, overrides: any = {}) {
    const defaults = {
      serviceOrderId,
      title: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      status: 'PENDING',
      priority: 'MEDIUM',
      countryCode: 'ES',
      businessUnit: 'LM_ES',
    };

    return this.prisma.task.create({
      data: { ...defaults, ...overrides },
    });
  }

  /**
   * Create a complete test scenario with project, service order, provider, and assignment
   */
  async createCompleteScenario() {
    const provider = await this.createProvider();
    const workTeam = await this.createWorkTeam(provider.id);
    const technician = await this.createTechnician(workTeam.id);
    const project = await this.createProject();
    const serviceOrder = await this.createServiceOrder(project.id);
    const assignment = await this.createAssignment(serviceOrder.id, provider.id);

    return {
      provider,
      workTeam,
      technician,
      project,
      serviceOrder,
      assignment,
    };
  }

  /**
   * Clean up all test data
   */
  async cleanup() {
    // Cleanup is handled by DatabaseTestSetup.cleanDatabase()
  }
}
