import {
  buildCompleteSectionV1,
  COMPLETE_SECTION_ENGINE_VERSION_V1,
  COMPLETE_SECTION_GENERATOR_VERSION_V1,
  COMPLETE_SECTION_REQUEST_SCHEMA_V1,
  type CompleteSectionRequestV1,
  type CompleteSectionResultV1,
  CompleteSectionValueError,
} from "../composition/complete-section";
import {
  FIRST_PLAYABLE_COMPOSITION_REQUEST_SCHEMA_V1,
  FIRST_PLAYABLE_ENGINE_VERSION_V1,
  FIRST_PLAYABLE_GENERATOR_VERSION_V1,
  FirstPlayableCompositionValueError,
} from "../composition/first-playable-composition";
import {
  ARP_ERROR_CODES,
  type ArpRange,
  ArpValueError,
  createArpRange,
} from "../music-domain/arpeggiator";
import {
  ARP_POLICY_VERSION_V2,
  ARP_PROFILE_DATA_VERSION_V2,
  type ArpPolicyGenerationRequestV2,
  generateArpEventsWithPolicyV2,
} from "../music-domain/arpeggiator-policy-generator";
import {
  BASS_ERROR_CODES,
  BASS_RHYTHM_IDS,
  BASS_V1_RANGE,
  type BassRange,
  type BassRhythmId,
  BassValueError,
  createBassRange,
  generateBassEvents,
} from "../music-domain/bass";
import { COMPONENT_SEED_DERIVATION_VERSION_V1 } from "../music-domain/component-seed";
import {
  type ComplexityV1,
  type EnergyV1,
  validateNormalizedCompositionIntentV1,
} from "../music-domain/composition-intent";
import {
  getHarmonyTemplate,
  type HarmonyProfileId,
  isHarmonyProfileId,
  realizeHarmonyProgression,
} from "../music-domain/harmony";
import { createKey, type Key } from "../music-domain/key";
import { MOTIF_POLICY_VERSION_V1 } from "../music-domain/motif-policy";
import { MOTIF_PROFILE_DATA_VERSION_V1 } from "../music-domain/motif-profile-configuration";
import { MOTIF_GENERATOR_VERSION_V1 } from "../music-domain/motif-result";
import { createTempoFromMicrosecondsPerQuarter, type Tempo } from "../music-domain/musical-time";
import { createPitchClass } from "../music-domain/pitch";
import { PRNG_ALGORITHM_ID } from "../music-domain/prng";
import { createScaleType } from "../music-domain/scale";
import { generateMotifV1 } from "./motif-generator";

type UnknownRecord = Record<PropertyKey, unknown>;

const REQUEST_FIELDS = Object.freeze([
  "schema",
  "engineVersion",
  "generatorVersion",
  "profile",
  "harmony",
  "section",
  "intent",
  "rootSeed",
  "arpeggiator",
] as const);
const COMPLETE_SECTION_FIELDS = Object.freeze([
  "schema",
  "engineVersion",
  "generatorVersion",
  "composition",
  "motif",
] as const);
const MOTIF_FIELDS = Object.freeze([
  "schema",
  "generatorVersion",
  "profile",
  "policyVersion",
] as const);
const PROFILE_FIELDS = Object.freeze(["id"] as const);
const HARMONY_FIELDS = Object.freeze(["templateId", "templateVersion", "key"] as const);
const KEY_FIELDS = Object.freeze(["tonic", "scale"] as const);
const SECTION_FIELDS = Object.freeze(["tempo"] as const);
const TEMPO_FIELDS = Object.freeze(["microsecondsPerQuarter"] as const);
const INTENT_FIELDS = Object.freeze(["energy", "complexity"] as const);
const BASS_RANGE_FIELDS = Object.freeze(["minMidiPitch", "maxMidiPitch"] as const);
const ARPEGGIATOR_FIELDS = Object.freeze([
  "range",
  "profile",
  "policy",
  "seedDerivation",
  "prng",
] as const);
const VERSION_FIELDS = Object.freeze(["version"] as const);
const RANGE_FIELDS = Object.freeze(["minMidiPitch", "maxMidiPitch"] as const);

function failRequest(field: string, message: string): never {
  throw new FirstPlayableCompositionValueError("INVALID_FIRST_PLAYABLE_REQUEST", field, message);
}

function isPlainRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireRecord(
  value: unknown,
  path: string,
  requiredFields: readonly string[],
  optionalFields: readonly string[] = [],
): UnknownRecord {
  if (!isPlainRecord(value)) return failRequest(path, `${path} must be an ordinary data record.`);
  const allowed = new Set([...requiredFields, ...optionalFields]);
  for (const field of requiredFields) {
    if (!Object.hasOwn(value, field))
      return failRequest(`${path}.${field}`, `${path}.${field} is required.`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0)
    return failRequest(path, `${path} contains an unexpected symbol key.`);
  const unexpected = Object.getOwnPropertyNames(value)
    .filter((name) => !allowed.has(name))
    .sort();
  if (unexpected.length > 0)
    return failRequest(`${path}.${unexpected[0]}`, `${path}.${unexpected[0]} is not permitted.`);
  for (const field of Object.getOwnPropertyNames(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, field);
    if (descriptor === undefined || !("value" in descriptor))
      return failRequest(`${path}.${field}`, `${path}.${field} must be an ordinary data property.`);
  }
  return value;
}

function readData(record: UnknownRecord, field: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, field);
  return descriptor !== undefined && "value" in descriptor ? descriptor.value : undefined;
}

function validateTempo(value: unknown): Tempo {
  const record = requireRecord(value, "section.tempo", TEMPO_FIELDS);
  try {
    return createTempoFromMicrosecondsPerQuarter(
      readData(record, "microsecondsPerQuarter") as number,
    );
  } catch {
    throw new FirstPlayableCompositionValueError(
      "INVALID_FIRST_PLAYABLE_TEMPO",
      "section.tempo.microsecondsPerQuarter",
      "section.tempo.microsecondsPerQuarter must be a canonical Tempo value.",
    );
  }
}

function validateRootSeed(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 0xffff_ffff
  ) {
    throw new ArpValueError(
      ARP_ERROR_CODES.invalidRootSeed,
      "rootSeed",
      "rootSeed must be a finite safe integer in the uint32 range.",
    );
  }
  return Object.is(value, -0) ? 0 : value;
}

function validateProfile(value: unknown): HarmonyProfileId {
  const record = requireRecord(value, "profile", PROFILE_FIELDS);
  const id = readData(record, "id");
  if (!isHarmonyProfileId(id))
    return failRequest("profile.id", "profile.id must be a supported Harmony profile.");
  return id;
}

function validateHarmony(
  value: unknown,
): Readonly<{ templateId: string; templateVersion: "v1"; key: Key }> {
  const record = requireRecord(value, "harmony", HARMONY_FIELDS);
  const templateId = readData(record, "templateId");
  if (typeof templateId !== "string" || templateId.length === 0)
    return failRequest("harmony.templateId", "harmony.templateId must be a non-empty template ID.");
  const templateVersion = readData(record, "templateVersion");
  if (templateVersion !== "v1")
    return failRequest("harmony.templateVersion", "harmony.templateVersion must equal v1.");
  const template = getHarmonyTemplate(templateId);
  const keyRecord = requireRecord(readData(record, "key"), "harmony.key", KEY_FIELDS);
  const key = createKey(
    createPitchClass(readData(keyRecord, "tonic") as number),
    createScaleType(readData(keyRecord, "scale")),
  );
  if (template.version !== templateVersion)
    return failRequest("harmony.templateVersion", "harmony.templateVersion must equal v1.");
  return Object.freeze({ templateId, templateVersion, key });
}

function validateIntent(value: unknown): Readonly<{ energy: EnergyV1; complexity: ComplexityV1 }> {
  const record = requireRecord(value, "intent", INTENT_FIELDS);
  return validateNormalizedCompositionIntentV1({
    energy: readData(record, "energy"),
    complexity: readData(record, "complexity"),
  });
}

