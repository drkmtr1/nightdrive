/**
 * Plain-Node entry point for one Stage 8 Motif candidate capture.
 *
 * The PowerShell wrapper clears process-start overrides before Node begins.
 * This launcher checks its own exact invocation and delegates all custody,
 * derivation supervision, and retained writes to the native-Node boundary.
 */

import { realpathSync } from "node:fs";
import { resolve } from "node:path";

import {
  runStage8MotifCandidateCapture,
  STAGE8_MOTIF_CANDIDATE_CAPTURE_LAUNCHER_PATH,
} from "./stage8-motif-candidate-capture-boundary.mjs";

function fail(message) {
  throw new Error(`Stage 8 Motif candidate capture launcher: ${message}`);
}

function normalizedEnvironmentName(name) {
  return name.toUpperCase();
}

function assertNeutralLauncherEnvironment() {
  for (const [name, value] of Object.entries(process.env)) {
    const normalized = normalizedEnvironmentName(name);
    if (
      normalized === "VITEST" ||
      normalized.startsWith("NODE_") ||
      normalized.startsWith("LD_") ||
      normalized.startsWith("DYLD_") ||
      normalized.startsWith("GIT_") ||
      normalized.startsWith("NPM_CONFIG_") ||
      normalized.startsWith("NAPI_RS_") ||
      normalized.startsWith("VITE_") ||
      normalized.startsWith("VITEST_") ||
      normalized === "VP_RUN_NODE_CLIENT_PATH" ||
      normalized.startsWith("STAGE8_MOTIF_CANDIDATE_CAPTURE_")
    ) {
      if (value !== undefined && value.length > 0) {
        fail(`refuses environment override: ${name}`);
      }
    }
  }
}

function assertExactArguments() {
  if (process.argv.length !== 5) {
    fail("requires exactly <absolute-output-directory> <reviewed-commit> <reviewed-tree>");
  }
  const [outputDirectory, reviewedCommit, reviewedTree] = process.argv.slice(2);
  if (outputDirectory === undefined || reviewedCommit === undefined || reviewedTree === undefined) {
    fail("arguments are missing");
  }
  if (!/^[0-9a-f]{40}$/u.test(reviewedCommit) || !/^[0-9a-f]{40}$/u.test(reviewedTree)) {
    fail("reviewed commit and tree must be lowercase full SHA-1 values");
  }
  return Object.freeze({ outputDirectory, reviewedCommit, reviewedTree });
}

function assertTrackedLauncher(cwd) {
  const invoked = process.argv[1];
  if (invoked === undefined) fail("invoked launcher path is unavailable");
  const expected = resolve(cwd, STAGE8_MOTIF_CANDIDATE_CAPTURE_LAUNCHER_PATH);
  if (realpathSync(invoked) !== realpathSync(expected)) {
    fail("must execute the tracked capture launcher from this worktree");
  }
}

async function main() {
  assertNeutralLauncherEnvironment();
  if (process.execArgv.length !== 0) fail("must start without Node execution arguments");
  const argumentsValue = assertExactArguments();
  const cwd = realpathSync(process.cwd());
  assertTrackedLauncher(cwd);
  return runStage8MotifCandidateCapture({ cwd, ...argumentsValue });
}

main()
  .then((result) => {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  })
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
