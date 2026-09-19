// @vitest-environment node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  ARP_GENRE_PROFILE_CONFIGURATION_V1,
  ARP_GENRE_PROFILE_CONFIGURATION_V2,
  ARP_PROFILE_DATA_VERSION_V2,
  ArpGenreProfileConfigurationError,
  buildArpWeightedCandidatesV1,
  buildArpWeightedCandidatesV2,
  validateArpGenreProfileConfigurationV1,
  validateArpGenreProfileConfigurationV2,
  type ArpGenreProfileConfigurationDataV1,
  type ArpGenreProfileConfigurationDataV2,
  type ArpGenreProfileConfigurationFailureKindV1,
} from "./arpeggiator-profile-configuration";
import { ArpValueError } from "./arpeggiator";
import { SharedArpPolicyConfigurationError } from "./arpeggiator-policy-configuration";
import { CompositionIntentValueError } from "./composition-intent";
import * as componentSeed from "./component-seed";
import * as publicDomain from "./index";
import * as prng from "./prng";
import * as weightedChoice from "./weighted-choice";

const LEVELS = ["very-low", "low", "medium", "high", "very-high"] as const;
const SLOT_ORDER = ["rate", "octave-range", "direction", "mask", "gate"] as const;

type FixtureSlot = Readonly<{
  slot: (typeof SLOT_ORDER)[number];
  candidates: readonly (string | number)[];
  energy: readonly (readonly number[])[];
  complexity: readonly (readonly number[])[];
}>;

type FixtureProfile = Readonly<{
  profileId: string;
  slots: readonly FixtureSlot[];
}>;

// Independent literal transcription of the accepted Stage 7C4 tables. This is
// deliberately separate from the production configuration and its helpers.
const EXPECTED_PROFILES = [
  {
    profileId: "dark-synthwave",
    slots: [
      {
        slot: "rate",
        candidates: ["eighth", "sixteenth"],
        energy: [
          [5, 1],
          [4, 2],
          [3, 5],
          [2, 6],
          [1, 7],
        ],
        complexity: [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
        ],
      },
      {
        slot: "octave-range",
        candidates: [1, 2],
        energy: [
          [2, 5],
          [2, 5],
          [2, 5],
          [2, 5],
          [2, 5],
        ],
        complexity: [
          [2, 0],
          [1, 0],
          [0, 0],
          [0, 1],
          [0, 2],
        ],
      },
      {
        slot: "direction",
        candidates: ["down-up", "down", "up-down"],
        energy: [
          [6, 4, 1],
          [6, 4, 1],
          [6, 4, 1],
          [6, 4, 1],
          [6, 4, 1],
        ],
        complexity: [
          [0, 1, 0],
          [0, 0, 0],
          [0, 0, 0],
          [1, 0, 1],
          [2, 0, 2],
        ],
      },
      {
        slot: "mask",
        candidates: ["three-of-four", "full"],
        energy: [
          [6, 2],
          [5, 3],
          [4, 5],
          [3, 6],
          [2, 7],
        ],
        complexity: [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
        ],
      },
      {
        slot: "gate",
        candidates: ["short", "medium"],
        energy: [
          [2, 6],
          [3, 5],
          [4, 4],
          [5, 3],
          [6, 2],
        ],
        complexity: [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
        ],
      },
    ],
  },
  {
    profileId: "classic-synthwave",
    slots: [
      {
        slot: "rate",
        candidates: ["eighth", "sixteenth"],
        energy: [
          [5, 1],
          [4, 2],
          [3, 5],
          [2, 6],
          [1, 7],
        ],
        complexity: [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
        ],
      },
      {
        slot: "octave-range",
        candidates: [1, 2],
        energy: [
          [5, 2],
          [4, 3],
          [3, 5],
          [2, 6],
          [1, 7],
        ],
        complexity: [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
        ],
      },
      {
        slot: "direction",
        candidates: ["up", "up-down", "down-up"],
        energy: [
          [6, 3, 1],
          [6, 3, 1],
          [6, 3, 1],
          [6, 3, 1],
          [6, 3, 1],
        ],
        complexity: [
          [2, 0, 0],
          [1, 0, 0],
          [0, 1, 0],
          [0, 2, 1],
          [0, 3, 2],
        ],
      },
      {
        slot: "mask",
        candidates: ["three-of-four", "full"],
        energy: [
          [6, 2],
          [5, 3],
          [3, 6],
          [2, 7],
          [1, 8],
        ],
        complexity: [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
        ],
      },
      {
        slot: "gate",
        candidates: ["short", "medium"],
        energy: [
          [2, 6],
          [3, 5],
          [4, 5],
          [5, 4],
          [6, 3],
        ],
        complexity: [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
        ],
      },
    ],
  },
  {
    profileId: "darkwave",
    slots: [
      {
        slot: "rate",
        candidates: ["quarter", "eighth"],
        energy: [
          [6, 2],
          [5, 3],
          [3, 6],
          [2, 7],
          [1, 8],
        ],
        complexity: [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
        ],
      },
      {
        slot: "octave-range",
        candidates: [1, 2],
        energy: [
          [7, 1],
          [7, 1],
          [7, 1],
          [7, 1],
          [7, 1],
        ],
        complexity: [
          [1, 0],
          [0, 0],
          [0, 1],
          [0, 2],
          [0, 3],
        ],
      },
      {
        slot: "direction",
        candidates: ["up", "down", "up-down"],
        energy: [
          [7, 5, 1],
          [7, 5, 1],
          [7, 5, 1],
          [7, 5, 1],
          [7, 5, 1],
        ],
        complexity: [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
          [0, 0, 2],
          [0, 0, 3],
        ],
      },
      {
        slot: "mask",
        candidates: ["one-of-four", "alternating-on-rest", "alternating-rest-on"],
        energy: [
          [7, 2, 1],
          [6, 3, 2],
          [4, 6, 3],
          [3, 7, 4],
          [2, 8, 5],
        ],
        complexity: [
          [2, 1, 0],
          [1, 1, 0],
          [0, 1, 1],
          [0, 1, 2],
          [0, 1, 3],
        ],
      },
      {
        slot: "gate",
        candidates: ["medium", "long"],
        energy: [
          [2, 7],
          [3, 6],
          [4, 5],
          [6, 3],
          [7, 2],
        ],
        complexity: [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
        ],
      },
    ],
  },
  {
    profileId: "midtempo-cyberpunk",
    slots: [
      {
        slot: "rate",
        candidates: ["eighth", "sixteenth"],
        energy: [
          [5, 2],
          [4, 3],
          [4, 4],
          [3, 5],
          [2, 6],
        ],
        complexity: [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
        ],
      },
      {
        slot: "octave-range",
        candidates: [1, 2],
        energy: [
          [4, 4],
          [4, 4],
          [4, 4],
          [4, 4],
          [4, 4],
        ],
        complexity: [
          [2, 0],
          [1, 0],
          [0, 0],
          [0, 1],
          [0, 2],
        ],
      },
      {
        slot: "direction",
        candidates: ["down-up", "up-down", "down", "up"],
        energy: [
          [5, 5, 2, 2],
          [5, 5, 2, 2],
          [5, 5, 2, 2],
          [5, 5, 2, 2],
          [5, 5, 2, 2],
        ],
        complexity: [
          [0, 0, 1, 1],
          [0, 0, 1, 0],
          [1, 1, 0, 0],
          [2, 2, 0, 0],
          [3, 3, 0, 0],
        ],
      },
      {
        slot: "mask",
        candidates: ["three-of-four", "alternating-on-rest", "alternating-rest-on"],
        energy: [
          [2, 5, 4],
          [3, 5, 4],
          [5, 5, 5],
          [7, 4, 5],
          [8, 3, 5],
        ],
        complexity: [
          [2, 1, 0],
          [1, 1, 0],
          [0, 1, 1],
          [0, 1, 2],
          [0, 1, 3],
        ],
      },
      {
        slot: "gate",
        candidates: ["short"],
        energy: [[1], [1], [1], [1], [1]],
        complexity: [[0], [0], [0], [0], [0]],
      },
    ],
  },
] as const satisfies readonly FixtureProfile[];

