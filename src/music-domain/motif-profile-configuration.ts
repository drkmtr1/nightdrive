import {
  COMPLEXITY_V1_VALUES,
  type ComplexityV1,
  ENERGY_V1_VALUES,
  type EnergyV1,
} from "./composition-intent";
import { HARMONY_PROFILE_IDS, type HarmonyProfileId } from "./harmony";
import {
  MOTIF_PHRASE4_DISPLACEMENTS_V1,
  MOTIF_REGISTER_BANDS_V1,
  MOTIF_RHYTHM_TEMPLATE_IDS_V1,
  MOTIF_TENSION_MODES_V1,
  type MotifPhrase4DisplacementV1,
  type MotifRegisterBandV1,
  type MotifRhythmTemplateIdV1,
  type MotifTensionModeV1,
} from "./motif-catalog";
import type { WeightedCandidate } from "./weighted-choice";

export const MOTIF_PROFILE_DATA_VERSION_V1 = "nightdrive.genre-profile.motif.v1" as const;
export const MOTIF_POLICY_DECISION_SLOTS_V1 = Object.freeze([
  "rhythm",
  "register",
  "tension",
  "displacement",
] as const);

export type MotifProfileDataVersionV1 = typeof MOTIF_PROFILE_DATA_VERSION_V1;
export type MotifPolicyDecisionSlotV1 = (typeof MOTIF_POLICY_DECISION_SLOTS_V1)[number];
export type MotifPolicyCandidateBySlotV1 = Readonly<{
  rhythm: MotifRhythmTemplateIdV1;
  register: MotifRegisterBandV1;
  tension: MotifTensionModeV1;
  displacement: MotifPhrase4DisplacementV1;
}>;

type WeightRow<TLevel extends EnergyV1 | ComplexityV1> = Readonly<{
  level: TLevel;
  values: readonly number[];
}>;

type OrderedWeightRows = readonly [
  WeightRow<"very-low">,
  WeightRow<"low">,
  WeightRow<"medium">,
  WeightRow<"high">,
  WeightRow<"very-high">,
];

export type MotifProfileSlotConfigurationV1<TSlot extends MotifPolicyDecisionSlotV1> = Readonly<{
  slot: TSlot;
  candidates: readonly MotifPolicyCandidateBySlotV1[TSlot][];
  energyWeights: OrderedWeightRows;
  complexityAdditions: OrderedWeightRows;
}>;

export type MotifGenreProfileConfigurationV1<
  TProfileId extends HarmonyProfileId = HarmonyProfileId,
> = Readonly<{
  profileId: TProfileId;
  decisionSlots: readonly [
    MotifProfileSlotConfigurationV1<"rhythm">,
    MotifProfileSlotConfigurationV1<"register">,
    MotifProfileSlotConfigurationV1<"tension">,
    MotifProfileSlotConfigurationV1<"displacement">,
  ];
}>;

export type MotifGenreProfileConfigurationDataV1 = Readonly<{
  version: MotifProfileDataVersionV1;
  profiles: readonly [
    MotifGenreProfileConfigurationV1<typeof HARMONY_PROFILE_IDS.darkSynthwave>,
    MotifGenreProfileConfigurationV1<typeof HARMONY_PROFILE_IDS.classicSynthwave>,
    MotifGenreProfileConfigurationV1<typeof HARMONY_PROFILE_IDS.darkwave>,
    MotifGenreProfileConfigurationV1<typeof HARMONY_PROFILE_IDS.midtempoCyberpunk>,
  ];
}>;

function rows(
  veryLow: readonly number[],
  low: readonly number[],
  medium: readonly number[],
  high: readonly number[],
  veryHigh: readonly number[],
): OrderedWeightRows {
  return [
    { level: "very-low", values: veryLow },
    { level: "low", values: low },
    { level: "medium", values: medium },
    { level: "high", values: high },
    { level: "very-high", values: veryHigh },
  ];
}

function same(values: readonly number[]): OrderedWeightRows {
  return rows(values, values, values, values, values);
}

