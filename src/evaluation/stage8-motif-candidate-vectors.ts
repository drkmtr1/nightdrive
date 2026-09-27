/**
 * Evaluation-only independent candidate-vector derivation for Stage 8 Motif.
 *
 * This module converts the accepted frozen source bindings and independent
 * reference plan/projector outputs into evidence-owned request/result wire
 * strings. It never calls production Motif code or writes an artifact. Capture,
 * custody, recomputation, acceptance, and production comparison remain separate
 * bounded steps.
 */

import { createHash } from "node:crypto";
import {
  resolveStage8MotifReferencePlanFromComponentSeedV1,
  type Stage8MotifReferencePlanV1,
} from "./stage8-motif-reference-plan-resolution";
import { deriveStage8MotifReferenceSeed } from "./stage8-motif-reference-primitives";
import {
  projectStage8MotifReferencePlanV1,
  type Stage8MotifReferenceEventV1,
} from "./stage8-motif-reference-projector";
import {
  getStage8MotifQualificationInput,
  getStage8MotifSourceBinding,
  STAGE8_MOTIF_QUALIFICATION_INPUTS,
  type Stage8MotifFrozenHarmonyV1,
  type Stage8MotifQualificationInputV1,
  type Stage8MotifSourceBindingV1,
} from "./stage8-motif-source-bindings";

export const STAGE8_MOTIF_CANDIDATE_ARTIFACT_SCHEMA =
  "nightdrive.stage8-motif-candidate-vectors.v1" as const;
export const STAGE8_MOTIF_CANDIDATE_STATUS = "CANDIDATE" as const;
export const STAGE8_MOTIF_CANDIDATE_GENERATED_BY =
  "src/evaluation/stage8-motif-candidate-vectors.ts" as const;

const REQUEST_SCHEMA = "nightdrive.motif-generation-request.v1" as const;
const RESULT_SCHEMA = "nightdrive.motif-generation-result.v1" as const;
const GENERATOR_VERSION = "nightdrive.generator.motif.v1" as const;
const PROFILE_VERSION = "nightdrive.genre-profile.motif.v1" as const;
const POLICY_VERSION = "nightdrive.motif-policy.v1" as const;
const CONTOUR_VERSION = "nightdrive.motif-contour.v1" as const;
const RHYTHM_VERSION = "nightdrive.motif-rhythm.v1" as const;
const SEED_DERIVATION_VERSION = "nightdrive.seed-derivation.component.v1" as const;
const PRNG_VERSION = "nightdrive.prng.mulberry32.v1" as const;
const WEIGHTED_CHOICE_VERSION = "nightdrive.weighted-choice.uint32-modulo.v1" as const;

const MATRIX_SOURCE_RECORD_IDS = Object.freeze([
  "dark-synthwave-chorus-001",
  "classic-synthwave-chorus-001",
  "darkwave-verse-001",
  "cyberpunk-build-001",
] as const);
const MATRIX_INTENTS = Object.freeze([
  Object.freeze({ energy: "low", complexity: "low" }),
  Object.freeze({ energy: "medium", complexity: "medium" }),
  Object.freeze({ energy: "high", complexity: "high" }),
] as const);
const MATRIX_ROOT_SEEDS = Object.freeze([0, 4_294_967_295] as const);

type Stage8MotifCandidateKeyWireV1 = Readonly<{
  schema: "nightdrive.key.v1";
  tonicSemitoneClass: number;
  scale: "major" | "natural-minor" | "phrygian";
}>;

type Stage8MotifCandidateChordWireV1 = Readonly<{
  schema: "nightdrive.chord.v1";
  rootSemitoneClass: number;
  quality: "major-triad" | "minor-triad";
}>;

type Stage8MotifCandidateInversionWireV1 = Readonly<{
  schema: "nightdrive.chord-inversion.v1";
  memberIndex: 0 | 1 | 2;
}>;

type Stage8MotifCandidateVoicingWireV1 = Readonly<{
  schema: "nightdrive.chord-voicing.v1";
  midiPitches: readonly [number, number, number];
}>;

