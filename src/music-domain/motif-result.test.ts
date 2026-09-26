// @vitest-environment node

import { describe, expect, it } from "vitest";
import { projectResolvedMotifPlanV1 } from "../generators/motif-pitch-projector";
import { resolveMotifPlanV1 } from "../generators/motif-policy-resolver";
import { deriveComponentSeedV1 } from "./component-seed";
import {
  getHarmonyTemplatesForProfile,
  HARMONY_PROFILE_IDS,
  realizeHarmonyProgression,
} from "./harmony";
import { createKey } from "./key";
import {
  createMotifGenerationResultV1,
  MOTIF_GENERATION_RESULT_SCHEMA_V1,
  MOTIF_GENERATOR_VERSION_V1,
  MotifResultValueError,
  serializeMotifGenerationResultV1,
} from "./motif-result";
import { createPitchClass } from "./pitch";

function fixture() {
  const profileId = HARMONY_PROFILE_IDS.darkSynthwave;
  const template = getHarmonyTemplatesForProfile(profileId)[0];
  const harmony = realizeHarmonyProgression(
    profileId,
    template,
    createKey(createPitchClass(0), template.scale),
  );
  const intent = Object.freeze({ energy: "medium", complexity: "medium" } as const);
  const rootSeed = 0x1234_5678;
  const componentSeed = deriveComponentSeedV1(rootSeed, "motif");
  const plan = resolveMotifPlanV1({ profileId, ...intent }, componentSeed);
  const events = projectResolvedMotifPlanV1(harmony, plan);
  return { profileId, harmony, intent, rootSeed, componentSeed, plan, events };
}

describe("MotifGenerationResultV1", () => {
  it("constructs the exact canonical result and provenance field order", () => {
    const result = createMotifGenerationResultV1(fixture());
    expect(Object.keys(result)).toEqual([
      "schema",
      "generatorVersion",
      "plan",
      "events",
      "provenance",
    ]);
    expect(Object.keys(result.provenance)).toEqual([
      "profile",
      "policy",
      "contour",
      "rhythm",
      "seedDerivation",
      "prng",
      "weightedChoice",
      "rootSeed",
      "componentSeed",
      "normalizedInputs",
      "harmony",
      "parent",
    ]);
    expect(Object.keys(result.provenance.harmony)).toEqual([
      "profile",
      "templateId",
      "templateVersion",
      "key",
      "slots",
    ]);
    expect(Object.keys(result.provenance.harmony.slots[0])).toEqual([
      "index",
      "degree",
      "bars",
      "chord",
      "inversion",
      "voicing",
    ]);
    expect(result.schema).toBe(MOTIF_GENERATION_RESULT_SCHEMA_V1);
    expect(result.generatorVersion).toBe(MOTIF_GENERATOR_VERSION_V1);
    expect(result.provenance.parent).toBeNull();
    expect("adjacentCost" in result.provenance.harmony.slots[0]).toBe(false);
    expect("rationale" in result.provenance.harmony.slots[0]).toBe(false);
  });

  it("produces stable compact canonical JSON and independent copied provenance", () => {
    const source = fixture();
    const first = createMotifGenerationResultV1(source);
    const second = createMotifGenerationResultV1(source);
    const json = serializeMotifGenerationResultV1(first);
    expect(json).toBe(serializeMotifGenerationResultV1(second));
    expect(json).toBe(JSON.stringify(JSON.parse(json)));
    expect(new TextEncoder().encode(json).length).toBe(Buffer.byteLength(json, "utf8"));
    expect(first.provenance.harmony).not.toBe(source.harmony);
    expect(first.events).not.toBe(source.events);
    expect(first.plan).not.toBe(source.plan);
  });

  it("is recursively immutable across canonical result-owned values", () => {
    const result = createMotifGenerationResultV1(fixture());
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.plan)).toBe(true);
    expect(Object.isFrozen(result.events)).toBe(true);
    expect(result.events.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(result.provenance)).toBe(true);
    expect(Object.isFrozen(result.provenance.harmony)).toBe(true);
    expect(Object.isFrozen(result.provenance.harmony.slots)).toBe(true);
    expect(result.provenance.harmony.slots.every(Object.isFrozen)).toBe(true);
  });

  it("rejects mismatched profiles, noncanonical seeds, and forged canonical values", () => {
    const source = fixture();
    expect(() =>
      createMotifGenerationResultV1({
        ...source,
        profileId: HARMONY_PROFILE_IDS.classicSynthwave,
      }),
    ).toThrow(MotifResultValueError);
    expect(() => createMotifGenerationResultV1({ ...source, rootSeed: -0 })).toThrow(
      MotifResultValueError,
    );
    expect(() =>
      createMotifGenerationResultV1({
        ...source,
        plan: Object.freeze({ ...source.plan, contourOffsets: Object.freeze([0]) }),
      }),
    ).toThrow(MotifResultValueError);

    const result = createMotifGenerationResultV1(source);
    const forged = Object.freeze({ ...result, extra: true }) as unknown as typeof result;
    expect(() => serializeMotifGenerationResultV1(forged)).toThrow(MotifResultValueError);

    const wrongHarmony = Object.freeze({
      ...result.provenance.harmony,
      key: Object.freeze({ ...result.provenance.harmony.key, tonicSemitoneClass: 12 }),
    });
    const wrongProvenance = Object.freeze({ ...result.provenance, harmony: wrongHarmony });
    const forgedNested = Object.freeze({ ...result, provenance: wrongProvenance });
    expect(() => serializeMotifGenerationResultV1(forgedNested)).toThrow(MotifResultValueError);
  });
});
