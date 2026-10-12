import process from "node:process";
import { type EditorHistoryV1, verifyEditorHistoryV1 } from "../editor/editor-history";
import type {
  RetainedVariationAlternativeV1,
  VariationCollectionV1,
} from "../editor/variation-collection";
import { digestStage7CanonicalUtf8 } from "../generators/adapters/stage7-digest";
import { verifyStage7ArpeggiatorAggregateV1 } from "../generators/stage7-aggregate-verifier";
import { generateStage7ArpeggiatorAggregateV1 } from "../generators/stage7-arpeggiator-aggregate";
import { createArpRange } from "../music-domain/arpeggiator";
import type { HarmonyProgressionRealization } from "../music-domain/harmony";
import { serializeCompleteSectionV1, verifyCompleteSectionV1 } from "./complete-section";
import { type EditorRevisionV1, EditorValueError } from "./editor-revision";
import {
  STAGE7_AGGREGATE_ENGINE_VERSION_V1,
  STAGE7_ARPEGGIATOR_AGGREGATE_SCHEMA_V1,
  STAGE7_ARPEGGIATOR_GENERATOR_VERSION_V1,
  type Stage7ArpeggiatorAggregateV1,
  serializeStage7ArpeggiatorAggregateV1,
  serializeStage7HarmonyComponentV1,
} from "./stage7-arpeggiator-aggregate";
import { verifyVariationEditorHistoryForNodeV1 } from "./variation-editor-history";
import {
  snapshotVariationInputV1,
  verifyVariationSourceAdmissionV1,
} from "./variation-source-admission";

export const VARIATION_STATE_SCHEMA_V1 = "nightdrive.variation-state.v1" as const;
export type OriginalVariationStateV1 = Readonly<{
  schema: typeof VARIATION_STATE_SCHEMA_V1;
  source: EditorRevisionV1["source"];
  variation: null;
  editor: Readonly<{ schema: EditorRevisionV1["schema"]; revisionHash: string }>;
  section: EditorRevisionV1["section"];
  tracks: EditorRevisionV1["tracks"];
  trackHashes: Readonly<{ harmony: string; bass: string; arpeggiator: string; lead: string }>;
  musicHash: string;
  stateHash: string;
}>;
const digest = (value: unknown): string => digestStage7CanonicalUtf8(JSON.stringify(value));

/** Every public construction requires complete retained inputs and fresh replay.
 * The raw-revision builder is module-private and cannot confer public authority. */
export async function projectOriginalVariationStateV1(
  source: unknown,
  sourceRequest: unknown,
  history: unknown,
): Promise<OriginalVariationStateV1> {
  const verified = await verifyVariationEditorHistoryForNodeV1(source, sourceRequest, history);
  const selected = verified.history.revisions[verified.history.cursor];
  if (!selected) throw new Error("Verified editor selection is missing.");
  return originalVariationStateValuesV1(selected);
}

function originalVariationStateValuesV1(revision: EditorRevisionV1): OriginalVariationStateV1 {
  const state = variationStateValuesV1(revision, null);
  return Object.freeze({ ...state, variation: null });
}
export type VariationStateV1 = Readonly<
  Omit<OriginalVariationStateV1, "variation"> & {
    variation: Readonly<{
      schema: typeof ARPEGGIATOR_VARIATION_SCHEMA_V1;
      variationHash: string;
    }> | null;
  }
>;
function variationStateValuesV1(
  revision: EditorRevisionV1,
  parentVariation: OriginalArpeggiatorVariationV1 | null,
): VariationStateV1 {
  const variation =
    parentVariation === null
      ? null
      : Object.freeze({
          schema: parentVariation.schema,
          variationHash: parentVariation.variationHash,
        });
  const source = Object.freeze({
    schema: revision.source.schema,
    resultHash: revision.source.resultHash,
  });
  const editor = Object.freeze({ schema: revision.schema, revisionHash: revision.revisionHash });
  const section = Object.freeze({
    ppq: revision.section.ppq,
    barCount: revision.section.barCount,
    timeSignature: Object.freeze({ ...revision.section.timeSignature }),
    tempo: Object.freeze({ ...revision.section.tempo }),
    endTick: revision.section.endTick,
  });
  const tracks = Object.freeze(
    revision.tracks.map((originalTrack) => {
      const track =
        parentVariation !== null && originalTrack.role === "arpeggiator"
          ? parentVariation.tracks[2]
          : originalTrack;
      if (!track) throw new Error("Verified variation track is missing.");
      return Object.freeze({
        role: track.role,
        notes: Object.freeze(
          track.notes.map((note) =>
            Object.freeze({
              id: note.id,
              pitch: note.pitch,
              startTick: note.startTick,
              durationTicks: note.durationTicks,
              velocity: note.velocity,
            }),
          ),
        ),
      });
    }),
  );
  const hashTrack = (role: "harmony" | "bass" | "arpeggiator" | "lead"): string => {
    const track = tracks.find((value) => value.role === role);
    if (!track) throw new Error("Verified editor track is missing.");
    return digest({ schema: "nightdrive.variation-track-hash-input.v1", track });
  };
  const trackHashes = Object.freeze({
    harmony: hashTrack("harmony"),
    bass: hashTrack("bass"),
    arpeggiator: hashTrack("arpeggiator"),
    lead: hashTrack("lead"),
  });
  const musicalTracks = tracks.map((track) => ({
    role: track.role,
    notes: track.notes.map(({ pitch, startTick, durationTicks, velocity }) => ({
      pitch,
      startTick,
      durationTicks,
      velocity,
    })),
  }));
  const musicHash = digest({
    schema: "nightdrive.variation-music-hash-input.v1",
    section,
    tracks: musicalTracks,
  });
  const stateHash = digest({
    schema: "nightdrive.variation-state-hash-input.v1",
    source,
    variation,
    editor,
    section,
    tracks,
    trackHashes,
    musicHash,
  });
  return Object.freeze({
    schema: VARIATION_STATE_SCHEMA_V1,
    source,
    variation,
    editor,
    section,
    tracks,
    trackHashes,
    musicHash,
    stateHash,
  });
}

export const ARPEGGIATOR_VARIATION_REQUEST_SCHEMA_V1 =
  "nightdrive.arpeggiator-variation-request.v1" as const;
