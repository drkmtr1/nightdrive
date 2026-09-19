// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { ArpValueError } from "./arpeggiator";
import {
  ARP_DENSITY_MASK_CATALOG_VERSION_V1,
  ARP_GATE_ID_V1_VALUES,
  ARP_OCTAVE_RANGE_V1_VALUES,
  ARP_POLICY_DECISION_SLOT_V1_VALUES,
  ARP_POLICY_VERSION_V1,
  ARP_POLICY_VERSION_V2,
  ARP_PROFILE_DATA_VERSION_V1,
  ARP_PROFILE_DATA_VERSION_V2,
  ARP_WEIGHTED_CHOICE_VERSION_V1,
  SHARED_ARP_POLICY_CONFIGURATION_V1,
  SHARED_ARP_POLICY_CONFIGURATION_V2,
  SharedArpPolicyConfigurationError,
  type SharedArpPolicyConfigurationFailureKindV1,
  validateSharedArpPolicyConfigurationV1,
  validateSharedArpPolicyConfigurationV2,
} from "./arpeggiator-policy-configuration";
import { ARP_PROFILE_DATA_VERSION_V2 as PROFILE_MODULE_DATA_VERSION_V2 } from "./arpeggiator-profile-configuration";
import * as componentSeed from "./component-seed";
import { CompositionIntentValueError } from "./composition-intent";
import * as musicDomain from "./index";
import * as prng from "./prng";
import * as weightedChoice from "./weighted-choice";

function mutableCanonicalConfiguration(): Record<string, unknown> {
  return {
    version: ARP_POLICY_VERSION_V1,
    compatibleProfileDataVersion: ARP_PROFILE_DATA_VERSION_V1,
    decisionSlots: [...ARP_POLICY_DECISION_SLOT_V1_VALUES],
    weightedChoiceVersion: ARP_WEIGHTED_CHOICE_VERSION_V1,
    densityMaskCatalogVersion: ARP_DENSITY_MASK_CATALOG_VERSION_V1,
    octaveRanges: [...ARP_OCTAVE_RANGE_V1_VALUES],
    gateIds: [...ARP_GATE_ID_V1_VALUES],
    gateTicksByRate: {
      quarter: { short: 480, medium: 720, long: 960 },
      eighth: { short: 240, medium: 360, long: 480 },
      sixteenth: { short: 120, medium: 180, long: 240 },
    },
  };
}

function mutableCanonicalV2Configuration(): Record<string, unknown> {
  return {
    ...mutableCanonicalConfiguration(),
    version: ARP_POLICY_VERSION_V2,
    compatibleProfileDataVersion: ARP_PROFILE_DATA_VERSION_V2,
  };
}

type SharedArpPolicyConfigurationValidator = (value: unknown) => unknown;

function expectFailure(
  value: unknown,
  kind: SharedArpPolicyConfigurationFailureKindV1,
  validate: SharedArpPolicyConfigurationValidator = validateSharedArpPolicyConfigurationV1,
): SharedArpPolicyConfigurationError {
  try {
    validate(value);
    throw new Error("Expected SharedArpPolicyConfigurationError.");
  } catch (error) {
    expect(error).toBeInstanceOf(SharedArpPolicyConfigurationError);
    expect(error).not.toBeInstanceOf(ArpValueError);
    expect(error).not.toBeInstanceOf(CompositionIntentValueError);
    expect(error).toMatchObject({ kind, owner: "policy.version" });
    expect(error).not.toHaveProperty("value");
    expect(error).not.toHaveProperty("input");
    return error as SharedArpPolicyConfigurationError;
  }
}

function expectRecursivelyFrozen(value: unknown): void {
  if (typeof value !== "object" || value === null) return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectRecursivelyFrozen(nested);
}

