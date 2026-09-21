import {
  type ArpEvent,
  type ArpRange,
  ArpValueError,
  createArpRange,
  deriveArpSlotCandidates,
} from "../music-domain/arpeggiator";
import {
  ARP_POLICY_VERSION_V1,
  ARP_POLICY_VERSION_V2,
  ARP_PROFILE_DATA_VERSION_V1,
  ARP_PROFILE_DATA_VERSION_V2,
  type ArpPolicyVersionV1,
  type ArpPolicyVersionV2,
  type ArpProfileDataVersionV1,
  type ArpProfileDataVersionV2,
} from "../music-domain/arpeggiator-policy-configuration";
import type { ArpPrngVersionV1 } from "../music-domain/arpeggiator-policy-generator";
import { createChord, serializeChord, type Chord } from "../music-domain/chord";
import {
  createChordInversion,
  serializeChordInversion,
  type ChordInversion,
} from "../music-domain/chord-inversion";
import { createChordQuality } from "../music-domain/chord-quality";
import {
  createChordVoicing,
  serializeChordVoicing,
  type ChordVoicing,
} from "../music-domain/chord-voicing";
import {
  COMPONENT_SEED_DERIVATION_VERSION_V1,
  type ComponentSeedDerivationVersionV1,
} from "../music-domain/component-seed";
import {
  COMPLEXITY_V1_VALUES,
  ENERGY_V1_VALUES,
  type ComplexityV1,
  type EnergyV1,
} from "../music-domain/composition-intent";
import {
  type HarmonyProfileId,
  type HarmonyProgressionRealization,
  isHarmonyProfileId,
} from "../music-domain/harmony";
import { createKey, serializeKey, type Key } from "../music-domain/key";
import {
  createDurationTicks,
  createTempoFromMicrosecondsPerQuarter,
  createTick,
  createTimeSignature,
  PPQ,
  serializeTempo,
  serializeTimeSignature,
  type Tempo,
  type TimeSignature,
  V1_BAR_COUNT,
  V1_SECTION_LENGTH_TICKS,
} from "../music-domain/musical-time";
import { createMidiPitch, createPitchClass } from "../music-domain/pitch";
import { PRNG_ALGORITHM_ID } from "../music-domain/prng";
import { createScaleDegree, createScaleType, type ScaleDegree } from "../music-domain/scale";

export const STAGE7_ARPEGGIATOR_AGGREGATE_SCHEMA_V1 =
  "nightdrive.stage7-arpeggiator-aggregate.v1" as const;
export const STAGE7_AGGREGATE_ENGINE_VERSION_V1 = "nightdrive.engine.stage7-aggregate.v1" as const;
export const STAGE7_ARPEGGIATOR_GENERATOR_VERSION_V1 =
  "nightdrive.generator.stage7-arpeggiator.v1" as const;
export const STAGE7_HARMONY_COMPONENT_SCHEMA_V1 = "nightdrive.stage7-harmony-component.v1" as const;
export const STAGE7_ARPEGGIATOR_COMPONENT_SCHEMA_V1 =
  "nightdrive.stage7-arpeggiator-component.v1" as const;

export type Stage7HarmonyContextSlotV1 = Readonly<{
  index: number;
  degree: ScaleDegree;
  bars: number;
  chord: Chord;
  inversion: ChordInversion;
  voicing: ChordVoicing;
}>;

export type Stage7HarmonyContextV1 = Readonly<{
  profile: HarmonyProfileId;
  templateId: string;
  templateVersion: "v1";
  key: Key;
  slots: readonly Stage7HarmonyContextSlotV1[];
}>;

