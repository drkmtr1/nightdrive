/**
 * Native-Node custody boundary for one Stage 8 Motif candidate capture.
 *
 * The launcher calls this module before it starts Vitest, after the read-only
 * worker exits, and after publication. It owns repository/runtime custody,
 * the outer invocation record, and all retained writes. The Vitest worker
 * never receives an output path and cannot materialize an artifact.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, delimiter, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export const STAGE8_MOTIF_CANDIDATE_ARTIFACT_FILENAME = "candidate-vectors.json";
export const STAGE8_MOTIF_CANDIDATE_CAPTURE_RECEIPT_FILENAME = "capture-receipt.json";
export const STAGE8_MOTIF_CANDIDATE_CAPTURE_RECEIPT_SCHEMA =
  "nightdrive.stage8-motif-candidate-capture-receipt.v1";
export const STAGE8_MOTIF_CANDIDATE_CAPTURE_WORKER_MARKER = "STAGE8_MOTIF_CANDIDATE_WORKER=";
export const STAGE8_MOTIF_CANDIDATE_CAPTURE_WRAPPER_PATH =
  "scripts/capture-stage8-motif-candidate.ps1";
export const STAGE8_MOTIF_CANDIDATE_CAPTURE_LAUNCHER_PATH =
  "src/evaluation/stage8-motif-candidate-capture-launcher.mjs";
export const STAGE8_MOTIF_CANDIDATE_CAPTURE_WORKER_PATH =
  "src/evaluation/stage8-motif-candidate-capture-worker.test.ts";
export const STAGE8_MOTIF_CANDIDATE_CAPTURE_VITEST_CONFIG_PATH =
  "src/evaluation/stage8-motif-candidate-capture.vitest.config.mjs";
export const STAGE8_MOTIF_CANDIDATE_CAPTURE_SUPERVISOR_ARGUMENTS = Object.freeze([
  "node_modules/vitest/vitest.mjs",
  "run",
  "--configLoader=native",
  "--config",
  STAGE8_MOTIF_CANDIDATE_CAPTURE_VITEST_CONFIG_PATH,
  STAGE8_MOTIF_CANDIDATE_CAPTURE_WORKER_PATH,
  "--reporter=dot",
]);
export const STAGE8_MOTIF_CANDIDATE_CAPTURE_TRACKED_INPUT_PATHS = Object.freeze([
  ".gitattributes",
  ".npmrc",
  ".nvmrc",
  "docs/MOTIF_MODEL.md",
  "docs/TESTING_STRATEGY.md",
  "docs/reviews/STAGE8_MOTIF_EVIDENCE_METHOD_PROPOSAL.md",
  "package-lock.json",
  "package.json",
  "scripts/capture-stage8-motif-candidate.ps1",
  "src/evaluation/stage7-ac004-harmony-snapshots.ts",
  "src/evaluation/stage8-motif-candidate-capture-boundary.mjs",
  "src/evaluation/stage8-motif-candidate-capture-launcher.mjs",
  "src/evaluation/stage8-motif-candidate-capture-worker.test.ts",
  "src/evaluation/stage8-motif-candidate-capture.vitest.config.mjs",
  "src/evaluation/stage8-motif-candidate-vectors.ts",
  "src/evaluation/stage8-motif-reference-plan-resolution.ts",
  "src/evaluation/stage8-motif-reference-policy.ts",
  "src/evaluation/stage8-motif-reference-primitives.ts",
  "src/evaluation/stage8-motif-reference-projector.ts",
  "src/evaluation/stage8-motif-source-bindings.ts",
  "tsconfig.json",
]);

const CANDIDATE_ARTIFACT_SCHEMA = "nightdrive.stage8-motif-candidate-vectors.v1";
const CANDIDATE_STATUS = "CANDIDATE";
const REQUIRED_INSTALLED_PACKAGES = Object.freeze([
  Object.freeze({
    name: "vitest",
    version: "5.0.0",
    packageJsonPath: "node_modules/vitest/package.json",
    entryPointPath: "node_modules/vitest/vitest.mjs",
  }),
  Object.freeze({
    name: "vite",
    version: "8.2.2",
    packageJsonPath: "node_modules/vite/package.json",
    entryPointPath: "node_modules/vite/dist/node/index.js",
  }),
  Object.freeze({
    name: "rolldown",
    version: "1.2.8",
    packageJsonPath: "node_modules/rolldown/package.json",
    entryPointPath: "node_modules/rolldown/dist/index.mjs",
  }),
]);
const FROZEN_SOURCE_IDENTITY = Object.freeze({
  commit: "c67295bde50b599caba90f0433352815ebac9bc7",
  path: "src/evaluation/stage7-ac004-harmony-snapshots.ts",
  gitBlobObjectId: "c9ea54f1b7b6a533724fb9782ac816e2b80f9422",
});
const FROZEN_SOURCE_BINDINGS = Object.freeze([
  Object.freeze({
    sourceRecordId: "dark-synthwave-chorus-001",
    profileId: "dark-synthwave",
    templateId: "degree-0654-natural-minor-v1",
    tonic: 0,
    scale: "natural-minor",
    slots: Object.freeze([
      Object.freeze({
        degree: 0,
        root: 0,
        quality: "minor-triad",
        inversion: 0,
        midiPitches: [36, 39, 43],
      }),
      Object.freeze({
        degree: 6,
        root: 10,
        quality: "major-triad",
        inversion: 1,
        midiPitches: [38, 41, 46],
      }),
      Object.freeze({
        degree: 5,
        root: 8,
        quality: "major-triad",
        inversion: 1,
        midiPitches: [36, 39, 44],
      }),
      Object.freeze({
        degree: 4,
        root: 7,
        quality: "major-triad",
        inversion: 2,
        midiPitches: [38, 43, 47],
      }),
    ]),
  }),
  Object.freeze({
    sourceRecordId: "classic-synthwave-chorus-001",
    profileId: "classic-synthwave",
    templateId: "degree-0344-major-v1",
    tonic: 0,
    scale: "major",
    slots: Object.freeze([
      Object.freeze({
        degree: 0,
        root: 0,
        quality: "major-triad",
        inversion: 0,
        midiPitches: [48, 52, 55],
      }),
      Object.freeze({
        degree: 3,
        root: 5,
        quality: "major-triad",
        inversion: 2,
        midiPitches: [48, 53, 57],
      }),
      Object.freeze({
        degree: 4,
        root: 7,
        quality: "major-triad",
        inversion: 1,
        midiPitches: [47, 50, 55],
      }),
      Object.freeze({
        degree: 0,
        root: 0,
        quality: "major-triad",
        inversion: 0,
        midiPitches: [48, 52, 55],
      }),
    ]),
  }),
  Object.freeze({
    sourceRecordId: "darkwave-verse-001",
    profileId: "darkwave",
    templateId: "degree-0654-natural-minor-v1",
    tonic: 0,
    scale: "natural-minor",
    slots: Object.freeze([
      Object.freeze({
        degree: 0,
        root: 0,
        quality: "minor-triad",
        inversion: 0,
        midiPitches: [36, 39, 43],
      }),
      Object.freeze({
        degree: 6,
        root: 10,
        quality: "major-triad",
        inversion: 0,
        midiPitches: [34, 38, 41],
      }),
      Object.freeze({
        degree: 5,
        root: 8,
        quality: "major-triad",
        inversion: 1,
        midiPitches: [36, 39, 44],
      }),
      Object.freeze({
        degree: 4,
        root: 7,
        quality: "major-triad",
        inversion: 1,
        midiPitches: [35, 38, 43],
      }),
    ]),
  }),
  Object.freeze({
    sourceRecordId: "cyberpunk-build-001",
    profileId: "midtempo-cyberpunk",
    templateId: "degree-0654-phrygian-v1",
    tonic: 0,
    scale: "phrygian",
    slots: Object.freeze([
      Object.freeze({
        degree: 0,
        root: 0,
        quality: "minor-triad",
        inversion: 1,
        midiPitches: [39, 43, 48],
      }),
      Object.freeze({
        degree: 6,
        root: 10,
        quality: "major-triad",
        inversion: 1,
        midiPitches: [38, 41, 46],
      }),
      Object.freeze({
        degree: 5,
        root: 8,
        quality: "major-triad",
        inversion: 2,
        midiPitches: [39, 44, 48],
      }),
      Object.freeze({
        degree: 4,
        root: 7,
        quality: "minor-triad",
        inversion: 2,
        midiPitches: [38, 43, 46],
      }),
    ]),
  }),
]);
const FROZEN_SOURCE_RECORD_IDS = Object.freeze(
  FROZEN_SOURCE_BINDINGS.map((binding) => binding.sourceRecordId),
);
const QUALIFICATION_INTENTS = Object.freeze([
  Object.freeze({ energy: "low", complexity: "low" }),
  Object.freeze({ energy: "medium", complexity: "medium" }),
  Object.freeze({ energy: "high", complexity: "high" }),
]);
const QUALIFICATION_ROOT_SEEDS = Object.freeze([0, 4_294_967_295]);
const LIVE_PREFLIGHTS = new WeakSet();
const HOST_EXECUTABLE_TRUST_BOUNDARY = Object.freeze({
  prerequisite:
    "a trusted supported host starts the direct wrapper and resolves its Node and Git executables",
  evidence: "selected Node, Git, and npm files are byte-recorded after process start",
  limitation:
    "recorded byte identity establishes what ran after selection, not host executable authenticity before launch",
});
// The host-selected Node, Git, and npm executables remain a supported-runtime
// trust boundary. Child processes receive only the OS variables needed to run
// those recorded binaries; all user-data, cache, temp, and tool inputs are
// redirected into exclusive output-adjacent directories.
const HOST_ENVIRONMENT_ALLOWLIST = Object.freeze(
  process.platform === "win32"
    ? ["COMSPEC", "SYSTEMROOT", "WINDIR"]
    : ["LANG", "LC_ALL", "LC_CTYPE", "TZ"],
);
export const STAGE8_MOTIF_CANDIDATE_CAPTURE_DEPENDENCY_INSTALL_ARGUMENTS = Object.freeze([
  "ci",
  "--ignore-scripts",
  "--no-audit",
  "--no-fund",
  "--include=dev",
  "--package-lock=true",
  "--loglevel=error",
  "--no-update-notifier",
]);

function fail(message) {
  throw new Error(`Stage 8 Motif candidate capture: ${message}`);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function byteIdentity(bytes) {
  return Object.freeze({ byteLength: bytes.byteLength, sha256: sha256(bytes) });
}

function exactUtf8(bytes, label) {
  const value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (!Buffer.from(value, "utf8").equals(Buffer.from(bytes))) {
    fail(`${label} is not exact UTF-8 bytes`);
  }
  return value;
}

function exactTextIdentity(text, label) {
  if (typeof text !== "string") fail(`${label} must be text`);
  const bytes = new TextEncoder().encode(text);
  return Object.freeze({ text, bytes, ...byteIdentity(bytes) });
}

function exactSha256(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/u.test(value)) {
    fail(`${label} must be a lowercase SHA-256`);
  }
  return value;
}

function exactSha1(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/u.test(value)) {
    fail(`${label} must be a full lowercase SHA-1`);
  }
  return value;
}

function exactRecord(value, expectedKeys, label) {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    fail(`${label} must be a plain record`);
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== expectedKeys.length) fail(`${label} has an unexpected shape`);
  for (const [index, key] of expectedKeys.entries()) {
    if (keys[index] !== key) fail(`${label} has an unexpected field order`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable) {
      fail(`${label}.${key} must be an enumerable data field`);
    }
  }
  return value;
}

function normalizedEnvironmentName(name) {
  return name.toUpperCase();
}

function forbiddenCaptureEnvironmentName(name) {
  const normalized = normalizedEnvironmentName(name);
  return (
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
  );
}

function assertNeutralCaptureEnvironment() {
  if (process.execArgv.length !== 0) fail("capture must start without Node execution arguments");
  for (const [name, value] of Object.entries(process.env)) {
    if (forbiddenCaptureEnvironmentName(name) && value !== undefined && value.length > 0) {
      fail(`capture refuses environment override: ${name}`);
    }
  }
}

function neutralEnvironment() {
  const environment = Object.create(null);
  const values = new Map();
  for (const [name, value] of Object.entries(process.env)) {
    const normalized = normalizedEnvironmentName(name);
    if (!HOST_ENVIRONMENT_ALLOWLIST.includes(normalized)) continue;
    if (values.has(normalized)) fail(`capture refuses duplicate host environment input: ${name}`);
    if (value !== undefined && value.length > 0) values.set(normalized, value);
  }
  for (const name of HOST_ENVIRONMENT_ALLOWLIST) {
    const value = values.get(name);
    if (value !== undefined) environment[name] = value;
  }
  return environment;
}

function command(executable, argumentsValue, cwd, label, environment = neutralEnvironment()) {
  const result = spawnSync(executable, argumentsValue, {
    cwd,
    encoding: "buffer",
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error !== undefined) fail(`${label} could not start`);
  return Object.freeze({
    status: result.status,
    stdout: result.stdout ?? Buffer.alloc(0),
    stderr: result.stderr ?? Buffer.alloc(0),
  });
}

function successful(executable, argumentsValue, cwd, label, environment) {
  const result = command(executable, argumentsValue, cwd, label, environment);
  if (result.status !== 0) fail(`${label} was unavailable`);
  return result.stdout;
}

function trimmed(bytes, label) {
  return exactUtf8(bytes, label).trim();
}

function uniqueHostEnvironmentValue(name) {
  const matches = Object.entries(process.env).filter(
    ([candidate]) => normalizedEnvironmentName(candidate) === normalizedEnvironmentName(name),
  );
  if (matches.length > 1) fail(`capture refuses duplicate host environment input: ${name}`);
  const match = matches[0];
  return match === undefined ? undefined : match[1];
}

function resolveExecutable(commandName, cwd) {
  const pathValue = uniqueHostEnvironmentValue("PATH");
  if (pathValue === undefined || pathValue.length === 0) {
    fail(`cannot locate ${commandName} without a host PATH`);
  }
  const candidateName = process.platform === "win32" ? `${commandName}.exe` : commandName;
  const root = realpathSync(cwd);
  for (const entry of pathValue.split(delimiter)) {
    if (entry.length === 0 || !isAbsolute(entry)) {
      fail("capture requires absolute non-empty host PATH entries");
    }
    if (!existsSync(entry)) continue;
    const candidate = resolve(entry, candidateName);
    if (!existsSync(candidate)) continue;
    const executable = realpathSync(candidate);
    if (!lstatSync(executable).isFile()) continue;
    if (pathIsWithin(root, executable)) {
      fail(`capture refuses ${commandName} executable inside the capture worktree`);
    }
    return executable;
  }
  fail(`cannot locate ${commandName}`);
}

function git(context, argumentsValue, label) {
  return successful(context.executable, ["--no-pager", ...argumentsValue], context.root, label);
}

function gitResult(context, argumentsValue, label) {
  return command(context.executable, ["--no-pager", ...argumentsValue], context.root, label);
}

function discoverGitContext(cwd) {
  const executable = resolveExecutable("git", cwd);
  const root = realpathSync(
    trimmed(
      successful(executable, ["--no-pager", "rev-parse", "--show-toplevel"], cwd, "Git top level"),
      "Git top level",
    ),
  );
  if (root !== realpathSync(cwd)) fail("capture must start at the resolved Git top-level");
  return Object.freeze({
    executable,
    root,
    version: trimmed(
      successful(executable, ["--no-pager", "--version"], root, "Git version"),
      "Git version",
    ),
  });
}

function exactObjectId(bytes, label) {
  const value = exactUtf8(bytes, label);
  if (!/^[0-9a-f]{40}\n$/u.test(value)) fail(`${label} was not one full lowercase SHA-1`);
  return value.slice(0, -1);
}

function verifiedObject(context, revision, label) {
  return exactObjectId(git(context, ["rev-parse", "--verify", revision], label), label);
}

function requireNoOutput(context, argumentsValue, label) {
  const output = git(context, argumentsValue, label);
  if (output.byteLength !== 0) fail(`${label} reported disallowed repository state`);
}

function nulRecords(bytes, label) {
  if (bytes.byteLength === 0) return Object.freeze([]);
  if (bytes[bytes.byteLength - 1] !== 0) fail(`${label} was not NUL-delimited`);
  const records = [];
  let start = 0;
  for (let index = 0; index < bytes.byteLength; index += 1) {
    if (bytes[index] !== 0) continue;
    if (index === start) fail(`${label} contained an empty NUL record`);
    records.push(bytes.subarray(start, index));
    start = index + 1;
  }
  return Object.freeze(records);
}

function assertInspectableIndexFlags(context) {
  const records = nulRecords(
    git(context, ["ls-files", "-v", "-z"], "index flag inspection"),
    "index flag inspection",
  );
  for (const record of records) {
    if (record.byteLength < 3 || record[0] !== 72 || record[1] !== 32) {
      fail("index flags suppress or make tracked inspection unavailable");
    }
  }
}

function assertSparseCheckoutDisabled(context) {
  const result = gitResult(
    context,
    ["config", "--bool", "--get", "core.sparseCheckout"],
    "sparse-checkout inspection",
  );
  if (result.status === 1) {
    if (result.stdout.byteLength !== 0 || result.stderr.byteLength !== 0) {
      fail("sparse-checkout configuration was unavailable");
    }
    return;
  }
  if (result.status !== 0) fail("sparse-checkout configuration was unavailable");
  const value = exactUtf8(result.stdout, "sparse-checkout configuration");
  if (value === "false\n") return;
  if (value === "true\n") fail("sparse checkout can hide required tracked content");
  fail("sparse-checkout configuration was malformed");
}

function assertRepositoryIntegrity(context, expected) {
  const expectedCommit = exactSha1(expected.commit, "reviewed commit");
  const expectedTree = exactSha1(expected.tree, "reviewed tree");
  const observedRoot = exactUtf8(
    git(context, ["rev-parse", "--show-toplevel"], "Git top level"),
    "Git top level",
  );
  if (!observedRoot.endsWith("\n") || realpathSync(observedRoot.slice(0, -1)) !== context.root) {
    fail("Git top-level does not equal the resolved capture root");
  }
  if (
    verifiedObject(context, `${expectedCommit}^{commit}`, "reviewed commit object") !==
    expectedCommit
  ) {
    fail("reviewed commit object did not resolve exactly");
  }
  if (verifiedObject(context, `${expectedTree}^{tree}`, "reviewed tree object") !== expectedTree) {
    fail("reviewed tree object did not resolve exactly");
  }
  const head = verifiedObject(context, "HEAD^{commit}", "HEAD commit");
  const headTree = verifiedObject(context, "HEAD^{tree}", "HEAD tree");
  const reviewedTree = verifiedObject(context, `${expectedCommit}^{tree}`, "reviewed commit tree");
  if (head !== expectedCommit || headTree !== expectedTree || reviewedTree !== expectedTree) {
    fail("HEAD/tested-commit/tree do not equal the explicit reviewed tuple");
  }
  requireNoOutput(context, ["ls-files", "--unmerged", "-z"], "unmerged-index inspection");
  assertInspectableIndexFlags(context);
  assertSparseCheckoutDisabled(context);
  requireNoOutput(
    context,
    [
      "diff",
      "--cached",
      "--raw",
      "-z",
      "--no-renames",
      "--no-ext-diff",
      "--no-textconv",
      expectedCommit,
      "--",
    ],
    "commit-to-index comparison",
  );
  requireNoOutput(
    context,
    [
      "diff",
      "--raw",
      "-z",
      "--no-renames",
      "--no-ext-diff",
      "--no-textconv",
      "--ignore-submodules=none",
      "--",
    ],
    "index-to-worktree comparison",
  );
  requireNoOutput(
    context,
    ["ls-files", "--others", "--exclude-standard", "-z"],
    "non-ignored untracked-path inspection",
  );
  return Object.freeze({ commit: expectedCommit, tree: expectedTree });
}

function pathIsWithin(parent, candidate) {
  const relationship = relative(parent, candidate);
  return (
    relationship === "" ||
    (!isAbsolute(relationship) && relationship !== ".." && !relationship.startsWith(`..${sep}`))
  );
}

function protectedOutputRoots(context) {
  const output = exactUtf8(
    git(context, ["worktree", "list", "--porcelain"], "registered-worktree inspection"),
    "registered-worktree inspection",
  );
  if (!output.endsWith("\n")) fail("registered-worktree inspection was malformed");
  const roots = new Set();
  for (const line of output.slice(0, -1).split("\n")) {
    if (line.length === 0) continue;
    if (line.startsWith("worktree ")) {
      const path = line.slice("worktree ".length);
      if (path.length === 0) fail("registered-worktree inspection lacked a path");
      roots.add(realpathSync(path));
      continue;
    }
    if (
      /^HEAD [0-9a-f]{40}$/u.test(line) ||
      /^branch refs\/heads\/.+/u.test(line) ||
      line === "bare" ||
      line === "detached" ||
      line === "locked" ||
      line === "prunable" ||
      line.startsWith("locked ") ||
      line.startsWith("prunable ")
    ) {
      continue;
    }
    fail("registered-worktree inspection contained an unknown record");
  }
  if (roots.size === 0) fail("registered-worktree inspection returned no worktree");
  const commonDirectory = exactUtf8(
    git(context, ["rev-parse", "--git-common-dir"], "Git common-directory inspection"),
    "Git common-directory inspection",
  );
  if (!commonDirectory.endsWith("\n")) fail("Git common-directory inspection was malformed");
  roots.add(realpathSync(resolve(context.root, commonDirectory.slice(0, -1))));
  return Object.freeze([...roots]);
}

function externalOutputDirectory(context, value) {
  if (!isAbsolute(value)) fail("output directory must be absolute");
  const target = resolve(value);
  const parent = realpathSync(dirname(target));
  const actualTarget = resolve(parent, basename(target));
  for (const protectedRoot of protectedOutputRoots(context)) {
    if (pathIsWithin(protectedRoot, actualTarget)) {
      fail("output directory must be outside all registered worktrees and Git metadata");
    }
  }
  if (existsSync(actualTarget)) fail("output directory must not already exist");
  return actualTarget;
}

function fileEvidence(path, recordedPath) {
  return Object.freeze({ path: recordedPath, ...byteIdentity(readFileSync(path)) });
}

function expandLfToCrlf(bytes) {
  const expanded = [];
  for (const [index, byte] of bytes.entries()) {
    if (byte === 10 && (index === 0 || bytes[index - 1] !== 13)) expanded.push(13);
    expanded.push(byte);
  }
  return Buffer.from(expanded);
}

function checkoutRelationship(rawGitBlob, checkout, path) {
  const identity = byteIdentity(checkout);
  if (Buffer.from(rawGitBlob).equals(checkout)) {
    return Object.freeze({ ...identity, relationship: "raw-git-blob" });
  }
  if (expandLfToCrlf(rawGitBlob).equals(checkout)) {
    return Object.freeze({ ...identity, relationship: "lf-to-crlf" });
  }
  fail(`unexplained capture-checkout byte relationship: ${path}`);
}

function trackedInput(context, commit, path) {
  const object = `${commit}:${path}`;
  const gitBlobObjectId = trimmed(
    git(context, ["rev-parse", "--verify", object], `tracked input ${path}`),
    `tracked input ${path}`,
  );
  if (
    trimmed(
      git(context, ["cat-file", "-t", gitBlobObjectId], `tracked input ${path}`),
      `tracked input ${path}`,
    ) !== "blob"
  ) {
    fail(`tracked input is not a Git blob: ${path}`);
  }
  const rawGitBlob = git(context, ["cat-file", "blob", gitBlobObjectId], `tracked input ${path}`);
  const checkout = readFileSync(resolve(context.root, path));
  return Object.freeze({
    path,
    gitBlobObjectId,
    rawGitBlob: byteIdentity(rawGitBlob),
    captureCheckout: checkoutRelationship(rawGitBlob, checkout, path),
  });
}

function frozenSourceRecord(context, captureCommit, sourceRecordId) {
  const source = FROZEN_SOURCE_IDENTITY;
  const historicalBlobObjectId = trimmed(
    git(context, ["rev-parse", "--verify", `${source.commit}:${source.path}`], sourceRecordId),
    sourceRecordId,
  );
  if (historicalBlobObjectId !== source.gitBlobObjectId) {
    fail(`frozen source blob no longer matches: ${sourceRecordId}`);
  }
  const captureHeadBlobObjectId = trimmed(
    git(context, ["rev-parse", "--verify", `${captureCommit}:${source.path}`], sourceRecordId),
    sourceRecordId,
  );
  if (captureHeadBlobObjectId !== historicalBlobObjectId) {
    fail(`capture HEAD does not retain frozen source bytes: ${sourceRecordId}`);
  }
  const rawGitBlob = git(context, ["cat-file", "blob", historicalBlobObjectId], sourceRecordId);
  const checkout = readFileSync(resolve(context.root, source.path));
  return Object.freeze({
    sourceRecordId,
    source: Object.freeze({ ...source, rawGitBlob: byteIdentity(rawGitBlob) }),
    captureCheckout: checkoutRelationship(rawGitBlob, checkout, source.path),
  });
}

function gitConfig(context, key) {
  const result = gitResult(context, ["config", "--get", key], `Git config ${key}`);
  if (result.status === 1) return "unset";
  if (result.status !== 0) fail(`unable to read Git configuration: ${key}`);
  const value = trimmed(result.stdout, `Git config ${key}`);
  return value.length === 0 ? "unset" : value;
}

function gitAttributeValue(output, name) {
  const marker = `: ${name}: `;
  const values = output
    .split(/\r?\n/u)
    .filter((line) => line.includes(marker))
    .map((line) => line.slice(line.lastIndexOf(marker) + marker.length));
  if (values.length > 1) fail(`multiple Git attributes found: ${name}`);
  return values[0];
}

function checkoutEvidence(context, trackedInputs, frozenSourceRecords) {
  const transformed = [
    ...trackedInputs
      .filter((entry) => entry.captureCheckout.relationship === "lf-to-crlf")
      .map((entry) => entry.path),
    ...frozenSourceRecords
      .filter((entry) => entry.captureCheckout.relationship === "lf-to-crlf")
      .map((entry) => entry.source.path),
  ];
  const coreAutocrlf = gitConfig(context, "core.autocrlf");
  const coreEol = gitConfig(context, "core.eol");
  const attributes = [...new Set(transformed)].sort().map((path) => {
    const output = exactUtf8(
      git(context, ["check-attr", "--all", "--", path], `Git attributes for ${path}`),
      `Git attributes for ${path}`,
    );
    const textAttribute = gitAttributeValue(output, "text");
    const eolAttribute = gitAttributeValue(output, "eol");
    const filterAttribute = gitAttributeValue(output, "filter");
    const encodingAttribute = gitAttributeValue(output, "working-tree-encoding");
    const globalCrlf = coreAutocrlf === "true" || (coreAutocrlf !== "input" && coreEol === "crlf");
    if (
      textAttribute === "unset" ||
      eolAttribute === "lf" ||
      filterAttribute !== undefined ||
      encodingAttribute !== undefined ||
      (eolAttribute !== "crlf" && !globalCrlf)
    ) {
      fail(`no exact Git checkout explanation for LF-to-CRLF: ${path}`);
    }
    return Object.freeze({ path, output, ...byteIdentity(new TextEncoder().encode(output)) });
  });
  return Object.freeze({ coreAutocrlf, coreEol, attributes: Object.freeze(attributes) });
}

function packageLockEntry(packageLock, name, expectedVersion) {
  if (typeof packageLock !== "object" || packageLock === null || Array.isArray(packageLock)) {
    fail("package lock must be an object");
  }
  const packages = packageLock.packages;
  if (typeof packages !== "object" || packages === null || Array.isArray(packages)) {
    fail("package lock packages inventory is unavailable");
  }
  const entry = packages[`node_modules/${name}`];
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    fail(`package lock lacks ${name}`);
  }
  if (
    entry.version !== expectedVersion ||
    typeof entry.resolved !== "string" ||
    typeof entry.integrity !== "string" ||
    !entry.integrity.startsWith("sha512-")
  ) {
    fail(`package lock has an incompatible ${name} identity`);
  }
  return Object.freeze({ resolved: entry.resolved, integrity: entry.integrity });
}

/**
 * Ensures every package actually recorded in npm's installed lock is a
 * byte-for-byte equivalent entry from the committed root lock. Platform-only
 * optional packages may be absent, but an installed package cannot be extra
 * or drift from its declared lock identity.
 */