// Independent literal transcription of the accepted ordered R1 research data.
// It is intentionally not derived from the production V2 configuration.
const EXPECTED_R1_RESEARCH_JSON = `[
  {"profileId":"dark-synthwave","slots":[
    {"slot":"rate","candidates":["eighth","sixteenth"],"energy":[[5,1],[4,2],[3,5],[2,6],[1,7]],"complexity":[[0,0],[0,0],[0,0],[0,0],[0,0]]},
    {"slot":"octave-range","candidates":[1,2],"energy":[[2,5],[2,5],[2,5],[2,5],[2,5]],"complexity":[[6,0],[3,0],[0,0],[0,2],[0,4]]},
    {"slot":"direction","candidates":["down-up","down","up-down"],"energy":[[6,4,1],[6,4,1],[6,4,1],[6,4,1],[6,4,1]],"complexity":[[0,2,1],[0,1,1],[0,0,0],[1,0,4],[2,0,8]]},
    {"slot":"mask","candidates":["three-of-four","full"],"energy":[[9,2],[7,4],[4,5],[3,4],[1,3]],"complexity":[[0,0],[0,0],[0,0],[0,0],[0,0]]},
    {"slot":"gate","candidates":["short","medium"],"energy":[[4,7],[4,6],[4,4],[5,3],[6,1]],"complexity":[[0,0],[0,0],[0,0],[0,0],[0,0]]}
  ]},
  {"profileId":"classic-synthwave","slots":[
    {"slot":"rate","candidates":["eighth","sixteenth"],"energy":[[5,1],[4,1],[3,5],[2,5],[1,7]],"complexity":[[0,0],[0,0],[0,0],[0,0],[0,0]]},
    {"slot":"octave-range","candidates":[1,2],"energy":[[5,2],[4,3],[3,5],[2,6],[2,7]],"complexity":[[6,0],[0,0],[0,0],[0,0],[1,4]]},
    {"slot":"direction","candidates":["up","up-down","down-up"],"energy":[[6,3,1],[6,3,1],[6,3,1],[6,3,1],[6,3,1]],"complexity":[[2,1,0],[1,1,0],[0,1,0],[0,5,5],[2,6,9]]},
    {"slot":"mask","candidates":["three-of-four","full"],"energy":[[6,2],[5,2],[3,6],[2,7],[1,8]],"complexity":[[0,0],[0,0],[0,0],[0,0],[0,0]]},
    {"slot":"gate","candidates":["short","medium"],"energy":[[5,9],[5,7],[4,5],[5,6],[6,3]],"complexity":[[0,0],[0,0],[0,0],[0,0],[0,0]]}
  ]},
  {"profileId":"darkwave","slots":[
    {"slot":"rate","candidates":["quarter","eighth"],"energy":[[6,2],[5,3],[3,6],[2,7],[1,8]],"complexity":[[0,0],[0,0],[0,0],[0,0],[0,0]]},
    {"slot":"octave-range","candidates":[1,2],"energy":[[7,1],[7,1],[7,1],[7,1],[7,1]],"complexity":[[1,0],[1,1],[0,1],[0,2],[0,3]]},
    {"slot":"direction","candidates":["up","down","up-down"],"energy":[[7,5,1],[7,5,1],[7,5,1],[7,5,1],[7,5,1]],"complexity":[[7,0,1],[4,0,1],[0,0,1],[0,0,2],[0,0,3]]},
    {"slot":"mask","candidates":["one-of-four","alternating-on-rest","alternating-rest-on"],"energy":[[7,2,1],[6,3,2],[4,6,3],[3,7,4],[2,8,5]],"complexity":[[2,1,0],[1,1,0],[0,1,1],[0,1,2],[0,1,3]]},
    {"slot":"gate","candidates":["medium","long"],"energy":[[2,7],[3,6],[4,5],[6,3],[7,2]],"complexity":[[0,0],[0,0],[0,0],[0,0],[0,0]]}
  ]},
  {"profileId":"midtempo-cyberpunk","slots":[
    {"slot":"rate","candidates":["eighth","sixteenth"],"energy":[[8,2],[7,6],[4,4],[4,7],[2,5]],"complexity":[[0,0],[0,0],[0,0],[0,0],[0,0]]},
    {"slot":"octave-range","candidates":[1,2],"energy":[[4,4],[4,4],[4,4],[4,4],[4,4]],"complexity":[[2,0],[1,0],[0,0],[0,1],[0,5]]},
    {"slot":"direction","candidates":["down-up","up-down","down","up"],"energy":[[5,5,2,2],[5,5,2,2],[5,5,2,2],[5,5,2,2],[5,5,2,2]],"complexity":[[0,0,3,6],[1,0,1,3],[1,1,0,0],[4,4,0,1],[3,3,0,0]]},
    {"slot":"mask","candidates":["three-of-four","alternating-on-rest","alternating-rest-on"],"energy":[[3,5,4],[4,5,5],[5,5,5],[9,6,6],[8,5,5]],"complexity":[[2,1,0],[0,0,0],[0,1,1],[0,1,2],[0,1,3]]},
    {"slot":"gate","candidates":["short"],"energy":[[1],[1],[1],[1],[1]],"complexity":[[0],[0],[0],[0],[0]]}
  ]}
]`;

