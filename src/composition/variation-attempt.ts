import process from "node:process";
import { digestStage7CanonicalUtf8 } from "../generators/adapters/stage7-digest";
import {
  ARPEGGIATOR_VARIATION_SCHEMA_V1,
  verifyArpeggiatorVariationAncestryV1,
} from "./variation-original-state";
import { snapshotVariationInputV1 } from "./variation-source-admission";

export const VARIATION_ATTEMPT_SCHEMA_V1 = "nightdrive.variation-attempt.v1" as const;
export type VariationAttemptV1 = Readonly<{
  schema: typeof VARIATION_ATTEMPT_SCHEMA_V1;
  sequence: number;
  variation: Readonly<{ schema: typeof ARPEGGIATOR_VARIATION_SCHEMA_V1; variationHash: string }>;
  actor: "local-producer-unverified";
  createdAt: string;
  attemptHash: string;
}>;
export class VariationAttemptValueError extends RangeError {
  constructor(
    readonly code:
      | "INVALID_VARIATION_INPUT"
      | "UNSUPPORTED_VARIATION_SCHEMA"
      | "INVALID_VARIATION_COLLECTION"
      | "INVALID_VARIATION_LINEAGE"
      | "INVALID_VARIATION_PROVENANCE"
      | "VARIATION_HASH_MISMATCH",
    readonly field: string,
  ) {
    super(`Variation attempt is invalid at ${field}.`);
    this.name = "VariationAttemptValueError";
  }
}
function exactRecord(value: unknown, fields: readonly string[]): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value)) === JSON.stringify(fields)
  );
}
function validUtc(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))
    return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

/** Full source/root proof on every invocation. This verifies an existing record,
 * not sequence uniqueness, historical authorship, time truth or collection state.
 * No supplied record or returned value is an admission token. */
export async function verifyVariationAttemptV1(
  source: unknown,
  sourceRequest: unknown,
  roots: unknown,
  attempt: unknown,
): Promise<VariationAttemptV1> {
  if (process.versions.node !== "24.21.0")
    throw new Error("Variation attempt verification requires Node 24.21.0.");
  const suppliedSource = snapshotVariationInputV1(source, "source");
  const suppliedRequest = snapshotVariationInputV1(sourceRequest, "sourceRequest");
  const suppliedRoots = snapshotVariationInputV1(roots, "roots");
  const supplied = snapshotVariationInputV1(attempt, "attempt");
  if (
    !exactRecord(supplied, ["schema", "sequence", "variation", "actor", "createdAt", "attemptHash"])
  )
    throw new VariationAttemptValueError("INVALID_VARIATION_INPUT", "attempt");
  if (supplied.schema !== VARIATION_ATTEMPT_SCHEMA_V1)
    throw new VariationAttemptValueError("UNSUPPORTED_VARIATION_SCHEMA", "attempt.schema");
  // Source admission and complete ancestry precede attempt metadata. Reuse only
  // within this invocation; the public ancestry boundary supplies no trust token.
  const verified = await verifyArpeggiatorVariationAncestryV1(
    suppliedSource,
    suppliedRequest,
    suppliedRoots,
  );
  if (!Number.isSafeInteger(supplied.sequence) || (supplied.sequence as number) < 1)
    throw new VariationAttemptValueError("INVALID_VARIATION_COLLECTION", "attempt.sequence");
  const identity = supplied.variation;
  if (
    !exactRecord(identity, ["schema", "variationHash"]) ||
    identity.schema !== ARPEGGIATOR_VARIATION_SCHEMA_V1 ||
    !verified.some(({ variation }) => variation.variationHash === identity.variationHash)
  )
    throw new VariationAttemptValueError("INVALID_VARIATION_LINEAGE", "attempt.variation");
  if (supplied.actor !== "local-producer-unverified")
    throw new VariationAttemptValueError("INVALID_VARIATION_PROVENANCE", "attempt.actor");
  if (!validUtc(supplied.createdAt))
    throw new VariationAttemptValueError("INVALID_VARIATION_PROVENANCE", "attempt.createdAt");
  const variation = Object.freeze({
    schema: ARPEGGIATOR_VARIATION_SCHEMA_V1,
    variationHash: identity.variationHash as string,
  });
  const values = {
    sequence: supplied.sequence as number,
    variation,
    actor: supplied.actor,
    createdAt: supplied.createdAt,
  } as const;
  const attemptHash = digestStage7CanonicalUtf8(
    JSON.stringify({ schema: "nightdrive.variation-attempt-hash-input.v1", ...values }),
  );
  if (supplied.attemptHash !== attemptHash)
    throw new VariationAttemptValueError("VARIATION_HASH_MISMATCH", "attempt.attemptHash");
  return Object.freeze({ schema: VARIATION_ATTEMPT_SCHEMA_V1, ...values, attemptHash });
}

/** Canonical bytes require the same full proof, never a self-consistent digest. */
export async function serializeVariationAttemptV1(
  source: unknown,
  sourceRequest: unknown,
  roots: unknown,
  attempt: unknown,
): Promise<string> {
  return JSON.stringify(await verifyVariationAttemptV1(source, sourceRequest, roots, attempt));
}
