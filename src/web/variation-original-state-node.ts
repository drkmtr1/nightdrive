import { originalVariationStateValuesV1 } from "../composition/variation-original-state";
import { verifyVariationEditorHistoryForNodeV1 } from "./variation-editor-history-node";

/** Original alternative only. Each call freshly admits source and proves all
 * history, including redo. Returned state data never grants reusable authority. */
export async function projectOriginalVariationStateForNodeV1(
  source: unknown,
  sourceRequest: unknown,
  history: unknown,
) {
  const verified = await verifyVariationEditorHistoryForNodeV1(source, sourceRequest, history);
  const selected = verified.history.revisions[verified.history.cursor];
  if (!selected) throw new Error("Verified editor selection is missing.");
  return originalVariationStateValuesV1(selected);
}

/** No supplied state or claimed admission flag is accepted as serialization
 * authority: repeat the full entry proof and serialize only its fresh result. */
export async function serializeOriginalVariationStateForNodeV1(
  source: unknown,
  sourceRequest: unknown,
  history: unknown,
): Promise<string> {
  return JSON.stringify(
    await projectOriginalVariationStateForNodeV1(source, sourceRequest, history),
  );
}
