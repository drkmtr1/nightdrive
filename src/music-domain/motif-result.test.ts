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

  it("rejects accessor-bearing constructor inputs before binding provenance", () => {
    const source = fixture();
    let profileReads = 0;
    const changingProfile = {
      ...source,
      get profileId() {
        profileReads += 1;
        return profileReads < 4 ? source.profileId : HARMONY_PROFILE_IDS.classicSynthwave;
      },
    };
    expect(() => createMotifGenerationResultV1(changingProfile)).toThrow(MotifResultValueError);
    expect(profileReads).toBe(0);

    let harmonyReads = 0;
    const changingHarmony = {
      ...source,
      get harmony() {
        harmonyReads += 1;
        return source.harmony;
      },
    };
    expect(() => createMotifGenerationResultV1(changingHarmony)).toThrow(MotifResultValueError);
    expect(harmonyReads).toBe(0);

    let intentReads = 0;
    const changingIntent = {
      get energy() {
        intentReads += 1;
        return source.intent.energy;
      },
      complexity: source.intent.complexity,
    };
    expect(() => createMotifGenerationResultV1({ ...source, intent: changingIntent })).toThrow(
      MotifResultValueError,
    );
    expect(intentReads).toBe(0);

    let nestedHarmonyReads = 0;
    const changingNestedHarmony = { ...source.harmony };
    Object.defineProperty(changingNestedHarmony, "profile", {
      enumerable: true,
      get() {
        nestedHarmonyReads += 1;
        return source.profileId;
      },
    });
    Object.freeze(changingNestedHarmony);
    expect(() =>
      createMotifGenerationResultV1({
        ...source,
        harmony: changingNestedHarmony as typeof source.harmony,
      }),
    ).toThrow(MotifResultValueError);
    expect(nestedHarmonyReads).toBe(0);
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
      createMotifGenerationResultV1({ ...source, componentSeed: source.componentSeed ^ 1 }),
    ).toThrow(MotifResultValueError);
    const reboundRootSeed = 0;
    expect(() =>
      createMotifGenerationResultV1({
        ...source,
        rootSeed: reboundRootSeed,
        componentSeed: deriveComponentSeedV1(reboundRootSeed, "motif"),
      }),
    ).toThrow(MotifResultValueError);
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

  it("rejects noncanonical plans and invalid Harmony identities", () => {
    const source = fixture();
    const reorderedPlan = Object.freeze({
      profileVersion: source.plan.profileVersion,
      policyVersion: source.plan.policyVersion,
      rhythmTemplate: source.plan.rhythmTemplate,
      registerBand: source.plan.registerBand,
      tensionMode: source.plan.tensionMode,
      phrase4Displacement: source.plan.phrase4Displacement,
      contourOffsets: source.plan.contourOffsets,
      phraseRoles: source.plan.phraseRoles,
    }) as typeof source.plan;
    expect(() => createMotifGenerationResultV1({ ...source, plan: reorderedPlan })).toThrow(
      MotifResultValueError,
    );
    const invalidPlan = Object.freeze({
      ...source.plan,
      registerBand: "outside",
    }) as unknown as typeof source.plan;
    expect(() => createMotifGenerationResultV1({ ...source, plan: invalidPlan })).toThrow(
      MotifResultValueError,
    );
    const hiddenMethodOffsets = [...source.plan.contourOffsets];
    Object.defineProperty(hiddenMethodOffsets, "some", { value: () => false });
    const hiddenMethodPlan = Object.freeze({
      ...source.plan,
      contourOffsets: Object.freeze(hiddenMethodOffsets),
    });
    expect(() => createMotifGenerationResultV1({ ...source, plan: hiddenMethodPlan })).toThrow(
      MotifResultValueError,
    );
    const invalidHarmony = Object.freeze({
      ...source.harmony,
      templateId: "unknown-template",
    });
    expect(() => createMotifGenerationResultV1({ ...source, harmony: invalidHarmony })).toThrow(
      MotifResultValueError,
    );
    const invalidSlot = Object.freeze({ ...source.harmony.slots[0], degree: 6 });
    const invalidSlots = Object.freeze([invalidSlot, ...source.harmony.slots.slice(1)]);
    expect(() =>
      createMotifGenerationResultV1({
        ...source,
        harmony: Object.freeze({
          ...source.harmony,
          slots: invalidSlots,
        }) as unknown as typeof source.harmony,
      }),
    ).toThrow(MotifResultValueError);
    const sparseSlots = [...source.harmony.slots];
    delete sparseSlots[1];
    expect(() =>
      createMotifGenerationResultV1({
        ...source,
        harmony: Object.freeze({
          ...source.harmony,
          slots: sparseSlots,
        }) as typeof source.harmony,
      }),
    ).toThrow(MotifResultValueError);
    const accessorSlot = { ...source.harmony.slots[0] };
    Object.defineProperty(accessorSlot, "degree", {
      enumerable: true,
      get: () => source.harmony.slots[0].degree,
    });
    Object.freeze(accessorSlot);
    expect(() =>
      createMotifGenerationResultV1({
        ...source,
        harmony: Object.freeze({
          ...source.harmony,
          slots: Object.freeze([accessorSlot, ...source.harmony.slots.slice(1)]),
        }) as typeof source.harmony,
      }),
    ).toThrow(MotifResultValueError);
  });

  it("rejects sparse, overlapping, out-of-section, and forged serialized values", () => {
    const source = fixture();
    const sparse = [...source.events];
    delete sparse[1];
    expect(() => createMotifGenerationResultV1({ ...source, events: sparse })).toThrow(
      MotifResultValueError,
    );
    const overlap = Object.freeze([
      source.events[0],
      Object.freeze({ ...source.events[1], startTick: source.events[0].startTick }),
    ]);
    expect(() => createMotifGenerationResultV1({ ...source, events: overlap })).toThrow(
      MotifResultValueError,
    );
    expect(() => createMotifGenerationResultV1({ ...source, events: Object.freeze([]) })).toThrow(
      MotifResultValueError,
    );
    const retimed = Object.freeze(
      source.events.map((event, index) =>
        index === 0 ? Object.freeze({ ...event, startTick: event.startTick + 480 }) : event,
      ),
    );
    expect(() =>
      createMotifGenerationResultV1({
        ...source,
        events: retimed as unknown as typeof source.events,
      }),
    ).toThrow(MotifResultValueError);
    const result = createMotifGenerationResultV1(source);
    const forgedIntent = Object.freeze({
      ...result.provenance.normalizedInputs.intent,
      extra: undefined,
    });
    const forged = Object.freeze({
      ...result,
      provenance: Object.freeze({
        ...result.provenance,
        normalizedInputs: Object.freeze({ intent: forgedIntent }),
      }),
    });
    expect(() => serializeMotifGenerationResultV1(forged)).toThrow(MotifResultValueError);

    const withToJson = { ...result.provenance.profile };
    Object.defineProperty(withToJson, "toJSON", { value: () => ({ id: "forged" }) });
    Object.freeze(withToJson);
    const forgedSerializer = Object.freeze({
      ...result,
      provenance: Object.freeze({ ...result.provenance, profile: withToJson }),
    });
    expect(() => serializeMotifGenerationResultV1(forgedSerializer)).toThrow(MotifResultValueError);

    const hiddenSlotArray = [...result.provenance.harmony.slots];
    Object.defineProperty(hiddenSlotArray, "0", {
      value: { ...result.provenance.harmony.slots[0] },
      enumerable: false,
    });
    Object.freeze(hiddenSlotArray);
    const hiddenSlotResult = Object.freeze({
      ...result,
      provenance: Object.freeze({
        ...result.provenance,
        harmony: Object.freeze({ ...result.provenance.harmony, slots: hiddenSlotArray }),
      }),
    });
    expect(() => serializeMotifGenerationResultV1(hiddenSlotResult)).toThrow(MotifResultValueError);

    const originalVoicing = result.provenance.harmony.slots[0].voicing as Readonly<{
      midiPitches: readonly number[];
    }>;
    const pitchesWithToJson = [...originalVoicing.midiPitches];
    Object.defineProperty(pitchesWithToJson, "toJSON", { value: () => pitchesWithToJson });
    Object.freeze(pitchesWithToJson);
    const forgedSlots = Object.freeze(
      result.provenance.harmony.slots.map((slot, index) =>
        index === 0
          ? Object.freeze({
              ...slot,
              voicing: Object.freeze({
                ...(slot.voicing as Record<string, unknown>),
                midiPitches: pitchesWithToJson,
              }),
            })
          : slot,
      ),
    );
    const nestedArrayHook = Object.freeze({
      ...result,
      provenance: Object.freeze({
        ...result.provenance,
        harmony: Object.freeze({ ...result.provenance.harmony, slots: forgedSlots }),
      }),
    });
    expect(() => serializeMotifGenerationResultV1(nestedArrayHook)).toThrow(MotifResultValueError);
  });
});
