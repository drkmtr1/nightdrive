import {
  Stage7AggregateValueError,
  type Stage7ArpeggiatorAggregateV1,
  validateStage7ArpeggiatorAggregateV1,
} from "../composition/stage7-arpeggiator-aggregate";

import { digestStage7ArpeggiatorAggregateV1 } from "./stage7-aggregate-hash";
import {
  digestStage7ArpeggiatorComponentV1,
  digestStage7HarmonyComponentV1,
} from "./stage7-component-hashes";

export type Stage7AggregateIntegrityErrorCode = "AGGREGATE_HASH_MISMATCH";

export class Stage7AggregateIntegrityError extends Error {
  readonly code: Stage7AggregateIntegrityErrorCode;
  readonly field: "componentHashes.harmony" | "componentHashes.arpeggiator" | "resultHash";

  constructor(field: "componentHashes.harmony" | "componentHashes.arpeggiator" | "resultHash") {
    super(`${field} does not match its canonical digest.`);
    this.name = "Stage7AggregateIntegrityError";
    this.code = "AGGREGATE_HASH_MISMATCH";
    this.field = field;
  }
}

function assertDigest(
  field: Stage7AggregateIntegrityError["field"],
  actual: string,
  expected: string,
): void {
  if (actual !== expected) throw new Stage7AggregateIntegrityError(field);
}

/**
 * Verifies an in-memory Stage 7 aggregate without parsing, persisting, replaying,
 * or regenerating any musical component.
 */
export async function verifyStage7ArpeggiatorAggregateV1(
  value: unknown,
): Promise<Stage7ArpeggiatorAggregateV1> {
  const result = validateStage7ArpeggiatorAggregateV1(value);

  const harmonyDigest = digestStage7HarmonyComponentV1(result.section, result.components.harmony);
  assertDigest("componentHashes.harmony", result.componentHashes.harmony, harmonyDigest);

  const arpeggiatorDigest = digestStage7ArpeggiatorComponentV1(
    result.section,
    result.components.arpeggiator,
  );
  assertDigest(
    "componentHashes.arpeggiator",
    result.componentHashes.arpeggiator,
    arpeggiatorDigest,
  );

  const aggregateDigest = digestStage7ArpeggiatorAggregateV1(result);
  assertDigest("resultHash", result.resultHash, aggregateDigest);

  return result;
}

export { Stage7AggregateValueError };
