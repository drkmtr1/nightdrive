/**
 * Read-only Vitest worker for one Stage 8 Motif candidate derivation.
 *
 * This file can construct and report an in-memory candidate payload. It has no
 * filesystem, subprocess, output-path, reviewed-tuple, or materialization
 * capability. The native-Node custody boundary is the only artifact writer.
 */

import { createHash } from "node:crypto";

import { it } from "vitest";

import { buildStage8MotifCandidateArtifact } from "./stage8-motif-candidate-vectors";

const WORKER_MODE_ENVIRONMENT_VARIABLE = "STAGE8_MOTIF_CANDIDATE_CAPTURE_WORKER";
const WORKER_MARKER = "STAGE8_MOTIF_CANDIDATE_WORKER=";

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function workerPayload(): Readonly<{ text: string; byteLength: number; sha256: string }> {
  const text = `${JSON.stringify(buildStage8MotifCandidateArtifact(), null, 2)}\n`;
  const bytes = new TextEncoder().encode(text);
  return Object.freeze({ text, byteLength: bytes.byteLength, sha256: sha256(bytes) });
}

it("constructs one in-memory Stage 8 Motif candidate payload", () => {
  const payload = workerPayload();
  if (payload.byteLength === 0 || payload.sha256.length !== 64) {
    throw new Error("Stage 8 Motif candidate worker did not construct an artifact payload.");
  }
  if (process.env[WORKER_MODE_ENVIRONMENT_VARIABLE] === "1") {
    const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
    process.stdout.write(`${WORKER_MARKER}${encoded}\n`);
  }
});
