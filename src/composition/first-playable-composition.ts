import { type ArpEvent, type ArpRange, createArpRange } from "../music-domain/arpeggiator";
import {
  BASS_RHYTHM_IDS,
  type BassEvent,
  type BassRange,
  type BassRhythmId,
  createBassRange,
} from "../music-domain/bass";
import { createChord, serializeChord, type Chord } from "../music-domain/chord";
import {
  createChordInversion,
  serializeChordInversion,
  type ChordInversion,
} from "../music-domain/chord-inversion";
import {
  createChordVoicing,
  isChordVoicingCompatibleWithChordInversion,
  serializeChordVoicing,
  type ChordVoicing,
} from "../music-domain/chord-voicing";
import {
  COMPLEXITY_V1_VALUES,
  ENERGY_V1_VALUES,
  type ComplexityV1,
  type EnergyV1,
} from "../music-domain/composition-intent";
import {
  type HarmonyProfileId,
  type HarmonyProgressionRealization,
  getHarmonyTemplate,
  isHarmonyProfileId,
  isHarmonyTemplateSupportedForProfile,
  realizeHarmonyTemplate,
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
import { digestStage7CanonicalUtf8 } from "../generators/adapters/stage7-digest";

export const FIRST_PLAYABLE_COMPOSITION_REQUEST_SCHEMA_V1 =
  "nightdrive.first-playable-composition-request.v1" as const;
export const FIRST_PLAYABLE_COMPOSITION_RESULT_SCHEMA_V1 =
  "nightdrive.first-playable-composition-result.v1" as const;
export const FIRST_PLAYABLE_ENGINE_VERSION_V1 =
  "nightdrive.engine.first-playable-composition.v1" as const;
export const FIRST_PLAYABLE_GENERATOR_VERSION_V1 =
  "nightdrive.generator.first-playable-composition.v1" as const;
export const FIRST_PLAYABLE_HARMONY_COMPONENT_SCHEMA_V1 =
  "nightdrive.first-playable-harmony-component.v1" as const;
export const FIRST_PLAYABLE_BASS_COMPONENT_SCHEMA_V1 =
  "nightdrive.first-playable-bass-component.v1" as const;
export const FIRST_PLAYABLE_ARPEGGIATOR_COMPONENT_SCHEMA_V1 =
  "nightdrive.first-playable-arpeggiator-component.v1" as const;

export type FirstPlayableCompositionRequestV1 = Readonly<{
  schema: typeof FIRST_PLAYABLE_COMPOSITION_REQUEST_SCHEMA_V1;
  engineVersion: typeof FIRST_PLAYABLE_ENGINE_VERSION_V1;
  generatorVersion: typeof FIRST_PLAYABLE_GENERATOR_VERSION_V1;
  profile: Readonly<{ id: HarmonyProfileId }>;
  harmony: Readonly<{
    templateId: string;
    templateVersion: "v1";
    key: Key;
  }>;
  section: Readonly<{ tempo: Tempo }>;
  intent: Readonly<{ energy: EnergyV1; complexity: ComplexityV1 }>;
  rootSeed: number;
  bass?: Readonly<{
    range?: BassRange;
    rhythm?: BassRhythmId;
  }>;
  arpeggiator: Readonly<{
    range: ArpRange;
    profile: Readonly<{ version: "nightdrive.genre-profile.arpeggiator.v2" }>;
    policy: Readonly<{ version: "nightdrive.arpeggiator-policy.v2" }>;
    seedDerivation: Readonly<{ version: "nightdrive.seed-derivation.component.v1" }>;
    prng: Readonly<{ version: "nightdrive.prng.mulberry32.v1" }>;
  }>;
}>;

type FirstPlayableHarmonySlotV1 = Readonly<{
  index: number;
  degree: ScaleDegree;
  bars: number;
  chord: Chord;
  inversion: ChordInversion;
  voicing: ChordVoicing;
}>;

export type FirstPlayableHarmonyComponentV1 = Readonly<{
  profile: HarmonyProfileId;
  templateId: string;
  templateVersion: "v1";
  key: Key;
  slots: readonly FirstPlayableHarmonySlotV1[];
}>;

export type FirstPlayableEventV1 = Readonly<{
  pitch: number;
  startTick: number;
  durationTicks: number;
}>;

export type FirstPlayableCompositionResultV1 = Readonly<{
  schema: typeof FIRST_PLAYABLE_COMPOSITION_RESULT_SCHEMA_V1;
  engineVersion: typeof FIRST_PLAYABLE_ENGINE_VERSION_V1;
  generatorVersion: typeof FIRST_PLAYABLE_GENERATOR_VERSION_V1;
  section: Readonly<{
    ppq: typeof PPQ;
    barCount: typeof V1_BAR_COUNT;
    timeSignature: TimeSignature;
    tempo: Tempo;
  }>;
  components: Readonly<{
    harmony: FirstPlayableHarmonyComponentV1;
    bass: readonly FirstPlayableEventV1[];
    arpeggiator: readonly FirstPlayableEventV1[];
  }>;
  provenance: Readonly<{
    profile: Readonly<{ id: HarmonyProfileId }>;
    harmonyTemplate: Readonly<{ id: string; version: "v1" }>;
    bass: Readonly<{
      range: Readonly<{ minMidiPitch: number; maxMidiPitch: number }>;
      rhythm: BassRhythmId;
    }>;
    arpeggiator: Readonly<{
      range: Readonly<{ minMidiPitch: number; maxMidiPitch: number }>;
      profile: Readonly<{ version: "nightdrive.genre-profile.arpeggiator.v2" }>;
      policy: Readonly<{ version: "nightdrive.arpeggiator-policy.v2" }>;
      seedDerivation: Readonly<{ version: "nightdrive.seed-derivation.component.v1" }>;
      prng: Readonly<{ version: "nightdrive.prng.mulberry32.v1" }>;
    }>;
    intent: Readonly<{ energy: EnergyV1; complexity: ComplexityV1 }>;
    rootSeed: number;
    parent: null;
  }>;
  componentHashes: Readonly<{
    harmony: string;
    bass: string;
    arpeggiator: string;
  }>;
  warnings: readonly [];
  resultHash: string;
}>;

export type FirstPlayableCompositionErrorCode =
  | "INVALID_FIRST_PLAYABLE_REQUEST"
  | "UNSUPPORTED_FIRST_PLAYABLE_SCHEMA"
  | "UNSUPPORTED_FIRST_PLAYABLE_ENGINE_VERSION"
  | "UNSUPPORTED_FIRST_PLAYABLE_GENERATOR_VERSION"
  | "INVALID_FIRST_PLAYABLE_TEMPO"
  | "INVALID_FIRST_PLAYABLE_RESULT";

export class FirstPlayableCompositionValueError extends RangeError {
  readonly code: FirstPlayableCompositionErrorCode;
  readonly field: string;

  constructor(code: FirstPlayableCompositionErrorCode, field: string, message: string) {
    super(message);
    this.name = "FirstPlayableCompositionValueError";
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
const VERSION_FIELDS = Object.freeze(["version"] as const);
const RANGE_FIELDS = Object.freeze(["minMidiPitch", "maxMidiPitch"] as const);
const COMPONENT_FIELDS = Object.freeze(["harmony", "bass", "arpeggiator"] as const);
const HARMONY_RESULT_FIELDS = Object.freeze([
  "profile",
  "templateId",
  "templateVersion",
  "key",
  "slots",
] as const);
const HARMONY_SLOT_FIELDS = Object.freeze([
  "index",
  "degree",
  "bars",
  "chord",
  "inversion",
  "voicing",
] as const);
const KEY_FIELDS = Object.freeze(["tonic", "scale"] as const);
const CHORD_FIELDS = Object.freeze(["root", "quality"] as const);
const VOICING_FIELDS = Object.freeze(["midiPitches"] as const);
const EVENT_FIELDS = Object.freeze(["pitch", "startTick", "durationTicks"] as const);
const PROVENANCE_FIELDS = Object.freeze([
  "profile",
  "harmonyTemplate",
  "bass",
  "arpeggiator",
  "intent",
  "rootSeed",
  "parent",
] as const);
const PROVENANCE_PROFILE_FIELDS = Object.freeze(["id"] as const);
const HARMONY_TEMPLATE_PROVENANCE_FIELDS = Object.freeze(["id", "version"] as const);
const PROVENANCE_BASS_FIELDS = Object.freeze(["range", "rhythm"] as const);
const PROVENANCE_ARPEGGIATOR_FIELDS = Object.freeze([
  "range",
  "profile",
  "policy",
  "seedDerivation",
  "prng",
] as const);
const INTENT_RESULT_FIELDS = Object.freeze(["energy", "complexity"] as const);
const HASH_FIELDS = Object.freeze(["harmony", "bass", "arpeggiator"] as const);
const LOWERCASE_SHA256 = /^[0-9a-f]{64}$/u;
const UINT32_MAX = 0xffff_ffff;

function invalidRequest(field: string, message: string): never {
  throw new FirstPlayableCompositionValueError("INVALID_FIRST_PLAYABLE_REQUEST", field, message);
}

function invalidResult(field: string, message: string): never {
  throw new FirstPlayableCompositionValueError("INVALID_FIRST_PLAYABLE_RESULT", field, message);
}

function fieldPath(parent: string, child: string): string {
  return parent.length === 0 ? child : `${parent}.${child}`;
}

function isPlainRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireRecord(
  value: unknown,
  path: string,
  fields: readonly string[],
  optionalFields: readonly string[] = [],
  failure: "request" | "result" = "result",
): UnknownRecord {
  const fail = failure === "request" ? invalidRequest : invalidResult;
  if (!isPlainRecord(value)) return fail(path, `${path} must be an ordinary data record.`);
  const allowed = new Set([...fields, ...optionalFields]);
  for (const field of fields) {
    if (!Object.hasOwn(value, field))
      return fail(fieldPath(path, field), `${fieldPath(path, field)} is required.`);
  }
  const symbols = Object.getOwnPropertySymbols(value);
  if (symbols.length > 0) return fail(path, `${path} contains an unexpected symbol key.`);
  const unexpected = Object.getOwnPropertyNames(value)
    .filter((name) => !allowed.has(name))
    .sort();
  if (unexpected.length > 0) {
    return fail(
      fieldPath(path, unexpected[0] as string),
      `${fieldPath(path, unexpected[0] as string)} is not permitted.`,
    );
  }
  for (const field of Object.getOwnPropertyNames(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, field);
    if (descriptor === undefined || !("value" in descriptor)) {
      return fail(
        fieldPath(path, field),
        `${fieldPath(path, field)} must be an ordinary data property.`,
      );
    }
  }
  return value;
}

function readData(record: UnknownRecord, field: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, field);
  return descriptor !== undefined && "value" in descriptor ? descriptor.value : undefined;
}

function requireDenseArray(
  value: unknown,
  path: string,
  exactLength: number | undefined,
  failure: "request" | "result" = "result",
): readonly unknown[] {
  const fail = failure === "request" ? invalidRequest : invalidResult;
  if (!Array.isArray(value)) return fail(path, `${path} must be a dense ordered array.`);
  if (exactLength !== undefined && value.length !== exactLength) {
    return fail(path, `${path} must contain exactly ${exactLength} entries.`);
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index))
      return fail(`${path}[${index}]`, `${path} must not be sparse.`);
    const descriptor = Object.getOwnPropertyDescriptor(value, index);
    if (descriptor === undefined || !("value" in descriptor)) {
      return fail(`${path}[${index}]`, `${path}[${index}] must be an ordinary data property.`);
    }
  }
  const unexpected = Object.getOwnPropertyNames(value)
    .filter((name) => name !== "length" && !/^(0|[1-9][0-9]*)$/u.test(name))
    .sort();
  if (unexpected.length > 0 || Object.getOwnPropertySymbols(value).length > 0) {
    return fail(path, `${path} contains an unexpected array property.`);
  }
  return value;
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function safeInteger(
  value: unknown,
  path: string,
  failure: "request" | "result" = "result",
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    !Number.isSafeInteger(value)
  ) {
    return (failure === "request" ? invalidRequest : invalidResult)(
      path,
      `${path} must be a canonical safe integer.`,
    );
  }
  return normalizeZero(value);
}

