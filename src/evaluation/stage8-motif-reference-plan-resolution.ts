/**
 * Evaluation-only independent plan resolution for the Stage 8 Motif reference.
 *
 * This module resolves only the settled four policy decisions into the canonical
 * plan shape. Pitch projection, timing, serialization, capture, and production
 * comparison remain separate qualification work.
 */

import {
  buildStage8MotifReferenceWeightedCandidates,
  STAGE8_MOTIF_REFERENCE_POLICY_VERSION,
  STAGE8_MOTIF_REFERENCE_PROFILE_DATA_VERSION,
  type Stage8MotifReferenceComplexity,
  type Stage8MotifReferenceEnergy,
  type Stage8MotifReferenceProfileId,
  type Stage8MotifReferenceSlotId,
} from "./stage8-motif-reference-policy";
import {
  createStage8MotifReferencePrng,
  deriveStage8MotifReferenceSeed,
  type Stage8MotifReferencePrng,
  selectStage8MotifReferenceWeightedCandidate,
} from "./stage8-motif-reference-primitives";

export type Stage8MotifReferencePlanContextV1 = Readonly<{
  profileId: Stage8MotifReferenceProfileId;
  energy: Stage8MotifReferenceEnergy;
  complexity: Stage8MotifReferenceComplexity;
}>;

export type Stage8MotifReferenceRhythmTemplate = "sparse-4" | "steady-6" | "active-8";
export type Stage8MotifReferenceRegisterBand = "lower" | "middle" | "upper";
export type Stage8MotifReferenceTensionMode = "chordal" | "diatonic-passing";
export type Stage8MotifReferencePhrase4Displacement = "none" | "earlier-480" | "later-480";
export type Stage8MotifReferencePhraseRoles = readonly [
  "identity",
  "motif-form-repetition",
  "harmony-aware-transposition",
  "contour-preserving-response",
];

export type Stage8MotifReferencePlanV1 = Readonly<{
  policyVersion: typeof STAGE8_MOTIF_REFERENCE_POLICY_VERSION;
  profileVersion: typeof STAGE8_MOTIF_REFERENCE_PROFILE_DATA_VERSION;
  rhythmTemplate: Stage8MotifReferenceRhythmTemplate;
  registerBand: Stage8MotifReferenceRegisterBand;
  tensionMode: Stage8MotifReferenceTensionMode;
  phrase4Displacement: Stage8MotifReferencePhrase4Displacement;
  contourOffsets: readonly number[];
  phraseRoles: Stage8MotifReferencePhraseRoles;
}>;

const CONTOUR_OFFSETS: Readonly<Record<Stage8MotifReferenceRhythmTemplate, readonly number[]>> =
  Object.freeze({
    "sparse-4": Object.freeze([0, 1, 2, 0] as const),
    "steady-6": Object.freeze([0, 1, 2, 1, 2, 0] as const),
    "active-8": Object.freeze([0, 1, 2, 3, 2, 3, 1, 0] as const),
  });

const PHRASE_ROLES: Stage8MotifReferencePhraseRoles = Object.freeze([
  "identity",
  "motif-form-repetition",
  "harmony-aware-transposition",
  "contour-preserving-response",
] as const);

function fail(field: string): never {
  throw new RangeError(`${field} must match the canonical Stage 8 Motif plan contract.`);
}

function exactRecord(
  value: unknown,
  expectedKeys: readonly string[],
  field: string,
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return fail(field);
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== expectedKeys.length) return fail(field);
  for (const [index, key] of expectedKeys.entries()) {
    if (keys[index] !== key) return fail(field);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable) {
      return fail(`${field}.${key}`);
    }
  }
  return value as Record<string, unknown>;
}

function exactMember<T extends string>(value: unknown, members: readonly T[], field: string): T {
  if (typeof value !== "string" || !members.includes(value as T)) return fail(field);
  return value as T;
}

