import { createHash } from "node:crypto";

export const FIRST_PLAYABLE_SOURCE_RECORDS_PATH =
  "docs/reviews/FIRST_PLAYABLE_SOURCE_RECORDS.json" as const;
export const FIRST_PLAYABLE_SOURCE_MANIFEST_PATH =
  "docs/reviews/FIRST_PLAYABLE_SOURCE_MANIFEST.json" as const;
export const FIRST_PLAYABLE_REFERENCE_MANIFEST_PATH =
  "docs/reviews/FIRST_PLAYABLE_REFERENCE_MANIFEST.json" as const;
export const FIRST_PLAYABLE_ORACLE_PATH =
  "docs/reviews/FIRST_PLAYABLE_CANONICAL_ORACLE.json" as const;
export const FIRST_PLAYABLE_VECTOR_IDS = Object.freeze([
  "FP-01",
  "FP-02",
  "FP-03",
  "FP-04",
  "FP-05",
  "FP-06",
  "FP-07",
  "FP-08",
  "FP-09",
  "FP-10",
  "FP-11",
  "FP-12",
] as const);

const SOURCE_SCHEMA = "nightdrive.first-playable-source-records.v1";
const REQUEST_SCHEMA = "nightdrive.first-playable-composition-request.v1";
const RESULT_SCHEMA = "nightdrive.first-playable-composition-result.v1";
const ENGINE_VERSION = "nightdrive.engine.first-playable-composition.v1";
const GENERATOR_VERSION = "nightdrive.generator.first-playable-composition.v1";
const HARMONY_COMPONENT_SCHEMA = "nightdrive.first-playable-harmony-component.v1";
const BASS_COMPONENT_SCHEMA = "nightdrive.first-playable-bass-component.v1";
const ARPEGGIATOR_COMPONENT_SCHEMA = "nightdrive.first-playable-arpeggiator-component.v1";
const DEFAULT_BASS_RANGE = Object.freeze({ minMidiPitch: 36, maxMidiPitch: 60 });
const DEFAULT_BASS_RHYTHM = "sustained";
const PROFILE_IDS = new Set([
  "dark-synthwave",
  "classic-synthwave",
  "darkwave",
  "midtempo-cyberpunk",
]);
const TEMPLATE_IDS = new Set([
  "degree-0654-natural-minor-v1",
  "degree-0344-major-v1",
  "degree-0340-phrygian-v1",
  "degree-0654-phrygian-v1",
]);
const SCALES = new Set([
  "major",
  "natural-minor",
  "harmonic-minor",
  "melodic-minor",
  "dorian",
  "phrygian",
]);
const BASS_RHYTHMS = new Set(["sustained", "quarter-pulse"]);
const CHORD_QUALITIES = new Set(["major-triad", "minor-triad", "diminished-triad"]);
const CHORD_INTERVALS: Readonly<Record<string, readonly number[]>> = Object.freeze({
  "major-triad": Object.freeze([0, 4, 7]),
  "minor-triad": Object.freeze([0, 3, 7]),
  "diminished-triad": Object.freeze([0, 3, 6]),
});
const ENERGY = new Set(["very-low", "low", "medium", "high", "very-high"]);
const COMPLEXITY = new Set(["very-low", "low", "medium", "high", "very-high"]);
const ARPEGGIATOR_VERSIONS = Object.freeze({
  profile: "nightdrive.genre-profile.arpeggiator.v2",
  policy: "nightdrive.arpeggiator-policy.v2",
  seedDerivation: "nightdrive.seed-derivation.component.v1",
  prng: "nightdrive.prng.mulberry32.v1",
});

type PlainRecord = Record<string, unknown>;
type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type NormalizedRequest = {
  schema: string;
  engineVersion: string;
  generatorVersion: string;
  profile: { id: string };
  harmony: { templateId: string; templateVersion: string; key: { tonic: number; scale: string } };
  section: { tempo: { microsecondsPerQuarter: number } };
  intent: { energy: string; complexity: string };
  rootSeed: number;
  bass: { range: { minMidiPitch: number; maxMidiPitch: number }; rhythm: string };
  arpeggiator: {
    range: { minMidiPitch: number; maxMidiPitch: number };
    profile: { version: string };
    policy: { version: string };
    seedDerivation: { version: string };
    prng: { version: string };
  };
};