export function assertStage8MotifCandidateCaptureLockedDependencyTree(rootLock, installedLock) {
  if (
    typeof rootLock !== "object" ||
    rootLock === null ||
    Array.isArray(rootLock) ||
    typeof installedLock !== "object" ||
    installedLock === null ||
    Array.isArray(installedLock)
  ) {
    fail("dependency lock records must be plain objects");
  }
  if (rootLock.lockfileVersion !== 3 || installedLock.lockfileVersion !== 3) {
    fail("capture requires npm lockfile version 3");
  }
  const rootPackages = rootLock.packages;
  const installedPackages = installedLock.packages;
  if (
    typeof rootPackages !== "object" ||
    rootPackages === null ||
    Array.isArray(rootPackages) ||
    typeof installedPackages !== "object" ||
    installedPackages === null ||
    Array.isArray(installedPackages)
  ) {
    fail("dependency lock package inventory is unavailable");
  }
  const installedEntries = Object.entries(installedPackages);
  if (installedEntries.length === 0) fail("installed dependency lock has no packages");
  for (const [path, installedEntry] of installedEntries) {
    if (!path.startsWith("node_modules/"))
      fail(`installed dependency lock has an invalid path: ${path}`);
    const rootEntry = rootPackages[path];
    if (
      typeof rootEntry !== "object" ||
      rootEntry === null ||
      Array.isArray(rootEntry) ||
      JSON.stringify(rootEntry) !== JSON.stringify(installedEntry)
    ) {
      fail(`installed dependency lock diverges from the root lock: ${path}`);
    }
  }
  return Object.freeze({ installedPackageCount: installedEntries.length });
}