export type OriginalArpeggiatorVariationRequestV1 = Readonly<{
  schema: typeof ARPEGGIATOR_VARIATION_REQUEST_SCHEMA_V1;
  parent: Readonly<{ schema: typeof VARIATION_STATE_SCHEMA_V1; stateHash: string }>;
  rootSeed: number;
}>;
export class VariationRequestValueError extends RangeError {
  constructor(
    readonly code:
      | "INVALID_VARIATION_INPUT"
      | "UNSUPPORTED_VARIATION_SCHEMA"
      | "INVALID_VARIATION_PARENT"
      | "STALE_VARIATION_PARENT"
      | "INVALID_VARIATION_SEED",
    readonly field: string,
  ) {
    super(`Variation request is invalid at ${field}.`);
    this.name = "VariationRequestValueError";
  }
}

/** Original parent only; returned request data confers no reusable admission.
 * No target generation, attempt or alternative is created by this preflight. */
export async function verifyOriginalArpeggiatorVariationRequestV1(
  source: unknown,
  sourceRequest: unknown,
  history: unknown,
  request: unknown,
): Promise<OriginalArpeggiatorVariationRequestV1> {
  return (await originalVariationRequestContextV1(source, sourceRequest, history, request)).request;
}

// Private invocation continuation only: no transferable admission constructor.
async function originalVariationRequestContextV1(
  source: unknown,
  sourceRequest: unknown,
  history: unknown,
  request: unknown,
  suppliedProof?: Readonly<{ variation: Record<string, unknown>; creationProof: unknown }>,
) {
  if (process.versions.node !== "24.21.0")
    throw new Error("Variation request verification requires Node 24.21.0.");
  // Every consumed input is descriptor-safely detached before the first await.
  const original = snapshotVariationInputV1(source, "source");
  const originalRequest = snapshotVariationInputV1(sourceRequest, "sourceRequest");
  const retained = snapshotVariationInputV1(history, "history");
  const proposal = snapshotVariationInputV1(request, "request");
  const verified = await verifyVariationEditorHistoryForNodeV1(original, originalRequest, retained);
  const selected = verified.history.revisions[verified.history.cursor];
  if (!selected) throw new Error("Verified editor selection is missing.");
  const state = originalVariationStateValuesV1(selected);
  if (suppliedProof) verifyOriginalCreationProofValuesV1(suppliedProof, state, verified.history);
  return { verified, state, request: variationRequestValuesV1(proposal, state) };
}
function variationRequestValuesV1(
  proposal: unknown,
  state: VariationStateV1,
  beforeSeed?: () => void,
): OriginalArpeggiatorVariationRequestV1 {
  const fail = (code: VariationRequestValueError["code"], field: string): never => {
    throw new VariationRequestValueError(code, field);
  };
  if (
    typeof proposal !== "object" ||
    proposal === null ||
    Array.isArray(proposal) ||
    JSON.stringify(Object.keys(proposal)) !== '["schema","parent","rootSeed"]'
  )
    return fail("INVALID_VARIATION_INPUT", "request");
  const record = proposal as Record<string, unknown>;
  if (record.schema !== ARPEGGIATOR_VARIATION_REQUEST_SCHEMA_V1)
    return fail("UNSUPPORTED_VARIATION_SCHEMA", "request.schema");
  const parent = record.parent;
  if (
    typeof parent !== "object" ||
    parent === null ||
    Array.isArray(parent) ||
    JSON.stringify(Object.keys(parent)) !== '["schema","stateHash"]'
  )
    return fail("INVALID_VARIATION_PARENT", "request.parent");
  const identity = parent as Record<string, unknown>;
  if (
    identity.schema !== VARIATION_STATE_SCHEMA_V1 ||
    typeof identity.stateHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(identity.stateHash)
  )
    return fail("INVALID_VARIATION_PARENT", "request.parent");
  if (identity.stateHash !== state.stateHash)
    return fail("STALE_VARIATION_PARENT", "request.parent");
  beforeSeed?.();
  const rootSeed = record.rootSeed;
  if (
    typeof rootSeed !== "number" ||
    !Number.isSafeInteger(rootSeed) ||
    rootSeed < 0 ||
    rootSeed > 4294967295
  )
    return fail("INVALID_VARIATION_SEED", "request.rootSeed");
  const acceptedRequest = Object.freeze({
    schema: ARPEGGIATOR_VARIATION_REQUEST_SCHEMA_V1,
    parent: Object.freeze({ schema: VARIATION_STATE_SCHEMA_V1, stateHash: state.stateHash }),
    rootSeed: rootSeed === 0 ? 0 : rootSeed,
  });
  return acceptedRequest;
}

export class VariationComponentValueError extends RangeError {
  constructor(
    readonly code: "VARIATION_LOCK_MISMATCH" | "VARIATION_HASH_MISMATCH",
    readonly field: string,
  ) {
    super("Variation component does not match its verified inputs.");
    this.name = "VariationComponentValueError";
  }
}

/** Original-parent prerequisite only. Returns the existing accepted aggregate;
 * creates no variation root/attempt/alternative and confers no reusable trust. */
export async function generateOriginalArpeggiatorVariationComponentV1(
  source: unknown,
  sourceRequest: unknown,
  history: unknown,
  request: unknown,
) {
  const context = await originalVariationRequestContextV1(source, sourceRequest, history, request);
  return originalVariationComponentValuesV1(context);
}

