import { it } from "vitest";
import { executeWorker } from "./first-playable-linux-evidence";

it.skipIf(process.env.FP_LINUX_WORKER !== "1")(
  "executes one frozen First Playable row in a fresh process",
  async () => {
    const index = Number(process.env.FP_LINUX_INDEX);
    if (!Number.isInteger(index) || index < 0 || index >= 12)
      throw new Error("Invalid frozen row index");
    const payload = await executeWorker(index);
    process.stdout.write(`FP_LINUX_ROW:${JSON.stringify(payload)}\n`);
  },
);