function stablePathCompare(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function dependencyManifestPath(repositoryRoot, absolutePath) {
  const path = relative(repositoryRoot, absolutePath).split(sep).join("/");
  if (!path.startsWith("node_modules/") || path.includes("../")) {
    fail("dependency manifest encountered a path outside node_modules");
  }
  return path;
}

/**
 * Captures a deterministic, byte-level inventory of the installed dependency
 * tree. Links are retained only when their resolved target remains within the
 * freshly installed dependency tree; device files and every other special
 * entry are unavailable evidence.
 */
export function buildStage8MotifCandidateCaptureDependencyManifest(repositoryRoot) {
  const resolvedRepositoryRoot = realpathSync(repositoryRoot);
  const dependencyRoot = resolve(resolvedRepositoryRoot, "node_modules");
  if (!existsSync(dependencyRoot)) fail("installed dependency directory is absent");
  const rootStatus = lstatSync(dependencyRoot);
  if (!rootStatus.isDirectory() || rootStatus.isSymbolicLink()) {
    fail("installed dependency directory must be a real directory");
  }
  const resolvedDependencyRoot = realpathSync(dependencyRoot);
  const entries = [];
  let byteLength = 0;
  let symbolicLinkCount = 0;

  function visit(directory) {
    const children = readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      stablePathCompare(left.name, right.name),
    );
    for (const child of children) {
      const absolutePath = resolve(directory, child.name);
      if (!pathIsWithin(dependencyRoot, absolutePath)) {
        fail("dependency manifest encountered an invalid child path");
      }
      const status = lstatSync(absolutePath);
      if (status.isSymbolicLink()) {
        const targetBytes = readlinkSync(absolutePath, { encoding: "buffer" });
        const target = exactUtf8(targetBytes, "dependency symbolic-link target");
        const resolvedTarget = realpathSync(absolutePath);
        if (!pathIsWithin(resolvedDependencyRoot, resolvedTarget)) {
          fail("dependency symbolic link resolves outside node_modules");
        }
        entries.push(
          Object.freeze({
            path: dependencyManifestPath(resolvedRepositoryRoot, absolutePath),
            kind: "symbolic-link",
            target,
            resolvedTarget: dependencyManifestPath(resolvedRepositoryRoot, resolvedTarget),
          }),
        );
        symbolicLinkCount += 1;
        continue;
      }
      if (status.isDirectory()) {
        visit(absolutePath);
        continue;
      }
      if (!status.isFile()) fail("dependency manifest refuses non-regular files");
      const bytes = readFileSync(absolutePath);
      const entry = Object.freeze({
        path: dependencyManifestPath(resolvedRepositoryRoot, absolutePath),
        kind: "regular-file",
        ...byteIdentity(bytes),
      });
      if (!Number.isSafeInteger(byteLength + entry.byteLength)) {
        fail("dependency manifest byte length exceeds safe integer range");
      }
      byteLength += entry.byteLength;
      entries.push(entry);
    }
  }

  visit(dependencyRoot);
  if (entries.length === 0) fail("installed dependency directory has no regular files");
  const manifest = createHash("sha256");
  for (const entry of entries) {
    manifest.update(entry.path, "utf8");
    manifest.update("\0", "utf8");
    manifest.update(entry.kind, "utf8");
    manifest.update("\0", "utf8");
    if (entry.kind === "regular-file") {
      manifest.update(String(entry.byteLength), "utf8");
      manifest.update("\0", "utf8");
      manifest.update(entry.sha256, "utf8");
    } else {
      manifest.update(entry.target, "utf8");
      manifest.update("\0", "utf8");
      manifest.update(entry.resolvedTarget, "utf8");
    }
    manifest.update("\n", "utf8");
  }
  return Object.freeze({
    root: "node_modules",
    fileCount: entries.filter((entry) => entry.kind === "regular-file").length,
    symbolicLinkCount,
    totalByteLength: byteLength,
    sha256: manifest.digest("hex"),
  });
}

