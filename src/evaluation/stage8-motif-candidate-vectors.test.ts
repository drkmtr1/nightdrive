import { describe, expect, it, vi } from "vitest";

import {
  buildStage8MotifCandidateArtifact,
  deriveStage8MotifCandidateVector,
  STAGE8_MOTIF_CANDIDATE_ARTIFACT_SCHEMA,
  STAGE8_MOTIF_CANDIDATE_GENERATED_BY,
  STAGE8_MOTIF_CANDIDATE_STATUS,
  stage8MotifCandidateSha256Utf8,
} from "./stage8-motif-candidate-vectors";
import {
  resolveStage8MotifReferencePlanFromComponentSeedV1,
  resolveStage8MotifReferencePlanV1,
} from "./stage8-motif-reference-plan-resolution";
import { deriveStage8MotifReferenceSeed } from "./stage8-motif-reference-primitives";
import { STAGE8_MOTIF_QUALIFICATION_INPUTS } from "./stage8-motif-source-bindings";

function deeplyFrozen(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return true;
  return (
    Object.isFrozen(value) &&
    Reflect.ownKeys(value).every((key) => deeplyFrozen(Reflect.get(value, key)))
  );
}

const EXPECTED_VECTOR_IDS = [
  "dark-synthwave-chorus-001-low-low-00000000",
  "dark-synthwave-chorus-001-low-low-ffffffff",
  "dark-synthwave-chorus-001-medium-medium-00000000",
  "dark-synthwave-chorus-001-medium-medium-ffffffff",
  "dark-synthwave-chorus-001-high-high-00000000",
  "dark-synthwave-chorus-001-high-high-ffffffff",
  "classic-synthwave-chorus-001-low-low-00000000",
  "classic-synthwave-chorus-001-low-low-ffffffff",
  "classic-synthwave-chorus-001-medium-medium-00000000",
  "classic-synthwave-chorus-001-medium-medium-ffffffff",
  "classic-synthwave-chorus-001-high-high-00000000",
  "classic-synthwave-chorus-001-high-high-ffffffff",
  "darkwave-verse-001-low-low-00000000",
  "darkwave-verse-001-low-low-ffffffff",
  "darkwave-verse-001-medium-medium-00000000",
  "darkwave-verse-001-medium-medium-ffffffff",
  "darkwave-verse-001-high-high-00000000",
  "darkwave-verse-001-high-high-ffffffff",
  "cyberpunk-build-001-low-low-00000000",
  "cyberpunk-build-001-low-low-ffffffff",
  "cyberpunk-build-001-medium-medium-00000000",
  "cyberpunk-build-001-medium-medium-ffffffff",
  "cyberpunk-build-001-high-high-00000000",
  "cyberpunk-build-001-high-high-ffffffff",
] as const;