export type Stage7ArpeggiatorAggregateV1 = Readonly<{
  schema: typeof STAGE7_ARPEGGIATOR_AGGREGATE_SCHEMA_V1;
  engineVersion: typeof STAGE7_AGGREGATE_ENGINE_VERSION_V1;
  generatorVersion: typeof STAGE7_ARPEGGIATOR_GENERATOR_VERSION_V1;
  section: Readonly<{
    ppq: typeof PPQ;
    barCount: typeof V1_BAR_COUNT;
    timeSignature: TimeSignature;
    tempo: Tempo;
  }>;
  components: Readonly<{
    harmony: Stage7HarmonyContextV1;
    arpeggiator: readonly ArpEvent[];
  }>;
  provenance: Readonly<{
    profile: Readonly<{
      id: HarmonyProfileId;
      version: ArpProfileDataVersionV1 | ArpProfileDataVersionV2;
    }>;
    policy: Readonly<{ version: ArpPolicyVersionV1 | ArpPolicyVersionV2 }>;
    seedDerivation: Readonly<{ version: ComponentSeedDerivationVersionV1 }>;
    prng: Readonly<{ version: ArpPrngVersionV1 }>;
    rootSeed: number;
    normalizedInputs: Readonly<{
      intent: Readonly<{ energy: EnergyV1; complexity: ComplexityV1 }>;
      range: ArpRange;
    }>;
    parent: null;
  }>;
  componentHashes: Readonly<{
    harmony: string;
    arpeggiator: string;
  }>;
  warnings: readonly [];
  resultHash: string;
}>;

export type Stage7AggregateErrorCode = "INVALID_AGGREGATE_RESULT";

export class Stage7AggregateValueError extends RangeError {
  readonly code: Stage7AggregateErrorCode;
  readonly field: string;

  constructor(code: Stage7AggregateErrorCode, field: string, message: string) {
    super(message);
    this.name = "Stage7AggregateValueError";
    this.code = code;
    this.field = field;
  }
}

type UnknownRecord = Record<PropertyKey, unknown>;

const TOP_LEVEL_FIELDS = Object.freeze([
  "schema",
  "engineVersion",
  "generatorVersion",
  "section",
  "components",
  "provenance",
  "componentHashes",
  "warnings",
  "resultHash",
] as const);
const SECTION_FIELDS = Object.freeze(["ppq", "barCount", "timeSignature", "tempo"] as const);
const TIME_SIGNATURE_FIELDS = Object.freeze(["numerator", "denominator"] as const);
const TEMPO_FIELDS = Object.freeze(["microsecondsPerQuarter"] as const);
const COMPONENT_FIELDS = Object.freeze(["harmony", "arpeggiator"] as const);
const HARMONY_FIELDS = Object.freeze([
  "profile",
  "templateId",
  "templateVersion",
  "key",
  "slots",
] as const);
const KEY_FIELDS = Object.freeze(["tonic", "scale"] as const);
const HARMONY_SLOT_FIELDS = Object.freeze([
  "index",
  "degree",
  "bars",
  "chord",
  "inversion",
  "voicing",
] as const);
const CHORD_FIELDS = Object.freeze(["root", "quality"] as const);
const VOICING_FIELDS = Object.freeze(["midiPitches"] as const);
const ARP_EVENT_FIELDS = Object.freeze(["pitch", "startTick", "durationTicks"] as const);
const PROVENANCE_FIELDS = Object.freeze([
  "profile",
  "policy",
  "seedDerivation",
  "prng",
  "rootSeed",
  "normalizedInputs",
  "parent",
] as const);
const PROFILE_FIELDS = Object.freeze(["id", "version"] as const);
const VERSION_FIELDS = Object.freeze(["version"] as const);
const NORMALIZED_INPUT_FIELDS = Object.freeze(["intent", "range"] as const);
const INTENT_FIELDS = Object.freeze(["energy", "complexity"] as const);
const RANGE_FIELDS = Object.freeze(["minMidiPitch", "maxMidiPitch"] as const);
const COMPONENT_HASH_FIELDS = Object.freeze(["harmony", "arpeggiator"] as const);
const LOWERCASE_SHA256 = /^[0-9a-f]{64}$/u;
const UINT32_MAX = 0xffff_ffff;
const FULL_MIDI_ARP_RANGE = createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 });

function invalid(field: string, message: string): never {
  throw new Stage7AggregateValueError("INVALID_AGGREGATE_RESULT", field, message);
}

function fieldPath(parent: string, property: string): string {
  return parent.length === 0 ? property : `${parent}.${property}`;
}

function isPlainRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireExactRecord(
  value: unknown,
  path: string,
  fields: readonly string[],
): UnknownRecord {
  if (!isPlainRecord(value)) {
    return invalid(path || "result", `${path || "result"} must be an ordinary data record.`);
  }

  for (const field of fields) {
    if (!Object.hasOwn(value, field)) {
      return invalid(fieldPath(path, field), `${fieldPath(path, field)} is required.`);
    }
  }

  const unexpectedSymbols = Reflect.ownKeys(value).filter(
    (key): key is symbol => typeof key === "symbol",
  );
  if (unexpectedSymbols.length > 0) {
    return invalid(path || "result", `${path || "result"} contains an unexpected symbol key.`);
  }

  const unexpected = Object.getOwnPropertyNames(value)
    .filter((field) => !fields.includes(field))
    .sort();
  if (unexpected.length > 0) {
    return invalid(
      fieldPath(path, unexpected[0] as string),
      `${fieldPath(path, unexpected[0] as string)} is not an owned aggregate field.`,
    );
  }

  for (const field of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, field);
    if (descriptor === undefined || !("value" in descriptor)) {
      return invalid(
        fieldPath(path, field),
        `${fieldPath(path, field)} must be an ordinary data property.`,
      );
    }
  }
  return value;
}

function requireDenseArray(value: unknown, path: string, exactLength?: number): readonly unknown[] {
  if (!Array.isArray(value)) return invalid(path, `${path} must be a dense ordered array.`);
  if (exactLength !== undefined && value.length !== exactLength) {
    return invalid(path, `${path} must contain exactly ${exactLength} entries.`);
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      return invalid(`${path}[${index}]`, `${path} must not contain sparse entries.`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, index);
    if (descriptor === undefined || !("value" in descriptor)) {
      return invalid(`${path}[${index}]`, `${path}[${index}] must be an ordinary data property.`);
    }
  }
  const unexpected = Object.getOwnPropertyNames(value)
    .filter((key) => key !== "length" && !/^(0|[1-9][0-9]*)$/u.test(key))
    .sort();
  if (unexpected.length > 0 || Object.getOwnPropertySymbols(value).length > 0) {
    return invalid(path, `${path} contains an unexpected array property.`);
  }
  return value;
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function requireSafeInteger(value: unknown, path: string, minimum?: number): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    !Number.isSafeInteger(value) ||
    (minimum !== undefined && value < minimum)
  ) {
    return invalid(path, `${path} must be a canonical safe integer.`);
  }
  return normalizeZero(value);
}

function copyTimeSignature(value: unknown, path: string): TimeSignature {
  const record = requireExactRecord(value, path, TIME_SIGNATURE_FIELDS);
  const numerator = requireSafeInteger(record.numerator, `${path}.numerator`, 1);
  const denominator = requireSafeInteger(record.denominator, `${path}.denominator`, 1);
  if (numerator !== 4) return invalid(`${path}.numerator`, `${path}.numerator must equal 4.`);
  if (denominator !== 4) {
    return invalid(`${path}.denominator`, `${path}.denominator must equal 4.`);
  }
  return createTimeSignature(numerator, denominator);
}

function copyTempo(value: unknown, path: string): Tempo {
  const record = requireExactRecord(value, path, TEMPO_FIELDS);
  const microsecondsPerQuarter = requireSafeInteger(
    record.microsecondsPerQuarter,
    `${path}.microsecondsPerQuarter`,
    1,
  );
  try {
    return createTempoFromMicrosecondsPerQuarter(microsecondsPerQuarter);
  } catch {
    return invalid(
      `${path}.microsecondsPerQuarter`,
      `${path}.microsecondsPerQuarter must be a canonical Tempo value.`,
    );
  }
}

function copySection(value: unknown): Stage7ArpeggiatorAggregateV1["section"] {
  const sectionRecord = requireExactRecord(value, "section", SECTION_FIELDS);
  if (sectionRecord.ppq !== PPQ) {
    return invalid("section.ppq", `section.ppq must equal ${PPQ}.`);
  }
  if (sectionRecord.barCount !== V1_BAR_COUNT) {
    return invalid("section.barCount", `section.barCount must equal ${V1_BAR_COUNT}.`);
  }
  return Object.freeze({
    ppq: PPQ,
    barCount: V1_BAR_COUNT,
    timeSignature: copyTimeSignature(sectionRecord.timeSignature, "section.timeSignature"),
    tempo: copyTempo(sectionRecord.tempo, "section.tempo"),
  });
}