function assertEqualLockedIdentity(installed, root, name) {
  if (installed.resolved !== root.resolved || installed.integrity !== root.integrity) {
    fail(`installed package lock diverges from root lock: ${name}`);
  }
}

function installedPackage(repositoryRoot, rootLock, installedLock, expected) {
  const packageDirectory = resolve(repositoryRoot, "node_modules", expected.name);
  const packageJsonPath = resolve(packageDirectory, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  if (
    typeof packageJson !== "object" ||
    packageJson === null ||
    Array.isArray(packageJson) ||
    packageJson.name !== expected.name ||
    packageJson.version !== expected.version
  ) {
    fail(`installed package does not match required identity: ${expected.name}`);
  }
  const rootLocked = packageLockEntry(rootLock, expected.name, expected.version);
  const installedLocked = packageLockEntry(installedLock, expected.name, expected.version);
  assertEqualLockedIdentity(installedLocked, rootLocked, expected.name);
  const entryPointPath = resolve(repositoryRoot, expected.entryPointPath);
  if (!existsSync(entryPointPath))
    fail(`installed package entry point is absent: ${expected.name}`);
  return Object.freeze({
    name: expected.name,
    version: expected.version,
    locked: rootLocked,
    packageJson: fileEvidence(packageJsonPath, expected.packageJsonPath),
    entryPoint: fileEvidence(entryPointPath, expected.entryPointPath),
  });
}

function arrayOfStrings(value, label) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((entry) => typeof entry !== "string")
  ) {
    fail(`${label} must be a nonempty string array`);
  }
  return value;
}