const EXPECTED_R1_PROFILES = JSON.parse(EXPECTED_R1_RESEARCH_JSON) as readonly FixtureProfile[];
const EXPECTED_R1_FINGERPRINT = "b6f7ee16f33cf649ae2c6f06e4b5eecf859409b1917e2bc641323857fc1956e8";

const EXPECTED_500_LIST_DIGEST = "8caa12ac5b9ef6a3ae520d8dbcb83e6576d43ea43496db6594426298481a0c7e";

function mutableCanonical(): ArpGenreProfileConfigurationDataV1 {
  return structuredClone(ARP_GENRE_PROFILE_CONFIGURATION_V1);
}

function mutableCanonicalV2(): ArpGenreProfileConfigurationDataV2 {
  return structuredClone(ARP_GENRE_PROFILE_CONFIGURATION_V2);
}

function toResearchRepresentation(configuration: ArpGenreProfileConfigurationDataV2): unknown {
  return configuration.profiles.map((profile) => ({
    profileId: profile.profileId,
    slots: profile.decisionSlots.map((slot) => ({
      slot: slot.slot,
      candidates: [...slot.candidates],
      energy: slot.energyWeights.map((row) => [...row.values]),
      complexity: slot.complexityAdditions.map((row) => [...row.values]),
    })),
  }));
}

function expectConfigurationError(
  operation: () => unknown,
  kind: ArpGenreProfileConfigurationFailureKindV1,
): ArpGenreProfileConfigurationError {
  let error: unknown;
  try {
    operation();
  } catch (caught) {
    error = caught;
  }

  expect(error).toBeInstanceOf(ArpGenreProfileConfigurationError);
  expect(error).toBeInstanceOf(RangeError);
  expect(error).toMatchObject({
    name: "ArpGenreProfileConfigurationError",
    owner: "profile.version",
    kind,
  });
  expect(error).not.toBeInstanceOf(ArpValueError);
  expect(error).not.toBeInstanceOf(CompositionIntentValueError);
  expect(error).not.toBeInstanceOf(SharedArpPolicyConfigurationError);
  expect(error).not.toHaveProperty("value");
  expect(error).not.toHaveProperty("input");
  expect(error).not.toHaveProperty("payload");
  return error as ArpGenreProfileConfigurationError;
}

function assertRecursivelyFrozen(value: unknown): void {
  if (typeof value !== "object" || value === null) return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) assertRecursivelyFrozen(nested);
}

