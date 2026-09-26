import { createChord, serializeChord } from "./chord";
import { createChordInversion, serializeChordInversion } from "./chord-inversion";
import { createChordQuality } from "./chord-quality";
import { createChordVoicing, serializeChordVoicing } from "./chord-voicing";
import {
  validateNormalizedCompositionIntentV1,
  type NormalizedCompositionIntentV1,
} from "./composition-intent";
import {
  type HarmonyProfileId,
  type HarmonyProgressionRealization,
  isHarmonyProfileId,
} from "./harmony";
import { createKey, serializeKey } from "./key";
import { getMotifRhythmTemplateV1, MOTIF_PHRASE_ROLES_V1 } from "./motif-catalog";
import { createMotifEventV1, type MotifEventV1 } from "./motif-event";
import { MOTIF_POLICY_VERSION_V1, type ResolvedMotifPlanV1 } from "./motif-policy";
import { MOTIF_PROFILE_DATA_VERSION_V1 } from "./motif-profile-configuration";
import { createPitchClass } from "./pitch";
import { createScaleDegree, createScaleType } from "./scale";

export const MOTIF_GENERATION_RESULT_SCHEMA_V1 = "nightdrive.motif-generation-result.v1" as const;
export const MOTIF_GENERATOR_VERSION_V1 = "nightdrive.generator.motif.v1" as const;
export const MOTIF_CONTOUR_VERSION_V1 = "nightdrive.motif-contour.v1" as const;
export const MOTIF_RHYTHM_VERSION_V1 = "nightdrive.motif-rhythm.v1" as const;
export const MOTIF_SEED_DERIVATION_VERSION_V1 = "nightdrive.seed-derivation.component.v1" as const;
export const MOTIF_PRNG_VERSION_V1 = "nightdrive.prng.mulberry32.v1" as const;
export const MOTIF_WEIGHTED_CHOICE_VERSION_V1 =
  "nightdrive.weighted-choice.uint32-modulo.v1" as const;

type SerializedKey = ReturnType<typeof JSON.parse>;

export type MotifHarmonySnapshotV1 = Readonly<{
  profile: HarmonyProfileId;
  templateId: string;
  templateVersion: "v1";
  key: SerializedKey;
  slots: readonly Readonly<{
    index: number;
    degree: number;
    bars: number;
    chord: unknown;
    inversion: unknown;
    voicing: unknown;
  }>[];
}>;

export type MotifProvenanceV1 = Readonly<{
  profile: Readonly<{ id: HarmonyProfileId; version: typeof MOTIF_PROFILE_DATA_VERSION_V1 }>;
  policy: Readonly<{ version: typeof MOTIF_POLICY_VERSION_V1 }>;
  contour: Readonly<{ version: typeof MOTIF_CONTOUR_VERSION_V1 }>;
  rhythm: Readonly<{ version: typeof MOTIF_RHYTHM_VERSION_V1 }>;
  seedDerivation: Readonly<{ version: typeof MOTIF_SEED_DERIVATION_VERSION_V1 }>;
  prng: Readonly<{ version: typeof MOTIF_PRNG_VERSION_V1 }>;
  weightedChoice: Readonly<{ version: typeof MOTIF_WEIGHTED_CHOICE_VERSION_V1 }>;
  rootSeed: number;
  componentSeed: number;
  normalizedInputs: Readonly<{ intent: NormalizedCompositionIntentV1 }>;
  harmony: MotifHarmonySnapshotV1;
  parent: null;
}>;

export type MotifGenerationResultV1 = Readonly<{
  schema: typeof MOTIF_GENERATION_RESULT_SCHEMA_V1;
  generatorVersion: typeof MOTIF_GENERATOR_VERSION_V1;
  plan: ResolvedMotifPlanV1;
  events: readonly MotifEventV1[];
  provenance: MotifProvenanceV1;
}>;

export class MotifResultValueError extends RangeError {
  readonly code = "INVALID_MOTIF_RESULT" as const;
  readonly field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = "MotifResultValueError";
    this.field = field;
  }
}

