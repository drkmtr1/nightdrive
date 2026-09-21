import {
  projectStage7HarmonyContextV1,
  STAGE7_AGGREGATE_ENGINE_VERSION_V1,
  STAGE7_ARPEGGIATOR_AGGREGATE_SCHEMA_V1,
  STAGE7_ARPEGGIATOR_GENERATOR_VERSION_V1,
  Stage7AggregateValueError,
  type Stage7ArpeggiatorAggregateV1,
  validateStage7ArpeggiatorAggregateV1,
} from "../composition/stage7-arpeggiator-aggregate";
import type { ArpRange } from "../music-domain/arpeggiator";
import type {
  ArpPolicyVersionV1,
  ArpPolicyVersionV2,
  ArpProfileDataVersionV1,
  ArpProfileDataVersionV2,
} from "../music-domain/arpeggiator-policy-configuration";
import {
  ARP_POLICY_VERSION_V1,
  ARP_POLICY_VERSION_V2,
  ARP_PROFILE_DATA_VERSION_V1,
  ARP_PROFILE_DATA_VERSION_V2,
  type ArpPolicyGenerationRequestV1,
  type ArpPolicyGenerationRequestV2,
  type ArpPrngVersionV1,
  COMPONENT_SEED_DERIVATION_VERSION_V1,
  generateArpEventsWithPolicyV1,
  generateArpEventsWithPolicyV2,
} from "../music-domain/arpeggiator-policy-generator";
import {
  preflightArpPolicyGenerationV1,
  preflightArpPolicyGenerationV2,
} from "../music-domain/arpeggiator-policy-preflight";
import type { ComponentSeedDerivationVersionV1 } from "../music-domain/component-seed";
import type { ComplexityV1, EnergyV1 } from "../music-domain/composition-intent";
import type { HarmonyProfileId, HarmonyProgressionRealization } from "../music-domain/harmony";
import {
  createTempoFromMicrosecondsPerQuarter,
  PPQ,
  type Tempo,
  V1_BAR_COUNT,
  V1_TIME_SIGNATURE,
} from "../music-domain/musical-time";
import { PRNG_ALGORITHM_ID } from "../music-domain/prng";
import { digestStage7ArpeggiatorAggregateV1 } from "./stage7-aggregate-hash";
import {
  digestStage7ArpeggiatorComponentV1,
  digestStage7HarmonyComponentV1,
} from "./stage7-component-hashes";

export type Stage7ArpeggiatorAggregateRequestV1 = Readonly<{
  schema: typeof STAGE7_ARPEGGIATOR_AGGREGATE_SCHEMA_V1;
  engineVersion: typeof STAGE7_AGGREGATE_ENGINE_VERSION_V1;
  generatorVersion: typeof STAGE7_ARPEGGIATOR_GENERATOR_VERSION_V1;
  parent: null;
  tempo: Tempo;
  progression: HarmonyProgressionRealization;
  range: ArpRange;
  intent: Readonly<{ energy: EnergyV1; complexity: ComplexityV1 }>;
  profile: Readonly<{
    id: HarmonyProfileId;
    version: ArpProfileDataVersionV1 | ArpProfileDataVersionV2;
  }>;
  policy: Readonly<{ version: ArpPolicyVersionV1 | ArpPolicyVersionV2 }>;
  seedDerivation: Readonly<{ version: ComponentSeedDerivationVersionV1 }>;
  prng: Readonly<{ version: ArpPrngVersionV1 }>;
  rootSeed: number;
}>;

type UnknownRecord = Record<PropertyKey, unknown>;
type SupportedProfileVersion = ArpProfileDataVersionV1 | ArpProfileDataVersionV2;
type SupportedPolicyVersion = ArpPolicyVersionV1 | ArpPolicyVersionV2;

function fail(
  code: ConstructorParameters<typeof Stage7AggregateValueError>[0],
  field: string,
  message: string,
): never {
  throw new Stage7AggregateValueError(code, field, message);
}

function isRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function readData(record: UnknownRecord, property: string, _field: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, property);
  if (descriptor === undefined || !("value" in descriptor)) return undefined;
  return descriptor.value;
}

function requireRequest(value: unknown): UnknownRecord {
  if (!isRecord(value))
    return fail("INVALID_AGGREGATE_REQUEST", "request", "request must be an ordinary record.");
  return value;
}

