import { ARP_RATE_IDS, type ArpRateId } from "./arpeggiator";
import { createDurationTicks, type DurationTicks, SUBDIVISION_TICKS } from "./musical-time";

export const ARP_PROFILE_DATA_VERSION_V1 = "nightdrive.genre-profile.arpeggiator.v1" as const;
export type ArpProfileDataVersionV1 = typeof ARP_PROFILE_DATA_VERSION_V1;

export const ARP_POLICY_VERSION_V1 = "nightdrive.arpeggiator-policy.v1" as const;
export type ArpPolicyVersionV1 = typeof ARP_POLICY_VERSION_V1;

export const ARP_OCTAVE_RANGE_V1_VALUES = Object.freeze([1, 2, 3] as const);
export type ArpOctaveRangeV1 = (typeof ARP_OCTAVE_RANGE_V1_VALUES)[number];

export const ARP_GATE_ID_V1_VALUES = Object.freeze(["short", "medium", "long"] as const);
export type ArpGateIdV1 = (typeof ARP_GATE_ID_V1_VALUES)[number];

export const ARP_POLICY_DECISION_SLOT_V1_VALUES = Object.freeze([
  "rate",
  "octave-range",
  "direction",
  "mask",
  "gate",
] as const);
export type ArpPolicyDecisionSlotV1 = (typeof ARP_POLICY_DECISION_SLOT_V1_VALUES)[number];

export const ARP_WEIGHTED_CHOICE_VERSION_V1 =
  "nightdrive.weighted-choice.uint32-modulo.v1" as const;
export const ARP_DENSITY_MASK_CATALOG_VERSION_V1 = "nightdrive.arp-density-mask.v1" as const;

export type SharedArpPolicyConfigurationV1 = Readonly<{
  version: ArpPolicyVersionV1;
  compatibleProfileDataVersion: ArpProfileDataVersionV1;
  decisionSlots: readonly ["rate", "octave-range", "direction", "mask", "gate"];
  weightedChoiceVersion: typeof ARP_WEIGHTED_CHOICE_VERSION_V1;
  densityMaskCatalogVersion: typeof ARP_DENSITY_MASK_CATALOG_VERSION_V1;
  octaveRanges: readonly [1, 2, 3];
  gateIds: readonly ["short", "medium", "long"];
  gateTicksByRate: Readonly<{
    quarter: Readonly<{
      short: DurationTicks;
      medium: DurationTicks;
      long: DurationTicks;
    }>;
    eighth: Readonly<{
      short: DurationTicks;
      medium: DurationTicks;
      long: DurationTicks;
    }>;
    sixteenth: Readonly<{
      short: DurationTicks;
      medium: DurationTicks;
      long: DurationTicks;
    }>;
  }>;
}>;

const GATE_TICKS_BY_RATE_V1 = Object.freeze({
  quarter: Object.freeze({
    short: createDurationTicks(480),
    medium: createDurationTicks(720),
    long: createDurationTicks(960),
  }),
  eighth: Object.freeze({
    short: createDurationTicks(240),
    medium: createDurationTicks(360),
    long: createDurationTicks(480),
  }),
  sixteenth: Object.freeze({
    short: createDurationTicks(120),
    medium: createDurationTicks(180),
    long: createDurationTicks(240),
  }),
});

export const SHARED_ARP_POLICY_CONFIGURATION_V1: SharedArpPolicyConfigurationV1 = Object.freeze({
  version: ARP_POLICY_VERSION_V1,
  compatibleProfileDataVersion: ARP_PROFILE_DATA_VERSION_V1,
  decisionSlots: ARP_POLICY_DECISION_SLOT_V1_VALUES,
  weightedChoiceVersion: ARP_WEIGHTED_CHOICE_VERSION_V1,
  densityMaskCatalogVersion: ARP_DENSITY_MASK_CATALOG_VERSION_V1,
  octaveRanges: ARP_OCTAVE_RANGE_V1_VALUES,
  gateIds: ARP_GATE_ID_V1_VALUES,
  gateTicksByRate: GATE_TICKS_BY_RATE_V1,
});

export type SharedArpPolicyConfigurationFailureKindV1 =
  | "INVALID_CONFIGURATION_SHAPE"
  | "INVALID_POLICY_VERSION"
  | "INCOMPATIBLE_PROFILE_DATA_VERSION"
  | "INVALID_DECISION_SLOTS"
  | "INVALID_WEIGHTED_CHOICE_VERSION"
  | "INVALID_DENSITY_MASK_CATALOG_VERSION"
  | "INVALID_OCTAVE_RANGES"
  | "INVALID_GATE_IDS"
  | "INVALID_GATE_MAPPINGS";

export class SharedArpPolicyConfigurationError extends RangeError {
  readonly owner = "policy.version" as const;
  readonly kind: SharedArpPolicyConfigurationFailureKindV1;

  constructor(kind: SharedArpPolicyConfigurationFailureKindV1, message: string) {
    super(message);
    this.name = "SharedArpPolicyConfigurationError";
    this.kind = kind;
  }
}

type UnknownRecord = Record<PropertyKey, unknown>;

function fail(kind: SharedArpPolicyConfigurationFailureKindV1, message: string): never {
  throw new SharedArpPolicyConfigurationError(kind, message);
}

function isPlainRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactProperties(value: UnknownRecord, expected: readonly string[]): boolean {
  const keys = Reflect.ownKeys(value);
  return (
    keys.length === expected.length && expected.every((property) => Object.hasOwn(value, property))
  );
}

function validateExactTuple(
  value: unknown,
  expected: readonly unknown[],
  kind: SharedArpPolicyConfigurationFailureKindV1,
  field: string,
): void {
  if (!Array.isArray(value)) fail(kind, `${field} must be the canonical ordered tuple.`);
  if (value.length < expected.length) fail(kind, `${field} is missing canonical entries.`);
  if (value.length > expected.length) fail(kind, `${field} contains extra entries.`);
  for (let index = 0; index < expected.length; index += 1) {
    if (value[index] !== expected[index]) {
      fail(kind, `${field} must match canonical order and values.`);
    }
  }
}

const TOP_LEVEL_PROPERTIES = Object.freeze([
  "version",
  "compatibleProfileDataVersion",
  "decisionSlots",
  "weightedChoiceVersion",
  "densityMaskCatalogVersion",
  "octaveRanges",
  "gateIds",
  "gateTicksByRate",
] as const);
const RATE_ORDER = Object.freeze([
  ARP_RATE_IDS.quarter,
  ARP_RATE_IDS.eighth,
  ARP_RATE_IDS.sixteenth,
] as const);

function rateTicks(rate: ArpRateId): DurationTicks {
  if (rate === ARP_RATE_IDS.quarter) return SUBDIVISION_TICKS.quarter;
  if (rate === ARP_RATE_IDS.sixteenth) return SUBDIVISION_TICKS.sixteenth;
  return SUBDIVISION_TICKS.eighth;
}

function validateGateMappings(value: unknown): void {
  if (!isPlainRecord(value) || !hasExactProperties(value, RATE_ORDER)) {
    fail("INVALID_GATE_MAPPINGS", "gateTicksByRate must contain every canonical rate only.");
  }

  for (const rate of RATE_ORDER) {
    const mapping = value[rate];
    if (!isPlainRecord(mapping) || !hasExactProperties(mapping, ARP_GATE_ID_V1_VALUES)) {
      fail(
        "INVALID_GATE_MAPPINGS",
        `gateTicksByRate.${rate} must contain every canonical gate only.`,
      );
    }

    const maximum = rateTicks(rate);
    for (const gateId of ARP_GATE_ID_V1_VALUES) {
      const gateTicks = mapping[gateId];
      if (
        typeof gateTicks !== "number" ||
        !Number.isFinite(gateTicks) ||
        !Number.isInteger(gateTicks) ||
        !Number.isSafeInteger(gateTicks) ||
        gateTicks < 1 ||
        gateTicks > maximum ||
        gateTicks !== GATE_TICKS_BY_RATE_V1[rate][gateId]
      ) {
        fail(
          "INVALID_GATE_MAPPINGS",
          `gateTicksByRate.${rate}.${gateId} must equal its canonical safe integer value.`,
        );
      }
    }

    if (mapping.long !== maximum) {
      fail("INVALID_GATE_MAPPINGS", `gateTicksByRate.${rate}.long must equal the rate ticks.`);
    }
  }
}

export function validateSharedArpPolicyConfigurationV1(
  value: unknown,
): SharedArpPolicyConfigurationV1 {
  if (!isPlainRecord(value) || !hasExactProperties(value, TOP_LEVEL_PROPERTIES)) {
    fail(
      "INVALID_CONFIGURATION_SHAPE",
      "shared Arpeggiator policy configuration must contain exactly the canonical properties.",
    );
  }
  if (value.version !== ARP_POLICY_VERSION_V1) {
    fail("INVALID_POLICY_VERSION", "version must be the canonical Arpeggiator policy identity.");
  }
  if (value.compatibleProfileDataVersion !== ARP_PROFILE_DATA_VERSION_V1) {
    fail(
      "INCOMPATIBLE_PROFILE_DATA_VERSION",
      "compatibleProfileDataVersion must be the supported profile-data identity.",
    );
  }
  validateExactTuple(
    value.decisionSlots,
    ARP_POLICY_DECISION_SLOT_V1_VALUES,
    "INVALID_DECISION_SLOTS",
    "decisionSlots",
  );
  if (value.weightedChoiceVersion !== ARP_WEIGHTED_CHOICE_VERSION_V1) {
    fail(
      "INVALID_WEIGHTED_CHOICE_VERSION",
      "weightedChoiceVersion must be the canonical weighted-choice identity.",
    );
  }
  if (value.densityMaskCatalogVersion !== ARP_DENSITY_MASK_CATALOG_VERSION_V1) {
    fail(
      "INVALID_DENSITY_MASK_CATALOG_VERSION",
      "densityMaskCatalogVersion must be the canonical density-mask catalog identity.",
    );
  }
  validateExactTuple(
    value.octaveRanges,
    ARP_OCTAVE_RANGE_V1_VALUES,
    "INVALID_OCTAVE_RANGES",
    "octaveRanges",
  );
  validateExactTuple(value.gateIds, ARP_GATE_ID_V1_VALUES, "INVALID_GATE_IDS", "gateIds");
  validateGateMappings(value.gateTicksByRate);

  return SHARED_ARP_POLICY_CONFIGURATION_V1;
}