type Stage8MotifCandidateHarmonyWireV1 = Readonly<{
  profile: string;
  templateId: string;
  templateVersion: "v1";
  key: Stage8MotifCandidateKeyWireV1;
  slots: readonly Readonly<{
    index: number;
    degree: number;
    bars: 2;
    chord: Stage8MotifCandidateChordWireV1;
    inversion: Stage8MotifCandidateInversionWireV1;
    voicing: Stage8MotifCandidateVoicingWireV1;
  }>[];
}>;

/**
 * The evidence-only request string transcribes the accepted in-memory Motif
 * request shape. Its fixed explanation fields make the supplied frozen
 * Harmony context valid for later production replay; they never enter the
 * canonical result provenance wire.
 */
type Stage8MotifCandidateRequestHarmonyWireV1 = Readonly<{
  profile: string;
  templateId: string;
  templateVersion: "v1";
  key: Readonly<{
    tonic: number;
    scale: "major" | "natural-minor" | "phrygian";
  }>;
  slots: readonly Readonly<{
    index: number;
    degree: number;
    bars: 2;
    chord: Readonly<{
      root: number;
      quality: "major-triad" | "minor-triad";
    }>;
    inversion: 0 | 1 | 2;
    voicing: Readonly<{
      midiPitches: readonly [number, number, number];
    }>;
    adjacentCost: null;
    rationale: Readonly<{
      preferenceRank: 0;
      tieBreak: "Stage 8 qualification snapshot";
    }>;
  }>[];
}>;

type Stage8MotifCandidatePlanWireV1 = Readonly<{
  policyVersion: "nightdrive.motif-policy.v1";
  profileVersion: "nightdrive.genre-profile.motif.v1";
  rhythmTemplate: "sparse-4" | "steady-6" | "active-8";
  registerBand: "lower" | "middle" | "upper";
  tensionMode: "chordal" | "diatonic-passing";
  phrase4Displacement: "none" | "earlier-480" | "later-480";
  contourOffsets: readonly number[];
  phraseRoles: readonly [
    "identity",
    "motif-form-repetition",
    "harmony-aware-transposition",
    "contour-preserving-response",
  ];
}>;

type Stage8MotifCandidateEventWireV1 = Readonly<{
  pitch: number;
  startTick: number;
  durationTicks: 480 | 960;
}>;

type Stage8MotifCandidateRequestWireV1 = Readonly<{
  schema: typeof REQUEST_SCHEMA;
  generatorVersion: typeof GENERATOR_VERSION;
  profile: Readonly<{ id: string; version: typeof PROFILE_VERSION }>;
  policyVersion: typeof POLICY_VERSION;
  harmony: Stage8MotifCandidateRequestHarmonyWireV1;
  intent: Readonly<{ energy: "low" | "medium" | "high"; complexity: "low" | "medium" | "high" }>;
  rootSeed: 0 | 4_294_967_295;
}>;

type Stage8MotifCandidateResultWireV1 = Readonly<{
  schema: typeof RESULT_SCHEMA;
  generatorVersion: typeof GENERATOR_VERSION;
  plan: Stage8MotifCandidatePlanWireV1;
  events: readonly Stage8MotifCandidateEventWireV1[];
  provenance: Readonly<{
    profile: Readonly<{ id: string; version: typeof PROFILE_VERSION }>;
    policy: Readonly<{ version: typeof POLICY_VERSION }>;
    contour: Readonly<{ version: typeof CONTOUR_VERSION }>;
    rhythm: Readonly<{ version: typeof RHYTHM_VERSION }>;
    seedDerivation: Readonly<{ version: typeof SEED_DERIVATION_VERSION }>;
    prng: Readonly<{ version: typeof PRNG_VERSION }>;
    weightedChoice: Readonly<{ version: typeof WEIGHTED_CHOICE_VERSION }>;
    rootSeed: 0 | 4_294_967_295;
    componentSeed: number;
    normalizedInputs: Readonly<{
      intent: Readonly<{
        energy: "low" | "medium" | "high";
        complexity: "low" | "medium" | "high";
      }>;
    }>;
    harmony: Stage8MotifCandidateHarmonyWireV1;
    parent: null;
  }>;
}>;

export type Stage8MotifCandidateVectorV1 = Readonly<{
  vectorId: string;
  status: typeof STAGE8_MOTIF_CANDIDATE_STATUS;
  sourceRecordId: string;
  profileId: string;
  rootSeed: 0 | 4_294_967_295;
  intent: Readonly<{
    energy: "low" | "medium" | "high";
    complexity: "low" | "medium" | "high";
  }>;
  requestJson: string;
  resultJson: string;
  byteLengths: Readonly<{ request: number; result: number }>;
  sha256: Readonly<{ request: string; result: string }>;
}>;

