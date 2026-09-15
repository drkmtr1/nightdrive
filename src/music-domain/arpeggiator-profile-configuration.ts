import {
  ARP_DIRECTION_IDS,
  ARP_RATE_IDS,
  type ArpDirectionId,
  type ArpRateId,
} from "./arpeggiator";
import { ARP_DENSITY_MASK_CATALOG_V1, type ArpDensityMaskIdV1 } from "./arpeggiator-density-mask";
import {
  ARP_GATE_ID_V1_VALUES,
  ARP_OCTAVE_RANGE_V1_VALUES,
  ARP_POLICY_DECISION_SLOT_V1_VALUES,
  ARP_PROFILE_DATA_VERSION_V1,
  type ArpGateIdV1,
  type ArpOctaveRangeV1,
  type ArpPolicyDecisionSlotV1,
  type ArpProfileDataVersionV1,
} from "./arpeggiator-policy-configuration";
import {
  COMPLEXITY_V1_VALUES,
  ENERGY_V1_VALUES,
  type ComplexityV1,
  type EnergyV1,
} from "./composition-intent";
import { HARMONY_PROFILE_IDS, type HarmonyProfileId } from "./harmony";
import type { WeightedCandidate } from "./weighted-choice";

const MAX_WEIGHT = 65_535;

export type ArpPolicyCandidateByDecisionSlotV1 = Readonly<{
  rate: ArpRateId;
  "octave-range": ArpOctaveRangeV1;
  direction: ArpDirectionId;
  mask: ArpDensityMaskIdV1;
  gate: ArpGateIdV1;
}>;

export type ArpProfileWeightRowV1<TLevel extends EnergyV1 | ComplexityV1> = Readonly<{
  level: TLevel;
  values: readonly number[];
}>;

type OrderedWeightRowsV1 = readonly [
  ArpProfileWeightRowV1<"very-low">,
  ArpProfileWeightRowV1<"low">,
  ArpProfileWeightRowV1<"medium">,
  ArpProfileWeightRowV1<"high">,
  ArpProfileWeightRowV1<"very-high">,
];

export type ArpProfileDecisionSlotConfigurationV1<TSlot extends ArpPolicyDecisionSlotV1> =
  Readonly<{
    slot: TSlot;
    candidates: readonly ArpPolicyCandidateByDecisionSlotV1[TSlot][];
    energyWeights: OrderedWeightRowsV1;
    complexityAdditions: OrderedWeightRowsV1;
  }>;

export type ArpGenreProfileConfigurationV1<TProfileId extends HarmonyProfileId = HarmonyProfileId> =
  Readonly<{
    profileId: TProfileId;
    decisionSlots: readonly [
      ArpProfileDecisionSlotConfigurationV1<"rate">,
      ArpProfileDecisionSlotConfigurationV1<"octave-range">,
      ArpProfileDecisionSlotConfigurationV1<"direction">,
      ArpProfileDecisionSlotConfigurationV1<"mask">,
      ArpProfileDecisionSlotConfigurationV1<"gate">,
    ];
  }>;

export type ArpGenreProfileConfigurationDataV1 = Readonly<{
  version: ArpProfileDataVersionV1;
  profiles: readonly [
    ArpGenreProfileConfigurationV1<typeof HARMONY_PROFILE_IDS.darkSynthwave>,
    ArpGenreProfileConfigurationV1<typeof HARMONY_PROFILE_IDS.classicSynthwave>,
    ArpGenreProfileConfigurationV1<typeof HARMONY_PROFILE_IDS.darkwave>,
    ArpGenreProfileConfigurationV1<typeof HARMONY_PROFILE_IDS.midtempoCyberpunk>,
  ];
}>;

function weightRows(
  veryLow: readonly number[],
  low: readonly number[],
  medium: readonly number[],
  high: readonly number[],
  veryHigh: readonly number[],
): OrderedWeightRowsV1 {
  return [
    { level: "very-low", values: veryLow },
    { level: "low", values: low },
    { level: "medium", values: medium },
    { level: "high", values: high },
    { level: "very-high", values: veryHigh },
  ];
}

