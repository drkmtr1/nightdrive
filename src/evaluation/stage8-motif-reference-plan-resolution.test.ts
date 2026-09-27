import { describe, expect, it, vi } from "vitest";

import {
  resolveStage8MotifReferencePlanFromComponentSeedV1,
  resolveStage8MotifReferencePlanV1,
} from "./stage8-motif-reference-plan-resolution";
import { STAGE8_MOTIF_QUALIFICATION_INPUTS } from "./stage8-motif-source-bindings";

const PHRASE_ROLES = [
  "identity",
  "motif-form-repetition",
  "harmony-aware-transposition",
  "contour-preserving-response",
] as const;

const EXPECTED_QUALIFICATION_PLANS = [
  {
    vectorId: "dark-synthwave-chorus-001-low-low-00000000",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "steady-6",
      registerBand: "upper",
      tensionMode: "chordal",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 1, 2, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "dark-synthwave-chorus-001-low-low-ffffffff",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "sparse-4",
      registerBand: "middle",
      tensionMode: "diatonic-passing",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "dark-synthwave-chorus-001-medium-medium-00000000",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "sparse-4",
      registerBand: "upper",
      tensionMode: "chordal",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "dark-synthwave-chorus-001-medium-medium-ffffffff",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "steady-6",
      registerBand: "middle",
      tensionMode: "chordal",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 1, 2, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "dark-synthwave-chorus-001-high-high-00000000",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "active-8",
      registerBand: "upper",
      tensionMode: "chordal",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 3, 2, 3, 1, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "dark-synthwave-chorus-001-high-high-ffffffff",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "active-8",
      registerBand: "middle",
      tensionMode: "chordal",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 3, 2, 3, 1, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "classic-synthwave-chorus-001-low-low-00000000",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "steady-6",
      registerBand: "upper",
      tensionMode: "chordal",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 1, 2, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "classic-synthwave-chorus-001-low-low-ffffffff",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "steady-6",
      registerBand: "middle",
      tensionMode: "diatonic-passing",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 1, 2, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "classic-synthwave-chorus-001-medium-medium-00000000",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "sparse-4",
      registerBand: "upper",
      tensionMode: "chordal",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "classic-synthwave-chorus-001-medium-medium-ffffffff",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "steady-6",
      registerBand: "middle",
      tensionMode: "chordal",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 1, 2, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "classic-synthwave-chorus-001-high-high-00000000",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "active-8",
      registerBand: "upper",
      tensionMode: "chordal",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 3, 2, 3, 1, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "classic-synthwave-chorus-001-high-high-ffffffff",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "steady-6",
      registerBand: "middle",
      tensionMode: "chordal",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 1, 2, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "darkwave-verse-001-low-low-00000000",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "sparse-4",
      registerBand: "lower",
      tensionMode: "chordal",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "darkwave-verse-001-low-low-ffffffff",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "steady-6",
      registerBand: "lower",
      tensionMode: "diatonic-passing",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 1, 2, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "darkwave-verse-001-medium-medium-00000000",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "sparse-4",
      registerBand: "lower",
      tensionMode: "diatonic-passing",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "darkwave-verse-001-medium-medium-ffffffff",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "sparse-4",
      registerBand: "lower",
      tensionMode: "chordal",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "darkwave-verse-001-high-high-00000000",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "active-8",
      registerBand: "lower",
      tensionMode: "chordal",
      phrase4Displacement: "later-480",
      contourOffsets: [0, 1, 2, 3, 2, 3, 1, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "darkwave-verse-001-high-high-ffffffff",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "steady-6",
      registerBand: "lower",
      tensionMode: "chordal",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 1, 2, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "cyberpunk-build-001-low-low-00000000",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "steady-6",
      registerBand: "lower",
      tensionMode: "chordal",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 1, 2, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "cyberpunk-build-001-low-low-ffffffff",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "steady-6",
      registerBand: "middle",
      tensionMode: "diatonic-passing",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 1, 2, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "cyberpunk-build-001-medium-medium-00000000",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "active-8",
      registerBand: "middle",
      tensionMode: "chordal",
      phrase4Displacement: "earlier-480",
      contourOffsets: [0, 1, 2, 3, 2, 3, 1, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "cyberpunk-build-001-medium-medium-ffffffff",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "steady-6",
      registerBand: "lower",
      tensionMode: "chordal",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 1, 2, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "cyberpunk-build-001-high-high-00000000",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "steady-6",
      registerBand: "middle",
      tensionMode: "chordal",
      phrase4Displacement: "later-480",
      contourOffsets: [0, 1, 2, 1, 2, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
  {
    vectorId: "cyberpunk-build-001-high-high-ffffffff",
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "sparse-4",
      registerBand: "middle",
      tensionMode: "chordal",
      phrase4Displacement: "earlier-480",
      contourOffsets: [0, 1, 2, 0],
      phraseRoles: [...PHRASE_ROLES],
    },
  },
] as const;

describe("Stage 8 Motif reference plan resolution", () => {
  it("resolves all 24 accepted qualification inputs against static literal plan fixtures", () => {
    expect(STAGE8_MOTIF_QUALIFICATION_INPUTS).toHaveLength(24);
    expect(EXPECTED_QUALIFICATION_PLANS).toHaveLength(24);

    for (const [index, expected] of EXPECTED_QUALIFICATION_PLANS.entries()) {
      const input = STAGE8_MOTIF_QUALIFICATION_INPUTS[index];
      expect(input?.vectorId).toBe(expected.vectorId);
      expect(
        resolveStage8MotifReferencePlanV1(
          {
            profileId: input?.profileId,
            energy: input?.intent.energy,
            complexity: input?.intent.complexity,
          },
          input?.rootSeed,
        ),
      ).toEqual(expected.plan);
    }
  });

  it("returns detached deeply frozen plans with the canonical field order", () => {
    const context = {
      profileId: "dark-synthwave",
      energy: "medium",
      complexity: "medium",
    } as const;
    const first = resolveStage8MotifReferencePlanV1(context, 0);
    const second = resolveStage8MotifReferencePlanV1(context, 0);

    expect(Reflect.ownKeys(first)).toEqual([
      "policyVersion",
      "profileVersion",
      "rhythmTemplate",
      "registerBand",
      "tensionMode",
      "phrase4Displacement",
      "contourOffsets",
      "phraseRoles",
    ]);
    expect(first).not.toBe(second);
    expect(first.contourOffsets).not.toBe(second.contourOffsets);
    expect(first.phraseRoles).not.toBe(second.phraseRoles);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.contourOffsets)).toBe(true);
    expect(Object.isFrozen(first.phraseRoles)).toBe(true);
    expect(Reflect.set(first, "registerBand", "lower")).toBe(false);
    expect(Reflect.set(first.contourOffsets, "0", 99)).toBe(false);
    expect(Reflect.set(first.phraseRoles, "0", "other")).toBe(false);
  });

  it("consumes one stream in exactly the four declared decision slots", async () => {
    const deriveSeed = vi.fn(() => 77);
    const nextUint32 = vi.fn<() => number>();
    nextUint32
      .mockReturnValueOnce(101)
      .mockReturnValueOnce(202)
      .mockReturnValueOnce(303)
      .mockReturnValueOnce(404);
    const createPrng = vi.fn(() => Object.freeze({ nextUint32 }));
    const selectCandidate = vi.fn(
      (candidates: readonly Readonly<{ value: string; weight: number }>[], _output: number) =>
        candidates[0]?.value,
    );
    const buildCandidates = vi.fn((_profileId: string, slot: string) => {
      const value =
        slot === "rhythm"
          ? "sparse-4"
          : slot === "register"
            ? "lower"
            : slot === "tension"
              ? "chordal"
              : "none";
      return Object.freeze([Object.freeze({ value, weight: 1 })]);
    });

    vi.resetModules();
    vi.doMock("./stage8-motif-reference-primitives", () => ({
      deriveStage8MotifReferenceSeed: deriveSeed,
      createStage8MotifReferencePrng: createPrng,
      selectStage8MotifReferenceWeightedCandidate: selectCandidate,
    }));
    vi.doMock("./stage8-motif-reference-policy", () => ({
      STAGE8_MOTIF_REFERENCE_POLICY_VERSION: "nightdrive.motif-policy.v1",
      STAGE8_MOTIF_REFERENCE_PROFILE_DATA_VERSION: "nightdrive.genre-profile.motif.v1",
      buildStage8MotifReferenceWeightedCandidates: buildCandidates,
    }));
    try {
      const reference = await import("./stage8-motif-reference-plan-resolution");
      expect(
        reference.resolveStage8MotifReferencePlanV1(
          { profileId: "darkwave", energy: "high", complexity: "high" },
          4_294_967_295,
        ),
      ).toMatchObject({
        rhythmTemplate: "sparse-4",
        registerBand: "lower",
        tensionMode: "chordal",
        phrase4Displacement: "none",
      });
      expect(deriveSeed).toHaveBeenCalledOnce();
      expect(deriveSeed).toHaveBeenCalledWith(4_294_967_295);
      expect(createPrng).toHaveBeenCalledOnce();
      expect(createPrng).toHaveBeenCalledWith(77);
      expect(nextUint32).toHaveBeenCalledTimes(4);
      expect(buildCandidates.mock.calls).toEqual([
        ["darkwave", "rhythm", "high", "high"],
        ["darkwave", "register", "high", "high"],
        ["darkwave", "tension", "high", "high"],
        ["darkwave", "displacement", "high", "high"],
      ]);
      expect(selectCandidate).toHaveBeenCalledTimes(4);
      expect(selectCandidate.mock.calls.map(([, output]) => output)).toEqual([101, 202, 303, 404]);
    } finally {
      vi.doUnmock("./stage8-motif-reference-primitives");
      vi.doUnmock("./stage8-motif-reference-policy");
      vi.resetModules();
    }
  });

  it("rejects malformed contexts and noncanonical root seeds without coercion", () => {
    const valid = { profileId: "darkwave", energy: "medium", complexity: "medium" };
    const malformedContexts = [
      undefined,
      null,
      [],
      {},
      { profileId: "darkwave", energy: "medium", complexity: "medium", extra: true },
      { energy: "medium", profileId: "darkwave", complexity: "medium" },
      { profileId: "unknown", energy: "medium", complexity: "medium" },
      { profileId: "darkwave", energy: "unknown", complexity: "medium" },
      { profileId: "darkwave", energy: "medium", complexity: "unknown" },
      Object.create({ profileId: "darkwave", energy: "medium", complexity: "medium" }),
    ];
    for (const context of malformedContexts) {
      expect(() => resolveStage8MotifReferencePlanV1(context, 0)).toThrow(/canonical Stage 8/);
    }
    const nonEnumerableContext = { ...valid };
    Object.defineProperty(nonEnumerableContext, "profileId", {
      value: valid.profileId,
      enumerable: false,
    });
    expect(() => resolveStage8MotifReferencePlanV1(nonEnumerableContext, 0)).toThrow(
      /canonical Stage 8/,
    );
    for (const rootSeed of [undefined, null, -0, -1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, "0"]) {
      expect(() => resolveStage8MotifReferencePlanV1(valid, rootSeed)).toThrow(/rootSeed/);
    }
    expect(() => resolveStage8MotifReferencePlanFromComponentSeedV1(valid, -0)).toThrow(/seed/);
  });

  it("does not consume an ambient entropy source", () => {
    const spy = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient entropy must not be used");
    });
    try {
      expect(
        resolveStage8MotifReferencePlanV1(
          { profileId: "midtempo-cyberpunk", energy: "medium", complexity: "medium" },
          0,
        ),
      ).toMatchObject({
        rhythmTemplate: "active-8",
        registerBand: "middle",
        tensionMode: "chordal",
        phrase4Displacement: "earlier-480",
      });
    } finally {
      spy.mockRestore();
    }
  });
});