function copyKey(value: unknown, path: string, failure: "request" | "result"): Key {
  const record = requireRecord(value, path, KEY_FIELDS, [], failure);
  let tonic: ReturnType<typeof createPitchClass>;
  try {
    tonic = createPitchClass(readData(record, "tonic") as number);
  } catch (error) {
    if (failure === "request") throw error;
    return invalidResult(`${path}.tonic`, `${path}.tonic must be a canonical PitchClass.`);
  }
  let scale: ReturnType<typeof createScaleType>;
  try {
    scale = createScaleType(readData(record, "scale"));
  } catch (error) {
    if (failure === "request") throw error;
    return invalidResult(`${path}.scale`, `${path}.scale must be a canonical ScaleType.`);
  }
  return createKey(tonic, scale);
}

function copyTempo(value: unknown, path: string, failure: "request" | "result"): Tempo {
  const record = requireRecord(value, path, ["microsecondsPerQuarter"], [], failure);
  try {
    return createTempoFromMicrosecondsPerQuarter(
      readData(record, "microsecondsPerQuarter") as number,
    );
  } catch (_error) {
    if (failure === "request") {
      throw new FirstPlayableCompositionValueError(
        "INVALID_FIRST_PLAYABLE_TEMPO",
        `${path}.microsecondsPerQuarter`,
        `${path}.microsecondsPerQuarter must be a canonical Tempo value.`,
      );
    }
    return invalidResult(
      `${path}.microsecondsPerQuarter`,
      `${path}.microsecondsPerQuarter must be a canonical Tempo value.`,
    );
  }
}

