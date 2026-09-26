import { describe, expect, it } from "vitest";

import {
  assertStage8MotifReferencePolicyLiterals,
  buildStage8MotifReferenceWeightedCandidates,
  STAGE8_MOTIF_REFERENCE_COMPLEXITY_LEVELS,
  STAGE8_MOTIF_REFERENCE_ENERGY_LEVELS,
  STAGE8_MOTIF_REFERENCE_POLICY_VERSION,
  STAGE8_MOTIF_REFERENCE_PROFILE_DATA_VERSION,
  STAGE8_MOTIF_REFERENCE_PROFILE_IDS,
  STAGE8_MOTIF_REFERENCE_SLOT_IDS,
} from "./stage8-motif-reference-policy";

type ExpectedSlot = {
  slot: string;
  candidates: string[];
  energyWeights: number[][];
  complexityAdditions: number[][];
};

type ExpectedPolicy = {
  policyVersion: string;
  profileDataVersion: string;
  profiles: Array<{
    profileId: string;
    decisionSlots: ExpectedSlot[];
  }>;
};

function same(values: number[]): number[][] {
  return [values.slice(), values.slice(), values.slice(), values.slice(), values.slice()];
}

// This test-only oracle is independently transcribed from the accepted Stage 8 V1 table.
const EXPECTED_POLICY: ExpectedPolicy = {
  policyVersion: "nightdrive.motif-policy.v1",
  profileDataVersion: "nightdrive.genre-profile.motif.v1",
  profiles: [
    {
      profileId: "dark-synthwave",
      decisionSlots: [
        {
          slot: "rhythm",
          candidates: ["sparse-4", "steady-6", "active-8"],
          energyWeights: [
            [6, 3, 1],
            [5, 4, 1],
            [3, 6, 3],
            [2, 5, 6],
            [1, 3, 8],
          ],
          complexityAdditions: same([0, 0, 0]),
        },
        {
          slot: "register",
          candidates: ["middle", "upper"],
          energyWeights: [
            [6, 2],
            [5, 3],
            [4, 4],
            [3, 5],
            [2, 6],
          ],
          complexityAdditions: same([0, 0]),
        },
        {
          slot: "tension",
          candidates: ["chordal", "diatonic-passing"],
          energyWeights: same([5, 3]),
          complexityAdditions: [
            [2, 0],
            [1, 0],
            [0, 0],
            [0, 2],
            [0, 4],
          ],
        },
        {
          slot: "displacement",
          candidates: ["none", "later-480", "earlier-480"],
          energyWeights: same([6, 3, 2]),
          complexityAdditions: [
            [2, 0, 0],
            [1, 0, 0],
            [0, 0, 0],
            [0, 1, 1],
            [0, 2, 2],
          ],
        },
      ],
    },
    {
      profileId: "classic-synthwave",
      decisionSlots: [
        {
          slot: "rhythm",
          candidates: ["sparse-4", "steady-6", "active-8"],
          energyWeights: [
            [5, 4, 1],
            [4, 5, 1],
            [2, 7, 3],
            [2, 6, 5],
            [1, 5, 7],
          ],
          complexityAdditions: same([0, 0, 0]),
        },
        {
          slot: "register",
          candidates: ["middle", "upper"],
          energyWeights: [
            [6, 2],
            [5, 3],
            [4, 4],
            [3, 5],
            [2, 6],
          ],
          complexityAdditions: same([0, 0]),
        },
        {
          slot: "tension",
          candidates: ["chordal", "diatonic-passing"],
          energyWeights: same([6, 2]),
          complexityAdditions: [
            [2, 0],
            [1, 0],
            [0, 0],
            [0, 2],
            [0, 3],
          ],
        },
        {
          slot: "displacement",
          candidates: ["none", "earlier-480", "later-480"],
          energyWeights: same([7, 2, 2]),
          complexityAdditions: [
            [2, 0, 0],
            [1, 0, 0],
            [0, 0, 0],
            [0, 1, 1],
            [0, 2, 2],
          ],
        },
      ],
    },
    {
      profileId: "darkwave",
      decisionSlots: [
        {
          slot: "rhythm",
          candidates: ["sparse-4", "steady-6", "active-8"],
          energyWeights: [
            [8, 2, 1],
            [7, 3, 1],
            [5, 5, 2],
            [3, 7, 3],
            [2, 7, 5],
          ],
          complexityAdditions: same([0, 0, 0]),
        },
        {
          slot: "register",
          candidates: ["lower", "middle"],
          energyWeights: same([7, 3]),
          complexityAdditions: [
            [2, 0],
            [1, 0],
            [0, 0],
            [0, 1],
            [0, 2],
          ],
        },
        {
          slot: "tension",
          candidates: ["chordal", "diatonic-passing"],
          energyWeights: same([4, 4]),
          complexityAdditions: [
            [2, 0],
            [1, 0],
            [0, 0],
            [0, 2],
            [0, 4],
          ],
        },
        {
          slot: "displacement",
          candidates: ["none", "later-480", "earlier-480"],
          energyWeights: same([5, 4, 2]),
          complexityAdditions: [
            [2, 0, 0],
            [1, 0, 0],
            [0, 0, 0],
            [0, 2, 1],
            [0, 3, 2],
          ],
        },
      ],
    },
    {
      profileId: "midtempo-cyberpunk",
      decisionSlots: [
        {
          slot: "rhythm",
          candidates: ["sparse-4", "steady-6", "active-8"],
          energyWeights: [
            [6, 4, 1],
            [5, 5, 1],
            [4, 6, 3],
            [3, 7, 4],
            [2, 7, 6],
          ],
          complexityAdditions: same([0, 0, 0]),
        },
        {
          slot: "register",
          candidates: ["lower", "middle", "upper"],
          energyWeights: [
            [5, 5, 2],
            [4, 6, 2],
            [3, 7, 3],
            [2, 7, 5],
            [1, 6, 7],
          ],
          complexityAdditions: same([0, 0, 0]),
        },
        {
          slot: "tension",
          candidates: ["chordal", "diatonic-passing"],
          energyWeights: same([5, 3]),
          complexityAdditions: [
            [2, 0],
            [1, 0],
            [0, 0],
            [0, 2],
            [0, 4],
          ],
        },
        {
          slot: "displacement",
          candidates: ["none", "earlier-480", "later-480"],
          energyWeights: same([4, 4, 3]),
          complexityAdditions: [
            [2, 0, 0],
            [1, 0, 0],
            [0, 0, 0],
            [0, 2, 2],
            [0, 3, 3],
          ],
        },
      ],
    },
  ],
};