function copyKey(value: unknown, path: string): Key {
  const record = requireExactRecord(value, path, KEY_FIELDS);
  let tonic: ReturnType<typeof createPitchClass>;
  try {
    tonic = createPitchClass(record.tonic as number);
  } catch {
    return invalid(`${path}.tonic`, `${path}.tonic must be a canonical PitchClass.`);
  }
  let scale: ReturnType<typeof createScaleType>;
  try {
    scale = createScaleType(record.scale as never);
  } catch {
    return invalid(`${path}.scale`, `${path}.scale must be a canonical ScaleType.`);
  }
  return createKey(tonic, scale);
}

function copyChord(value: unknown, path: string): Chord {
  const record = requireExactRecord(value, path, CHORD_FIELDS);
  let root: ReturnType<typeof createPitchClass>;
  try {
    root = createPitchClass(record.root as number);
  } catch {
    return invalid(`${path}.root`, `${path}.root must be a canonical PitchClass.`);
  }
  let quality: ReturnType<typeof createChordQuality>;
  try {
    quality = createChordQuality(record.quality as never);
  } catch {
    return invalid(`${path}.quality`, `${path}.quality must be a canonical ChordQuality.`);
  }
  return createChord(root, quality);
}

function copyInversion(value: unknown, path: string): ChordInversion {
  const inversion = requireSafeInteger(value, path, 0);
  try {
    return createChordInversion(inversion);
  } catch {
    return invalid(path, `${path} must be a canonical ChordInversion.`);
  }
}

function copyVoicing(value: unknown, path: string): ChordVoicing {
  const record = requireExactRecord(value, path, VOICING_FIELDS);
  const source = requireDenseArray(record.midiPitches, `${path}.midiPitches`, 3);
  const pitches = source.map((pitch, index) => {
    try {
      return createMidiPitch(pitch as number);
    } catch {
      return invalid(
        `${path}.midiPitches[${index}]`,
        `${path}.midiPitches[${index}] must be a canonical MidiPitch.`,
      );
    }
  });
  try {
    return createChordVoicing(pitches.map(normalizeZero));
  } catch {
    return invalid(`${path}.midiPitches`, `${path}.midiPitches must be strictly ascending.`);
  }
}

function copyHarmonySlot(value: unknown, path: string): Stage7HarmonyContextSlotV1 {
  const record = requireExactRecord(value, path, HARMONY_SLOT_FIELDS);
  const slotIndex = requireSafeInteger(record.index, `${path}.index`, 0);
  let degree: ScaleDegree;
  try {
    degree = createScaleDegree(record.degree as number);
  } catch {
    return invalid(`${path}.degree`, `${path}.degree must be a canonical ScaleDegree.`);
  }
  const bars = requireSafeInteger(record.bars, `${path}.bars`, 1);
  const chord = copyChord(record.chord, `${path}.chord`);
  const inversion = copyInversion(record.inversion, `${path}.inversion`);
  const voicing = copyVoicing(record.voicing, `${path}.voicing`);
  return Object.freeze({
    index: normalizeZero(slotIndex),
    degree,
    bars,
    chord,
    inversion,
    voicing,
  });
}

function copyHarmony(value: unknown, path: string): Stage7HarmonyContextV1 {
  const record = requireExactRecord(value, path, HARMONY_FIELDS);
  if (!isHarmonyProfileId(record.profile)) {
    return invalid(`${path}.profile`, `${path}.profile must be a canonical Harmony profile.`);
  }
  if (typeof record.templateId !== "string") {
    return invalid(`${path}.templateId`, `${path}.templateId must be a string.`);
  }
  if (record.templateVersion !== "v1") {
    return invalid(`${path}.templateVersion`, `${path}.templateVersion must equal v1.`);
  }
  const key = copyKey(record.key, `${path}.key`);
  const sourceSlots = requireDenseArray(record.slots, `${path}.slots`);
  const slots = Object.freeze(
    sourceSlots.map((slot, index) => copyHarmonySlot(slot, `${path}.slots[${index}]`)),
  );
  return Object.freeze({
    profile: record.profile,
    templateId: record.templateId,
    templateVersion: "v1",
    key,
    slots,
  });
}