async function originalVariationComponentValuesV1(context: VariationBuildContext) {
  const original = context.verified.source;
  const config = original.provenance.arpeggiator;
  // The accepted source verifier already reconstructs the consumed typed
  // chord/key/inversion/voicing values. The aggregate consumes exactly this
  // Harmony projection. Its historical wider type also names evaluation-only
  // rationale fields, which are neither fabricated nor needed for generation.
  const progression = original.components.harmony as HarmonyProgressionRealization;
  const generated = await generateStage7ArpeggiatorAggregateV1({
    schema: STAGE7_ARPEGGIATOR_AGGREGATE_SCHEMA_V1,
    engineVersion: STAGE7_AGGREGATE_ENGINE_VERSION_V1,
    generatorVersion: STAGE7_ARPEGGIATOR_GENERATOR_VERSION_V1,
    parent: null,
    tempo: original.section.tempo,
    progression,
    range: createArpRange(config.range),
    intent: original.provenance.intent,
    profile: { id: original.provenance.profile.id, version: config.profile.version },
    policy: config.policy,
    seedDerivation: config.seedDerivation,
    prng: config.prng,
    rootSeed: context.request.rootSeed,
  });
  const result = await verifyStage7ArpeggiatorAggregateV1(generated);
  if (
    serializeStage7HarmonyComponentV1(result.section, result.components.harmony) !==
    serializeStage7HarmonyComponentV1(original.section, original.components.harmony)
  )
    throw new VariationComponentValueError(
      "VARIATION_LOCK_MISMATCH",
      "generation.components.harmony",
    );
  const expected = {
    profile: { id: original.provenance.profile.id, version: config.profile.version },
    policy: config.policy,
    seedDerivation: config.seedDerivation,
    prng: config.prng,
    rootSeed: context.request.rootSeed,
    normalizedInputs: { intent: original.provenance.intent, range: config.range },
    parent: null,
  };
  if (JSON.stringify(result.provenance) !== JSON.stringify(expected))
    throw new VariationComponentValueError("VARIATION_HASH_MISMATCH", "generation.provenance");
  return result;
}
export const ARPEGGIATOR_VARIATION_SCHEMA_V1 = "nightdrive.arpeggiator-variation.v1" as const;
export const VARIATION_CREATION_PROOF_SCHEMA_V1 = "nightdrive.variation-creation-proof.v1" as const;
// The accepted serializer owns the canonical Harmony wire representation.
// It is intentionally opaque here: typed generation Harmony is not wire data.
type CanonicalVariationGenerationV1 = Readonly<
  Omit<Stage7ArpeggiatorAggregateV1, "components"> & {
    components: Readonly<{
      harmony: unknown;
      arpeggiator: Stage7ArpeggiatorAggregateV1["components"]["arpeggiator"];
    }>;
  }
>;
export type OriginalArpeggiatorVariationV1 = Readonly<{
  schema: typeof ARPEGGIATOR_VARIATION_SCHEMA_V1;
  source: OriginalVariationStateV1["source"];
  parent: OriginalArpeggiatorVariationRequestV1["parent"];
  request: OriginalArpeggiatorVariationRequestV1;
  generation: CanonicalVariationGenerationV1;
  section: OriginalVariationStateV1["section"];
  tracks: OriginalVariationStateV1["tracks"];
  trackHashes: OriginalVariationStateV1["trackHashes"];
  musicHash: string;
  unchanged: boolean;
  variationHash: string;
}>;
export type OriginalVariationCreationProofV1 = Readonly<{
  schema: typeof VARIATION_CREATION_PROOF_SCHEMA_V1;
  variation: Readonly<{ schema: typeof ARPEGGIATOR_VARIATION_SCHEMA_V1; variationHash: string }>;
  parent: OriginalVariationStateV1;
  parentVariation: null;
  parentHistory: Awaited<ReturnType<typeof verifyVariationEditorHistoryForNodeV1>>["history"];
}>;
export class VariationRootValueError extends RangeError {
  constructor(
    readonly code:
      | "INVALID_VARIATION_INPUT"
      | "UNSUPPORTED_VARIATION_SCHEMA"
      | "INVALID_VARIATION_LINEAGE"
      | "INVALID_VARIATION_STATE"
      | "VARIATION_NOTE_ID_COLLISION"
      | "VARIATION_LOCK_MISMATCH"
      | "VARIATION_HASH_MISMATCH",
    readonly field: string,
  ) {
    super(`Variation proof is invalid at ${field}.`);
    this.name = "VariationRootValueError";
  }
}
function sameValues(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (
    typeof left !== "object" ||
    left === null ||
    typeof right !== "object" ||
    right === null ||
    Array.isArray(left) !== Array.isArray(right)
  )
    return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every(
    (key, index) =>
      key === rightKeys[index] &&
      sameValues((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]),
  );
}
function exactRecord(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    sameValues(Object.keys(value), keys)
  );
}
function freezeTrustedValues<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const nested of Object.values(value)) freezeTrustedValues(nested);
    Object.freeze(value);
  }
  return value;
}
function verifyOriginalCreationProofValuesV1(
  supplied: Readonly<{ variation: Record<string, unknown>; creationProof: unknown }>,
  parent: OriginalVariationStateV1,
  history: OriginalVariationCreationProofV1["parentHistory"],
): void {
  const proof = supplied.creationProof;
  if (
    !exactRecord(proof, ["schema", "variation", "parent", "parentVariation", "parentHistory"]) ||
    proof.schema !== VARIATION_CREATION_PROOF_SCHEMA_V1
  )
    throw new VariationRootValueError("INVALID_VARIATION_LINEAGE", "creationProof");
  const expectedIdentity = {
    schema: ARPEGGIATOR_VARIATION_SCHEMA_V1,
    variationHash: supplied.variation.variationHash,
  };
  if (!sameValues(proof.variation, expectedIdentity))
    throw new VariationRootValueError("INVALID_VARIATION_LINEAGE", "creationProof.variation");
  if (!sameValues(proof.parent, parent))
    throw new VariationRootValueError("INVALID_VARIATION_LINEAGE", "creationProof.parent");
  // This bounded entry supports original parents only, never silently treats a
  // variation parent as an original one or accepts its identity without proof.
  if (proof.parentVariation !== null)
    throw new VariationRootValueError("INVALID_VARIATION_LINEAGE", "creationProof.parentVariation");
  if (!sameValues(proof.parentHistory, history))
    throw new VariationRootValueError("INVALID_VARIATION_LINEAGE", "creationProof.parentHistory");
  if (
    !sameValues(supplied.variation.source, parent.source) ||
    !sameValues(supplied.variation.parent, { schema: parent.schema, stateHash: parent.stateHash })
  )
    throw new VariationRootValueError("INVALID_VARIATION_LINEAGE", "variation.parent");
}

/** Root/proof data only, not an admission token or a retained alternative.
 * Full invocation-local source and selected-history proof precedes construction. */
export async function generateOriginalArpeggiatorVariationRootV1(
  source: unknown,
  sourceRequest: unknown,
  history: unknown,
  request: unknown,
) {
  const context = await originalVariationRequestContextV1(source, sourceRequest, history, request);
  return originalVariationRootValuesV1(context);
}

type VariationBuildContext = Omit<
  Awaited<ReturnType<typeof originalVariationRequestContextV1>>,
  "state"
> & { state: VariationStateV1 };
export type VariationCreationProofV1 = Readonly<
  Omit<OriginalVariationCreationProofV1, "parent" | "parentVariation"> & {
    parent: VariationStateV1;
    parentVariation: OriginalArpeggiatorVariationV1 | null;
  }