describe("Stage 7C7a6 canonical genre-profile configuration", () => {
  it("locks the accepted identity, profile order, slot order, candidates, and literal rows", () => {
    expect(ARP_GENRE_PROFILE_CONFIGURATION_V1.version).toBe(
      "nightdrive.genre-profile.arpeggiator.v1",
    );
    expect(ARP_GENRE_PROFILE_CONFIGURATION_V1.profiles.map(({ profileId }) => profileId)).toEqual(
      EXPECTED_PROFILES.map(({ profileId }) => profileId),
    );

    for (const [profileIndex, expectedProfile] of EXPECTED_PROFILES.entries()) {
      const actualProfile = ARP_GENRE_PROFILE_CONFIGURATION_V1.profiles[profileIndex];
      expect(actualProfile?.decisionSlots.map(({ slot }) => slot)).toEqual(SLOT_ORDER);
      for (const [slotIndex, expectedSlot] of expectedProfile.slots.entries()) {
        const actualSlot = actualProfile?.decisionSlots[slotIndex];
        expect(actualSlot?.slot).toBe(expectedSlot.slot);
        expect(actualSlot?.candidates).toEqual(expectedSlot.candidates);
        expect(actualSlot?.energyWeights).toEqual(
          LEVELS.map((level, rowIndex) => ({
            level,
            values: expectedSlot.energy[rowIndex],
          })),
        );
        expect(actualSlot?.complexityAdditions).toEqual(
          LEVELS.map((level, rowIndex) => ({
            level,
            values: expectedSlot.complexity[rowIndex],
          })),
        );
      }
    }
  });

  it("recursively freezes the canonical data and resists mutation", () => {
    assertRecursivelyFrozen(ARP_GENRE_PROFILE_CONFIGURATION_V1);
    const original = ARP_GENRE_PROFILE_CONFIGURATION_V1.profiles[0].decisionSlots[0].candidates[0];
    expect(() => {
      (ARP_GENRE_PROFILE_CONFIGURATION_V1.profiles[0].decisionSlots[0].candidates as string[])[0] =
        "quarter";
    }).toThrow(TypeError);
    expect(ARP_GENRE_PROFILE_CONFIGURATION_V1.profiles[0].decisionSlots[0].candidates[0]).toBe(
      original,
    );
  });
});

describe("Stage 7C7a6 exhaustive weighted-list construction", () => {
  it("locks all 500 ordered final lists with an independent aggregate golden", () => {
    const evidence: unknown[] = [];
    let combinationCount = 0;

    for (const expectedProfile of EXPECTED_PROFILES) {
      for (const expectedSlot of expectedProfile.slots) {
        for (const energy of LEVELS) {
          for (const complexity of LEVELS) {
            const result = buildArpWeightedCandidatesV1(
              ARP_GENRE_PROFILE_CONFIGURATION_V1,
              expectedProfile.profileId as never,
              expectedSlot.slot,
              energy,
              complexity,
            );
            combinationCount += 1;
            expect(result).not.toHaveLength(0);
            expect(result.map(({ value }) => value)).toEqual(expectedSlot.candidates);
            expect(result).toHaveLength(expectedSlot.candidates.length);
            for (const candidate of result) {
              expect(candidate.weight).toBeGreaterThanOrEqual(0);
              expect(candidate.weight).toBeLessThanOrEqual(65_535);
            }
            const total = result.reduce((sum, candidate) => sum + candidate.weight, 0);
            expect(total).toBeGreaterThanOrEqual(1);
            expect(total).toBeLessThanOrEqual(65_535);
            evidence.push([
              expectedProfile.profileId,
              expectedSlot.slot,
              energy,
              complexity,
              result,
            ]);
          }
        }
      }
    }

    expect(combinationCount).toBe(500);
    expect(createHash("sha256").update(JSON.stringify(evidence)).digest("hex")).toBe(
      EXPECTED_500_LIST_DIGEST,
    );
  });

  it("retains the one-candidate Midtempo Cyberpunk gate without selecting it", () => {
    expect(
      buildArpWeightedCandidatesV1(
        ARP_GENRE_PROFILE_CONFIGURATION_V1,
        "midtempo-cyberpunk",
        "gate",
        "very-high",
        "very-high",
      ),
    ).toEqual([{ value: "short", weight: 1 }]);
  });

  it("returns a new recursively frozen ordered list on every call", () => {
    const first = buildArpWeightedCandidatesV1(
      ARP_GENRE_PROFILE_CONFIGURATION_V1,
      "darkwave",
      "mask",
      "high",
      "very-high",
    );
    const second = buildArpWeightedCandidatesV1(
      ARP_GENRE_PROFILE_CONFIGURATION_V1,
      "darkwave",
      "mask",
      "high",
      "very-high",
    );
    expect(first).toEqual([
      { value: "one-of-four", weight: 3 },
      { value: "alternating-on-rest", weight: 8 },
      { value: "alternating-rest-on", weight: 7 },
    ]);
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    assertRecursivelyFrozen(first);
    assertRecursivelyFrozen(second);
  });
});