function validateHarmonyCompatibility(harmony: Stage7HarmonyContextV1): void {
  try {
    deriveArpSlotCandidates(
      harmony as unknown as HarmonyProgressionRealization,
      FULL_MIDI_ARP_RANGE,
    );
  } catch (error) {
    if (error instanceof ArpValueError) {
      const field = error.field.startsWith("progression")
        ? error.field.replace(/^progression/u, "components.harmony")
        : "components.harmony";
      invalid(field, "components.harmony must be a valid canonical Harmony context.");
    }
    throw error;
  }
}

function copyArpEvent(value: unknown, index: number): ArpEvent {
  const path = `components.arpeggiator[${index}]`;
  const record = requireExactRecord(value, path, ARP_EVENT_FIELDS);
  let pitch: ReturnType<typeof createMidiPitch>;
  try {
    pitch = createMidiPitch(record.pitch as number);
  } catch {
    return invalid(`${path}.pitch`, `${path}.pitch must be a canonical MidiPitch.`);
  }
  const startValue = requireSafeInteger(record.startTick, `${path}.startTick`, 0);
  const durationValue = requireSafeInteger(record.durationTicks, `${path}.durationTicks`, 1);
  if (
    !Number.isSafeInteger(startValue + durationValue) ||
    startValue + durationValue > V1_SECTION_LENGTH_TICKS
  ) {
    return invalid(
      `${path}.durationTicks`,
      `${path} must end inside the canonical Stage 7 section.`,
    );
  }
  return Object.freeze({
    pitch: createMidiPitch(normalizeZero(pitch)),
    startTick: createTick(startValue),
    durationTicks: createDurationTicks(durationValue),
  });
}

function copyArpeggiator(value: unknown): readonly ArpEvent[] {
  const events = requireDenseArray(value, "components.arpeggiator");
  return Object.freeze(events.map((event, index) => copyArpEvent(event, index)));
}

function copyProfile(value: unknown): Stage7ArpeggiatorAggregateV1["provenance"]["profile"] {
  const path = "provenance.profile";
  const record = requireExactRecord(value, path, PROFILE_FIELDS);
  if (!isHarmonyProfileId(record.id)) {
    return invalid(`${path}.id`, `${path}.id must be a canonical Harmony profile.`);
  }
  if (
    record.version !== ARP_PROFILE_DATA_VERSION_V1 &&
    record.version !== ARP_PROFILE_DATA_VERSION_V2
  ) {
    return invalid(`${path}.version`, `${path}.version must be a supported profile identity.`);
  }
  return Object.freeze({ id: record.id, version: record.version });
}

function copyPolicy(value: unknown): Stage7ArpeggiatorAggregateV1["provenance"]["policy"] {
  const path = "provenance.policy";
  const record = requireExactRecord(value, path, VERSION_FIELDS);
  if (record.version !== ARP_POLICY_VERSION_V1 && record.version !== ARP_POLICY_VERSION_V2) {
    return invalid(`${path}.version`, `${path}.version must be a supported policy identity.`);
  }
  return Object.freeze({ version: record.version });
}

function copySeedDerivation(
  value: unknown,
): Stage7ArpeggiatorAggregateV1["provenance"]["seedDerivation"] {
  const path = "provenance.seedDerivation";
  const record = requireExactRecord(value, path, VERSION_FIELDS);
  if (record.version !== COMPONENT_SEED_DERIVATION_VERSION_V1) {
    return invalid(`${path}.version`, `${path}.version must be the supported derivation identity.`);
  }
  return Object.freeze({ version: COMPONENT_SEED_DERIVATION_VERSION_V1 });
}