export type Stage8MotifCandidateArtifactV1 = Readonly<{
  schema: typeof STAGE8_MOTIF_CANDIDATE_ARTIFACT_SCHEMA;
  status: typeof STAGE8_MOTIF_CANDIDATE_STATUS;
  generatedBy: typeof STAGE8_MOTIF_CANDIDATE_GENERATED_BY;
  sourceBindings: readonly Readonly<{
    sourceRecordId: string;
    source: Readonly<{ commit: string; path: string; gitBlobObjectId: string }>;
  }>[];
  matrix: Readonly<{
    vectorCount: 24;
    sourceRecordIds: readonly string[];
    intentPairs: readonly Readonly<{
      energy: "low" | "medium" | "high";
      complexity: "low" | "medium" | "high";
    }>[];
    rootSeeds: readonly (0 | 4_294_967_295)[];
  }>;
  vectors: readonly Stage8MotifCandidateVectorV1[];
}>;

function fail(field: string): never {
  throw new RangeError(`${field} must match the accepted Stage 8 qualification matrix.`);
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
    if (descriptor === undefined || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable)
      return fail(`${field}.${key}`);
  }
  return value as Record<string, unknown>;
}

function deeplyFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const key of Reflect.ownKeys(value)) deeplyFreeze(Reflect.get(value, key));
  return Object.freeze(value);
}

function canonicalInput(value: unknown): Stage8MotifQualificationInputV1 {
  const input = exactRecord(
    value,
    ["vectorId", "sourceRecordId", "profileId", "intent", "rootSeed"],
    "input",
  );
  if (typeof input.vectorId !== "string") return fail("input.vectorId");
  const expected = getStage8MotifQualificationInput(input.vectorId);
  const intent = exactRecord(input.intent, ["energy", "complexity"], "input.intent");
  if (Object.is(input.rootSeed, -0)) return fail("input.rootSeed");
  if (
    input.sourceRecordId !== expected.sourceRecordId ||
    input.profileId !== expected.profileId ||
    intent.energy !== expected.intent.energy ||
    intent.complexity !== expected.intent.complexity ||
    input.rootSeed !== expected.rootSeed
  ) {
    return fail("input");
  }
  return expected;
}

function canonicalJson(value: unknown): string {
  const encoded = JSON.stringify(value);
  if (typeof encoded !== "string")
    throw new TypeError("Stage 8 candidate wire value is not serializable.");
  return encoded;
}

export function stage8MotifCandidateSha256Utf8(value: string): string {
  return createHash("sha256").update(new TextEncoder().encode(value)).digest("hex");
}

function harmonyWire(harmony: Stage8MotifFrozenHarmonyV1): Stage8MotifCandidateHarmonyWireV1 {
  return deeplyFreeze({
    profile: harmony.profile,
    templateId: harmony.templateId,
    templateVersion: harmony.templateVersion,
    key: {
      schema: "nightdrive.key.v1" as const,
      tonicSemitoneClass: harmony.key.tonic,
      scale: harmony.key.scale,
    },
    slots: harmony.slots.map((slot) =>
      deeplyFreeze({
        index: slot.index,
        degree: slot.degree,
        bars: slot.bars,
        chord: {
          schema: "nightdrive.chord.v1" as const,
          rootSemitoneClass: slot.chord.root,
          quality: slot.chord.quality,
        },
        inversion: {
          schema: "nightdrive.chord-inversion.v1" as const,
          memberIndex: slot.inversion,
        },
        voicing: {
          schema: "nightdrive.chord-voicing.v1" as const,
          midiPitches: [...slot.voicing.midiPitches] as [number, number, number],
        },
      }),
    ),
  });
}

