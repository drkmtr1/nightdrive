import {
  createRetainedArpeggiatorAlternativeV1,
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