function cloneExpectedPolicy(): ExpectedPolicy {
  return structuredClone(EXPECTED_POLICY);
}

function expectedCandidates(
  profileIndex: number,
  slotIndex: number,
  energyIndex: number,
  complexityIndex: number,
) {
  const slot = EXPECTED_POLICY.profiles[profileIndex].decisionSlots[slotIndex];
  return slot.candidates.map((value, candidateIndex) => ({
    value,
    weight:
      slot.energyWeights[energyIndex][candidateIndex] +
      slot.complexityAdditions[complexityIndex][candidateIndex],
  }));
}

describe("Stage 8 Motif independent policy reference", () => {
  it("matches the accepted identities, table order, and all 400 constructed candidate lists", () => {
    expect(STAGE8_MOTIF_REFERENCE_POLICY_VERSION).toBe(EXPECTED_POLICY.policyVersion);
    expect(STAGE8_MOTIF_REFERENCE_PROFILE_DATA_VERSION).toBe(EXPECTED_POLICY.profileDataVersion);
    expect(STAGE8_MOTIF_REFERENCE_PROFILE_IDS).toEqual(
      EXPECTED_POLICY.profiles.map((profile) => profile.profileId),
    );
    expect(STAGE8_MOTIF_REFERENCE_SLOT_IDS).toEqual(
      EXPECTED_POLICY.profiles[0].decisionSlots.map((slot) => slot.slot),
    );
    expect(STAGE8_MOTIF_REFERENCE_ENERGY_LEVELS).toEqual([
      "very-low",
      "low",
      "medium",
      "high",
      "very-high",
    ]);
    expect(STAGE8_MOTIF_REFERENCE_COMPLEXITY_LEVELS).toEqual([
      "very-low",
      "low",
      "medium",
      "high",
      "very-high",
    ]);
    expect(() => assertStage8MotifReferencePolicyLiterals(EXPECTED_POLICY)).not.toThrow();

    let listCount = 0;
    for (const [profileIndex, profile] of EXPECTED_POLICY.profiles.entries()) {
      for (const [slotIndex, slot] of profile.decisionSlots.entries()) {
        for (const [energyIndex, energy] of STAGE8_MOTIF_REFERENCE_ENERGY_LEVELS.entries()) {
          for (const [
            complexityIndex,
            complexity,
          ] of STAGE8_MOTIF_REFERENCE_COMPLEXITY_LEVELS.entries()) {
            const actual = buildStage8MotifReferenceWeightedCandidates(
              profile.profileId,
              slot.slot,
              energy,
              complexity,
            );
            expect(actual).toEqual(
              expectedCandidates(profileIndex, slotIndex, energyIndex, complexityIndex),
            );
            expect(actual.map((candidate) => candidate.value)).toEqual(slot.candidates);
            expect(actual.every((candidate) => Number.isSafeInteger(candidate.weight))).toBe(true);
            expect(
              actual.every((candidate) => candidate.weight > 0 && candidate.weight <= 65_535),
            ).toBe(true);
            listCount += 1;
          }
        }
      }
    }
    expect(listCount).toBe(400);
  });

  it("preserves discriminating declaration order and raw element-wise additions", () => {
    expect(
      buildStage8MotifReferenceWeightedCandidates(
        "classic-synthwave",
        "displacement",
        "high",
        "high",
      ),
    ).toEqual([
      { value: "none", weight: 7 },
      { value: "earlier-480", weight: 3 },
      { value: "later-480", weight: 3 },
    ]);
    expect(
      buildStage8MotifReferenceWeightedCandidates("darkwave", "displacement", "high", "high"),
    ).toEqual([
      { value: "none", weight: 5 },
      { value: "later-480", weight: 6 },
      { value: "earlier-480", weight: 3 },
    ]);
    expect(
      buildStage8MotifReferenceWeightedCandidates(
        "midtempo-cyberpunk",
        "register",
        "medium",
        "very-high",
      ),
    ).toEqual([
      { value: "lower", weight: 3 },
      { value: "middle", weight: 7 },
      { value: "upper", weight: 3 },
    ]);
  });

  it("rejects malformed canonical identifiers without defaulting or coercion", () => {
    const invalidValues: unknown[] = [
      undefined,
      null,
      "",
      "Darkwave",
      "darkwave ",
      " darkwave",
      0,
      {},
      [],
    ];
    for (const value of invalidValues) {
      expect(() =>
        buildStage8MotifReferenceWeightedCandidates(value, "rhythm", "medium", "medium"),
      ).toThrow(/profileId/);
      expect(() =>
        buildStage8MotifReferenceWeightedCandidates("darkwave", value, "medium", "medium"),
      ).toThrow(/slotId/);
      expect(() =>
        buildStage8MotifReferenceWeightedCandidates("darkwave", "rhythm", value, "medium"),
      ).toThrow(/energy/);
      expect(() =>
        buildStage8MotifReferenceWeightedCandidates("darkwave", "rhythm", "medium", value),
      ).toThrow(/complexity/);
    }
  });

  it("rejects altered V1 literals instead of repairing them", () => {
    const mutations: Array<(policy: ExpectedPolicy) => void> = [
      (policy) => {
        policy.policyVersion = "nightdrive.motif-policy.v2";
      },
      (policy) => {
        [policy.profiles[0], policy.profiles[1]] = [policy.profiles[1], policy.profiles[0]];
      },
      (policy) => {
        const slots = policy.profiles[0].decisionSlots;
        [slots[0], slots[1]] = [slots[1], slots[0]];
      },
      (policy) => {
        policy.profiles[0].decisionSlots[0].candidates.reverse();
      },
      (policy) => {
        policy.profiles[0].decisionSlots[0].energyWeights.pop();
      },
      (policy) => {
        policy.profiles[0].decisionSlots[0].complexityAdditions[0].pop();
      },
      (policy) => {
        policy.profiles[0].decisionSlots[0].energyWeights[0][0] = 0.5;
      },
      (policy) => {
        policy.profiles[0].decisionSlots[0].energyWeights[2][0] = 0;
        policy.profiles[0].decisionSlots[0].complexityAdditions[2][0] = 0;
      },
      (policy) => {
        policy.profiles[0].decisionSlots[0].energyWeights[0][0] = 65_535;
        policy.profiles[0].decisionSlots[0].complexityAdditions[0][0] = 1;
      },
    ];

    for (const mutate of mutations) {
      const altered = cloneExpectedPolicy();
      mutate(altered);
      expect(() => assertStage8MotifReferencePolicyLiterals(altered)).toThrow(/canonical Stage 8/);
    }
  });

  it("returns deeply frozen detached candidate lists", () => {
    const first = buildStage8MotifReferenceWeightedCandidates(
      "dark-synthwave",
      "rhythm",
      "medium",
      "medium",
    );
    expect(Object.isFrozen(first)).toBe(true);
    expect(first.every((candidate) => Object.isFrozen(candidate))).toBe(true);
    expect(Reflect.set(first[0], "weight", 99)).toBe(false);
    expect(first).toEqual([
      { value: "sparse-4", weight: 3 },
      { value: "steady-6", weight: 6 },
      { value: "active-8", weight: 3 },
    ]);

    const second = buildStage8MotifReferenceWeightedCandidates(
      "dark-synthwave",
      "rhythm",
      "medium",
      "medium",
    );
    expect(second).not.toBe(first);
    expect(second).toEqual(first);
  });
});