function copyRange(
  value: unknown,
  path: string,
  kind: "arp" | "bass",
  failure: "request" | "result",
): ArpRange | BassRange {
  const record = requireRecord(value, path, RANGE_FIELDS, [], failure);
  const raw = {
    minMidiPitch: readData(record, "minMidiPitch"),
    maxMidiPitch: readData(record, "maxMidiPitch"),
  };
  try {
    return kind === "arp"
      ? createArpRange(raw as { minMidiPitch: number; maxMidiPitch: number })
      : createBassRange(raw as { minMidiPitch: number; maxMidiPitch: number });
  } catch (error) {
    if (failure === "request") throw error;
    return invalidResult(path, `${path} must be a canonical inclusive MIDI range.`);
  }
}

function copyChord(value: unknown, path: string, failure: "result"): Chord {
  const record = requireRecord(value, path, CHORD_FIELDS, [], failure);
  let root: ReturnType<typeof createPitchClass>;
  try {
    root = createPitchClass(readData(record, "root") as number);
  } catch {
    return invalidResult(`${path}.root`, `${path}.root must be a canonical PitchClass.`);
  }
  try {
    return createChord(root, readData(record, "quality") as never);
  } catch {
    return invalidResult(`${path}.quality`, `${path}.quality must be a canonical ChordQuality.`);
  }
}

function copyVoicing(value: unknown, path: string, failure: "result"): ChordVoicing {
  const record = requireRecord(value, path, VOICING_FIELDS, [], failure);
  const source = requireDenseArray(
    readData(record, "midiPitches"),
    `${path}.midiPitches`,
    3,
    failure,
  );
  const pitches = source.map((pitch, index) => {
    try {
      return createMidiPitch(pitch as number);
    } catch {
      return invalidResult(
        `${path}.midiPitches[${index}]`,
        `${path}.midiPitches[${index}] must be a canonical MidiPitch.`,
      );
    }
  });
  try {
    return createChordVoicing(pitches);
  } catch {
    return invalidResult(`${path}.midiPitches`, `${path}.midiPitches must be strictly ascending.`);
  }
}