function requestHarmonyWire(
  harmony: Stage8MotifFrozenHarmonyV1,
): Stage8MotifCandidateRequestHarmonyWireV1 {
  return deeplyFreeze({
    profile: harmony.profile,
    templateId: harmony.templateId,
    templateVersion: harmony.templateVersion,
    key: {
      tonic: harmony.key.tonic,
      scale: harmony.key.scale,
    },
    slots: harmony.slots.map((slot) =>
      deeplyFreeze({
        index: slot.index,
        degree: slot.degree,
        bars: slot.bars,
        chord: {
          root: slot.chord.root,
          quality: slot.chord.quality,
        },
        inversion: slot.inversion,
        voicing: {
          midiPitches: [...slot.voicing.midiPitches] as [number, number, number],
        },
        adjacentCost: null,
        rationale: {
          preferenceRank: 0,
          tieBreak: "Stage 8 qualification snapshot" as const,
        },
      }),
    ),
  });
}

function planWire(plan: Stage8MotifReferencePlanV1): Stage8MotifCandidatePlanWireV1 {
  if (plan.policyVersion !== POLICY_VERSION || plan.profileVersion !== PROFILE_VERSION)
    throw new RangeError("Independent plan has an unsupported version.");
  return deeplyFreeze({
    policyVersion: plan.policyVersion,
    profileVersion: plan.profileVersion,
    rhythmTemplate: plan.rhythmTemplate,
    registerBand: plan.registerBand,
    tensionMode: plan.tensionMode,
    phrase4Displacement: plan.phrase4Displacement,
    contourOffsets: [...plan.contourOffsets],
    phraseRoles: [...plan.phraseRoles] as [
      "identity",
      "motif-form-repetition",
      "harmony-aware-transposition",
      "contour-preserving-response",
    ],
  });
}

function eventWires(
  events: readonly Stage8MotifReferenceEventV1[],
): readonly Stage8MotifCandidateEventWireV1[] {
  return deeplyFreeze(
    events.map((event) => ({
      pitch: event.pitch,
      startTick: event.startTick,
      durationTicks: event.durationTicks,
    })),
  );
}

function requestWire(
  input: Stage8MotifQualificationInputV1,
  binding: Stage8MotifSourceBindingV1,
): Stage8MotifCandidateRequestWireV1 {
  return deeplyFreeze({
    schema: REQUEST_SCHEMA,
    generatorVersion: GENERATOR_VERSION,
    profile: { id: input.profileId, version: PROFILE_VERSION },
    policyVersion: POLICY_VERSION,
    harmony: requestHarmonyWire(binding.harmony),
    intent: { energy: input.intent.energy, complexity: input.intent.complexity },
    rootSeed: input.rootSeed,
  });
}

function resultWire(
  input: Stage8MotifQualificationInputV1,
  binding: Stage8MotifSourceBindingV1,
  componentSeed: number,
  plan: Stage8MotifReferencePlanV1,
  events: readonly Stage8MotifReferenceEventV1[],
): Stage8MotifCandidateResultWireV1 {
  return deeplyFreeze({
    schema: RESULT_SCHEMA,
    generatorVersion: GENERATOR_VERSION,
    plan: planWire(plan),
    events: eventWires(events),
    provenance: {
      profile: { id: input.profileId, version: PROFILE_VERSION },
      policy: { version: POLICY_VERSION },
      contour: { version: CONTOUR_VERSION },
      rhythm: { version: RHYTHM_VERSION },
      seedDerivation: { version: SEED_DERIVATION_VERSION },
      prng: { version: PRNG_VERSION },
      weightedChoice: { version: WEIGHTED_CHOICE_VERSION },
      rootSeed: input.rootSeed,
      componentSeed,
      normalizedInputs: {
        intent: { energy: input.intent.energy, complexity: input.intent.complexity },
      },
      harmony: harmonyWire(binding.harmony),
      parent: null,
    },
  });
}

function expectedMatrix(): readonly Stage8MotifQualificationInputV1[] {
  const expected = MATRIX_SOURCE_RECORD_IDS.flatMap((sourceRecordId) => {
    const binding = getStage8MotifSourceBinding(sourceRecordId);
    return MATRIX_INTENTS.flatMap((intent) =>
      MATRIX_ROOT_SEEDS.map((rootSeed) => ({
        vectorId: `${sourceRecordId}-${intent.energy}-${intent.complexity}-${rootSeed
          .toString(16)
          .padStart(8, "0")}`,
        sourceRecordId,
        profileId: binding.harmony.profile,
        intent,
        rootSeed,
      })),
    );
  });
  return deeplyFreeze(expected) as readonly Stage8MotifQualificationInputV1[];
}

