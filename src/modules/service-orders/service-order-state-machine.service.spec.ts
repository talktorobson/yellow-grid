import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ServiceOrderStateMachineService } from './service-order-state-machine.service';
import { ServiceOrderState } from '@prisma/client';

describe('ServiceOrderStateMachineService', () => {
  let service: ServiceOrderStateMachineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceOrderStateMachineService],
    }).compile();

    service = module.get<ServiceOrderStateMachineService>(ServiceOrderStateMachineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('canTransition', () => {
    it('should allow CREATED → SCHEDULED transition', () => {
      expect(service.canTransition(ServiceOrderState.CREATED, ServiceOrderState.SCHEDULED)).toBe(true);
    });

    it('should allow CREATED → CANCELLED transition', () => {
      expect(service.canTransition(ServiceOrderState.CREATED, ServiceOrderState.CANCELLED)).toBe(true);
    });

    it('should allow SCHEDULED → ASSIGNED transition', () => {
      expect(service.canTransition(ServiceOrderState.SCHEDULED, ServiceOrderState.ASSIGNED)).toBe(true);
    });

    it('should allow ASSIGNED → ACCEPTED transition', () => {
      expect(service.canTransition(ServiceOrderState.ASSIGNED, ServiceOrderState.ACCEPTED)).toBe(true);
    });

    it('should allow ACCEPTED → IN_PROGRESS transition', () => {
      expect(service.canTransition(ServiceOrderState.ACCEPTED, ServiceOrderState.IN_PROGRESS)).toBe(true);
    });

    it('should allow IN_PROGRESS → COMPLETED transition', () => {
      expect(service.canTransition(ServiceOrderState.IN_PROGRESS, ServiceOrderState.COMPLETED)).toBe(true);
    });

    it('should allow COMPLETED → VALIDATED transition', () => {
      expect(service.canTransition(ServiceOrderState.COMPLETED, ServiceOrderState.VALIDATED)).toBe(true);
    });

    it('should allow VALIDATED → CLOSED transition', () => {
      expect(service.canTransition(ServiceOrderState.VALIDATED, ServiceOrderState.CLOSED)).toBe(true);
    });

    it('should NOT allow CREATED → ASSIGNED transition (skipping SCHEDULED)', () => {
      expect(service.canTransition(ServiceOrderState.CREATED, ServiceOrderState.ASSIGNED)).toBe(false);
    });

    it('should NOT allow CANCELLED → any transition (terminal state)', () => {
      expect(service.canTransition(ServiceOrderState.CANCELLED, ServiceOrderState.CREATED)).toBe(false);
      expect(service.canTransition(ServiceOrderState.CANCELLED, ServiceOrderState.SCHEDULED)).toBe(false);
    });

    it('should NOT allow CLOSED → any transition (terminal state)', () => {
      expect(service.canTransition(ServiceOrderState.CLOSED, ServiceOrderState.CREATED)).toBe(false);
      expect(service.canTransition(ServiceOrderState.CLOSED, ServiceOrderState.VALIDATED)).toBe(false);
    });

    it('should allow cancellation from most states', () => {
      expect(service.canTransition(ServiceOrderState.CREATED, ServiceOrderState.CANCELLED)).toBe(true);
      expect(service.canTransition(ServiceOrderState.SCHEDULED, ServiceOrderState.CANCELLED)).toBe(true);
      expect(service.canTransition(ServiceOrderState.ASSIGNED, ServiceOrderState.CANCELLED)).toBe(true);
      expect(service.canTransition(ServiceOrderState.ACCEPTED, ServiceOrderState.CANCELLED)).toBe(true);
      expect(service.canTransition(ServiceOrderState.IN_PROGRESS, ServiceOrderState.CANCELLED)).toBe(true);
      expect(service.canTransition(ServiceOrderState.COMPLETED, ServiceOrderState.CANCELLED)).toBe(true);
    });
  });

  describe('validateTransition', () => {
    it('should not throw for valid transition', () => {
      expect(() => {
        service.validateTransition(ServiceOrderState.CREATED, ServiceOrderState.SCHEDULED);
      }).not.toThrow();
    });

    it('should throw BadRequestException for invalid transition', () => {
      expect(() => {
        service.validateTransition(ServiceOrderState.CREATED, ServiceOrderState.ASSIGNED);
      }).toThrow(BadRequestException);
    });

    it('should include allowed transitions in error message', () => {
      try {
        service.validateTransition(ServiceOrderState.CREATED, ServiceOrderState.ASSIGNED);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('Invalid state transition');
        expect(error.message).toContain('CREATED');
        expect(error.message).toContain('ASSIGNED');
        expect(error.message).toContain('Allowed transitions');
      }
    });

    it('should include custom reason in error message', () => {
      try {
        service.validateTransition(
          ServiceOrderState.CREATED,
          ServiceOrderState.ASSIGNED,
          'Custom reason message',
        );
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('Custom reason message');
      }
    });
  });

  describe('getAllowedTransitions', () => {
    it('should return correct allowed transitions for CREATED', () => {
      const allowed = service.getAllowedTransitions(ServiceOrderState.CREATED);
      expect(allowed).toContain(ServiceOrderState.SCHEDULED);
      expect(allowed).toContain(ServiceOrderState.CANCELLED);
      expect(allowed).toHaveLength(2);
    });

    it('should return correct allowed transitions for SCHEDULED', () => {
      const allowed = service.getAllowedTransitions(ServiceOrderState.SCHEDULED);
      expect(allowed).toContain(ServiceOrderState.ASSIGNED);
      expect(allowed).toContain(ServiceOrderState.CANCELLED);
      expect(allowed).toHaveLength(2);
    });

    it('should return empty array for terminal states', () => {
      expect(service.getAllowedTransitions(ServiceOrderState.CANCELLED)).toHaveLength(0);
      expect(service.getAllowedTransitions(ServiceOrderState.CLOSED)).toHaveLength(0);
    });
  });

  describe('isTerminalState', () => {
    it('should return true for CANCELLED state', () => {
      expect(service.isTerminalState(ServiceOrderState.CANCELLED)).toBe(true);
    });

    it('should return true for CLOSED state', () => {
      expect(service.isTerminalState(ServiceOrderState.CLOSED)).toBe(true);
    });

    it('should return false for non-terminal states', () => {
      expect(service.isTerminalState(ServiceOrderState.CREATED)).toBe(false);
      expect(service.isTerminalState(ServiceOrderState.SCHEDULED)).toBe(false);
      expect(service.isTerminalState(ServiceOrderState.ASSIGNED)).toBe(false);
      expect(service.isTerminalState(ServiceOrderState.ACCEPTED)).toBe(false);
      expect(service.isTerminalState(ServiceOrderState.IN_PROGRESS)).toBe(false);
      expect(service.isTerminalState(ServiceOrderState.COMPLETED)).toBe(false);
      expect(service.isTerminalState(ServiceOrderState.VALIDATED)).toBe(false);
    });
  });

  describe('getNextState', () => {
    it('should return correct next state in happy path', () => {
      expect(service.getNextState(ServiceOrderState.CREATED)).toBe(ServiceOrderState.SCHEDULED);
      expect(service.getNextState(ServiceOrderState.SCHEDULED)).toBe(ServiceOrderState.ASSIGNED);
      expect(service.getNextState(ServiceOrderState.ASSIGNED)).toBe(ServiceOrderState.ACCEPTED);
      expect(service.getNextState(ServiceOrderState.ACCEPTED)).toBe(ServiceOrderState.IN_PROGRESS);
      expect(service.getNextState(ServiceOrderState.IN_PROGRESS)).toBe(ServiceOrderState.COMPLETED);
      expect(service.getNextState(ServiceOrderState.COMPLETED)).toBe(ServiceOrderState.VALIDATED);
      expect(service.getNextState(ServiceOrderState.VALIDATED)).toBe(ServiceOrderState.CLOSED);
    });

    it('should return null for terminal states', () => {
      expect(service.getNextState(ServiceOrderState.CANCELLED)).toBeNull();
      expect(service.getNextState(ServiceOrderState.CLOSED)).toBeNull();
    });
  });

  describe('validateBusinessRules', () => {
    it('should throw if scheduling outside window', () => {
      expect(() => {
        service.validateBusinessRules(
          ServiceOrderState.CREATED,
          ServiceOrderState.SCHEDULED,
          { isWithinSchedulingWindow: false },
        );
      }).toThrow(BadRequestException);
    });

    it('should throw if dependencies not satisfied', () => {
      expect(() => {
        service.validateBusinessRules(
          ServiceOrderState.CREATED,
          ServiceOrderState.SCHEDULED,
          { dependenciesSatisfied: false },
        );
      }).toThrow(BadRequestException);
    });

    it('should throw if assigning without scheduled slot', () => {
      expect(() => {
        service.validateBusinessRules(
          ServiceOrderState.SCHEDULED,
          ServiceOrderState.ASSIGNED,
          { hasScheduledSlot: false },
        );
      }).toThrow(BadRequestException);
    });

    it('should throw if trying to reschedule after ASSIGNED', () => {
      expect(() => {
        service.validateBusinessRules(
          ServiceOrderState.ASSIGNED,
          ServiceOrderState.SCHEDULED,
          {},
        );
      }).toThrow(BadRequestException);
    });

    it('should throw if trying to reschedule after ACCEPTED', () => {
      expect(() => {
        service.validateBusinessRules(
          ServiceOrderState.ACCEPTED,
          ServiceOrderState.SCHEDULED,
          {},
        );
      }).toThrow(BadRequestException);
    });

    it('should throw if trying to reassign after ACCEPTED', () => {
      expect(() => {
        service.validateBusinessRules(
          ServiceOrderState.ACCEPTED,
          ServiceOrderState.ASSIGNED,
          {},
        );
      }).toThrow(BadRequestException);
    });

    it('should throw if trying to reassign after IN_PROGRESS', () => {
      expect(() => {
        service.validateBusinessRules(
          ServiceOrderState.IN_PROGRESS,
          ServiceOrderState.ASSIGNED,
          {},
        );
      }).toThrow(BadRequestException);
    });

    it('should not throw for valid business rules', () => {
      expect(() => {
        service.validateBusinessRules(
          ServiceOrderState.CREATED,
          ServiceOrderState.SCHEDULED,
          {
            isWithinSchedulingWindow: true,
            dependenciesSatisfied: true,
          },
        );
      }).not.toThrow();

      expect(() => {
        service.validateBusinessRules(
          ServiceOrderState.SCHEDULED,
          ServiceOrderState.ASSIGNED,
          { hasScheduledSlot: true },
        );
      }).not.toThrow();
    });
  });

  describe('getStateDescription', () => {
    it('should return descriptions for all states', () => {
      // Just verify descriptions are returned for all states
      expect(service.getStateDescription(ServiceOrderState.CREATED)).toBeTruthy();
      expect(service.getStateDescription(ServiceOrderState.SCHEDULED)).toBeTruthy();
      expect(service.getStateDescription(ServiceOrderState.ASSIGNED)).toBeTruthy();
      expect(service.getStateDescription(ServiceOrderState.ACCEPTED)).toBeTruthy();
      expect(service.getStateDescription(ServiceOrderState.IN_PROGRESS)).toBeTruthy();
      expect(service.getStateDescription(ServiceOrderState.COMPLETED)).toBeTruthy();
      expect(service.getStateDescription(ServiceOrderState.VALIDATED)).toBeTruthy();
      expect(service.getStateDescription(ServiceOrderState.CLOSED)).toBeTruthy();
      expect(service.getStateDescription(ServiceOrderState.CANCELLED)).toBeTruthy();

      // Verify they are different
      const descriptions = [
        service.getStateDescription(ServiceOrderState.CREATED),
        service.getStateDescription(ServiceOrderState.SCHEDULED),
        service.getStateDescription(ServiceOrderState.ASSIGNED),
      ];
      const uniqueDescriptions = new Set(descriptions);
      expect(uniqueDescriptions.size).toBe(descriptions.length);
    });
  });
});
