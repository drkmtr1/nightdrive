import { describe, expect, it } from "vitest";

import { STAGE7_AC004_HARMONY_SNAPSHOTS } from "./stage7-ac004-harmony-snapshots";
import {
  getStage8MotifQualificationInput,
  getStage8MotifSourceBinding,
  STAGE8_MOTIF_QUALIFICATION_INPUTS,
  STAGE8_MOTIF_SOURCE_BINDINGS,
} from "./stage8-motif-source-bindings";

function isDeeplyFrozen(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return true;
  if (!Object.isFrozen(value)) return false;
  return Reflect.ownKeys(value).every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor !== undefined && "value" in descriptor && isDeeplyFrozen(descriptor.value);
  });
}

describe("Stage 8 Motif qualification source bindings", () => {
  it("binds exactly the four accepted frozen Harmony records in source order", () => {
    expect(STAGE8_MOTIF_SOURCE_BINDINGS.map((binding) => binding.sourceRecordId)).toEqual([
      "dark-synthwave-chorus-001",
      "classic-synthwave-chorus-001",
      "darkwave-verse-001",
      "cyberpunk-build-001",
    ]);
    expect(
      STAGE8_MOTIF_SOURCE_BINDINGS.map((binding) => [
        binding.harmony.profile,
        binding.harmony.templateId,
        binding.harmony.key.tonic,
        binding.harmony.key.scale,
      ]),
    ).toEqual([
      ["dark-synthwave", "degree-0654-natural-minor-v1", 0, "natural-minor"],
      ["classic-synthwave", "degree-0344-major-v1", 0, "major"],
      ["darkwave", "degree-0654-natural-minor-v1", 0, "natural-minor"],
      ["midtempo-cyberpunk", "degree-0654-phrygian-v1", 0, "phrygian"],
    ]);
    for (const binding of STAGE8_MOTIF_SOURCE_BINDINGS) {
      expect(binding.source).toEqual({
        commit: "c67295bde50b599caba90f0433352815ebac9bc7",
        path: "src/evaluation/stage7-ac004-harmony-snapshots.ts",
        gitBlobObjectId: "c9ea54f1b7b6a533724fb9782ac816e2b80f9422",
      });
      expect(binding.harmony.slots).toHaveLength(4);
      expect(binding.harmony.slots.map((slot) => [slot.index, slot.bars])).toEqual([
        [0, 2],
        [1, 2],
        [2, 2],
        [3, 2],
      ]);
      expect(binding.harmony.slots.every((slot) => slot.voicing.midiPitches.length === 3)).toBe(
        true,
      );
    }
  });

  it("exposes detached immutable bindings rather than mutable generation inputs", () => {
    expect(isDeeplyFrozen(STAGE8_MOTIF_SOURCE_BINDINGS)).toBe(true);
    for (const [index, binding] of STAGE8_MOTIF_SOURCE_BINDINGS.entries()) {
      const source = STAGE7_AC004_HARMONY_SNAPSHOTS[index];
      expect(source).toBeDefined();
      expect(isDeeplyFrozen(binding)).toBe(true);
      expect(binding.harmony).not.toBe(source);
      expect(binding.harmony.key).not.toBe(source?.key);
      expect(binding.harmony.slots).not.toBe(source?.slots);
    }
  });

  it("expands the prescribed 4 × 3 × 2 qualification matrix in stable order", () => {
    expect(STAGE8_MOTIF_QUALIFICATION_INPUTS).toHaveLength(24);
    expect(new Set(STAGE8_MOTIF_QUALIFICATION_INPUTS.map((input) => input.vectorId)).size).toBe(24);

    for (const [sourceIndex, binding] of STAGE8_MOTIF_SOURCE_BINDINGS.entries()) {
      const rows = STAGE8_MOTIF_QUALIFICATION_INPUTS.slice(sourceIndex * 6, sourceIndex * 6 + 6);
      expect(rows.map((row) => row.sourceRecordId)).toEqual(Array(6).fill(binding.sourceRecordId));
      expect(rows.map((row) => row.profileId)).toEqual(Array(6).fill(binding.harmony.profile));
      expect(rows.map((row) => [row.intent.energy, row.intent.complexity, row.rootSeed])).toEqual([
        ["low", "low", 0],
        ["low", "low", 4_294_967_295],
        ["medium", "medium", 0],
        ["medium", "medium", 4_294_967_295],
        ["high", "high", 0],
        ["high", "high", 4_294_967_295],
      ]);
      for (const row of rows) {
        const seed = row.rootSeed.toString(16).padStart(8, "0");
        expect(row.vectorId).toBe(
          `${row.sourceRecordId}-${row.intent.energy}-${row.intent.complexity}-${seed}`,
        );
        expect(row.vectorId).toMatch(
          /^[a-z0-9-]+-(low|medium|high)-(low|medium|high)-[0-9a-f]{8}$/,
        );
      }
    }
  });

  it("looks up only declared source and vector identities", () => {
    const source = getStage8MotifSourceBinding("darkwave-verse-001");
    expect(source.harmony.profile).toBe("darkwave");
    expect(getStage8MotifQualificationInput("darkwave-verse-001-medium-medium-00000000")).toEqual(
      STAGE8_MOTIF_QUALIFICATION_INPUTS[14],
    );
    expect(() => getStage8MotifSourceBinding("unknown")).toThrow(/Unknown Stage 8 Motif source/);
    expect(() => getStage8MotifQualificationInput("unknown")).toThrow(
      /Unknown Stage 8 Motif vector/,
    );
  });
});
