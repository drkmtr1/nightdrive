import { verifyVariationEditorHistoryForNodeV1 } from "../composition/variation-editor-history";

/** Bootstrap only. Returned collection data carries no reusable admission authority.
 * Every later M3 entry must freshly verify source and its complete retained context. */
export async function createOriginalVariationCollectionV1(
  source: unknown,
  sourceRequest: unknown,
  history: unknown,
) {
  const verified = await verifyVariationEditorHistoryForNodeV1(source, sourceRequest, history);
  const original = Object.freeze({
    sequence: 0 as const,
    attempt: null,
    variation: null,
    creationProof: null,
    history: verified.history,
  });
  return Object.freeze({
    source: verified.source,
    sourceRequest: verified.sourceRequest,
    alternatives: Object.freeze([original]),
    selectedSequence: 0 as const,
    nextSequence: 1 as const,
  });
}