function copyPrng(value: unknown): Stage7ArpeggiatorAggregateV1["provenance"]["prng"] {
  const path = "provenance.prng";
  const record = requireExactRecord(value, path, VERSION_FIELDS);
  if (record.version !== PRNG_ALGORITHM_ID) {
    return invalid(`${path}.version`, `${path}.version must be the supported PRNG identity.`);
  }
  return Object.freeze({ version: PRNG_ALGORITHM_ID });
}

function copyRootSeed(value: unknown): number {
  const rootSeed = requireSafeInteger(value, "provenance.rootSeed", 0);
  if (rootSeed > UINT32_MAX) {
    return invalid("provenance.rootSeed", "provenance.rootSeed must be a uint32 value.");
  }
  return rootSeed;
}

function copyIntent(value: unknown): Readonly<{ energy: EnergyV1; complexity: ComplexityV1 }> {
  const path = "provenance.normalizedInputs.intent";
  const record = requireExactRecord(value, path, INTENT_FIELDS);
  if (!ENERGY_V1_VALUES.includes(record.energy as EnergyV1)) {
    return invalid(`${path}.energy`, `${path}.energy must be a canonical Energy value.`);
  }
  if (!COMPLEXITY_V1_VALUES.includes(record.complexity as ComplexityV1)) {
    return invalid(
      `${path}.complexity`,
      `${path}.complexity must be a canonical Complexity value.`,
    );
  }
  return Object.freeze({
    energy: record.energy as EnergyV1,
    complexity: record.complexity as ComplexityV1,
  });
}

function copyRange(value: unknown): ArpRange {
  const path = "provenance.normalizedInputs.range";
  const record = requireExactRecord(value, path, RANGE_FIELDS);
  let minimum: ReturnType<typeof createMidiPitch>;
  try {
    minimum = createMidiPitch(record.minMidiPitch as number);
  } catch {
    return invalid(`${path}.minMidiPitch`, `${path}.minMidiPitch must be a MidiPitch.`);
  }
  let maximum: ReturnType<typeof createMidiPitch>;
  try {
    maximum = createMidiPitch(record.maxMidiPitch as number);
  } catch {
    return invalid(`${path}.maxMidiPitch`, `${path}.maxMidiPitch must be a MidiPitch.`);
  }
  if (minimum > maximum) return invalid(path, `${path} bounds must be ordered.`);
  return createArpRange({
    minMidiPitch: normalizeZero(minimum),
    maxMidiPitch: normalizeZero(maximum),
  });
}

function copyNormalizedInputs(
  value: unknown,
): Stage7ArpeggiatorAggregateV1["provenance"]["normalizedInputs"] {
  const path = "provenance.normalizedInputs";
  const record = requireExactRecord(value, path, NORMALIZED_INPUT_FIELDS);
  return Object.freeze({
    intent: copyIntent(record.intent),
    range: copyRange(record.range),
  });
}

function copyProvenance(value: unknown): Stage7ArpeggiatorAggregateV1["provenance"] {
  const record = requireExactRecord(value, "provenance", PROVENANCE_FIELDS);
  const profile = copyProfile(record.profile);
  const policy = copyPolicy(record.policy);
  const seedDerivation = copySeedDerivation(record.seedDerivation);
  const prng = copyPrng(record.prng);
  const rootSeed = copyRootSeed(record.rootSeed);
  const normalizedInputs = copyNormalizedInputs(record.normalizedInputs);
  if (record.parent !== null) {
    return invalid("provenance.parent", "provenance.parent must be exactly null.");
  }
  return Object.freeze({
    profile,
    policy,
    seedDerivation,
    prng,
    rootSeed,
    normalizedInputs,
    parent: null,
  });
}

function copyDigest(value: unknown, path: string): string {
  if (typeof value !== "string" || !LOWERCASE_SHA256.test(value)) {
    return invalid(path, `${path} must be a lowercase 64-hex-character digest.`);
  }
  return value;
}

function copyComponentHashes(value: unknown): Stage7ArpeggiatorAggregateV1["componentHashes"] {
  const record = requireExactRecord(value, "componentHashes", COMPONENT_HASH_FIELDS);
  return Object.freeze({
    harmony: copyDigest(record.harmony, "componentHashes.harmony"),
    arpeggiator: copyDigest(record.arpeggiator, "componentHashes.arpeggiator"),
  });
}

