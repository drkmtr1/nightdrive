import {
  serializeVariationAttemptV1,
  verifyVariationAttemptV1,
} from "../composition/variation-attempt";

/** Existing-record proof only; each entry delegates once to canonical authority. */
export async function verifyVariationAttemptForNodeV1(
  source: unknown,
  sourceRequest: unknown,
  roots: unknown,
  attempt: unknown,
) {
  return verifyVariationAttemptV1(source, sourceRequest, roots, attempt);
}
export async function serializeVariationAttemptForNodeV1(
  source: unknown,
  sourceRequest: unknown,
  roots: unknown,
  attempt: unknown,
): Promise<string> {
  return serializeVariationAttemptV1(source, sourceRequest, roots, attempt);
}