const PROFILE_CONFIGURATION_SOURCE = {
  version: ARP_PROFILE_DATA_VERSION_V1,
  profiles: [
    {
      profileId: HARMONY_PROFILE_IDS.darkSynthwave,
      decisionSlots: [
        {
          slot: "rate",
          candidates: [ARP_RATE_IDS.eighth, ARP_RATE_IDS.sixteenth],
          energyWeights: weightRows([5, 1], [4, 2], [3, 5], [2, 6], [1, 7]),
          complexityAdditions: weightRows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
        },
        {
          slot: "octave-range",
          candidates: [1, 2],
          energyWeights: weightRows([2, 5], [2, 5], [2, 5], [2, 5], [2, 5]),
          complexityAdditions: weightRows([2, 0], [1, 0], [0, 0], [0, 1], [0, 2]),
        },
        {
          slot: "direction",
          candidates: [ARP_DIRECTION_IDS.downUp, ARP_DIRECTION_IDS.down, ARP_DIRECTION_IDS.upDown],
          energyWeights: weightRows([6, 4, 1], [6, 4, 1], [6, 4, 1], [6, 4, 1], [6, 4, 1]),
          complexityAdditions: weightRows([0, 1, 0], [0, 0, 0], [0, 0, 0], [1, 0, 1], [2, 0, 2]),
        },
        {
          slot: "mask",
          candidates: ["three-of-four", "full"],
          energyWeights: weightRows([6, 2], [5, 3], [4, 5], [3, 6], [2, 7]),
          complexityAdditions: weightRows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
        },
        {
          slot: "gate",
          candidates: ["short", "medium"],
          energyWeights: weightRows([2, 6], [3, 5], [4, 4], [5, 3], [6, 2]),
          complexityAdditions: weightRows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
        },
      ],
    },
    {
      profileId: HARMONY_PROFILE_IDS.classicSynthwave,
      decisionSlots: [
        {
          slot: "rate",
          candidates: [ARP_RATE_IDS.eighth, ARP_RATE_IDS.sixteenth],
          energyWeights: weightRows([5, 1], [4, 2], [3, 5], [2, 6], [1, 7]),
          complexityAdditions: weightRows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
        },
        {
          slot: "octave-range",
          candidates: [1, 2],
          energyWeights: weightRows([5, 2], [4, 3], [3, 5], [2, 6], [1, 7]),
          complexityAdditions: weightRows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
        },
        {
          slot: "direction",
          candidates: [ARP_DIRECTION_IDS.up, ARP_DIRECTION_IDS.upDown, ARP_DIRECTION_IDS.downUp],
          energyWeights: weightRows([6, 3, 1], [6, 3, 1], [6, 3, 1], [6, 3, 1], [6, 3, 1]),
          complexityAdditions: weightRows([2, 0, 0], [1, 0, 0], [0, 1, 0], [0, 2, 1], [0, 3, 2]),
        },
        {
          slot: "mask",
          candidates: ["three-of-four", "full"],
          energyWeights: weightRows([6, 2], [5, 3], [3, 6], [2, 7], [1, 8]),
          complexityAdditions: weightRows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
        },
        {
          slot: "gate",
          candidates: ["short", "medium"],
          energyWeights: weightRows([2, 6], [3, 5], [4, 5], [5, 4], [6, 3]),
          complexityAdditions: weightRows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
        },
      ],
    },
    {
      profileId: HARMONY_PROFILE_IDS.darkwave,
      decisionSlots: [
        {
          slot: "rate",
          candidates: [ARP_RATE_IDS.quarter, ARP_RATE_IDS.eighth],
          energyWeights: weightRows([6, 2], [5, 3], [3, 6], [2, 7], [1, 8]),
          complexityAdditions: weightRows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
        },
        {
          slot: "octave-range",
          candidates: [1, 2],
          energyWeights: weightRows([7, 1], [7, 1], [7, 1], [7, 1], [7, 1]),
          complexityAdditions: weightRows([1, 0], [0, 0], [0, 1], [0, 2], [0, 3]),
        },
        {
          slot: "direction",
          candidates: [ARP_DIRECTION_IDS.up, ARP_DIRECTION_IDS.down, ARP_DIRECTION_IDS.upDown],
          energyWeights: weightRows([7, 5, 1], [7, 5, 1], [7, 5, 1], [7, 5, 1], [7, 5, 1]),
          complexityAdditions: weightRows([1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, 2], [0, 0, 3]),
        },
        {
          slot: "mask",
          candidates: ["one-of-four", "alternating-on-rest", "alternating-rest-on"],
          energyWeights: weightRows([7, 2, 1], [6, 3, 2], [4, 6, 3], [3, 7, 4], [2, 8, 5]),
          complexityAdditions: weightRows([2, 1, 0], [1, 1, 0], [0, 1, 1], [0, 1, 2], [0, 1, 3]),
        },
        {
          slot: "gate",
          candidates: ["medium", "long"],
          energyWeights: weightRows([2, 7], [3, 6], [4, 5], [6, 3], [7, 2]),
          complexityAdditions: weightRows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
        },
      ],
    },
    {
      profileId: HARMONY_PROFILE_IDS.midtempoCyberpunk,
      decisionSlots: [
        {
          slot: "rate",
          candidates: [ARP_RATE_IDS.eighth, ARP_RATE_IDS.sixteenth],
          energyWeights: weightRows([5, 2], [4, 3], [4, 4], [3, 5], [2, 6]),
          complexityAdditions: weightRows([0, 0], [0, 0], [0, 0], [0, 0], [0, 0]),
        },
        {
          slot: "octave-range",
          candidates: [1, 2],
          energyWeights: weightRows([4, 4], [4, 4], [4, 4], [4, 4], [4, 4]),
          complexityAdditions: weightRows([2, 0], [1, 0], [0, 0], [0, 1], [0, 2]),
        },
        {
          slot: "direction",
          candidates: [
            ARP_DIRECTION_IDS.downUp,
            ARP_DIRECTION_IDS.upDown,
            ARP_DIRECTION_IDS.down,
            ARP_DIRECTION_IDS.up,
          ],
          energyWeights: weightRows(
            [5, 5, 2, 2],
            [5, 5, 2, 2],
            [5, 5, 2, 2],
            [5, 5, 2, 2],
            [5, 5, 2, 2],
          ),
          complexityAdditions: weightRows(
            [0, 0, 1, 1],
            [0, 0, 1, 0],
            [1, 1, 0, 0],
            [2, 2, 0, 0],
            [3, 3, 0, 0],
          ),
        },
        {
          slot: "mask",
          candidates: ["three-of-four", "alternating-on-rest", "alternating-rest-on"],
          energyWeights: weightRows([2, 5, 4], [3, 5, 4], [5, 5, 5], [7, 4, 5], [8, 3, 5]),
          complexityAdditions: weightRows([2, 1, 0], [1, 1, 0], [0, 1, 1], [0, 1, 2], [0, 1, 3]),
        },
        {
          slot: "gate",
          candidates: ["short"],
          energyWeights: weightRows([1], [1], [1], [1], [1]),
          complexityAdditions: weightRows([0], [0], [0], [0], [0]),
        },
      ],
    },
  ],
} as const satisfies ArpGenreProfileConfigurationDataV1;

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const key of Reflect.ownKeys(value)) deepFreeze(Reflect.get(value, key));
  return Object.freeze(value);
}

