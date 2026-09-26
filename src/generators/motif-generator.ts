import { deriveComponentSeedV1 } from "../music-domain/component-seed";
import {
  CompositionIntentValueError,
  type NormalizedCompositionIntentV1,
  validateNormalizedCompositionIntentV1,
} from "../music-domain/composition-intent";
import {
  type HarmonyProfileId,
  type HarmonyProgressionRealization,
  isHarmonyProfileId,
} from "../music-domain/harmony";
import {
  MOTIF_GENERATOR_VERSION_V1,
  MotifResultValueError,
  createMotifGenerationResultV1,
  validateMotifHarmonyInputV1,
  type MotifGenerationResultV1,
} from "../music-domain/motif-result";
import { MOTIF_POLICY_VERSION_V1 } from "../music-domain/motif-policy";
import type { MotifEventV1 } from "../music-domain/motif-event";
import {
  MOTIF_GENRE_PROFILE_CONFIGURATION_V1,
  MOTIF_PROFILE_DATA_VERSION_V1,
  MotifGenreProfileConfigurationError,
  validateMotifGenreProfileConfigurationV1,
} from "../music-domain/motif-profile-configuration";
import {
  MotifProjectionNoValidPathError,
  projectResolvedMotifPlanV1,
} from "./motif-pitch-projector";
import { resolveMotifPlanV1 } from "./motif-policy-resolver";

export const MOTIF_GENERATION_REQUEST_SCHEMA_V1 = "nightdrive.motif-generation-request.v1" as const;

export type MotifGenerationRequestV1 = Readonly<{
  schema: typeof MOTIF_GENERATION_REQUEST_SCHEMA_V1;
  generatorVersion: typeof MOTIF_GENERATOR_VERSION_V1;
  profile: Readonly<{
    id: HarmonyProfileId;
    version: typeof MOTIF_PROFILE_DATA_VERSION_V1;
  }>;
  policyVersion: typeof MOTIF_POLICY_VERSION_V1;
  harmony: HarmonyProgressionRealization;
  intent: NormalizedCompositionIntentV1;
  rootSeed: number;
}>;

export type MotifErrorCodeV1 =
  | "INVALID_MOTIF_REQUEST"
  | "UNSUPPORTED_MOTIF_SCHEMA"
  | "UNSUPPORTED_MOTIF_GENERATOR_VERSION"
  | "UNSUPPORTED_MOTIF_PROFILE_VERSION"
  | "UNSUPPORTED_MOTIF_POLICY_VERSION"
  | "INVALID_MOTIF_PROFILE"
  | "INVALID_MOTIF_HARMONY"
  | "INCOMPATIBLE_MOTIF_PROFILE_CONTEXT"
  | "INVALID_MOTIF_INTENT"
  | "INVALID_MOTIF_ROOT_SEED"
  | "INVALID_MOTIF_POLICY_CONFIGURATION"
  | "NO_VALID_MOTIF";

export class MotifValueError extends RangeError {
  readonly code: MotifErrorCodeV1;
  readonly field: string;

  constructor(code: MotifErrorCodeV1, field: string, message: string) {
    super(message);
    this.name = "MotifValueError";
    this.code = code;
    this.field = field;
  }
}

type UnknownRecord = Record<string, unknown>;

const REQUEST_FIELDS = Object.freeze([
  "schema",
  "generatorVersion",
  "profile",
  "policyVersion",
  "harmony",
  "intent",
  "rootSeed",
] as const);
const PROFILE_FIELDS = Object.freeze(["id", "version"] as const);
const INTENT_FIELDS = Object.freeze(["energy", "complexity"] as const);

function fail(code: MotifErrorCodeV1, field: string, message: string): never {
  throw new MotifValueError(code, field, message);
}

function exactRecord(value: unknown, expected: readonly string[]): UnknownRecord | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0 ||
    Object.getOwnPropertyNames(value).join(",") !== expected.join(",")
  )
    return undefined;
  const record = value as UnknownRecord;
  return expected.every((field) => {
    const descriptor = Object.getOwnPropertyDescriptor(record, field);
    return descriptor !== undefined && "value" in descriptor && descriptor.enumerable;
  })
    ? record
    : undefined;
}

function readData(record: UnknownRecord, field: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, field);
  return descriptor !== undefined && "value" in descriptor ? descriptor.value : undefined;
}

function isDeeplyFrozenData(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return true;
  if (!Object.isFrozen(value) || Object.getOwnPropertySymbols(value).length !== 0) return false;
  const names = Object.getOwnPropertyNames(value);
  if (Array.isArray(value)) {
    const expected = [
      ...Array.from({ length: value.length }, (_, index) => String(index)),
      "length",
    ];
    if (Object.getPrototypeOf(value) !== Array.prototype || names.join(",") !== expected.join(","))
      return false;
  } else if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  return names.every((name) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    return (
      descriptor !== undefined && "value" in descriptor && isDeeplyFrozenData(descriptor.value)
    );
  });
}

