import { it } from "vitest";
import {
  executeWorker,
  FirstPlayableMismatch,
  workerMismatchLine,
} from "./first-playable-linux-evidence";

it.skipIf(process.env.FP_LINUX_WORKER !== "1")(
  "executes one frozen First Playable row in a fresh process",
  async () => {
    const index = Number(process.env.FP_LINUX_INDEX);
    if (!Number.isInteger(index) || index < 0 || index >= 12)
      throw new Error("Invalid frozen row index");
    try {
      if (process.env.FP_LINUX_TEST_MISMATCH === "1")
        throw new FirstPlayableMismatch({
          vectorId: "FP-01",
          field: "componentHashes.harmony",
          message: "Controlled worker diagnostic transport failure",
          actualSha256: "a".repeat(64),
          expectedSha256: "b".repeat(64),
        });
      const payload = await executeWorker(index);
      process.stdout.write(`FP_LINUX_ROW:${JSON.stringify(payload)}\n`);
    } catch (error) {
      const line = workerMismatchLine(error);
      if (line !== undefined) process.stdout.write(`${line}\n`);
      throw error;
    }
  },
);
