import { digestStage7CanonicalUtf8 } from "../generators/adapters/stage7-digest";
import type { EditorRevisionV1 } from "./editor-revision";
import { verifyVariationEditorHistoryForNodeV1 } from "./variation-editor-history";

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
