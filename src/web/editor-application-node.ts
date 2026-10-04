import process from "node:process";
import type { CompleteSectionResultV1 } from "../composition/complete-section";
import type {
  EditorRevisionIdentityV1,
  EditorRevisionV1,
  SetNotePitchCommandV1,
} from "../composition/editor-revision";
import {
  applyEditorCommandV1,
  createEditorHistoryV1,
  type EditorHistoryV1,
  redoEditorHistoryV1,
  selectedEditorRevisionV1,
  undoEditorHistoryV1,
} from "../editor/editor-history";
import type {
  CompleteSectionPreview,
  PreviewNote,
  PreviewRole,
  PreviewTrack,
} from "./complete-section-preview-node";

export type EditorApplicationV1 = Readonly<{
  history: EditorHistoryV1;
  selectedRevision: EditorRevisionIdentityV1;
  preview: CompleteSectionPreview;
}>;

function requirePinnedNode(): void {
  if (process.versions.node !== "24.21.0") {
    throw new Error("Editor application operations require Node 24.21.0.");
  }
}

function freezePreviewTrack(role: PreviewRole, notes: readonly PreviewNote[]): PreviewTrack {
  return Object.freeze({
    role,
    notes: Object.freeze(
      notes.map((note) =>
        Object.freeze({
          pitch: note.pitch,
          startTick: note.startTick,
          durationTicks: note.durationTicks,
        }),
      ),
    ),
  });
}

function projectPreview(
  sourceResultHash: string,
  revision: EditorRevisionV1,
): CompleteSectionPreview {
  return Object.freeze({
    sourceResultHash,
    section: Object.freeze({
      ppq: revision.section.ppq,
      barCount: revision.section.barCount,
      timeSignature: Object.freeze({
        numerator: revision.section.timeSignature.numerator,
        denominator: revision.section.timeSignature.denominator,
      }),
      tempo: Object.freeze({
        microsecondsPerQuarter: revision.section.tempo.microsecondsPerQuarter,
      }),
      endTick: revision.section.endTick,
    }),
    tracks: Object.freeze(
      revision.tracks.map((track) => freezePreviewTrack(track.role, track.notes)),
    ),
  });
}

function application(history: EditorHistoryV1): EditorApplicationV1 {
  const revision = selectedEditorRevisionV1(history);
  return Object.freeze({
    history,
    selectedRevision: Object.freeze({
      schema: revision.schema,
      revisionHash: revision.revisionHash,
    }),
    preview: projectPreview(revision.source.resultHash, revision),
  });
}

/** Creates a Node-owned editor application view from a verified generation result. */
export function createEditorApplicationV1(source: CompleteSectionResultV1): EditorApplicationV1 {
  requirePinnedNode();
  return application(createEditorHistoryV1(source));
}

/** Applies one validated Lead pitch command and returns its derived audition view. */
export function editEditorApplicationPitchV1(
  current: EditorApplicationV1,
  expectedParent: EditorRevisionIdentityV1,
  command: SetNotePitchCommandV1,
): EditorApplicationV1 {
  requirePinnedNode();
  return application(applyEditorCommandV1(current.history, expectedParent, command));
}

/** Selects the previous immutable revision and projects its audition view. */
export function undoEditorApplicationV1(current: EditorApplicationV1): EditorApplicationV1 | null {
  requirePinnedNode();
  const history = undoEditorHistoryV1(current.history);
  return history === null ? null : application(history);
}

/** Selects the next immutable revision and projects its audition view. */
export function redoEditorApplicationV1(current: EditorApplicationV1): EditorApplicationV1 | null {
  requirePinnedNode();
  const history = redoEditorHistoryV1(current.history);
  return history === null ? null : application(history);
}