function platformBinding(repositoryRoot, rootLock, installedLock) {
  const bindingsRoot = resolve(repositoryRoot, "node_modules", "@rolldown");
  if (!existsSync(bindingsRoot)) fail("Rolldown binding package directory is absent");
  const candidates = readdirSync(bindingsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("binding-"))
    .map((entry) => {
      const directory = resolve(bindingsRoot, entry.name);
      const packageJsonPath = resolve(directory, "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
      if (typeof packageJson !== "object" || packageJson === null || Array.isArray(packageJson)) {
        fail(`Rolldown binding package is malformed: ${entry.name}`);
      }
      if (
        packageJson.name !== `@rolldown/${entry.name}` ||
        packageJson.version !== "1.2.8" ||
        typeof packageJson.main !== "string" ||
        !/^[A-Za-z0-9][A-Za-z0-9._-]*\.node$/u.test(packageJson.main)
      ) {
        fail(`Rolldown binding package has an unsupported identity: ${entry.name}`);
      }
      return {
        directory,
        packageJsonPath,
        name: packageJson.name,
        main: packageJson.main,
        os: arrayOfStrings(packageJson.os, `${packageJson.name}.os`),
        cpu: arrayOfStrings(packageJson.cpu, `${packageJson.name}.cpu`),
      };
    })
    .filter((entry) => entry.os.includes(process.platform) && entry.cpu.includes(process.arch));
  if (candidates.length !== 1)
    fail("capture requires exactly one installed Rolldown platform binding");
  const binding = candidates[0];
  if (binding === undefined) fail("missing Rolldown platform binding");
  const rootLocked = packageLockEntry(rootLock, binding.name, "1.2.8");
  const installedLocked = packageLockEntry(installedLock, binding.name, "1.2.8");
  assertEqualLockedIdentity(installedLocked, rootLocked, binding.name);
  const nativePath = resolve(binding.directory, binding.main);
  if (!existsSync(nativePath)) fail("Rolldown platform native binding is absent");
  return Object.freeze({
    name: binding.name,
    version: "1.2.8",
    platform: process.platform,
    architecture: process.arch,
    locked: rootLocked,
    packageJson: fileEvidence(binding.packageJsonPath, `node_modules/${binding.name}/package.json`),
    nativeBinary: fileEvidence(nativePath, `node_modules/${binding.name}/${binding.main}`),
  });
}

function assertAcceptedPackageManagerInputFiles(repositoryRoot) {
  const npmrcPath = resolve(repositoryRoot, ".npmrc");
  if (!existsSync(npmrcPath)) fail("capture requires the tracked .npmrc input");
  const npmrc = exactUtf8(readFileSync(npmrcPath), "tracked .npmrc input");
  if (npmrc !== "save-exact=true\n" && npmrc !== "save-exact=true\r\n") {
    fail("capture refuses an unsupported .npmrc setting");
  }
  if (existsSync(resolve(repositoryRoot, "npm-shrinkwrap.json"))) {
    fail("capture refuses package-manager override file: npm-shrinkwrap.json");
  }
}

function executionDirectoryLayout(directory) {
  const home = resolve(directory, "home");
  const appData = resolve(directory, "app-data");
  const localAppData = resolve(directory, "local-app-data");
  const temporary = resolve(directory, "temporary");
  const xdgCache = resolve(directory, "xdg-cache");
  const xdgConfig = resolve(directory, "xdg-config");
  const xdgData = resolve(directory, "xdg-data");
  for (const path of [home, appData, localAppData, temporary, xdgCache, xdgConfig, xdgData]) {
    mkdirSync(path);
  }
  return Object.freeze({ home, appData, localAppData, temporary, xdgCache, xdgConfig, xdgData });
}

function isolatedExecutionEnvironment(layout) {
  const environment = neutralEnvironment();
  environment.APPDATA = layout.appData;
  environment.HOME = layout.home;
  environment.LOCALAPPDATA = layout.localAppData;
  environment.TEMP = layout.temporary;
  environment.TMP = layout.temporary;
  environment.TMPDIR = layout.temporary;
  environment.USERPROFILE = layout.home;
  environment.XDG_CACHE_HOME = layout.xdgCache;
  environment.XDG_CONFIG_HOME = layout.xdgConfig;
  environment.XDG_DATA_HOME = layout.xdgData;
  return environment;
}

function exclusiveNpmPreparationDirectory(outputDirectory) {
  const directory = mkdtempSync(
    join(dirname(outputDirectory), ".nightdrive-stage8-motif-npm-preparation-"),
  );
  const userConfigPath = resolve(directory, "user.npmrc");
  const globalConfigPath = resolve(directory, "global.npmrc");
  const cachePath = resolve(directory, "cache");
  const logsPath = resolve(directory, "logs");
  try {
    writeFileSync(userConfigPath, Buffer.alloc(0), { flag: "wx" });
    writeFileSync(globalConfigPath, Buffer.alloc(0), { flag: "wx" });
    mkdirSync(cachePath);
    mkdirSync(logsPath);
    return Object.freeze({
      directory,
      userConfigPath,
      globalConfigPath,
      cachePath,
      logsPath,
      execution: executionDirectoryLayout(directory),
    });
  } catch (error) {
    rmSync(directory, { force: true, recursive: true });
    throw error;
  }
}

function npmPreparationEnvironment(preparation) {
  return isolatedExecutionEnvironment(preparation.execution);
}

function exclusiveWorkerScratchDirectory(outputDirectory) {
  const directory = mkdtempSync(
    join(dirname(outputDirectory), ".nightdrive-stage8-motif-worker-scratch-"),
  );
  try {
    return Object.freeze({ directory, execution: executionDirectoryLayout(directory) });
  } catch (error) {
    rmSync(directory, { force: true, recursive: true });
    throw error;
  }
}

function removeWorkerScratchDirectory(scratch) {
  rmSync(scratch.directory, { force: false, recursive: true });
}

function verifiedNpmRuntime(repositoryRoot, outputDirectory) {
  if (process.version !== "v24.21.0") {
    fail("capture requires Node v24.21.0");
  }
  assertAcceptedPackageManagerInputFiles(repositoryRoot);
  const nodeDirectory = dirname(realpathSync(process.execPath));
  const npmPackageDirectory = realpathSync(resolve(nodeDirectory, "node_modules", "npm"));
  const npmPackageJsonPath = resolve(npmPackageDirectory, "package.json");
  const npmCliPath = realpathSync(resolve(npmPackageDirectory, "bin", "npm-cli.js"));
  const npmPackageJson = JSON.parse(readFileSync(npmPackageJsonPath, "utf8"));
  if (
    typeof npmPackageJson !== "object" ||
    npmPackageJson === null ||
    Array.isArray(npmPackageJson) ||
    npmPackageJson.name !== "npm" ||
    npmPackageJson.version !== "11.19.0"
  ) {
    fail("capture requires the installed npm@11.19.0 package");
  }
  const preparation = exclusiveNpmPreparationDirectory(outputDirectory);
  let versionOutput;
  try {
    const environment = npmPreparationEnvironment(preparation);
    versionOutput = successful(
      process.execPath,
      [
        npmCliPath,
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--loglevel=error",
        "--no-update-notifier",
        `--userconfig=${preparation.userConfigPath}`,
        `--globalconfig=${preparation.globalConfigPath}`,
        `--cache=${preparation.cachePath}`,
        `--logs-dir=${preparation.logsPath}`,
        "--version",
      ],
      repositoryRoot,
      "npm version",
      environment,
    );
  } finally {
    rmSync(preparation.directory, { force: false, recursive: true });
  }
  if (versionOutput === undefined) fail("npm version did not return output");
  const npmVersion = trimmed(versionOutput, "npm version");
  if (npmVersion !== "11.19.0") fail("capture requires npm 11.19.0");
  return Object.freeze({
    cliPath: npmCliPath,
    evidence: Object.freeze({
      version: "11.19.0",
      executable: fileEvidence(npmCliPath, "npm/bin/npm-cli.js"),
      packageJson: fileEvidence(npmPackageJsonPath, "npm/package.json"),
    }),
  });
}

function installLockedDependencyTree(repositoryRoot, outputDirectory, npm) {
  assertAcceptedPackageManagerInputFiles(repositoryRoot);
  const preparation = exclusiveNpmPreparationDirectory(outputDirectory);
  const environment = npmPreparationEnvironment(preparation);
  const argumentsValue = [
    ...STAGE8_MOTIF_CANDIDATE_CAPTURE_DEPENDENCY_INSTALL_ARGUMENTS,
    `--userconfig=${preparation.userConfigPath}`,
    `--globalconfig=${preparation.globalConfigPath}`,
    `--cache=${preparation.cachePath}`,
    `--logs-dir=${preparation.logsPath}`,
  ];
  let result;
  try {
    result = command(
      process.execPath,
      [npm.cliPath, ...argumentsValue],
      repositoryRoot,
      "locked dependency install",
      environment,
    );
  } finally {
    rmSync(preparation.directory, { force: false, recursive: true });
  }
  if (result === undefined) fail("locked dependency install did not return a result");
  if (result.status !== 0) fail("locked dependency install did not exit successfully");
  return Object.freeze({
    role: "required execution input",
    scope: "ignored node_modules in the capture repository root",
    operation: "fresh locked npm ci before worker execution",
    postPreparationCustody:
      "tracked integrity rechecked; installed lock, packages, platform binding, and byte manifest recorded in runtime",
    executable: realpathSync(process.execPath),
    arguments: Object.freeze([
      ...STAGE8_MOTIF_CANDIDATE_CAPTURE_DEPENDENCY_INSTALL_ARGUMENTS,
      "--userconfig=<exclusive-empty-config>",
      "--globalconfig=<exclusive-empty-config>",
      "--cache=<exclusive-empty-cache>",
      "--logs-dir=<exclusive-empty-logs>",
    ]),
    workingDirectory: "repository-root",
    exitCode: result.status,
    stdout: byteIdentity(result.stdout),
    stderr: byteIdentity(result.stderr),
  });
}

function actualRuntime(repositoryRoot, gitContext, outputDirectory) {
  const npm = verifiedNpmRuntime(repositoryRoot, outputDirectory);
  assertAcceptedPackageManagerInputFiles(repositoryRoot);
  const rootLock = JSON.parse(readFileSync(resolve(repositoryRoot, "package-lock.json"), "utf8"));
  const installedLockPath = resolve(repositoryRoot, "node_modules", ".package-lock.json");
  const installedLock = JSON.parse(readFileSync(installedLockPath, "utf8"));
  const dependencyTree = assertStage8MotifCandidateCaptureLockedDependencyTree(
    rootLock,
    installedLock,
  );
  return Object.freeze({
    platform: process.platform,
    architecture: process.arch,
    hostExecutableTrustBoundary: HOST_EXECUTABLE_TRUST_BOUNDARY,
    node: Object.freeze({
      version: "v24.21.0",
      executable: fileEvidence(process.execPath, basename(realpathSync(process.execPath))),
    }),
    npm: npm.evidence,
    git: Object.freeze({
      version: gitContext.version,
      executable: fileEvidence(gitContext.executable, basename(gitContext.executable)),
    }),
    declaredPackageManager: "npm@11.19.0",
    lockedInstalledPackageCount: dependencyTree.installedPackageCount,
    installedPackageLock: fileEvidence(installedLockPath, "node_modules/.package-lock.json"),
    installedTreeManifest: buildStage8MotifCandidateCaptureDependencyManifest(repositoryRoot),
    installedPackages: Object.freeze(
      REQUIRED_INSTALLED_PACKAGES.map((expected) =>
        installedPackage(repositoryRoot, rootLock, installedLock, expected),
      ),
    ),
    platformBinding: platformBinding(repositoryRoot, rootLock, installedLock),
  });
}

function equalJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function buildDetails(context, expected, outputDirectory) {
  const state = assertRepositoryIntegrity(context, expected);
  const trackedInputs = STAGE8_MOTIF_CANDIDATE_CAPTURE_TRACKED_INPUT_PATHS.map((path) =>
    trackedInput(context, state.commit, path),
  );
  const frozenSourceRecords = FROZEN_SOURCE_RECORD_IDS.map((sourceRecordId) =>
    frozenSourceRecord(context, state.commit, sourceRecordId),
  );
  return Object.freeze({
    capturedAtUtc: new Date().toISOString(),
    repository: Object.freeze({
      expectedCommit: expected.commit,
      expectedTree: expected.tree,
      commit: state.commit,
      tree: state.tree,
      cleanBeforeCapture: true,
    }),
    frozenSourceRecords: Object.freeze(frozenSourceRecords),
    checkout: checkoutEvidence(context, trackedInputs, frozenSourceRecords),
    runtime: actualRuntime(context.root, context, outputDirectory),
    trackedInputs: Object.freeze(trackedInputs),
  });
}

/**
 * Establishes the complete clean, exact, runtime-verified custody state before
 * any Vitest/Vite configuration or worker source is loaded.
 */
function preflightStage8MotifCandidateCapture({
  cwd,
  outputDirectory,
  reviewedCommit,
  reviewedTree,
}) {
  assertNeutralCaptureEnvironment();
  const context = discoverGitContext(realpathSync(cwd));
  const expected = Object.freeze({
    commit: exactSha1(reviewedCommit, "reviewed commit"),
    tree: exactSha1(reviewedTree, "reviewed tree"),
  });
  const output = externalOutputDirectory(context, outputDirectory);
  assertRepositoryIntegrity(context, expected);
  let workerScratch;
  try {
    workerScratch = exclusiveWorkerScratchDirectory(output);
    const npm = verifiedNpmRuntime(context.root, output);
    const dependencyPreparation = installLockedDependencyTree(context.root, output, npm);
    assertRepositoryIntegrity(context, expected);
    const details = buildDetails(context, expected, output);
    const preflight = Object.freeze({
      context,
      expected,
      output,
      workerScratch,
      dependencyPreparation,
      details,
    });
    LIVE_PREFLIGHTS.add(preflight);
    return preflight;
  } catch (error) {
    if (workerScratch !== undefined) removeWorkerScratchDirectory(workerScratch);
    throw error;
  }
}

/**
 * Repeats every repository/source/tool/runtime custody observation after the
 * read-only worker or after publication. A mismatch is unavailable evidence.
 */
function assertStage8MotifCandidateCaptureInputsUnchanged(preflight) {
  if (!LIVE_PREFLIGHTS.has(preflight))
    fail("capture preflight was not created by this custody boundary");
  const refreshed = buildDetails(preflight.context, preflight.expected, preflight.output);
  const original = preflight.details;
  if (
    !equalJson(refreshed.repository, original.repository) ||
    !equalJson(refreshed.frozenSourceRecords, original.frozenSourceRecords) ||
    !equalJson(refreshed.checkout, original.checkout) ||
    !equalJson(refreshed.runtime, original.runtime) ||
    !equalJson(refreshed.trackedInputs, original.trackedInputs)
  ) {
    fail("capture inputs changed after preflight");
  }
  return preflight;
}

function candidateIntent(value, label) {
  const intent = exactRecord(value, ["energy", "complexity"], label);
  if (
    !["low", "medium", "high"].includes(intent.energy) ||
    !["low", "medium", "high"].includes(intent.complexity)
  ) {
    fail(`${label} has an unsupported intent`);
  }
  return intent;
}

function canonicalEmbeddedJson(text, label) {
  if (typeof text !== "string" || text.includes("\r") || text.includes("\n")) {
    fail(`${label} must be one canonical JSON line`);
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    fail(`${label} is not JSON`);
  }
  if (JSON.stringify(value) !== text) fail(`${label} is not canonical JSON`);
  return value;
}

function assertFrozenMidiPitches(value, expected, label) {
  if (!Array.isArray(value) || value.length !== expected.length) {
    fail(`${label} has an incompatible frozen triad`);
  }
  for (const [index, pitch] of value.entries()) {
    if (pitch !== expected[index]) fail(`${label} has an incompatible frozen triad`);
  }
}

function assertCandidateRawHarmony(value, expected, label) {
  const harmony = exactRecord(
    value,
    ["profile", "templateId", "templateVersion", "key", "slots"],
    label,
  );
  if (
    harmony.profile !== expected.profileId ||
    harmony.templateId !== expected.templateId ||
    harmony.templateVersion !== "v1" ||
    !Array.isArray(harmony.slots) ||
    harmony.slots.length !== expected.slots.length
  ) {
    fail(`${label} has an incompatible frozen raw Harmony context`);
  }
  const key = exactRecord(harmony.key, ["tonic", "scale"], `${label}.key`);
  if (key.tonic !== expected.tonic || key.scale !== expected.scale) {
    fail(`${label} has an incompatible frozen raw Harmony key`);
  }
  for (const [index, slot] of harmony.slots.entries()) {
    const expectedSlot = expected.slots[index];
    if (expectedSlot === undefined) fail(`${label} has an incompatible frozen raw Harmony slot`);
    const parsedSlot = exactRecord(
      slot,
      ["index", "degree", "bars", "chord", "inversion", "voicing", "adjacentCost", "rationale"],
      `${label}.slots[${index}]`,
    );
    const chord = exactRecord(
      parsedSlot.chord,
      ["root", "quality"],
      `${label}.slots[${index}].chord`,
    );
    const voicing = exactRecord(
      parsedSlot.voicing,
      ["midiPitches"],
      `${label}.slots[${index}].voicing`,
    );
    const rationale = exactRecord(
      parsedSlot.rationale,
      ["preferenceRank", "tieBreak"],
      `${label}.slots[${index}].rationale`,
    );
    if (
      parsedSlot.index !== index ||
      parsedSlot.degree !== expectedSlot.degree ||
      parsedSlot.bars !== 2 ||
      chord.root !== expectedSlot.root ||
      chord.quality !== expectedSlot.quality ||
      parsedSlot.inversion !== expectedSlot.inversion ||
      parsedSlot.adjacentCost !== null ||
      rationale.preferenceRank !== 0 ||
      rationale.tieBreak !== "Stage 8 qualification snapshot"
    ) {
      fail(`${label} has an incompatible frozen raw Harmony slot`);
    }
    assertFrozenMidiPitches(
      voicing.midiPitches,
      expectedSlot.midiPitches,
      `${label}.slots[${index}].voicing`,
    );
  }
}

function assertCandidateProvenanceHarmony(value, expected, label) {
  const harmony = exactRecord(
    value,
    ["profile", "templateId", "templateVersion", "key", "slots"],
    label,
  );
  if (
    harmony.profile !== expected.profileId ||
    harmony.templateId !== expected.templateId ||
    harmony.templateVersion !== "v1" ||
    !Array.isArray(harmony.slots) ||
    harmony.slots.length !== expected.slots.length
  ) {
    fail(`${label} has an incompatible frozen provenance Harmony context`);
  }
  const key = exactRecord(harmony.key, ["schema", "tonicSemitoneClass", "scale"], `${label}.key`);
  if (
    key.schema !== "nightdrive.key.v1" ||
    key.tonicSemitoneClass !== expected.tonic ||
    key.scale !== expected.scale
  ) {
    fail(`${label} has an incompatible frozen provenance Harmony key`);
  }
  for (const [index, slot] of harmony.slots.entries()) {
    const expectedSlot = expected.slots[index];
    if (expectedSlot === undefined)
      fail(`${label} has an incompatible frozen provenance Harmony slot`);
    const parsedSlot = exactRecord(
      slot,
      ["index", "degree", "bars", "chord", "inversion", "voicing"],
      `${label}.slots[${index}]`,
    );
    const chord = exactRecord(
      parsedSlot.chord,
      ["schema", "rootSemitoneClass", "quality"],
      `${label}.slots[${index}].chord`,
    );
    const inversion = exactRecord(
      parsedSlot.inversion,
      ["schema", "memberIndex"],
      `${label}.slots[${index}].inversion`,
    );
    const voicing = exactRecord(
      parsedSlot.voicing,
      ["schema", "midiPitches"],
      `${label}.slots[${index}].voicing`,
    );
    if (
      parsedSlot.index !== index ||
      parsedSlot.degree !== expectedSlot.degree ||
      parsedSlot.bars !== 2 ||
      chord.schema !== "nightdrive.chord.v1" ||
      chord.rootSemitoneClass !== expectedSlot.root ||
      chord.quality !== expectedSlot.quality ||
      inversion.schema !== "nightdrive.chord-inversion.v1" ||
      inversion.memberIndex !== expectedSlot.inversion ||
      voicing.schema !== "nightdrive.chord-voicing.v1"
    ) {
      fail(`${label} has an incompatible frozen provenance Harmony slot`);
    }
    assertFrozenMidiPitches(
      voicing.midiPitches,
      expectedSlot.midiPitches,
      `${label}.slots[${index}].voicing`,
    );
  }
}

function assertCandidateRequest(value, expected, label) {
  const request = exactRecord(
    value,
    ["schema", "generatorVersion", "profile", "policyVersion", "harmony", "intent", "rootSeed"],
    label,
  );
  if (
    request.schema !== "nightdrive.motif-generation-request.v1" ||
    request.generatorVersion !== "nightdrive.generator.motif.v1" ||
    request.policyVersion !== "nightdrive.motif-policy.v1" ||
    request.rootSeed !== expected.rootSeed
  ) {
    fail(`${label} has an incompatible request identity`);
  }
  const profile = exactRecord(request.profile, ["id", "version"], `${label}.profile`);
  if (
    profile.id !== expected.profileId ||
    profile.version !== "nightdrive.genre-profile.motif.v1"
  ) {
    fail(`${label} has an incompatible request profile`);
  }
  const intent = candidateIntent(request.intent, `${label}.intent`);
  if (
    intent.energy !== expected.intent.energy ||
    intent.complexity !== expected.intent.complexity
  ) {
    fail(`${label} has an incompatible request intent`);
  }
  assertCandidateRawHarmony(request.harmony, expected, `${label}.harmony`);
}

function assertCandidateResult(value, expected, label) {
  const result = exactRecord(
    value,
    ["schema", "generatorVersion", "plan", "events", "provenance"],
    label,
  );
  if (
    result.schema !== "nightdrive.motif-generation-result.v1" ||
    result.generatorVersion !== "nightdrive.generator.motif.v1" ||
    !Array.isArray(result.events) ||
    result.events.length === 0
  ) {
    fail(`${label} has an incompatible result identity`);
  }
  const plan = exactRecord(
    result.plan,
    [
      "policyVersion",
      "profileVersion",
      "rhythmTemplate",
      "registerBand",
      "tensionMode",
      "phrase4Displacement",
      "contourOffsets",
      "phraseRoles",
    ],
    `${label}.plan`,
  );
  if (
    plan.policyVersion !== "nightdrive.motif-policy.v1" ||
    plan.profileVersion !== "nightdrive.genre-profile.motif.v1" ||
    !Array.isArray(plan.contourOffsets) ||
    !Array.isArray(plan.phraseRoles)
  ) {
    fail(`${label} has an incompatible result plan`);
  }
  for (const [index, event] of result.events.entries()) {
    exactRecord(event, ["pitch", "startTick", "durationTicks"], `${label}.events[${index}]`);
  }
  const provenance = exactRecord(
    result.provenance,
    [
      "profile",
      "policy",
      "contour",
      "rhythm",
      "seedDerivation",
      "prng",
      "weightedChoice",
      "rootSeed",
      "componentSeed",
      "normalizedInputs",
      "harmony",
      "parent",
    ],
    `${label}.provenance`,
  );
  if (provenance.rootSeed !== expected.rootSeed || provenance.parent !== null) {
    fail(`${label} has an incompatible result provenance`);
  }
  const profile = exactRecord(provenance.profile, ["id", "version"], `${label}.provenance.profile`);
  if (
    profile.id !== expected.profileId ||
    profile.version !== "nightdrive.genre-profile.motif.v1"
  ) {
    fail(`${label} has an incompatible result profile`);
  }
  const normalizedInputs = exactRecord(
    provenance.normalizedInputs,
    ["intent"],
    `${label}.provenance.normalizedInputs`,
  );
  const intent = candidateIntent(
    normalizedInputs.intent,
    `${label}.provenance.normalizedInputs.intent`,
  );
  if (
    intent.energy !== expected.intent.energy ||
    intent.complexity !== expected.intent.complexity
  ) {
    fail(`${label} has an incompatible result intent`);
  }
  assertCandidateProvenanceHarmony(provenance.harmony, expected, `${label}.provenance.harmony`);
}

function parseCandidateArtifact(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    fail("worker candidate text is not JSON");
  }
  const artifact = exactRecord(
    value,
    ["schema", "status", "generatedBy", "sourceBindings", "matrix", "vectors"],
    "worker candidate",
  );
  if (
    artifact.schema !== CANDIDATE_ARTIFACT_SCHEMA ||
    artifact.status !== CANDIDATE_STATUS ||
    artifact.generatedBy !== "src/evaluation/stage8-motif-candidate-vectors.ts" ||
    !Array.isArray(artifact.sourceBindings) ||
    !Array.isArray(artifact.vectors)
  ) {
    fail("worker candidate does not have the required Stage 8 identity");
  }
  if (
    artifact.sourceBindings.length !== FROZEN_SOURCE_BINDINGS.length ||
    artifact.vectors.length !==
      FROZEN_SOURCE_BINDINGS.length * QUALIFICATION_INTENTS.length * QUALIFICATION_ROOT_SEEDS.length
  ) {
    fail("worker candidate has an incomplete qualification matrix");
  }
  for (const [index, expected] of FROZEN_SOURCE_BINDINGS.entries()) {
    const binding = exactRecord(
      artifact.sourceBindings[index],
      ["sourceRecordId", "source"],
      `worker candidate.sourceBindings[${index}]`,
    );
    if (binding.sourceRecordId !== expected.sourceRecordId) {
      fail("worker candidate source binding order changed");
    }
    const source = exactRecord(
      binding.source,
      ["commit", "path", "gitBlobObjectId"],
      `worker candidate.sourceBindings[${index}].source`,
    );
    if (
      source.commit !== FROZEN_SOURCE_IDENTITY.commit ||
      source.path !== FROZEN_SOURCE_IDENTITY.path ||
      source.gitBlobObjectId !== FROZEN_SOURCE_IDENTITY.gitBlobObjectId
    ) {
      fail("worker candidate source binding identity changed");
    }
  }
  const matrix = exactRecord(
    artifact.matrix,
    ["vectorCount", "sourceRecordIds", "intentPairs", "rootSeeds"],
    "worker candidate.matrix",
  );
  if (
    matrix.vectorCount !== artifact.vectors.length ||
    !Array.isArray(matrix.sourceRecordIds) ||
    !Array.isArray(matrix.intentPairs) ||
    !Array.isArray(matrix.rootSeeds) ||
    JSON.stringify(matrix.sourceRecordIds) !== JSON.stringify(FROZEN_SOURCE_RECORD_IDS) ||
    JSON.stringify(matrix.intentPairs) !== JSON.stringify(QUALIFICATION_INTENTS) ||
    JSON.stringify(matrix.rootSeeds) !== JSON.stringify(QUALIFICATION_ROOT_SEEDS)
  ) {
    fail("worker candidate matrix declaration changed");
  }
  let vectorIndex = 0;
  for (const source of FROZEN_SOURCE_BINDINGS) {
    for (const intent of QUALIFICATION_INTENTS) {
      for (const rootSeed of QUALIFICATION_ROOT_SEEDS) {
        const vector = exactRecord(
          artifact.vectors[vectorIndex],
          [
            "vectorId",
            "status",
            "sourceRecordId",
            "profileId",
            "rootSeed",
            "intent",
            "requestJson",
            "resultJson",
            "byteLengths",
            "sha256",
          ],
          `worker candidate.vectors[${vectorIndex}]`,
        );
        const expected = Object.freeze({ ...source, intent, rootSeed });
        const expectedVectorId = `${source.sourceRecordId}-${intent.energy}-${intent.complexity}-${rootSeed.toString(16).padStart(8, "0")}`;
        if (
          vector.vectorId !== expectedVectorId ||
          vector.status !== CANDIDATE_STATUS ||
          vector.sourceRecordId !== source.sourceRecordId ||
          vector.profileId !== source.profileId ||
          vector.rootSeed !== rootSeed
        ) {
          fail("worker candidate vector identity changed");
        }
        const vectorIntent = candidateIntent(
          vector.intent,
          `worker candidate.vectors[${vectorIndex}].intent`,
        );
        if (
          vectorIntent.energy !== intent.energy ||
          vectorIntent.complexity !== intent.complexity
        ) {
          fail("worker candidate vector intent changed");
        }
        const request = canonicalEmbeddedJson(
          vector.requestJson,
          `worker candidate.vectors[${vectorIndex}].requestJson`,
        );
        const result = canonicalEmbeddedJson(
          vector.resultJson,
          `worker candidate.vectors[${vectorIndex}].resultJson`,
        );
        assertCandidateRequest(
          request,
          expected,
          `worker candidate.vectors[${vectorIndex}].request`,
        );
        assertCandidateResult(result, expected, `worker candidate.vectors[${vectorIndex}].result`);
        const byteLengths = exactRecord(
          vector.byteLengths,
          ["request", "result"],
          `worker candidate.vectors[${vectorIndex}].byteLengths`,
        );
        const digests = exactRecord(
          vector.sha256,
          ["request", "result"],
          `worker candidate.vectors[${vectorIndex}].sha256`,
        );
        const requestIdentity = exactTextIdentity(vector.requestJson, "worker candidate request");
        const resultIdentity = exactTextIdentity(vector.resultJson, "worker candidate result");
        if (
          byteLengths.request !== requestIdentity.byteLength ||
          byteLengths.result !== resultIdentity.byteLength ||
          exactSha256(digests.request, "worker candidate request sha256") !==
            requestIdentity.sha256 ||
          exactSha256(digests.result, "worker candidate result sha256") !== resultIdentity.sha256
        ) {
          fail("worker candidate vector byte identity changed");
        }
        vectorIndex += 1;
      }
    }
  }
  if (`${JSON.stringify(artifact, null, 2)}\n` !== text) {
    fail("worker candidate text is not the required canonical artifact serialization");
  }
  return artifact;
}

