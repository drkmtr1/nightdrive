import { serializeStage7ArpeggiatorAggregateHashInputV1 } from "../composition/stage7-arpeggiator-aggregate";

import { digestStage7CanonicalUtf8 } from "./adapters/stage7-digest";

/**
 * Returns the Stage 7 aggregate resultHash over the canonical aggregate input
 * with the resultHash key excluded entirely.
 */
export function digestStage7ArpeggiatorAggregateV1(value: unknown): string {
  return digestStage7CanonicalUtf8(serializeStage7ArpeggiatorAggregateHashInputV1(value));
}