function copyHarmony(
  value: unknown,
  path: string,
  failure: "result",
): FirstPlayableHarmonyComponentV1 {
  const record = requireRecord(value, path, HARMONY_RESULT_FIELDS, [], failure);
  const profile = readData(record, "profile");
  if (!isHarmonyProfileId(profile))
    return invalidResult(`${path}.profile`, `${path}.profile must be a supported Harmony profile.`);
  const templateId = readData(record, "templateId");
  if (typeof templateId !== "string")
    return invalidResult(`${path}.templateId`, `${path}.templateId must be a string.`);
  const templateVersion = readData(record, "templateVersion");
  if (templateVersion !== "v1")
    return invalidResult(`${path}.templateVersion`, `${path}.templateVersion must equal v1.`);
  const key = copyKey(readData(record, "key"), `${path}.key`, failure);
  let template: ReturnType<typeof getHarmonyTemplate>;
  try {
    template = getHarmonyTemplate(templateId);
  } catch {
    return invalidResult(
      `${path}.templateId`,
      `${path}.templateId must identify a supported Harmony template.`,
    );
  }
  if (!isHarmonyTemplateSupportedForProfile(profile, template)) {
    return invalidResult(
      `${path}.templateId`,
      `${path}.templateId is not supported for ${path}.profile.`,
    );
  }
  if (key.scale !== template.scale)
    return invalidResult(`${path}.key.scale`, `${path}.key.scale must match the Harmony template.`);
  const sourceSlots = requireDenseArray(
    readData(record, "slots"),
    `${path}.slots`,
    template.slots.length,
    failure,
  );
  const expectedChords = realizeHarmonyTemplate(template, key);
  const slots: FirstPlayableHarmonySlotV1[] = [];
  let totalBars = 0;
  for (let index = 0; index < sourceSlots.length; index += 1) {
    const slotPath = `${path}.slots[${index}]`;
    const slot = requireRecord(sourceSlots[index], slotPath, HARMONY_SLOT_FIELDS, [], failure);
    const slotIndex = safeInteger(readData(slot, "index"), `${slotPath}.index`, failure);
    let degree: ScaleDegree;
    try {
      degree = createScaleDegree(readData(slot, "degree") as number);
    } catch {
      return invalidResult(
        `${slotPath}.degree`,
        `${slotPath}.degree must be a canonical ScaleDegree.`,
      );
    }
    const bars = safeInteger(readData(slot, "bars"), `${slotPath}.bars`, failure);
    const chord = copyChord(readData(slot, "chord"), `${slotPath}.chord`, failure);
    let inversion: ChordInversion;
    try {
      inversion = createChordInversion(readData(slot, "inversion") as number);
    } catch {
      return invalidResult(
        `${slotPath}.inversion`,
        `${slotPath}.inversion must be a canonical ChordInversion.`,
      );
    }
    const voicing = copyVoicing(readData(slot, "voicing"), `${slotPath}.voicing`, failure);
    const expectedChord = expectedChords[index];
    if (
      slotIndex !== index ||
      degree !== template.slots[index]?.degree ||
      bars !== template.slots[index]?.bars ||
      chord.root !== expectedChord?.root ||
      chord.quality !== expectedChord?.quality
    ) {
      return invalidResult(
        slotPath,
        `${slotPath} does not match the canonical Harmony template slot.`,
      );
    }
    if (!isChordVoicingCompatibleWithChordInversion(voicing, chord, inversion)) {
      return invalidResult(
        `${slotPath}.voicing`,
        `${slotPath}.voicing is incompatible with its chord/inversion.`,
      );
    }
    totalBars += bars;
    slots.push(Object.freeze({ index: slotIndex, degree, bars, chord, inversion, voicing }));
  }
  if (totalBars !== V1_BAR_COUNT)
    return invalidResult(`${path}.slots`, `${path}.slots must total exactly eight bars.`);
  return Object.freeze({ profile, templateId, templateVersion, key, slots: Object.freeze(slots) });
}

function copyEvents(
  value: unknown,
  path: string,
  failure: "result",
): readonly FirstPlayableEventV1[] {
  const source = requireDenseArray(value, path, undefined, failure);
  const events: FirstPlayableEventV1[] = [];
  let previousStart = -1;
  for (let index = 0; index < source.length; index += 1) {
    const eventPath = `${path}[${index}]`;
    const record = requireRecord(source[index], eventPath, EVENT_FIELDS, [], failure);
    let pitch: ReturnType<typeof createMidiPitch>;
    try {
      pitch = createMidiPitch(readData(record, "pitch") as number);
    } catch {
      return invalidResult(
        `${eventPath}.pitch`,
        `${eventPath}.pitch must be a canonical MidiPitch.`,
      );
    }
    const startValue = safeInteger(
      readData(record, "startTick"),
      `${eventPath}.startTick`,
      failure,
    );
    const durationValue = safeInteger(
      readData(record, "durationTicks"),
      `${eventPath}.durationTicks`,
      failure,
    );
    let startTick: ReturnType<typeof createTick>;
    let durationTicks: ReturnType<typeof createDurationTicks>;
    try {
      startTick = createTick(startValue);
      durationTicks = createDurationTicks(durationValue);
    } catch {
      return invalidResult(eventPath, `${eventPath} must contain canonical event timing values.`);
    }
    if (startTick < previousStart || startTick + durationTicks > V1_SECTION_LENGTH_TICKS) {
      return invalidResult(eventPath, `${eventPath} has invalid canonical timing order.`);
    }
    previousStart = startTick;
    events.push(Object.freeze({ pitch, startTick, durationTicks }));
  }
  return Object.freeze(events);
}