/**
 * Parses one canonical marker emitted by the fixed read-only worker. The
 * worker’s candidate bytes are independently retained and validated here
 * before any output directory is created.
 */
export function parseStage8MotifCandidateCaptureWorkerOutput(stdout) {
  const text = exactUtf8(stdout, "capture worker stdout");
  const lines = text
    .split(/\r?\n/u)
    .filter((line) => line.startsWith(STAGE8_MOTIF_CANDIDATE_CAPTURE_WORKER_MARKER));
  if (lines.length !== 1) fail("capture worker must emit exactly one structured payload");
  const line = lines[0];
  const encoded = line.slice(STAGE8_MOTIF_CANDIDATE_CAPTURE_WORKER_MARKER.length);
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(encoded)) {
    fail("capture worker payload is not canonical base64");
  }
  const payloadBytes = Buffer.from(encoded, "base64");
  if (payloadBytes.toString("base64") !== encoded)
    fail("capture worker payload changed during decode");
  let payload;
  try {
    payload = JSON.parse(exactUtf8(payloadBytes, "capture worker payload"));
  } catch {
    fail("capture worker payload is not JSON");
  }
  const record = exactRecord(payload, ["text", "byteLength", "sha256"], "capture worker payload");
  const candidate = exactTextIdentity(record.text, "capture worker candidate");
  if (
    !Number.isSafeInteger(record.byteLength) ||
    record.byteLength !== candidate.byteLength ||
    exactSha256(record.sha256, "capture worker candidate sha256") !== candidate.sha256
  ) {
    fail("capture worker candidate bytes do not match their retained identity");
  }
  parseCandidateArtifact(candidate.text);
  return Object.freeze({
    text: candidate.text,
    byteLength: candidate.byteLength,
    sha256: candidate.sha256,
  });
}