describe("Stage 7C7a6 direct validation boundary", () => {
  it("validates without mutating or freezing caller input and returns the canonical reference", () => {
    const input = mutableCanonical();
    const before = structuredClone(input);
    expect(validateArpGenreProfileConfigurationV1(input)).toBe(ARP_GENRE_PROFILE_CONFIGURATION_V1);
    expect(input).toEqual(before);
    expect(Object.isFrozen(input)).toBe(false);
  });

  it("does not depend on object property discovery order", () => {
    const canonical = mutableCanonical();
    const reordered = {
      profiles: canonical.profiles.map((profile) => ({
        decisionSlots: profile.decisionSlots.map((slot) => ({
          complexityAdditions: slot.complexityAdditions,
          energyWeights: slot.energyWeights,
          candidates: slot.candidates,
          slot: slot.slot,
        })),
        profileId: profile.profileId,
      })),
      version: canonical.version,
    };
    expect(validateArpGenreProfileConfigurationV1(reordered)).toBe(
      ARP_GENRE_PROFILE_CONFIGURATION_V1,
    );
  });

  it("implements every accepted failure kind", () => {
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV1(null),
      "INVALID_CONFIGURATION_SHAPE",
    );

    const version = mutableCanonical() as unknown as { version: string };
    version.version = "nightdrive.genre-profile.arpeggiator.v2";
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV1(version),
      "INVALID_PROFILE_DATA_VERSION",
    );

    const profiles = mutableCanonical() as unknown as { profiles: unknown[] };
    profiles.profiles.pop();
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV1(profiles),
      "INVALID_PROFILE_SET",
    );

    const slots = mutableCanonical() as unknown as {
      profiles: Array<{ decisionSlots: unknown[] }>;
    };
    slots.profiles[0]?.decisionSlots.pop();
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV1(slots),
      "INVALID_SLOT_STRUCTURE",
    );

    const candidates = mutableCanonical() as unknown as {
      profiles: Array<{ decisionSlots: Array<{ candidates: unknown[] }> }>;
    };
    candidates.profiles[0]?.decisionSlots[0]?.candidates.reverse();
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV1(candidates),
      "INVALID_CANDIDATES",
    );

    const energy = mutableCanonical() as unknown as {
      profiles: Array<{ decisionSlots: Array<{ energyWeights: unknown[] }> }>;
    };
    energy.profiles[0]?.decisionSlots[0]?.energyWeights.reverse();
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV1(energy),
      "INVALID_ENERGY_TABLE",
    );

    const complexity = mutableCanonical() as unknown as {
      profiles: Array<{ decisionSlots: Array<{ complexityAdditions: unknown[] }> }>;
    };
    complexity.profiles[0]?.decisionSlots[0]?.complexityAdditions.reverse();
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV1(complexity),
      "INVALID_COMPLEXITY_TABLE",
    );

    const alignment = mutableCanonical() as unknown as {
      profiles: Array<{
        decisionSlots: Array<{ energyWeights: Array<{ values: unknown[] }> }>;
      }>;
    };
    alignment.profiles[0]?.decisionSlots[0]?.energyWeights[0]?.values.pop();
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV1(alignment),
      "INVALID_VECTOR_ALIGNMENT",
    );

    const weight = mutableCanonical() as unknown as {
      profiles: Array<{
        decisionSlots: Array<{ energyWeights: Array<{ values: unknown[] }> }>;
      }>;
    };
    const invalidWeightValues = weight.profiles[0]?.decisionSlots[0]?.energyWeights[0]?.values;
    if (invalidWeightValues === undefined) throw new Error("Missing malformed-input fixture path.");
    invalidWeightValues[0] = Number.NaN;
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV1(weight),
      "INVALID_WEIGHT",
    );

    const finalWeights = mutableCanonical() as unknown as {
      profiles: Array<{
        decisionSlots: Array<{ energyWeights: Array<{ values: number[] }> }>;
      }>;
    };
    const changingValues = finalWeights.profiles[0]?.decisionSlots[0]?.energyWeights[0]?.values;
    if (changingValues === undefined) throw new Error("Missing final-weight fixture path.");
    let reads = 0;
    Object.defineProperty(changingValues, 0, {
      configurable: true,
      enumerable: true,
      get: () => {
        reads += 1;
        return reads === 1 ? 5 : 65_535;
      },
    });
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV1(finalWeights),
      "INVALID_FINAL_WEIGHTS",
    );
  });

  it("keeps deterministic phase precedence for mixed malformed input", () => {
    const versionBeforeProfiles = { version: "bad", profiles: [] };
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV1(versionBeforeProfiles),
      "INVALID_PROFILE_DATA_VERSION",
    );

    const profileBeforeSlot = mutableCanonical() as unknown as {
      profiles: Array<{ profileId: string; decisionSlots: unknown[] }>;
    };
    const firstProfile = profileBeforeSlot.profiles[0];
    if (firstProfile === undefined) throw new Error("Missing precedence fixture.");
    firstProfile.profileId = "darkwave";
    firstProfile.decisionSlots = [];
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV1(profileBeforeSlot),
      "INVALID_PROFILE_SET",
    );

    const candidateBeforeRows = mutableCanonical() as unknown as {
      profiles: Array<{
        decisionSlots: Array<{
          candidates: unknown[];
          energyWeights: unknown[];
          complexityAdditions: unknown[];
        }>;
      }>;
    };
    const firstSlot = candidateBeforeRows.profiles[0]?.decisionSlots[0];
    if (firstSlot === undefined) throw new Error("Missing precedence slot fixture.");
    firstSlot.candidates = [];
    firstSlot.energyWeights = [];
    firstSlot.complexityAdditions = [];
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV1(candidateBeforeRows),
      "INVALID_CANDIDATES",
    );
  });
});