>;
export type VariationRootProofV1 = Readonly<{
  variation: OriginalArpeggiatorVariationV1;
  creationProof: VariationCreationProofV1;
}>;
async function originalVariationRootValuesV1(
  context: Awaited<ReturnType<typeof originalVariationRequestContextV1>>,
): Promise<
  Readonly<{
    variation: OriginalArpeggiatorVariationV1;
    creationProof: OriginalVariationCreationProofV1;
  }>
>;
async function originalVariationRootValuesV1(
  context: VariationBuildContext,
  parentVariation: OriginalArpeggiatorVariationV1 | null,
): Promise<VariationRootProofV1>;
async function originalVariationRootValuesV1(
  context: VariationBuildContext,
  parentVariation: OriginalArpeggiatorVariationV1 | null = null,
) {
  const aggregate = await originalVariationComponentValuesV1(context);
  // This round-trip consumes only the accepted serializer's trusted output;
  // no caller object or caller hook participates in JSON serialization here.
  const generation = freezeTrustedValues(
    JSON.parse(serializeStage7ArpeggiatorAggregateV1(aggregate)) as CanonicalVariationGenerationV1,
  );
  const parent = context.state;
  const arp = Object.freeze({
    role: "arpeggiator" as const,
    notes: Object.freeze(
      generation.components.arpeggiator.map((event, ordinal) =>
        Object.freeze({
          id: `note-${digest({
            schema: "nightdrive.variation-arpeggiator-note-id-input.v1",
            parent: context.request.parent,
            request: context.request,
            ordinal,
          })}`,
          pitch: event.pitch,
          startTick: event.startTick,
          durationTicks: event.durationTicks,
          velocity: 100,
        }),
      ),
    ),
  });
  const tracks = Object.freeze(
    parent.tracks.map((track) => (track.role === "arpeggiator" ? arp : track)),
  );
  const seen = new Set<string>();
  for (const [trackIndex, track] of tracks.entries()) {
    for (const [index, note] of track.notes.entries()) {
      if (seen.has(note.id))
        throw new VariationRootValueError(
          "VARIATION_NOTE_ID_COLLISION",
          `variation.tracks.${trackIndex}.notes.${index}.id`,
        );
      seen.add(note.id);
    }
  }
  const hashTrack = (role: "harmony" | "bass" | "arpeggiator" | "lead") => {
    const track = tracks.find((value) => value.role === role);
    if (!track) throw new Error("Verified variation track is missing.");
    return digest({ schema: "nightdrive.variation-track-hash-input.v1", track });
  };
  const trackHashes = Object.freeze({
    harmony: hashTrack("harmony"),
    bass: hashTrack("bass"),
    arpeggiator: hashTrack("arpeggiator"),
    lead: hashTrack("lead"),
  });
  for (const role of ["harmony", "bass", "lead"] as const) {
    if (trackHashes[role] !== parent.trackHashes[role])
      throw new VariationRootValueError("VARIATION_LOCK_MISMATCH", `variation.trackHashes.${role}`);
  }
  const musical = (track: OriginalVariationStateV1["tracks"][number]) => ({
    role: track.role,
    notes: track.notes.map(({ pitch, startTick, durationTicks, velocity }) => ({
      pitch,
      startTick,
      durationTicks,
      velocity,
    })),
  });
  const musicHash = digest({
    schema: "nightdrive.variation-music-hash-input.v1",
    section: parent.section,
    tracks: tracks.map(musical),
  });
  const originalArp = parent.tracks.find((track) => track.role === "arpeggiator");
  if (!originalArp) throw new Error("Verified Arpeggiator track is missing.");
  const unchanged = sameValues(musical(originalArp), musical(arp));
  const values = {
    schema: ARPEGGIATOR_VARIATION_SCHEMA_V1,
    source: parent.source,
    parent: context.request.parent,
    request: context.request,
    generation,
    section: parent.section,
    tracks,
    trackHashes,
    musicHash,
    unchanged,
  };
  const variation: OriginalArpeggiatorVariationV1 = Object.freeze({
    ...values,
    variationHash: digest({
      schema: "nightdrive.arpeggiator-variation-hash-input.v1",
      source: values.source,
      parent: values.parent,
      request: values.request,
      generation: values.generation,
      section: values.section,
      tracks: values.tracks,
      trackHashes: values.trackHashes,
      musicHash: values.musicHash,
      unchanged: values.unchanged,
    }),
  });
  const creationProof: VariationCreationProofV1 = Object.freeze({
    schema: VARIATION_CREATION_PROOF_SCHEMA_V1,
    variation: Object.freeze({ schema: variation.schema, variationHash: variation.variationHash }),
    parent,
    parentVariation,
    parentHistory: context.verified.history,
  });
  return Object.freeze({ variation, creationProof });
}

/** Verification requires explicit retained parent history and the child-owned
 * snapshot. Recompute the complete root from fresh admission, not its digest.
 * Recursive/non-original parents remain unsupported by this bounded entry. */
export async function verifyOriginalArpeggiatorVariationRootV1(
  source: unknown,
  sourceRequest: unknown,
  history: unknown,
  request: unknown,
  variation: unknown,
  creationProof: unknown,
) {
  if (process.versions.node !== "24.21.0")
    throw new Error("Variation root verification requires Node 24.21.0.");
  const original = snapshotVariationInputV1(source, "source");
  const originalRequest = snapshotVariationInputV1(sourceRequest, "sourceRequest");
  const retained = snapshotVariationInputV1(history, "history");
  const proposal = snapshotVariationInputV1(request, "request");
  const supplied = snapshotVariationInputV1(variation, "variation");
  const proof = snapshotVariationInputV1(creationProof, "creationProof");
  if (
    !exactRecord(supplied, [
      "schema",
      "source",
      "parent",
      "request",
      "generation",
      "section",
      "tracks",
      "trackHashes",
      "musicHash",
      "unchanged",
      "variationHash",
    ])
  )
    throw new VariationRootValueError("INVALID_VARIATION_INPUT", "variation");
  if (supplied.schema !== ARPEGGIATOR_VARIATION_SCHEMA_V1)
    throw new VariationRootValueError("UNSUPPORTED_VARIATION_SCHEMA", "variation.schema");
  const context = await originalVariationRequestContextV1(
    original,
    originalRequest,
    retained,
    proposal,
    { variation: supplied, creationProof: proof },
  );
  if (!sameValues(supplied.request, context.request))
    throw new VariationRootValueError("INVALID_VARIATION_LINEAGE", "variation.request");
  const expected = await originalVariationRootValuesV1(context);
  compareVariationRootValuesV1(supplied, expected);
  return expected;
}