describe("Stage 7C7a5 shared Arpeggiator policy configuration", () => {
  it("locks exact identities, closed domains, decision order, and all gate mappings", () => {
    expect(ARP_POLICY_VERSION_V1).toBe("nightdrive.arpeggiator-policy.v1");
    expect(ARP_PROFILE_DATA_VERSION_V1).toBe("nightdrive.genre-profile.arpeggiator.v1");
    expect(ARP_WEIGHTED_CHOICE_VERSION_V1).toBe("nightdrive.weighted-choice.uint32-modulo.v1");
    expect(ARP_DENSITY_MASK_CATALOG_VERSION_V1).toBe("nightdrive.arp-density-mask.v1");
    expect(ARP_OCTAVE_RANGE_V1_VALUES).toEqual([1, 2, 3]);
    expect(ARP_GATE_ID_V1_VALUES).toEqual(["short", "medium", "long"]);
    expect(ARP_POLICY_DECISION_SLOT_V1_VALUES).toEqual([
      "rate",
      "octave-range",
      "direction",
      "mask",
      "gate",
    ]);
    expect(SHARED_ARP_POLICY_CONFIGURATION_V1.gateTicksByRate).toEqual({
      quarter: { short: 480, medium: 720, long: 960 },
      eighth: { short: 240, medium: 360, long: 480 },
      sixteenth: { short: 120, medium: 180, long: 240 },
    });
    for (const [rate, rateTicks] of [
      ["quarter", 960],
      ["eighth", 480],
      ["sixteenth", 240],
    ] as const) {
      const mapping = SHARED_ARP_POLICY_CONFIGURATION_V1.gateTicksByRate[rate];
      for (const gateTicks of Object.values(mapping)) {
        expect(Number.isSafeInteger(gateTicks)).toBe(true);
        expect(gateTicks).toBeGreaterThanOrEqual(1);
        expect(gateTicks).toBeLessThanOrEqual(rateTicks);
      }
      expect(mapping.long).toBe(rateTicks);
    }
  });

  it("is recursively immutable and resists mutation of later reads", () => {
    expectRecursivelyFrozen(SHARED_ARP_POLICY_CONFIGURATION_V1);
    expect(
      Reflect.set(SHARED_ARP_POLICY_CONFIGURATION_V1.gateTicksByRate.quarter, "short", 1),
    ).toBe(false);
    expect(Reflect.set(ARP_POLICY_DECISION_SLOT_V1_VALUES, "0", "gate")).toBe(false);
    expect(SHARED_ARP_POLICY_CONFIGURATION_V1.gateTicksByRate.quarter.short).toBe(480);
    expect(SHARED_ARP_POLICY_CONFIGURATION_V1.decisionSlots[0]).toBe("rate");
  });

  it("validates structurally equal input without mutation and returns the canonical reference", () => {
    const input = mutableCanonicalConfiguration();
    const before = structuredClone(input);
    expect(validateSharedArpPolicyConfigurationV1(input)).toBe(SHARED_ARP_POLICY_CONFIGURATION_V1);
    expect(input).toEqual(before);
    expect(Object.isFrozen(input)).toBe(false);
    expect(validateSharedArpPolicyConfigurationV1(input)).toBe(
      validateSharedArpPolicyConfigurationV1(input),
    );
  });

  it.each([null, [], new Date(), {}, { ...mutableCanonicalConfiguration(), extra: true }])(
    "rejects invalid top-level shape %#",
    (value) => {
      expectFailure(value, "INVALID_CONFIGURATION_SHAPE");
    },
  );

  it("rejects each identity at its exact precedence boundary", () => {
    const policy = mutableCanonicalConfiguration();
    policy.version = "wrong";
    policy.compatibleProfileDataVersion = "wrong";
    expectFailure(policy, "INVALID_POLICY_VERSION");

    const profile = mutableCanonicalConfiguration();
    profile.compatibleProfileDataVersion = "wrong";
    profile.decisionSlots = [];
    expectFailure(profile, "INCOMPATIBLE_PROFILE_DATA_VERSION");

    const weighted = mutableCanonicalConfiguration();
    weighted.weightedChoiceVersion = "wrong";
    weighted.densityMaskCatalogVersion = "wrong";
    expectFailure(weighted, "INVALID_WEIGHTED_CHOICE_VERSION");

    const mask = mutableCanonicalConfiguration();
    mask.densityMaskCatalogVersion = "wrong";
    mask.octaveRanges = [];
    expectFailure(mask, "INVALID_DENSITY_MASK_CATALOG_VERSION");
  });

  it.each([
    [["rate", "octave-range", "direction", "mask"], "INVALID_DECISION_SLOTS"],
    [["rate", "octave-range", "direction", "mask", "gate", "rate"], "INVALID_DECISION_SLOTS"],
    [["gate", "octave-range", "direction", "mask", "rate"], "INVALID_DECISION_SLOTS"],
    [["rate", "rate", "direction", "mask", "gate"], "INVALID_DECISION_SLOTS"],
    [[1, 2], "INVALID_OCTAVE_RANGES"],
    [[1, 2, 3, 4], "INVALID_OCTAVE_RANGES"],
    [[1, 3, 2], "INVALID_OCTAVE_RANGES"],
    [[1, 2, 2], "INVALID_OCTAVE_RANGES"],
    [["1", 2, 3], "INVALID_OCTAVE_RANGES"],
    [["short", "medium"], "INVALID_GATE_IDS"],
    [["short", "medium", "long", "short"], "INVALID_GATE_IDS"],
    [["long", "medium", "short"], "INVALID_GATE_IDS"],
    [["short", "medium", "medium"], "INVALID_GATE_IDS"],
    [["short", "medium", 1], "INVALID_GATE_IDS"],
  ] as const)("rejects malformed canonical tuple %#", (tuple, kind) => {
    const input = mutableCanonicalConfiguration();
    if (kind === "INVALID_DECISION_SLOTS") input.decisionSlots = [...tuple];
    if (kind === "INVALID_OCTAVE_RANGES") input.octaveRanges = [...tuple];
    if (kind === "INVALID_GATE_IDS") input.gateIds = [...tuple];
    expectFailure(input, kind);
  });

  it.each([
    ["quarter", "short", 0],
    ["quarter", "short", 1.5],
    ["quarter", "short", Number.NaN],
    ["quarter", "short", Number.POSITIVE_INFINITY],
    ["quarter", "short", Number.NEGATIVE_INFINITY],
    ["quarter", "short", Number.MAX_SAFE_INTEGER + 1],
    ["quarter", "short", -1],
    ["quarter", "long", 961],
    ["eighth", "medium", 359],
    ["sixteenth", "long", 239],
    ["sixteenth", "short", "120"],
  ])("rejects noncanonical gate mapping %s.%s = %s", (rate, gate, value) => {
    const input = mutableCanonicalConfiguration();
    const mappings = input.gateTicksByRate as Record<string, Record<string, unknown>>;
    const mapping = mappings[rate];
    if (mapping === undefined) throw new Error(`Missing test mapping for ${rate}.`);
    mapping[gate] = value;
    expectFailure(input, "INVALID_GATE_MAPPINGS");
  });

  it("rejects missing and extra rate or gate mappings", () => {
    const missingRate = mutableCanonicalConfiguration();
    delete (missingRate.gateTicksByRate as Record<string, unknown>).eighth;
    expectFailure(missingRate, "INVALID_GATE_MAPPINGS");

    const extraRate = mutableCanonicalConfiguration();
    (extraRate.gateTicksByRate as Record<string, unknown>).half = {};
    expectFailure(extraRate, "INVALID_GATE_MAPPINGS");

    const missingGate = mutableCanonicalConfiguration();
    const missingGateMappings = missingGate.gateTicksByRate as Record<
      string,
      Record<string, unknown>
    >;
    const quarterWithMissingGate = missingGateMappings.quarter;
    if (quarterWithMissingGate === undefined) throw new Error("Missing test quarter mapping.");
    delete quarterWithMissingGate.medium;
    expectFailure(missingGate, "INVALID_GATE_MAPPINGS");

    const extraGate = mutableCanonicalConfiguration();
    const extraGateMappings = extraGate.gateTicksByRate as Record<string, Record<string, unknown>>;
    const quarterWithExtraGate = extraGateMappings.quarter;
    if (quarterWithExtraGate === undefined) throw new Error("Missing test quarter mapping.");
    quarterWithExtraGate.extra = 1;
    expectFailure(extraGate, "INVALID_GATE_MAPPINGS");
  });

  it("uses deterministic precedence without ambient randomness, PRNG, or weighted selection", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness must not be used");
    });
    const next = vi.spyOn(prng, "nextMulberry32");
    const select = vi.spyOn(weightedChoice, "selectWeightedCandidateV1");
    try {
      const input = mutableCanonicalConfiguration();
      input.decisionSlots = [];
      input.weightedChoiceVersion = "wrong";
      expectFailure(input, "INVALID_DECISION_SLOTS");
      expectFailure(input, "INVALID_DECISION_SLOTS");
      expect(random).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      expect(select).not.toHaveBeenCalled();
    } finally {
      select.mockRestore();
      next.mockRestore();
      random.mockRestore();
    }
  });

  it("preserves the complete direct validation precedence", () => {
    const shape = mutableCanonicalConfiguration();
    shape.version = "wrong";
    shape.extra = true;
    expectFailure(shape, "INVALID_CONFIGURATION_SHAPE");

    const octaveBeforeGate = mutableCanonicalConfiguration();
    octaveBeforeGate.octaveRanges = [];
    octaveBeforeGate.gateIds = [];
    expectFailure(octaveBeforeGate, "INVALID_OCTAVE_RANGES");

    const gateBeforeMappings = mutableCanonicalConfiguration();
    gateBeforeMappings.gateIds = [];
    gateBeforeMappings.gateTicksByRate = {};
    expectFailure(gateBeforeMappings, "INVALID_GATE_IDS");
  });

  it("checks gate mappings in quarter/eighth/sixteenth and short/medium/long order", () => {
    const rates = mutableCanonicalConfiguration();
    const rateMappings = rates.gateTicksByRate as Record<string, Record<string, unknown>>;
    const quarter = rateMappings.quarter;
    const eighth = rateMappings.eighth;
    if (quarter === undefined || eighth === undefined) throw new Error("Missing test mappings.");
    quarter.short = 479;
    eighth.short = 239;
    expect(expectFailure(rates, "INVALID_GATE_MAPPINGS").message).toContain("quarter.short");

    const gates = mutableCanonicalConfiguration();
    const gateMappings = gates.gateTicksByRate as Record<string, Record<string, unknown>>;
    const gateQuarter = gateMappings.quarter;
    if (gateQuarter === undefined) throw new Error("Missing test quarter mapping.");
    gateQuarter.short = 479;
    gateQuarter.medium = 719;
    expect(expectFailure(gates, "INVALID_GATE_MAPPINGS").message).toContain("quarter.short");
  });

  it("keeps the shared configuration boundary out of the public music-domain barrel", () => {
    expect(musicDomain.ARP_POLICY_VERSION_V1).toBe(ARP_POLICY_VERSION_V1);
    expect(musicDomain.ARP_POLICY_VERSION_V2).toBe(ARP_POLICY_VERSION_V2);
    expect(musicDomain.ARP_PROFILE_DATA_VERSION_V2).toBe(ARP_PROFILE_DATA_VERSION_V2);
    expect(musicDomain).not.toHaveProperty("SHARED_ARP_POLICY_CONFIGURATION_V1");
    expect(musicDomain).not.toHaveProperty("SHARED_ARP_POLICY_CONFIGURATION_V2");
    expect(musicDomain).not.toHaveProperty("validateSharedArpPolicyConfigurationV1");
    expect(musicDomain).not.toHaveProperty("validateSharedArpPolicyConfigurationV2");
    expect(musicDomain).not.toHaveProperty("SharedArpPolicyConfigurationError");

    const publicIndexSource = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
    expect(publicIndexSource).not.toContain("arpeggiator-policy-configuration");
    expect(publicIndexSource).toContain("ARP_POLICY_VERSION_V2");
    expect(publicIndexSource).toContain("ArpPolicyVersionV2");
    expect(publicIndexSource).toContain("ARP_PROFILE_DATA_VERSION_V2");
    expect(publicIndexSource).toContain("ArpProfileDataVersionV2");
    expect(publicIndexSource).not.toContain("SHARED_ARP_POLICY_CONFIGURATION_V2");
    expect(publicIndexSource).not.toContain("SharedArpPolicyConfigurationV2");
    expect(publicIndexSource).not.toContain("validateSharedArpPolicyConfigurationV2");
  });
});