export const ARP_GENRE_PROFILE_CONFIGURATION_V1: ArpGenreProfileConfigurationDataV1 = deepFreeze(
  PROFILE_CONFIGURATION_SOURCE,
);

export type ArpGenreProfileConfigurationFailureKindV1 =
  | "INVALID_CONFIGURATION_SHAPE"
  | "INVALID_PROFILE_DATA_VERSION"
  | "INVALID_PROFILE_SET"
  | "INVALID_SLOT_STRUCTURE"
  | "INVALID_CANDIDATES"
  | "INVALID_ENERGY_TABLE"
  | "INVALID_COMPLEXITY_TABLE"
  | "INVALID_VECTOR_ALIGNMENT"
  | "INVALID_WEIGHT"
  | "INVALID_FINAL_WEIGHTS";

export class ArpGenreProfileConfigurationError extends RangeError {
  readonly owner = "profile.version" as const;
  readonly kind: ArpGenreProfileConfigurationFailureKindV1;

  constructor(kind: ArpGenreProfileConfigurationFailureKindV1, message: string) {
    super(message);
    this.name = "ArpGenreProfileConfigurationError";
    this.kind = kind;
  }
}

type UnknownRecord = Record<PropertyKey, unknown>;

function fail(kind: ArpGenreProfileConfigurationFailureKindV1, message: string): never {
  throw new ArpGenreProfileConfigurationError(kind, message);
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

function validateArrayLength(
  value: unknown,
  expectedLength: number,
  kind: ArpGenreProfileConfigurationFailureKindV1,
  field: string,
): asserts value is unknown[] {
  if (!Array.isArray(value)) fail(kind, `${field} must be the canonical ordered tuple.`);
  if (value.length < expectedLength) fail(kind, `${field} is missing canonical entries.`);
  if (value.length > expectedLength) fail(kind, `${field} contains extra entries.`);
}

function isCandidateForSlot(slot: ArpPolicyDecisionSlotV1, candidate: unknown): boolean {
  if (slot === "rate") return Object.values(ARP_RATE_IDS).includes(candidate as ArpRateId);
  if (slot === "octave-range") {
    return ARP_OCTAVE_RANGE_V1_VALUES.includes(candidate as ArpOctaveRangeV1);
  }
  if (slot === "direction") {
    return Object.values(ARP_DIRECTION_IDS).includes(candidate as ArpDirectionId);
  }
  if (slot === "mask") {
    return typeof candidate === "string" && Object.hasOwn(ARP_DENSITY_MASK_CATALOG_V1, candidate);
  }
  return ARP_GATE_ID_V1_VALUES.includes(candidate as ArpGateIdV1);
}

function validateProfileSet(value: unknown): asserts value is unknown[] {
  validateArrayLength(
    value,
    ARP_GENRE_PROFILE_CONFIGURATION_V1.profiles.length,
    "INVALID_PROFILE_SET",
    "profiles",
  );
  for (let index = 0; index < ARP_GENRE_PROFILE_CONFIGURATION_V1.profiles.length; index += 1) {
    const profile = value[index];
    const expected = ARP_GENRE_PROFILE_CONFIGURATION_V1.profiles[index];
    if (
      !isPlainRecord(profile) ||
      !Object.hasOwn(profile, "profileId") ||
      profile.profileId !== expected.profileId
    ) {
      fail(
        "INVALID_PROFILE_SET",
        `profiles[${index}].profileId must match canonical order and identity.`,
      );
    }
  }
}

function validateSlotStructure(
  profile: UnknownRecord,
  profileIndex: number,
): asserts profile is UnknownRecord & { decisionSlots: unknown[] } {
  if (!hasExactProperties(profile, ["profileId", "decisionSlots"])) {
    fail(
      "INVALID_SLOT_STRUCTURE",
      `profiles[${profileIndex}] must contain exactly profileId and decisionSlots.`,
    );
  }
  validateArrayLength(
    profile.decisionSlots,
    ARP_POLICY_DECISION_SLOT_V1_VALUES.length,
    "INVALID_SLOT_STRUCTURE",
    `profiles[${profileIndex}].decisionSlots`,
  );
  for (let slotIndex = 0; slotIndex < ARP_POLICY_DECISION_SLOT_V1_VALUES.length; slotIndex += 1) {
    const slot = profile.decisionSlots[slotIndex];
    const expectedSlot = ARP_POLICY_DECISION_SLOT_V1_VALUES[slotIndex];
    if (
      !isPlainRecord(slot) ||
      !hasExactProperties(slot, ["slot", "candidates", "energyWeights", "complexityAdditions"]) ||
      slot.slot !== expectedSlot
    ) {
      fail(
        "INVALID_SLOT_STRUCTURE",
        `profiles[${profileIndex}].decisionSlots[${slotIndex}] must match the canonical slot structure and order.`,
      );
    }
  }
}

function validateCandidates(
  value: unknown,
  expected: readonly unknown[],
  slot: ArpPolicyDecisionSlotV1,
  field: string,
): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail("INVALID_CANDIDATES", `${field} must be a nonempty canonical candidate tuple.`);
  }
  if (value.length < expected.length) fail("INVALID_CANDIDATES", `${field} is missing candidates.`);
  if (value.length > expected.length)
    fail("INVALID_CANDIDATES", `${field} contains extra candidates.`);
  const seen = new Set<unknown>();
  for (let index = 0; index < value.length; index += 1) {
    const candidate = value[index];
    if (
      !isCandidateForSlot(slot, candidate) ||
      seen.has(candidate) ||
      candidate !== expected[index]
    ) {
      fail(
        "INVALID_CANDIDATES",
        `${field} must match canonical vocabulary, uniqueness, and order.`,
      );
    }
    seen.add(candidate);
  }
}

