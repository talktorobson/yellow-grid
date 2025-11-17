import { Injectable } from '@nestjs/common';

/**
 * Slot calculator for 15-minute granularity (96 slots/day).
 * Handles conversions between timestamps and slot indices with timezone awareness.
 */
@Injectable()
export class SlotCalculatorService {
  static readonly SLOT_MINUTES = 15;
  static readonly SLOTS_PER_DAY = 96;

  /**
   * Convert a Date to a slot index (0-95) using the provided timezone.
   */
  toSlotIndex(date: Date, timeZone = 'UTC'): number {
    const localDate = new Date(date.toLocaleString('en-US', { timeZone }));
    const minutes = localDate.getHours() * 60 + localDate.getMinutes();
    return Math.max(
      0,
      Math.min(SlotCalculatorService.SLOTS_PER_DAY - 1, Math.floor(minutes / SlotCalculatorService.SLOT_MINUTES)),
    );
  }

  /**
   * Convert slot index back to minutes from start of day.
   */
  toMinutes(slotIndex: number): number {
    return slotIndex * SlotCalculatorService.SLOT_MINUTES;
  }

  /**
   * Expand a start slot + duration into a slot range inclusive.
   */
  slotsForDuration(startSlot: number, durationMinutes: number): number[] {
    const slotCount = Math.ceil(durationMinutes / SlotCalculatorService.SLOT_MINUTES);
    return Array.from({ length: slotCount }, (_, idx) => startSlot + idx);
  }

  /**
   * Determines if a requested start slot is inside a shift window.
   * Shift window inclusive on start, exclusive on end.
   */
  hasStartInShift(startSlot: number, shiftStartSlot: number, shiftEndSlot: number): boolean {
    return startSlot >= shiftStartSlot && startSlot < shiftEndSlot;
  }
}
