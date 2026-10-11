import {
  generateOriginalArpeggiatorVariationComponentV1,
  generateOriginalArpeggiatorVariationRootV1,
  projectOriginalVariationStateV1,
  serializeOriginalArpeggiatorVariationRootV1,
  verifyArpeggiatorVariationAncestryV1,
  verifyOriginalArpeggiatorVariationRequestV1,
  verifyOriginalArpeggiatorVariationRootV1,
} from "../composition/variation-original-state";

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

/** Request preflight only; no target generation or retained alternative creation. */
export async function verifyOriginalArpeggiatorVariationRequestForNodeV1(
  source: unknown,
  sourceRequest: unknown,
  history: unknown,
  request: unknown,
) {
  return verifyOriginalArpeggiatorVariationRequestV1(source, sourceRequest, history, request);
}

/** Existing aggregate only; full fresh canonical proof precedes target generation. */
export async function generateOriginalArpeggiatorVariationComponentForNodeV1(
  source: unknown,
  sourceRequest: unknown,
  history: unknown,
  request: unknown,
) {
  return generateOriginalArpeggiatorVariationComponentV1(source, sourceRequest, history, request);
}
/** Original-parent root/proof only; no alternative, attempt or preview installed. */
export async function generateOriginalArpeggiatorVariationRootForNodeV1(
  source: unknown,
  sourceRequest: unknown,
  history: unknown,
  request: unknown,
) {
  return generateOriginalArpeggiatorVariationRootV1(source, sourceRequest, history, request);
}
export async function verifyOriginalArpeggiatorVariationRootForNodeV1(
  source: unknown,
  sourceRequest: unknown,
  history: unknown,
  request: unknown,
  variation: unknown,
  creationProof: unknown,
) {
  return verifyOriginalArpeggiatorVariationRootV1(
    source,
    sourceRequest,
    history,
    request,
    variation,
    creationProof,
  );
}
export async function serializeOriginalArpeggiatorVariationRootForNodeV1(
  source: unknown,
  sourceRequest: unknown,
  history: unknown,
  request: unknown,
  variation: unknown,
  creationProof: unknown,
) {
  return serializeOriginalArpeggiatorVariationRootV1(
    source,
    sourceRequest,
    history,
    request,
    variation,
    creationProof,
  );
}

/** Root/proof closure only; collection metadata and active histories are outside
 * this prerequisite. Each invocation freshly proves source and all ancestors. */
export async function verifyArpeggiatorVariationAncestryForNodeV1(
  source: unknown,
  sourceRequest: unknown,
  roots: unknown,
) {
  return verifyArpeggiatorVariationAncestryV1(source, sourceRequest, roots);
}
