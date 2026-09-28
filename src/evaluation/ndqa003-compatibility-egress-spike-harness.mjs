/**
 * Temporary, manual-only ND-QA-003 compatibility/egress spike harness.
 *
 * This file is evaluation tooling. It is intentionally executable by the
 * pinned Node runtime without TypeScript transpilation or node_modules. It
 * never writes to the checkout, emits no raw npm/Git/configuration output,
 * and retains only the sanitized receipt described by the accepted harness
 * specification.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

export const NDQA003_SPIKE_RECEIPT_SCHEMA =
  "nightdrive.ndqa003-compatibility-egress-spike-receipt.v1";
export const NDQA003_SPIKE_RECEIPT_FILENAME = "receipt.json";
export const NDQA003_SPIKE_CONFIRMATION = "RUN_NDQA003_COMPATIBILITY_EGRESS_SPIKE";
export const NDQA003_SPIKE_POLICY = "nightdrive.supply-chain.ndqa003.v1";
export const NDQA003_SPIKE_NODE_VERSION = "v24.21.0";
export const NDQA003_SPIKE_NPM_VERSION = "11.19.0";
export const NDQA003_SPIKE_REGISTRY = "https://registry.npmjs.org/";
export const NDQA003_SPIKE_AUDIT_ARGUMENTS = Object.freeze([
  "audit",
  "--json",
  "--audit-level=high",
]);
export const NDQA003_SPIKE_SBOM_ARGUMENTS = Object.freeze([
  "sbom",
  "--package-lock-only",
  "--sbom-format=spdx",
]);
export const NDQA003_SPIKE_ISOLATED_CHILD_ARGUMENT = "--ndqa003-isolated-child-v1";

const EMPTY_SHA256 = createHash("sha256").update(Buffer.alloc(0)).digest("hex");
const TERMINAL_RANK = Object.freeze({
  PASS: 0,
  "NOT VERIFIED": 1,
  BLOCKED: 2,
  FAIL: 3,
});
const SAFE_GITHUB_JOB = /^[A-Za-z0-9_.-]+$/u;
const SAFE_HEX = /^[0-9a-f]{40}$/u;
const SAFE_NUMERIC = /^[1-9][0-9]*$/u;
const SAFE_NAMESPACE = /^net:\[[0-9]+\]$/u;
const SAFE_SHA256 = /^[0-9a-f]{64}$/u;
const SAFE_NPM_VERSION = /^[0-9]+\.[0-9]+\.[0-9]+$/u;
const SAFE_NODE_VERSION = /^v[0-9]+\.[0-9]+\.[0-9]+$/u;
const SAFE_RUNNER_IMAGE = /^[A-Za-z0-9._ -]{1,128}$/u;
const NETWORK_ERROR_CODES = new Set([
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETDOWN",
  "ENETUNREACH",
  "ENOTFOUND",
  "ETIMEDOUT",
]);
const ALLOWED_FAILURE_PHASES = new Set([
  "checkout",
  "cleanup",
  "configuration",
  "confirmation",
  "github-identity",
  "harness",
  "isolated-child",
  "isolated-cleanup",
  "isolated-suite",
  "negative-audit",
  "network-namespace",
  "platform-identity",
  "positive-audit",
  "sbom",
  "sbom-determinism",
  "toolchain",
  "NETWORK-NAMESPACE",
  "RECEIPT",
  "WORKFLOW-BOOTSTRAP",
]);
const ALLOWED_FAILURE_CODES = new Set([
  "CHECKOUT_CUSTODY_FAILED",
  "CONFIGURATION_PROOF_FAILED",
  "CONFIRMATION_REJECTED",
  "GITHUB_IDENTITY_UNAVAILABLE",
  "ISOLATED_CHILD_UNAVAILABLE",
  "ISOLATED_RESULT_INCONSISTENT",
  "ISOLATED_RESULT_INVALID",
  "ISOLATED_RESULT_UNREADABLE",
  "ISOLATED_SUITE_UNAVAILABLE",
  "LINUX_X64_IDENTITY_UNAVAILABLE",
  "LOCKFILE_GRAPH_UNAVAILABLE",
  "NAMESPACE_PARENT_UNAVAILABLE",
  "NAMESPACE_PROOF_UNAVAILABLE",
  "NEGATIVE_AUDIT_NOT_CLASSIFIED",
  "PINNED_TOOLCHAIN_MISMATCH",
  "POSITIVE_AUDIT_FAILED",
  "RAW_CLEANUP_FAILED",
  "RECEIPT_INPUT_INVALID",
  "SBOM_PROOF_FAILED",
  "SBOM_RAW_DETERMINISM_NOT_VERIFIED",
  "UNEXPECTED_HARNESS_FAILURE",
  "UNEXPECTED_ISOLATED_FAILURE",
  "RUNNER_UNAVAILABLE",
]);
const SAFE_SPDX_LEXICAL = /^[A-Za-z0-9.+:()\\s-]+$/u;
const CONFIGURATION_BOOLEAN_KEYS = Object.freeze([
  "credentialBearingInputAbsent",
  "effectiveRegistryMatches",
  "httpsProxyAbsent",
  "jobConfigEmpty",
  "noScopeReducingArguments",
  "offlineFalse",
  "omitEmpty",
  "packageLockTrue",
  "preferOfflineFalse",
  "productionFalse",
  "projectConfigTracked",
  "proxyAbsent",
  "readable",
  "workspaceAbsent",
  "workspacesFalse",
]);
const LICENSE_CATEGORIES = Object.freeze([
  "ambiguous",
  "declared",
  "empty",
  "malformed",
  "missing",
  "noAssertion",
  "unknown",
  "unmappable",
]);
const AUDIT_EXIT_CLASSES = new Set([
  "COMPLETE_NO_THRESHOLD_FINDING",
  "COMPLETE_THRESHOLD_FINDING",
  "MALFORMED",
  "UNCLASSIFIED",
  "UNCLASSIFIED_EXIT",
]);

function object(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : undefined;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function utcNow() {
  return new Date().toISOString();
}

function relativeChild(parent, child) {
  const value = relative(resolve(parent), resolve(child));
  return value !== "" && value !== ".." && !value.startsWith(`..${sep}`) && !isAbsolute(value);
}

function pathOutsideCheckout(checkout, candidate) {
  return (
    resolve(checkout) !== resolve(candidate) &&
    !relativeChild(checkout, candidate) &&
    !relativeChild(candidate, checkout)
  );
}

function safeBasename(value) {
  return typeof value === "string" && value.length > 0 && value === value.replace(/[\\\\/]/gu, "")
    ? value
    : undefined;
}

function commandResult(executable, argumentsValue, options) {
  const result = spawnSync(executable, argumentsValue, {
    cwd: options.cwd,
    env: options.env,
    encoding: "buffer",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  return Object.freeze({
    available: result.error === undefined,
    exitCode: typeof result.status === "number" ? result.status : null,
    stdout: Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.alloc(0),
    stderr: Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.alloc(0),
  });
}

function commandText(executable, argumentsValue, options) {
  const result = commandResult(executable, argumentsValue, options);
  if (!result.available || result.exitCode !== 0) return undefined;
  return result.stdout.toString("utf8").trim();
}

function commandToPrivateFiles(executable, argumentsValue, options) {
  const stdout = openSync(options.stdoutPath, "wx", 0o600);
  const stderr = openSync(options.stderrPath, "wx", 0o600);
  try {
    const result = spawnSync(executable, argumentsValue, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", stdout, stderr],
      windowsHide: true,
    });
    return Object.freeze({
      available: result.error === undefined,
      exitCode: typeof result.status === "number" ? result.status : null,
    });
  } finally {
    closeSync(stdout);
    closeSync(stderr);
  }
}

function gitBytes(root, argumentsValue) {
  const result = commandResult("git", argumentsValue, { cwd: root });
  return result.available && result.exitCode === 0 ? result.stdout : undefined;
}

function gitText(root, argumentsValue) {
  const value = gitBytes(root, argumentsValue);
  return value === undefined ? undefined : value.toString("utf8").trim();
}

function nulRecords(bytes) {
  if (bytes.length === 0) return [];
  if (bytes[bytes.length - 1] !== 0) return undefined;
  const records = [];
  let start = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] === 0) {
      records.push(bytes.subarray(start, index));
      start = index + 1;
    }
  }
  return records;
}

function terminal(current, next) {
  return TERMINAL_RANK[next] > TERMINAL_RANK[current] ? next : current;
}

function failure(outcome, phase, code, status = "FAIL") {
  outcome.status = terminal(outcome.status, status);
  outcome.failures.push(Object.freeze({ phase, code }));
}

function validTerminalStatus(value) {
  return typeof value === "string" && Object.hasOwn(TERMINAL_RANK, value);
}

function projectFailures(value) {
  if (!Array.isArray(value) || value.length > 64) return undefined;
  const failures = [];
  for (const candidate of value) {
    const item = object(candidate);
    if (
      !item ||
      typeof item.phase !== "string" ||
      !ALLOWED_FAILURE_PHASES.has(item.phase) ||
      typeof item.code !== "string" ||
      !ALLOWED_FAILURE_CODES.has(item.code)
    )
      return undefined;
    failures.push(Object.freeze({ phase: item.phase, code: item.code }));
  }
  return Object.freeze(failures);
}

function assertRegularTrackedFile(root, relativePath, commit) {
  const absolutePath = resolve(root, relativePath);
  if (!relativeChild(root, absolutePath) || !existsSync(absolutePath)) return undefined;
  const stat = lstatSync(absolutePath);
  if (!stat.isFile()) return undefined;
  const tracked = gitBytes(root, ["show", `${commit}:${relativePath}`]);
  if (tracked === undefined) return undefined;
  const actual = readFileSync(absolutePath);
  if (!actual.equals(tracked)) return undefined;
  return Object.freeze({ byteLength: actual.byteLength, sha256: sha256(actual) });
}

function projectNpmrcIsCredentialFree(bytes) {
  let text;
  try {
    text = bytes.toString("utf8");
  } catch {
    return false;
  }
  if (text.includes("\0")) return false;
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#") || line.startsWith(";")) continue;
    const delimiter = line.indexOf("=");
    if (delimiter < 1) return false;
    const key = line.slice(0, delimiter).trim().toLowerCase();
    const value = line.slice(delimiter + 1);
    if (value.includes("${")) return false;
    if (key !== "save-exact") return false;
  }
  return true;
}

function inspectIndexFlags(root) {
  const bytes = gitBytes(root, ["ls-files", "-v", "-z"]);
  const records = bytes === undefined ? undefined : nulRecords(bytes);
  if (records === undefined) return undefined;
  for (const record of records) {
    if (record.length < 3 || record[1] !== 32 || record[0] !== 72) return false;
  }
  return true;
}

function inspectRepository(root, expectedCommit) {
  const result = {
    ok: false,
    commit: undefined,
    tree: undefined,
    packageLock: undefined,
    projectNpmrc: undefined,
  };
  const checkout = resolve(root);
  const observedRoot = gitText(checkout, ["rev-parse", "--show-toplevel"]);
  const prefix = gitText(checkout, ["rev-parse", "--show-prefix"]);
  const observedHead = gitText(checkout, ["rev-parse", "--verify", "HEAD"]);
  const resolvedCommit = SAFE_HEX.test(expectedCommit)
    ? gitText(checkout, ["rev-parse", "--verify", `${expectedCommit}^{commit}`])
    : undefined;
  const tree = gitText(checkout, ["rev-parse", "--verify", "HEAD^{tree}"]);
  const cached = commandResult(
    "git",
    ["diff", "--cached", "--quiet", "--no-ext-diff", "--no-textconv", expectedCommit, "--"],
    { cwd: checkout },
  );
  const worktree = commandResult(
    "git",
    ["diff", "--quiet", "--no-ext-diff", "--no-textconv", "--ignore-submodules=none", "--"],
    { cwd: checkout },
  );
  const unmerged = gitBytes(checkout, ["ls-files", "--unmerged", "-z"]);
  const untracked = gitBytes(checkout, ["ls-files", "--others", "-z"]);
  const sparse = commandResult("git", ["config", "--bool", "--get", "core.sparseCheckout"], {
    cwd: checkout,
  });
  const nodeModulesAbsent = !existsSync(join(checkout, "node_modules"));
  const flagsOk = inspectIndexFlags(checkout);
  const unmergedRecords = unmerged === undefined ? undefined : nulRecords(unmerged);
  const untrackedRecords = untracked === undefined ? undefined : nulRecords(untracked);
  const sparseOk =
    sparse.available &&
    (sparse.exitCode === 1 ||
      (sparse.exitCode === 0 && sparse.stdout.toString("utf8").trim() !== "true"));

  if (
    observedRoot === checkout &&
    prefix === "" &&
    observedHead === expectedCommit &&
    resolvedCommit === expectedCommit &&
    typeof tree === "string" &&
    SAFE_HEX.test(tree) &&
    cached.available &&
    cached.exitCode === 0 &&
    worktree.available &&
    worktree.exitCode === 0 &&
    Array.isArray(unmergedRecords) &&
    unmergedRecords.length === 0 &&
    Array.isArray(untrackedRecords) &&
    untrackedRecords.length === 0 &&
    flagsOk === true &&
    sparseOk &&
    nodeModulesAbsent
  ) {
    const packageLock = assertRegularTrackedFile(checkout, "package-lock.json", expectedCommit);
    const projectNpmrc = assertRegularTrackedFile(checkout, ".npmrc", expectedCommit);
    const packageJson = assertRegularTrackedFile(checkout, "package.json", expectedCommit);
    if (
      packageLock &&
      projectNpmrc &&
      packageJson &&
      projectNpmrcIsCredentialFree(readFileSync(join(checkout, ".npmrc")))
    ) {
      result.ok = true;
      result.commit = expectedCommit;
      result.tree = tree;
      result.packageLock = packageLock;
      result.projectNpmrc = projectNpmrc;
    }
  }
  return Object.freeze(result);
}

function assertDirectoryEmpty(directory) {
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    return true;
  }
  const entries = readdirSync(directory);
  if (entries.length !== 0) return false;
  return true;
}

function resetDirectory(directory) {
  if (existsSync(directory)) rmSync(directory, { force: true, recursive: true });
  mkdirSync(directory, { recursive: true, mode: 0o700 });
}

function createLayout(checkout, requestedDirectory, temporaryRoot) {
  const root = resolve(checkout);
  const requested = typeof requestedDirectory === "string" ? requestedDirectory : "";
  const temporary = typeof temporaryRoot === "string" ? temporaryRoot : "";
  if (requested.length === 0 || !isAbsolute(temporary) || !existsSync(temporary))
    throw new Error("missing output directory");
  if (!lstatSync(temporary).isDirectory()) throw new Error("invalid temporary root");
  const output = resolve(requested);
  if (!relativeChild(temporary, output) || !pathOutsideCheckout(root, output) || existsSync(output))
    throw new Error("invalid output directory");
  mkdirSync(output, { mode: 0o700 });
  const paths = Object.freeze({
    temporaryRoot: resolve(temporary),
    output,
    receipt: join(output, NDQA003_SPIKE_RECEIPT_FILENAME),
    raw: join(output, "raw"),
    cache: join(output, "cache"),
    logs: join(output, "logs"),
    home: join(output, "home"),
    xdgConfig: join(output, "xdg-config"),
    configuration: join(output, "configuration"),
    fixtures: join(output, "fixtures"),
    control: join(output, "control"),
  });
  for (const directory of [
    paths.raw,
    paths.cache,
    paths.logs,
    paths.home,
    paths.xdgConfig,
    paths.configuration,
    paths.fixtures,
    paths.control,
  ])
    mkdirSync(directory, { mode: 0o700 });
  return paths;
}

function createControlledNpmFiles(paths) {
  resetDirectory(paths.configuration);
  mkdirSync(paths.raw, { recursive: true, mode: 0o700 });
  const userConfig = join(paths.configuration, "user.npmrc");
  const globalConfig = join(paths.configuration, "global.npmrc");
  writeFileSync(userConfig, Buffer.alloc(0), { flag: "wx", mode: 0o600 });
  writeFileSync(globalConfig, Buffer.alloc(0), { flag: "wx", mode: 0o600 });
  return Object.freeze({ userConfig, globalConfig, emptySha256: EMPTY_SHA256 });
}

export function buildSterileNpmEnvironment(
  paths,
  controlledFiles,
  nodeExecutable = process.execPath,
) {
  const nodeDirectory = dirname(nodeExecutable);
  return Object.freeze({
    HOME: paths.home,
    NPM_CONFIG_CACHE: paths.cache,
    NPM_CONFIG_GLOBALCONFIG: controlledFiles.globalConfig,
    NPM_CONFIG_LOGS_DIR: paths.logs,
    NPM_CONFIG_USERCONFIG: controlledFiles.userConfig,
    PATH: `${nodeDirectory}:/usr/local/bin:/usr/bin:/bin`,
    XDG_CONFIG_HOME: paths.xdgConfig,
  });
}

export function buildAuditInvocation() {
  return Object.freeze({
    executable: "npm",
    arguments: Object.freeze([...NDQA003_SPIKE_AUDIT_ARGUMENTS]),
  });
}

export function buildSbomInvocation() {
  return Object.freeze({
    executable: "npm",
    arguments: Object.freeze([...NDQA003_SPIKE_SBOM_ARGUMENTS]),
  });
}

export function buildNamespaceInvocation(scriptPath, controlPath) {
  return Object.freeze({
    executable: "sudo",
    arguments: Object.freeze([
      "-n",
      "unshare",
      "--net",
      "--fork",
      "--mount-proc",
      process.execPath,
      scriptPath,
      NDQA003_SPIKE_ISOLATED_CHILD_ARGUMENT,
      controlPath,
    ]),
  });
}

function rawConfigValue(bytes) {
  const text = bytes.toString("utf8").trim();
  return text.includes("\n") || text.includes("\r") || text.includes("\0") ? undefined : text;
}

function absentNpmValue(value) {
  return value === "" || value === "null" || value === "undefined" || value === "false";
}

function falseNpmValue(value) {
  return absentNpmValue(value) || value === "[]";
}

export function summarizeNpmConfiguration(values) {
  const registry = values.registry;
  const proxy = values.proxy;
  const httpsProxy = values["https-proxy"];
  const omit = values.omit;
  const production = values.production;
  const offline = values.offline;
  const preferOffline = values["prefer-offline"];
  const packageLock = values["package-lock"];
  const workspace = values.workspace;
  const workspaces = values.workspaces;
  const allStrings = [
    registry,
    proxy,
    httpsProxy,
    omit,
    production,
    offline,
    preferOffline,
    packageLock,
    workspace,
    workspaces,
  ].every((value) => typeof value === "string");
  const summary = Object.freeze({
    credentialBearingInputAbsent: true,
    effectiveRegistryMatches: registry === NDQA003_SPIKE_REGISTRY,
    effectiveRegistry: registry === NDQA003_SPIKE_REGISTRY ? NDQA003_SPIKE_REGISTRY : "UNVERIFIED",
    httpsProxyAbsent: typeof httpsProxy === "string" && absentNpmValue(httpsProxy),
    jobConfigEmpty: true,
    noScopeReducingArguments: true,
    offlineFalse: typeof offline === "string" && falseNpmValue(offline),
    omitEmpty: typeof omit === "string" && falseNpmValue(omit),
    packageLockTrue: packageLock === "true",
    preferOfflineFalse: typeof preferOffline === "string" && falseNpmValue(preferOffline),
    productionFalse: typeof production === "string" && falseNpmValue(production),
    projectConfigTracked: true,
    proxyAbsent: typeof proxy === "string" && absentNpmValue(proxy),
    readable: allStrings,
    workspaceAbsent: typeof workspace === "string" && absentNpmValue(workspace),
    workspacesFalse: typeof workspaces === "string" && falseNpmValue(workspaces),
  });
  return Object.freeze({
    ok:
      summary.readable &&
      summary.effectiveRegistryMatches &&
      summary.proxyAbsent &&
      summary.httpsProxyAbsent &&
      summary.omitEmpty &&
      summary.productionFalse &&
      summary.offlineFalse &&
      summary.preferOfflineFalse &&
      summary.packageLockTrue &&
      summary.workspaceAbsent &&
      summary.workspacesFalse,
    summary,
  });
}

function probeNpmConfiguration(root, paths, controlledFiles, environment, phase, expectedCommit) {
  const values = {};
  const keys = [
    "registry",
    "proxy",
    "https-proxy",
    "omit",
    "production",
    "offline",
    "prefer-offline",
    "package-lock",
    "workspace",
    "workspaces",
  ];
  for (const key of keys) {
    const before = inspectRepository(root, expectedCommit);
    if (!before.ok || !prepareFreshNpmState(paths))
      return Object.freeze({ ok: false, summary: undefined });
    const name = safeBasename(`${phase}-config-${key}`);
    if (!name) return Object.freeze({ ok: false, summary: undefined });
    const result = commandToPrivateFiles("npm", ["config", "get", key], {
      cwd: root,
      env: environment,
      stderrPath: join(paths.raw, `${name}.stderr`),
      stdoutPath: join(paths.raw, `${name}.stdout`),
    });
    if (!result.available || result.exitCode !== 0)
      return Object.freeze({ ok: false, summary: undefined });
    const value = rawConfigValue(readFileSync(join(paths.raw, `${name}.stdout`)));
    if (value === undefined) return Object.freeze({ ok: false, summary: undefined });
    values[key] = value;
    const after = inspectRepository(root, expectedCommit);
    if (!after.ok) return Object.freeze({ ok: false, summary: undefined });
  }
  const summarized = summarizeNpmConfiguration(values);
  const filesEmpty =
    sha256(readFileSync(controlledFiles.userConfig)) === EMPTY_SHA256 &&
    sha256(readFileSync(controlledFiles.globalConfig)) === EMPTY_SHA256;
  return Object.freeze({
    ok: summarized.ok && filesEmpty,
    summary: Object.freeze({
      ...summarized.summary,
      credentialBearingInputAbsent: summarized.summary.credentialBearingInputAbsent === true,
      jobConfigEmpty: filesEmpty,
    }),
  });
}

function severityCounts(value) {
  const record = object(value);
  const keys = ["info", "low", "moderate", "high", "critical", "total"];
  if (!record) return undefined;
  const result = {};
  for (const key of keys) {
    const count = record[key];
    if (!Number.isInteger(count) || count < 0) return undefined;
    result[key] = count;
  }
  return Object.freeze(result);
}

export function summarizeAuditResult(raw, exitCode, fullGraphEstablished) {
  const rawBytes = Buffer.from(raw);
  const baseline = {
    complete: false,
    exitClass: "UNCLASSIFIED",
    rawByteLength: rawBytes.byteLength,
    rawSha256: sha256(rawBytes),
    reportVersion: null,
    severityCounts: null,
    fullGraphEstablished: fullGraphEstablished === true,
  };
  if (!Number.isInteger(exitCode)) return Object.freeze(baseline);
  let parsed;
  try {
    parsed = JSON.parse(rawBytes.toString("utf8"));
  } catch {
    return Object.freeze({ ...baseline, exitClass: "MALFORMED" });
  }
  const report = object(parsed);
  const metadata = report && object(report.metadata);
  const counts = metadata && severityCounts(metadata.vulnerabilities);
  if (!report || !Number.isInteger(report.auditReportVersion) || !counts)
    return Object.freeze({ ...baseline, exitClass: "MALFORMED" });
  const thresholdPresent = counts.high + counts.critical > 0;
  const expectedExit = thresholdPresent ? exitCode !== 0 : exitCode === 0;
  if (!expectedExit)
    return Object.freeze({
      ...baseline,
      exitClass: "UNCLASSIFIED_EXIT",
      reportVersion: report.auditReportVersion,
      severityCounts: counts,
    });
  return Object.freeze({
    complete: fullGraphEstablished === true,
    exitClass: thresholdPresent ? "COMPLETE_THRESHOLD_FINDING" : "COMPLETE_NO_THRESHOLD_FINDING",
    rawByteLength: rawBytes.byteLength,
    rawSha256: sha256(rawBytes),
    reportVersion: report.auditReportVersion,
    severityCounts: counts,
    fullGraphEstablished: fullGraphEstablished === true,
  });
}

export function summarizeNegativeAuditResult(raw, exitCode) {
  const rawBytes = Buffer.from(raw);
  const baseline = {
    classified: false,
    exitClass: "UNCLASSIFIED",
    rawByteLength: rawBytes.byteLength,
    rawSha256: sha256(rawBytes),
  };
  if (!Number.isInteger(exitCode) || exitCode === 0) return Object.freeze(baseline);
  let parsed;
  try {
    parsed = JSON.parse(rawBytes.toString("utf8"));
  } catch {
    return Object.freeze({ ...baseline, exitClass: "MALFORMED" });
  }
  const report = object(parsed);
  const error = report && object(report.error);
  const code = error?.code;
  if (typeof code !== "string" || !NETWORK_ERROR_CODES.has(code))
    return Object.freeze({ ...baseline, exitClass: "UNCLASSIFIED_ERROR" });
  return Object.freeze({
    ...baseline,
    classified: true,
    exitClass: "EXPECTED_NETWORK_UNAVAILABLE",
  });
}

function packageNameFromLocation(location, entry) {
  if (typeof entry.name === "string" && entry.name.length > 0) return entry.name;
  const marker = "node_modules/";
  const index = location.lastIndexOf(marker);
  if (index < 0) return undefined;
  const remainder = location.slice(index + marker.length);
  if (remainder.startsWith("@")) {
    const split = remainder.split("/");
    return split.length >= 2 ? `${split[0]}/${split[1]}` : undefined;
  }
  return remainder.split("/")[0];
}

export function describeLockfileGraph(lockfile) {
  const parsed = object(lockfile);
  const packages = parsed && object(parsed.packages);
  if (!packages) return undefined;
  const expected = new Map();
  const categories = { development: 0, optional: 0, peer: 0, production: 0 };
  let rootKey;
  let expectedCount = 0;
  for (const [location, candidate] of Object.entries(packages)) {
    const entry = object(candidate);
    if (!entry || typeof entry.version !== "string") return undefined;
    const name = location === "" ? entry.name : packageNameFromLocation(location, entry);
    if (typeof name !== "string" || name.length === 0) return undefined;
    const key = `${name}@${entry.version}`;
    if (location === "") rootKey = key;
    expected.set(key, (expected.get(key) ?? 0) + 1);
    expectedCount += 1;
    if (location !== "") {
      if (entry.dev === true) categories.development += 1;
      else categories.production += 1;
      if (entry.optional === true || entry.devOptional === true) categories.optional += 1;
      if (entry.peer === true) categories.peer += 1;
    }
  }
  if (!rootKey) return undefined;
  return Object.freeze({
    expected,
    expectedCount,
    rootKey,
    categories: Object.freeze(categories),
  });
}

function classifyLicense(value, present) {
  if (!present) return "missing";
  if (typeof value !== "string") return "malformed";
  const trimmed = value.trim();
  if (trimmed === "") return "empty";
  if (trimmed.toUpperCase() === "NOASSERTION") return "noAssertion";
  if (/^(UNKNOWN|UNLICENSED|NONE)$/iu.test(trimmed)) return "unknown";
  if (/^(SEE LICEN[CS]E IN|https?:|file:)/iu.test(trimmed)) return "unmappable";
  if (!SAFE_SPDX_LEXICAL.test(trimmed)) return "malformed";
  if (/[\\/,]/u.test(trimmed)) return "ambiguous";
  return "declared";
}

function licenseCounts(packages) {
  const counts = {
    ambiguous: 0,
    declared: 0,
    empty: 0,
    malformed: 0,
    missing: 0,
    noAssertion: 0,
    unknown: 0,
    unmappable: 0,
  };
  for (const candidate of packages) {
    const entry = object(candidate);
    if (!entry) return undefined;
    const category = classifyLicense(
      entry.licenseDeclared,
      Object.hasOwn(entry, "licenseDeclared"),
    );
    counts[category] += 1;
  }
  return Object.freeze(counts);
}

function collectSpdxPackageKeys(packages) {
  const keys = new Map();
  const references = new Set();
  const licensesByReference = new Map();
  for (const candidate of packages) {
    const entry = object(candidate);
    if (!entry || typeof entry.name !== "string" || typeof entry.versionInfo !== "string")
      return undefined;
    if (typeof entry.SPDXID !== "string" || entry.SPDXID.length === 0) return undefined;
    const key = `${entry.name}@${entry.versionInfo}`;
    keys.set(key, (keys.get(key) ?? 0) + 1);
    references.add(entry.SPDXID);
    licensesByReference.set(
      entry.SPDXID,
      Object.freeze({
        key,
        category: classifyLicense(entry.licenseDeclared, Object.hasOwn(entry, "licenseDeclared")),
      }),
    );
  }
  return Object.freeze({ keys, licensesByReference, references });
}

export function summarizeSpdxSbom(raw, graph) {
  const rawBytes = Buffer.from(raw);
  const baseline = {
    completeGraph: false,
    declaredLicenseCounts: null,
    rawByteLength: rawBytes.byteLength,
    rawSha256: sha256(rawBytes),
    schemaValid: false,
    schemaVersion: "UNVERIFIED",
    coverage: null,
  };
  let parsed;
  try {
    parsed = JSON.parse(rawBytes.toString("utf8"));
  } catch {
    return Object.freeze(baseline);
  }
  const document = object(parsed);
  const packages = document && Array.isArray(document.packages) ? document.packages : undefined;
  const relationships =
    document && Array.isArray(document.relationships) ? document.relationships : undefined;
  if (
    !document ||
    typeof document.spdxVersion !== "string" ||
    !document.spdxVersion.startsWith("SPDX-") ||
    typeof document.documentNamespace !== "string" ||
    document.documentNamespace.length === 0 ||
    !object(document.creationInfo) ||
    !packages ||
    !relationships
  )
    return Object.freeze(baseline);
  const collected = collectSpdxPackageKeys(packages);
  const licenses = licenseCounts(packages);
  if (!collected || !licenses) return Object.freeze(baseline);
  const missing = [...graph.expected].reduce(
    (total, [key, count]) => total + Math.max(0, count - (collected.keys.get(key) ?? 0)),
    0,
  );
  const unexpected = [...collected.keys].reduce(
    (total, [key, count]) => total + Math.max(0, count - (graph.expected.get(key) ?? 0)),
    0,
  );
  const rootPresent = (collected.keys.get(graph.rootKey) ?? 0) > 0;
  const relatedReferences = new Set();
  for (const candidate of relationships) {
    const relationship = object(candidate);
    if (
      !relationship ||
      typeof relationship.spdxElementId !== "string" ||
      typeof relationship.relatedSpdxElement !== "string" ||
      typeof relationship.relationshipType !== "string"
    )
      return Object.freeze(baseline);
    relatedReferences.add(relationship.spdxElementId);
    relatedReferences.add(relationship.relatedSpdxElement);
  }
  const documentDescribes =
    document && Array.isArray(document.documentDescribes) ? document.documentDescribes : undefined;
  if (!documentDescribes || documentDescribes.some((reference) => typeof reference !== "string"))
    return Object.freeze(baseline);
  for (const reference of documentDescribes) relatedReferences.add(reference);
  const allPackagesRelated = [...collected.references].every((reference) =>
    relatedReferences.has(reference),
  );
  const rootCategories = documentDescribes
    .map((reference) => collected.licensesByReference.get(reference))
    .filter((candidate) => candidate && candidate.key === graph.rootKey)
    .map((candidate) => candidate.category);
  const rootLicenseCategory = rootCategories.length === 1 ? rootCategories[0] : undefined;
  const completeGraph =
    missing === 0 &&
    unexpected === 0 &&
    rootPresent &&
    relationships.length > 0 &&
    allPackagesRelated;
  return Object.freeze({
    completeGraph,
    declaredLicenseCounts: licenses,
    rawByteLength: rawBytes.byteLength,
    rawSha256: sha256(rawBytes),
    rootLicenseCategory,
    schemaValid: true,
    schemaVersion: document.spdxVersion,
    coverage: Object.freeze({
      actualEntries: packages.length,
      expectedEntries: graph.expectedCount,
      missingEntries: missing,
      optionalEntries: graph.categories.optional,
      peerEntries: graph.categories.peer,
      productionEntries: graph.categories.production,
      developmentEntries: graph.categories.development,
      relationshipsPresent: relationships.length > 0 && allPackagesRelated,
      rootPresent,
      unexpectedEntries: unexpected,
    }),
  });
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = object(value);
  if (record) {
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}

function copyWithoutVolatileFields(value, path = []) {
  if (Array.isArray(value)) return value.map((entry) => copyWithoutVolatileFields(entry, path));
  const record = object(value);
  if (!record) return value;
  const copy = {};
  for (const [key, nested] of Object.entries(record)) {
    if (path.length === 0 && key === "documentNamespace") continue;
    if (path.length === 1 && path[0] === "creationInfo" && key === "created") continue;
    copy[key] = copyWithoutVolatileFields(nested, [...path, key]);
  }
  return copy;
}

export function compareSbomRawAndSemantic(firstRaw, secondRaw) {
  const first = Buffer.from(firstRaw);
  const second = Buffer.from(secondRaw);
  const rawEqual = first.equals(second);
  let semanticComparable = false;
  let semanticEqual = false;
  try {
    const left = JSON.parse(first.toString("utf8"));
    const right = JSON.parse(second.toString("utf8"));
    semanticComparable = true;
    semanticEqual =
      canonicalJson(copyWithoutVolatileFields(left)) ===
      canonicalJson(copyWithoutVolatileFields(right));
  } catch {
    semanticComparable = false;
  }
  return Object.freeze({
    determinism: rawEqual ? "PASS" : "NOT VERIFIED",
    rawEqual,
    semanticComparable,
    semanticEqual,
  });
}

export function assertNamespaceEvidence(value) {
  const record = object(value);
  if (
    record?.distinct !== true ||
    record.loopbackOnly !== true ||
    record.noIpv4DefaultRoute !== true ||
    record.noIpv6DefaultRoute !== true
  )
    return false;
  return true;
}

function observeNetworkNamespace(parentNamespace) {
  const current = commandText("readlink", ["/proc/self/ns/net"], { cwd: process.cwd() });
  const linkOutput = commandText("ip", ["-o", "link", "show"], { cwd: process.cwd() });
  const ipv4Default = commandText("ip", ["-4", "route", "show", "default"], { cwd: process.cwd() });
  const ipv6Default = commandText("ip", ["-6", "route", "show", "default"], { cwd: process.cwd() });
  if (
    typeof current !== "string" ||
    typeof linkOutput !== "string" ||
    typeof ipv4Default !== "string" ||
    typeof ipv6Default !== "string"
  )
    return undefined;
  const interfaces = linkOutput
    .split(/\r?\n/u)
    .filter((line) => line.length > 0)
    .map((line) => {
      const match = /^\\d+:\\s+([^:@]+)(?:@[^:]+)?:/u.exec(line);
      return match ? match[1] : undefined;
    });
  if (interfaces.some((name) => name === undefined)) return undefined;
  return Object.freeze({
    distinct: current !== parentNamespace,
    loopbackOnly: interfaces.length === 1 && interfaces[0] === "lo",
    noIpv4DefaultRoute: ipv4Default === "",
    noIpv6DefaultRoute: ipv6Default === "",
  });
}

function childNamespaceSetup(parentNamespace) {
  const loopback = commandResult("ip", ["link", "set", "lo", "up"], { cwd: process.cwd() });
  if (!loopback.available || loopback.exitCode !== 0) return undefined;
  const evidence = observeNetworkNamespace(parentNamespace);
  return evidence && assertNamespaceEvidence(evidence) ? evidence : undefined;
}

function prepareFreshNpmState(paths) {
  resetDirectory(paths.cache);
  resetDirectory(paths.logs);
  resetDirectory(paths.home);
  resetDirectory(paths.xdgConfig);
  mkdirSync(paths.raw, { recursive: true, mode: 0o700 });
  return (
    assertDirectoryEmpty(paths.cache) &&
    assertDirectoryEmpty(paths.logs) &&
    assertDirectoryEmpty(paths.home) &&
    assertDirectoryEmpty(paths.xdgConfig)
  );
}

function executeNpm(root, paths, environment, name, argumentsValue) {
  if (!safeBasename(name)) return undefined;
  const result = commandToPrivateFiles("npm", argumentsValue, {
    cwd: root,
    env: environment,
    stderrPath: join(paths.raw, `${name}.stderr`),
    stdoutPath: join(paths.raw, `${name}.stdout`),
  });
  if (!result.available) return undefined;
  return Object.freeze({
    exitCode: result.exitCode,
    stderrPath: join(paths.raw, `${name}.stderr`),
    stdoutPath: join(paths.raw, `${name}.stdout`),
  });
}

function observeNpmVersion(root, paths, expectedCommit) {
  const controlledFiles = createControlledNpmFiles(paths);
  const environment = buildSterileNpmEnvironment(paths, controlledFiles);
  if (!prepareFreshNpmState(paths) || !inspectRepository(root, expectedCommit).ok)
    return Object.freeze({ observed: "UNVERIFIED", verified: false });
  const command = executeNpm(root, paths, environment, "toolchain-version", ["--version"]);
  if (!command || !inspectRepository(root, expectedCommit).ok)
    return Object.freeze({ observed: "UNVERIFIED", verified: false });
  const value = rawConfigValue(readFileSync(command.stdoutPath));
  return Object.freeze({
    observed: typeof value === "string" && SAFE_NPM_VERSION.test(value) ? value : "UNVERIFIED",
    verified: typeof value === "string" && SAFE_NPM_VERSION.test(value),
  });
}

function runNegativeAudit(root, paths, environment, expectedCommit, configuration) {
  if (!configuration.ok || !prepareFreshNpmState(paths)) return Object.freeze({ ok: false });
  if (!inspectRepository(root, expectedCommit).ok) return Object.freeze({ ok: false });
  const command = executeNpm(
    root,
    paths,
    environment,
    "negative-audit",
    NDQA003_SPIKE_AUDIT_ARGUMENTS,
  );
  if (!command || !inspectRepository(root, expectedCommit).ok) return Object.freeze({ ok: false });
  const summary = summarizeNegativeAuditResult(readFileSync(command.stdoutPath), command.exitCode);
  const expectedFailure =
    command.exitCode !== 0 &&
    summary.classified === true &&
    configuration.summary.offlineFalse === true &&
    configuration.summary.preferOfflineFalse === true;
  return Object.freeze({
    ok: expectedFailure,
    summary: Object.freeze({
      exitClass: expectedFailure ? "EXPECTED_NETWORK_UNAVAILABLE" : "UNEXPECTED_NEGATIVE_RESULT",
      rawByteLength: summary.rawByteLength,
      rawSha256: summary.rawSha256,
    }),
  });
}

function createFixture(root, fixtures, kind) {
  const destination = join(fixtures, kind);
  mkdirSync(destination, { mode: 0o700 });
  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const lockfile = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
  if (
    !object(packageJson) ||
    !object(lockfile) ||
    !object(lockfile.packages) ||
    !object(lockfile.packages[""])
  )
    return undefined;
  if (kind === "missing") {
    delete packageJson.license;
    delete lockfile.packages[""].license;
  } else if (kind === "noassertion") {
    packageJson.license = "NOASSERTION";
    lockfile.packages[""].license = "NOASSERTION";
  } else if (kind === "malformed") {
    packageJson.license = "@@@not-a-license@@@";
    lockfile.packages[""].license = "@@@not-a-license@@@";
  } else {
    return undefined;
  }
  const projectConfig = readFileSync(join(root, ".npmrc"));
  writeFileSync(join(destination, "package.json"), `${JSON.stringify(packageJson)}\n`, {
    flag: "wx",
    mode: 0o600,
  });
  writeFileSync(join(destination, "package-lock.json"), `${JSON.stringify(lockfile)}\n`, {
    flag: "wx",
    mode: 0o600,
  });
  writeFileSync(join(destination, ".npmrc"), projectConfig, { flag: "wx", mode: 0o600 });
  return destination;
}

function runSbom(root, paths, environment, expectedCommit, name, graph) {
  if (!prepareFreshNpmState(paths) || !inspectRepository(root, expectedCommit).ok)
    return Object.freeze({ ok: false });
  const command = executeNpm(root, paths, environment, name, NDQA003_SPIKE_SBOM_ARGUMENTS);
  if (!command || !inspectRepository(root, expectedCommit).ok) return Object.freeze({ ok: false });
  const summary = summarizeSpdxSbom(readFileSync(command.stdoutPath), graph);
  const classified = Object.freeze({
    ...summary,
    exitClass: command.exitCode === 0 ? "COMPLETE" : "NONZERO",
  });
  return Object.freeze({
    ok: command.exitCode === 0 && classified.schemaValid && classified.completeGraph,
    raw: readFileSync(command.stdoutPath),
    summary: classified,
  });
}

function runFixtureSbom(root, paths, environment, expectedCommit, kind) {
  const classification = kind === "noassertion" ? "NOASSERTION" : kind.toUpperCase();
  const fixture = createFixture(root, paths.fixtures, kind);
  if (
    !fixture ||
    !pathOutsideCheckout(root, fixture) ||
    existsSync(join(fixture, "node_modules")) ||
    !prepareFreshNpmState(paths) ||
    !inspectRepository(root, expectedCommit).ok
  )
    return Object.freeze({ classification, ok: false, verified: false });
  const command = executeNpm(
    fixture,
    paths,
    environment,
    `fixture-${kind}`,
    NDQA003_SPIKE_SBOM_ARGUMENTS,
  );
  if (
    !command ||
    existsSync(join(fixture, "node_modules")) ||
    !inspectRepository(root, expectedCommit).ok
  )
    return Object.freeze({ classification, ok: false, verified: false });
  const graph = describeLockfileGraph(
    JSON.parse(readFileSync(join(fixture, "package-lock.json"), "utf8")),
  );
  if (!graph) return Object.freeze({ classification, ok: false, verified: false });
  const summary = summarizeSpdxSbom(readFileSync(command.stdoutPath), graph);
  const expectedCategory = kind === "noassertion" ? "noAssertion" : kind;
  return Object.freeze({
    ok:
      command.exitCode === 0 &&
      summary.schemaValid &&
      summary.completeGraph &&
      summary.rootLicenseCategory === expectedCategory,
    classification,
    verified:
      command.exitCode === 0 &&
      summary.schemaValid &&
      summary.completeGraph &&
      summary.rootLicenseCategory === expectedCategory,
  });
}

function removeChildTemporaryData(paths) {
  let clean = true;
  for (const directory of [
    paths.raw,
    paths.cache,
    paths.logs,
    paths.home,
    paths.xdgConfig,
    paths.configuration,
    paths.fixtures,
  ]) {
    try {
      if (existsSync(directory)) rmSync(directory, { force: true, recursive: true });
    } catch {
      clean = false;
    }
  }
  return clean;
}

function parseIsolatedControl(controlPath) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(controlPath, "utf8"));
  } catch {
    return undefined;
  }
  const control = object(parsed);
  const paths = control && object(control.paths);
  if (
    !control ||
    !paths ||
    typeof control.root !== "string" ||
    !isAbsolute(control.root) ||
    resolve(control.root) !== resolve(process.cwd()) ||
    typeof control.commit !== "string" ||
    !SAFE_HEX.test(control.commit) ||
    typeof control.parentNamespace !== "string" ||
    !SAFE_NAMESPACE.test(control.parentNamespace) ||
    typeof paths.output !== "string" ||
    !isAbsolute(paths.output) ||
    typeof paths.temporaryRoot !== "string" ||
    !isAbsolute(paths.temporaryRoot) ||
    !relativeChild(paths.temporaryRoot, paths.output) ||
    !pathOutsideCheckout(control.root, paths.output)
  )
    return undefined;
  const expectedDirectories = {
    cache: join(paths.output, "cache"),
    configuration: join(paths.output, "configuration"),
    control: join(paths.output, "control"),
    fixtures: join(paths.output, "fixtures"),
    home: join(paths.output, "home"),
    logs: join(paths.output, "logs"),
    raw: join(paths.output, "raw"),
    xdgConfig: join(paths.output, "xdg-config"),
  };
  if (
    resolve(controlPath) !== resolve(join(paths.control, "isolated-control.json")) ||
    !existsSync(controlPath) ||
    !lstatSync(controlPath).isFile() ||
    !existsSync(paths.output) ||
    !lstatSync(paths.output).isDirectory()
  )
    return undefined;
  if (
    typeof paths.receipt !== "string" ||
    resolve(paths.receipt) !== resolve(join(paths.output, NDQA003_SPIKE_RECEIPT_FILENAME)) ||
    existsSync(paths.receipt)
  )
    return undefined;
  for (const [key, expectedPath] of Object.entries(expectedDirectories)) {
    if (
      typeof paths[key] !== "string" ||
      resolve(paths[key]) !== resolve(expectedPath) ||
      !existsSync(paths[key]) ||
      !lstatSync(paths[key]).isDirectory()
    )
      return undefined;
  }
  if (
    typeof control.resultPath !== "string" ||
    resolve(control.resultPath) !== resolve(join(paths.control, "isolated-result.json")) ||
    !relativeChild(paths.output, control.resultPath)
  )
    return undefined;
  return Object.freeze({
    commit: control.commit,
    parentNamespace: control.parentNamespace,
    paths: Object.freeze({ ...paths }),
    resultPath: control.resultPath,
    root: control.root,
  });
}

function isolatedChild(controlPath) {
  const control = parseIsolatedControl(controlPath);
  if (!control) {
    process.exitCode = 1;
    return;
  }
  const outcome = { failures: [], negativeControl: undefined, sbom: undefined, status: "PASS" };
  const paths = control.paths;
  try {
    const namespace = childNamespaceSetup(control.parentNamespace);
    if (!namespace) {
      failure(outcome, "network-namespace", "NAMESPACE_PROOF_UNAVAILABLE", "BLOCKED");
    } else {
      const controlledFiles = createControlledNpmFiles(paths);
      const environment = buildSterileNpmEnvironment(paths, controlledFiles);
      const configuration = probeNpmConfiguration(
        control.root,
        paths,
        controlledFiles,
        environment,
        "isolated",
        control.commit,
      );
      if (!configuration.ok) {
        failure(outcome, "configuration", "CONFIGURATION_PROOF_FAILED");
      } else {
        const negativeAudit = runNegativeAudit(
          control.root,
          paths,
          environment,
          control.commit,
          configuration,
        );
        if (!negativeAudit.ok) {
          failure(outcome, "negative-audit", "NEGATIVE_AUDIT_NOT_CLASSIFIED");
        } else {
          const graph = describeLockfileGraph(
            JSON.parse(readFileSync(join(control.root, "package-lock.json"), "utf8")),
          );
          if (!graph) {
            failure(outcome, "sbom", "LOCKFILE_GRAPH_UNAVAILABLE");
          } else {
            const first = runSbom(
              control.root,
              paths,
              environment,
              control.commit,
              "sbom-first",
              graph,
            );
            const second = runSbom(
              control.root,
              paths,
              environment,
              control.commit,
              "sbom-second",
              graph,
            );
            const fixtures = ["missing", "noassertion", "malformed"].map((kind) =>
              runFixtureSbom(control.root, paths, environment, control.commit, kind),
            );
            const comparison =
              first.raw && second.raw
                ? compareSbomRawAndSemantic(first.raw, second.raw)
                : Object.freeze({
                    determinism: "NOT VERIFIED",
                    rawEqual: false,
                    semanticComparable: false,
                    semanticEqual: false,
                  });
            outcome.sbom = Object.freeze({
              first: first.summary,
              second: second.summary,
              fixtures: Object.freeze(
                fixtures.map((fixture) =>
                  Object.freeze({
                    classification: fixture.classification,
                    verified: fixture.verified,
                  }),
                ),
              ),
              status: "FAIL",
              ...comparison,
            });
            if (!first.ok || !second.ok || fixtures.some((fixture) => !fixture.ok)) {
              failure(outcome, "sbom", "SBOM_PROOF_FAILED");
            } else {
              outcome.sbom = Object.freeze({
                ...outcome.sbom,
                status: comparison.determinism === "PASS" ? "PASS" : "NOT VERIFIED",
                ...comparison,
              });
              if (comparison.determinism !== "PASS")
                failure(
                  outcome,
                  "sbom-determinism",
                  "SBOM_RAW_DETERMINISM_NOT_VERIFIED",
                  "NOT VERIFIED",
                );
            }
          }
        }
        outcome.negativeControl = Object.freeze({
          configuration: configuration.summary,
          namespace,
          negativeAudit: negativeAudit.summary,
        });
      }
    }
  } catch {
    failure(outcome, "isolated-child", "UNEXPECTED_ISOLATED_FAILURE");
  }
  const cleaned = removeChildTemporaryData(paths);
  if (!cleaned) failure(outcome, "isolated-cleanup", "RAW_CLEANUP_FAILED");
  try {
    writeFileSync(
      control.resultPath,
      `${JSON.stringify({
        failures: outcome.failures,
        negativeControl: outcome.negativeControl,
        sbom: outcome.sbom,
        rawTemporaryFilesDeleted: cleaned,
        status: outcome.status,
      })}\n`,
      { flag: "wx", mode: 0o600 },
    );
  } catch {
    process.exitCode = 1;
    return;
  }
  process.exitCode = outcome.status === "PASS" ? 0 : 1;
}

function runIsolatedSuite(root, paths, commit) {
  const parentNamespace = commandText("readlink", ["/proc/self/ns/net"], { cwd: root });
  if (
    !inspectRepository(root, commit).ok ||
    typeof parentNamespace !== "string" ||
    !SAFE_NAMESPACE.test(parentNamespace)
  )
    return Object.freeze({
      failures: Object.freeze([
        { code: "NAMESPACE_PARENT_UNAVAILABLE", phase: "NETWORK-NAMESPACE" },
      ]),
      status: "BLOCKED",
    });
  const resultPath = join(paths.control, "isolated-result.json");
  const controlPath = join(paths.control, "isolated-control.json");
  writeFileSync(
    controlPath,
    `${JSON.stringify({ commit, parentNamespace, paths, resultPath, root })}\n`,
    { flag: "wx", mode: 0o600 },
  );
  const invocation = buildNamespaceInvocation(resolve(process.argv[1]), controlPath);
  const result = commandToPrivateFiles(invocation.executable, invocation.arguments, {
    cwd: root,
    env: { PATH: "/usr/bin:/bin" },
    stderrPath: join(paths.raw, "namespace.stderr"),
    stdoutPath: join(paths.raw, "namespace.stdout"),
  });
  if (!result.available || !existsSync(resultPath) || !inspectRepository(root, commit).ok)
    return Object.freeze({
      failures: Object.freeze([{ code: "ISOLATED_CHILD_UNAVAILABLE", phase: "NETWORK-NAMESPACE" }]),
      status: "BLOCKED",
    });
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(resultPath, "utf8"));
  } catch {
    return Object.freeze({
      failures: Object.freeze([{ code: "ISOLATED_RESULT_UNREADABLE", phase: "NETWORK-NAMESPACE" }]),
      status: "FAIL",
    });
  }
  const record = object(parsed);
  if (!record || !validTerminalStatus(record.status) || record.rawTemporaryFilesDeleted !== true)
    return Object.freeze({
      failures: Object.freeze([{ code: "ISOLATED_RESULT_INVALID", phase: "NETWORK-NAMESPACE" }]),
      status: "FAIL",
    });
  const failures = projectFailures(record.failures);
  if (
    !failures ||
    (record.status === "PASS" && result.exitCode !== 0) ||
    (record.status !== "PASS" && result.exitCode === 0)
  )
    return Object.freeze({
      failures: Object.freeze([
        { code: "ISOLATED_RESULT_INCONSISTENT", phase: "NETWORK-NAMESPACE" },
      ]),
      status: "FAIL",
    });
  const negativeControl =
    record.negativeControl === undefined
      ? undefined
      : projectNegativeControl(record.negativeControl);
  const sbom = record.sbom === undefined ? undefined : projectSbom(record.sbom);
  if (
    (record.negativeControl !== undefined && !negativeControl) ||
    (record.sbom !== undefined && !sbom) ||
    ((record.status === "PASS" || record.status === "NOT VERIFIED") && (!negativeControl || !sbom))
  )
    return Object.freeze({
      failures: Object.freeze([{ code: "ISOLATED_RESULT_INVALID", phase: "NETWORK-NAMESPACE" }]),
      status: "FAIL",
    });
  return Object.freeze({
    failures,
    negativeControl,
    sbom,
    status: record.status,
  });
}

function runPositiveAudit(root, paths, commit) {
  const controlledFiles = createControlledNpmFiles(paths);
  const environment = buildSterileNpmEnvironment(paths, controlledFiles);
  const configuration = probeNpmConfiguration(
    root,
    paths,
    controlledFiles,
    environment,
    "positive",
    commit,
  );
  if (!configuration.ok) return Object.freeze({ status: "FAIL" });
  if (!prepareFreshNpmState(paths) || !inspectRepository(root, commit).ok)
    return Object.freeze({ status: "FAIL" });
  const command = executeNpm(
    root,
    paths,
    environment,
    "positive-audit",
    NDQA003_SPIKE_AUDIT_ARGUMENTS,
  );
  if (!command || !inspectRepository(root, commit).ok) return Object.freeze({ status: "FAIL" });
  const summary = summarizeAuditResult(readFileSync(command.stdoutPath), command.exitCode, true);
  return Object.freeze({
    configuration: configuration.summary,
    status: summary.complete ? "PASS" : "FAIL",
    summary,
  });
}

function safeGithubIdentity(environment) {
  const runId = environment.GITHUB_RUN_ID;
  const job = environment.GITHUB_JOB;
  const attempt = environment.GITHUB_RUN_ATTEMPT;
  const sha = environment.GITHUB_SHA;
  if (
    environment.GITHUB_ACTIONS !== "true" ||
    !SAFE_NUMERIC.test(runId ?? "") ||
    !SAFE_GITHUB_JOB.test(job ?? "") ||
    !SAFE_NUMERIC.test(attempt ?? "") ||
    !SAFE_HEX.test(sha ?? "")
  )
    return undefined;
  return Object.freeze({ attempt, job, runId, sha });
}

function safeRunnerIdentity(environment, hostArchitecture) {
  const os = environment.RUNNER_OS;
  const arch = environment.RUNNER_ARCH;
  const image = environment.ImageOS;
  const imageVersion = environment.ImageVersion;
  if (
    os !== "Linux" ||
    arch !== "X64" ||
    typeof image !== "string" ||
    !SAFE_RUNNER_IMAGE.test(image) ||
    typeof imageVersion !== "string" ||
    !SAFE_RUNNER_IMAGE.test(imageVersion) ||
    (hostArchitecture !== "x86_64" && hostArchitecture !== "amd64")
  )
    return undefined;
  return Object.freeze({
    hostArchitecture,
    image,
    imageVersion,
    processArch: process.arch,
    processPlatform: process.platform,
    runnerArch: arch,
    runnerOs: os,
  });
}

function cleanupLayout(paths) {
  let clean = true;
  for (const directory of [
    paths.raw,
    paths.cache,
    paths.logs,
    paths.home,
    paths.xdgConfig,
    paths.configuration,
    paths.fixtures,
    paths.control,
  ]) {
    try {
      if (existsSync(directory)) rmSync(directory, { force: true, recursive: true });
    } catch {
      clean = false;
    }
  }
  return clean;
}

function safeNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function projectHashIdentity(value) {
  const record = object(value);
  if (
    !record ||
    !safeNonNegativeInteger(record.byteLength) ||
    !SAFE_SHA256.test(record.sha256 ?? "")
  )
    return undefined;
  return Object.freeze({ byteLength: record.byteLength, sha256: record.sha256 });
}

function projectRawIdentity(value) {
  const record = object(value);
  if (
    !record ||
    !safeNonNegativeInteger(record.rawByteLength) ||
    !SAFE_SHA256.test(record.rawSha256 ?? "")
  )
    return undefined;
  return Object.freeze({ rawByteLength: record.rawByteLength, rawSha256: record.rawSha256 });
}

function projectConfiguration(value) {
  const record = object(value);
  if (!record) return undefined;
  const result = {};
  for (const key of CONFIGURATION_BOOLEAN_KEYS) {
    if (typeof record[key] !== "boolean") return undefined;
    result[key] = record[key];
  }
  if (
    (record.effectiveRegistryMatches === true &&
      record.effectiveRegistry !== NDQA003_SPIKE_REGISTRY) ||
    (record.effectiveRegistryMatches === false && record.effectiveRegistry !== "UNVERIFIED")
  )
    return undefined;
  result.effectiveRegistry = record.effectiveRegistry;
  return Object.freeze(result);
}

function projectNamespace(value) {
  const record = object(value);
  if (!record) return undefined;
  const result = {};
  for (const key of ["distinct", "loopbackOnly", "noIpv4DefaultRoute", "noIpv6DefaultRoute"]) {
    if (typeof record[key] !== "boolean") return undefined;
    result[key] = record[key];
  }
  return Object.freeze(result);
}

function projectSeverityCounts(value) {
  const record = object(value);
  if (!record) return undefined;
  const result = {};
  for (const key of ["info", "low", "moderate", "high", "critical", "total"]) {
    if (!safeNonNegativeInteger(record[key])) return undefined;
    result[key] = record[key];
  }
  return Object.freeze(result);
}

function projectAuditSummary(value) {
  const record = object(value);
  const identity = projectRawIdentity(value);
  const counts =
    record && record.severityCounts === null ? null : projectSeverityCounts(record?.severityCounts);
  if (
    !record ||
    !identity ||
    typeof record.complete !== "boolean" ||
    typeof record.fullGraphEstablished !== "boolean" ||
    (record.reportVersion !== null && !Number.isSafeInteger(record.reportVersion)) ||
    (record.severityCounts !== null && !counts) ||
    !AUDIT_EXIT_CLASSES.has(record.exitClass)
  )
    return undefined;
  return Object.freeze({
    complete: record.complete,
    exitClass: record.exitClass,
    fullGraphEstablished: record.fullGraphEstablished,
    rawByteLength: identity.rawByteLength,
    rawSha256: identity.rawSha256,
    reportVersion: record.reportVersion,
    severityCounts: counts,
  });
}

function projectNegativeAudit(value) {
  const record = object(value);
  const identity = projectRawIdentity(value);
  if (
    !record ||
    !identity ||
    typeof record.classified !== "boolean" ||
    (record.exitClass !== "EXPECTED_NETWORK_UNAVAILABLE" &&
      record.exitClass !== "MALFORMED" &&
      record.exitClass !== "UNCLASSIFIED" &&
      record.exitClass !== "UNCLASSIFIED_ERROR" &&
      record.exitClass !== "UNEXPECTED_NEGATIVE_RESULT")
  )
    return undefined;
  return Object.freeze({
    classified: record.classified,
    exitClass: record.exitClass,
    rawByteLength: identity.rawByteLength,
    rawSha256: identity.rawSha256,
  });
}

function projectSpdxSummary(value) {
  const record = object(value);
  const identity = projectRawIdentity(value);
  const licenses = record && object(record.declaredLicenseCounts);
  const coverage = record && object(record.coverage);
  if (
    !record ||
    !identity ||
    typeof record.completeGraph !== "boolean" ||
    typeof record.schemaValid !== "boolean" ||
    (record.exitClass !== "COMPLETE" && record.exitClass !== "NONZERO")
  )
    return undefined;
  if (!record.schemaValid) {
    if (
      record.completeGraph !== false ||
      record.declaredLicenseCounts !== null ||
      record.coverage !== null ||
      record.schemaVersion !== "UNVERIFIED" ||
      record.rootLicenseCategory !== undefined
    )
      return undefined;
    return Object.freeze({
      completeGraph: false,
      coverage: null,
      declaredLicenseCounts: null,
      exitClass: record.exitClass,
      rawByteLength: identity.rawByteLength,
      rawSha256: identity.rawSha256,
      rootLicenseCategory: undefined,
      schemaValid: false,
      schemaVersion: "UNVERIFIED",
    });
  }
  if (!licenses || !coverage || !/^SPDX-[0-9.]+$/u.test(record.schemaVersion ?? ""))
    return undefined;
  const declaredLicenseCounts = {};
  for (const category of LICENSE_CATEGORIES) {
    if (!safeNonNegativeInteger(licenses[category])) return undefined;
    declaredLicenseCounts[category] = licenses[category];
  }
  const coverageResult = {};
  for (const key of [
    "actualEntries",
    "expectedEntries",
    "missingEntries",
    "optionalEntries",
    "peerEntries",
    "productionEntries",
    "developmentEntries",
    "unexpectedEntries",
  ]) {
    if (!safeNonNegativeInteger(coverage[key])) return undefined;
    coverageResult[key] = coverage[key];
  }
  if (
    typeof coverage.relationshipsPresent !== "boolean" ||
    typeof coverage.rootPresent !== "boolean"
  )
    return undefined;
  coverageResult.relationshipsPresent = coverage.relationshipsPresent;
  coverageResult.rootPresent = coverage.rootPresent;
  if (
    record.rootLicenseCategory !== undefined &&
    !LICENSE_CATEGORIES.includes(record.rootLicenseCategory)
  )
    return undefined;
  return Object.freeze({
    completeGraph: record.completeGraph,
    coverage: Object.freeze(coverageResult),
    declaredLicenseCounts: Object.freeze(declaredLicenseCounts),
    exitClass: record.exitClass,
    rawByteLength: identity.rawByteLength,
    rawSha256: identity.rawSha256,
    rootLicenseCategory: record.rootLicenseCategory,
    schemaValid: record.schemaValid,
    schemaVersion: record.schemaVersion,
  });
}

function projectNegativeControl(value) {
  const record = object(value);
  const configuration = record && projectConfiguration(record.configuration);
  const namespace = record && projectNamespace(record.namespace);
  const negativeAudit = record && projectNegativeAudit(record.negativeAudit);
  if (!record || !configuration || !namespace || !negativeAudit) return undefined;
  return Object.freeze({ configuration, namespace, negativeAudit });
}

function projectSbom(value) {
  const record = object(value);
  const first = record && projectSpdxSummary(record.first);
  const second = record && projectSpdxSummary(record.second);
  if (
    !record ||
    !Array.isArray(record.fixtures) ||
    record.fixtures.length !== 3 ||
    (record.status !== "PASS" && record.status !== "FAIL" && record.status !== "NOT VERIFIED") ||
    (record.determinism !== "PASS" && record.determinism !== "NOT VERIFIED") ||
    typeof record.rawEqual !== "boolean" ||
    typeof record.semanticComparable !== "boolean" ||
    typeof record.semanticEqual !== "boolean"
  )
    return undefined;
  const expectedFixtures = ["MISSING", "NOASSERTION", "MALFORMED"];
  const fixtures = [];
  for (let index = 0; index < expectedFixtures.length; index += 1) {
    const fixture = object(record.fixtures[index]);
    if (
      !fixture ||
      fixture.classification !== expectedFixtures[index] ||
      typeof fixture.verified !== "boolean"
    )
      return undefined;
    fixtures.push(
      Object.freeze({ classification: fixture.classification, verified: fixture.verified }),
    );
  }
  if (
    (record.status === "PASS" || record.status === "NOT VERIFIED") &&
    (!first || !second || fixtures.some((fixture) => fixture.verified !== true))
  )
    return undefined;
  return Object.freeze({
    determinism: record.determinism,
    first,
    fixtures: Object.freeze(fixtures),
    rawEqual: record.rawEqual,
    second,
    semanticComparable: record.semanticComparable,
    semanticEqual: record.semanticEqual,
    status: record.status,
  });
}

function projectGithub(value) {
  const record = object(value);
  if (
    !record ||
    !SAFE_NUMERIC.test(record.runId ?? "") ||
    !SAFE_NUMERIC.test(record.attempt ?? "") ||
    !SAFE_GITHUB_JOB.test(record.job ?? "") ||
    !SAFE_HEX.test(record.sha ?? "")
  )
    return undefined;
  return Object.freeze({
    attempt: record.attempt,
    job: record.job,
    runId: record.runId,
    sha: record.sha,
  });
}

function projectRunner(value) {
  const record = object(value);
  if (
    !record ||
    (record.hostArchitecture !== "x86_64" && record.hostArchitecture !== "amd64") ||
    !SAFE_RUNNER_IMAGE.test(record.image ?? "") ||
    !SAFE_RUNNER_IMAGE.test(record.imageVersion ?? "") ||
    record.processArch !== "x64" ||
    record.processPlatform !== "linux" ||
    record.runnerArch !== "X64" ||
    record.runnerOs !== "Linux"
  )
    return undefined;
  return Object.freeze({
    hostArchitecture: record.hostArchitecture,
    image: record.image,
    imageVersion: record.imageVersion,
    processArch: record.processArch,
    processPlatform: record.processPlatform,
    runnerArch: record.runnerArch,
    runnerOs: record.runnerOs,
  });
}

function projectCheckout(value) {
  const record = object(value);
  if (!record) return undefined;
  if (record.verified === false) return Object.freeze({ verified: false });
  const packageLock = projectHashIdentity(record.packageLock);
  const projectNpmrc = projectHashIdentity(record.projectNpmrc);
  if (
    !packageLock ||
    !projectNpmrc ||
    !SAFE_HEX.test(record.commit ?? "") ||
    !SAFE_HEX.test(record.tree ?? "")
  )
    return undefined;
  return Object.freeze({ commit: record.commit, packageLock, projectNpmrc, tree: record.tree });
}

function configurationVerified(value) {
  return (
    value !== undefined &&
    value.effectiveRegistry === NDQA003_SPIKE_REGISTRY &&
    CONFIGURATION_BOOLEAN_KEYS.every((key) => value[key] === true)
  );
}

function completeRunEvidence(projected) {
  const checkout = projected.checkout;
  const configuration = projected.configuration;
  const github = projected.github;
  const negativeControl = projected.negativeControl;
  const positiveAudit = projected.positiveAudit;
  const runner = projected.runner;
  const sbom = projected.sbom;
  return (
    checkout !== undefined &&
    checkout.verified !== false &&
    github !== undefined &&
    checkout.commit === github.sha &&
    configurationVerified(configuration) &&
    negativeControl !== undefined &&
    configurationVerified(negativeControl.configuration) &&
    negativeControl.namespace.distinct === true &&
    negativeControl.namespace.loopbackOnly === true &&
    negativeControl.namespace.noIpv4DefaultRoute === true &&
    negativeControl.namespace.noIpv6DefaultRoute === true &&
    negativeControl.negativeAudit.classified === true &&
    negativeControl.negativeAudit.exitClass === "EXPECTED_NETWORK_UNAVAILABLE" &&
    positiveAudit !== undefined &&
    positiveAudit.complete === true &&
    positiveAudit.fullGraphEstablished === true &&
    positiveAudit.reportVersion !== null &&
    positiveAudit.severityCounts !== null &&
    (positiveAudit.exitClass === "COMPLETE_NO_THRESHOLD_FINDING" ||
      positiveAudit.exitClass === "COMPLETE_THRESHOLD_FINDING") &&
    runner !== undefined &&
    runner.processArch === "x64" &&
    runner.processPlatform === "linux" &&
    sbom !== undefined &&
    sbom.first !== undefined &&
    sbom.second !== undefined &&
    sbom.first.schemaValid === true &&
    sbom.first.completeGraph === true &&
    sbom.second.schemaValid === true &&
    sbom.second.completeGraph === true &&
    sbom.fixtures.every((fixture) => fixture.verified === true)
  );
}

export function buildSanitizedReceipt(value) {
  const input = object(value) ?? {};
  const failures = projectFailures(input.failures);
  const projected = {
    checkout: input.checkout === undefined ? undefined : projectCheckout(input.checkout),
    configuration:
      input.configuration === undefined ? undefined : projectConfiguration(input.configuration),
    github: input.github === undefined ? undefined : projectGithub(input.github),
    negativeControl:
      input.negativeControl === undefined
        ? undefined
        : projectNegativeControl(input.negativeControl),
    positiveAudit:
      input.positiveAudit === undefined ? undefined : projectAuditSummary(input.positiveAudit),
    runner: input.runner === undefined ? undefined : projectRunner(input.runner),
    sbom: input.sbom === undefined ? undefined : projectSbom(input.sbom),
  };
  const toolchain = object(input.toolchain);
  const toolchainSafe =
    toolchain &&
    (SAFE_NODE_VERSION.test(toolchain.node ?? "") || toolchain.node === "UNVERIFIED") &&
    (SAFE_NPM_VERSION.test(toolchain.npm ?? "") ||
      toolchain.npm === "NOT OBSERVED" ||
      toolchain.npm === "UNVERIFIED");
  const timestampsSafe =
    typeof input.startedAtUtc === "string" &&
    typeof input.finishedAtUtc === "string" &&
    /^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$/u.test(input.startedAtUtc) &&
    /^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$/u.test(input.finishedAtUtc);
  const custody = object(input.custody);
  const custodySafe =
    custody &&
    custody.artifactRetention === "SANITIZED_RECEIPT_ONLY" &&
    custody.artifactTarget === NDQA003_SPIKE_RECEIPT_FILENAME &&
    typeof custody.artifactUploaderReceiptOnly === "boolean" &&
    typeof custody.cleanupFailure === "boolean" &&
    typeof custody.rawTemporaryFilesDeleted === "boolean";
  const projectedInputsAreSafe = Object.entries(projected).every(
    ([key, candidate]) => input[key] === undefined || candidate !== undefined,
  );
  const confirmedCleanRun =
    input.confirmation === "ACCEPTED" &&
    custodySafe &&
    custody.artifactUploaderReceiptOnly === true &&
    custody.cleanupFailure === false &&
    custody.rawTemporaryFilesDeleted === true &&
    toolchainSafe &&
    toolchain.node === NDQA003_SPIKE_NODE_VERSION &&
    toolchain.npm === NDQA003_SPIKE_NPM_VERSION &&
    completeRunEvidence(projected);
  const terminalRelationshipIsSafe =
    input.status === "PASS"
      ? confirmedCleanRun &&
        failures?.length === 0 &&
        projected.sbom.status === "PASS" &&
        projected.sbom.determinism === "PASS" &&
        projected.sbom.rawEqual === true &&
        projected.sbom.semanticComparable === true &&
        projected.sbom.semanticEqual === true
      : input.status === "NOT VERIFIED"
        ? confirmedCleanRun &&
          failures !== undefined &&
          failures.length > 0 &&
          projected.sbom.status === "NOT VERIFIED" &&
          projected.sbom.determinism === "NOT VERIFIED" &&
          projected.sbom.rawEqual === false
        : failures !== undefined && failures.length > 0;
  const invalid =
    !validTerminalStatus(input.status) ||
    !failures ||
    !toolchainSafe ||
    !timestampsSafe ||
    !safeNonNegativeInteger(input.durationMilliseconds) ||
    !custodySafe ||
    !projectedInputsAreSafe ||
    !terminalRelationshipIsSafe;
  const receipt = {
    schema: NDQA003_SPIKE_RECEIPT_SCHEMA,
    status: invalid ? "FAIL" : input.status,
    policy: NDQA003_SPIKE_POLICY,
    startedAtUtc: timestampsSafe ? input.startedAtUtc : "1970-01-01T00:00:00.000Z",
    finishedAtUtc: timestampsSafe ? input.finishedAtUtc : "1970-01-01T00:00:00.000Z",
    durationMilliseconds: safeNonNegativeInteger(input.durationMilliseconds)
      ? input.durationMilliseconds
      : 0,
    confirmation: input.confirmation === "ACCEPTED" ? "ACCEPTED" : "REJECTED",
    toolchain: toolchainSafe
      ? Object.freeze({ node: toolchain.node, npm: toolchain.npm })
      : Object.freeze({ node: "UNVERIFIED", npm: "UNVERIFIED" }),
    commands: Object.freeze({
      audit: Object.freeze(["npm", ...NDQA003_SPIKE_AUDIT_ARGUMENTS]),
      sbom: Object.freeze(["npm", ...NDQA003_SPIKE_SBOM_ARGUMENTS]),
      networkNamespace: Object.freeze(["sudo", "-n", "unshare", "--net", "--fork", "--mount-proc"]),
    }),
    custody: custodySafe
      ? Object.freeze({
          artifactRetention: custody.artifactRetention,
          artifactTarget: custody.artifactTarget,
          artifactUploaderReceiptOnly: custody.artifactUploaderReceiptOnly,
          cleanupFailure: custody.cleanupFailure,
          rawTemporaryFilesDeleted: custody.rawTemporaryFilesDeleted,
        })
      : Object.freeze({
          artifactRetention: "SANITIZED_RECEIPT_ONLY",
          artifactTarget: NDQA003_SPIKE_RECEIPT_FILENAME,
          artifactUploaderReceiptOnly: false,
          cleanupFailure: true,
          rawTemporaryFilesDeleted: false,
        }),
    billing: "NOT AVAILABLE",
    failures: invalid
      ? Object.freeze([
          ...(failures ?? []),
          Object.freeze({ code: "RECEIPT_INPUT_INVALID", phase: "RECEIPT" }),
        ])
      : failures,
  };
  for (const [key, candidate] of Object.entries(projected)) {
    if (candidate !== undefined) receipt[key] = candidate;
  }
  return Object.freeze(receipt);
}

export function validatePreservableFailureReceiptBytes(value) {
  if (!Buffer.isBuffer(value) || value.byteLength > 65536) return false;
  let parsed;
  try {
    const text = value.toString("utf8");
    if (!Buffer.from(text, "utf8").equals(value)) return false;
    parsed = JSON.parse(text);
  } catch {
    return false;
  }
  const record = object(parsed);
  if (!record) return false;
  if (
    record.status === "PASS" ||
    !Array.isArray(record.failures) ||
    record.failures.length === 0 ||
    !Object.hasOwn(record, "checkout")
  )
    return false;
  const sanitized = buildSanitizedReceipt(record);
  return value.equals(Buffer.from(`${JSON.stringify(sanitized)}\n`, "utf8"));
}

function writeReceipt(paths, receipt) {
  const children = readdirSync(paths.output);
  if (children.length !== 0) return false;
  writeFileSync(paths.receipt, `${JSON.stringify(receipt)}\n`, { flag: "wx", mode: 0o600 });
  const finalChildren = readdirSync(paths.output);
  return finalChildren.length === 1 && finalChildren[0] === NDQA003_SPIKE_RECEIPT_FILENAME;
}

function executeHarness() {
  const startedAt = utcNow();
  const startedMilliseconds = Date.now();
  const outcome = { failures: [], status: "PASS" };
  let paths;
  let github;
  let runner;
  let checkout;
  let negativeControl;
  let positiveAudit;
  let sbom;
  let configuration;
  let confirmation = "REJECTED";
  let npmVersion = "NOT OBSERVED";
  let rawTemporaryFilesDeleted = false;
  try {
    const root = resolve(process.cwd());
    paths = createLayout(root, process.env.NDQA003_OUTPUT_DIR, process.env.NDQA003_TEMP_ROOT);
    if (process.env.NDQA003_CONFIRMATION === NDQA003_SPIKE_CONFIRMATION) confirmation = "ACCEPTED";
    else failure(outcome, "confirmation", "CONFIRMATION_REJECTED");

    if (outcome.status === "PASS") {
      github = safeGithubIdentity(process.env);
      const hostArchitecture = commandText("uname", ["-m"], { cwd: root });
      runner = safeRunnerIdentity(process.env, hostArchitecture);
      if (!github) failure(outcome, "github-identity", "GITHUB_IDENTITY_UNAVAILABLE");
      if (!runner || process.platform !== "linux" || process.arch !== "x64")
        failure(outcome, "platform-identity", "LINUX_X64_IDENTITY_UNAVAILABLE");
      checkout = github ? inspectRepository(root, github.sha) : Object.freeze({ ok: false });
      if (!checkout.ok) failure(outcome, "checkout", "CHECKOUT_CUSTODY_FAILED");

      if (outcome.status === "PASS" && process.version !== NDQA003_SPIKE_NODE_VERSION)
        failure(outcome, "toolchain", "PINNED_TOOLCHAIN_MISMATCH");
      if (outcome.status === "PASS") {
        const observedNpm = observeNpmVersion(root, paths, github.sha);
        npmVersion = observedNpm.observed;
        if (!observedNpm.verified || npmVersion !== NDQA003_SPIKE_NPM_VERSION)
          failure(outcome, "toolchain", "PINNED_TOOLCHAIN_MISMATCH");
      }

      if (outcome.status === "PASS") {
        const isolated = runIsolatedSuite(root, paths, github.sha);
        negativeControl = isolated.negativeControl;
        sbom = isolated.sbom;
        const permitsPositive = isolated.status === "PASS" || isolated.status === "NOT VERIFIED";
        if (!permitsPositive) {
          for (const item of isolated.failures ?? [])
            failure(outcome, item.phase, item.code, isolated.status);
          if ((isolated.failures ?? []).length === 0)
            failure(outcome, "isolated-suite", "ISOLATED_SUITE_UNAVAILABLE", isolated.status);
        } else {
          for (const item of isolated.failures ?? [])
            failure(outcome, item.phase, item.code, isolated.status);
          const positive = runPositiveAudit(root, paths, github.sha);
          configuration = positive.configuration;
          positiveAudit = positive.summary;
          if (positive.status !== "PASS")
            failure(outcome, "positive-audit", "POSITIVE_AUDIT_FAILED");
        }
      }
    }
  } catch {
    failure(outcome, "harness", "UNEXPECTED_HARNESS_FAILURE");
  } finally {
    if (paths) {
      rawTemporaryFilesDeleted = cleanupLayout(paths);
      if (!rawTemporaryFilesDeleted) failure(outcome, "cleanup", "RAW_CLEANUP_FAILED");
      const finishedAt = utcNow();
      const receipt = buildSanitizedReceipt({
        schema: NDQA003_SPIKE_RECEIPT_SCHEMA,
        status: outcome.status,
        policy: NDQA003_SPIKE_POLICY,
        startedAtUtc: startedAt,
        finishedAtUtc: finishedAt,
        durationMilliseconds: Math.max(0, Date.now() - startedMilliseconds),
        confirmation,
        github,
        runner,
        toolchain: Object.freeze({
          node: process.version,
          npm: npmVersion,
        }),
        checkout: checkout?.ok
          ? Object.freeze({
              commit: checkout.commit,
              packageLock: checkout.packageLock,
              projectNpmrc: checkout.projectNpmrc,
              tree: checkout.tree,
            })
          : Object.freeze({ verified: false }),
        commands: Object.freeze({
          audit: Object.freeze(["npm", ...NDQA003_SPIKE_AUDIT_ARGUMENTS]),
          sbom: Object.freeze(["npm", ...NDQA003_SPIKE_SBOM_ARGUMENTS]),
          networkNamespace: Object.freeze([
            "sudo",
            "-n",
            "unshare",
            "--net",
            "--fork",
            "--mount-proc",
          ]),
        }),
        configuration,
        negativeControl,
        positiveAudit,
        sbom,
        custody: Object.freeze({
          artifactRetention: "SANITIZED_RECEIPT_ONLY",
          artifactTarget: NDQA003_SPIKE_RECEIPT_FILENAME,
          artifactUploaderReceiptOnly: true,
          cleanupFailure: !rawTemporaryFilesDeleted,
          rawTemporaryFilesDeleted,
        }),
        billing: "NOT AVAILABLE",
        failures: Object.freeze(outcome.failures),
      });
      if (!writeReceipt(paths, receipt)) process.exitCode = 1;
      else process.exitCode = receipt.status === "PASS" ? 0 : 1;
    } else {
      process.exitCode = 1;
    }
  }
}

const executedAsMainModule =
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (executedAsMainModule) {
  if (process.argv[2] === NDQA003_SPIKE_ISOLATED_CHILD_ARGUMENT) {
    const controlPath = process.argv[3];
    if (typeof controlPath !== "string" || process.argv.length !== 4) process.exitCode = 1;
    else isolatedChild(controlPath);
  } else if (process.argv.length === 2) {
    executeHarness();
  } else {
    process.exitCode = 1;
  }
}