export async function serializeOriginalArpeggiatorVariationRootV1(
  source: unknown,
  sourceRequest: unknown,
  history: unknown,
  request: unknown,
  variation: unknown,
  creationProof: unknown,
): Promise<string> {
  return JSON.stringify(
    (
      await verifyOriginalArpeggiatorVariationRootV1(
        source,
        sourceRequest,
        history,
        request,
        variation,
        creationProof,
      )
    ).variation,
  );
}

function compareVariationRootValuesV1(
  supplied: Record<string, unknown>,
  expected: VariationRootProofV1,
): void {
  const root = expected.variation;
  if (!sameValues(supplied.generation, root.generation))
    throw new VariationRootValueError("VARIATION_HASH_MISMATCH", "variation.generation");
  if (!sameValues(supplied.section, root.section))
    throw new VariationRootValueError("VARIATION_LOCK_MISMATCH", "variation.section");
  if (!Array.isArray(supplied.tracks) || supplied.tracks.length !== root.tracks.length)
    throw new VariationRootValueError("INVALID_VARIATION_STATE", "variation.tracks");
  for (const role of ["harmony", "bass", "lead"] as const) {
    const index = root.tracks.findIndex((track) => track.role === role);
    if (!sameValues(supplied.tracks[index], root.tracks[index]))
      throw new VariationRootValueError("VARIATION_LOCK_MISMATCH", `variation.tracks.${index}`);
  }
  if (!sameValues(supplied.tracks[2], root.tracks[2]))
    throw new VariationRootValueError("INVALID_VARIATION_STATE", "variation.tracks.2");
  for (const field of ["trackHashes", "musicHash", "unchanged", "variationHash"] as const) {
    if (!sameValues(supplied[field], root[field]))
      throw new VariationRootValueError("VARIATION_HASH_MISMATCH", `variation.${field}`);
  }
}

/** Verify an ordered closure of the EXISTING root/proof pairs. This is a
 * prerequisite for the retained-alternative coordinator, not a collection or
 * attempt verifier. The coordinator must preserve owner order and separately
 * verify active histories/metadata. Returned values confer no reusable trust. */
export async function verifyArpeggiatorVariationAncestryV1(
  source: unknown,
  sourceRequest: unknown,
  roots: unknown,
): Promise<readonly VariationRootProofV1[]> {
  if (process.versions.node !== "24.21.0")
    throw new Error("Variation ancestry verification requires Node 24.21.0.");
  const suppliedSource = snapshotVariationInputV1(source, "source");
  const suppliedRequest = snapshotVariationInputV1(sourceRequest, "sourceRequest");
  const suppliedRoots = snapshotVariationInputV1(roots, "roots");
  // Exactly one admission for the whole closure. No public returned value is
  // accepted as a token; ancestor continuations remain inside this invocation.
  const admitted = await verifyVariationSourceAdmissionV1(suppliedSource, suppliedRequest);
  return verifyArpeggiatorVariationAncestryValuesV1(admitted, suppliedRoots);
}
async function verifyArpeggiatorVariationAncestryValuesV1(
  admitted: Awaited<ReturnType<typeof verifyVariationSourceAdmissionV1>>,
  suppliedRoots: unknown,
  continuation?: Readonly<{
    before: (index: number) => void;
    after: (pair: VariationRootProofV1, index: number) => void;
  }>,
): Promise<readonly VariationRootProofV1[]> {
  if (!Array.isArray(suppliedRoots) || suppliedRoots.length === 0)
    throw new VariationRootValueError("INVALID_VARIATION_LINEAGE", "roots");
  const verified: VariationRootProofV1[] = [];
  const owners = new Map<string, VariationRootProofV1>();
  for (const [index, pair] of suppliedRoots.entries()) {
    continuation?.before(index);
    const path = `roots.${index}.creationProof`;
    const fail = (field = path): never => {
      throw new VariationRootValueError("INVALID_VARIATION_LINEAGE", field);
    };
    if (!exactRecord(pair, ["variation", "creationProof"])) fail();
    const value = pair as Record<string, unknown>;
    const root = value.variation;
    if (
      !exactRecord(root, [
        "schema",
        "source",
        "parent",
        "request",
        "generation",
        "section",
        "tracks",
        "trackHashes",
        "musicHash",
        "unchanged",
        "variationHash",
      ])
    )
      throw new VariationRootValueError("INVALID_VARIATION_INPUT", `roots.${index}.variation`);
    if (root.schema !== ARPEGGIATOR_VARIATION_SCHEMA_V1)
      throw new VariationRootValueError(
        "UNSUPPORTED_VARIATION_SCHEMA",
        `roots.${index}.variation.schema`,
      );
    const proof = value.creationProof;
    if (
      !exactRecord(proof, ["schema", "variation", "parent", "parentVariation", "parentHistory"]) ||
      proof.schema !== VARIATION_CREATION_PROOF_SCHEMA_V1
    )
      fail();
    const saved = proof as Record<string, unknown>;
    if (!sameValues(saved.variation, { schema: root.schema, variationHash: root.variationHash }))
      fail(`${path}.variation`);
    const prior =
      typeof root.variationHash === "string" ? owners.get(root.variationHash) : undefined;
    // Root identity excludes the saved redo history. Equal roots may have
    // distinct proofs; every submitted proof still completes verification below.
    if (prior && !sameValues(prior.variation, root)) fail();
    if (!exactRecord(saved.parentHistory, ["source", "revisions", "cursor"]))
      fail(`${path}.parentHistory`);
    const rawHistory = saved.parentHistory as Record<string, unknown>;
    // Old editor proof is reused only after exact full-source binding to this
    // invocation's replay-admitted source. All saved redo revisions are proved.
    const historySource = verifyCompleteSectionV1(rawHistory.source);
    if (serializeCompleteSectionV1(historySource) !== serializeCompleteSectionV1(admitted.source))
      fail(`${path}.parentHistory.source`);
    const history = verifyEditorHistoryV1(
      rawHistory as unknown as OriginalVariationCreationProofV1["parentHistory"],
    );
    const selected = history.revisions[history.cursor];
    if (!selected) return fail(`${path}.parentHistory`);
    let parentVariation: OriginalArpeggiatorVariationV1 | null = null;
    if (saved.parentVariation !== null) {
      if (
        !exactRecord(saved.parentVariation, [
          "schema",
          "source",
          "parent",
          "request",
          "generation",
          "section",
          "tracks",
          "trackHashes",
          "musicHash",
          "unchanged",
          "variationHash",
        ])
      )
        fail(`${path}.parentVariation`);
      const claimed = saved.parentVariation as Record<string, unknown>;
      const owner =
        typeof claimed.variationHash === "string" ? owners.get(claimed.variationHash) : undefined;
      // Only already verified earlier owners can close ancestry: a missing,
      // forward or cyclic reference is never resolved from a claimed hash.
      if (!owner) return fail(`${path}.parentVariation`);
      if (!sameValues(claimed, owner.variation)) return fail(`${path}.parentVariation`);
      parentVariation = owner.variation;
    }
    const parent = variationStateValuesV1(selected, parentVariation);
    if (!sameValues(saved.parent, parent)) fail(`${path}.parent`);
    if (
      !sameValues(root.source, parent.source) ||
      !sameValues(root.parent, { schema: parent.schema, stateHash: parent.stateHash })
    )
      fail(`${path}.parent`);
    const request = variationRequestValuesV1(root.request, parent);
    const context: VariationBuildContext = {
      verified: { source: admitted.source, sourceRequest: admitted.sourceRequest, history },
      state: parent,
      request,
    };
    const expected = await originalVariationRootValuesV1(context, parentVariation);
    compareVariationRootValuesV1(root, expected);
    owners.set(expected.variation.variationHash, expected);
    verified.push(expected);
    continuation?.after(expected, index);
  }
  return Object.freeze(verified);
}

