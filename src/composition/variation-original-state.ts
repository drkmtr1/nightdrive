import process from "node:process";
import { digestStage7CanonicalUtf8 } from "../generators/adapters/stage7-digest";
import type { EditorRevisionV1 } from "./editor-revision";
import { verifyVariationEditorHistoryForNodeV1 } from "./variation-editor-history";
import { snapshotVariationInputV1 } from "./variation-source-admission";

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
    revision.tracks.map((track) =>
      Object.freeze({
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
      }),
    ),
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
    variation: null,
    editor,
    section,
    tracks,
    trackHashes,
    musicHash,
  });
  return Object.freeze({
    schema: VARIATION_STATE_SCHEMA_V1,
    source,
    variation: null,
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
  const rootSeed = record.rootSeed;
  if (
    typeof rootSeed !== "number" ||
    !Number.isSafeInteger(rootSeed) ||
    rootSeed < 0 ||
    rootSeed > 4294967295
  )
    return fail("INVALID_VARIATION_SEED", "request.rootSeed");
  return Object.freeze({
    schema: ARPEGGIATOR_VARIATION_REQUEST_SCHEMA_V1,
    parent: Object.freeze({ schema: VARIATION_STATE_SCHEMA_V1, stateHash: state.stateHash }),
    rootSeed: rootSeed === 0 ? 0 : rootSeed,
  });
}
