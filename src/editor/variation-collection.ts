import type {
  CompleteSectionRequestV1,
  CompleteSectionResultV1,
} from "../composition/complete-section";
import type { VariationAttemptV1 } from "../composition/variation-attempt";
import { verifyVariationEditorHistoryForNodeV1 } from "../composition/variation-editor-history";
import type {
  OriginalArpeggiatorVariationV1,
  VariationCreationProofV1,
} from "../composition/variation-original-state";
import type { EditorHistoryV1 } from "./editor-history";

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

/** Accepted in-memory application data; never an admission token or persisted schema. */
export type RetainedVariationAlternativeV1 = Readonly<{
  sequence: number;
  attempt: VariationAttemptV1 | null;
  variation: OriginalArpeggiatorVariationV1 | null;
  creationProof: VariationCreationProofV1 | null;
  history: EditorHistoryV1;
}>;
export type VariationCollectionV1 = Readonly<{
  source: CompleteSectionResultV1;
  sourceRequest: CompleteSectionRequestV1;
  alternatives: readonly RetainedVariationAlternativeV1[];
  selectedSequence: number;
  nextSequence: number;
}>;