function validateBass(value: unknown): Readonly<{ range: BassRange; rhythm: BassRhythmId }> {
  if (value === undefined)
    return Object.freeze({ range: BASS_V1_RANGE, rhythm: BASS_RHYTHM_IDS.sustained });
  const record = requireRecord(value, "bass", [], ["range", "rhythm"]);
  const rangeValue = readData(record, "range");
  let range = BASS_V1_RANGE;
  if (Object.hasOwn(record, "range") && rangeValue === undefined)
    return failRequest("bass.range", "bass.range must be a canonical range when supplied.");
  if (rangeValue !== undefined) {
    const rangeRecord = requireRecord(rangeValue, "bass.range", BASS_RANGE_FIELDS);
    range = createBassRange({
      minMidiPitch: readData(rangeRecord, "minMidiPitch") as number,
      maxMidiPitch: readData(rangeRecord, "maxMidiPitch") as number,
    });
  }
  const rhythmValue = readData(record, "rhythm");
  if (Object.hasOwn(record, "rhythm") && rhythmValue === undefined)
    return failRequest("bass.rhythm", "bass.rhythm must be a supported rhythm when supplied.");
  const rhythm = rhythmValue === undefined ? BASS_RHYTHM_IDS.sustained : rhythmValue;
  if (!Object.values(BASS_RHYTHM_IDS).includes(rhythm as BassRhythmId)) {
    throw new BassValueError(
      BASS_ERROR_CODES.invalidBassRhythm,
      "parameters.rhythm",
      "parameters.rhythm must be a supported Bass rhythm.",
    );
  }
  return Object.freeze({ range, rhythm: rhythm as BassRhythmId });
}

function validateArpeggiator(value: unknown): Readonly<{
  rangeInput: unknown;
  profileVersion: typeof ARP_PROFILE_DATA_VERSION_V2;
  policyVersion: typeof ARP_POLICY_VERSION_V2;
  seedDerivationVersion: typeof COMPONENT_SEED_DERIVATION_VERSION_V1;
  prngVersion: typeof PRNG_ALGORITHM_ID;
}> {
  const record = requireRecord(value, "arpeggiator", ARPEGGIATOR_FIELDS);
  const profile = requireRecord(readData(record, "profile"), "arpeggiator.profile", VERSION_FIELDS);
  const policy = requireRecord(readData(record, "policy"), "arpeggiator.policy", VERSION_FIELDS);
  const seedDerivation = requireRecord(
    readData(record, "seedDerivation"),
    "arpeggiator.seedDerivation",
    VERSION_FIELDS,
  );
  const prng = requireRecord(readData(record, "prng"), "arpeggiator.prng", VERSION_FIELDS);
  if (readData(profile, "version") !== ARP_PROFILE_DATA_VERSION_V2) {
    throw new ArpValueError(
      ARP_ERROR_CODES.unsupportedArpProfileVersion,
      "profile.version",
      "profile.version must be the exact supported version.",
    );
  }
  if (readData(policy, "version") !== ARP_POLICY_VERSION_V2) {
    throw new ArpValueError(
      ARP_ERROR_CODES.unsupportedArpPolicyVersion,
      "policy.version",
      "policy.version must be the exact supported version.",
    );
  }
  if (readData(seedDerivation, "version") !== COMPONENT_SEED_DERIVATION_VERSION_V1) {
    throw new ArpValueError(
      ARP_ERROR_CODES.unsupportedSeedDerivationVersion,
      "seedDerivation.version",
      "seedDerivation.version must be the exact supported version.",
    );
  }
  if (readData(prng, "version") !== PRNG_ALGORITHM_ID) {
    throw new ArpValueError(
      ARP_ERROR_CODES.unsupportedPrngVersion,
      "prng.version",
      "prng.version must be the exact supported version.",
    );
  }
  return Object.freeze({
    rangeInput: readData(record, "range"),
    profileVersion: ARP_PROFILE_DATA_VERSION_V2,
    policyVersion: ARP_POLICY_VERSION_V2,
    seedDerivationVersion: COMPONENT_SEED_DERIVATION_VERSION_V1,
    prngVersion: PRNG_ALGORITHM_ID,
  });
}

type NormalizedRequest = Readonly<{
  profile: HarmonyProfileId;
  harmony: Readonly<{ templateId: string; templateVersion: "v1"; key: Key }>;
  tempo: Tempo;
  intent: Readonly<{ energy: EnergyV1; complexity: ComplexityV1 }>;
  rootSeed: number;
  bass: Readonly<{ range: BassRange; rhythm: BassRhythmId }>;
  arpeggiator: Readonly<{
    range: ArpRange;
    profileVersion: typeof ARP_PROFILE_DATA_VERSION_V2;
    policyVersion: typeof ARP_POLICY_VERSION_V2;
    seedDerivationVersion: typeof COMPONENT_SEED_DERIVATION_VERSION_V1;
    prngVersion: typeof PRNG_ALGORITHM_ID;
  }>;
}>;

