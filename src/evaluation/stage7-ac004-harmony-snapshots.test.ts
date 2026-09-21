// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  getStage7Ac004HarmonySnapshot,
  STAGE7_AC004_HARMONY_SNAPSHOTS,
} from "./stage7-ac004-harmony-snapshots";

const EXPECTED_IDS = [
  "dark-synthwave-chorus-001",
  "classic-synthwave-chorus-001",
  "darkwave-verse-001",
  "cyberpunk-build-001",
] as const;

function isDeeplyFrozen(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return true;
  return (
    Object.isFrozen(value) &&
    Reflect.ownKeys(value).every((key) => isDeeplyFrozen(Reflect.get(value, key)))
  );
}

describe("Stage 7 AC-004 canonical Harmony snapshots", () => {
  it("contains exactly the accepted source records in canonical order", () => {
    expect(STAGE7_AC004_HARMONY_SNAPSHOTS.map((snapshot) => snapshot.sourceRecordId)).toEqual(
      EXPECTED_IDS,
    );
    expect(
      new Set(STAGE7_AC004_HARMONY_SNAPSHOTS.map((snapshot) => snapshot.sourceRecordId)).size,
    ).toBe(4);
  });

  it("preserves literal source traceability and Harmony invariants", () => {
    for (const snapshot of STAGE7_AC004_HARMONY_SNAPSHOTS) {
      expect(snapshot.templateVersion).toBe("v1");
      expect(snapshot.key.tonic).toBe(0);
      expect(snapshot.slots).toHaveLength(4);
      expect(snapshot.slots.map((slot) => slot.index)).toEqual([0, 1, 2, 3]);
      expect(snapshot.slots.every((slot) => slot.bars === 2)).toBe(true);
      expect(snapshot.slots.every((slot) => slot.voicing.midiPitches.length === 3)).toBe(true);
      expect(
        snapshot.slots.every((slot) =>
          slot.voicing.midiPitches.every((pitch) => pitch >= 0 && pitch <= 127),
        ),
      ).toBe(true);
    }
  });

  it("is detached, recursively frozen, and retrievable only by stable source ID", () => {
    expect(isDeeplyFrozen(STAGE7_AC004_HARMONY_SNAPSHOTS)).toBe(true);
    expect(getStage7Ac004HarmonySnapshot(EXPECTED_IDS[0])).toBe(STAGE7_AC004_HARMONY_SNAPSHOTS[0]);
    expect(() => getStage7Ac004HarmonySnapshot("unknown")).toThrow(RangeError);
  });

  it("contains no explanatory realization metadata in canonical snapshots", () => {
    const text = JSON.stringify(STAGE7_AC004_HARMONY_SNAPSHOTS);
    expect(text).not.toContain("rationale");
    expect(text).not.toContain("adjacentCost");
  });
});
