import { createHash } from "node:crypto";

const UTF8_ENCODER = new TextEncoder();

/**
 * Returns the lowercase SHA-256 digest of the exact UTF-8 bytes of an
 * already-canonical Stage 7 string.
 */
export function digestStage7CanonicalUtf8(value: string): string {
  return createHash("sha256").update(UTF8_ENCODER.encode(value)).digest("hex");
}
