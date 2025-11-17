import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/common/redis/redis.service';
import { SlotCalculatorService } from './slot-calculator.service';

@Injectable()
export class RedisBitmapService {
  private readonly logger = new Logger(RedisBitmapService.name);
  private readonly slotCount = SlotCalculatorService.SLOTS_PER_DAY;

  constructor(private readonly redis: RedisService) {}

  /**
   * Reserve a contiguous set of slots atomically.
   * Returns true when reservation succeeds (all slots were free).
   */
  async reserveSlots(params: {
    workTeamId: string;
    bookingDate: string; // YYYY-MM-DD
    startSlot: number;
    endSlot: number;
  }): Promise<boolean> {
    const { workTeamId, bookingDate, startSlot, endSlot } = params;
    const key = this.buildKey(workTeamId, bookingDate);

    // Lua script checks all bits and sets them only if all are 0
    const script = `
      local key = KEYS[1]
      local start_slot = tonumber(ARGV[1])
      local end_slot = tonumber(ARGV[2])
      for i = start_slot, end_slot do
        if redis.call("GETBIT", key, i) == 1 then
          return 0
        end
      end
      for i = start_slot, end_slot do
        redis.call("SETBIT", key, i, 1)
      end
      return 1
    `;

    const result = await this.redis.eval(script, 1, key, startSlot, endSlot);
    const success = result === 1;
    if (!success) {
      this.logger.debug(`Reservation failed for ${key} slots ${startSlot}-${endSlot}`);
    }
    return success;
  }

  /**
   * Release a group of slots (sets bits back to 0).
   */
  async releaseSlots(params: {
    workTeamId: string;
    bookingDate: string;
    startSlot: number;
    endSlot: number;
  }): Promise<void> {
    const { workTeamId, bookingDate, startSlot, endSlot } = params;
    const key = this.buildKey(workTeamId, bookingDate);
    const script = `
      local key = KEYS[1]
      local start_slot = tonumber(ARGV[1])
      local end_slot = tonumber(ARGV[2])
      for i = start_slot, end_slot do
        redis.call("SETBIT", key, i, 0)
      end
      return 1
    `;
    await this.redis.eval(script, 1, key, startSlot, endSlot);
  }

  /**
   * Returns an array of booleans indicating if each slot is available (true = free).
   */
  async getAvailability(workTeamId: string, bookingDate: string): Promise<boolean[]> {
    const key = this.buildKey(workTeamId, bookingDate);
    const buffer = await this.redis.getBuffer(key);

    if (!buffer) {
      // No reservations yet: everything is free
      return Array(this.slotCount).fill(true);
    }

    const bits: boolean[] = [];
    for (let i = 0; i < this.slotCount; i++) {
      const byteIndex = Math.floor(i / 8);
      const bitOffset = 7 - (i % 8);
      const byte = buffer[byteIndex] ?? 0;
      const isSet = (byte >> bitOffset) & 1;
      bits.push(isSet === 0);
    }
    return bits;
  }

  private buildKey(workTeamId: string, bookingDate: string): string {
    return `calendar:availability:${workTeamId}:${bookingDate}`;
  }
}
