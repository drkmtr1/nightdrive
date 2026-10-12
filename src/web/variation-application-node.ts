import {
  createRetainedArpeggiatorAlternativeV1,
  editRetainedVariationContextV1,
  projectRetainedVariationContextV1,
  redoRetainedVariationContextV1,
  selectRetainedVariationContextV1,
  undoRetainedVariationContextV1,
  type VariationStateV1,
  verifyVariationCollectionV1,
} from "../composition/variation-original-state";
import type { VariationCollectionV1 } from "../editor/variation-collection";
import type { CompleteSectionPreview } from "./complete-section-preview-node";

/** Private derived projection, used only in this invocation's verified continuation. */
function previewValues(collection: VariationCollectionV1): CompleteSectionPreview {
  const selected = collection.alternatives.find(
    (entry) => entry.sequence === collection.selectedSequence,
  );
  const revision = selected?.history.revisions[selected.history.cursor];
  if (!selected || !revision) throw new Error("Verified variation selection is missing.");
  return Object.freeze({
    sourceResultHash: collection.source.resultHash,
    section: Object.freeze({
      ppq: revision.section.ppq,
      barCount: revision.section.barCount,
      timeSignature: Object.freeze({ ...revision.section.timeSignature }),
      tempo: Object.freeze({ ...revision.section.tempo }),
      endTick: revision.section.endTick,
    }),
    tracks: Object.freeze(
      revision.tracks.map((track) => {
        const current =
          track.role === "arpeggiator" && selected.variation !== null
            ? selected.variation.tracks[2]
            : track;
        if (!current) throw new Error("Verified variation track is missing.");
        return Object.freeze({
          role: current.role,
          notes: Object.freeze(
            current.notes.map(({ pitch, startTick, durationTicks }) =>
              Object.freeze({ pitch, startTick, durationTicks }),
            ),
          ),
        });
      }),
    ),
  });
}

/** Preview only. Complete retained source/proof/history verification is fresh on
 * every call; no caller-supplied state, hash or admission flag bypasses it. */
export async function projectRetainedVariationPreviewForNodeV1(
  value: unknown,
): Promise<CompleteSectionPreview> {
  const verified = await verifyVariationCollectionV1(value);
  return previewValues(verified);
}

/** Explicit creation only; actor/clock/sequence are application-owned. A partial
 * collection, attempt or preview is never installed or returned on failure. */
export async function createRetainedArpeggiatorVariationApplicationForNodeV1(
  value: unknown,
  expectedSelectedSequence: unknown,
  expectedEditor: unknown,
  request: unknown,
) {
  if (process.versions.node !== "24.21.0")
    throw new Error("Variation application creation requires Node 24.21.0.");
  const createdAt = new Date().toISOString();
  const result = await createRetainedArpeggiatorAlternativeV1(
    value,
    expectedSelectedSequence,
    expectedEditor,
    request,
    { actor: "local-producer-unverified", createdAt },
  );
  return applicationValues(result);
}

function applicationValues(
  result: Readonly<{ collection: VariationCollectionV1; state: VariationStateV1 }>,
) {
  return Object.freeze({
    collection: result.collection,
    selectedState: Object.freeze({
      schema: result.state.schema,
      stateHash: result.state.stateHash,
    }),
    selectedRevision: result.state.editor,
    preview: previewValues(result.collection),
  });
}

/** Complete current view after fresh proof; no selection or history mutation. */
export async function projectRetainedVariationApplicationForNodeV1(value: unknown) {
  if (process.versions.node !== "24.21.0")
    throw new Error("Variation application projection requires Node 24.21.0.");
  return applicationValues(await projectRetainedVariationContextV1(value));
}

/** Thin application delegation, with no clock read or new musical transition. */
export async function selectRetainedVariationApplicationForNodeV1(
  value: unknown,
  expectedSelectedSequence: unknown,
  expectedState: unknown,
  expectedEditor: unknown,
  selectedSequence: unknown,
) {
  if (process.versions.node !== "24.21.0")
    throw new Error("Variation application selection requires Node 24.21.0.");
  return applicationValues(
    await selectRetainedVariationContextV1(
      value,
      expectedSelectedSequence,
      expectedState,
      expectedEditor,
      selectedSequence,
    ),
  );
}

/** Existing canonical Lead commands only, after fresh retained context authority. */
export async function editRetainedVariationApplicationForNodeV1(
  value: unknown,
  expectedSelectedSequence: unknown,
  expectedState: unknown,
  expectedEditor: unknown,
  command: unknown,
) {
  if (process.versions.node !== "24.21.0")
    throw new Error("Variation application edit requires Node 24.21.0.");
  return applicationValues(
    await editRetainedVariationContextV1(
      value,
      expectedSelectedSequence,
      expectedState,
      expectedEditor,
      command,
    ),
  );
}
export async function undoRetainedVariationApplicationForNodeV1(
  value: unknown,
  expectedSelectedSequence: unknown,
  expectedState: unknown,
  expectedEditor: unknown,
) {
  if (process.versions.node !== "24.21.0")
    throw new Error("Variation application Undo requires Node 24.21.0.");
  const result = await undoRetainedVariationContextV1(
    value,
    expectedSelectedSequence,
    expectedState,
    expectedEditor,
  );
  return result === null ? null : applicationValues(result);
}
export async function redoRetainedVariationApplicationForNodeV1(
  value: unknown,
  expectedSelectedSequence: unknown,
  expectedState: unknown,
  expectedEditor: unknown,
) {
  if (process.versions.node !== "24.21.0")
    throw new Error("Variation application Redo requires Node 24.21.0.");
  const result = await redoRetainedVariationContextV1(
    value,
    expectedSelectedSequence,
    expectedState,
    expectedEditor,
  );
  return result === null ? null : applicationValues(result);
}