function validateWeightTableStructure(
  value: unknown,
  levels: readonly string[],
  kind: "INVALID_ENERGY_TABLE" | "INVALID_COMPLEXITY_TABLE",
  field: string,
): asserts value is UnknownRecord[] {
  validateArrayLength(value, levels.length, kind, field);
  for (let index = 0; index < levels.length; index += 1) {
    const row = value[index];
    if (
      !isPlainRecord(row) ||
      !hasExactProperties(row, ["level", "values"]) ||
      row.level !== levels[index] ||
      !Array.isArray(row.values)
    ) {
      fail(kind, `${field}[${index}] must match the canonical row structure and order.`);
    }
  }
}

function validateVectorAlignment(
  rows: readonly UnknownRecord[],
  candidateCount: number,
  field: string,
): void {
  for (let index = 0; index < rows.length; index += 1) {
    const values = rows[index]?.values;
    if (!Array.isArray(values) || values.length !== candidateCount) {
      fail(
        "INVALID_VECTOR_ALIGNMENT",
        `${field}[${index}].values must align with candidate count.`,
      );
    }
  }
}

function validateSourceWeights(
  rows: readonly UnknownRecord[],
  expectedRows: OrderedWeightRowsV1,
  field: string,
): void {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const values = rows[rowIndex]?.values;
    const expectedValues = expectedRows[rowIndex]?.values;
    if (!Array.isArray(values) || expectedValues === undefined) {
      fail("INVALID_WEIGHT", `${field}[${rowIndex}] must contain canonical values.`);
    }
    for (let candidateIndex = 0; candidateIndex < values.length; candidateIndex += 1) {
      const weight = values[candidateIndex];
      if (
        typeof weight !== "number" ||
        !Number.isFinite(weight) ||
        !Number.isInteger(weight) ||
        !Number.isSafeInteger(weight) ||
        weight < 0 ||
        weight > MAX_WEIGHT ||
        weight !== expectedValues[candidateIndex]
      ) {
        fail(
          "INVALID_WEIGHT",
          `${field}[${rowIndex}].values[${candidateIndex}] must be the canonical bounded integer.`,
        );
      }
    }
  }
}