function validateRequestShape(request: unknown): Readonly<{
  request: UnknownRecord;
  profile: UnknownRecord;
  intent: UnknownRecord;
}> {
  const record = exactRecord(request, REQUEST_FIELDS);
  if (record === undefined || !isDeeplyFrozenData(request))
    return fail(
      "INVALID_MOTIF_REQUEST",
      "request",
      "request must be an exact deeply immutable data record.",
    );
  const profile = exactRecord(readData(record, "profile"), PROFILE_FIELDS);
  const intent = exactRecord(readData(record, "intent"), INTENT_FIELDS);
  if (profile === undefined || intent === undefined)
    return fail(
      "INVALID_MOTIF_REQUEST",
      "request",
      "request wrappers must use the exact canonical fields.",
    );
  return Object.freeze({ request: record, profile, intent });
}

function validateIntent(record: UnknownRecord): NormalizedCompositionIntentV1 {
  try {
    return validateNormalizedCompositionIntentV1({
      energy: readData(record, "energy"),
      complexity: readData(record, "complexity"),
    });
  } catch (error) {
    if (error instanceof CompositionIntentValueError)
      return fail("INVALID_MOTIF_INTENT", "intent", "intent must contain exact canonical values.");
    throw error;
  }
}

function validateRootSeed(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 0xffff_ffff ||
    Object.is(value, -0)
  )
    return fail("INVALID_MOTIF_ROOT_SEED", "rootSeed", "rootSeed must be a canonical uint32.");
  return value;
}

function validatePolicyConfiguration(): void {
  try {
    validateMotifGenreProfileConfigurationV1(MOTIF_GENRE_PROFILE_CONFIGURATION_V1);
  } catch (error) {
    if (error instanceof MotifGenreProfileConfigurationError)
      fail(
        "INVALID_MOTIF_POLICY_CONFIGURATION",
        "profile.version",
        "the selected Motif profile configuration is invalid.",
      );
    throw error;
  }
}

export function generateMotifV1(request: unknown): MotifGenerationResultV1 {
  const shaped = validateRequestShape(request);
  if (readData(shaped.request, "schema") !== MOTIF_GENERATION_REQUEST_SCHEMA_V1)
    return fail(
      "UNSUPPORTED_MOTIF_SCHEMA",
      "schema",
      "schema must be the supported Motif request schema.",
    );
  if (readData(shaped.request, "generatorVersion") !== MOTIF_GENERATOR_VERSION_V1)
    return fail(
      "UNSUPPORTED_MOTIF_GENERATOR_VERSION",
      "generatorVersion",
      "generatorVersion must be the supported Motif generator version.",
    );
  if (readData(shaped.profile, "version") !== MOTIF_PROFILE_DATA_VERSION_V1)
    return fail(
      "UNSUPPORTED_MOTIF_PROFILE_VERSION",
      "profile.version",
      "profile.version must be the supported Motif profile version.",
    );
  if (readData(shaped.request, "policyVersion") !== MOTIF_POLICY_VERSION_V1)
    return fail(
      "UNSUPPORTED_MOTIF_POLICY_VERSION",
      "policyVersion",
      "policyVersion must be the supported Motif policy version.",
    );
  const profileId = readData(shaped.profile, "id");
  if (!isHarmonyProfileId(profileId))
    return fail(
      "INVALID_MOTIF_PROFILE",
      "profile.id",
      "profile.id must be a supported Harmony profile.",
    );

  let harmony: HarmonyProgressionRealization;
  try {
    harmony = validateMotifHarmonyInputV1(
      readData(shaped.request, "harmony") as HarmonyProgressionRealization,
    ).harmony;
  } catch (error) {
    if (error instanceof MotifResultValueError)
      return fail(
        "INVALID_MOTIF_HARMONY",
        "harmony",
        "harmony must be an exact canonical realization.",
      );
    throw error;
  }
  if (profileId !== harmony.profile)
    return fail(
      "INCOMPATIBLE_MOTIF_PROFILE_CONTEXT",
      "profile.id",
      "profile.id must equal the supplied Harmony profile.",
    );
  const intent = validateIntent(shaped.intent);
  const rootSeed = validateRootSeed(readData(shaped.request, "rootSeed"));
  validatePolicyConfiguration();

  const componentSeed = deriveComponentSeedV1(rootSeed, "motif");
  const plan = resolveMotifPlanV1({ profileId, ...intent }, componentSeed);
  let events: readonly MotifEventV1[];
  try {
    events = projectResolvedMotifPlanV1(harmony, plan);
  } catch (error) {
    if (error instanceof MotifProjectionNoValidPathError)
      return fail("NO_VALID_MOTIF", "harmony", "no complete legal Motif path exists.");
    throw error;
  }
  return createMotifGenerationResultV1({
    profileId,
    harmony,
    intent,
    rootSeed,
    componentSeed,
    plan,
    events,
  });
}