function validateVersionPair(
  profileVersion: ArpProfileDataVersionV1 | ArpProfileDataVersionV2,
  policyVersion: ArpPolicyVersionV1 | ArpPolicyVersionV2,
): void {
  const isV1 =
    profileVersion === ARP_PROFILE_DATA_VERSION_V1 && policyVersion === ARP_POLICY_VERSION_V1;
  const isV2 =
    profileVersion === ARP_PROFILE_DATA_VERSION_V2 && policyVersion === ARP_POLICY_VERSION_V2;
  if (!isV1 && !isV2) {
    invalid(
      "provenance.policy.version",
      "provenance profile and policy versions must be an accepted pair.",
    );
  }
}

function validateEventOrdering(events: readonly ArpEvent[]): void {
  for (let index = 1; index < events.length; index += 1) {
    const previous = events[index - 1] as ArpEvent;
    const current = events[index] as ArpEvent;
    if (current.startTick < previous.startTick + previous.durationTicks) {
      invalid(
        `components.arpeggiator[${index}].startTick`,
        "Arpeggiator events must be ordered and non-overlapping.",
      );
    }
  }
}

export function projectStage7HarmonyContextV1(
  progression: HarmonyProgressionRealization,
): Stage7HarmonyContextV1 {
  deriveArpSlotCandidates(progression, FULL_MIDI_ARP_RANGE);
  return copyHarmony(
    {
      profile: progression.profile,
      templateId: progression.templateId,
      templateVersion: progression.templateVersion,
      key: progression.key,
      slots: progression.slots.map((slot) => ({
        index: slot.index,
        degree: slot.degree,
        bars: slot.bars,
        chord: slot.chord,
        inversion: slot.inversion,
        voicing: slot.voicing,
      })),
    },
    "components.harmony",
  );
}

export function validateStage7ArpeggiatorAggregateV1(value: unknown): Stage7ArpeggiatorAggregateV1 {
  const result = requireExactRecord(value, "", TOP_LEVEL_FIELDS);
  if (result.schema !== STAGE7_ARPEGGIATOR_AGGREGATE_SCHEMA_V1) {
    return invalid("schema", "schema must be the Stage 7 aggregate V1 identity.");
  }
  if (result.engineVersion !== STAGE7_AGGREGATE_ENGINE_VERSION_V1) {
    return invalid("engineVersion", "engineVersion must be the Stage 7 engine V1 identity.");
  }
  if (result.generatorVersion !== STAGE7_ARPEGGIATOR_GENERATOR_VERSION_V1) {
    return invalid(
      "generatorVersion",
      "generatorVersion must be the Stage 7 Arpeggiator generator V1 identity.",
    );
  }

  const section = copySection(result.section);

  const componentsRecord = requireExactRecord(result.components, "components", COMPONENT_FIELDS);
  const components = Object.freeze({
    harmony: copyHarmony(componentsRecord.harmony, "components.harmony"),
    arpeggiator: copyArpeggiator(componentsRecord.arpeggiator),
  });
  const provenance = copyProvenance(result.provenance);
  const componentHashes = copyComponentHashes(result.componentHashes);
  requireDenseArray(result.warnings, "warnings", 0);
  const warnings = Object.freeze([]) as readonly [];
  const resultHash = copyDigest(result.resultHash, "resultHash");

  validateHarmonyCompatibility(components.harmony);
  if (components.harmony.profile !== provenance.profile.id) {
    return invalid(
      "provenance.profile.id",
      "provenance.profile.id must equal components.harmony.profile.",
    );
  }
  validateVersionPair(provenance.profile.version, provenance.policy.version);
  validateEventOrdering(components.arpeggiator);

  return Object.freeze({
    schema: STAGE7_ARPEGGIATOR_AGGREGATE_SCHEMA_V1,
    engineVersion: STAGE7_AGGREGATE_ENGINE_VERSION_V1,
    generatorVersion: STAGE7_ARPEGGIATOR_GENERATOR_VERSION_V1,
    section,
    components,
    provenance,
    componentHashes,
    warnings,
    resultHash,
  });
}