function validateFinalWeights(
  energyRows: readonly UnknownRecord[],
  complexityRows: readonly UnknownRecord[],
  field: string,
): void {
  for (const energyRow of energyRows) {
    const energyValues = energyRow.values as readonly number[];
    for (const complexityRow of complexityRows) {
      const complexityValues = complexityRow.values as readonly number[];
      let total = 0;
      for (let index = 0; index < energyValues.length; index += 1) {
        const weight = (energyValues[index] as number) + (complexityValues[index] as number);
        if (!Number.isSafeInteger(weight) || weight < 0 || weight > MAX_WEIGHT) {
          fail("INVALID_FINAL_WEIGHTS", `${field} contains an invalid final candidate weight.`);
        }
        total += weight;
      }
      if (!Number.isSafeInteger(total) || total < 1 || total > MAX_WEIGHT) {
        fail("INVALID_FINAL_WEIGHTS", `${field} contains an invalid final total weight.`);
      }
    }
  }
}

export function validateArpGenreProfileConfigurationV1(
  value: unknown,
): ArpGenreProfileConfigurationDataV1 {
  if (!isPlainRecord(value) || !hasExactProperties(value, ["version", "profiles"])) {
    fail(
      "INVALID_CONFIGURATION_SHAPE",
      "genre-profile Arpeggiator configuration must contain exactly version and profiles.",
    );
  }
  if (value.version !== ARP_PROFILE_DATA_VERSION_V1) {
    fail(
      "INVALID_PROFILE_DATA_VERSION",
      "version must be the canonical Arpeggiator profile-data identity.",
    );
  }
  validateProfileSet(value.profiles);

  for (let profileIndex = 0; profileIndex < value.profiles.length; profileIndex += 1) {
    const profile = value.profiles[profileIndex];
    const expectedProfile = ARP_GENRE_PROFILE_CONFIGURATION_V1.profiles[profileIndex];
    if (!isPlainRecord(profile) || expectedProfile === undefined) {
      fail("INVALID_PROFILE_SET", `profiles[${profileIndex}] must be canonical.`);
    }
    validateSlotStructure(profile, profileIndex);

    for (let slotIndex = 0; slotIndex < profile.decisionSlots.length; slotIndex += 1) {
      const slot = profile.decisionSlots[slotIndex];
      const expectedSlot = expectedProfile.decisionSlots[slotIndex];
      if (!isPlainRecord(slot) || expectedSlot === undefined) {
        fail(
          "INVALID_SLOT_STRUCTURE",
          `profiles[${profileIndex}].decisionSlots[${slotIndex}] must be canonical.`,
        );
      }
      const field = `profiles[${profileIndex}].decisionSlots[${slotIndex}]`;
      validateCandidates(
        slot.candidates,
        expectedSlot.candidates,
        expectedSlot.slot,
        `${field}.candidates`,
      );
      validateWeightTableStructure(
        slot.energyWeights,
        ENERGY_V1_VALUES,
        "INVALID_ENERGY_TABLE",
        `${field}.energyWeights`,
      );
      validateWeightTableStructure(
        slot.complexityAdditions,
        COMPLEXITY_V1_VALUES,
        "INVALID_COMPLEXITY_TABLE",
        `${field}.complexityAdditions`,
      );
      validateVectorAlignment(
        slot.energyWeights,
        expectedSlot.candidates.length,
        `${field}.energyWeights`,
      );
      validateVectorAlignment(
        slot.complexityAdditions,
        expectedSlot.candidates.length,
        `${field}.complexityAdditions`,
      );
      validateSourceWeights(
        slot.energyWeights,
        expectedSlot.energyWeights,
        `${field}.energyWeights`,
      );
      validateSourceWeights(
        slot.complexityAdditions,
        expectedSlot.complexityAdditions,
        `${field}.complexityAdditions`,
      );
      validateFinalWeights(slot.energyWeights, slot.complexityAdditions, field);
    }
  }

  return ARP_GENRE_PROFILE_CONFIGURATION_V1;
}

