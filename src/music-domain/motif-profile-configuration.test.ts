import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { COMPLEXITY_V1_VALUES, ENERGY_V1_VALUES } from "./composition-intent";
import { HARMONY_PROFILE_IDS } from "./harmony";
import * as publicDomain from "./index";
import {
  buildMotifWeightedCandidatesV1,
  MOTIF_GENRE_PROFILE_CONFIGURATION_V1,
  MOTIF_POLICY_DECISION_SLOTS_V1,
  MOTIF_PROFILE_DATA_VERSION_V1,
  MotifGenreProfileConfigurationError,
  motifCandidateDomainForSlotV1,
  validateMotifGenreProfileConfigurationV1,
} from "./motif-profile-configuration";
import * as prng from "./prng";

type MutableWeightRow = { level: string; values: number[] };
type MutableConfiguration = {
  version: string;
  extra?: boolean;
  profiles: Array<{
    profileId: string;
    decisionSlots: Array<{
      slot: string;
      candidates: string[];
      energyWeights: MutableWeightRow[];
      complexityAdditions: MutableWeightRow[];
    }>;
  }>;
};

function mutableClone(): MutableConfiguration {
  return structuredClone(MOTIF_GENRE_PROFILE_CONFIGURATION_V1) as unknown as MutableConfiguration;
}