function fail(field: string, message: string): never {
  throw new MotifResultValueError(field, message);
}

function uint32(value: unknown, field: string): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 0xffff_ffff ||
    Object.is(value, -0)
  )
    fail(field, `${field} must be a canonical uint32.`);
  return value;
}

function parsed(serialized: string): unknown {
  return JSON.parse(serialized) as unknown;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function isDeeplyFrozen(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return true;
  return Object.isFrozen(value) && Object.values(value).every(isDeeplyFrozen);
}

function exactKeys(
  value: unknown,
  expected: readonly string[],
  field: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    fail(field, `${field} must be an object.`);
  const record = value as Record<string, unknown>;
  if (Object.keys(record).join(",") !== expected.join(","))
    fail(field, `${field} fields or field order are invalid.`);
  return record;
}

function validateHarmonySnapshot(snapshot: MotifHarmonySnapshotV1): void {
  const record = exactKeys(
    snapshot,
    ["profile", "templateId", "templateVersion", "key", "slots"],
    "provenance.harmony",
  );
  if (!isHarmonyProfileId(record.profile)) fail("provenance.harmony.profile", "invalid profile.");
  if (typeof record.templateId !== "string" || record.templateId.length === 0)
    fail("provenance.harmony.templateId", "templateId must be non-empty.");
  if (record.templateVersion !== "v1")
    fail("provenance.harmony.templateVersion", "unsupported template version.");
  const key = exactKeys(
    record.key,
    ["schema", "tonicSemitoneClass", "scale"],
    "provenance.harmony.key",
  );
  if (key.schema !== "nightdrive.key.v1") fail("provenance.harmony.key.schema", "invalid schema.");
  const canonicalKey = createKey(
    createPitchClass(key.tonicSemitoneClass as number),
    createScaleType(key.scale),
  );
  if (!Array.isArray(record.slots) || record.slots.length !== 4)
    fail("provenance.harmony.slots", "Harmony must contain exactly four slots.");
  const slots = record.slots.map((value, index) => {
    const slot = exactKeys(
      value,
      ["index", "degree", "bars", "chord", "inversion", "voicing"],
      `provenance.harmony.slots[${index}]`,
    );
    if (slot.index !== index || slot.bars !== 2 || !Number.isSafeInteger(slot.degree))
      fail(`provenance.harmony.slots[${index}]`, "invalid slot identity.");
    const chord = exactKeys(
      slot.chord,
      ["schema", "rootSemitoneClass", "quality"],
      `provenance.harmony.slots[${index}].chord`,
    );
    if (chord.schema !== "nightdrive.chord.v1")
      fail(`provenance.harmony.slots[${index}].chord.schema`, "invalid schema.");
    const inversion = exactKeys(
      slot.inversion,
      ["schema", "memberIndex"],
      `provenance.harmony.slots[${index}].inversion`,
    );
    if (inversion.schema !== "nightdrive.chord-inversion.v1")
      fail(`provenance.harmony.slots[${index}].inversion.schema`, "invalid schema.");
    const voicing = exactKeys(
      slot.voicing,
      ["schema", "midiPitches"],
      `provenance.harmony.slots[${index}].voicing`,
    );
    if (voicing.schema !== "nightdrive.chord-voicing.v1")
      fail(`provenance.harmony.slots[${index}].voicing.schema`, "invalid schema.");
    return Object.freeze({
      index,
      degree: createScaleDegree(slot.degree as number),
      bars: 2,
      chord: createChord(
        createPitchClass(chord.rootSemitoneClass as number),
        createChordQuality(chord.quality),
      ),
      inversion: createChordInversion(inversion.memberIndex as number),
      voicing: createChordVoicing(voicing.midiPitches),
      adjacentCost: null,
      rationale: Object.freeze({ preferenceRank: 0, tieBreak: "snapshot validation" }),
    });
  });
  const reconstructed = snapshotHarmony(
    Object.freeze({
      profile: record.profile,
      templateId: record.templateId,
      templateVersion: "v1",
      key: canonicalKey,
      slots: Object.freeze(slots),
    }),
  );
  if (JSON.stringify(reconstructed) !== JSON.stringify(snapshot))
    fail("provenance.harmony", "Harmony snapshot is not canonical.");
}

function checkedHarmonySnapshot(harmony: HarmonyProgressionRealization): MotifHarmonySnapshotV1 {
  try {
    return snapshotHarmony(harmony);
  } catch (error) {
    if (error instanceof MotifResultValueError) throw error;
    fail("provenance.harmony", "Harmony is not canonical.");
  }
}

function snapshotHarmony(harmony: HarmonyProgressionRealization): MotifHarmonySnapshotV1 {
  if (!isHarmonyProfileId(harmony.profile)) fail("provenance.harmony.profile", "invalid profile.");
  if (typeof harmony.templateId !== "string" || harmony.templateId.length === 0)
    fail("provenance.harmony.templateId", "templateId must be non-empty.");
  if (harmony.templateVersion !== "v1")
    fail("provenance.harmony.templateVersion", "unsupported template version.");
  if (!Array.isArray(harmony.slots) || harmony.slots.length !== 4)
    fail("provenance.harmony.slots", "Harmony must contain exactly four slots.");

  const slots = harmony.slots.map((slot, index) => {
    if (slot.index !== index)
      fail(`provenance.harmony.slots[${index}].index`, "invalid slot index.");
    if (slot.bars !== 2)
      fail(`provenance.harmony.slots[${index}].bars`, "each slot must span two bars.");
    if (!Number.isSafeInteger(slot.degree) || slot.degree < 0 || slot.degree > 6)
      fail(`provenance.harmony.slots[${index}].degree`, "invalid scale degree.");
    return Object.freeze({
      index: slot.index,
      degree: slot.degree,
      bars: slot.bars,
      chord: deepFreeze(parsed(serializeChord(slot.chord))),
      inversion: deepFreeze(parsed(serializeChordInversion(slot.inversion))),
      voicing: deepFreeze(parsed(serializeChordVoicing(slot.voicing))),
    });
  });

  return Object.freeze({
    profile: harmony.profile,
    templateId: harmony.templateId,
    templateVersion: harmony.templateVersion,
    key: deepFreeze(parsed(serializeKey(harmony.key))),
    slots: Object.freeze(slots),
  });
}

function copyPlan(plan: ResolvedMotifPlanV1): ResolvedMotifPlanV1 {
  if (plan.policyVersion !== MOTIF_POLICY_VERSION_V1) fail("plan.policyVersion", "invalid policy.");
  if (plan.profileVersion !== MOTIF_PROFILE_DATA_VERSION_V1)
    fail("plan.profileVersion", "invalid profile version.");
  const template = getMotifRhythmTemplateV1(plan.rhythmTemplate);
  if (
    plan.contourOffsets.length !== template.contourOffsets.length ||
    plan.contourOffsets.some((value, index) => value !== template.contourOffsets[index])
  )
    fail("plan.contourOffsets", "contour must match the selected catalog value.");
  if (
    plan.phraseRoles.length !== MOTIF_PHRASE_ROLES_V1.length ||
    plan.phraseRoles.some((value, index) => value !== MOTIF_PHRASE_ROLES_V1[index])
  )
    fail("plan.phraseRoles", "phrase roles must match the catalog value.");
  return Object.freeze({
    ...plan,
    contourOffsets: template.contourOffsets,
    phraseRoles: MOTIF_PHRASE_ROLES_V1,
  });
}

export function createMotifGenerationResultV1(
  input: Readonly<{
    plan: ResolvedMotifPlanV1;
    events: readonly MotifEventV1[];
    harmony: HarmonyProgressionRealization;
    profileId: HarmonyProfileId;
    rootSeed: number;
    componentSeed: number;
    intent: NormalizedCompositionIntentV1;
  }>,
): MotifGenerationResultV1 {
  if (!isHarmonyProfileId(input.profileId)) fail("provenance.profile.id", "invalid profile.");
  if (input.profileId !== input.harmony.profile)
    fail("provenance.profile.id", "profile must match supplied Harmony.");
  const plan = copyPlan(input.plan);
  const events = Object.freeze(input.events.map((event) => createMotifEventV1({ ...event })));
  const intent = validateNormalizedCompositionIntentV1(input.intent);
  const provenance = Object.freeze({
    profile: Object.freeze({ id: input.profileId, version: MOTIF_PROFILE_DATA_VERSION_V1 }),
    policy: Object.freeze({ version: MOTIF_POLICY_VERSION_V1 }),
    contour: Object.freeze({ version: MOTIF_CONTOUR_VERSION_V1 }),
    rhythm: Object.freeze({ version: MOTIF_RHYTHM_VERSION_V1 }),
    seedDerivation: Object.freeze({ version: MOTIF_SEED_DERIVATION_VERSION_V1 }),
    prng: Object.freeze({ version: MOTIF_PRNG_VERSION_V1 }),
    weightedChoice: Object.freeze({ version: MOTIF_WEIGHTED_CHOICE_VERSION_V1 }),
    rootSeed: uint32(input.rootSeed, "provenance.rootSeed"),
    componentSeed: uint32(input.componentSeed, "provenance.componentSeed"),
    normalizedInputs: Object.freeze({ intent }),
    harmony: checkedHarmonySnapshot(input.harmony),
    parent: null,
  });
  return Object.freeze({
    schema: MOTIF_GENERATION_RESULT_SCHEMA_V1,
    generatorVersion: MOTIF_GENERATOR_VERSION_V1,
    plan,
    events,
    provenance,
  });
}

export function serializeMotifGenerationResultV1(result: MotifGenerationResultV1): string {
  if (result.schema !== MOTIF_GENERATION_RESULT_SCHEMA_V1) fail("schema", "invalid result schema.");
  if (result.generatorVersion !== MOTIF_GENERATOR_VERSION_V1)
    fail("generatorVersion", "invalid generator version.");
  if (Object.keys(result).join(",") !== "schema,generatorVersion,plan,events,provenance")
    fail("result", "result fields or field order are invalid.");
  if (!isDeeplyFrozen(result)) fail("result", "result must be deeply immutable.");
  copyPlan(result.plan);
  uint32(result.provenance.rootSeed, "provenance.rootSeed");
  uint32(result.provenance.componentSeed, "provenance.componentSeed");
  validateNormalizedCompositionIntentV1(result.provenance.normalizedInputs.intent);
  if (
    result.provenance.profile.version !== MOTIF_PROFILE_DATA_VERSION_V1 ||
    result.provenance.policy.version !== MOTIF_POLICY_VERSION_V1 ||
    result.provenance.contour.version !== MOTIF_CONTOUR_VERSION_V1 ||
    result.provenance.rhythm.version !== MOTIF_RHYTHM_VERSION_V1 ||
    result.provenance.seedDerivation.version !== MOTIF_SEED_DERIVATION_VERSION_V1 ||
    result.provenance.prng.version !== MOTIF_PRNG_VERSION_V1 ||
    result.provenance.weightedChoice.version !== MOTIF_WEIGHTED_CHOICE_VERSION_V1 ||
    result.provenance.parent !== null
  )
    fail("provenance", "provenance identities are invalid.");
  if (result.provenance.profile.id !== result.provenance.harmony.profile)
    fail("provenance.profile.id", "profile must match Harmony snapshot.");
  try {
    validateHarmonySnapshot(result.provenance.harmony);
  } catch (error) {
    if (error instanceof MotifResultValueError) throw error;
    fail("provenance.harmony", "Harmony snapshot is not canonical.");
  }
  return JSON.stringify(result);
}