describe("Stage 7 V2 profile-data foundation Slice 1 canonical data", () => {
  it("locks the exact V2 identity, ordered R1 literals, and accepted fingerprint", () => {
    expect(ARP_PROFILE_DATA_VERSION_V2).toBe("nightdrive.genre-profile.arpeggiator.v2");
    expect(ARP_GENRE_PROFILE_CONFIGURATION_V2.version).toBe(ARP_PROFILE_DATA_VERSION_V2);

    const researchRepresentation = toResearchRepresentation(ARP_GENRE_PROFILE_CONFIGURATION_V2);
    expect(researchRepresentation).toEqual(EXPECTED_R1_PROFILES);
    expect(createHash("sha256").update(JSON.stringify(researchRepresentation)).digest("hex")).toBe(
      EXPECTED_R1_FINGERPRINT,
    );

    expect(ARP_GENRE_PROFILE_CONFIGURATION_V2.profiles.map(({ profileId }) => profileId)).toEqual(
      EXPECTED_R1_PROFILES.map(({ profileId }) => profileId),
    );
    expect(
      EXPECTED_R1_PROFILES.map((profile) =>
        profile.slots.map((slot) => [slot.slot, slot.candidates]),
      ),
    ).toEqual(
      EXPECTED_PROFILES.map((profile) => profile.slots.map((slot) => [slot.slot, slot.candidates])),
    );
    for (const profile of ARP_GENRE_PROFILE_CONFIGURATION_V2.profiles) {
      expect(profile.decisionSlots.map(({ slot }) => slot)).toEqual(SLOT_ORDER);
      for (const slot of profile.decisionSlots) {
        expect(slot.energyWeights.map(({ level }) => level)).toEqual(LEVELS);
        expect(slot.complexityAdditions.map(({ level }) => level)).toEqual(LEVELS);
      }
    }
  });

  it("recursively freezes the V2 configuration and preserves deterministic reads", () => {
    assertRecursivelyFrozen(ARP_GENRE_PROFILE_CONFIGURATION_V2);
    const before = toResearchRepresentation(ARP_GENRE_PROFILE_CONFIGURATION_V2);
    expect(() => {
      (ARP_GENRE_PROFILE_CONFIGURATION_V2.profiles[0].decisionSlots[0].candidates as string[])[0] =
        "quarter";
    }).toThrow(TypeError);
    expect(toResearchRepresentation(ARP_GENRE_PROFILE_CONFIGURATION_V2)).toEqual(before);
  });
});

describe("Stage 7 V2 profile-data foundation Slice 1 candidate construction", () => {
  it("constructs all 500 exact ordered R1 lists and locks the observed bounds", () => {
    let combinationCount = 0;
    let minimumWeight = Number.POSITIVE_INFINITY;
    let maximumWeight = Number.NEGATIVE_INFINITY;
    let minimumTotal = Number.POSITIVE_INFINITY;
    let maximumTotal = Number.NEGATIVE_INFINITY;

    for (const expectedProfile of EXPECTED_R1_PROFILES) {
      for (const expectedSlot of expectedProfile.slots) {
        for (const [energyIndex, energy] of LEVELS.entries()) {
          for (const [complexityIndex, complexity] of LEVELS.entries()) {
            const expected = expectedSlot.candidates.map((value, candidateIndex) => ({
              value,
              weight:
                (expectedSlot.energy[energyIndex]?.[candidateIndex] as number) +
                (expectedSlot.complexity[complexityIndex]?.[candidateIndex] as number),
            }));
            const actual = buildArpWeightedCandidatesV2(
              ARP_GENRE_PROFILE_CONFIGURATION_V2,
              expectedProfile.profileId as never,
              expectedSlot.slot,
              energy,
              complexity,
            );
            combinationCount += 1;
            expect(actual).toEqual(expected);
            expect(actual.map(({ value }) => value)).toEqual(expectedSlot.candidates);
            expect(actual).toHaveLength(expectedSlot.candidates.length);
            assertRecursivelyFrozen(actual);

            const weights = actual.map(({ weight }) => weight);
            const total = weights.reduce((sum, weight) => sum + weight, 0);
            minimumWeight = Math.min(minimumWeight, ...weights);
            maximumWeight = Math.max(maximumWeight, ...weights);
            minimumTotal = Math.min(minimumTotal, total);
            maximumTotal = Math.max(maximumTotal, total);
          }
        }
      }
    }

    expect(combinationCount).toBe(500);
    expect([minimumWeight, maximumWeight]).toEqual([1, 14]);
    expect([minimumTotal, maximumTotal]).toEqual([1, 27]);
  });

  it("preserves every medium/medium list and every Darkwave medium-Complexity Energy list", () => {
    for (const profile of EXPECTED_R1_PROFILES) {
      for (const slot of profile.slots) {
        expect(
          buildArpWeightedCandidatesV2(
            ARP_GENRE_PROFILE_CONFIGURATION_V2,
            profile.profileId as never,
            slot.slot,
            "medium",
            "medium",
          ),
        ).toEqual(
          buildArpWeightedCandidatesV1(
            ARP_GENRE_PROFILE_CONFIGURATION_V1,
            profile.profileId as never,
            slot.slot,
            "medium",
            "medium",
          ),
        );
      }
    }

    const darkwave = EXPECTED_R1_PROFILES.find(({ profileId }) => profileId === "darkwave");
    if (darkwave === undefined) throw new Error("Missing Darkwave R1 fixture.");
    for (const slot of darkwave.slots) {
      for (const energy of LEVELS) {
        expect(
          buildArpWeightedCandidatesV2(
            ARP_GENRE_PROFILE_CONFIGURATION_V2,
            "darkwave",
            slot.slot,
            energy,
            "medium",
          ),
        ).toEqual(
          buildArpWeightedCandidatesV1(
            ARP_GENRE_PROFILE_CONFIGURATION_V1,
            "darkwave",
            slot.slot,
            energy,
            "medium",
          ),
        );
      }
    }
  });

  it("is deterministic, non-mutating, and consumes no random or selection input", () => {
    const input = mutableCanonicalV2();
    const before = structuredClone(input);
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is prohibited");
    });
    const next = vi.spyOn(prng, "nextMulberry32");
    const derive = vi.spyOn(componentSeed, "deriveComponentSeedV1");
    const select = vi.spyOn(weightedChoice, "selectWeightedCandidateV1");
    try {
      const first = buildArpWeightedCandidatesV2(
        input,
        "classic-synthwave",
        "direction",
        "very-high",
        "very-high",
      );
      const second = buildArpWeightedCandidatesV2(
        input,
        "classic-synthwave",
        "direction",
        "very-high",
        "very-high",
      );
      expect(first).toEqual([
        { value: "up", weight: 8 },
        { value: "up-down", weight: 9 },
        { value: "down-up", weight: 10 },
      ]);
      expect(second).toEqual(first);
      expect(second).not.toBe(first);
      expect(input).toEqual(before);
      expect(Object.isFrozen(input)).toBe(false);
      expect(random).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      expect(derive).not.toHaveBeenCalled();
      expect(select).not.toHaveBeenCalled();
    } finally {
      select.mockRestore();
      derive.mockRestore();
      next.mockRestore();
      random.mockRestore();
    }
  });
});