describe("Stage 8 Motif V1 profile-data foundation", () => {
  it("freezes the exact identity, profile order, and four-slot order", () => {
    expect(MOTIF_PROFILE_DATA_VERSION_V1).toBe("nightdrive.genre-profile.motif.v1");
    expect(MOTIF_POLICY_DECISION_SLOTS_V1).toEqual([
      "rhythm",
      "register",
      "tension",
      "displacement",
    ]);
    expect(MOTIF_GENRE_PROFILE_CONFIGURATION_V1.profiles.map(({ profileId }) => profileId)).toEqual(
      ["dark-synthwave", "classic-synthwave", "darkwave", "midtempo-cyberpunk"],
    );
    for (const profile of MOTIF_GENRE_PROFILE_CONFIGURATION_V1.profiles) {
      expect(profile.decisionSlots.map(({ slot }) => slot)).toEqual(MOTIF_POLICY_DECISION_SLOTS_V1);
    }
  });

  it("recursively freezes all accepted literal data", () => {
    const visit = (value: unknown): void => {
      if (typeof value !== "object" || value === null) return;
      expect(Object.isFrozen(value)).toBe(true);
      for (const child of Object.values(value)) visit(child);
    };
    visit(MOTIF_GENRE_PROFILE_CONFIGURATION_V1);
    expect(
      Reflect.set(
        MOTIF_GENRE_PROFILE_CONFIGURATION_V1.profiles[0].decisionSlots[0].candidates,
        0,
        "active-8",
      ),
    ).toBe(false);
  });

  it("preserves every accepted candidate order and all 400 Energy/Complexity constructions", () => {
    let combinations = 0;
    for (const profile of MOTIF_GENRE_PROFILE_CONFIGURATION_V1.profiles) {
      for (const slot of profile.decisionSlots) {
        expect(
          slot.candidates.every((candidate) =>
            motifCandidateDomainForSlotV1(slot.slot).includes(candidate),
          ),
        ).toBe(true);
        for (const energy of ENERGY_V1_VALUES) {
          for (const complexity of COMPLEXITY_V1_VALUES) {
            const result = buildMotifWeightedCandidatesV1(
              MOTIF_GENRE_PROFILE_CONFIGURATION_V1,
              profile.profileId,
              slot.slot,
              energy,
              complexity,
            );
            const energyValues = slot.energyWeights.find((row) => row.level === energy)?.values;
            const complexityValues = slot.complexityAdditions.find(
              (row) => row.level === complexity,
            )?.values;
            if (energyValues === undefined || complexityValues === undefined) {
              throw new Error("accepted profile row invariant failed");
            }
            expect(result).toEqual(
              slot.candidates.map((value, index) => ({
                value,
                weight: energyValues[index] + complexityValues[index],
              })),
            );
            expect(Object.isFrozen(result)).toBe(true);
            expect(result.every(Object.isFrozen)).toBe(true);
            combinations += 1;
          }
        }
      }
    }
    expect(combinations).toBe(400);
  });

  it("matches representative contract literals for all four profiles", () => {
    const [darkSynthwave, classicSynthwave, darkwave, midtempoCyberpunk] =
      MOTIF_GENRE_PROFILE_CONFIGURATION_V1.profiles;
    expect(darkSynthwave.decisionSlots[0].energyWeights.map((row) => row.values)).toEqual([
      [6, 3, 1],
      [5, 4, 1],
      [3, 6, 3],
      [2, 5, 6],
      [1, 3, 8],
    ]);
    expect(darkSynthwave.decisionSlots[3].candidates).toEqual(["none", "later-480", "earlier-480"]);
    expect(classicSynthwave.decisionSlots[2].complexityAdditions.map((row) => row.values)).toEqual([
      [2, 0],
      [1, 0],
      [0, 0],
      [0, 2],
      [0, 3],
    ]);
    expect(darkwave.decisionSlots[1].candidates).toEqual(["lower", "middle"]);
    expect(darkwave.decisionSlots[3].complexityAdditions.map((row) => row.values)).toEqual([
      [2, 0, 0],
      [1, 0, 0],
      [0, 0, 0],
      [0, 2, 1],
      [0, 3, 2],
    ]);
    expect(midtempoCyberpunk.decisionSlots[1].energyWeights.map((row) => row.values)).toEqual([
      [5, 5, 2],
      [4, 6, 2],
      [3, 7, 3],
      [2, 7, 5],
      [1, 6, 7],
    ]);
    expect(midtempoCyberpunk.decisionSlots[3].energyWeights[0].values).toEqual([4, 4, 3]);
  });

  it("locks every ordered profile, candidate, Energy, and Complexity literal independently", () => {
    const digest = createHash("sha256")
      .update(JSON.stringify(MOTIF_GENRE_PROFILE_CONFIGURATION_V1), "utf8")
      .digest("hex");
    expect(digest).toBe("108a16f349dc055cfb3428abc608a7e5642313e39363e9411e80f6002aa5c819");
  });

  it.each([
    [
      "INVALID_CONFIGURATION_SHAPE",
      (data: MutableConfiguration) => {
        data.extra = true;
      },
    ],
    [
      "INVALID_PROFILE_DATA_VERSION",
      (data: MutableConfiguration) => {
        data.version = "v2";
      },
    ],
    [
      "INVALID_PROFILE_SET",
      (data: MutableConfiguration) => {
        data.profiles.reverse();
      },
    ],
    [
      "INVALID_SLOT_STRUCTURE",
      (data: MutableConfiguration) => {
        data.profiles[0].decisionSlots.reverse();
      },
    ],
    [
      "INVALID_CANDIDATES",
      (data: MutableConfiguration) => {
        data.profiles[0].decisionSlots[0].candidates.reverse();
      },
    ],
    [
      "INVALID_ENERGY_TABLE",
      (data: MutableConfiguration) => {
        data.profiles[0].decisionSlots[0].energyWeights[0].level = "low";
      },
    ],
    [
      "INVALID_COMPLEXITY_TABLE",
      (data: MutableConfiguration) => {
        data.profiles[0].decisionSlots[0].complexityAdditions[0].values[0] = 1;
      },
    ],
    [
      "INVALID_VECTOR_ALIGNMENT",
      (data: MutableConfiguration) => {
        data.profiles[0].decisionSlots[0].energyWeights[0].values.pop();
      },
    ],
    [
      "INVALID_WEIGHT",
      (data: MutableConfiguration) => {
        data.profiles[0].decisionSlots[0].energyWeights[0].values[0] = 1.5;
      },
    ],
  ] as const)("fails closed with %s for mutated accepted data", (kind, mutate) => {
    const data = mutableClone();
    mutate(data);
    try {
      validateMotifGenreProfileConfigurationV1(data);
      throw new Error("expected validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(MotifGenreProfileConfigurationError);
      expect((error as MotifGenreProfileConfigurationError).kind).toBe(kind);
      expect((error as MotifGenreProfileConfigurationError).owner).toBe("profile.version");
    }
  });

  it("fails closed for unknown lookup inputs without fallback", () => {
    expect(() =>
      buildMotifWeightedCandidatesV1(
        MOTIF_GENRE_PROFILE_CONFIGURATION_V1,
        "unknown" as never,
        "rhythm",
        "medium",
        "medium",
      ),
    ).toThrow("unknown profile ID");
    expect(() =>
      buildMotifWeightedCandidatesV1(
        MOTIF_GENRE_PROFILE_CONFIGURATION_V1,
        HARMONY_PROFILE_IDS.darkSynthwave,
        "unknown" as never,
        "medium",
        "medium",
      ),
    ).toThrow("unknown decision slot");
    expect(() =>
      buildMotifWeightedCandidatesV1(
        MOTIF_GENRE_PROFILE_CONFIGURATION_V1,
        HARMONY_PROFILE_IDS.darkSynthwave,
        "rhythm",
        "unknown" as never,
        "medium",
      ),
    ).toThrow("unknown Energy value");
    expect(() =>
      buildMotifWeightedCandidatesV1(
        MOTIF_GENRE_PROFILE_CONFIGURATION_V1,
        HARMONY_PROFILE_IDS.darkSynthwave,
        "rhythm",
        "medium",
        "unknown" as never,
      ),
    ).toThrow("unknown Complexity value");
    expect(() => motifCandidateDomainForSlotV1("unknown" as never)).toThrow(
      "unknown decision slot",
    );
  });

  it("rejects accessor-backed fields and never constructs from caller-owned values", () => {
    const data = mutableClone();
    let reads = 0;
    const canonicalCandidates = [...data.profiles[0].decisionSlots[0].candidates];
    Object.defineProperty(data.profiles[0].decisionSlots[0], "candidates", {
      enumerable: true,
      configurable: true,
      get: () => {
        reads += 1;
        return reads === 1 ? canonicalCandidates : ["active-8"];
      },
    });

    expect(() =>
      buildMotifWeightedCandidatesV1(
        data as unknown as typeof MOTIF_GENRE_PROFILE_CONFIGURATION_V1,
        HARMONY_PROFILE_IDS.darkSynthwave,
        "rhythm",
        "medium",
        "medium",
      ),
    ).toThrow(MotifGenreProfileConfigurationError);
    expect(reads).toBe(0);
  });

  it("rejects accessor-backed array elements without reading them", () => {
    const data = mutableClone();
    let reads = 0;
    Object.defineProperty(data.profiles[0].decisionSlots[0].candidates, "0", {
      enumerable: true,
      configurable: true,
      get: () => {
        reads += 1;
        return "sparse-4";
      },
    });

    expect(() => validateMotifGenreProfileConfigurationV1(data)).toThrow(
      MotifGenreProfileConfigurationError,
    );
    expect(reads).toBe(0);
  });

  it("constructs data without PRNG or selection and remains internal", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness prohibited");
    });
    const next = vi.spyOn(prng, "nextMulberry32");
    try {
      buildMotifWeightedCandidatesV1(
        MOTIF_GENRE_PROFILE_CONFIGURATION_V1,
        HARMONY_PROFILE_IDS.darkSynthwave,
        "rhythm",
        "medium",
        "medium",
      );
      expect(random).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    } finally {
      next.mockRestore();
      random.mockRestore();
    }
    expect(publicDomain).not.toHaveProperty("MOTIF_GENRE_PROFILE_CONFIGURATION_V1");
    expect(publicDomain).not.toHaveProperty("buildMotifWeightedCandidatesV1");
    expect(readFileSync("src/music-domain/motif-profile-configuration.ts", "utf8")).not.toContain(
      "selectWeightedCandidateV1",
    );
  });
});