function copyIntent(
  value: unknown,
  path: string,
  failure: "result",
): Readonly<{ energy: EnergyV1; complexity: ComplexityV1 }> {
  const record = requireRecord(value, path, INTENT_RESULT_FIELDS, [], failure);
  const energy = readData(record, "energy");
  const complexity = readData(record, "complexity");
  if (typeof energy !== "string" || !ENERGY_V1_VALUES.includes(energy as EnergyV1)) {
    return invalidResult(`${path}.energy`, `${path}.energy must be a canonical EnergyV1 value.`);
  }
  if (
    typeof complexity !== "string" ||
    !COMPLEXITY_V1_VALUES.includes(complexity as ComplexityV1)
  ) {
    return invalidResult(
      `${path}.complexity`,
      `${path}.complexity must be a canonical ComplexityV1 value.`,
    );
  }
  return Object.freeze({ energy: energy as EnergyV1, complexity: complexity as ComplexityV1 });
}

function copyDigest(value: unknown, path: string): string {
  if (typeof value !== "string" || !LOWERCASE_SHA256.test(value))
    return invalidResult(path, `${path} must be a lowercase SHA-256 digest.`);
  return value;
}

function copySection(value: unknown): FirstPlayableCompositionResultV1["section"] {
  const record = requireRecord(value, "section", SECTION_FIELDS, [], "result");
  if (readData(record, "ppq") !== PPQ)
    return invalidResult("section.ppq", `section.ppq must equal ${PPQ}.`);
  if (readData(record, "barCount") !== V1_BAR_COUNT)
    return invalidResult("section.barCount", `section.barCount must equal ${V1_BAR_COUNT}.`);
  const timeSignatureRecord = requireRecord(
    readData(record, "timeSignature"),
    "section.timeSignature",
    ["numerator", "denominator"],
    [],
    "result",
  );
  let timeSignature: TimeSignature;
  try {
    timeSignature = createTimeSignature(
      readData(timeSignatureRecord, "numerator") as number,
      readData(timeSignatureRecord, "denominator") as number,
    );
  } catch {
    return invalidResult(
      "section.timeSignature",
      "section.timeSignature must be a canonical time signature.",
    );
  }
  if (timeSignature.numerator !== 4 || timeSignature.denominator !== 4)
    return invalidResult("section.timeSignature", "section.timeSignature must be 4/4.");
  const tempo = copyTempo(readData(record, "tempo"), "section.tempo", "result");
  return Object.freeze({ ppq: PPQ, barCount: V1_BAR_COUNT, timeSignature, tempo });
}

function sectionWireValue(section: FirstPlayableCompositionResultV1["section"]): unknown {
  return {
    ppq: section.ppq,
    barCount: section.barCount,
    timeSignature: JSON.parse(serializeTimeSignature(section.timeSignature)) as unknown,
    tempo: JSON.parse(serializeTempo(section.tempo)) as unknown,
  };
}

function harmonyWireValue(harmony: FirstPlayableHarmonyComponentV1): unknown {
  return {
    profile: harmony.profile,
    templateId: harmony.templateId,
    templateVersion: harmony.templateVersion,
    key: JSON.parse(serializeKey(harmony.key)) as unknown,
    slots: harmony.slots.map((slot) => ({
      index: slot.index,
      degree: slot.degree,
      bars: slot.bars,
      chord: JSON.parse(serializeChord(slot.chord)) as unknown,
      inversion: JSON.parse(serializeChordInversion(slot.inversion)) as unknown,
      voicing: JSON.parse(serializeChordVoicing(slot.voicing)) as unknown,
    })),
  };
}

function eventWireValue(events: readonly FirstPlayableEventV1[]): unknown {
  return events.map((event) => ({
    pitch: event.pitch,
    startTick: event.startTick,
    durationTicks: event.durationTicks,
  }));
}

function provenanceWireValue(provenance: FirstPlayableCompositionResultV1["provenance"]): unknown {
  return {
    profile: { id: provenance.profile.id },
    harmonyTemplate: {
      id: provenance.harmonyTemplate.id,
      version: provenance.harmonyTemplate.version,
    },
    bass: {
      range: {
        minMidiPitch: provenance.bass.range.minMidiPitch,
        maxMidiPitch: provenance.bass.range.maxMidiPitch,
      },
      rhythm: provenance.bass.rhythm,
    },
    arpeggiator: {
      range: {
        minMidiPitch: provenance.arpeggiator.range.minMidiPitch,
        maxMidiPitch: provenance.arpeggiator.range.maxMidiPitch,
      },
      profile: { version: provenance.arpeggiator.profile.version },
      policy: { version: provenance.arpeggiator.policy.version },
      seedDerivation: { version: provenance.arpeggiator.seedDerivation.version },
      prng: { version: provenance.arpeggiator.prng.version },
    },
    intent: { energy: provenance.intent.energy, complexity: provenance.intent.complexity },
    rootSeed: provenance.rootSeed,
    parent: null,
  };
}

function resultHashInputWireValue(result: FirstPlayableCompositionResultV1): unknown {
  return {
    schema: result.schema,
    engineVersion: result.engineVersion,
    generatorVersion: result.generatorVersion,
    section: sectionWireValue(result.section),
    components: {
      harmony: harmonyWireValue(result.components.harmony),
      bass: eventWireValue(result.components.bass),
      arpeggiator: eventWireValue(result.components.arpeggiator),
    },
    provenance: provenanceWireValue(result.provenance),
    componentHashes: {
      harmony: result.componentHashes.harmony,
      bass: result.componentHashes.bass,
      arpeggiator: result.componentHashes.arpeggiator,
    },
    warnings: [],
  };
}