describe("Stage 7 V2 profile-data foundation Slice 1 validation", () => {
  it("validates canonical V2 data without mutating caller input", () => {
    const input = mutableCanonicalV2();
    const before = structuredClone(input);
    expect(validateArpGenreProfileConfigurationV2(input)).toBe(ARP_GENRE_PROFILE_CONFIGURATION_V2);
    expect(input).toEqual(before);
    expect(Object.isFrozen(input)).toBe(false);
  });

  it("uses canonical nested traversal rather than object property discovery order", () => {
    const canonical = mutableCanonicalV2();
    const reordered = {
      profiles: canonical.profiles.map((profile) => ({
        decisionSlots: profile.decisionSlots.map((slot) => ({
          complexityAdditions: slot.complexityAdditions,
          energyWeights: slot.energyWeights,
          candidates: slot.candidates,
          slot: slot.slot,
        })),
        profileId: profile.profileId,
      })),
      version: canonical.version,
    };
    expect(validateArpGenreProfileConfigurationV2(reordered)).toBe(
      ARP_GENRE_PROFILE_CONFIGURATION_V2,
    );
  });

  it("reuses the exact accepted error class, owner, and failure vocabulary", () => {
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV2(null),
      "INVALID_CONFIGURATION_SHAPE",
    );
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV2(ARP_GENRE_PROFILE_CONFIGURATION_V1),
      "INVALID_PROFILE_DATA_VERSION",
    );
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV1(ARP_GENRE_PROFILE_CONFIGURATION_V2),
      "INVALID_PROFILE_DATA_VERSION",
    );

    const wrongLiteral = mutableCanonicalV2() as unknown as {
      profiles: Array<{
        decisionSlots: Array<{ energyWeights: Array<{ values: number[] }> }>;
      }>;
    };
    const values = wrongLiteral.profiles[0]?.decisionSlots[0]?.energyWeights[0]?.values;
    if (values === undefined) throw new Error("Missing R1 literal fixture path.");
    values[0] = 6;
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV2(wrongLiteral),
      "INVALID_WEIGHT",
    );
  });

  it("rejects V2 shape, slot, candidate, and Complexity-table defects at their owning phase", () => {
    expectConfigurationError(
      () =>
        validateArpGenreProfileConfigurationV2({
          ...mutableCanonicalV2(),
          extra: true,
        }),
      "INVALID_CONFIGURATION_SHAPE",
    );

    const slots = mutableCanonicalV2() as unknown as {
      profiles: Array<{ decisionSlots: unknown[] }>;
    };
    slots.profiles[0]?.decisionSlots.pop();
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV2(slots),
      "INVALID_SLOT_STRUCTURE",
    );

    const candidates = mutableCanonicalV2() as unknown as {
      profiles: Array<{ decisionSlots: Array<{ candidates: unknown[] }> }>;
    };
    candidates.profiles[0]?.decisionSlots[0]?.candidates.reverse();
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV2(candidates),
      "INVALID_CANDIDATES",
    );

    const complexity = mutableCanonicalV2() as unknown as {
      profiles: Array<{ decisionSlots: Array<{ complexityAdditions: unknown[] }> }>;
    };
    complexity.profiles[0]?.decisionSlots[0]?.complexityAdditions.reverse();
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV2(complexity),
      "INVALID_COMPLEXITY_TABLE",
    );
  });

  it("keeps deterministic nested mixed-invalid precedence", () => {
    const versionBeforeProfiles = { version: "bad", profiles: [] };
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV2(versionBeforeProfiles),
      "INVALID_PROFILE_DATA_VERSION",
    );

    const profileBeforeSlot = mutableCanonicalV2() as unknown as {
      profiles: Array<{ profileId: string; decisionSlots: unknown[] }>;
    };
    const firstProfile = profileBeforeSlot.profiles[0];
    if (firstProfile === undefined) throw new Error("Missing V2 precedence fixture.");
    firstProfile.profileId = "darkwave";
    firstProfile.decisionSlots = [];
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV2(profileBeforeSlot),
      "INVALID_PROFILE_SET",
    );

    const candidateBeforeRows = mutableCanonicalV2() as unknown as {
      profiles: Array<{
        decisionSlots: Array<{
          candidates: unknown[];
          energyWeights: unknown[];
          complexityAdditions: unknown[];
        }>;
      }>;
    };
    const firstSlot = candidateBeforeRows.profiles[0]?.decisionSlots[0];
    if (firstSlot === undefined) throw new Error("Missing V2 precedence slot fixture.");
    firstSlot.candidates = [];
    firstSlot.energyWeights = [];
    firstSlot.complexityAdditions = [];
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV2(candidateBeforeRows),
      "INVALID_CANDIDATES",
    );

    const energyBeforeComplexity = mutableCanonicalV2() as unknown as {
      profiles: Array<{
        decisionSlots: Array<{
          energyWeights: unknown[];
          complexityAdditions: unknown[];
        }>;
      }>;
    };
    const mixedRows = energyBeforeComplexity.profiles[0]?.decisionSlots[0];
    if (mixedRows === undefined) throw new Error("Missing V2 row precedence fixture.");
    mixedRows.energyWeights = [];
    mixedRows.complexityAdditions = [];
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV2(energyBeforeComplexity),
      "INVALID_ENERGY_TABLE",
    );
  });

  it("checks vector alignment before exact numeric source equality", () => {
    const alignment = mutableCanonicalV2() as unknown as {
      profiles: Array<{
        decisionSlots: Array<{ energyWeights: Array<{ values: unknown[] }> }>;
      }>;
    };
    alignment.profiles[0]?.decisionSlots[0]?.energyWeights[0]?.values.pop();
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV2(alignment),
      "INVALID_VECTOR_ALIGNMENT",
    );

    const sourceNumber = mutableCanonicalV2() as unknown as {
      profiles: Array<{
        decisionSlots: Array<{ complexityAdditions: Array<{ values: unknown[] }> }>;
      }>;
    };
    const sourceValues = sourceNumber.profiles[0]?.decisionSlots[0]?.complexityAdditions[0]?.values;
    if (sourceValues === undefined) throw new Error("Missing V2 source-number fixture path.");
    sourceValues[0] = Number.NaN;
    expectConfigurationError(
      () => validateArpGenreProfileConfigurationV2(sourceNumber),
      "INVALID_WEIGHT",
    );
  });
});