function preflightRequest(value: unknown): NormalizedRequest {
  const request = requireRecord(value, "request", REQUEST_FIELDS, ["bass"]);
  const schema = readData(request, "schema");
  if (schema !== FIRST_PLAYABLE_COMPOSITION_REQUEST_SCHEMA_V1) {
    throw new FirstPlayableCompositionValueError(
      "UNSUPPORTED_FIRST_PLAYABLE_SCHEMA",
      "schema",
      "schema must be the Complete section request identity.",
    );
  }
  if (readData(request, "engineVersion") !== FIRST_PLAYABLE_ENGINE_VERSION_V1) {
    throw new FirstPlayableCompositionValueError(
      "UNSUPPORTED_FIRST_PLAYABLE_ENGINE_VERSION",
      "engineVersion",
      "engineVersion must be the Complete section engine identity.",
    );
  }
  if (readData(request, "generatorVersion") !== FIRST_PLAYABLE_GENERATOR_VERSION_V1) {
    throw new FirstPlayableCompositionValueError(
      "UNSUPPORTED_FIRST_PLAYABLE_GENERATOR_VERSION",
      "generatorVersion",
      "generatorVersion must be the Complete section generator identity.",
    );
  }
  const profile = validateProfile(readData(request, "profile"));
  const harmony = validateHarmony(readData(request, "harmony"));
  const section = requireRecord(readData(request, "section"), "section", SECTION_FIELDS);
  const tempo = validateTempo(readData(section, "tempo"));
  const intent = validateIntent(readData(request, "intent"));
  const bassValue = readData(request, "bass");
  if (Object.hasOwn(request, "bass") && bassValue === undefined)
    return failRequest("bass", "bass must be an ordinary data record when supplied.");
  const bass = validateBass(bassValue);
  const arpeggiatorVersions = validateArpeggiator(readData(request, "arpeggiator"));
  const rootSeed = validateRootSeed(readData(request, "rootSeed"));
  const arpeggiatorRange = requireRecord(
    arpeggiatorVersions.rangeInput,
    "arpeggiator.range",
    RANGE_FIELDS,
  );
  const arpeggiator = Object.freeze({
    range: createArpRange({
      minMidiPitch: readData(arpeggiatorRange, "minMidiPitch") as number,
      maxMidiPitch: readData(arpeggiatorRange, "maxMidiPitch") as number,
    }),
    profileVersion: arpeggiatorVersions.profileVersion,
    policyVersion: arpeggiatorVersions.policyVersion,
    seedDerivationVersion: arpeggiatorVersions.seedDerivationVersion,
    prngVersion: arpeggiatorVersions.prngVersion,
  });
  return Object.freeze({ profile, harmony, tempo, intent, rootSeed, bass, arpeggiator });
}

function failEnvelope(
  code: "INVALID_COMPLETE_SECTION_REQUEST" | "INVALID_COMPLETE_SECTION_MOTIF_CONFIGURATION",
  field: string,
  message: string,
): never {
  throw new CompleteSectionValueError(code, field, message);
}

function requireEnvelopeRecord(
  value: unknown,
  path: string,
  fields: readonly string[],
  code: "INVALID_COMPLETE_SECTION_REQUEST" | "INVALID_COMPLETE_SECTION_MOTIF_CONFIGURATION",
): UnknownRecord {
  if (!isPlainRecord(value))
    return failEnvelope(code, path, `${path} must be an ordinary data record.`);
  if (Object.getOwnPropertySymbols(value).length > 0)
    return failEnvelope(code, path, `${path} contains an unexpected symbol key.`);
  const names = Object.getOwnPropertyNames(value);
  if (names.join(",") !== fields.join(","))
    return failEnvelope(code, path, `${path} fields are invalid.`);
  for (const field of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, field);
    if (descriptor === undefined || !("value" in descriptor))
      return failEnvelope(code, `${path}.${field}`, `${path}.${field} is required data.`);
  }
  return value;
}