function completeResultWireValue(result: FirstPlayableCompositionResultV1): unknown {
  return {
    ...(resultHashInputWireValue(result) as Record<string, unknown>),
    resultHash: result.resultHash,
  };
}

export function validateFirstPlayableCompositionV1(
  value: unknown,
): FirstPlayableCompositionResultV1 {
  const result = requireRecord(value, "", TOP_LEVEL_FIELDS, [], "result");
  if (readData(result, "schema") !== FIRST_PLAYABLE_COMPOSITION_RESULT_SCHEMA_V1)
    return invalidResult("schema", "schema must be the First Playable result identity.");
  if (readData(result, "engineVersion") !== FIRST_PLAYABLE_ENGINE_VERSION_V1)
    return invalidResult(
      "engineVersion",
      "engineVersion must be the First Playable engine identity.",
    );
  if (readData(result, "generatorVersion") !== FIRST_PLAYABLE_GENERATOR_VERSION_V1)
    return invalidResult(
      "generatorVersion",
      "generatorVersion must be the First Playable generator identity.",
    );
  const section = copySection(readData(result, "section"));
  const componentsRecord = requireRecord(
    readData(result, "components"),
    "components",
    COMPONENT_FIELDS,
    [],
    "result",
  );
  const harmony = copyHarmony(
    readData(componentsRecord, "harmony"),
    "components.harmony",
    "result",
  );
  const bass = copyEvents(readData(componentsRecord, "bass"), "components.bass", "result");
  const arpeggiator = copyEvents(
    readData(componentsRecord, "arpeggiator"),
    "components.arpeggiator",
    "result",
  );
  const provenanceRecord = requireRecord(
    readData(result, "provenance"),
    "provenance",
    PROVENANCE_FIELDS,
    [],
    "result",
  );
  const profileRecord = requireRecord(
    readData(provenanceRecord, "profile"),
    "provenance.profile",
    PROVENANCE_PROFILE_FIELDS,
    [],
    "result",
  );
  const profile = readData(profileRecord, "id");
  if (!isHarmonyProfileId(profile))
    return invalidResult(
      "provenance.profile.id",
      "provenance.profile.id must be a supported Harmony profile.",
    );
  const harmonyTemplateRecord = requireRecord(
    readData(provenanceRecord, "harmonyTemplate"),
    "provenance.harmonyTemplate",
    HARMONY_TEMPLATE_PROVENANCE_FIELDS,
    [],
    "result",
  );
  const harmonyTemplateId = readData(harmonyTemplateRecord, "id");
  const harmonyTemplateVersion = readData(harmonyTemplateRecord, "version");
  if (typeof harmonyTemplateId !== "string" || harmonyTemplateVersion !== "v1")
    return invalidResult(
      "provenance.harmonyTemplate",
      "provenance.harmonyTemplate must be canonical.",
    );
  const bassRecord = requireRecord(
    readData(provenanceRecord, "bass"),
    "provenance.bass",
    PROVENANCE_BASS_FIELDS,
    [],
    "result",
  );
  const bassRange = copyRange(
    readData(bassRecord, "range"),
    "provenance.bass.range",
    "bass",
    "result",
  ) as BassRange;
  const bassRhythm = readData(bassRecord, "rhythm");
  if (!Object.values(BASS_RHYTHM_IDS).includes(bassRhythm as BassRhythmId))
    return invalidResult(
      "provenance.bass.rhythm",
      "provenance.bass.rhythm must be a supported Bass rhythm.",
    );
  const arpRecord = requireRecord(
    readData(provenanceRecord, "arpeggiator"),
    "provenance.arpeggiator",
    PROVENANCE_ARPEGGIATOR_FIELDS,
    [],
    "result",
  );
  const arpRange = copyRange(
    readData(arpRecord, "range"),
    "provenance.arpeggiator.range",
    "arp",
    "result",
  ) as ArpRange;
  const arpProfile = requireRecord(
    readData(arpRecord, "profile"),
    "provenance.arpeggiator.profile",
    VERSION_FIELDS,
    [],
    "result",
  );
  const arpPolicy = requireRecord(
    readData(arpRecord, "policy"),
    "provenance.arpeggiator.policy",
    VERSION_FIELDS,
    [],
    "result",
  );
  const seedDerivation = requireRecord(
    readData(arpRecord, "seedDerivation"),
    "provenance.arpeggiator.seedDerivation",
    VERSION_FIELDS,
    [],
    "result",
  );
  const prng = requireRecord(
    readData(arpRecord, "prng"),
    "provenance.arpeggiator.prng",
    VERSION_FIELDS,
    [],
    "result",
  );
  if (readData(arpProfile, "version") !== "nightdrive.genre-profile.arpeggiator.v2")
    return invalidResult(
      "provenance.arpeggiator.profile.version",
      "unsupported Arpeggiator profile version.",
    );
  if (readData(arpPolicy, "version") !== "nightdrive.arpeggiator-policy.v2")
    return invalidResult(
      "provenance.arpeggiator.policy.version",
      "unsupported Arpeggiator policy version.",
    );
  if (readData(seedDerivation, "version") !== "nightdrive.seed-derivation.component.v1")
    return invalidResult(
      "provenance.arpeggiator.seedDerivation.version",
      "unsupported seed derivation version.",
    );
  if (readData(prng, "version") !== PRNG_ALGORITHM_ID)
    return invalidResult("provenance.arpeggiator.prng.version", "unsupported PRNG version.");
  const intent = copyIntent(readData(provenanceRecord, "intent"), "provenance.intent", "result");
  const rootSeed = safeInteger(
    readData(provenanceRecord, "rootSeed"),
    "provenance.rootSeed",
    "result",
  );
  if (rootSeed < 0 || rootSeed > UINT32_MAX)
    return invalidResult("provenance.rootSeed", "provenance.rootSeed must be uint32.");
  if (readData(provenanceRecord, "parent") !== null)
    return invalidResult("provenance.parent", "provenance.parent must be null.");
  if (harmony.profile !== profile)
    return invalidResult(
      "provenance.profile.id",
      "provenance.profile.id must equal components.harmony.profile.",
    );
  if (
    harmony.templateId !== harmonyTemplateId ||
    harmony.templateVersion !== harmonyTemplateVersion
  )
    return invalidResult(
      "provenance.harmonyTemplate",
      "provenance.harmonyTemplate must equal components.harmony template identity.",
    );
  const hashesRecord = requireRecord(
    readData(result, "componentHashes"),
    "componentHashes",
    HASH_FIELDS,
    [],
    "result",
  );
  const componentHashes = Object.freeze({
    harmony: copyDigest(readData(hashesRecord, "harmony"), "componentHashes.harmony"),
    bass: copyDigest(readData(hashesRecord, "bass"), "componentHashes.bass"),
    arpeggiator: copyDigest(readData(hashesRecord, "arpeggiator"), "componentHashes.arpeggiator"),
  });
  requireDenseArray(readData(result, "warnings"), "warnings", 0, "result");
  const resultHash = copyDigest(readData(result, "resultHash"), "resultHash");
  return Object.freeze({
    schema: FIRST_PLAYABLE_COMPOSITION_RESULT_SCHEMA_V1,
    engineVersion: FIRST_PLAYABLE_ENGINE_VERSION_V1,
    generatorVersion: FIRST_PLAYABLE_GENERATOR_VERSION_V1,
    section,
    components: Object.freeze({ harmony, bass, arpeggiator }),
    provenance: Object.freeze({
      profile: Object.freeze({ id: profile }),
      harmonyTemplate: Object.freeze({ id: harmonyTemplateId, version: "v1" as const }),
      bass: Object.freeze({ range: bassRange, rhythm: bassRhythm as BassRhythmId }),
      arpeggiator: Object.freeze({
        range: arpRange,
        profile: Object.freeze({
          version: readData(arpProfile, "version") as "nightdrive.genre-profile.arpeggiator.v2",
        }),
        policy: Object.freeze({
          version: readData(arpPolicy, "version") as "nightdrive.arpeggiator-policy.v2",
        }),
        seedDerivation: Object.freeze({
          version: readData(seedDerivation, "version") as "nightdrive.seed-derivation.component.v1",
        }),
        prng: Object.freeze({ version: readData(prng, "version") as typeof PRNG_ALGORITHM_ID }),
      }),
      intent,
      rootSeed,
      parent: null,
    }),
    componentHashes,
    warnings: Object.freeze([]) as readonly [],
    resultHash,
  });
}