function executionEvidence(exitCode, stdout, stderr) {
  if (!Number.isSafeInteger(exitCode) || exitCode !== 0) {
    fail("fixed Vitest supervisor did not supply a successful exit code");
  }
  const standardOutput = exactTextIdentity(
    exactUtf8(stdout, "supervisor stdout"),
    "supervisor stdout",
  );
  const standardError = exactTextIdentity(
    exactUtf8(stderr, "supervisor stderr"),
    "supervisor stderr",
  );
  return Object.freeze({
    exitCode,
    stdout: Object.freeze({
      text: standardOutput.text,
      byteLength: standardOutput.byteLength,
      sha256: standardOutput.sha256,
    }),
    stderr: Object.freeze({
      text: standardError.text,
      byteLength: standardError.byteLength,
      sha256: standardError.sha256,
    }),
  });
}

function captureInvocation(preflight) {
  return Object.freeze({
    captureProcess: Object.freeze({
      executable: realpathSync(process.execPath),
      arguments: Object.freeze([...process.argv.slice(1)]),
      workingDirectory: preflight.context.root,
    }),
    supervisor: Object.freeze({
      executable: realpathSync(process.execPath),
      arguments: Object.freeze([...STAGE8_MOTIF_CANDIDATE_CAPTURE_SUPERVISOR_ARGUMENTS]),
    }),
    outputDirectory: preflight.output,
    outputRole: "new-external-candidate-artifact-directory",
  });
}