const SOURCE = {
  version: MOTIF_PROFILE_DATA_VERSION_V1,
  profiles: [
    {
      profileId: HARMONY_PROFILE_IDS.darkSynthwave,
      decisionSlots: [
        {
          slot: "rhythm",
          candidates: ["sparse-4", "steady-6", "active-8"],
          energyWeights: rows([6, 3, 1], [5, 4, 1], [3, 6, 3], [2, 5, 6], [1, 3, 8]),
          complexityAdditions: same([0, 0, 0]),
        },
        {
          slot: "register",
          candidates: ["middle", "upper"],
          energyWeights: rows([6, 2], [5, 3], [4, 4], [3, 5], [2, 6]),
          complexityAdditions: same([0, 0]),
        },
        {
          slot: "tension",
          candidates: ["chordal", "diatonic-passing"],
          energyWeights: same([5, 3]),
          complexityAdditions: rows([2, 0], [1, 0], [0, 0], [0, 2], [0, 4]),
        },
        {
          slot: "displacement",
          candidates: ["none", "later-480", "earlier-480"],
          energyWeights: same([6, 3, 2]),
          complexityAdditions: rows([2, 0, 0], [1, 0, 0], [0, 0, 0], [0, 1, 1], [0, 2, 2]),
        },
      ],
    },
    {
      profileId: HARMONY_PROFILE_IDS.classicSynthwave,
      decisionSlots: [
        {
          slot: "rhythm",
          candidates: ["sparse-4", "steady-6", "active-8"],
          energyWeights: rows([5, 4, 1], [4, 5, 1], [2, 7, 3], [2, 6, 5], [1, 5, 7]),
          complexityAdditions: same([0, 0, 0]),
        },
        {
          slot: "register",
          candidates: ["middle", "upper"],
          energyWeights: rows([6, 2], [5, 3], [4, 4], [3, 5], [2, 6]),
          complexityAdditions: same([0, 0]),
        },
        {
          slot: "tension",
          candidates: ["chordal", "diatonic-passing"],
          energyWeights: same([6, 2]),
          complexityAdditions: rows([2, 0], [1, 0], [0, 0], [0, 2], [0, 3]),
        },
        {
          slot: "displacement",
          candidates: ["none", "earlier-480", "later-480"],
          energyWeights: same([7, 2, 2]),
          complexityAdditions: rows([2, 0, 0], [1, 0, 0], [0, 0, 0], [0, 1, 1], [0, 2, 2]),
        },
      ],
    },
    {
      profileId: HARMONY_PROFILE_IDS.darkwave,
      decisionSlots: [
        {
          slot: "rhythm",
          candidates: ["sparse-4", "steady-6", "active-8"],
          energyWeights: rows([8, 2, 1], [7, 3, 1], [5, 5, 2], [3, 7, 3], [2, 7, 5]),
          complexityAdditions: same([0, 0, 0]),
        },
        {
          slot: "register",
          candidates: ["lower", "middle"],
          energyWeights: same([7, 3]),
          complexityAdditions: rows([2, 0], [1, 0], [0, 0], [0, 1], [0, 2]),
        },
        {
          slot: "tension",
          candidates: ["chordal", "diatonic-passing"],
          energyWeights: same([4, 4]),
          complexityAdditions: rows([2, 0], [1, 0], [0, 0], [0, 2], [0, 4]),
        },
        {
          slot: "displacement",
          candidates: ["none", "later-480", "earlier-480"],
          energyWeights: same([5, 4, 2]),
          complexityAdditions: rows([2, 0, 0], [1, 0, 0], [0, 0, 0], [0, 2, 1], [0, 3, 2]),
        },
      ],
    },
    {
      profileId: HARMONY_PROFILE_IDS.midtempoCyberpunk,
      decisionSlots: [
        {
          slot: "rhythm",
          candidates: ["sparse-4", "steady-6", "active-8"],
          energyWeights: rows([6, 4, 1], [5, 5, 1], [4, 6, 3], [3, 7, 4], [2, 7, 6]),
          complexityAdditions: same([0, 0, 0]),
        },
        {
          slot: "register",
          candidates: ["lower", "middle", "upper"],
          energyWeights: rows([5, 5, 2], [4, 6, 2], [3, 7, 3], [2, 7, 5], [1, 6, 7]),
          complexityAdditions: same([0, 0, 0]),
        },
        {
          slot: "tension",
          candidates: ["chordal", "diatonic-passing"],
          energyWeights: same([5, 3]),
          complexityAdditions: rows([2, 0], [1, 0], [0, 0], [0, 2], [0, 4]),
        },
        {
          slot: "displacement",
          candidates: ["none", "earlier-480", "later-480"],
          energyWeights: same([4, 4, 3]),
          complexityAdditions: rows([2, 0, 0], [1, 0, 0], [0, 0, 0], [0, 2, 2], [0, 3, 3]),
        },
      ],
    },
  ],
} as const satisfies MotifGenreProfileConfigurationDataV1;

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const key of Reflect.ownKeys(value)) deepFreeze(Reflect.get(value, key));
  return Object.freeze(value);
}