function readTempo(value: unknown): Tempo {
  if (!isRecord(value))
    return fail(
      "INVALID_AGGREGATE_TEMPO",
      "tempo.microsecondsPerQuarter",
      "tempo must be a valid Tempo record.",
    );
  const microseconds = readData(value, "microsecondsPerQuarter", "tempo.microsecondsPerQuarter");
  try {
    return createTempoFromMicrosecondsPerQuarter(microseconds as number);
  } catch {
    return fail(
      "INVALID_AGGREGATE_TEMPO",
      "tempo.microsecondsPerQuarter",
      "tempo.microsecondsPerQuarter must be a positive safe integer.",
    );
  }
}

function snapshotRecord(value: unknown, fields: readonly string[]): unknown {
  if (!isRecord(value)) {
    return typeof value === "object" && value !== null ? undefined : value;
  }
  const snapshot: UnknownRecord = {};
  for (const field of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, field);
    snapshot[field] =
      descriptor !== undefined && "value" in descriptor ? descriptor.value : undefined;
  }
  return Object.freeze(snapshot);
}

function snapshotRequest(raw: UnknownRecord): UnknownRecord {
  const snapshot: UnknownRecord = {};
  for (const field of [
    "schema",
    "engineVersion",
    "generatorVersion",
    "parent",
    "tempo",
    "progression",
    "range",
    "intent",
    "profile",
    "policy",
    "seedDerivation",
    "prng",
    "rootSeed",
  ] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(raw, field);
    snapshot[field] =
      descriptor !== undefined && "value" in descriptor ? descriptor.value : undefined;
  }
  snapshot.intent = snapshotRecord(snapshot.intent, ["energy", "complexity"]);
  snapshot.range = snapshotRecord(snapshot.range, ["minMidiPitch", "maxMidiPitch"]);
  snapshot.profile = snapshotRecord(snapshot.profile, ["id", "version"]);
  snapshot.policy = snapshotRecord(snapshot.policy, ["version"]);
  snapshot.seedDerivation = snapshotRecord(snapshot.seedDerivation, ["version"]);
  snapshot.prng = snapshotRecord(snapshot.prng, ["version"]);
  return Object.freeze(snapshot);
}

function buildPolicyRequest(
  profileVersion: SupportedProfileVersion,
  policyVersion: SupportedPolicyVersion,
  preflight: {
    profileId: HarmonyProfileId;
    energy: EnergyV1;
    complexity: ComplexityV1;
    progression: HarmonyProgressionRealization;
    range: ArpRange;
    rootSeed: number;
  },
): ArpPolicyGenerationRequestV1 | ArpPolicyGenerationRequestV2 {
  return Object.freeze({
    progression: preflight.progression,
    range: preflight.range,
    intent: Object.freeze({ energy: preflight.energy, complexity: preflight.complexity }),
    profile: Object.freeze({ id: preflight.profileId, version: profileVersion }),
    policy: Object.freeze({ version: policyVersion }),
    seedDerivation: Object.freeze({ version: COMPONENT_SEED_DERIVATION_VERSION_V1 }),
    prng: Object.freeze({ version: PRNG_ALGORITHM_ID }),
    rootSeed: preflight.rootSeed,
  }) as ArpPolicyGenerationRequestV1 | ArpPolicyGenerationRequestV2;
}

function validateConstructedAggregate(value: unknown): Stage7ArpeggiatorAggregateV1 {
  try {
    return validateStage7ArpeggiatorAggregateV1(value);
  } catch (error) {
    if (error instanceof Stage7AggregateValueError) {
      throw new Error("Stage 7 aggregate construction invariant failed.", { cause: error });
    }
    throw error;
  }
}

