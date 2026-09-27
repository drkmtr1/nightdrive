/**
 * Isolated Vitest configuration for one Stage 8 candidate derivation.
 *
 * It intentionally does not load the repository's browser-oriented test
 * configuration or setup files. The launcher names this file explicitly in
 * its fixed command manifest and records its immutable source custody.
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
  envDir: false,
  test: {
    cache: false,
    coverage: {
      enabled: false,
    },
    environment: "node",
    fileParallelism: false,
    fsModuleCache: false,
    include: ["src/evaluation/stage8-motif-candidate-capture-worker.test.ts"],
    maxWorkers: 1,
    pool: "threads",
    sequence: {
      shuffle: false,
    },
    setupFiles: [],
    update: "none",
  },
});
