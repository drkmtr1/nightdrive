import { it } from "vitest";
import {
  executeWorker,
  type FirstPlayableEvidenceTarget,
  FirstPlayableMismatch,
  workerMismatchLine,
} from "./first-playable-linux-evidence";

it.skipIf(process.env.FP_EVIDENCE_WORKER !== "1")(
  "executes one frozen First Playable row in a fresh process",
  async () => {
    const index = Number(process.env.FP_EVIDENCE_INDEX);
    if (!Number.isInteger(index) || index < 0 || index >= 12)
      throw new Error("Invalid frozen row index");
    const target = process.env.FP_EVIDENCE_TARGET;
    if (target !== "linux" && target !== "windows")
      throw new Error("Invalid First Playable evidence target");
    try {
      if (process.env.FP_LINUX_TEST_MISMATCH === "1")
        throw new FirstPlayableMismatch({
          vectorId: "FP-01",
          field: "componentHashes.harmony",
          message: "Controlled worker diagnostic transport failure",
          actualSha256: "a".repeat(64),
          expectedSha256: "b".repeat(64),
        });
      const payload = await executeWorker(index, target as FirstPlayableEvidenceTarget);
      const prefix = target === "linux" ? "FP_LINUX_ROW" : "FP_WINDOWS_ROW";
      process.stdout.write(`${prefix}:${JSON.stringify(payload)}\n`);
    } catch (error) {
      const line = workerMismatchLine(error);
      if (line !== undefined) process.stdout.write(`${line}\n`);
      throw error;
    }
  },
);