function receiptText(preflight, candidate, execution) {
  const receipt = Object.freeze({
    schema: STAGE8_MOTIF_CANDIDATE_CAPTURE_RECEIPT_SCHEMA,
    status: CANDIDATE_STATUS,
    capturedAtUtc: preflight.details.capturedAtUtc,
    invocation: captureInvocation(preflight),
    execution,
    executionSandbox: Object.freeze({
      workerTemporaryState: "exclusive output-parent scratch directory",
      cleanupBeforeArtifactPublication: true,
      cleanup: "required before the capture command returns",
    }),
    repository: preflight.details.repository,
    frozenSourceRecords: preflight.details.frozenSourceRecords,
    checkout: preflight.details.checkout,
    runtime: preflight.details.runtime,
    dependencyPreparation: preflight.dependencyPreparation,
    trackedInputs: preflight.details.trackedInputs,
    candidateArtifact: Object.freeze({
      path: STAGE8_MOTIF_CANDIDATE_ARTIFACT_FILENAME,
      byteLength: candidate.byteLength,
      sha256: candidate.sha256,
    }),
  });
  return Object.freeze({
    receipt,
    ...exactTextIdentity(`${JSON.stringify(receipt, null, 2)}\n`, "receipt"),
  });
}

function fixedWorkerEnvironment(preflight) {
  if (!LIVE_PREFLIGHTS.has(preflight)) {
    fail("capture preflight was not created by this custody boundary");
  }
  const environment = isolatedExecutionEnvironment(preflight.workerScratch.execution);
  environment.STAGE8_MOTIF_CANDIDATE_CAPTURE_WORKER = "1";
  return environment;
}

function runFixedWorker(preflight) {
  const result = spawnSync(process.execPath, STAGE8_MOTIF_CANDIDATE_CAPTURE_SUPERVISOR_ARGUMENTS, {
    cwd: preflight.context.root,
    encoding: "buffer",
    env: fixedWorkerEnvironment(preflight),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error !== undefined) fail("fixed Vitest supervisor could not start");
  const stdout = result.stdout ?? Buffer.alloc(0);
  const stderr = result.stderr ?? Buffer.alloc(0);
  if (result.status !== 0) fail("fixed Vitest supervisor did not exit successfully");
  return Object.freeze({ exitCode: result.status, stdout, stderr });
}

async function writeAndVerify(path, bytes, label) {
  await writeFile(path, bytes, { flag: "wx" });
  const persisted = await readFile(path);
  if (!Buffer.from(persisted).equals(Buffer.from(bytes))) {
    fail(`${label} bytes changed after write`);
  }
  return Object.freeze(byteIdentity(persisted));
}

/**
 * Materializes a complete candidate/receipt pair inside an exclusively created
 * destination. Its incomplete marker remains until both raw byte identities
 * and final custody checks have passed, so no failed invocation can leave a
 * usable-looking final artifact.
 */
async function materializeExclusiveStage8MotifCandidateCapture({
  preflight,
  supervisorExitCode,
  supervisorStdout,
  supervisorStderr,
  worker,
}) {
  if (!LIVE_PREFLIGHTS.has(preflight))
    fail("capture preflight was not created by this custody boundary");
  assertStage8MotifCandidateCaptureInputsUnchanged(preflight);
  const candidate = Object.freeze({
    text: worker.text,
    ...byteIdentity(new TextEncoder().encode(worker.text)),
  });
  if (
    candidate.byteLength !== worker.byteLength ||
    candidate.sha256 !== worker.sha256 ||
    candidate.text !== worker.text
  ) {
    fail("worker candidate changed before materialization");
  }
  parseCandidateArtifact(candidate.text);
  const execution = executionEvidence(supervisorExitCode, supervisorStdout, supervisorStderr);
  const receipt = receiptText(preflight, candidate, execution);
  const destination = externalOutputDirectory(preflight.context, preflight.output);
  const incompleteMarker = resolve(destination, ".stage8-motif-candidate-capture-incomplete");
  const staging = resolve(destination, ".stage8-motif-candidate-staging");
  let destinationCreated = false;
  try {
    // `mkdir` is the exclusive final-path claim: it cannot replace a directory
    // that appeared after the earlier absence observation. The marker remains
    // until the complete pair and final custody recheck have succeeded.
    await mkdir(destination);
    destinationCreated = true;
    await writeFile(incompleteMarker, Buffer.alloc(0), { flag: "wx" });
    await mkdir(staging);
    const stagedCandidate = await writeAndVerify(
      resolve(staging, STAGE8_MOTIF_CANDIDATE_ARTIFACT_FILENAME),
      candidate.bytes,
      "candidate artifact",
    );
    const stagedReceipt = await writeAndVerify(
      resolve(staging, STAGE8_MOTIF_CANDIDATE_CAPTURE_RECEIPT_FILENAME),
      receipt.bytes,
      "capture receipt",
    );
    if (
      stagedCandidate.byteLength !== candidate.byteLength ||
      stagedCandidate.sha256 !== candidate.sha256 ||
      stagedReceipt.byteLength !== receipt.byteLength ||
      stagedReceipt.sha256 !== receipt.sha256
    ) {
      fail("staged capture bytes do not retain their expected identities");
    }
    assertStage8MotifCandidateCaptureInputsUnchanged(preflight);
    await rename(
      resolve(staging, STAGE8_MOTIF_CANDIDATE_ARTIFACT_FILENAME),
      resolve(destination, STAGE8_MOTIF_CANDIDATE_ARTIFACT_FILENAME),
    );
    await rename(
      resolve(staging, STAGE8_MOTIF_CANDIDATE_CAPTURE_RECEIPT_FILENAME),
      resolve(destination, STAGE8_MOTIF_CANDIDATE_CAPTURE_RECEIPT_FILENAME),
    );
    await rm(staging, { force: false, recursive: false });
    const publishedCandidate = await readFile(
      resolve(destination, STAGE8_MOTIF_CANDIDATE_ARTIFACT_FILENAME),
    );
    const publishedReceipt = await readFile(
      resolve(destination, STAGE8_MOTIF_CANDIDATE_CAPTURE_RECEIPT_FILENAME),
    );
    if (
      !Buffer.from(publishedCandidate).equals(Buffer.from(candidate.bytes)) ||
      !Buffer.from(publishedReceipt).equals(Buffer.from(receipt.bytes))
    ) {
      fail("published capture bytes changed after staging rename");
    }
    assertStage8MotifCandidateCaptureInputsUnchanged(preflight);
    await rm(incompleteMarker, { force: false });
    return Object.freeze({
      outputDirectory: destination,
      candidateArtifact: Object.freeze({
        path: STAGE8_MOTIF_CANDIDATE_ARTIFACT_FILENAME,
        byteLength: candidate.byteLength,
        sha256: candidate.sha256,
      }),
      receipt: Object.freeze({
        path: STAGE8_MOTIF_CANDIDATE_CAPTURE_RECEIPT_FILENAME,
        byteLength: receipt.byteLength,
        sha256: receipt.sha256,
      }),
    });
  } catch (error) {
    if (destinationCreated) {
      try {
        await rm(destination, { force: false, recursive: true });
      } catch {
        fail("failed capture output could not be removed");
      }
    }
    throw error;
  }
}

/**
 * Runs the only capture-capable route: preflight first, fixed read-only Vitest
 * derivation second, then exclusive paired artifact publication. Callers can
 * never supply candidate bytes, supervisor output, or a fabricated preflight.
 */
export async function runStage8MotifCandidateCapture({
  cwd,
  outputDirectory,
  reviewedCommit,
  reviewedTree,
}) {
  const preflight = preflightStage8MotifCandidateCapture({
    cwd,
    outputDirectory,
    reviewedCommit,
    reviewedTree,
  });
  let workerScratchRemoved = false;
  try {
    const supervisor = runFixedWorker(preflight);
    const worker = parseStage8MotifCandidateCaptureWorkerOutput(supervisor.stdout);
    assertStage8MotifCandidateCaptureInputsUnchanged(preflight);
    removeWorkerScratchDirectory(preflight.workerScratch);
    workerScratchRemoved = true;
    const materialized = await materializeExclusiveStage8MotifCandidateCapture({
      preflight,
      supervisorExitCode: supervisor.exitCode,
      supervisorStdout: supervisor.stdout,
      supervisorStderr: supervisor.stderr,
      worker,
    });
    return Object.freeze({
      outputDirectory: materialized.outputDirectory,
      candidateArtifact: materialized.candidateArtifact,
      receipt: materialized.receipt,
      repository: preflight.details.repository,
    });
  } finally {
    LIVE_PREFLIGHTS.delete(preflight);
    if (!workerScratchRemoved) removeWorkerScratchDirectory(preflight.workerScratch);
  }
}