function assertSourceMatrix(): void {
  const expected = expectedMatrix();
  if (expected.length !== 24 || STAGE8_MOTIF_QUALIFICATION_INPUTS.length !== expected.length) {
    fail("qualification input count");
  }
  for (const [index, candidate] of STAGE8_MOTIF_QUALIFICATION_INPUTS.entries()) {
    const expectedInput = expected[index];
    if (
      expectedInput === undefined ||
      candidate.vectorId !== expectedInput.vectorId ||
      candidate.sourceRecordId !== expectedInput.sourceRecordId ||
      candidate.profileId !== expectedInput.profileId ||
      candidate.intent.energy !== expectedInput.intent.energy ||
      candidate.intent.complexity !== expectedInput.intent.complexity ||
      candidate.rootSeed !== expectedInput.rootSeed
    ) {
      fail(`qualification input ${index}`);
    }
  }
}

/**
 * Derives one evidence vector from an exact accepted matrix entry. The request
 * string is an evidence-only, fully expanded wire record; it is not a new public
 * canonical request schema or a production invocation.
 */
export function deriveStage8MotifCandidateVector(
  inputValue: unknown,
): Stage8MotifCandidateVectorV1 {
  assertSourceMatrix();
  const input = canonicalInput(inputValue);
  const binding = getStage8MotifSourceBinding(input.sourceRecordId);
  if (binding.harmony.profile !== input.profileId) fail("input.profileId");

  const componentSeed = deriveStage8MotifReferenceSeed(input.rootSeed);
  const plan = resolveStage8MotifReferencePlanFromComponentSeedV1(
    {
      profileId: input.profileId,
      energy: input.intent.energy,
      complexity: input.intent.complexity,
    },
    componentSeed,
  );
  const events = projectStage8MotifReferencePlanV1(binding.harmony, plan);
  const requestJson = canonicalJson(requestWire(input, binding));
  const resultJson = canonicalJson(resultWire(input, binding, componentSeed, plan, events));

  return deeplyFreeze({
    vectorId: input.vectorId,
    status: STAGE8_MOTIF_CANDIDATE_STATUS,
    sourceRecordId: input.sourceRecordId,
    profileId: input.profileId,
    rootSeed: input.rootSeed,
    intent: { energy: input.intent.energy, complexity: input.intent.complexity },
    requestJson,
    resultJson,
    byteLengths: {
      request: new TextEncoder().encode(requestJson).byteLength,
      result: new TextEncoder().encode(resultJson).byteLength,
    },
    sha256: {
      request: stage8MotifCandidateSha256Utf8(requestJson),
      result: stage8MotifCandidateSha256Utf8(resultJson),
    },
  });
}

/** Builds an in-memory candidate only. Writing, freezing, and acceptance are separate gates. */
export function buildStage8MotifCandidateArtifact(): Stage8MotifCandidateArtifactV1 {
  assertSourceMatrix();
  const vectors = STAGE8_MOTIF_QUALIFICATION_INPUTS.map((input) =>
    deriveStage8MotifCandidateVector(input),
  );
  if (vectors.length !== 24 || new Set(vectors.map((vector) => vector.vectorId)).size !== 24) {
    fail("candidate vector identities");
  }
  return deeplyFreeze({
    schema: STAGE8_MOTIF_CANDIDATE_ARTIFACT_SCHEMA,
    status: STAGE8_MOTIF_CANDIDATE_STATUS,
    generatedBy: STAGE8_MOTIF_CANDIDATE_GENERATED_BY,
    sourceBindings: MATRIX_SOURCE_RECORD_IDS.map((sourceRecordId) => {
      const binding = getStage8MotifSourceBinding(sourceRecordId);
      return {
        sourceRecordId: binding.sourceRecordId,
        source: {
          commit: binding.source.commit,
          path: binding.source.path,
          gitBlobObjectId: binding.source.gitBlobObjectId,
        },
      };
    }),
    matrix: {
      vectorCount: 24,
      sourceRecordIds: [...MATRIX_SOURCE_RECORD_IDS],
      intentPairs: MATRIX_INTENTS.map((intent) => ({ ...intent })),
      rootSeeds: [...MATRIX_ROOT_SEEDS],
    },
    vectors,
  });
}
