import type { ArpDirectionId, ArpRateId } from "./arpeggiator";
import { type DurationTicks, SUBDIVISION_TICKS } from "./musical-time";

export function getArpRateTicksV1(rate: ArpRateId): DurationTicks {
  if (rate === "quarter") return SUBDIVISION_TICKS.quarter;
  if (rate === "sixteenth") return SUBDIVISION_TICKS.sixteenth;
  return SUBDIVISION_TICKS.eighth;
}

export function createArpDirectionCycleV1(
  candidateCount: number,
  direction: ArpDirectionId,
): readonly number[] {
  if (candidateCount === 1) return Object.freeze([0]);

  const ascending = Array.from({ length: candidateCount }, (_, index) => index);
  const descending = [...ascending].reverse();
  if (direction === "up") return Object.freeze(ascending);
  if (direction === "down") return Object.freeze(descending);
  if (direction === "up-down") {
    return Object.freeze([...ascending, ...ascending.slice(1, -1).reverse()]);
  }
  return Object.freeze([...descending, ...ascending.slice(1, -1)]);
}