/** Variation-parent transition only. The selected supplying root is explicit;
 * the ordered existing owner closure is proof, not a selection policy. */
export async function generateVariationParentArpeggiatorRootV1(
  source: unknown,
  sourceRequest: unknown,
  parentHistory: unknown,
  request: unknown,
  parentVariation: unknown,
  roots: unknown,
): Promise<VariationRootProofV1> {
  if (process.versions.node !== "24.21.0")
    throw new Error("Variation-parent creation requires Node 24.21.0.");
  const original = snapshotVariationInputV1(source, "source");
  const originalRequest = snapshotVariationInputV1(sourceRequest, "sourceRequest");
  const savedHistory = snapshotVariationInputV1(parentHistory, "parentHistory");
  const proposal = snapshotVariationInputV1(request, "request");
  const suppliedParent = snapshotVariationInputV1(parentVariation, "parentVariation");
  const suppliedRoots = snapshotVariationInputV1(roots, "roots");
  const admitted = await verifyVariationSourceAdmissionV1(original, originalRequest);
  const verifiedRoots = await verifyArpeggiatorVariationAncestryValuesV1(admitted, suppliedRoots);
  const parent = verifiedRoots.find((value) => sameValues(value.variation, suppliedParent));
  if (!parent) throw new VariationRootValueError("INVALID_VARIATION_LINEAGE", "parentVariation");
  if (!exactRecord(savedHistory, ["source", "revisions", "cursor"]))
    throw new VariationRootValueError("INVALID_VARIATION_LINEAGE", "parentHistory");
  const historySource = verifyCompleteSectionV1(savedHistory.source);
  if (serializeCompleteSectionV1(historySource) !== serializeCompleteSectionV1(admitted.source))
    throw new VariationRootValueError("INVALID_VARIATION_LINEAGE", "parentHistory.source");
  const history = verifyEditorHistoryV1(
    savedHistory as unknown as OriginalVariationCreationProofV1["parentHistory"],
  );
  const selected = history.revisions[history.cursor];
  if (!selected) throw new VariationRootValueError("INVALID_VARIATION_LINEAGE", "parentHistory");
  const state = variationStateValuesV1(selected, parent.variation);
  const acceptedRequest = variationRequestValuesV1(proposal, state);
  return originalVariationRootValuesV1(
    {
      verified: { source: admitted.source, sourceRequest: admitted.sourceRequest, history },
      state,
      request: acceptedRequest,
    },
    parent.variation,
  );
}

export const VARIATION_ATTEMPT_SCHEMA_V1 = "nightdrive.variation-attempt.v1" as const;
export type VariationAttemptV1 = Readonly<{
  schema: typeof VARIATION_ATTEMPT_SCHEMA_V1;
  sequence: number;
  variation: Readonly<{ schema: typeof ARPEGGIATOR_VARIATION_SCHEMA_V1; variationHash: string }>;
  actor: "local-producer-unverified";
  createdAt: string;
  attemptHash: string;
}>;
export class VariationAttemptValueError extends RangeError {
  constructor(
    readonly code:
      | "INVALID_VARIATION_INPUT"
      | "UNSUPPORTED_VARIATION_SCHEMA"
      | "INVALID_VARIATION_COLLECTION"
      | "INVALID_VARIATION_LINEAGE"
      | "INVALID_VARIATION_PROVENANCE"
      | "VARIATION_HASH_MISMATCH",
    readonly field: string,
  ) {
    super(`Variation attempt is invalid at ${field}.`);
    this.name = "VariationAttemptValueError";
  }
}
function validAttemptUtc(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))
    return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function variationAttemptRecordV1(supplied: unknown): Record<string, unknown> {
  if (
    !exactRecord(supplied, ["schema", "sequence", "variation", "actor", "createdAt", "attemptHash"])
  )
    throw new VariationAttemptValueError("INVALID_VARIATION_INPUT", "attempt");
  if (supplied.schema !== VARIATION_ATTEMPT_SCHEMA_V1)
    throw new VariationAttemptValueError("UNSUPPORTED_VARIATION_SCHEMA", "attempt.schema");
  return supplied;
}
function variationAttemptValuesV1(
  verified: readonly VariationRootProofV1[],
  supplied: Record<string, unknown>,
): VariationAttemptV1 {
  if (!Number.isSafeInteger(supplied.sequence) || (supplied.sequence as number) < 1)
    throw new VariationAttemptValueError("INVALID_VARIATION_COLLECTION", "attempt.sequence");
  const identity = supplied.variation;
  if (
    !exactRecord(identity, ["schema", "variationHash"]) ||
    identity.schema !== ARPEGGIATOR_VARIATION_SCHEMA_V1 ||
    !verified.some(({ variation }) => variation.variationHash === identity.variationHash)
  )
    throw new VariationAttemptValueError("INVALID_VARIATION_LINEAGE", "attempt.variation");
  if (supplied.actor !== "local-producer-unverified")
    throw new VariationAttemptValueError("INVALID_VARIATION_PROVENANCE", "attempt.actor");
  if (!validAttemptUtc(supplied.createdAt))
    throw new VariationAttemptValueError("INVALID_VARIATION_PROVENANCE", "attempt.createdAt");
  const variation = Object.freeze({
    schema: ARPEGGIATOR_VARIATION_SCHEMA_V1,
    variationHash: identity.variationHash as string,
  });
  const values = {
    sequence: supplied.sequence as number,
    variation,
    actor: supplied.actor,
    createdAt: supplied.createdAt,
  } as const;
  const attemptHash = digestStage7CanonicalUtf8(
    JSON.stringify({ schema: "nightdrive.variation-attempt-hash-input.v1", ...values }),
  );
  if (supplied.attemptHash !== attemptHash)
    throw new VariationAttemptValueError("VARIATION_HASH_MISMATCH", "attempt.attemptHash");
  return Object.freeze({ schema: VARIATION_ATTEMPT_SCHEMA_V1, ...values, attemptHash });
}