export function serializeFirstPlayableHarmonyComponentV1(
  section: unknown,
  harmony: unknown,
): string {
  const canonicalSection = copySection(section);
  const canonicalHarmony = copyHarmony(harmony, "components.harmony", "result");
  return JSON.stringify({
    schema: FIRST_PLAYABLE_HARMONY_COMPONENT_SCHEMA_V1,
    section: sectionWireValue(canonicalSection),
    component: harmonyWireValue(canonicalHarmony),
  });
}

export function serializeFirstPlayableBassComponentV1(section: unknown, events: unknown): string {
  const canonicalSection = copySection(section);
  const canonicalEvents = copyEvents(events, "components.bass", "result");
  return JSON.stringify({
    schema: FIRST_PLAYABLE_BASS_COMPONENT_SCHEMA_V1,
    section: sectionWireValue(canonicalSection),
    component: eventWireValue(canonicalEvents),
  });
}

export function serializeFirstPlayableArpeggiatorComponentV1(
  section: unknown,
  events: unknown,
): string {
  const canonicalSection = copySection(section);
  const canonicalEvents = copyEvents(events, "components.arpeggiator", "result");
  return JSON.stringify({
    schema: FIRST_PLAYABLE_ARPEGGIATOR_COMPONENT_SCHEMA_V1,
    section: sectionWireValue(canonicalSection),
    component: eventWireValue(canonicalEvents),
  });
}

export function digestFirstPlayableHarmonyComponentV1(section: unknown, harmony: unknown): string {
  return digestStage7CanonicalUtf8(serializeFirstPlayableHarmonyComponentV1(section, harmony));
}

export function digestFirstPlayableBassComponentV1(section: unknown, events: unknown): string {
  return digestStage7CanonicalUtf8(serializeFirstPlayableBassComponentV1(section, events));
}

export function digestFirstPlayableArpeggiatorComponentV1(
  section: unknown,
  events: unknown,
): string {
  return digestStage7CanonicalUtf8(serializeFirstPlayableArpeggiatorComponentV1(section, events));
}

export function serializeFirstPlayableCompositionHashInputV1(value: unknown): string {
  const result = validateFirstPlayableCompositionV1(value);
  return JSON.stringify(resultHashInputWireValue(result));
}

export function serializeFirstPlayableCompositionV1(value: unknown): string {
  const result = validateFirstPlayableCompositionV1(value);
  return JSON.stringify(completeResultWireValue(result));
}

