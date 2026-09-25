// @vitest-environment node

import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deriveComponentSeedV1 } from "../music-domain/component-seed";
import { HARMONY_PROFILE_IDS, type HarmonyProfileId } from "../music-domain/harmony";
import { getMotifRhythmTemplateV1, MOTIF_PHRASE_ROLES_V1 } from "../music-domain/motif-catalog";
import * as profileConfiguration from "../music-domain/motif-profile-configuration";
import * as prng from "../music-domain/prng";
import * as weightedChoice from "../music-domain/weighted-choice";
import { resolveMotifPlanV1, type ValidatedMotifPolicyContextV1 } from "./motif-policy-resolver";

vi.mock("../music-domain/prng", { spy: true });
vi.mock("../music-domain/motif-profile-configuration", { spy: true });
vi.mock("../music-domain/weighted-choice", { spy: true });

function context(
  profileId: HarmonyProfileId,
  energy: ValidatedMotifPolicyContextV1["energy"] = "medium",
  complexity: ValidatedMotifPolicyContextV1["complexity"] = "medium",
): ValidatedMotifPolicyContextV1 {
  return Object.freeze({ profileId, energy, complexity });
}

describe("Stage 8 Motif V1 policy resolution", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    [HARMONY_PROFILE_IDS.darkSynthwave, 0, ["active-8", "upper", "chordal", "none"]],
    [HARMONY_PROFILE_IDS.classicSynthwave, 1, ["steady-6", "upper", "chordal", "earlier-480"]],
    [HARMONY_PROFILE_IDS.darkwave, 2, ["steady-6", "middle", "diatonic-passing", "later-480"]],
    [HARMONY_PROFILE_IDS.midtempoCyberpunk, 3, ["active-8", "middle", "chordal", "none"]],
  ] as const)("returns the literal deterministic plan for %s", (profileId, rootSeed, expected) => {
    const input = context(profileId, "high", "low");
    const seed = deriveComponentSeedV1(rootSeed, "motif");
    const first = resolveMotifPlanV1(input, seed);
    expect([
      first.rhythmTemplate,
      first.registerBand,
      first.tensionMode,
      first.phrase4Displacement,
    ]).toEqual(expected);
    expect(resolveMotifPlanV1(input, seed)).toEqual(first);
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
    expect(first.policyVersion).toBe("nightdrive.motif-policy.v1");
    expect(first.profileVersion).toBe("nightdrive.genre-profile.motif.v1");
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.contourOffsets)).toBe(true);
    expect(Object.isFrozen(first.phraseRoles)).toBe(true);
  });

  it("uses one stream and exactly four ordered draws", () => {
    const input = context(HARMONY_PROFILE_IDS.midtempoCyberpunk);
    resolveMotifPlanV1(input, 0x1234_5678);

    expect(prng.createMulberry32State).toHaveBeenCalledTimes(1);
    expect(prng.nextMulberry32).toHaveBeenCalledTimes(4);
    expect(profileConfiguration.buildMotifWeightedCandidatesV1).toHaveBeenCalledTimes(4);
    expect(weightedChoice.selectWeightedCandidateV1).toHaveBeenCalledTimes(4);
    const slots = ["rhythm", "register", "tension", "displacement"] as const;
    for (let index = 0; index < slots.length; index += 1) {
      const builder = vi.mocked(profileConfiguration.buildMotifWeightedCandidatesV1);
      expect(builder.mock.calls[index]?.slice(1)).toEqual([
        input.profileId,
        slots[index],
        input.energy,
        input.complexity,
      ]);
      expect(vi.mocked(weightedChoice.selectWeightedCandidateV1).mock.calls[index]?.[0]).toBe(
        builder.mock.results[index]?.value,
      );
      expect(vi.mocked(weightedChoice.selectWeightedCandidateV1).mock.calls[index]?.[1]).toBe(
        vi.mocked(prng.nextMulberry32).mock.results[index]?.value.value,
      );
      if (index > 0) {
        expect(vi.mocked(prng.nextMulberry32).mock.calls[index]?.[0]).toBe(
          vi.mocked(prng.nextMulberry32).mock.results[index - 1]?.value.state,
        );
      }
    }
  });

  it("retains canonical catalog references and does not mutate inputs", () => {
    const input = context(HARMONY_PROFILE_IDS.darkwave, "very-high", "very-high");
    const before = structuredClone(input);
    const plan = resolveMotifPlanV1(input, 0xffff_ffff);
    expect(plan.contourOffsets).toBe(getMotifRhythmTemplateV1(plan.rhythmTemplate).contourOffsets);
    expect(plan.phraseRoles).toBe(MOTIF_PHRASE_ROLES_V1);
    expect(input).toEqual(before);
  });

  it("is component-isolated and independent of ambient randomness", () => {
    const input = context(HARMONY_PROFILE_IDS.classicSynthwave, "low", "high");
    const seed = deriveComponentSeedV1(0x1234_5678, "motif");
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is prohibited");
    });
    try {
      const expected = resolveMotifPlanV1(input, seed);
      deriveComponentSeedV1(0x1234_5678, "harmony");
      deriveComponentSeedV1(0x1234_5678, "bass");
      deriveComponentSeedV1(0x1234_5678, "arpeggiator");
      expect(resolveMotifPlanV1(input, seed)).toEqual(expected);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });

  it("stays internal and contains no projection or enclosing operation", async () => {
    const publicDomain = await import("../music-domain/index");
    expect(publicDomain).not.toHaveProperty("resolveMotifPlanV1");
    const publicIndexSource = readFileSync(
      new URL("../music-domain/index.ts", import.meta.url),
      "utf8",
    );
    expect(publicIndexSource).not.toContain("motif-policy-resolver");
    const source = readFileSync(new URL("./motif-policy-resolver.ts", import.meta.url), "utf8");
    for (const forbidden of [
      "Math.random",
      "Date.now",
      "new Date",
      "fetch(",
      "deriveComponentSeedV1",
      "HarmonyProgressionRealization",
      "MotifEventV1",
      "generateMotifV1",
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