/** Existing attempt API: fresh complete source/root proof, never a trust token. */
export async function verifyVariationAttemptV1(
  source: unknown,
  sourceRequest: unknown,
  roots: unknown,
  attempt: unknown,
): Promise<VariationAttemptV1> {
  if (process.versions.node !== "24.21.0")
    throw new Error("Variation attempt verification requires Node 24.21.0.");
  const suppliedSource = snapshotVariationInputV1(source, "source");
  const suppliedRequest = snapshotVariationInputV1(sourceRequest, "sourceRequest");
  const suppliedRoots = snapshotVariationInputV1(roots, "roots");
  const supplied = variationAttemptRecordV1(snapshotVariationInputV1(attempt, "attempt"));
  const admitted = await verifyVariationSourceAdmissionV1(suppliedSource, suppliedRequest);
  const verified = await verifyArpeggiatorVariationAncestryValuesV1(admitted, suppliedRoots);
  return variationAttemptValuesV1(verified, supplied);
}
export async function serializeVariationAttemptV1(
  source: unknown,
  sourceRequest: unknown,
  roots: unknown,
  attempt: unknown,
): Promise<string> {
  return JSON.stringify(await verifyVariationAttemptV1(source, sourceRequest, roots, attempt));
}

export class VariationCollectionValueError extends RangeError {
  readonly code = "INVALID_VARIATION_COLLECTION";
  constructor(readonly field: string) {
    super(`Variation collection is invalid at ${field}.`);
    this.name = "VariationCollectionValueError";
  }
}
function collectionHistoryValuesV1(
  admitted: Awaited<ReturnType<typeof verifyVariationSourceAdmissionV1>>,
  supplied: unknown,
  path: string,
): EditorHistoryV1 {
  if (!exactRecord(supplied, ["source", "revisions", "cursor"]))
    throw new VariationCollectionValueError(path);
  const retained = verifyCompleteSectionV1(supplied.source);
  if (serializeCompleteSectionV1(retained) !== serializeCompleteSectionV1(admitted.source))
    throw new VariationRootValueError("INVALID_VARIATION_LINEAGE", `${path}.source`);
  return verifyEditorHistoryV1(supplied as unknown as EditorHistoryV1);
}
function verifyCombinedNoteIdsV1(
  history: EditorHistoryV1,
  variation: OriginalArpeggiatorVariationV1 | null,
  path: string,
) {
  const selected = history.revisions[history.cursor];
  if (!selected) throw new VariationCollectionValueError(`${path}.history`);
  const state = variationStateValuesV1(selected, variation);
  const seen = new Set<string>();
  for (const [trackIndex, track] of state.tracks.entries()) {
    for (const [index, note] of track.notes.entries()) {
      if (seen.has(note.id))
        throw new VariationRootValueError(
          "VARIATION_NOTE_ID_COLLISION",
          `${path}.tracks.${trackIndex}.notes.${index}.id`,
        );
      seen.add(note.id);
    }
  }
}

/** Complete data verification only. One invocation-local source replay, no
 * creation, selection mutation, clock read, preview or transferable authority. */
export async function verifyVariationCollectionV1(value: unknown): Promise<VariationCollectionV1> {
  if (process.versions.node !== "24.21.0")
    throw new Error("Variation collection verification requires Node 24.21.0.");
  return verifyVariationCollectionValuesV1(snapshotVariationInputV1(value, "collection"));
}