export function digestFirstPlayableCompositionV1(value: unknown): string {
  return digestStage7CanonicalUtf8(serializeFirstPlayableCompositionHashInputV1(value));
}

export function verifyFirstPlayableCompositionV1(value: unknown): FirstPlayableCompositionResultV1 {
  const result = validateFirstPlayableCompositionV1(value);
  const expectedHarmony = digestFirstPlayableHarmonyComponentV1(
    result.section,
    result.components.harmony,
  );
  const expectedBass = digestFirstPlayableBassComponentV1(result.section, result.components.bass);
  const expectedArpeggiator = digestFirstPlayableArpeggiatorComponentV1(
    result.section,
    result.components.arpeggiator,
  );
  if (result.componentHashes.harmony !== expectedHarmony)
    invalidResult("componentHashes.harmony", "component hash does not match canonical projection.");
  if (result.componentHashes.bass !== expectedBass)
    invalidResult("componentHashes.bass", "component hash does not match canonical projection.");
  if (result.componentHashes.arpeggiator !== expectedArpeggiator)
    invalidResult(
      "componentHashes.arpeggiator",
      "component hash does not match canonical projection.",
    );
  if (result.resultHash !== digestFirstPlayableCompositionV1(result))
    invalidResult("resultHash", "result hash does not match canonical projection.");
  return result;
}

export function buildFirstPlayableCompositionV1(
  input: Readonly<{
    progression: HarmonyProgressionRealization;
    bassEvents: readonly BassEvent[];
    arpeggiatorEvents: readonly ArpEvent[];
    profile: HarmonyProfileId;
    templateId: string;
    templateVersion: "v1";
    key: Key;
    tempo: Tempo;
    bassRange: BassRange;
    bassRhythm: BassRhythmId;
    arpeggiatorRange: ArpRange;
    energy: EnergyV1;
    complexity: ComplexityV1;
    rootSeed: number;
  }>,
): FirstPlayableCompositionResultV1 {
  const harmony = Object.freeze({
    profile: input.profile,
    templateId: input.templateId,
    templateVersion: input.templateVersion,
    key: createKey(input.key.tonic, input.key.scale),
    slots: Object.freeze(
      input.progression.slots.map((slot) =>
        Object.freeze({
          index: slot.index,
          degree: createScaleDegree(slot.degree),
          bars: slot.bars,
          chord: createChord(slot.chord.root, slot.chord.quality),
          inversion: createChordInversion(slot.inversion),
          voicing: createChordVoicing(slot.voicing.midiPitches),
        }),
      ),
    ),
  });
  const copyEventsFromDomain = (
    events: readonly (BassEvent | ArpEvent)[],
  ): readonly FirstPlayableEventV1[] =>
    Object.freeze(
      events.map((event) =>
        Object.freeze({
          pitch: createMidiPitch(event.pitch),
          startTick: createTick(event.startTick),
          durationTicks: createDurationTicks(event.durationTicks),
        }),
      ),
    );
  const section = Object.freeze({
    ppq: PPQ,
    barCount: V1_BAR_COUNT,
    timeSignature: createTimeSignature(4, 4),
    tempo: createTempoFromMicrosecondsPerQuarter(input.tempo.microsecondsPerQuarter),
  });
  const bass = copyEventsFromDomain(input.bassEvents);
  const arpeggiator = copyEventsFromDomain(input.arpeggiatorEvents);
  const provenance = Object.freeze({
    profile: Object.freeze({ id: input.profile }),
    harmonyTemplate: Object.freeze({ id: input.templateId, version: input.templateVersion }),
    bass: Object.freeze({
      range: Object.freeze({
        minMidiPitch: input.bassRange.minMidiPitch,
        maxMidiPitch: input.bassRange.maxMidiPitch,
      }),
      rhythm: input.bassRhythm,
    }),
    arpeggiator: Object.freeze({
      range: Object.freeze({
        minMidiPitch: input.arpeggiatorRange.minMidiPitch,
        maxMidiPitch: input.arpeggiatorRange.maxMidiPitch,
      }),
      profile: Object.freeze({ version: "nightdrive.genre-profile.arpeggiator.v2" as const }),
      policy: Object.freeze({ version: "nightdrive.arpeggiator-policy.v2" as const }),
      seedDerivation: Object.freeze({
        version: "nightdrive.seed-derivation.component.v1" as const,
      }),
      prng: Object.freeze({ version: PRNG_ALGORITHM_ID }),
    }),
    intent: Object.freeze({ energy: input.energy, complexity: input.complexity }),
    rootSeed: input.rootSeed,
    parent: null,
  });
  const base = {
    schema: FIRST_PLAYABLE_COMPOSITION_RESULT_SCHEMA_V1,
    engineVersion: FIRST_PLAYABLE_ENGINE_VERSION_V1,
    generatorVersion: FIRST_PLAYABLE_GENERATOR_VERSION_V1,
    section,
    components: Object.freeze({ harmony, bass, arpeggiator }),
    provenance,
    componentHashes: Object.freeze({
      harmony: digestFirstPlayableHarmonyComponentV1(section, harmony),
      bass: digestFirstPlayableBassComponentV1(section, bass),
      arpeggiator: digestFirstPlayableArpeggiatorComponentV1(section, arpeggiator),
    }),
    warnings: Object.freeze([]) as readonly [],
  };
  const resultHash = digestFirstPlayableCompositionV1({ ...base, resultHash: "0".repeat(64) });
  return verifyFirstPlayableCompositionV1(Object.freeze({ ...base, resultHash }));
}
