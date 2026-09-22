import {
  BASS_ERROR_CODES,
  BASS_RHYTHM_IDS,
  BassValueError,
  BASS_V1_RANGE,
  createBassRange,
  generateBassEvents,
  type BassRange,
  type BassRhythmId,
} from "../music-domain/bass";
import {
  ARP_ERROR_CODES,
  ArpValueError,
  createArpRange,
  type ArpRange,
} from "../music-domain/arpeggiator";
import {
  ARP_POLICY_VERSION_V2,
  ARP_PROFILE_DATA_VERSION_V2,
  generateArpEventsWithPolicyV2,
  type ArpPolicyGenerationRequestV2,
} from "../music-domain/arpeggiator-policy-generator";
import { COMPONENT_SEED_DERIVATION_VERSION_V1 } from "../music-domain/component-seed";
import {
  type ComplexityV1,
  validateNormalizedCompositionIntentV1,
  type EnergyV1,
} from "../music-domain/composition-intent";
import {
  getHarmonyTemplate,
  isHarmonyProfileId,
  realizeHarmonyProgression,
  type HarmonyProfileId,
} from "../music-domain/harmony";
import { createKey, type Key } from "../music-domain/key";
import { createTempoFromMicrosecondsPerQuarter, type Tempo } from "../music-domain/musical-time";
import { PRNG_ALGORITHM_ID } from "../music-domain/prng";
import { createPitchClass } from "../music-domain/pitch";
import { createScaleType } from "../music-domain/scale";
import {
  buildFirstPlayableCompositionV1,
  FIRST_PLAYABLE_COMPOSITION_REQUEST_SCHEMA_V1,
  FIRST_PLAYABLE_ENGINE_VERSION_V1,
  FIRST_PLAYABLE_GENERATOR_VERSION_V1,
  FirstPlayableCompositionValueError,
  type FirstPlayableCompositionRequestV1,
  type FirstPlayableCompositionResultV1,
} from "../composition/first-playable-composition";

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
      "schema must be the First Playable request identity.",
    );
  }
  if (readData(request, "engineVersion") !== FIRST_PLAYABLE_ENGINE_VERSION_V1) {
    throw new FirstPlayableCompositionValueError(
      "UNSUPPORTED_FIRST_PLAYABLE_ENGINE_VERSION",
      "engineVersion",
      "engineVersion must be the First Playable engine identity.",
    );
  }
  if (readData(request, "generatorVersion") !== FIRST_PLAYABLE_GENERATOR_VERSION_V1) {
    throw new FirstPlayableCompositionValueError(
      "UNSUPPORTED_FIRST_PLAYABLE_GENERATOR_VERSION",
      "generatorVersion",
      "generatorVersion must be the First Playable generator identity.",
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

export async function generateFirstPlayableCompositionV1(
  request: FirstPlayableCompositionRequestV1,
): Promise<FirstPlayableCompositionResultV1> {
  const normalized = preflightRequest(request as unknown);
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
  return buildFirstPlayableCompositionV1({
    progression,
    bassEvents,
    arpeggiatorEvents: arpeggiatorResult.events,
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

export { FirstPlayableCompositionValueError };