function fail(path: string, reason: string): never {
  throw new TypeError(`${path}: ${reason}`);
}

function ownDataRecord(
  value: unknown,
  path: string,
  keys: readonly string[],
  optionalKeys: readonly string[] = [],
): PlainRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return fail(path, "expected an ordinary own-data record");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
    return fail(path, "expected a plain record");
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string"))
    return fail(path, "symbol keys are forbidden");
  const names = ownKeys as string[];
  const allowed = [...keys, ...optionalKeys];
  if (keys.some((key) => !names.includes(key)) || names.some((key) => !allowed.includes(key)))
    return fail(path, `expected exactly the keys ${keys.join(", ")}`);
  for (const key of names) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !Object.hasOwn(descriptor, "value"))
      return fail(`${path}.${key}`, "accessors are forbidden");
  }
  return value as PlainRecord;
}

function data(record: PlainRecord, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined || !Object.hasOwn(descriptor, "value"))
    return fail(key, "missing own data value");
  return descriptor.value;
}

function denseArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype)
    return fail(path, "expected a dense ordinary array");
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== "string")) return fail(path, "symbol keys are forbidden");
  const names = keys as string[];
  if (names.length !== value.length + 1 || !names.includes("length"))
    return fail(path, "sparse arrays and extra properties are forbidden");
  for (let index = 0; index < value.length; index += 1) {
    const name = String(index);
    if (!names.includes(name)) return fail(`${path}[${index}]`, "sparse arrays are forbidden");
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (descriptor === undefined || !Object.hasOwn(descriptor, "value"))
      return fail(`${path}[${index}]`, "accessors are forbidden");
  }
  return value;
}

function safeInteger(value: unknown, path: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isSafeInteger(value))
    return fail(path, "expected a finite safe integer");
  const canonical = Object.is(value, -0) ? 0 : value;
  if (canonical < min || canonical > max)
    return fail(path, `expected an integer in ${min}..${max}`);
  return canonical;
}

function exactString(value: unknown, path: string, accepted?: ReadonlySet<string>): string {
  if (typeof value !== "string" || value.length === 0)
    return fail(path, "expected a non-empty string");
  if (accepted !== undefined && !accepted.has(value))
    return fail(path, "string is outside the accepted vocabulary");
  return value;
}

function validateJsonValue(
  value: unknown,
  path = "$",
  active = new WeakSet<object>(),
): asserts value is JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isSafeInteger(value))
      return fail(path, "numbers must be finite safe integers");
    return;
  }
  if (typeof value !== "object") return fail(path, "non-JSON values are forbidden");
  if (active.has(value)) return fail(path, "cycles are forbidden");
  active.add(value);
  try {
    if (Array.isArray(value)) {
      const values = denseArray(value, path);
      for (const [index, item] of values.entries()) {
        validateJsonValue(item, `${path}[${index}]`, active);
      }
      return;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null)
      return fail(path, "only plain records are encodable");
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") return fail(path, "symbol keys are forbidden");
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !Object.hasOwn(descriptor, "value"))
        return fail(`${path}.${key}`, "accessors are forbidden");
      validateJsonValue(descriptor.value, `${path}.${key}`, active);
    }
  } finally {
    active.delete(value);
  }
}

export function evidenceJson(value: unknown): string {
  validateJsonValue(value);
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new TypeError("JSON encoding produced no string");
  return encoded;
}

export function sha256Utf8(value: string): string {
  return sha256Bytes(Buffer.from(value, "utf8"));
}

