import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const WORKER_PATH = resolve(
  process.cwd(),
  "src/evaluation/stage8-motif-candidate-capture-worker.test.ts",
);
const WORKER_SOURCE = readFileSync(WORKER_PATH, "utf8");

describe("Stage 8 Motif candidate capture worker boundary", () => {
  it("has only its read-only derivation imports", () => {
    const imports = [...WORKER_SOURCE.matchAll(/from\s+["']([^"']+)["']/gu)].map(
      (match) => match[1],
    );
    expect(imports).toEqual(["node:crypto", "vitest", "./stage8-motif-candidate-vectors"]);
  });

  it("cannot receive custody inputs or perform retained writes", () => {
    expect(WORKER_SOURCE).toMatch(/process\.stdout\.write/u);
    expect(WORKER_SOURCE).not.toMatch(
      /node:(?:fs|fs\/promises|child_process)|\b(?:writeFile|mkdir|rename|spawn|exec|materialize)\b/u,
    );
    expect(WORKER_SOURCE).not.toMatch(
      /(?:OUTPUT|REVIEWED_COMMIT|REVIEWED_TREE|LAUNCHER_TOKEN|process\.argv|outputDirectory)/u,
    );
    expect(WORKER_SOURCE).not.toMatch(/STAGE8_MOTIF_CANDIDATE_CAPTURE_(?!WORKER)/u);
  });
});
