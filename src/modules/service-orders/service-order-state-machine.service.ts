import { Injectable, BadRequestException } from '@nestjs/common';
import { ServiceOrderState } from '@prisma/client';

/**
 * Service Order State Machine
 *
 * Valid state transitions:
 * CREATED → SCHEDULED
 * SCHEDULED → ASSIGNED
 * ASSIGNED → ACCEPTED | CANCELLED
 * ACCEPTED → IN_PROGRESS | CANCELLED
 * IN_PROGRESS → COMPLETED | CANCELLED
 * COMPLETED → VALIDATED | CANCELLED
 * VALIDATED → CLOSED
 *
 * CANCELLED is terminal (no transitions out)
 * CLOSED is terminal (no transitions out)
 */
@Injectable()
export class ServiceOrderStateMachineService {
  private readonly validTransitions: Map<ServiceOrderState, ServiceOrderState[]> = new Map([
    [ServiceOrderState.CREATED, [ServiceOrderState.SCHEDULED, ServiceOrderState.CANCELLED]],
    [ServiceOrderState.SCHEDULED, [ServiceOrderState.ASSIGNED, ServiceOrderState.CANCELLED]],
    [ServiceOrderState.ASSIGNED, [ServiceOrderState.ACCEPTED, ServiceOrderState.CANCELLED]],
    [ServiceOrderState.ACCEPTED, [ServiceOrderState.IN_PROGRESS, ServiceOrderState.CANCELLED]],
    [ServiceOrderState.IN_PROGRESS, [ServiceOrderState.COMPLETED, ServiceOrderState.CANCELLED]],
    [ServiceOrderState.COMPLETED, [ServiceOrderState.VALIDATED, ServiceOrderState.CANCELLED]],
    [ServiceOrderState.VALIDATED, [ServiceOrderState.CLOSED]],
    [ServiceOrderState.CANCELLED, []], // Terminal state
    [ServiceOrderState.CLOSED, []], // Terminal state
  ]);

  /**
   * Check if a state transition is valid
   */
  canTransition(from: ServiceOrderState, to: ServiceOrderState): boolean {
    const allowedStates = this.validTransitions.get(from);
    return allowedStates?.includes(to) ?? false;
  }

  /**
   * Validate and execute a state transition
   * @throws BadRequestException if transition is invalid
   */
  validateTransition(from: ServiceOrderState, to: ServiceOrderState, reason?: string): void {
    if (!this.canTransition(from, to)) {
      throw new BadRequestException(
        `Invalid state transition from ${from} to ${to}.` +
        (reason ? ` Reason: ${reason}` : '') +
        ` Allowed transitions: ${this.getAllowedTransitions(from).join(', ') || 'none (terminal state)'}`,
      );
    }
  }

  /**
   * Get all allowed transitions from a given state
   */
  getAllowedTransitions(from: ServiceOrderState): ServiceOrderState[] {
    return this.validTransitions.get(from) ?? [];
  }

  /**
   * Check if a state is terminal (no transitions out)
   */
  isTerminalState(state: ServiceOrderState): boolean {
    const allowedStates = this.validTransitions.get(state);
    return !allowedStates || allowedStates.length === 0;
  }

  /**
   * Get the expected next state in the happy path
   */
  getNextState(current: ServiceOrderState): ServiceOrderState | null {
    const happyPath: Record<ServiceOrderState, ServiceOrderState | null> = {
      [ServiceOrderState.CREATED]: ServiceOrderState.SCHEDULED,
      [ServiceOrderState.SCHEDULED]: ServiceOrderState.ASSIGNED,
      [ServiceOrderState.ASSIGNED]: ServiceOrderState.ACCEPTED,
      [ServiceOrderState.ACCEPTED]: ServiceOrderState.IN_PROGRESS,
      [ServiceOrderState.IN_PROGRESS]: ServiceOrderState.COMPLETED,
      [ServiceOrderState.COMPLETED]: ServiceOrderState.VALIDATED,
      [ServiceOrderState.VALIDATED]: ServiceOrderState.CLOSED,
      [ServiceOrderState.CANCELLED]: null,
      [ServiceOrderState.CLOSED]: null,
    };

    return happyPath[current];
  }

  /**
   * Business rule validations for specific transitions
   */
  validateBusinessRules(
    from: ServiceOrderState,
    to: ServiceOrderState,
    context: {
      hasScheduledSlot?: boolean;
      hasAssignedProvider?: boolean;
      dependenciesSatisfied?: boolean;
      isWithinSchedulingWindow?: boolean;
    },
  ): void {
    // CREATED → SCHEDULED: Must have valid scheduling window
    if (from === ServiceOrderState.CREATED && to === ServiceOrderState.SCHEDULED) {
      if (context.isWithinSchedulingWindow === false) {
        throw new BadRequestException(
          'Cannot schedule outside the scheduling window',
        );
      }
      if (context.dependenciesSatisfied === false) {
        throw new BadRequestException(
          'Cannot schedule with unsatisfied dependencies',
        );
      }
    }

    // SCHEDULED → ASSIGNED: Must have scheduled slot
    if (from === ServiceOrderState.SCHEDULED && to === ServiceOrderState.ASSIGNED) {
      if (!context.hasScheduledSlot) {
        throw new BadRequestException(
          'Cannot assign provider before scheduling',
        );
      }
    }

    // Cannot reschedule after ASSIGNED
    const noRescheduleStates: ServiceOrderState[] = [
      ServiceOrderState.ASSIGNED,
      ServiceOrderState.ACCEPTED,
      ServiceOrderState.IN_PROGRESS,
    ];
    if (noRescheduleStates.includes(from) && to === ServiceOrderState.SCHEDULED) {
      throw new BadRequestException(
        `Cannot reschedule order in ${from} state`,
      );
    }

    // Cannot reassign after ACCEPTED
    const noReassignStates: ServiceOrderState[] = [
      ServiceOrderState.ACCEPTED,
      ServiceOrderState.IN_PROGRESS,
    ];
    if (noReassignStates.includes(from) && to === ServiceOrderState.ASSIGNED) {
      throw new BadRequestException(
        `Cannot reassign provider in ${from} state`,
      );
    }
  }

  /**
   * Get a human-readable description of a state
   */
  getStateDescription(state: ServiceOrderState): string {
    const descriptions: Record<ServiceOrderState, string> = {
      [ServiceOrderState.CREATED]: 'Service order created, awaiting scheduling',
      [ServiceOrderState.SCHEDULED]: 'Time slot reserved, awaiting provider assignment',
      [ServiceOrderState.ASSIGNED]: 'Assigned to provider, awaiting acceptance',
      [ServiceOrderState.ACCEPTED]: 'Provider accepted, awaiting execution',
      [ServiceOrderState.IN_PROGRESS]: 'Service in progress',
      [ServiceOrderState.COMPLETED]: 'Service completed, awaiting validation',
      [ServiceOrderState.VALIDATED]: 'Validated, awaiting closure',
      [ServiceOrderState.CLOSED]: 'Service order closed (final state)',
      [ServiceOrderState.CANCELLED]: 'Service order cancelled (final state)',
    };

    return descriptions[state] || 'Unknown state';
  }
}
