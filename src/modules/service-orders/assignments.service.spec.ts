import { AssignmentsService } from './assignments.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AssignmentMode, AssignmentState, ServiceOrderState } from '@prisma/client';

describe('AssignmentsService', () => {
  const mockPrisma = {
    serviceOrder: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    assignment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  let service: AssignmentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AssignmentsService(mockPrisma as unknown as PrismaService);
    mockPrisma.serviceOrder.findUnique.mockResolvedValue({
      id: 'so1',
      countryCode: 'ES',
    });
    mockPrisma.assignment.create.mockImplementation(({ data }) => ({ id: `a-${data.providerId}`, ...data }));
  });

  it('creates direct assignment and auto-accepts', async () => {
    const result = await service.createAssignments({
      serviceOrderId: 'so1',
      providerIds: ['p1'],
      mode: AssignmentMode.DIRECT,
    });

    expect(result[0].state).toBe(AssignmentState.ACCEPTED);
    expect(mockPrisma.serviceOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          state: ServiceOrderState.ACCEPTED,
        }),
      }),
    );
  });

  it('creates offer assignment without auto-accept', async () => {
    mockPrisma.serviceOrder.findUnique.mockResolvedValue({
      id: 'so1',
      countryCode: 'FR',
    });

    const assignments = await service.createAssignments({
      serviceOrderId: 'so1',
      providerIds: ['p1'],
      mode: AssignmentMode.OFFER,
    });

    expect(assignments[0].state).toBe(AssignmentState.OFFERED);
  });

  it('accepts assignment and updates service order', async () => {
    mockPrisma.assignment.findUnique.mockResolvedValue({
      id: 'a1',
      providerId: 'p1',
      workTeamId: 'w1',
      serviceOrderId: 'so1',
    });
    mockPrisma.assignment.update.mockResolvedValue({ id: 'a1', state: AssignmentState.ACCEPTED });

    const updated = await service.acceptAssignment('a1');

    expect(updated.state).toBe(AssignmentState.ACCEPTED);
    expect(mockPrisma.serviceOrder.update).toHaveBeenCalled();
  });
});