export const MOTIF_GENRE_PROFILE_CONFIGURATION_V1: MotifGenreProfileConfigurationDataV1 =
  deepFreeze(SOURCE);

export type MotifGenreProfileConfigurationFailureKindV1 =
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

export class MotifGenreProfileConfigurationError extends RangeError {
  readonly owner = "profile.version" as const;
  constructor(
    readonly kind: MotifGenreProfileConfigurationFailureKindV1,
    message: string,
  ) {
    super(message);
    this.name = "MotifGenreProfileConfigurationError";
  }
}

type UnknownRecord = Record<PropertyKey, unknown>;

function fail(kind: MotifGenreProfileConfigurationFailureKindV1, field: string): never {
  throw new MotifGenreProfileConfigurationError(
    kind,
    `${field} must match canonical Motif profile data.`,
  );
}

function record(value: unknown): value is UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactDataProperties(value: UnknownRecord, expected: readonly string[]): boolean {
  const keys = Reflect.ownKeys(value);
  return (
    keys.length === expected.length &&
    expected.every((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor !== undefined && Object.hasOwn(descriptor, "value");
    })
  );
}

function hasDenseDataElements(value: unknown, expectedLength: number): value is unknown[] {
  if (!Array.isArray(value) || value.length !== expectedLength) return false;
  for (let index = 0; index < expectedLength; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined || !Object.hasOwn(descriptor, "value")) return false;
  }
  return true;
}

function exactArray(
  value: unknown,
  expected: readonly unknown[],
  kind: MotifGenreProfileConfigurationFailureKindV1,
  field: string,
): asserts value is unknown[] {
  if (!hasDenseDataElements(value, expected.length)) fail(kind, field);
  for (let index = 0; index < expected.length; index += 1) {
    if (value[index] !== expected[index]) fail(kind, `${field}[${index}]`);
  }
}

function validateRows(
  value: unknown,
  expected: OrderedWeightRows,
  kind: "INVALID_ENERGY_TABLE" | "INVALID_COMPLEXITY_TABLE",
  field: string,
): asserts value is UnknownRecord[] {
  if (!hasDenseDataElements(value, expected.length)) fail(kind, field);
  for (let rowIndex = 0; rowIndex < expected.length; rowIndex += 1) {
    const row = value[rowIndex];
    const expectedRow = expected[rowIndex];
    if (
      !record(row) ||
      !exactDataProperties(row, ["level", "values"]) ||
      row.level !== expectedRow.level ||
      !Array.isArray(row.values)
    )
      fail(kind, `${field}[${rowIndex}]`);
    if (row.values.length !== expectedRow.values.length)
      fail("INVALID_VECTOR_ALIGNMENT", `${field}[${rowIndex}].values`);
    if (!hasDenseDataElements(row.values, expectedRow.values.length))
      fail(kind, `${field}[${rowIndex}].values`);
    for (let valueIndex = 0; valueIndex < expectedRow.values.length; valueIndex += 1) {
      const weight = row.values[valueIndex];
      if (!Number.isSafeInteger(weight) || (weight as number) < 0 || (weight as number) > 65_535)
        fail("INVALID_WEIGHT", `${field}[${rowIndex}].values[${valueIndex}]`);
      if (weight !== expectedRow.values[valueIndex])
        fail(kind, `${field}[${rowIndex}].values[${valueIndex}]`);
    }
  }
}

