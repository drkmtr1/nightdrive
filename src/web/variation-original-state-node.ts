import { projectOriginalVariationStateV1 } from "../composition/variation-original-state";

/** Original alternative only. Each entry delegates once to full canonical proof. */
export async function projectOriginalVariationStateForNodeV1(
  source: unknown,
  sourceRequest: unknown,
  history: unknown,
) {
  return projectOriginalVariationStateV1(source, sourceRequest, history);
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
