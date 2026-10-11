import { createOriginalVariationCollectionV1 } from "../editor/variation-collection";

/** Original-only import; delegates once to admitted editor/history authority. */
export async function createOriginalVariationCollectionForNodeV1(
  source: unknown,
  sourceRequest: unknown,
  history: unknown,
) {
  return createOriginalVariationCollectionV1(source, sourceRequest, history);
}
