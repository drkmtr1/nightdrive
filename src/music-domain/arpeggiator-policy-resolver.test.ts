// @vitest-environment node

import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deriveComponentSeedV1 } from "./component-seed";
import { HARMONY_PROFILE_IDS, type HarmonyProfileId } from "./harmony";
import { createDurationTicks } from "./musical-time";
import * as prng from "./prng";
import * as profileConfiguration from "./arpeggiator-profile-configuration";
import * as weightedChoice from "./weighted-choice";
import {
  resolveArpPlanV1,
  type ResolvedArpPlanV1,
  type ValidatedArpPolicyContextV1,
} from "./arpeggiator-policy-resolver";

vi.mock("./prng", { spy: true });
vi.mock("./arpeggiator-profile-configuration", { spy: true });
vi.mock("./weighted-choice", { spy: true });

function context(
  profileId: HarmonyProfileId,
  energy: ValidatedArpPolicyContextV1["energy"] = "medium",
  complexity: ValidatedArpPolicyContextV1["complexity"] = "medium",
): ValidatedArpPolicyContextV1 {
  return Object.freeze({ profileId, energy, complexity });
}

const GOLDEN_CASES = [
  {
    profileId: HARMONY_PROFILE_IDS.darkSynthwave,
    energy: "medium",
    complexity: "medium",
    componentSeed: 2_011_937_067,
    expected: {
      rate: "eighth",
      direction: "down",
      gateTicks: createDurationTicks(360),
      octaveRange: 2,
      maskId: "three-of-four",
    },
  },
  {
    profileId: HARMONY_PROFILE_IDS.classicSynthwave,
    energy: "high",
    complexity: "low",
    componentSeed: 2_926_668_988,
    expected: {
      rate: "sixteenth",
      direction: "down-up",
      gateTicks: createDurationTicks(120),
      octaveRange: 2,
      maskId: "three-of-four",
    },
  },
  {
    profileId: HARMONY_PROFILE_IDS.darkwave,
    energy: "low",
    complexity: "very-high",
    componentSeed: 561_390_553,
    expected: {
      rate: "eighth",
      direction: "down",
      gateTicks: createDurationTicks(360),
      octaveRange: 1,
      maskId: "alternating-on-rest",
    },
  },
  {
    profileId: HARMONY_PROFILE_IDS.midtempoCyberpunk,
    energy: "very-high",
    complexity: "high",
    componentSeed: 3_753_044_731,
    expected: {
      rate: "sixteenth",
      direction: "down-up",
      gateTicks: createDurationTicks(120),
      octaveRange: 1,
      maskId: "alternating-rest-on",
    },
  },
  {
    profileId: HARMONY_PROFILE_IDS.darkSynthwave,
    energy: "medium",
    complexity: "medium",
    componentSeed: 0,
    expected: {
      rate: "eighth",
      direction: "down-up",
      gateTicks: createDurationTicks(360),
      octaveRange: 1,
      maskId: "full",
    },
  },
  {
    profileId: HARMONY_PROFILE_IDS.classicSynthwave,
    energy: "high",
    complexity: "low",
    componentSeed: 1,
    expected: {
      rate: "sixteenth",
      direction: "up",
      gateTicks: createDurationTicks(180),
      octaveRange: 1,
      maskId: "full",
    },
  },
  {
    profileId: HARMONY_PROFILE_IDS.darkwave,
    energy: "low",
    complexity: "very-high",
    componentSeed: 2,
    expected: {
      rate: "quarter",
      direction: "down",
      gateTicks: createDurationTicks(960),
      octaveRange: 2,
      maskId: "alternating-on-rest",
    },
  },
  {
    profileId: HARMONY_PROFILE_IDS.midtempoCyberpunk,
    energy: "very-high",
    complexity: "high",
    componentSeed: 3,
    expected: {
      rate: "sixteenth",
      direction: "down-up",
      gateTicks: createDurationTicks(120),
      octaveRange: 2,
      maskId: "alternating-rest-on",
    },
  },
] as const satisfies readonly Readonly<{
  profileId: HarmonyProfileId;
  energy: ValidatedArpPolicyContextV1["energy"];
  complexity: ValidatedArpPolicyContextV1["complexity"];
  componentSeed: number;
  expected: ResolvedArpPlanV1;
}>[];

