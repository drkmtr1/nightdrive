import { it } from "vitest";
import { runStage7Ac004Vector } from "./stage7-ac004-linux-evidence";

it.skipIf(process.env.AC004_WORKER !== "1")(
  "executes one AC-004 vector in a fresh process",
  async () => {
    const index = Number(process.env.AC004_VECTOR_INDEX);
    const row = await runStage7Ac004Vector(index);
    process.stdout.write(`AC004_VECTOR_JSON:${JSON.stringify(row)}\n`);
  },
);