/** Generates the supplied-Harmony Stage 7 aggregate after the complete contract preflight. */
export async function generateStage7ArpeggiatorAggregateV1(
  request: Stage7ArpeggiatorAggregateRequestV1,
): Promise<Stage7ArpeggiatorAggregateV1> {
  const raw = requireRequest(request as unknown);
  const schema = readData(raw, "schema", "schema");
  if (schema !== STAGE7_ARPEGGIATOR_AGGREGATE_SCHEMA_V1)
    return fail(
      "UNSUPPORTED_AGGREGATE_SCHEMA",
      "schema",
      "schema must be the Stage 7 aggregate V1 identity.",
    );
  const engineVersion = readData(raw, "engineVersion", "engineVersion");
  if (engineVersion !== STAGE7_AGGREGATE_ENGINE_VERSION_V1)
    return fail(
      "UNSUPPORTED_AGGREGATE_ENGINE_VERSION",
      "engineVersion",
      "engineVersion must be the Stage 7 engine V1 identity.",
    );
  const generatorVersion = readData(raw, "generatorVersion", "generatorVersion");
  if (generatorVersion !== STAGE7_ARPEGGIATOR_GENERATOR_VERSION_V1)
    return fail(
      "UNSUPPORTED_AGGREGATE_GENERATOR_VERSION",
      "generatorVersion",
      "generatorVersion must be the Stage 7 Arpeggiator generator V1 identity.",
    );
  const parent = readData(raw, "parent", "parent");
  if (parent !== null)
    return fail("INVALID_AGGREGATE_PARENT", "parent", "parent must be explicitly null.");
  const tempo = readTempo(readData(raw, "tempo", "tempo"));
  const profileValue = readData(raw, "profile", "profile");
  const policyValue = readData(raw, "policy", "policy");
  const profileVersion = isRecord(profileValue)
    ? readData(profileValue, "version", "profile.version")
    : undefined;
  if (
    profileVersion !== ARP_PROFILE_DATA_VERSION_V1 &&
    profileVersion !== ARP_PROFILE_DATA_VERSION_V2
  )
    return fail(
      "UNSUPPORTED_AGGREGATE_PROFILE_VERSION",
      "profile.version",
      "profile.version must be a supported profile identity.",
    );
  const policyVersion = isRecord(policyValue)
    ? readData(policyValue, "version", "policy.version")
    : undefined;
  if (policyVersion !== ARP_POLICY_VERSION_V1 && policyVersion !== ARP_POLICY_VERSION_V2)
    return fail(
      "UNSUPPORTED_AGGREGATE_POLICY_VERSION",
      "policy.version",
      "policy.version must be a supported policy identity.",
    );
  const isV1 =
    profileVersion === ARP_PROFILE_DATA_VERSION_V1 && policyVersion === ARP_POLICY_VERSION_V1;
  const isV2 =
    profileVersion === ARP_PROFILE_DATA_VERSION_V2 && policyVersion === ARP_POLICY_VERSION_V2;
  if (!isV1 && !isV2)
    return fail(
      "INCOMPATIBLE_AGGREGATE_ARP_VERSIONS",
      "policy.version",
      "profile.version and policy.version must be a supported compatible pair.",
    );

  const preflightInput = snapshotRequest(raw);
  const preflight = isV1
    ? preflightArpPolicyGenerationV1(preflightInput)
    : preflightArpPolicyGenerationV2(preflightInput);
  const policyRequest = buildPolicyRequest(profileVersion, policyVersion, preflight);
  const generated = isV1
    ? generateArpEventsWithPolicyV1(policyRequest as ArpPolicyGenerationRequestV1)
    : generateArpEventsWithPolicyV2(policyRequest as ArpPolicyGenerationRequestV2);

  const section = Object.freeze({
    ppq: PPQ,
    barCount: V1_BAR_COUNT,
    timeSignature: V1_TIME_SIGNATURE,
    tempo,
  });
  const harmony = projectStage7HarmonyContextV1(preflight.progression);
  const components = Object.freeze({ harmony, arpeggiator: generated.events });
  const provenance = Object.freeze({
    profile: Object.freeze({ id: preflight.profileId, version: profileVersion }),
    policy: Object.freeze({ version: policyVersion }),
    seedDerivation: Object.freeze({ version: COMPONENT_SEED_DERIVATION_VERSION_V1 }),
    prng: Object.freeze({ version: PRNG_ALGORITHM_ID }),
    rootSeed: preflight.rootSeed,
    normalizedInputs: Object.freeze({
      intent: Object.freeze({ energy: preflight.energy, complexity: preflight.complexity }),
      range: preflight.range,
    }),
    parent: null,
  });
  const componentHashes = Object.freeze({
    harmony: digestStage7HarmonyComponentV1(section, harmony),
    arpeggiator: digestStage7ArpeggiatorComponentV1(section, generated.events),
  });
  const partial = Object.freeze({
    schema: STAGE7_ARPEGGIATOR_AGGREGATE_SCHEMA_V1,
    engineVersion: STAGE7_AGGREGATE_ENGINE_VERSION_V1,
    generatorVersion: STAGE7_ARPEGGIATOR_GENERATOR_VERSION_V1,
    section,
    components,
    provenance,
    componentHashes,
    warnings: Object.freeze([]) as readonly [],
    resultHash: "0".repeat(64),
  });
  const resultHash = digestStage7ArpeggiatorAggregateV1(partial);
  return validateConstructedAggregate(Object.freeze({ ...partial, resultHash }));
}
