import { projectResolvedMotifPlanV1 } from "../generators/motif-pitch-projector";
import { resolveMotifPlanV1 } from "../generators/motif-policy-resolver";
import { createChord, serializeChord } from "./chord";
import { createChordInversion, serializeChordInversion } from "./chord-inversion";
import { createChordQuality } from "./chord-quality";
import {
  createChordVoicing,
  isChordVoicingCompatibleWithChordInversion,
  serializeChordVoicing,
} from "./chord-voicing";
import { deriveComponentSeedV1 } from "./component-seed";
import {
  validateNormalizedCompositionIntentV1,
  type NormalizedCompositionIntentV1,
} from "./composition-intent";
import {
  type HarmonyProfileId,
  type HarmonyProgressionRealization,
  getHarmonyTemplate,
  isHarmonyTemplateSupportedForProfile,
  isHarmonyProfileId,
  realizeHarmonyTemplate,
} from "./harmony";
import { createKey, serializeKey } from "./key";
import {
  getMotifRhythmTemplateV1,
  MOTIF_PHRASE4_DISPLACEMENTS_V1,
  MOTIF_PHRASE_ROLES_V1,
  MOTIF_REGISTER_BANDS_V1,
  MOTIF_TENSION_MODES_V1,
} from "./motif-catalog";
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
  if (!Object.isFrozen(value)) return false;
  return Reflect.ownKeys(value).every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor !== undefined && "value" in descriptor && isDeeplyFrozen(descriptor.value);
  });
}

function exactKeys(
  value: unknown,
  expected: readonly string[],
  field: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    fail(field, `${field} must be an object.`);
  const record = value as Record<string, unknown>;
  if (
    Object.getPrototypeOf(record) !== Object.prototype ||
    Object.getOwnPropertySymbols(record).length !== 0 ||
    Object.getOwnPropertyNames(record).join(",") !== expected.join(",") ||
    expected.some((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(record, key);
      return descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable;
    })
  )
    fail(field, `${field} fields or field order are invalid.`);
  return record;
}

function denseArray(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value)) fail(field, `${field} must be an array.`);
  const expectedNames = [
    ...Array.from({ length: value.length }, (_, index) => String(index)),
    "length",
  ];
  if (
    Object.getPrototypeOf(value) !== Array.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0 ||
    Object.getOwnPropertyNames(value).join(",") !== expectedNames.join(",") ||
    Array.from({ length: value.length }, (_, index) => index).some((index) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      return descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable;
    })
  )
    fail(field, `${field} must be a dense canonical array.`);
  return value;
}