function validateCompleteSectionEnvelope(value: unknown): Readonly<{
  composition: unknown;
}> {
  const request = requireEnvelopeRecord(
    value,
    "request",
    COMPLETE_SECTION_FIELDS,
    "INVALID_COMPLETE_SECTION_REQUEST",
  );
  if (readData(request, "schema") !== COMPLETE_SECTION_REQUEST_SCHEMA_V1)
    throw new CompleteSectionValueError(
      "UNSUPPORTED_COMPLETE_SECTION_SCHEMA",
      "schema",
      "unsupported complete-section schema.",
    );
  if (readData(request, "engineVersion") !== COMPLETE_SECTION_ENGINE_VERSION_V1)
    throw new CompleteSectionValueError(
      "UNSUPPORTED_COMPLETE_SECTION_ENGINE_VERSION",
      "engineVersion",
      "unsupported complete-section engine version.",
    );
  if (readData(request, "generatorVersion") !== COMPLETE_SECTION_GENERATOR_VERSION_V1)
    throw new CompleteSectionValueError(
      "UNSUPPORTED_COMPLETE_SECTION_GENERATOR_VERSION",
      "generatorVersion",
      "unsupported complete-section generator version.",
    );
  const motif = requireEnvelopeRecord(
    readData(request, "motif"),
    "motif",
    MOTIF_FIELDS,
    "INVALID_COMPLETE_SECTION_MOTIF_CONFIGURATION",
  );
  if (readData(motif, "schema") !== "nightdrive.motif-generation-request.v1")
    throw new CompleteSectionValueError(
      "UNSUPPORTED_COMPLETE_SECTION_MOTIF_SCHEMA",
      "motif.schema",
      "unsupported Motif request schema.",
    );
  if (readData(motif, "generatorVersion") !== MOTIF_GENERATOR_VERSION_V1)
    throw new CompleteSectionValueError(
      "UNSUPPORTED_COMPLETE_SECTION_MOTIF_GENERATOR_VERSION",
      "motif.generatorVersion",
      "unsupported Motif generator version.",
    );
  const motifProfile = requireEnvelopeRecord(
    readData(motif, "profile"),
    "motif.profile",
    ["version"],
    "INVALID_COMPLETE_SECTION_MOTIF_CONFIGURATION",
  );
  if (readData(motifProfile, "version") !== MOTIF_PROFILE_DATA_VERSION_V1)
    throw new CompleteSectionValueError(
      "UNSUPPORTED_COMPLETE_SECTION_MOTIF_PROFILE_VERSION",
      "motif.profile.version",
      "unsupported Motif profile version.",
    );
  if (readData(motif, "policyVersion") !== MOTIF_POLICY_VERSION_V1)
    throw new CompleteSectionValueError(
      "UNSUPPORTED_COMPLETE_SECTION_MOTIF_POLICY_VERSION",
      "motif.policyVersion",
      "unsupported Motif policy version.",
    );
  return Object.freeze({ composition: readData(request, "composition") });
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export async function generateCompleteSectionV1(
  request: CompleteSectionRequestV1,
): Promise<CompleteSectionResultV1> {
  const envelope = validateCompleteSectionEnvelope(request as unknown);
  const normalized = preflightRequest(envelope.composition);
  const progression = realizeHarmonyProgression(
    normalized.profile,
    getHarmonyTemplate(normalized.harmony.templateId),
    normalized.harmony.key,
  );
  const bassEvents = generateBassEvents(progression, normalized.bass.range, {
    rhythm: normalized.bass.rhythm,
  });
  const arpRequest: ArpPolicyGenerationRequestV2 = {
    progression,
    range: normalized.arpeggiator.range,
    intent: normalized.intent,
    profile: { id: normalized.profile, version: normalized.arpeggiator.profileVersion },
    policy: { version: normalized.arpeggiator.policyVersion },
    seedDerivation: { version: normalized.arpeggiator.seedDerivationVersion },
    prng: { version: normalized.arpeggiator.prngVersion },
    rootSeed: normalized.rootSeed,
  };
  const arpeggiatorResult = generateArpEventsWithPolicyV2(arpRequest);
  const motif = generateMotifV1(
    deepFreeze({
      schema: "nightdrive.motif-generation-request.v1",
      generatorVersion: MOTIF_GENERATOR_VERSION_V1,
      profile: { id: normalized.profile, version: MOTIF_PROFILE_DATA_VERSION_V1 },
      policyVersion: MOTIF_POLICY_VERSION_V1,
      harmony: progression,
      intent: normalized.intent,
      rootSeed: normalized.rootSeed,
    }),
  );
  return buildCompleteSectionV1({
    progression,
    bassEvents,
    arpeggiatorEvents: arpeggiatorResult.events,
    motif,
    profile: normalized.profile,
    templateId: normalized.harmony.templateId,
    templateVersion: normalized.harmony.templateVersion,
    key: normalized.harmony.key,
    tempo: normalized.tempo,
    bassRange: normalized.bass.range,
    bassRhythm: normalized.bass.rhythm,
    arpeggiatorRange: normalized.arpeggiator.range,
    energy: normalized.intent.energy,
    complexity: normalized.intent.complexity,
    rootSeed: normalized.rootSeed,
  });
}

export { CompleteSectionValueError };
