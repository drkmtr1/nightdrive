import {
  serializeStage7ArpeggiatorComponentV1,
  serializeStage7HarmonyComponentV1,
} from "../composition/stage7-arpeggiator-aggregate";

import { digestStage7CanonicalUtf8 } from "./adapters/stage7-digest";

/**
 * Returns the SHA-256 digest for the canonical Stage 7 Harmony component input.
 * Validation and serialization ownership remain in the composition boundary.
 */
export function digestStage7HarmonyComponentV1(section: unknown, harmony: unknown): string {
  return digestStage7CanonicalUtf8(serializeStage7HarmonyComponentV1(section, harmony));
}

/**
 * Returns the SHA-256 digest for the canonical Stage 7 Arpeggiator component input.
 * Validation and serialization ownership remain in the composition boundary.
 */
export function digestStage7ArpeggiatorComponentV1(section: unknown, events: unknown): string {
  return digestStage7CanonicalUtf8(serializeStage7ArpeggiatorComponentV1(section, events));
}