describe("Stage 8 Motif independent candidate vectors", () => {
  it("derives the exact ordered 24-row matrix with lowercase eight-digit seed IDs", () => {
    const artifact = buildStage8MotifCandidateArtifact();
    expect(artifact.schema).toBe(STAGE8_MOTIF_CANDIDATE_ARTIFACT_SCHEMA);
    expect(artifact.status).toBe(STAGE8_MOTIF_CANDIDATE_STATUS);
    expect(artifact.generatedBy).toBe(STAGE8_MOTIF_CANDIDATE_GENERATED_BY);
    expect(artifact.matrix).toEqual({
      vectorCount: 24,
      sourceRecordIds: [
        "dark-synthwave-chorus-001",
        "classic-synthwave-chorus-001",
        "darkwave-verse-001",
        "cyberpunk-build-001",
      ],
      intentPairs: [
        { energy: "low", complexity: "low" },
        { energy: "medium", complexity: "medium" },
        { energy: "high", complexity: "high" },
      ],
      rootSeeds: [0, 4_294_967_295],
    });
    expect(artifact.vectors.map((vector) => vector.vectorId)).toEqual(EXPECTED_VECTOR_IDS);
    expect(artifact.vectors.map((vector) => vector.status)).toEqual(
      Array.from({ length: 24 }, () => STAGE8_MOTIF_CANDIDATE_STATUS),
    );
    expect(new Set(artifact.vectors.map((vector) => vector.vectorId)).size).toBe(24);
    expect(artifact.sourceBindings).toEqual([
      {
        sourceRecordId: "dark-synthwave-chorus-001",
        source: {
          commit: "c67295bde50b599caba90f0433352815ebac9bc7",
          path: "src/evaluation/stage7-ac004-harmony-snapshots.ts",
          gitBlobObjectId: "c9ea54f1b7b6a533724fb9782ac816e2b80f9422",
        },
      },
      {
        sourceRecordId: "classic-synthwave-chorus-001",
        source: {
          commit: "c67295bde50b599caba90f0433352815ebac9bc7",
          path: "src/evaluation/stage7-ac004-harmony-snapshots.ts",
          gitBlobObjectId: "c9ea54f1b7b6a533724fb9782ac816e2b80f9422",
        },
      },
      {
        sourceRecordId: "darkwave-verse-001",
        source: {
          commit: "c67295bde50b599caba90f0433352815ebac9bc7",
          path: "src/evaluation/stage7-ac004-harmony-snapshots.ts",
          gitBlobObjectId: "c9ea54f1b7b6a533724fb9782ac816e2b80f9422",
        },
      },
      {
        sourceRecordId: "cyberpunk-build-001",
        source: {
          commit: "c67295bde50b599caba90f0433352815ebac9bc7",
          path: "src/evaluation/stage7-ac004-harmony-snapshots.ts",
          gitBlobObjectId: "c9ea54f1b7b6a533724fb9782ac816e2b80f9422",
        },
      },
    ]);
    expect(deeplyFrozen(artifact)).toBe(true);
  });

  it("constructs a valid raw request context and separately wrapped canonical result wire", () => {
    const input = STAGE8_MOTIF_QUALIFICATION_INPUTS[0];
    if (input === undefined) throw new Error("Missing first qualification input.");
    const vector = deriveStage8MotifCandidateVector(input);
    const request = JSON.parse(vector.requestJson) as Record<string, unknown>;
    const result = JSON.parse(vector.resultJson) as Record<string, unknown>;

    expect(Object.keys(request)).toEqual([
      "schema",
      "generatorVersion",
      "profile",
      "policyVersion",
      "harmony",
      "intent",
      "rootSeed",
    ]);
    expect(Object.keys(result)).toEqual([
      "schema",
      "generatorVersion",
      "plan",
      "events",
      "provenance",
    ]);
    expect(Object.keys(result.plan as Record<string, unknown>)).toEqual([
      "policyVersion",
      "profileVersion",
      "rhythmTemplate",
      "registerBand",
      "tensionMode",
      "phrase4Displacement",
      "contourOffsets",
      "phraseRoles",
    ]);
    const requestHarmony = request.harmony as Record<string, unknown>;
    const resultProvenance = result.provenance as Record<string, unknown>;
    const resultHarmony = resultProvenance.harmony as Record<string, unknown>;
    expect(Object.keys(requestHarmony)).toEqual([
      "profile",
      "templateId",
      "templateVersion",
      "key",
      "slots",
    ]);
    expect(Object.keys(resultHarmony)).toEqual([
      "profile",
      "templateId",
      "templateVersion",
      "key",
      "slots",
    ]);
    expect(resultProvenance).toMatchObject({
      profile: { id: "dark-synthwave", version: "nightdrive.genre-profile.motif.v1" },
      policy: { version: "nightdrive.motif-policy.v1" },
      contour: { version: "nightdrive.motif-contour.v1" },
      rhythm: { version: "nightdrive.motif-rhythm.v1" },
      seedDerivation: { version: "nightdrive.seed-derivation.component.v1" },
      prng: { version: "nightdrive.prng.mulberry32.v1" },
      weightedChoice: { version: "nightdrive.weighted-choice.uint32-modulo.v1" },
      rootSeed: 0,
      normalizedInputs: { intent: { energy: "low", complexity: "low" } },
      parent: null,
    });
    expect(Object.keys(resultProvenance)).toEqual([
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
    expect(requestHarmony.key).toEqual({ tonic: 0, scale: "natural-minor" });
    const requestFirstSlot = (requestHarmony.slots as readonly Record<string, unknown>[])[0];
    expect(requestFirstSlot).toBeDefined();
    if (requestFirstSlot === undefined) throw new Error("Missing raw request Harmony slot.");
    expect(Object.keys(requestFirstSlot)).toEqual([
      "index",
      "degree",
      "bars",
      "chord",
      "inversion",
      "voicing",
      "adjacentCost",
      "rationale",
    ]);
    expect(requestFirstSlot.chord).toEqual({ root: 0, quality: "minor-triad" });
    expect(requestFirstSlot.inversion).toBe(0);
    expect(requestFirstSlot.voicing).toEqual({ midiPitches: [36, 39, 43] });
    expect(requestFirstSlot.adjacentCost).toBeNull();
    expect(requestFirstSlot.rationale).toEqual({
      preferenceRank: 0,
      tieBreak: "Stage 8 qualification snapshot",
    });

    for (const harmony of [resultHarmony]) {
      expect(harmony.key).toEqual({
        schema: "nightdrive.key.v1",
        tonicSemitoneClass: 0,
        scale: "natural-minor",
      });
      const firstSlot = (harmony.slots as readonly Record<string, unknown>[])[0];
      expect(firstSlot).toBeDefined();
      if (firstSlot === undefined) throw new Error("Missing first Harmony slot.");
      expect(firstSlot.chord).toEqual({
        schema: "nightdrive.chord.v1",
        rootSemitoneClass: 0,
        quality: "minor-triad",
      });
      expect(Object.keys(firstSlot)).toEqual([
        "index",
        "degree",
        "bars",
        "chord",
        "inversion",
        "voicing",
      ]);
      expect(Object.keys(firstSlot.chord as Record<string, unknown>)).toEqual([
        "schema",
        "rootSemitoneClass",
        "quality",
      ]);
      expect(Object.keys(firstSlot.inversion as Record<string, unknown>)).toEqual([
        "schema",
        "memberIndex",
      ]);
      expect(Object.keys(firstSlot.voicing as Record<string, unknown>)).toEqual([
        "schema",
        "midiPitches",
      ]);
      expect(firstSlot.inversion).toEqual({
        schema: "nightdrive.chord-inversion.v1",
        memberIndex: 0,
      });
      expect(firstSlot.voicing).toEqual({
        schema: "nightdrive.chord-voicing.v1",
        midiPitches: [36, 39, 43],
      });
    }
    expect(vector.requestJson).not.toMatch(/[\n\r]/);
    expect(vector.resultJson).not.toMatch(/[\n\r]/);
  });

  it("carries an independently specified plan and pitch path into the canonical result", () => {
    const input = STAGE8_MOTIF_QUALIFICATION_INPUTS[0];
    if (input === undefined) throw new Error("Missing first qualification input.");
    const result = JSON.parse(deriveStage8MotifCandidateVector(input).resultJson) as {
      plan: unknown;
      events: unknown;
    };

    // These literals are the accepted dark-synthwave low/low, seed-zero
    // reference fixtures. They do not come from a production Motif result.
    expect(result.plan).toEqual({
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "steady-6",
      registerBand: "upper",
      tensionMode: "chordal",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 1, 2, 0],
      phraseRoles: [
        "identity",
        "motif-form-repetition",
        "harmony-aware-transposition",
        "contour-preserving-response",
      ],
    });
    const pitches = [
      75, 79, 79, 75, 79, 75, 74, 77, 77, 74, 77, 74, 80, 84, 84, 80, 84, 80, 79, 79, 79, 79, 79,
      74,
    ];
    const starts = [
      0, 960, 1920, 3360, 4800, 6720, 7680, 8640, 9600, 11040, 12480, 14400, 15360, 16320, 17280,
      18720, 20160, 22080, 23040, 24000, 24960, 26400, 27840, 29760,
    ];
    const durations = [
      960, 480, 960, 480, 960, 960, 960, 480, 960, 480, 960, 960, 960, 480, 960, 480, 960, 960, 960,
      480, 960, 480, 960, 960,
    ];
    expect(result.events).toEqual(
      pitches.map((pitch, index) => ({
        pitch,
        startTick: starts[index],
        durationTicks: durations[index],
      })),
    );
  });

  it("derives semantic plan/events, byte lengths, and digests without treating existing evidence as an oracle", () => {
    const artifact = buildStage8MotifCandidateArtifact();
    for (const vector of artifact.vectors) {
      const fresh = deriveStage8MotifCandidateVector(
        STAGE8_MOTIF_QUALIFICATION_INPUTS.find((input) => input.vectorId === vector.vectorId),
      );
      expect(fresh).toEqual(vector);
      expect(vector.byteLengths).toEqual({
        request: new TextEncoder().encode(vector.requestJson).byteLength,
        result: new TextEncoder().encode(vector.resultJson).byteLength,
      });
      expect(vector.sha256).toEqual({
        request: stage8MotifCandidateSha256Utf8(vector.requestJson),
        result: stage8MotifCandidateSha256Utf8(vector.resultJson),
      });
      const result = JSON.parse(vector.resultJson) as {
        events: readonly { pitch: number; startTick: number; durationTicks: number }[];
      };
      expect(result.events.length).toBeGreaterThan(0);
      expect(result.events.every((event) => event.pitch >= 60 && event.pitch <= 84)).toBe(true);
      expect(
        result.events.every((event, index) => {
          const previous = result.events[index - 1];
          return (
            event.startTick >= 0 &&
            event.startTick + event.durationTicks <= 30_720 &&
            (previous === undefined ||
              previous.startTick + previous.durationTicks <= event.startTick)
          );
        }),
      ).toBe(true);
    }
  });

  it("uses known UTF-8 SHA-256 answers", () => {
    expect(stage8MotifCandidateSha256Utf8("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(stage8MotifCandidateSha256Utf8("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(stage8MotifCandidateSha256Utf8("é")).toBe(
      "4a99557e4033c3539de2eb65472017cad5f9557f7a0625a09f1c3f6e2ba69c4c",
    );
  });

  it("fails closed for forged or mismatched matrix inputs", () => {
    const input = STAGE8_MOTIF_QUALIFICATION_INPUTS[0];
    if (input === undefined) throw new Error("Missing first qualification input.");
    expect(() => deriveStage8MotifCandidateVector({ ...input, profileId: "darkwave" })).toThrow(
      RangeError,
    );
    expect(() => deriveStage8MotifCandidateVector({ ...input, rootSeed: 1 })).toThrow(RangeError);
    expect(() => deriveStage8MotifCandidateVector({ ...input, rootSeed: -0 })).toThrow(RangeError);
    expect(() =>
      deriveStage8MotifCandidateVector({
        vectorId: input.vectorId,
        sourceRecordId: input.sourceRecordId,
        profileId: input.profileId,
        intent: { energy: input.intent.energy, complexity: input.intent.complexity },
        rootSeed: input.rootSeed,
        extra: true,
      }),
    ).toThrow(RangeError);
    const hiddenInput = { ...input };
    Object.defineProperty(hiddenInput, "hidden", { value: true });
    expect(() => deriveStage8MotifCandidateVector(hiddenInput)).toThrow(RangeError);
    const nonEnumerableRequiredInput = { ...input };
    Object.defineProperty(nonEnumerableRequiredInput, "rootSeed", {
      value: input.rootSeed,
      enumerable: false,
    });
    expect(() => deriveStage8MotifCandidateVector(nonEnumerableRequiredInput)).toThrow(RangeError);
    const symbolInput = { ...input, intent: { ...input.intent } };
    Object.defineProperty(symbolInput.intent, Symbol("hidden"), { value: true });
    expect(() => deriveStage8MotifCandidateVector(symbolInput)).toThrow(RangeError);
  });

  it("reuses the one derived component seed for reference plan selection and provenance", () => {
    const input = STAGE8_MOTIF_QUALIFICATION_INPUTS[0];
    if (input === undefined) throw new Error("Missing first qualification input.");
    const componentSeed = deriveStage8MotifReferenceSeed(input.rootSeed);
    const context = {
      profileId: input.profileId,
      energy: input.intent.energy,
      complexity: input.intent.complexity,
    };
    expect(resolveStage8MotifReferencePlanFromComponentSeedV1(context, componentSeed)).toEqual(
      resolveStage8MotifReferencePlanV1(context, input.rootSeed),
    );
    const vector = deriveStage8MotifCandidateVector(input);
    const result = JSON.parse(vector.resultJson) as { provenance: { componentSeed: number } };
    expect(result.provenance.componentSeed).toBe(componentSeed);
  });

  it("does not consult ambient randomness", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is prohibited");
    });
    try {
      expect(buildStage8MotifCandidateArtifact().vectors).toHaveLength(24);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});