describe("Stage 7 V2 shared Arpeggiator policy configuration foundation", () => {
  it("owns the exact V2 identities and pairs policy V2 only with profile-data V2", () => {
    expect(ARP_POLICY_VERSION_V2).toBe("nightdrive.arpeggiator-policy.v2");
    expect(ARP_PROFILE_DATA_VERSION_V2).toBe("nightdrive.genre-profile.arpeggiator.v2");
    expect(PROFILE_MODULE_DATA_VERSION_V2).toBe(ARP_PROFILE_DATA_VERSION_V2);
    expect(SHARED_ARP_POLICY_CONFIGURATION_V2).toMatchObject({
      version: ARP_POLICY_VERSION_V2,
      compatibleProfileDataVersion: ARP_PROFILE_DATA_VERSION_V2,
    });
    expect(SHARED_ARP_POLICY_CONFIGURATION_V1).toMatchObject({
      version: ARP_POLICY_VERSION_V1,
      compatibleProfileDataVersion: ARP_PROFILE_DATA_VERSION_V1,
    });

    const policySource = readFileSync(
      new URL("./arpeggiator-policy-configuration.ts", import.meta.url),
      "utf8",
    );
    const profileSource = readFileSync(
      new URL("./arpeggiator-profile-configuration.ts", import.meta.url),
      "utf8",
    );
    expect(policySource.match(/nightdrive\.genre-profile\.arpeggiator\.v2/g)).toHaveLength(1);
    expect(profileSource).not.toContain("nightdrive.genre-profile.arpeggiator.v2");
  });

  it("preserves every accepted V1 policy mechanic without adding a new algorithm", () => {
    expect(SHARED_ARP_POLICY_CONFIGURATION_V2).not.toBe(SHARED_ARP_POLICY_CONFIGURATION_V1);
    expect(SHARED_ARP_POLICY_CONFIGURATION_V2.decisionSlots).toEqual(
      SHARED_ARP_POLICY_CONFIGURATION_V1.decisionSlots,
    );
    expect(SHARED_ARP_POLICY_CONFIGURATION_V2.decisionSlots).toEqual([
      "rate",
      "octave-range",
      "direction",
      "mask",
      "gate",
    ]);
    expect(SHARED_ARP_POLICY_CONFIGURATION_V2.weightedChoiceVersion).toEqual(
      SHARED_ARP_POLICY_CONFIGURATION_V1.weightedChoiceVersion,
    );
    expect(SHARED_ARP_POLICY_CONFIGURATION_V2.densityMaskCatalogVersion).toEqual(
      SHARED_ARP_POLICY_CONFIGURATION_V1.densityMaskCatalogVersion,
    );
    expect(SHARED_ARP_POLICY_CONFIGURATION_V2.octaveRanges).toEqual(
      SHARED_ARP_POLICY_CONFIGURATION_V1.octaveRanges,
    );
    expect(SHARED_ARP_POLICY_CONFIGURATION_V2.octaveRanges).toEqual([1, 2, 3]);
    expect(SHARED_ARP_POLICY_CONFIGURATION_V2.gateIds).toEqual(
      SHARED_ARP_POLICY_CONFIGURATION_V1.gateIds,
    );
    expect(SHARED_ARP_POLICY_CONFIGURATION_V2.gateIds).toEqual(["short", "medium", "long"]);
    expect(SHARED_ARP_POLICY_CONFIGURATION_V2.gateTicksByRate).toEqual(
      SHARED_ARP_POLICY_CONFIGURATION_V1.gateTicksByRate,
    );
    expect(SHARED_ARP_POLICY_CONFIGURATION_V2.gateTicksByRate).toEqual({
      quarter: { short: 480, medium: 720, long: 960 },
      eighth: { short: 240, medium: 360, long: 480 },
      sixteenth: { short: 120, medium: 180, long: 240 },
    });
  });

  it("keeps V1 and V2 validation isolated and rejects both unsupported cross-pairs", () => {
    expect(validateSharedArpPolicyConfigurationV1(SHARED_ARP_POLICY_CONFIGURATION_V1)).toBe(
      SHARED_ARP_POLICY_CONFIGURATION_V1,
    );
    expect(validateSharedArpPolicyConfigurationV2(SHARED_ARP_POLICY_CONFIGURATION_V2)).toBe(
      SHARED_ARP_POLICY_CONFIGURATION_V2,
    );
    expectFailure(SHARED_ARP_POLICY_CONFIGURATION_V2, "INVALID_POLICY_VERSION");
    expectFailure(
      SHARED_ARP_POLICY_CONFIGURATION_V1,
      "INVALID_POLICY_VERSION",
      validateSharedArpPolicyConfigurationV2,
    );

    const v1PolicyWithV2Profile = mutableCanonicalConfiguration();
    v1PolicyWithV2Profile.compatibleProfileDataVersion = ARP_PROFILE_DATA_VERSION_V2;
    expectFailure(v1PolicyWithV2Profile, "INCOMPATIBLE_PROFILE_DATA_VERSION");

    const v2PolicyWithV1Profile = mutableCanonicalV2Configuration();
    v2PolicyWithV1Profile.compatibleProfileDataVersion = ARP_PROFILE_DATA_VERSION_V1;
    expectFailure(
      v2PolicyWithV1Profile,
      "INCOMPATIBLE_PROFILE_DATA_VERSION",
      validateSharedArpPolicyConfigurationV2,
    );
  });

  it("validates V2 deterministically without mutation or property-discovery ordering", () => {
    const canonical = mutableCanonicalV2Configuration();
    const gateTicksByRate = canonical.gateTicksByRate as Record<string, Record<string, unknown>>;
    const reordered = {
      gateTicksByRate: {
        sixteenth: {
          long: gateTicksByRate.sixteenth?.long,
          medium: gateTicksByRate.sixteenth?.medium,
          short: gateTicksByRate.sixteenth?.short,
        },
        eighth: {
          long: gateTicksByRate.eighth?.long,
          medium: gateTicksByRate.eighth?.medium,
          short: gateTicksByRate.eighth?.short,
        },
        quarter: {
          long: gateTicksByRate.quarter?.long,
          medium: gateTicksByRate.quarter?.medium,
          short: gateTicksByRate.quarter?.short,
        },
      },
      gateIds: canonical.gateIds,
      octaveRanges: canonical.octaveRanges,
      densityMaskCatalogVersion: canonical.densityMaskCatalogVersion,
      weightedChoiceVersion: canonical.weightedChoiceVersion,
      decisionSlots: canonical.decisionSlots,
      compatibleProfileDataVersion: canonical.compatibleProfileDataVersion,
      version: canonical.version,
    };
    const before = structuredClone(reordered);

    expect(validateSharedArpPolicyConfigurationV2(reordered)).toBe(
      SHARED_ARP_POLICY_CONFIGURATION_V2,
    );
    expect(validateSharedArpPolicyConfigurationV2(reordered)).toBe(
      validateSharedArpPolicyConfigurationV2(reordered),
    );
    expect(reordered).toEqual(before);
    expect(Object.isFrozen(reordered)).toBe(false);
  });

  it("preserves the complete V2 failure vocabulary, messages, and validation precedence", () => {
    const shape = mutableCanonicalV2Configuration();
    shape.version = "wrong";
    shape.extra = true;
    expectFailure(shape, "INVALID_CONFIGURATION_SHAPE", validateSharedArpPolicyConfigurationV2);

    const policy = mutableCanonicalV2Configuration();
    policy.version = "wrong";
    policy.compatibleProfileDataVersion = "wrong";
    expectFailure(policy, "INVALID_POLICY_VERSION", validateSharedArpPolicyConfigurationV2);

    const profile = mutableCanonicalV2Configuration();
    profile.compatibleProfileDataVersion = "wrong";
    profile.decisionSlots = [];
    expectFailure(
      profile,
      "INCOMPATIBLE_PROFILE_DATA_VERSION",
      validateSharedArpPolicyConfigurationV2,
    );

    const schedule = mutableCanonicalV2Configuration();
    schedule.decisionSlots = [];
    schedule.weightedChoiceVersion = "wrong";
    expectFailure(schedule, "INVALID_DECISION_SLOTS", validateSharedArpPolicyConfigurationV2);

    const weighted = mutableCanonicalV2Configuration();
    weighted.weightedChoiceVersion = "wrong";
    weighted.densityMaskCatalogVersion = "wrong";
    expectFailure(
      weighted,
      "INVALID_WEIGHTED_CHOICE_VERSION",
      validateSharedArpPolicyConfigurationV2,
    );

    const mask = mutableCanonicalV2Configuration();
    mask.densityMaskCatalogVersion = "wrong";
    mask.octaveRanges = [];
    expectFailure(
      mask,
      "INVALID_DENSITY_MASK_CATALOG_VERSION",
      validateSharedArpPolicyConfigurationV2,
    );

    const octave = mutableCanonicalV2Configuration();
    octave.octaveRanges = [];
    octave.gateIds = [];
    expectFailure(octave, "INVALID_OCTAVE_RANGES", validateSharedArpPolicyConfigurationV2);

    const gate = mutableCanonicalV2Configuration();
    gate.gateIds = [];
    gate.gateTicksByRate = {};
    expectFailure(gate, "INVALID_GATE_IDS", validateSharedArpPolicyConfigurationV2);

    const mappings = mutableCanonicalV2Configuration();
    const rates = mappings.gateTicksByRate as Record<string, Record<string, unknown>>;
    const quarter = rates.quarter;
    const eighth = rates.eighth;
    if (quarter === undefined || eighth === undefined) throw new Error("Missing test mappings.");
    quarter.short = 479;
    eighth.short = 239;
    expect(
      expectFailure(mappings, "INVALID_GATE_MAPPINGS", validateSharedArpPolicyConfigurationV2)
        .message,
    ).toContain("quarter.short");
  });

  it("is recursively immutable, mutation-resistant, and stable across repeated reads", () => {
    expectRecursivelyFrozen(SHARED_ARP_POLICY_CONFIGURATION_V2);
    expect(Reflect.set(SHARED_ARP_POLICY_CONFIGURATION_V2, "version", "wrong")).toBe(false);
    expect(
      Reflect.set(SHARED_ARP_POLICY_CONFIGURATION_V2.gateTicksByRate.quarter, "short", 1),
    ).toBe(false);
    expect(SHARED_ARP_POLICY_CONFIGURATION_V2.version).toBe(ARP_POLICY_VERSION_V2);
    expect(SHARED_ARP_POLICY_CONFIGURATION_V2.gateTicksByRate.quarter.short).toBe(480);
    expect(validateSharedArpPolicyConfigurationV2(mutableCanonicalV2Configuration())).toBe(
      SHARED_ARP_POLICY_CONFIGURATION_V2,
    );
  });

  it("does not execute randomness, PRNG, component seeds, weighted choice, or later stages", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness must not be used");
    });
    const next = vi.spyOn(prng, "nextMulberry32");
    const derive = vi.spyOn(componentSeed, "deriveComponentSeedV1");
    const select = vi.spyOn(weightedChoice, "selectWeightedCandidateV1");
    try {
      expect(validateSharedArpPolicyConfigurationV2(mutableCanonicalV2Configuration())).toBe(
        SHARED_ARP_POLICY_CONFIGURATION_V2,
      );
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

    const source = readFileSync(
      new URL("./arpeggiator-policy-configuration.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toContain("Math.random");
    expect(source).not.toContain('from "./prng"');
    expect(source).not.toContain('from "./component-seed"');
    expect(source).not.toContain('from "./arpeggiator-profile-configuration"');
    expect(source).not.toContain("selectWeightedCandidateV1");
    expect(source).not.toContain("buildArpWeightedCandidatesV1");
    expect(source).not.toContain("buildArpWeightedCandidatesV2");
    expect(source).not.toContain("resolveArpPlanV1");
    expect(source).not.toContain("generateArpEventsWithPolicyV1");
    expect(source).not.toContain("projectResolvedArpPlanV1");
  });
});