export function sha256Bytes(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function utf8Length(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function requireRange(value: unknown, path: string, min: number, max: number) {
  const range = ownDataRecord(value, path, ["minMidiPitch", "maxMidiPitch"]);
  const low = safeInteger(data(range, "minMidiPitch"), `${path}.minMidiPitch`, min, max);
  const high = safeInteger(data(range, "maxMidiPitch"), `${path}.maxMidiPitch`, min, max);
  if (low > high) return fail(path, "minimum must not exceed maximum");
  return { minMidiPitch: low, maxMidiPitch: high };
}

function validateRequest(value: unknown, acceptBassDefaultAliases = false): NormalizedRequest {
  const request = ownDataRecord(
    value,
    "normalizedRequest",
    [
      "schema",
      "engineVersion",
      "generatorVersion",
      "profile",
      "harmony",
      "section",
      "intent",
      "rootSeed",
      "arpeggiator",
    ],
    ["bass"],
  );
  if (!acceptBassDefaultAliases && !Object.hasOwn(request, "bass"))
    return fail(
      "normalizedRequest.bass",
      "frozen source requests must contain normalized Bass values",
    );
  const schema = exactString(data(request, "schema"), "normalizedRequest.schema");
  if (schema !== REQUEST_SCHEMA)
    return fail("normalizedRequest.schema", "unexpected request schema");
  const engineVersion = exactString(
    data(request, "engineVersion"),
    "normalizedRequest.engineVersion",
  );
  if (engineVersion !== ENGINE_VERSION)
    return fail("normalizedRequest.engineVersion", "unexpected engine identity");
  const generatorVersion = exactString(
    data(request, "generatorVersion"),
    "normalizedRequest.generatorVersion",
  );
  if (generatorVersion !== GENERATOR_VERSION)
    return fail("normalizedRequest.generatorVersion", "unexpected generator identity");

  const profileRecord = ownDataRecord(data(request, "profile"), "normalizedRequest.profile", [
    "id",
  ]);
  const profile = exactString(
    data(profileRecord, "id"),
    "normalizedRequest.profile.id",
    PROFILE_IDS,
  );
  const harmonyRecord = ownDataRecord(data(request, "harmony"), "normalizedRequest.harmony", [
    "templateId",
    "templateVersion",
    "key",
  ]);
  const templateId = exactString(
    data(harmonyRecord, "templateId"),
    "normalizedRequest.harmony.templateId",
    TEMPLATE_IDS,
  );
  const templateVersion = exactString(
    data(harmonyRecord, "templateVersion"),
    "normalizedRequest.harmony.templateVersion",
  );
  if (templateVersion !== "v1")
    return fail("normalizedRequest.harmony.templateVersion", "only v1 is accepted");
  const keyRecord = ownDataRecord(data(harmonyRecord, "key"), "normalizedRequest.harmony.key", [
    "tonic",
    "scale",
  ]);
  const tonic = safeInteger(data(keyRecord, "tonic"), "normalizedRequest.harmony.key.tonic", 0, 11);
  const scale = exactString(
    data(keyRecord, "scale"),
    "normalizedRequest.harmony.key.scale",
    SCALES,
  );

  const sectionRecord = ownDataRecord(data(request, "section"), "normalizedRequest.section", [
    "tempo",
  ]);
  const tempoRecord = ownDataRecord(
    data(sectionRecord, "tempo"),
    "normalizedRequest.section.tempo",
    ["microsecondsPerQuarter"],
  );
  const tempo = safeInteger(
    data(tempoRecord, "microsecondsPerQuarter"),
    "normalizedRequest.section.tempo.microsecondsPerQuarter",
    1,
    Number.MAX_SAFE_INTEGER,
  );
  const intentRecord = ownDataRecord(data(request, "intent"), "normalizedRequest.intent", [
    "energy",
    "complexity",
  ]);
  const energy = exactString(
    data(intentRecord, "energy"),
    "normalizedRequest.intent.energy",
    ENERGY,
  );
  const complexity = exactString(
    data(intentRecord, "complexity"),
    "normalizedRequest.intent.complexity",
    COMPLEXITY,
  );
  const rootSeed = safeInteger(
    data(request, "rootSeed"),
    "normalizedRequest.rootSeed",
    0,
    0xffff_ffff,
  );

  let bassRange: { minMidiPitch: number; maxMidiPitch: number } = { ...DEFAULT_BASS_RANGE };
  let bassRhythm: string = DEFAULT_BASS_RHYTHM;
  if (Object.hasOwn(request, "bass")) {
    const bassRecord = ownDataRecord(
      data(request, "bass"),
      "normalizedRequest.bass",
      acceptBassDefaultAliases ? [] : ["range", "rhythm"],
      acceptBassDefaultAliases ? ["range", "rhythm"] : [],
    );
    const rangeSupplied = Object.hasOwn(bassRecord, "range");
    const rhythmSupplied = Object.hasOwn(bassRecord, "rhythm");
    if (!acceptBassDefaultAliases && (!rangeSupplied || !rhythmSupplied))
      return fail(
        "normalizedRequest.bass",
        "frozen source requests must contain normalized Bass values",
      );
    if (rangeSupplied) {
      const rawRange = data(bassRecord, "range");
      if (rawRange === undefined)
        return fail("normalizedRequest.bass.range", "undefined is not a default alias");
      bassRange = requireRange(rawRange, "normalizedRequest.bass.range", 0, 127);
    }
    if (rhythmSupplied) {
      bassRhythm = exactString(
        data(bassRecord, "rhythm"),
        "normalizedRequest.bass.rhythm",
        BASS_RHYTHMS,
      );
    }
  }
  const arpRecord = ownDataRecord(data(request, "arpeggiator"), "normalizedRequest.arpeggiator", [
    "range",
    "profile",
    "policy",
    "seedDerivation",
    "prng",
  ]);
  const arpRange = requireRange(
    data(arpRecord, "range"),
    "normalizedRequest.arpeggiator.range",
    0,
    127,
  );
  const versions: Record<keyof typeof ARPEGGIATOR_VERSIONS, { version: string }> = {
    profile: { version: "" },
    policy: { version: "" },
    seedDerivation: { version: "" },
    prng: { version: "" },
  };
  for (const key of Object.keys(ARPEGGIATOR_VERSIONS) as (keyof typeof ARPEGGIATOR_VERSIONS)[]) {
    const versionRecord = ownDataRecord(
      data(arpRecord, key),
      `normalizedRequest.arpeggiator.${key}`,
      ["version"],
    );
    const version = exactString(
      data(versionRecord, "version"),
      `normalizedRequest.arpeggiator.${key}.version`,
    );
    if (version !== ARPEGGIATOR_VERSIONS[key])
      return fail(`normalizedRequest.arpeggiator.${key}.version`, "unexpected version identity");
    versions[key] = { version };
  }

  // Explicit reconstruction makes the reference independent of caller object-key order.
  return {
    schema,
    engineVersion,
    generatorVersion,
    profile: { id: profile },
    harmony: { templateId, templateVersion, key: { tonic, scale } },
    section: { tempo: { microsecondsPerQuarter: tempo } },
    intent: { energy, complexity },
    rootSeed,
    bass: { range: bassRange, rhythm: bassRhythm },
    arpeggiator: {
      range: arpRange,
      profile: versions.profile,
      policy: versions.policy,
      seedDerivation: versions.seedDerivation,
      prng: versions.prng,
    },
  };
}

function eventProjection(value: unknown, path: string) {
  const events = denseArray(value, path).map((entry, index) => {
    const event = ownDataRecord(entry, `${path}[${index}]`, [
      "pitch",
      "startTick",
      "durationTicks",
    ]);
    return {
      pitch: safeInteger(data(event, "pitch"), `${path}[${index}].pitch`, 0, 127),
      startTick: safeInteger(data(event, "startTick"), `${path}[${index}].startTick`, 0, 30_720),
      durationTicks: safeInteger(
        data(event, "durationTicks"),
        `${path}[${index}].durationTicks`,
        1,
        30_720,
      ),
    };
  });
  if (events.length === 0) return fail(path, "frozen source event arrays must be non-empty");
  if (
    events.some(
      (event, index) => index > 0 && event.startTick <= (events[index - 1]?.startTick ?? -1),
    )
  )
    return fail(path, "event order must retain strictly increasing start ticks");
  return events;
}

function harmonyProjection(value: unknown, path: string) {
  const harmony = ownDataRecord(value, path, [
    "profile",
    "templateId",
    "templateVersion",
    "key",
    "slots",
  ]);
  const profile = exactString(data(harmony, "profile"), `${path}.profile`, PROFILE_IDS);
  const templateId = exactString(data(harmony, "templateId"), `${path}.templateId`, TEMPLATE_IDS);
  const templateVersion = exactString(data(harmony, "templateVersion"), `${path}.templateVersion`);
  if (templateVersion !== "v1") return fail(`${path}.templateVersion`, "only v1 is accepted");
  const rawKey = ownDataRecord(data(harmony, "key"), `${path}.key`, ["tonic", "scale"]);
  const key = {
    tonic: safeInteger(data(rawKey, "tonic"), `${path}.key.tonic`, 0, 11),
    scale: exactString(data(rawKey, "scale"), `${path}.key.scale`, SCALES),
  };
  const slots = denseArray(data(harmony, "slots"), `${path}.slots`).map((value, index) => {
    const slotPath = `${path}.slots[${index}]`;
    const slot = ownDataRecord(value, slotPath, [
      "index",
      "degree",
      "bars",
      "chord",
      "inversion",
      "voicing",
    ]);
    const chordRecord = ownDataRecord(data(slot, "chord"), `${slotPath}.chord`, [
      "root",
      "quality",
    ]);
    const voicingRecord = ownDataRecord(data(slot, "voicing"), `${slotPath}.voicing`, [
      "midiPitches",
    ]);
    const midiPitches = denseArray(
      data(voicingRecord, "midiPitches"),
      `${slotPath}.voicing.midiPitches`,
    ).map((pitch, pitchIndex) =>
      safeInteger(pitch, `${slotPath}.voicing.midiPitches[${pitchIndex}]`, 0, 127),
    );
    const chordRoot = safeInteger(data(chordRecord, "root"), `${slotPath}.chord.root`, 0, 11);
    const chordQuality = exactString(
      data(chordRecord, "quality"),
      `${slotPath}.chord.quality`,
      CHORD_QUALITIES,
    );
    const inversion = safeInteger(data(slot, "inversion"), `${slotPath}.inversion`, 0, 2);
    const intervals = CHORD_INTERVALS[chordQuality] as readonly number[];
    const expectedPitchClasses = [
      ...intervals.slice(inversion),
      ...intervals.slice(0, inversion),
    ].map((interval) => (chordRoot + interval) % 12);
    if (
      midiPitches.length !== 3 ||
      midiPitches.some(
        (pitch, pitchIndex) => pitchIndex > 0 && pitch <= (midiPitches[pitchIndex - 1] ?? -1),
      ) ||
      midiPitches.some((pitch, pitchIndex) => pitch % 12 !== expectedPitchClasses[pitchIndex])
    )
      return fail(
        `${slotPath}.voicing.midiPitches`,
        "voicing must preserve the selected ordered triad and inversion",
      );
    return {
      index: safeInteger(data(slot, "index"), `${slotPath}.index`, 0, 3),
      degree: safeInteger(data(slot, "degree"), `${slotPath}.degree`, 0, 6),
      bars: safeInteger(data(slot, "bars"), `${slotPath}.bars`, 1, 8),
      chord: {
        root: chordRoot,
        quality: chordQuality,
      },
      inversion,
      voicing: { midiPitches },
    };
  });
  if (slots.length !== 4 || slots.some((slot, index) => slot.index !== index || slot.bars !== 2))
    return fail(`${path}.slots`, "the frozen source requires four ordered two-bar slots");
  return { profile, templateId, templateVersion, key, slots };
}

function validateVector(value: unknown, requestOverride?: unknown) {
  const vector = ownDataRecord(value, "vector", ["vectorId", "normalizedRequest", "components"]);
  const vectorId = exactString(data(vector, "vectorId"), "vector.vectorId");
  if (!FIRST_PLAYABLE_VECTOR_IDS.includes(vectorId as (typeof FIRST_PLAYABLE_VECTOR_IDS)[number]))
    return fail("vector.vectorId", "unexpected vector identity");
  const request = validateRequest(
    requestOverride === undefined ? data(vector, "normalizedRequest") : requestOverride,
    requestOverride !== undefined,
  );
  const sourceComponents = ownDataRecord(data(vector, "components"), "vector.components", [
    "harmony",
    "bass",
    "arpeggiator",
  ]);
  const harmony = harmonyProjection(data(sourceComponents, "harmony"), "components.harmony");
  const bass = eventProjection(data(sourceComponents, "bass"), "components.bass");
  const arpeggiator = eventProjection(
    data(sourceComponents, "arpeggiator"),
    "components.arpeggiator",
  );
  if (
    harmony.profile !== request.profile.id ||
    harmony.templateId !== request.harmony.templateId ||
    harmony.templateVersion !== request.harmony.templateVersion
  )
    return fail("components.harmony", "source and normalized-request Harmony identities differ");
  if (
    harmony.key.tonic !== request.harmony.key.tonic ||
    harmony.key.scale !== request.harmony.key.scale
  )
    return fail("components.harmony.key", "source and normalized-request Key differ");
  const bassLow = request.bass.range.minMidiPitch;
  const bassHigh = request.bass.range.maxMidiPitch;
  if (bass.some((event) => event.pitch < bassLow || event.pitch > bassHigh))
    return fail("components.bass", "an event pitch is outside the normalized Bass range");
  const arpLow = request.arpeggiator.range.minMidiPitch;
  const arpHigh = request.arpeggiator.range.maxMidiPitch;
  if (arpeggiator.some((event) => event.pitch < arpLow || event.pitch > arpHigh))
    return fail(
      "components.arpeggiator",
      "an event pitch is outside the normalized Arpeggiator range",
    );
  for (const [name, events] of [
    ["bass", bass],
    ["arpeggiator", arpeggiator],
  ] as const) {
    for (const event of events) {
      if (event.startTick + event.durationTicks > 30_720)
        return fail(`components.${name}`, "an event exceeds the fixed eight-bar section");
    }
  }
  return { vectorId, request, harmony, bass, arpeggiator };
}

function sectionProjection(request: NormalizedRequest) {
  return {
    ppq: 960,
    barCount: 8,
    timeSignature: { schema: "nightdrive.time-signature.v1", numerator: 4, denominator: 4 },
    tempo: {
      schema: "nightdrive.tempo.v1",
      microsecondsPerQuarter: request.section.tempo.microsecondsPerQuarter,
    },
  };
}

function harmonyWire(harmony: ReturnType<typeof harmonyProjection>) {
  return {
    profile: harmony.profile,
    templateId: harmony.templateId,
    templateVersion: harmony.templateVersion,
    key: {
      schema: "nightdrive.key.v1",
      tonicSemitoneClass: harmony.key.tonic,
      scale: harmony.key.scale,
    },
    slots: harmony.slots.map((slot) => ({
      index: slot.index,
      degree: slot.degree,
      bars: slot.bars,
      chord: {
        schema: "nightdrive.chord.v1",
        rootSemitoneClass: slot.chord.root,
        quality: slot.chord.quality,
      },
      inversion: { schema: "nightdrive.chord-inversion.v1", memberIndex: slot.inversion },
      voicing: { schema: "nightdrive.chord-voicing.v1", midiPitches: slot.voicing.midiPitches },
    })),
  };
}

function eventWire(events: ReturnType<typeof eventProjection>) {
  return events.map((event) => ({
    pitch: event.pitch,
    startTick: event.startTick,
    durationTicks: event.durationTicks,
  }));
}

function provenanceProjection(request: NormalizedRequest) {
  return {
    profile: { id: request.profile.id },
    harmonyTemplate: { id: request.harmony.templateId, version: request.harmony.templateVersion },
    bass: { range: request.bass.range, rhythm: request.bass.rhythm },
    arpeggiator: {
      range: request.arpeggiator.range,
      profile: request.arpeggiator.profile,
      policy: request.arpeggiator.policy,
      seedDerivation: request.arpeggiator.seedDerivation,
      prng: request.arpeggiator.prng,
    },
    intent: request.intent,
    rootSeed: request.rootSeed,
    parent: null,
  };
}

export type DerivedFirstPlayableVector = {
  vectorId: string;
  normalizedRequest: NormalizedRequest;
  componentJson: { harmony: string; bass: string; arpeggiator: string };
  resultHashInputJson: string;
  canonicalJson: string;
  utf8ByteLengths: {
    harmony: number;
    bass: number;
    arpeggiator: number;
    resultHashInput: number;
    canonical: number;
  };
  componentHashes: { harmony: string; bass: string; arpeggiator: string };
  resultHash: string;
  canonicalUtf8Sha256: string;
};

export function deriveFirstPlayableReferenceVector(value: unknown): DerivedFirstPlayableVector {
  return deriveValidatedVector(validateVector(value));
}

export function deriveFirstPlayableReferenceVectorWithRequest(
  value: unknown,
  requestOverride: unknown,
): DerivedFirstPlayableVector {
  return deriveValidatedVector(validateVector(value, requestOverride));
}

function deriveValidatedVector(
  validated: ReturnType<typeof validateVector>,
): DerivedFirstPlayableVector {
  const { vectorId, request, harmony, bass, arpeggiator } = validated;
  const section = sectionProjection(request);
  const components = {
    harmony: harmonyWire(harmony),
    bass: eventWire(bass),
    arpeggiator: eventWire(arpeggiator),
  };
  const componentJson = {
    harmony: evidenceJson({
      schema: HARMONY_COMPONENT_SCHEMA,
      section,
      component: components.harmony,
    }),
    bass: evidenceJson({ schema: BASS_COMPONENT_SCHEMA, section, component: components.bass }),
    arpeggiator: evidenceJson({
      schema: ARPEGGIATOR_COMPONENT_SCHEMA,
      section,
      component: components.arpeggiator,
    }),
  };
  const componentHashes = {
    harmony: sha256Utf8(componentJson.harmony),
    bass: sha256Utf8(componentJson.bass),
    arpeggiator: sha256Utf8(componentJson.arpeggiator),
  };
  const resultHashInputJson = evidenceJson({
    schema: RESULT_SCHEMA,
    engineVersion: request.engineVersion,
    generatorVersion: request.generatorVersion,
    section,
    components,
    provenance: provenanceProjection(request),
    componentHashes,
    warnings: [],
  });
  const resultHash = sha256Utf8(resultHashInputJson);
  const canonicalJson = evidenceJson({
    schema: RESULT_SCHEMA,
    engineVersion: request.engineVersion,
    generatorVersion: request.generatorVersion,
    section,
    components,
    provenance: provenanceProjection(request),
    componentHashes,
    warnings: [],
    resultHash,
  });
  return {
    vectorId,
    normalizedRequest: request,
    componentJson,
    resultHashInputJson,
    canonicalJson,
    utf8ByteLengths: {
      harmony: utf8Length(componentJson.harmony),
      bass: utf8Length(componentJson.bass),
      arpeggiator: utf8Length(componentJson.arpeggiator),
      resultHashInput: utf8Length(resultHashInputJson),
      canonical: utf8Length(canonicalJson),
    },
    componentHashes,
    resultHash,
    canonicalUtf8Sha256: sha256Utf8(canonicalJson),
  };
}

export function validateFrozenSourceArtifact(value: unknown) {
  const artifact = ownDataRecord(value, "sourceArtifact", ["schema", "status", "vectors"]);
  if (data(artifact, "schema") !== SOURCE_SCHEMA)
    return fail("sourceArtifact.schema", "unexpected source schema");
  if (data(artifact, "status") !== "ACCEPTED/FROZEN")
    return fail("sourceArtifact.status", "source artifact is not accepted/frozen");
  const vectors = denseArray(data(artifact, "vectors"), "sourceArtifact.vectors");
  if (vectors.length !== FIRST_PLAYABLE_VECTOR_IDS.length)
    return fail("sourceArtifact.vectors", "exactly twelve source rows are required");
  const ids = new Set<string>();
  const validated = vectors.map((vector, index) => {
    const item = validateVector(vector);
    if (item.vectorId !== FIRST_PLAYABLE_VECTOR_IDS[index])
      return fail(
        `sourceArtifact.vectors[${index}].vectorId`,
        "source rows must be FP-01..FP-12 in order",
      );
    if (ids.has(item.vectorId))
      return fail(`sourceArtifact.vectors[${index}].vectorId`, "duplicate vector ID");
    ids.add(item.vectorId);
    return item;
  });
  return { vectors, validated };
}

export function buildFirstPlayableOracle(
  sourceArtifact: unknown,
  sourceManifestSha256: string,
  referenceManifestSha256: string,
) {
  if (
    !/^[0-9a-f]{64}$/u.test(sourceManifestSha256) ||
    !/^[0-9a-f]{64}$/u.test(referenceManifestSha256)
  )
    throw new TypeError("manifest identities must be lowercase SHA-256 values");
  const { vectors } = validateFrozenSourceArtifact(sourceArtifact);
  return {
    status: "CANDIDATE",
    sourceManifestSha256,
    referenceManifestSha256,
    vectors: vectors.map(deriveFirstPlayableReferenceVector),
  };
}