function validateHarmonySnapshot(snapshot: MotifHarmonySnapshotV1): Readonly<{
  snapshot: MotifHarmonySnapshotV1;
  harmony: HarmonyProgressionRealization;
}> {
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
  const sourceSlots = denseArray(record.slots, "provenance.harmony.slots");
  if (sourceSlots.length !== 4)
    fail("provenance.harmony.slots", "Harmony must contain exactly four slots.");
  const slots = sourceSlots.map((value, index) => {
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
    denseArray(voicing.midiPitches, `provenance.harmony.slots[${index}].voicing.midiPitches`);
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
  const harmony = Object.freeze({
    profile: record.profile,
    templateId: record.templateId,
    templateVersion: "v1" as const,
    key: canonicalKey,
    slots: Object.freeze(slots),
  });
  const reconstructed = snapshotHarmony(harmony);
  if (JSON.stringify(reconstructed) !== JSON.stringify(snapshot))
    fail("provenance.harmony", "Harmony snapshot is not canonical.");
  return Object.freeze({ snapshot: reconstructed, harmony });
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
  if (!isDeeplyFrozen(harmony)) fail("provenance.harmony", "Harmony must be deeply immutable.");
  const harmonyRecord = exactKeys(
    harmony,
    ["profile", "templateId", "templateVersion", "key", "slots"],
    "provenance.harmony",
  );
  if (!isHarmonyProfileId(harmony.profile)) fail("provenance.harmony.profile", "invalid profile.");
  if (typeof harmony.templateId !== "string" || harmony.templateId.length === 0)
    fail("provenance.harmony.templateId", "templateId must be non-empty.");
  if (harmony.templateVersion !== "v1")
    fail("provenance.harmony.templateVersion", "unsupported template version.");
  const sourceSlots = denseArray(harmony.slots, "provenance.harmony.slots");
  if (sourceSlots.length !== 4)
    fail("provenance.harmony.slots", "Harmony must contain exactly four slots.");

  let template: ReturnType<typeof getHarmonyTemplate>;
  try {
    template = getHarmonyTemplate(harmony.templateId);
  } catch {
    fail("provenance.harmony.templateId", "unknown Harmony template.");
  }
  if (!isHarmonyTemplateSupportedForProfile(harmony.profile, template))
    fail("provenance.harmony.templateId", "Harmony template is incompatible with profile.");
  const keyRecord = exactKeys(harmonyRecord.key, ["tonic", "scale"], "provenance.harmony.key");
  const canonicalKey = createKey(
    createPitchClass(keyRecord.tonic as number),
    createScaleType(keyRecord.scale),
  );
  if (canonicalKey.scale !== template.scale)
    fail("provenance.harmony.key.scale", "Harmony key scale must match its template.");
  const expectedChords = realizeHarmonyTemplate(template, canonicalKey);

  const slots = sourceSlots.map((value, index) => {
    const slot = exactKeys(
      value,
      ["index", "degree", "bars", "chord", "inversion", "voicing", "adjacentCost", "rationale"],
      `provenance.harmony.slots[${index}]`,
    );
    if (slot.index !== index)
      fail(`provenance.harmony.slots[${index}].index`, "invalid slot index.");
    if (slot.bars !== 2)
      fail(`provenance.harmony.slots[${index}].bars`, "each slot must span two bars.");
    const degree = createScaleDegree(slot.degree as number);
    const chordRecord = exactKeys(
      slot.chord,
      ["root", "quality"],
      `provenance.harmony.slots[${index}].chord`,
    );
    const chord = createChord(
      createPitchClass(chordRecord.root as number),
      createChordQuality(chordRecord.quality),
    );
    const inversion = createChordInversion(slot.inversion as number);
    const voicingRecord = exactKeys(
      slot.voicing,
      ["midiPitches"],
      `provenance.harmony.slots[${index}].voicing`,
    );
    denseArray(voicingRecord.midiPitches, `provenance.harmony.slots[${index}].voicing.midiPitches`);
    const voicing = createChordVoicing(voicingRecord.midiPitches);
    exactKeys(
      slot.rationale,
      ["preferenceRank", "tieBreak"],
      `provenance.harmony.slots[${index}].rationale`,
    );
    const expected = expectedChords[index];
    if (
      degree !== template.slots[index]?.degree ||
      slot.bars !== template.slots[index]?.bars ||
      chord.root !== expected?.root ||
      chord.quality !== expected?.quality
    )
      fail(`provenance.harmony.slots[${index}]`, "slot does not match its Harmony template.");
    if (!isChordVoicingCompatibleWithChordInversion(voicing, chord, inversion))
      fail(`provenance.harmony.slots[${index}].voicing`, "voicing is incompatible with chord.");
    return Object.freeze({
      index: slot.index,
      degree,
      bars: slot.bars,
      chord: deepFreeze(parsed(serializeChord(chord))),
      inversion: deepFreeze(parsed(serializeChordInversion(inversion))),
      voicing: deepFreeze(parsed(serializeChordVoicing(voicing))),
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

function assertPlanResolution(
  plan: ResolvedMotifPlanV1,
  profileId: HarmonyProfileId,
  intent: NormalizedCompositionIntentV1,
  componentSeed: number,
): void {
  const expected = resolveMotifPlanV1({ profileId, ...intent }, componentSeed);
  if (JSON.stringify(plan) !== JSON.stringify(expected))
    fail("plan", "plan must equal the deterministic resolution of its recorded inputs.");
}

function copyPlan(plan: ResolvedMotifPlanV1): ResolvedMotifPlanV1 {
  const record = exactKeys(
    plan,
    [
      "policyVersion",
      "profileVersion",
      "rhythmTemplate",
      "registerBand",
      "tensionMode",
      "phrase4Displacement",
      "contourOffsets",
      "phraseRoles",
    ],
    "plan",
  );
  if (plan.policyVersion !== MOTIF_POLICY_VERSION_V1) fail("plan.policyVersion", "invalid policy.");
  if (plan.profileVersion !== MOTIF_PROFILE_DATA_VERSION_V1)
    fail("plan.profileVersion", "invalid profile version.");
  if (!MOTIF_REGISTER_BANDS_V1.includes(plan.registerBand))
    fail("plan.registerBand", "invalid register band.");
  if (!MOTIF_TENSION_MODES_V1.includes(plan.tensionMode))
    fail("plan.tensionMode", "invalid tension mode.");
  if (!MOTIF_PHRASE4_DISPLACEMENTS_V1.includes(plan.phrase4Displacement))
    fail("plan.phrase4Displacement", "invalid Phrase-4 displacement.");
  const template = getMotifRhythmTemplateV1(plan.rhythmTemplate);
  denseArray(record.contourOffsets, "plan.contourOffsets");
  denseArray(record.phraseRoles, "plan.phraseRoles");
  if (
    plan.contourOffsets.length !== template.contourOffsets.length ||
    Array.from(plan.contourOffsets).some((value, index) => value !== template.contourOffsets[index])
  )
    fail("plan.contourOffsets", "contour must match the selected catalog value.");
  if (
    plan.phraseRoles.length !== MOTIF_PHRASE_ROLES_V1.length ||
    Array.from(plan.phraseRoles).some((value, index) => value !== MOTIF_PHRASE_ROLES_V1[index])
  )
    fail("plan.phraseRoles", "phrase roles must match the catalog value.");
  return Object.freeze({
    policyVersion: MOTIF_POLICY_VERSION_V1,
    profileVersion: MOTIF_PROFILE_DATA_VERSION_V1,
    rhythmTemplate: plan.rhythmTemplate,
    registerBand: plan.registerBand,
    tensionMode: plan.tensionMode,
    phrase4Displacement: plan.phrase4Displacement,
    contourOffsets: template.contourOffsets,
    phraseRoles: MOTIF_PHRASE_ROLES_V1,
  });
}

function copyEvents(value: readonly MotifEventV1[]): readonly MotifEventV1[] {
  const source = denseArray(value, "events");
  const events: MotifEventV1[] = [];
  let previousEnd = 0;
  for (let index = 0; index < source.length; index += 1) {
    const record = exactKeys(
      source[index],
      ["pitch", "startTick", "durationTicks"],
      `events[${index}]`,
    );
    let event: MotifEventV1;
    try {
      event = createMotifEventV1({
        pitch: record.pitch as number,
        startTick: record.startTick as number,
        durationTicks: record.durationTicks as number,
      });
    } catch {
      fail(`events[${index}]`, "event is invalid.");
    }
    if (event.startTick < previousEnd || event.startTick + event.durationTicks > 8 * 4 * 960)
      fail(`events[${index}]`, "events must be ordered, non-overlapping, and inside eight bars.");
    previousEnd = event.startTick + event.durationTicks;
    events.push(event);
  }
  return Object.freeze(events);
}

function assertCanonicalProjection(
  events: readonly MotifEventV1[],
  harmony: HarmonyProgressionRealization,
  plan: ResolvedMotifPlanV1,
): void {
  let expected: readonly MotifEventV1[];
  try {
    expected = projectResolvedMotifPlanV1(harmony, plan);
  } catch {
    fail("events", "events cannot be verified against the resolved Motif projection.");
  }
  if (
    events.length !== expected.length ||
    events.some(
      (event, index) =>
        event.pitch !== expected[index]?.pitch ||
        event.startTick !== expected[index]?.startTick ||
        event.durationTicks !== expected[index]?.durationTicks,
    )
  )
    fail("events", "events must equal the canonical resolved Motif projection.");
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
  const events = copyEvents(input.events);
  const intent = validateNormalizedCompositionIntentV1(input.intent);
  const rootSeed = uint32(input.rootSeed, "provenance.rootSeed");
  const componentSeed = uint32(input.componentSeed, "provenance.componentSeed");
  if (componentSeed !== deriveComponentSeedV1(rootSeed, "motif"))
    fail("provenance.componentSeed", "component seed does not match root-seed derivation.");
  assertPlanResolution(plan, input.profileId, intent, componentSeed);
  assertCanonicalProjection(events, input.harmony, plan);
  const provenance = Object.freeze({
    profile: Object.freeze({ id: input.profileId, version: MOTIF_PROFILE_DATA_VERSION_V1 }),
    policy: Object.freeze({ version: MOTIF_POLICY_VERSION_V1 }),
    contour: Object.freeze({ version: MOTIF_CONTOUR_VERSION_V1 }),
    rhythm: Object.freeze({ version: MOTIF_RHYTHM_VERSION_V1 }),
    seedDerivation: Object.freeze({ version: MOTIF_SEED_DERIVATION_VERSION_V1 }),
    prng: Object.freeze({ version: MOTIF_PRNG_VERSION_V1 }),
    weightedChoice: Object.freeze({ version: MOTIF_WEIGHTED_CHOICE_VERSION_V1 }),
    rootSeed,
    componentSeed,
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
  exactKeys(result, ["schema", "generatorVersion", "plan", "events", "provenance"], "result");
  if (result.schema !== MOTIF_GENERATION_RESULT_SCHEMA_V1) fail("schema", "invalid result schema.");
  if (result.generatorVersion !== MOTIF_GENERATOR_VERSION_V1)
    fail("generatorVersion", "invalid generator version.");
  if (!isDeeplyFrozen(result)) fail("result", "result must be deeply immutable.");
  const plan = copyPlan(result.plan);
  const events = copyEvents(result.events);
  const provenanceRecord = exactKeys(
    result.provenance,
    [
      "profile",
      "policy",
      "contour",
      "rhythm",
      "seedDerivation",
      "prng",
      "weightedChoice",
      "rootSeed",
      "componentSeed",
      "normalizedInputs",
      "harmony",
      "parent",
    ],
    "provenance",
  );
  exactKeys(provenanceRecord.profile, ["id", "version"], "provenance.profile");
  exactKeys(provenanceRecord.policy, ["version"], "provenance.policy");
  exactKeys(provenanceRecord.contour, ["version"], "provenance.contour");
  exactKeys(provenanceRecord.rhythm, ["version"], "provenance.rhythm");
  exactKeys(provenanceRecord.seedDerivation, ["version"], "provenance.seedDerivation");
  exactKeys(provenanceRecord.prng, ["version"], "provenance.prng");
  exactKeys(provenanceRecord.weightedChoice, ["version"], "provenance.weightedChoice");
  const normalizedInputs = exactKeys(
    provenanceRecord.normalizedInputs,
    ["intent"],
    "provenance.normalizedInputs",
  );
  const intentRecord = exactKeys(
    normalizedInputs.intent,
    ["energy", "complexity"],
    "provenance.normalizedInputs.intent",
  );
  const intent = validateNormalizedCompositionIntentV1({
    energy: intentRecord.energy,
    complexity: intentRecord.complexity,
  });
  const rootSeed = uint32(result.provenance.rootSeed, "provenance.rootSeed");
  const componentSeed = uint32(result.provenance.componentSeed, "provenance.componentSeed");
  if (componentSeed !== deriveComponentSeedV1(rootSeed, "motif"))
    fail("provenance.componentSeed", "component seed does not match root-seed derivation.");
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
  if (!isHarmonyProfileId(result.provenance.profile.id))
    fail("provenance.profile.id", "invalid profile.");
  assertPlanResolution(plan, result.provenance.profile.id, intent, componentSeed);
  let validatedHarmony: ReturnType<typeof validateHarmonySnapshot>;
  try {
    validatedHarmony = validateHarmonySnapshot(result.provenance.harmony);
  } catch (error) {
    if (error instanceof MotifResultValueError) throw error;
    fail("provenance.harmony", "Harmony snapshot is not canonical.");
  }
  assertCanonicalProjection(events, validatedHarmony.harmony, plan);
  return JSON.stringify({
    schema: MOTIF_GENERATION_RESULT_SCHEMA_V1,
    generatorVersion: MOTIF_GENERATOR_VERSION_V1,
    plan,
    events,
    provenance: {
      profile: { id: result.provenance.profile.id, version: MOTIF_PROFILE_DATA_VERSION_V1 },
      policy: { version: MOTIF_POLICY_VERSION_V1 },
      contour: { version: MOTIF_CONTOUR_VERSION_V1 },
      rhythm: { version: MOTIF_RHYTHM_VERSION_V1 },
      seedDerivation: { version: MOTIF_SEED_DERIVATION_VERSION_V1 },
      prng: { version: MOTIF_PRNG_VERSION_V1 },
      weightedChoice: { version: MOTIF_WEIGHTED_CHOICE_VERSION_V1 },
      rootSeed,
      componentSeed,
      normalizedInputs: { intent },
      harmony: validatedHarmony.snapshot,
      parent: null,
    },
  });
}