function assertContext(value: unknown): Stage8MotifReferencePlanContextV1 {
  const context = exactRecord(value, ["profileId", "energy", "complexity"], "context");
  return Object.freeze({
    profileId: exactMember(
      context.profileId,
      ["dark-synthwave", "classic-synthwave", "darkwave", "midtempo-cyberpunk"],
      "context.profileId",
    ),
    energy: exactMember(
      context.energy,
      ["very-low", "low", "medium", "high", "very-high"],
      "context.energy",
    ),
    complexity: exactMember(
      context.complexity,
      ["very-low", "low", "medium", "high", "very-high"],
      "context.complexity",
    ),
  });
}

function selectSlot(
  context: Stage8MotifReferencePlanContextV1,
  slot: Stage8MotifReferenceSlotId,
  prng: Stage8MotifReferencePrng,
): string {
  return selectStage8MotifReferenceWeightedCandidate(
    buildStage8MotifReferenceWeightedCandidates(
      context.profileId,
      slot,
      context.energy,
      context.complexity,
    ),
    prng.nextUint32(),
  );
}

function rhythmTemplate(value: string): Stage8MotifReferenceRhythmTemplate {
  return exactMember(value, ["sparse-4", "steady-6", "active-8"], "rhythm selection");
}

function registerBand(value: string): Stage8MotifReferenceRegisterBand {
  return exactMember(value, ["lower", "middle", "upper"], "register selection");
}

function tensionMode(value: string): Stage8MotifReferenceTensionMode {
  return exactMember(value, ["chordal", "diatonic-passing"], "tension selection");
}

function phrase4Displacement(value: string): Stage8MotifReferencePhrase4Displacement {
  return exactMember(value, ["none", "earlier-480", "later-480"], "displacement selection");
}

/**
 * Resolves one immutable canonical plan from an already validated context and a
 * canonical Motif component seed.
 */
function resolvePlanFromComponentSeed(
  context: Stage8MotifReferencePlanContextV1,
  componentSeed: unknown,
): Stage8MotifReferencePlanV1 {
  const prng = createStage8MotifReferencePrng(componentSeed);

  const selectedRhythm = rhythmTemplate(selectSlot(context, "rhythm", prng));
  const selectedRegister = registerBand(selectSlot(context, "register", prng));
  const selectedTension = tensionMode(selectSlot(context, "tension", prng));
  const selectedDisplacement = phrase4Displacement(selectSlot(context, "displacement", prng));
  const contourOffsets = contourOffsetsForRhythm(selectedRhythm);

  return Object.freeze({
    policyVersion: STAGE8_MOTIF_REFERENCE_POLICY_VERSION,
    profileVersion: STAGE8_MOTIF_REFERENCE_PROFILE_DATA_VERSION,
    rhythmTemplate: selectedRhythm,
    registerBand: selectedRegister,
    tensionMode: selectedTension,
    phrase4Displacement: selectedDisplacement,
    contourOffsets: Object.freeze([...contourOffsets]),
    phraseRoles: Object.freeze([...PHRASE_ROLES]) as Stage8MotifReferencePhraseRoles,
  });
}

/**
 * Resolves one immutable canonical plan from a strict policy context and an
 * already-derived canonical Motif component seed. This entry point lets an
 * evidence caller retain that same seed in provenance without deriving it a
 * second time or creating another stream.
 */
export function resolveStage8MotifReferencePlanFromComponentSeedV1(
  contextValue: unknown,
  componentSeed: unknown,
): Stage8MotifReferencePlanV1 {
  return resolvePlanFromComponentSeed(assertContext(contextValue), componentSeed);
}

/**
 * Resolves one immutable canonical plan from a strict policy context and root seed.
 *
 * The fixed Motif component seed is derived once, then one shared stream supplies
 * exactly four declared-order selections: rhythm, register, tension, displacement.
 */
export function resolveStage8MotifReferencePlanV1(
  contextValue: unknown,
  rootSeed: unknown,
): Stage8MotifReferencePlanV1 {
  const context = assertContext(contextValue);
  return resolvePlanFromComponentSeed(context, deriveStage8MotifReferenceSeed(rootSeed));
}

function contourOffsetsForRhythm(rhythm: Stage8MotifReferenceRhythmTemplate): readonly number[] {
  const offsets = CONTOUR_OFFSETS[rhythm];
  if (offsets === undefined) return fail("rhythm selection");
  return offsets;
}
