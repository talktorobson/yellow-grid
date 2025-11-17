import { SlotCalculatorService } from './slot-calculator.service';

describe('SlotCalculatorService', () => {
  const service = new SlotCalculatorService();

  it('converts midnight to slot 0', () => {
    const idx = service.toSlotIndex(new Date('2024-01-01T00:00:00Z'), 'UTC');
    expect(idx).toBe(0);
  });

  it('converts 23:59 to last slot', () => {
    const idx = service.toSlotIndex(new Date('2024-01-01T23:59:00Z'), 'UTC');
    expect(idx).toBe(95);
  });

  it('builds slot ranges for duration', () => {
    const slots = service.slotsForDuration(10, 45); // 3 slots
    expect(slots).toEqual([10, 11, 12]);
  });

  it('validates start within shift', () => {
    expect(service.hasStartInShift(10, 8, 16)).toBe(true);
    expect(service.hasStartInShift(20, 8, 16)).toBe(false);
  });
});