/** Private continuation: consumed snapshot only, never public admission authority. */
async function verifyVariationCollectionValuesV1(
  supplied: unknown,
): Promise<VariationCollectionV1> {
  if (typeof supplied !== "object" || supplied === null || Array.isArray(supplied))
    throw new VariationCollectionValueError("collection");
  const record = supplied as Record<string, unknown>;
  // Missing original request belongs to admission, before later collection errors.
  const admitted = await verifyVariationSourceAdmissionV1(record.source, record.sourceRequest);
  if (
    !exactRecord(record, [
      "source",
      "sourceRequest",
      "alternatives",
      "selectedSequence",
      "nextSequence",
    ])
  )
    throw new VariationCollectionValueError("collection");
  const entries = record.alternatives;
  if (!Array.isArray(entries) || entries.length === 0)
    throw new VariationCollectionValueError("collection.alternatives");
  const fields = ["sequence", "attempt", "variation", "creationProof", "history"];
  const original = entries[0];
  if (!exactRecord(original, fields))
    throw new VariationCollectionValueError("collection.alternatives.0");
  if (original.sequence !== 0)
    throw new VariationCollectionValueError("collection.alternatives.0.sequence");
  for (const field of ["attempt", "variation", "creationProof"])
    if (original[field] !== null)
      throw new VariationCollectionValueError(`collection.alternatives.0.${field}`);
  const history = collectionHistoryValuesV1(
    admitted,
    original.history,
    "collection.alternatives.0.history",
  );
  verifyCombinedNoteIdsV1(history, null, "collection.alternatives.0");
  const alternatives: RetainedVariationAlternativeV1[] = [
    Object.freeze({
      sequence: 0,
      attempt: null,
      variation: null,
      creationProof: null,
      history,
    }),
  ];
  if (entries.length > 1) {
    // Raw pair extraction from the detached snapshot grants no authority. The
    // private continuation validates entries in creation order around each proof.
    const pairs = entries.slice(1).map((entry) => ({
      variation: entry !== null && typeof entry === "object" ? entry.variation : undefined,
      creationProof: entry !== null && typeof entry === "object" ? entry.creationProof : undefined,
    }));
    await verifyArpeggiatorVariationAncestryValuesV1(admitted, pairs, {
      before(index) {
        const entry = entries[index + 1];
        const path = `collection.alternatives.${index + 1}`;
        if (!exactRecord(entry, fields)) throw new VariationCollectionValueError(path);
        // No eviction exists; nextSequence advances only on successful append.
        if (!Number.isSafeInteger(entry.sequence) || entry.sequence !== index + 1)
          throw new VariationCollectionValueError(`${path}.sequence`);
      },
      after(pair, index) {
        const entry = entries[index + 1] as Record<string, unknown>;
        const path = `collection.alternatives.${index + 1}`;
        const active = collectionHistoryValuesV1(admitted, entry.history, `${path}.history`);
        const attempt = variationAttemptValuesV1([pair], variationAttemptRecordV1(entry.attempt));
        if (attempt.sequence !== entry.sequence)
          throw new VariationCollectionValueError(`${path}.attempt.sequence`);
        verifyCombinedNoteIdsV1(active, pair.variation, path);
        alternatives.push(
          Object.freeze({
            sequence: entry.sequence as number,
            attempt,
            variation: pair.variation,
            creationProof: pair.creationProof,
            history: active,
          }),
        );
      },
    });
  }
  if (
    !Number.isSafeInteger(record.selectedSequence) ||
    !alternatives.some((entry) => entry.sequence === record.selectedSequence)
  )
    throw new VariationCollectionValueError("collection.selectedSequence");
  if (!Number.isSafeInteger(record.nextSequence) || record.nextSequence !== alternatives.length)
    throw new VariationCollectionValueError("collection.nextSequence");
  return Object.freeze({
    source: admitted.source,
    sourceRequest: admitted.sourceRequest,
    alternatives: Object.freeze(alternatives),
    selectedSequence: record.selectedSequence as number,
    nextSequence: record.nextSequence as number,
  });
}

/** One canonical creation transition from fresh complete retained proof. Metadata
 * is supplied by the Node application, never part of musical identity. */
export async function createRetainedArpeggiatorAlternativeV1(
  value: unknown,
  expectedSelectedSequence: unknown,
  expectedEditor: unknown,
  request: unknown,
  metadata: unknown,
) {
  if (process.versions.node !== "24.21.0")
    throw new Error("Variation creation requires Node 24.21.0.");
  // All consumed records are detached before admission; no late caller reads.
  const supplied = snapshotVariationInputV1(value, "collection");
  const sequence = snapshotVariationInputV1(expectedSelectedSequence, "expectedSelectedSequence");
  const editor = snapshotVariationInputV1(expectedEditor, "expectedParent");
  const proposal = snapshotVariationInputV1(request, "request");
  const suppliedMetadata = snapshotVariationInputV1(metadata, "metadata");
  const collection = await verifyVariationCollectionValuesV1(supplied);
  if (!Number.isSafeInteger(sequence) || sequence !== collection.selectedSequence)
    throw new VariationCollectionValueError("expectedSelectedSequence");
  const selected = collection.alternatives.find((entry) => entry.sequence === sequence);
  const revision = selected?.history.revisions[selected.history.cursor];
  if (!selected || !revision)
    throw new VariationCollectionValueError("collection.selectedSequence");
  const parent = variationStateValuesV1(revision, selected.variation);
  const acceptedRequest = variationRequestValuesV1(proposal, parent, () => {
    if (
      typeof editor !== "object" ||
      editor === null ||
      Array.isArray(editor) ||
      (editor as Record<string, unknown>).schema !== revision.schema
    )
      throw new EditorValueError(
        "INVALID_EDITOR_PARENT",
        "expectedParent",
        "Expected parent is invalid.",
      );
    if ((editor as Record<string, unknown>).revisionHash !== revision.revisionHash)
      throw new EditorValueError(
        "STALE_EDITOR_PARENT",
        "expectedParent.revisionHash",
        "Expected parent is stale.",
      );
  });
  if (
    !exactRecord(suppliedMetadata, ["actor", "createdAt"]) ||
    suppliedMetadata.actor !== "local-producer-unverified"
  )
    throw new VariationAttemptValueError("INVALID_VARIATION_PROVENANCE", "attempt.actor");
  if (!validAttemptUtc(suppliedMetadata.createdAt))
    throw new VariationAttemptValueError("INVALID_VARIATION_PROVENANCE", "attempt.createdAt");
  if (!Number.isSafeInteger(collection.nextSequence + 1))
    throw new VariationCollectionValueError("collection.nextSequence");
  const proof = await originalVariationRootValuesV1(
    {
      verified: {
        source: collection.source,
        sourceRequest: collection.sourceRequest,
        history: selected.history,
      },
      state: parent,
      request: acceptedRequest,
    },
    selected.variation,
  );
  const attemptValues = {
    sequence: collection.nextSequence,
    variation: Object.freeze({
      schema: proof.variation.schema,
      variationHash: proof.variation.variationHash,
    }),
    actor: suppliedMetadata.actor,
    createdAt: suppliedMetadata.createdAt,
  };
  const attempt = variationAttemptValuesV1([proof], {
    schema: VARIATION_ATTEMPT_SCHEMA_V1,
    ...attemptValues,
    attemptHash: digest({ schema: "nightdrive.variation-attempt-hash-input.v1", ...attemptValues }),
  });
  // Separate immutable active fork; the saved proof never follows this cursor.
  const history = freezeTrustedValues(
    JSON.parse(JSON.stringify(selected.history)) as EditorHistoryV1,
  );
  verifyCombinedNoteIdsV1(history, proof.variation, "createdAlternative");
  const alternative = Object.freeze({
    sequence: collection.nextSequence,
    attempt,
    variation: proof.variation,
    creationProof: proof.creationProof,
    history,
  });
  const next: VariationCollectionV1 = Object.freeze({
    source: collection.source,
    sourceRequest: collection.sourceRequest,
    alternatives: Object.freeze([...collection.alternatives, alternative]),
    selectedSequence: alternative.sequence,
    nextSequence: alternative.sequence + 1,
  });
  return Object.freeze({
    collection: next,
    state: variationStateValuesV1(revision, proof.variation),
  });
}