describe("Stage 7C7a6 isolation and API boundary", () => {
  it("does not consult randomness, PRNG, component seeds, or weighted selection", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is prohibited");
    });
    const next = vi.spyOn(prng, "nextMulberry32");
    const derive = vi.spyOn(componentSeed, "deriveComponentSeedV1");
    const select = vi.spyOn(weightedChoice, "selectWeightedCandidateV1");
    try {
      expect(
        buildArpWeightedCandidatesV1(
          ARP_GENRE_PROFILE_CONFIGURATION_V1,
          "classic-synthwave",
          "direction",
          "medium",
          "high",
        ),
      ).toEqual([
        { value: "up", weight: 6 },
        { value: "up-down", weight: 5 },
        { value: "down-up", weight: 2 },
      ]);
      expect(random).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      expect(derive).not.toHaveBeenCalled();
      expect(select).not.toHaveBeenCalled();
    } finally {
      select.mockRestore();
      derive.mockRestore();
      next.mockRestore();
      random.mockRestore();
    }
  });

  it("contains no time, locale, network, AI, persistence, or discovery integration", () => {
    const source = readFileSync(
      new URL("./arpeggiator-profile-configuration.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("new Date");
    expect(source).not.toContain("Intl.");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("WebSocket");
    expect(source).not.toContain("navigator");
    expect(source).not.toContain("process.env");
    expect(source).not.toContain('from "./prng"');
    expect(source).not.toContain('from "./component-seed"');
    expect(source).not.toContain("selectWeightedCandidateV1");
  });

  it("exposes the public V2 identity without exposing profile-configuration internals", () => {
    expect(publicDomain).not.toHaveProperty("ARP_GENRE_PROFILE_CONFIGURATION_V1");
    expect(publicDomain).not.toHaveProperty("validateArpGenreProfileConfigurationV1");
    expect(publicDomain).not.toHaveProperty("buildArpWeightedCandidatesV1");
    expect(publicDomain).not.toHaveProperty("ArpGenreProfileConfigurationError");
    expect(publicDomain.ARP_PROFILE_DATA_VERSION_V2).toBe(ARP_PROFILE_DATA_VERSION_V2);
    expect(publicDomain).not.toHaveProperty("ARP_GENRE_PROFILE_CONFIGURATION_V2");
    expect(publicDomain).not.toHaveProperty("validateArpGenreProfileConfigurationV2");
    expect(publicDomain).not.toHaveProperty("buildArpWeightedCandidatesV2");

    const publicIndexSource = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
    expect(publicIndexSource).not.toContain("arpeggiator-profile-configuration");
  });
});