function lookupInvariant(message: string): never {
  throw new Error(`Arpeggiator profile configuration lookup invariant failed: ${message}`);
}

export function buildArpWeightedCandidatesV1<TSlot extends ArpPolicyDecisionSlotV1>(
  configuration: ArpGenreProfileConfigurationDataV1,
  profileId: HarmonyProfileId,
  decisionSlot: TSlot,
  energy: EnergyV1,
  complexity: ComplexityV1,
): readonly WeightedCandidate<ArpPolicyCandidateByDecisionSlotV1[TSlot]>[] {
  const validated = validateArpGenreProfileConfigurationV1(configuration);
  const profile = validated.profiles.find((candidate) => candidate.profileId === profileId);
  if (profile === undefined) lookupInvariant("unknown profile ID");
  const slot = profile.decisionSlots.find((candidate) => candidate.slot === decisionSlot);
  if (slot === undefined) lookupInvariant("unknown decision slot");
  const energyRow = slot.energyWeights.find((row) => row.level === energy);
  if (energyRow === undefined) lookupInvariant("unknown Energy value");
  const complexityRow = slot.complexityAdditions.find((row) => row.level === complexity);
  if (complexityRow === undefined) lookupInvariant("unknown Complexity value");

  const weightedCandidates = slot.candidates.map((value, index) =>
    Object.freeze({
      value,
      weight: (energyRow.values[index] as number) + (complexityRow.values[index] as number),
    }),
  );
  return Object.freeze(weightedCandidates) as readonly WeightedCandidate<
    ArpPolicyCandidateByDecisionSlotV1[TSlot]
  >[];
}