export function validateMotifGenreProfileConfigurationV1(
  configuration: unknown,
): MotifGenreProfileConfigurationDataV1 {
  if (!record(configuration) || !exactDataProperties(configuration, ["version", "profiles"]))
    fail("INVALID_CONFIGURATION_SHAPE", "configuration");
  if (configuration.version !== MOTIF_PROFILE_DATA_VERSION_V1)
    fail("INVALID_PROFILE_DATA_VERSION", "version");
  if (!hasDenseDataElements(configuration.profiles, SOURCE.profiles.length))
    fail("INVALID_PROFILE_SET", "profiles");

  for (let profileIndex = 0; profileIndex < SOURCE.profiles.length; profileIndex += 1) {
    const profile = configuration.profiles[profileIndex];
    const expectedProfile = SOURCE.profiles[profileIndex];
    if (
      !record(profile) ||
      !exactDataProperties(profile, ["profileId", "decisionSlots"]) ||
      profile.profileId !== expectedProfile.profileId ||
      !hasDenseDataElements(profile.decisionSlots, expectedProfile.decisionSlots.length)
    )
      fail("INVALID_PROFILE_SET", `profiles[${profileIndex}]`);

    for (let slotIndex = 0; slotIndex < expectedProfile.decisionSlots.length; slotIndex += 1) {
      const slot = profile.decisionSlots[slotIndex];
      const expectedSlot = expectedProfile.decisionSlots[slotIndex];
      if (
        !record(slot) ||
        !exactDataProperties(slot, [
          "slot",
          "candidates",
          "energyWeights",
          "complexityAdditions",
        ]) ||
        slot.slot !== expectedSlot.slot
      )
        fail("INVALID_SLOT_STRUCTURE", `profiles[${profileIndex}].decisionSlots[${slotIndex}]`);
      exactArray(
        slot.candidates,
        expectedSlot.candidates,
        "INVALID_CANDIDATES",
        `profiles[${profileIndex}].decisionSlots[${slotIndex}].candidates`,
      );
      validateRows(
        slot.energyWeights,
        expectedSlot.energyWeights,
        "INVALID_ENERGY_TABLE",
        `profiles[${profileIndex}].decisionSlots[${slotIndex}].energyWeights`,
      );
      validateRows(
        slot.complexityAdditions,
        expectedSlot.complexityAdditions,
        "INVALID_COMPLEXITY_TABLE",
        `profiles[${profileIndex}].decisionSlots[${slotIndex}].complexityAdditions`,
      );
      for (let energyIndex = 0; energyIndex < ENERGY_V1_VALUES.length; energyIndex += 1) {
        for (
          let complexityIndex = 0;
          complexityIndex < COMPLEXITY_V1_VALUES.length;
          complexityIndex += 1
        ) {
          for (
            let candidateIndex = 0;
            candidateIndex < expectedSlot.candidates.length;
            candidateIndex += 1
          ) {
            const energyValues = (slot.energyWeights[energyIndex] as UnknownRecord)
              .values as number[];
            const additions = (slot.complexityAdditions[complexityIndex] as UnknownRecord)
              .values as number[];
            const finalWeight = energyValues[candidateIndex] + additions[candidateIndex];
            if (!Number.isSafeInteger(finalWeight) || finalWeight <= 0 || finalWeight > 65_535) {
              fail(
                "INVALID_FINAL_WEIGHTS",
                `profiles[${profileIndex}].decisionSlots[${slotIndex}]`,
              );
            }
          }
        }
      }
    }
  }
  return configuration as MotifGenreProfileConfigurationDataV1;
}

function invariant(detail: string): never {
  throw new Error(`Motif profile configuration invariant failed: ${detail}.`);
}

export function buildMotifWeightedCandidatesV1<TSlot extends MotifPolicyDecisionSlotV1>(
  configuration: MotifGenreProfileConfigurationDataV1,
  profileId: HarmonyProfileId,
  slotId: TSlot,
  energy: EnergyV1,
  complexity: ComplexityV1,
): readonly WeightedCandidate<MotifPolicyCandidateBySlotV1[TSlot]>[] {
  validateMotifGenreProfileConfigurationV1(configuration);
  const profile = MOTIF_GENRE_PROFILE_CONFIGURATION_V1.profiles.find(
    (item) => item.profileId === profileId,
  );
  if (profile === undefined) invariant("unknown profile ID");
  const slot = profile.decisionSlots.find((item) => item.slot === slotId);
  if (slot === undefined) invariant("unknown decision slot");
  const energyRow = slot.energyWeights.find((row) => row.level === energy);
  if (energyRow === undefined || !ENERGY_V1_VALUES.includes(energy))
    invariant("unknown Energy value");
  const complexityRow = slot.complexityAdditions.find((row) => row.level === complexity);
  if (complexityRow === undefined || !COMPLEXITY_V1_VALUES.includes(complexity))
    invariant("unknown Complexity value");
  return Object.freeze(
    slot.candidates.map((value, index) =>
      Object.freeze({ value, weight: energyRow.values[index] + complexityRow.values[index] }),
    ),
  ) as readonly WeightedCandidate<MotifPolicyCandidateBySlotV1[TSlot]>[];
}

export function motifCandidateDomainForSlotV1(slot: MotifPolicyDecisionSlotV1): readonly unknown[] {
  if (slot === "rhythm") return MOTIF_RHYTHM_TEMPLATE_IDS_V1;
  if (slot === "register") return MOTIF_REGISTER_BANDS_V1;
  if (slot === "tension") return MOTIF_TENSION_MODES_V1;
  if (slot === "displacement") return MOTIF_PHRASE4_DISPLACEMENTS_V1;
  return invariant("unknown decision slot");
}