function parsePrimitiveSerialization(serialized: string): unknown {
  return JSON.parse(serialized) as unknown;
}

function harmonyWireValue(harmony: Stage7HarmonyContextV1): unknown {
  return {
    profile: harmony.profile,
    templateId: harmony.templateId,
    templateVersion: harmony.templateVersion,
    key: parsePrimitiveSerialization(serializeKey(harmony.key)),
    slots: harmony.slots.map((slot) => ({
      index: slot.index,
      degree: slot.degree,
      bars: slot.bars,
      chord: parsePrimitiveSerialization(serializeChord(slot.chord)),
      inversion: parsePrimitiveSerialization(serializeChordInversion(slot.inversion)),
      voicing: parsePrimitiveSerialization(serializeChordVoicing(slot.voicing)),
    })),
  };
}

function sectionWireValue(section: Stage7ArpeggiatorAggregateV1["section"]): unknown {
  return {
    ppq: section.ppq,
    barCount: section.barCount,
    timeSignature: parsePrimitiveSerialization(serializeTimeSignature(section.timeSignature)),
    tempo: parsePrimitiveSerialization(serializeTempo(section.tempo)),
  };
}

function arpeggiatorWireValue(events: readonly ArpEvent[]): unknown {
  return events.map((event) => ({
    pitch: event.pitch,
    startTick: event.startTick,
    durationTicks: event.durationTicks,
  }));
}

/** Serializes the validated Harmony component hash input in its owned schema order. */
export function serializeStage7HarmonyComponentV1(section: unknown, harmony: unknown): string {
  const canonicalSection = copySection(section);
  const canonicalHarmony = copyHarmony(harmony, "components.harmony");
  validateHarmonyCompatibility(canonicalHarmony);
  return JSON.stringify({
    schema: STAGE7_HARMONY_COMPONENT_SCHEMA_V1,
    section: sectionWireValue(canonicalSection),
    harmony: harmonyWireValue(canonicalHarmony),
  });
}

/** Serializes the validated Arpeggiator component hash input in its owned schema order. */
export function serializeStage7ArpeggiatorComponentV1(section: unknown, events: unknown): string {
  const canonicalSection = copySection(section);
  const canonicalEvents = copyArpeggiator(events);
  validateEventOrdering(canonicalEvents);
  return JSON.stringify({
    schema: STAGE7_ARPEGGIATOR_COMPONENT_SCHEMA_V1,
    section: sectionWireValue(canonicalSection),
    events: arpeggiatorWireValue(canonicalEvents),
  });
}

function aggregateWireValue(result: Stage7ArpeggiatorAggregateV1): unknown {
  return {
    schema: result.schema,
    engineVersion: result.engineVersion,
    generatorVersion: result.generatorVersion,
    section: sectionWireValue(result.section),
    components: {
      harmony: harmonyWireValue(result.components.harmony),
      arpeggiator: arpeggiatorWireValue(result.components.arpeggiator),
    },
    provenance: {
      profile: {
        id: result.provenance.profile.id,
        version: result.provenance.profile.version,
      },
      policy: { version: result.provenance.policy.version },
      seedDerivation: { version: result.provenance.seedDerivation.version },
      prng: { version: result.provenance.prng.version },
      rootSeed: result.provenance.rootSeed,
      normalizedInputs: {
        intent: {
          energy: result.provenance.normalizedInputs.intent.energy,
          complexity: result.provenance.normalizedInputs.intent.complexity,
        },
        range: {
          minMidiPitch: result.provenance.normalizedInputs.range.minMidiPitch,
          maxMidiPitch: result.provenance.normalizedInputs.range.maxMidiPitch,
        },
      },
      parent: null,
    },
    componentHashes: {
      harmony: result.componentHashes.harmony,
      arpeggiator: result.componentHashes.arpeggiator,
    },
    warnings: [],
    resultHash: result.resultHash,
  };
}

export function serializeStage7ArpeggiatorAggregateV1(value: unknown): string {
  const result = validateStage7ArpeggiatorAggregateV1(value);
  return JSON.stringify(aggregateWireValue(result));
}