describe("Stage 7C7a7 policy resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(GOLDEN_CASES)(
    "matches the literal $profileId/$energy/$complexity seed $componentSeed plan",
    ({ profileId, energy, complexity, componentSeed, expected }) => {
      expect(resolveArpPlanV1(context(profileId, energy, complexity), componentSeed)).toEqual(
        expected,
      );
    },
  );

  it("has fixed seed-sensitive fixtures for every accepted profile", () => {
    for (let index = 0; index < 4; index += 1) {
      const first = GOLDEN_CASES[index];
      const second = GOLDEN_CASES[index + 4];
      expect(first?.profileId).toBe(second?.profileId);
      expect(first?.expected).not.toEqual(second?.expected);
    }
  });

  it("uses one stream and exactly one draw for each canonical decision slot", () => {
    const input = context(HARMONY_PROFILE_IDS.midtempoCyberpunk, "medium", "medium");
    resolveArpPlanV1(input, 2_011_937_067);

    expect(prng.createMulberry32State).toHaveBeenCalledTimes(1);
    expect(prng.createMulberry32State).toHaveBeenCalledWith(2_011_937_067);
    expect(prng.nextMulberry32).toHaveBeenCalledTimes(5);
    expect(profileConfiguration.buildArpWeightedCandidatesV1).toHaveBeenCalledTimes(5);
    expect(weightedChoice.selectWeightedCandidateV1).toHaveBeenCalledTimes(5);

    const expectedSlots = ["rate", "octave-range", "direction", "mask", "gate"] as const;
    for (let index = 0; index < expectedSlots.length; index += 1) {
      const builderCall = vi.mocked(profileConfiguration.buildArpWeightedCandidatesV1).mock.calls[
        index
      ];
      const selectorCall = vi.mocked(weightedChoice.selectWeightedCandidateV1).mock.calls[index];
      const prngResult = vi.mocked(prng.nextMulberry32).mock.results[index]?.value;
      expect(builderCall?.slice(1)).toEqual([
        input.profileId,
        expectedSlots[index],
        input.energy,
        input.complexity,
      ]);
      expect(selectorCall?.[0]).toBe(
        vi.mocked(profileConfiguration.buildArpWeightedCandidatesV1).mock.results[index]?.value,
      );
      expect(selectorCall?.[1]).toBe(prngResult?.value);
      if (index > 0) {
        expect(vi.mocked(prng.nextMulberry32).mock.calls[index]?.[0]).toBe(
          vi.mocked(prng.nextMulberry32).mock.results[index - 1]?.value.state,
        );
      }
    }

    const gateCandidates = vi.mocked(weightedChoice.selectWeightedCandidateV1).mock.calls[4]?.[0];
    expect(gateCandidates).toEqual([{ value: "short", weight: 1 }]);
  });

  it("returns only the exact frozen plan fields without mutating input", () => {
    const input = context(HARMONY_PROFILE_IDS.darkSynthwave, "high", "very-high");
    const before = structuredClone(input);
    const plan = resolveArpPlanV1(input, 561_390_553);

    expect(Reflect.ownKeys(plan)).toEqual([
      "rate",
      "direction",
      "gateTicks",
      "octaveRange",
      "maskId",
    ]);
    expect(Object.isFrozen(plan)).toBe(true);
    expect(input).toEqual(before);
    expect(Object.isFrozen(input)).toBe(true);
  });

  it("is deterministic, component-isolated, and independent of ambient randomness", () => {
    const input = context(HARMONY_PROFILE_IDS.darkwave, "high", "high");
    const componentSeed = deriveComponentSeedV1(0x1234_5678, "arpeggiator");
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is prohibited");
    });

    try {
      const expected = resolveArpPlanV1(input, componentSeed);
      deriveComponentSeedV1(0x1234_5678, "harmony");
      deriveComponentSeedV1(0x1234_5678, "bass");
      deriveComponentSeedV1(0x1234_5678, "motif");
      expect(resolveArpPlanV1(input, componentSeed)).toEqual(expected);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });

  it("stays internal and contains no enclosing, projection, or ambient integration", async () => {
    const publicDomain = await import("./index");
    expect(publicDomain).not.toHaveProperty("resolveArpPlanV1");
    expect(publicDomain).not.toHaveProperty("ResolvedArpPlanV1");

    const publicIndexSource = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
    expect(publicIndexSource).not.toContain("arpeggiator-policy-resolver");

    const source = readFileSync(
      new URL("./arpeggiator-policy-resolver.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("new Date");
    expect(source).not.toContain("Intl.");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("WebSocket");
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("deriveComponentSeedV1");
    expect(source).not.toContain("HarmonyProgressionRealization");
    expect(source).not.toContain("generateArpEvents");
    expect(source).not.toContain("ARP_DENSITY_MASK_CATALOG_V1");
  });
});
