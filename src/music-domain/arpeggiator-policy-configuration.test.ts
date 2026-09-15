import { describe, expect, it, vi } from "vitest";
import { ArpValueError } from "./arpeggiator";
import {
  ARP_DENSITY_MASK_CATALOG_VERSION_V1,
  ARP_GATE_ID_V1_VALUES,
  ARP_OCTAVE_RANGE_V1_VALUES,
  ARP_POLICY_DECISION_SLOT_V1_VALUES,
  ARP_POLICY_VERSION_V1,
  ARP_PROFILE_DATA_VERSION_V1,
  ARP_WEIGHTED_CHOICE_VERSION_V1,
  SHARED_ARP_POLICY_CONFIGURATION_V1,
  SharedArpPolicyConfigurationError,
  type SharedArpPolicyConfigurationFailureKindV1,
  validateSharedArpPolicyConfigurationV1,
} from "./arpeggiator-policy-configuration";
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

function expectFailure(
  value: unknown,
  kind: SharedArpPolicyConfigurationFailureKindV1,
): SharedArpPolicyConfigurationError {
  try {
    validateSharedArpPolicyConfigurationV1(value);
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
    expect(musicDomain).not.toHaveProperty("ARP_POLICY_VERSION_V1");
    expect(musicDomain).not.toHaveProperty("SHARED_ARP_POLICY_CONFIGURATION_V1");
    expect(musicDomain).not.toHaveProperty("validateSharedArpPolicyConfigurationV1");
    expect(musicDomain).not.toHaveProperty("SharedArpPolicyConfigurationError");
  });
});
