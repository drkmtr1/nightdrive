import { verifyVariationCollectionV1 } from "../composition/variation-original-state";
import { createOriginalVariationCollectionV1 } from "../editor/variation-collection";

/** Original-only import; delegates once to admitted editor/history authority. */
export async function createOriginalVariationCollectionForNodeV1(
  source: unknown,
  sourceRequest: unknown,
  history: unknown,
) {
  return createOriginalVariationCollectionV1(source, sourceRequest, history);
}

/** Complete retained-source, ancestry, active-history and attempt verification. */
export async function verifyVariationCollectionForNodeV1(value: unknown) {
  return verifyVariationCollectionV1(value);
}
