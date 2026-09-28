/**
 * Pure semantic boundary for the ND-QA-003 Windows ARM64 evidence procedure.
 *
 * This module has no automatic entry point and never launches npm, changes a
 * firewall rule, contacts a registry, or writes a receipt. The tracked
 * PowerShell wrapper owns those operations after its pre-Node ingress checks.
 */

import { createHash } from "node:crypto";

export const NDQA003_WINDOWS_EVIDENCE_PROCEDURE_VERSION =
  "nightdrive.ndqa003.windows-arm64-evidence-procedure.v1";
export const NDQA003_WINDOWS_EVIDENCE_RECEIPT_SCHEMA =
  "nightdrive.ndqa003.windows-arm64-evidence-receipt.v1";
export const NDQA003_WINDOWS_EVIDENCE_WRAPPER_INGRESS_SCHEMA =
  "nightdrive.ndqa003.windows-arm64-wrapper-ingress.v1";
export const NDQA003_WINDOWS_EVIDENCE_WRAPPER_INGRESS_SENTINEL =
  "--ndqa003-windows-arm64-wrapper-ingress-v1";
export const NDQA003_WINDOWS_EVIDENCE_WRAPPER_INGRESS_MAX_BYTES = 32 * 1024;
export const NDQA003_WINDOWS_EVIDENCE_ENVIRONMENT_ALLOWLIST_VERSION =
  "nightdrive.ndqa003.windows-arm64-npm-environment.v1";
export const NDQA003_WINDOWS_EVIDENCE_PROBE_SET_VERSION =
  "nightdrive.ndqa003.windows-arm64-npm-probes.v1";
export const NDQA003_WINDOWS_EVIDENCE_REGISTRY = "https://registry.npmjs.org/";
export const NDQA003_WINDOWS_EVIDENCE_NODE_VERSION = "v24.21.0";
export const NDQA003_WINDOWS_EVIDENCE_NPM_VERSION = "11.19.0";

export const NPM_CONFIGURATION_PROBES = Object.freeze([
  "userconfig",
  "globalconfig",
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
]);
export const NODE_VERSION_ARGUMENTS = Object.freeze(["--version"]);
export const NPM_VERSION_ARGUMENTS = Object.freeze(["--version"]);
export const AUDIT_ARGUMENTS = Object.freeze(["audit", "--json", "--audit-level=high"]);
export const SBOM_ARGUMENTS = Object.freeze(["sbom", "--package-lock-only", "--sbom-format=spdx"]);
export const EVIDENCE_PHASES = Object.freeze([
  "negative-audit",
  "sbom-first",
  "sbom-second",
  "fixture-missing",
  "fixture-noassertion",
  "fixture-malformed",
  "positive-audit",
]);
export const NOT_RUN_PRECONDITION_FAILED = "NOT_RUN_PRECONDITION_FAILED";

function fail(message) {
  throw new Error(`ND-QA-003 Windows ARM64 evidence: ${message}`);
}

function exactString(value, label) {
  if (typeof value !== "string") fail(`${label} must be text`);
  return value;
}

function exactSha1(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/u.test(value)) {
    fail(`${label} must be a lowercase full SHA-1`);
  }
  return value;
}

function exactSha256(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/u.test(value)) {
    fail(`${label} must be a lowercase SHA-256`);
  }
  return value;
}

function plainRecord(value, label) {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    fail(`${label} must be a plain record`);
  }
  return value;
}

function exactKeys(value, keys, label) {
  const record = plainRecord(value, label);
  const observed = Object.keys(record);
  if (observed.length !== keys.length || observed.some((key, index) => key !== keys[index])) {
    fail(`${label} has an unexpected shape`);
  }
  return record;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function terminalToken(value, label) {
  const text = exactString(value, label);
  if (text.endsWith("\r\n")) return text.slice(0, -2);
  if (text.endsWith("\n")) return text.slice(0, -1);
  return text;
}

function noEmbeddedLineBreak(value) {
  return !value.includes("\r") && !value.includes("\n");
}

export function fixedInvocationIdentity(
  label,
  executableSha256,
  launcherSha256,
  cliSha256,
  argumentsValue,
) {
  exactString(label, "command label");
  exactSha256(executableSha256, "node executable identity");
  exactSha256(launcherSha256, "npm launcher identity");
  exactSha256(cliSha256, "npm CLI identity");
  if (!Array.isArray(argumentsValue) || argumentsValue.some((value) => typeof value !== "string")) {
    fail("command arguments must be an exact text array");
  }
  // Keep this byte representation aligned with the PowerShell wrapper's
  // ordered ConvertTo-Json record. The identity is safe to retain because it
  // contains only fixed labels, hashes, and accepted argv tokens.
  return sha256(
    JSON.stringify({
      Label: label,
      NodeSha256: executableSha256,
      NpmCmdSha256: launcherSha256,
      NpmCliSha256: cliSha256,
      Arguments: argumentsValue,
    }),
  );
}

export function buildSterileNpmEnvironment(paths) {
  const value = exactKeys(
    paths,
    [
      "appData",
      "cache",
      "comSpec",
      "globalConfig",
      "home",
      "localAppData",
      "logs",
      "path",
      "pathExt",
      "systemRoot",
      "temp",
      "userConfig",
    ],
    "sterile npm paths",
  );
  const environment = Object.create(null);
  environment.SystemRoot = exactString(value.systemRoot, "SystemRoot");
  environment.ComSpec = exactString(value.comSpec, "ComSpec");
  environment.PATHEXT = exactString(value.pathExt, "PATHEXT");
  environment.PATH = exactString(value.path, "PATH");
  environment.HOME = exactString(value.home, "HOME");
  environment.USERPROFILE = value.home;
  environment.APPDATA = exactString(value.appData, "APPDATA");
  environment.LOCALAPPDATA = exactString(value.localAppData, "LOCALAPPDATA");
  environment.TEMP = exactString(value.temp, "TEMP");
  environment.TMP = value.temp;
  environment.NPM_CONFIG_USERCONFIG = exactString(value.userConfig, "user config");
  environment.NPM_CONFIG_GLOBALCONFIG = exactString(value.globalConfig, "global config");
  environment.NPM_CONFIG_CACHE = exactString(value.cache, "cache");
  environment.NPM_CONFIG_LOGS_DIR = exactString(value.logs, "logs");
  return Object.freeze(environment);
}

export function assertSterileNpmEnvironment(environment) {
  if (typeof environment !== "object" || environment === null || Array.isArray(environment)) {
    return false;
  }
  const record = environment;
  const allowed = new Set([
    "SYSTEMROOT",
    "COMSPEC",
    "PATHEXT",
    "PATH",
    "HOME",
    "USERPROFILE",
    "APPDATA",
    "LOCALAPPDATA",
    "TEMP",
    "TMP",
    "NPM_CONFIG_USERCONFIG",
    "NPM_CONFIG_GLOBALCONFIG",
    "NPM_CONFIG_CACHE",
    "NPM_CONFIG_LOGS_DIR",
  ]);
  const normalized = new Set();
  for (const [name, value] of Object.entries(record)) {
    const key = name.toUpperCase();
    if (
      normalized.has(key) ||
      !allowed.has(key) ||
      typeof value !== "string" ||
      value.length === 0
    ) {
      return false;
    }
    normalized.add(key);
  }
  return normalized.size === allowed.size;
}

export function buildNpmProbeArguments(probe) {
  if (!NPM_CONFIGURATION_PROBES.includes(probe)) fail("unknown npm configuration probe");
  return Object.freeze(["config", "get", probe]);
}

export function buildNpmCommandPlan(identities) {
  const value = exactKeys(identities, ["cliSha256", "launcherSha256", "nodeSha256"], "identities");
  const command = (label, argumentsValue) =>
    Object.freeze({
      arguments: Object.freeze([...argumentsValue]),
      identity: fixedInvocationIdentity(
        label,
        value.nodeSha256,
        value.launcherSha256,
        value.cliSha256,
        argumentsValue,
      ),
      label,
    });
  return Object.freeze({
    audit: command("npm-audit", AUDIT_ARGUMENTS),
    probes: Object.freeze(
      NPM_CONFIGURATION_PROBES.map((probe) =>
        command(`npm-config-get-${probe}`, buildNpmProbeArguments(probe)),
      ),
    ),
    sbom: command("npm-sbom", SBOM_ARGUMENTS),
  });
}
export function assertAllowedNpmArguments(argumentsValue, kind) {
  if (!Array.isArray(argumentsValue) || argumentsValue.some((value) => typeof value !== "string")) {
    return false;
  }
  const expected =
    kind === "audit"
      ? AUDIT_ARGUMENTS
      : kind === "sbom"
        ? SBOM_ARGUMENTS
        : kind === "probe" && argumentsValue.length === 3
          ? buildNpmProbeArguments(argumentsValue[2])
          : undefined;
  return expected !== undefined && JSON.stringify(argumentsValue) === JSON.stringify(expected);
}

function exactProbeTokens(rawProbes) {
  const record = exactKeys(rawProbes, NPM_CONFIGURATION_PROBES, "npm configuration probes");
  const tokens = Object.create(null);
  for (const probe of NPM_CONFIGURATION_PROBES) {
    const token = terminalToken(record[probe], `npm config get ${probe}`);
    if (!noEmbeddedLineBreak(token)) fail(`npm config get ${probe} has multiline output`);
    tokens[probe] = token;
  }
  return Object.freeze(tokens);
}

function sourceSummary(value) {
  const record = exactKeys(
    value,
    [
      "credentialBearingInputAbsent",
      "controlledFilesEmpty",
      "projectNpmrcOnlySaveExact",
      "scopeDirectiveAbsent",
    ],
    "configuration source summary",
  );
  return Object.freeze({
    credentialBearingInputAbsent: record.credentialBearingInputAbsent === true,
    controlledFilesEmpty: record.controlledFilesEmpty === true,
    projectNpmrcOnlySaveExact: record.projectNpmrcOnlySaveExact === true,
    scopeDirectiveAbsent: record.scopeDirectiveAbsent === true,
  });
}

export function summarizeConfigurationProbes(rawProbes, sources) {
  const tokens = exactProbeTokens(rawProbes);
  const source = sourceSummary(sources);
  const userconfigVerified = tokens.userconfig.length > 0;
  const globalconfigVerified = tokens.globalconfig.length > 0;
  const workspaceSelectorAbsent = tokens.workspace === "";
  const workspacesUnsetDefault = tokens.workspaces === "null";
  const workspaceSelectionInactive =
    workspaceSelectorAbsent && workspacesUnsetDefault && source.scopeDirectiveAbsent;
  const result = Object.freeze({
    allowlistVersion: NDQA003_WINDOWS_EVIDENCE_ENVIRONMENT_ALLOWLIST_VERSION,
    credentialBearingInputAbsent: source.credentialBearingInputAbsent,
    controlledConfigEmpty: source.controlledFilesEmpty,
    effectiveRegistryMatches: tokens.registry === NDQA003_WINDOWS_EVIDENCE_REGISTRY,
    globalconfigVerified,
    networkModeOnline: tokens.offline === "false" && tokens["prefer-offline"] === "false",
    noScopeReduction:
      tokens.omit === "" &&
      tokens.production === "false" &&
      tokens["package-lock"] === "true" &&
      workspaceSelectionInactive,
    probeSetVersion: NDQA003_WINDOWS_EVIDENCE_PROBE_SET_VERSION,
    projectNpmrcOnlySaveExact: source.projectNpmrcOnlySaveExact,
    proxiesAbsent: tokens.proxy === "null" && tokens["https-proxy"] === "null",
    userconfigVerified,
    workspaceSelectionInactive,
  });
  return Object.freeze({
    ...result,
    ok:
      result.credentialBearingInputAbsent &&
      result.controlledConfigEmpty &&
      result.effectiveRegistryMatches &&
      result.globalconfigVerified &&
      result.networkModeOnline &&
      result.noScopeReduction &&
      result.projectNpmrcOnlySaveExact &&
      result.proxiesAbsent &&
      result.userconfigVerified,
  });
}

function parseJsonIfPossible(text) {
  if (text.length === 0) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function classifyNegativeAudit(result) {
  const value = exactKeys(result, ["exitCode", "stderr", "stdout"], "negative audit result");
  if (!Number.isInteger(value.exitCode) || value.exitCode === 0) {
    return Object.freeze({ classified: false, exitClass: "UNCLASSIFIED" });
  }
  const stdout = exactString(value.stdout, "negative audit stdout");
  const stderr = exactString(value.stderr, "negative audit stderr");
  if (stdout !== "" || stderr.length === 0) {
    return Object.freeze({ classified: false, exitClass: "UNCLASSIFIED" });
  }
  if (
    parseJsonIfPossible(stderr) !== undefined ||
    /\b(?:cache(?:d)?|partial|auditReportVersion|vulnerabilities|metadata)\b/iu.test(stderr)
  ) {
    return Object.freeze({ classified: false, exitClass: "UNCLASSIFIED" });
  }
  const code =
    /\b(?:ENETUNREACH|ENETDOWN|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT)\b/u.test(
      stderr,
    );
  return Object.freeze({
    classified: code,
    exitClass: code ? "EXPECTED_NETWORK_UNAVAILABLE" : "UNCLASSIFIED",
  });
}
function rawBytes(value, label) {
  if (Buffer.isBuffer(value)) return Buffer.from(value);
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === "string") return Buffer.from(value, "utf8");
  fail(`${label} must be raw bytes`);
}

function strictUtf8(bytes, label) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail(`${label} is not UTF-8`);
  }
}

function declaredLicenseCategory(value) {
  if (value === undefined || value === null) return "missing";
  if (typeof value !== "string") return "malformed";
  if (value.length === 0) return "empty";
  if (value === "NOASSERTION") return "noAssertion";
  if (/\s{2,}|[\r\n]/u.test(value) || !/^[A-Za-z0-9.+()\- /:]+$/u.test(value)) return "malformed";
  if (/^(?:unknown|none)$/iu.test(value)) return "unknown";
  return "declared";
}

function packageNameFromPath(path, entry) {
  if (path === "") return exactString(entry.name, "lockfile root name");
  const segments = path.split("/");
  const marker = segments.lastIndexOf("node_modules");
  if (marker < 0 || marker + 1 >= segments.length) fail("lockfile package path is unsupported");
  if (segments[marker + 1].startsWith("@")) {
    if (marker + 2 >= segments.length) fail("lockfile scoped package path is incomplete");
    return `${segments[marker + 1]}/${segments[marker + 2]}`;
  }
  return segments[marker + 1];
}

function resolveLockDependencyPath(parentPath, dependencyName, packages) {
  let current = parentPath;
  for (;;) {
    const candidate =
      current === ""
        ? `node_modules/${dependencyName}`
        : `${current}/node_modules/${dependencyName}`;
    if (Object.hasOwn(packages, candidate)) return candidate;
    if (current === "") return undefined;
    const nestedMarker = current.lastIndexOf("/node_modules/");
    current = nestedMarker < 0 ? "" : current.slice(0, nestedMarker);
  }
}

function stringArray(value, label) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string"))
    fail(`${label} is invalid`);
  if (new Set(value).size !== value.length) fail(`${label} has duplicate values`);
  return value;
}

function isExplicitOptionalPeerDependency(entry, name) {
  if (entry.peerDependenciesMeta === undefined) return false;
  const metadata = plainRecord(entry.peerDependenciesMeta, "peer dependency metadata");
  if (!Object.hasOwn(metadata, name)) return false;
  const dependency = plainRecord(metadata[name], `peer dependency metadata ${name}`);
  return dependency.optional === true;
}

export function deriveLockfileGraph(lockfile) {
  const value = plainRecord(lockfile, "lockfile");
  if (value.lockfileVersion !== 3) fail("lockfile version is unsupported");
  const packages = plainRecord(value.packages, "lockfile packages");
  if (!Object.hasOwn(packages, "")) fail("lockfile root package is missing");
  const root = plainRecord(packages[""], "lockfile root package");
  const rootDirect = new Set();
  for (const field of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    if (root[field] === undefined) continue;
    const dependencies = plainRecord(root[field], `lockfile root ${field}`);
    for (const name of Object.keys(dependencies)) rootDirect.add(name);
  }
  const paths = Object.keys(packages).sort();
  const keyByPath = new Map();
  const keys = new Set();
  const categoryKeys = {
    development: new Set(),
    optional: new Set(),
    peer: new Set(),
    production: new Set(),
    transitive: new Set(),
  };
  for (const path of paths) {
    const entry = plainRecord(packages[path], `lockfile package ${path}`);
    const name = packageNameFromPath(path, entry);
    const version = exactString(entry.version, `lockfile package ${name} version`);
    const key = `${name}\u0000${version}`;
    if (keys.has(key)) fail("lockfile name/version identity is ambiguous");
    keys.add(key);
    keyByPath.set(path, key);
    if (entry.dev !== true) categoryKeys.production.add(key);
    if (entry.dev === true || entry.devOptional === true) categoryKeys.development.add(key);
    if (entry.optional === true || entry.devOptional === true) categoryKeys.optional.add(key);
    if (entry.peer === true) categoryKeys.peer.add(key);
    if (path !== "" && !rootDirect.has(name)) categoryKeys.transitive.add(key);
  }
  const relationships = new Set();
  for (const path of paths) {
    const entry = plainRecord(packages[path], `lockfile package ${path}`);
    for (const field of [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
    ]) {
      if (entry[field] === undefined) continue;
      const dependencies = plainRecord(entry[field], `lockfile package ${path} ${field}`);
      for (const name of Object.keys(dependencies).sort()) {
        const childPath = resolveLockDependencyPath(path, name, packages);
        if (childPath === undefined) {
          if (field === "peerDependencies" && isExplicitOptionalPeerDependency(entry, name))
            continue;
          fail("lockfile dependency relationship is unresolved");
        }
        relationships.add(
          `${keyByPath.get(path)}\u0000DEPENDS_ON\u0000${keyByPath.get(childPath)}`,
        );
      }
    }
  }
  return Object.freeze({
    categoryKeys: Object.freeze(
      Object.fromEntries(
        Object.entries(categoryKeys).map(([name, values]) => [
          name,
          Object.freeze([...values].sort()),
        ]),
      ),
    ),
    expectedEntries: keys.size,
    packageKeys: Object.freeze([...keys].sort()),
    relationshipKeys: Object.freeze([...relationships].sort()),
    rootKey: keyByPath.get(""),
  });
}

function expectedGraph(value) {
  const graph = exactKeys(
    value,
    ["categoryKeys", "expectedEntries", "packageKeys", "relationshipKeys", "rootKey"],
    "expected lockfile graph",
  );
  if (!Number.isSafeInteger(graph.expectedEntries) || graph.expectedEntries <= 0)
    fail("expected lockfile graph has invalid count");
  const packageKeys = stringArray(graph.packageKeys, "expected package keys");
  const relationshipKeys = stringArray(graph.relationshipKeys, "expected relationship keys");
  if (packageKeys.length !== graph.expectedEntries || !packageKeys.includes(graph.rootKey)) {
    fail("expected lockfile graph is incomplete");
  }
  const categoryKeys = exactKeys(
    graph.categoryKeys,
    ["development", "optional", "peer", "production", "transitive"],
    "expected category keys",
  );
  for (const key of Object.values(categoryKeys).flat()) {
    if (!packageKeys.includes(key)) fail("expected category key is not a package key");
  }
  return Object.freeze({
    categoryKeys: Object.freeze(
      Object.fromEntries(
        Object.entries(categoryKeys).map(([name, keys]) => [
          name,
          stringArray(keys, `${name} category keys`),
        ]),
      ),
    ),
    expectedEntries: graph.expectedEntries,
    packageKeys,
    relationshipKeys,
    rootKey: exactString(graph.rootKey, "expected root key"),
  });
}

export function summarizeSpdxSbom(rawOutput, expected) {
  const bytes = rawBytes(rawOutput, "SPDX output");
  const graph = expectedGraph(expected);
  let document;
  try {
    document = JSON.parse(strictUtf8(bytes, "SPDX output"));
  } catch {
    return Object.freeze({ exitClass: "MALFORMED", schemaValid: false });
  }
  if (typeof document !== "object" || document === null || Array.isArray(document)) {
    return Object.freeze({ exitClass: "MALFORMED", schemaValid: false });
  }
  const packages = Array.isArray(document.packages) ? document.packages : [];
  const relationships = Array.isArray(document.relationships) ? document.relationships : [];
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
  const spdxToKey = new Map();
  const seenKeys = new Set();
  let rootCategory;
  for (const entry of packages) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      Array.isArray(entry) ||
      typeof entry.SPDXID !== "string" ||
      typeof entry.name !== "string" ||
      typeof entry.versionInfo !== "string" ||
      !Object.hasOwn(entry, "licenseDeclared")
    ) {
      counts.unmappable += 1;
      continue;
    }
    const key = `${entry.name}\u0000${entry.versionInfo}`;
    if (!graph.packageKeys.includes(key)) {
      counts.unmappable += 1;
      continue;
    }
    if (seenKeys.has(key) || spdxToKey.has(entry.SPDXID)) {
      counts.ambiguous += 1;
      continue;
    }
    seenKeys.add(key);
    spdxToKey.set(entry.SPDXID, key);
    const category = declaredLicenseCategory(entry.licenseDeclared);
    counts[category] += 1;
    if (key === graph.rootKey) rootCategory = category;
  }
  const rootPresent =
    Array.isArray(document.documentDescribes) &&
    document.documentDescribes.some((id) => spdxToKey.get(id) === graph.rootKey);
  const observedRelationships = new Set();
  let malformedRelationship = false;
  for (const relation of relationships) {
    if (
      typeof relation !== "object" ||
      relation === null ||
      Array.isArray(relation) ||
      relation.relationshipType !== "DEPENDS_ON" ||
      typeof relation.spdxElementId !== "string" ||
      typeof relation.relatedSpdxElement !== "string"
    ) {
      malformedRelationship = true;
      continue;
    }
    const left = spdxToKey.get(relation.spdxElementId);
    const right = spdxToKey.get(relation.relatedSpdxElement);
    if (left === undefined || right === undefined) {
      malformedRelationship = true;
      continue;
    }
    observedRelationships.add(`${left}\u0000DEPENDS_ON\u0000${right}`);
  }
  const coverage = Object.freeze({
    categories: Object.freeze(
      Object.fromEntries(
        Object.entries(graph.categoryKeys).map(([name, keys]) => [
          name,
          Object.freeze({
            expected: keys.length,
            observed: keys.filter((key) => seenKeys.has(key)).length,
          }),
        ]),
      ),
    ),
    packagesExpected: graph.packageKeys.length,
    packagesObserved: seenKeys.size,
    relationshipsExpected: graph.relationshipKeys.length,
    relationshipsObserved: observedRelationships.size,
    rootPresent,
  });
  const completeGraph =
    document.spdxVersion === "SPDX-2.3" &&
    rootPresent &&
    !malformedRelationship &&
    counts.unmappable === 0 &&
    counts.ambiguous === 0 &&
    seenKeys.size === graph.packageKeys.length &&
    observedRelationships.size === graph.relationshipKeys.length &&
    graph.relationshipKeys.every((key) => observedRelationships.has(key));
  return Object.freeze({
    completeGraph,
    coverage,
    declaredLicenseCounts: Object.freeze(counts),
    exitClass: completeGraph ? "COMPLETE" : "INCOMPLETE",
    rawByteLength: bytes.length,
    rawSha256: sha256(bytes),
    rootDeclarationCategory: rootCategory ?? "unmappable",
    schemaValid: document.spdxVersion === "SPDX-2.3" && Array.isArray(document.documentDescribes),
  });
}

export function classifyDeclarationFixture(summary, expectedCategory) {
  if (!["missing", "noAssertion", "malformed"].includes(expectedCategory))
    fail("unsupported declaration fixture category");
  if (
    summary === undefined ||
    typeof summary !== "object" ||
    summary.rootDeclarationCategory === undefined
  ) {
    return Object.freeze({ classification: "UNVERIFIED", verified: false });
  }
  return Object.freeze({
    classification:
      summary.rootDeclarationCategory === expectedCategory
        ? expectedCategory.toUpperCase()
        : "UNVERIFIED",
    verified: summary.rootDeclarationCategory === expectedCategory,
  });
}

export function compareRawSbom(first, second) {
  const firstBytes = rawBytes(first, "first SBOM");
  const secondBytes = rawBytes(second, "second SBOM");
  if (firstBytes.equals(secondBytes)) {
    return Object.freeze({
      determinism: "PASS",
      rawEqual: true,
      semanticComparable: true,
      semanticEqual: true,
    });
  }
  let left;
  let right;
  try {
    left = JSON.parse(strictUtf8(firstBytes, "first SBOM"));
    right = JSON.parse(strictUtf8(secondBytes, "second SBOM"));
  } catch {
    return Object.freeze({
      determinism: "NOT VERIFIED",
      rawEqual: false,
      semanticComparable: false,
      semanticEqual: false,
    });
  }
  for (const value of [left, right]) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return Object.freeze({
        determinism: "NOT VERIFIED",
        rawEqual: false,
        semanticComparable: false,
        semanticEqual: false,
      });
    }
    delete value.documentNamespace;
    if (typeof value.creationInfo === "object" && value.creationInfo !== null)
      delete value.creationInfo.created;
  }
  return Object.freeze({
    determinism: "NOT VERIFIED",
    rawEqual: false,
    semanticComparable: true,
    semanticEqual: JSON.stringify(left) === JSON.stringify(right),
  });
}
export function validateFirewallSnapshot(snapshot) {
  const value = exactKeys(
    snapshot,
    [
      "activeRulePresent",
      "allProfilesEnabled",
      "firewallProgramIdentityMatched",
      "firewallScopeVerified",
      "persistentRulePresent",
      "profileStateRecheckPassed",
      "ruleEffectiveForActiveProfiles",
      "runtimeCollisionAbsent",
    ],
    "firewall snapshot",
  );
  return Object.freeze({
    activeRulePresent: value.activeRulePresent === true,
    allProfilesEnabled: value.allProfilesEnabled === true,
    firewallProgramIdentityMatched: value.firewallProgramIdentityMatched === true,
    firewallScopeVerified: value.firewallScopeVerified === true,
    persistentRulePresent: value.persistentRulePresent === true,
    profileStateRecheckPassed: value.profileStateRecheckPassed === true,
    ruleEffectiveForActiveProfiles: value.ruleEffectiveForActiveProfiles === true,
    runtimeCollisionAbsent: value.runtimeCollisionAbsent === true,
    verified:
      value.activeRulePresent === true &&
      value.allProfilesEnabled === true &&
      value.firewallProgramIdentityMatched === true &&
      value.firewallScopeVerified === true &&
      value.persistentRulePresent === true &&
      value.profileStateRecheckPassed === true &&
      value.ruleEffectiveForActiveProfiles === true &&
      value.runtimeCollisionAbsent === true,
  });
}

function phaseCommand(phase, identities) {
  const values = exactKeys(identities, ["audit", "sbom"], "phase command identities");
  if (!/^[0-9a-f]{64}$/u.test(values.audit) || !/^[0-9a-f]{64}$/u.test(values.sbom)) {
    fail("phase command identities must be SHA-256 values");
  }
  return phase === "negative-audit" || phase === "positive-audit" ? values.audit : values.sbom;
}

export function createPhaseLedger(identities) {
  return Object.freeze(
    EVIDENCE_PHASES.map((phase) =>
      Object.freeze({
        phase,
        commandIdentity: phaseCommand(phase, identities),
        exitClass: NOT_RUN_PRECONDITION_FAILED,
        freshInvocationState: false,
        freshCacheEmpty: false,
      }),
    ),
  );
}

export function recordPhase(
  ledger,
  phase,
  exitClass,
  freshInvocationState = true,
  freshCacheEmpty = true,
) {
  if (!EVIDENCE_PHASES.includes(phase) || typeof exitClass !== "string" || exitClass.length === 0) {
    fail("phase record is invalid");
  }
  if (!Array.isArray(ledger) || ledger.length !== EVIDENCE_PHASES.length) {
    fail("phase ledger has an invalid length");
  }
  const expectedIndex = ledger.findIndex(
    (entry) => entry.exitClass === NOT_RUN_PRECONDITION_FAILED,
  );
  const index = EVIDENCE_PHASES.indexOf(phase);
  if (expectedIndex !== index || ledger[index].phase !== phase) {
    fail("phase records must start once in canonical order");
  }
  if (exitClass === NOT_RUN_PRECONDITION_FAILED) fail("started phase cannot be not-run");
  if (freshInvocationState !== true || freshCacheEmpty !== true) {
    fail("started phase must prove fresh private npm state");
  }
  return Object.freeze(
    ledger.map((entry, entryIndex) =>
      entryIndex === index
        ? Object.freeze({ ...entry, exitClass, freshInvocationState, freshCacheEmpty })
        : Object.freeze({ ...entry }),
    ),
  );
}

export function stopRemainingPhases(ledger) {
  if (!Array.isArray(ledger) || ledger.length !== EVIDENCE_PHASES.length)
    fail("phase ledger is invalid");
  return Object.freeze(ledger.map((entry) => Object.freeze({ ...entry })));
}

export function assertCompletePhaseLedger(ledger) {
  if (!Array.isArray(ledger) || ledger.length !== EVIDENCE_PHASES.length) return false;
  return ledger.every((entry, index) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      entry.phase !== EVIDENCE_PHASES[index] ||
      !/^[0-9a-f]{64}$/u.test(entry.commandIdentity) ||
      typeof entry.exitClass !== "string" ||
      entry.exitClass.length === 0
    ) {
      return false;
    }
    return entry.exitClass !== "UNCLASSIFIED";
  });
}

function booleanRecord(value, fields, label) {
  const record = exactKeys(value, fields, label);
  const output = Object.create(null);
  for (const field of fields) {
    if (typeof record[field] !== "boolean") fail(`${label}.${field} must be boolean`);
    output[field] = record[field];
  }
  return Object.freeze(output);
}

function readBoolean(record, field, label) {
  if (record[field] !== true && record[field] !== false) fail(`${label}.${field} must be boolean`);
  return record[field];
}

function shaOrNotAvailable(value, label) {
  return value === "NOT AVAILABLE" ? value : exactSha256(value, label);
}

function sha1OrNotAvailable(value, label) {
  return value === "NOT AVAILABLE" ? value : exactSha1(value, label);
}

function nonnegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) fail(`${label} is invalid`);
  return value;
}

function allowedText(value, values, label) {
  if (typeof value !== "string" || !values.includes(value)) fail(`${label} is unsupported`);
  return value;
}

function safeUtc(value, label) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(value)
  ) {
    fail(`${label} is not a UTC timestamp`);
  }
  return value;
}

const RECEIPT_STATUSES = Object.freeze(["PASS", "FAIL", "BLOCKED", "NOT VERIFIED"]);
const PHASE_EXIT_CLASSES = Object.freeze([
  NOT_RUN_PRECONDITION_FAILED,
  "EXPECTED_NETWORK_UNAVAILABLE",
  "COMPLETE",
  "COMPLETE_NO_THRESHOLD_FINDING",
  "COMPLETE_THRESHOLD_FINDING",
  "DECLARATION_MISSING",
  "DECLARATION_EMPTY",
  "DECLARATION_MALFORMED",
  "DECLARATION_NOASSERTION",
  "DECLARATION_UNKNOWN",
  "EXECUTION_FAILED",
]);
const LIFECYCLE_CLASSES = Object.freeze(["NEGATIVE_AUDIT", "SBOM_AND_FIXTURES"]);

function safeLifecycle(value, label) {
  const record = exactKeys(
    value,
    [
      "ruleLifecycleClass",
      "persistentRuleAbsentBefore",
      "activeRuleAbsentBefore",
      "firewallRuleCreated",
      "firewallRuleActive",
      "allProfilesEnabledDuringLifecycle",
      "profileStateRecheckPassed",
      "ruleEffectiveForActiveProfiles",
      "firewallProgramIdentityMatched",
      "firewallScopeVerified",
      "runtimeCollisionAbsent",
      "persistentRuleAbsentAfter",
      "activeRuleAbsentAfter",
      "ruleIdentitySha256",
    ],
    label,
  );
  return Object.freeze({
    ruleLifecycleClass: allowedText(
      record.ruleLifecycleClass,
      LIFECYCLE_CLASSES,
      `${label}.ruleLifecycleClass`,
    ),
    persistentRuleAbsentBefore: readBoolean(record, "persistentRuleAbsentBefore", label),
    activeRuleAbsentBefore: readBoolean(record, "activeRuleAbsentBefore", label),
    firewallRuleCreated: readBoolean(record, "firewallRuleCreated", label),
    firewallRuleActive: readBoolean(record, "firewallRuleActive", label),
    allProfilesEnabledDuringLifecycle: readBoolean(
      record,
      "allProfilesEnabledDuringLifecycle",
      label,
    ),
    profileStateRecheckPassed: readBoolean(record, "profileStateRecheckPassed", label),
    ruleEffectiveForActiveProfiles: readBoolean(record, "ruleEffectiveForActiveProfiles", label),
    firewallProgramIdentityMatched: readBoolean(record, "firewallProgramIdentityMatched", label),
    firewallScopeVerified: readBoolean(record, "firewallScopeVerified", label),
    runtimeCollisionAbsent: readBoolean(record, "runtimeCollisionAbsent", label),
    persistentRuleAbsentAfter: readBoolean(record, "persistentRuleAbsentAfter", label),
    activeRuleAbsentAfter: readBoolean(record, "activeRuleAbsentAfter", label),
    ruleIdentitySha256: shaOrNotAvailable(record.ruleIdentitySha256, `${label}.ruleIdentitySha256`),
  });
}

function safePhaseLedger(value) {
  if (!Array.isArray(value) || value.length !== EVIDENCE_PHASES.length)
    fail("receipt phase ledger is incomplete");
  return Object.freeze(
    value.map((entry, index) => {
      const record = exactKeys(
        entry,
        ["phase", "commandIdentity", "exitClass", "freshInvocationState", "freshCacheEmpty"],
        `receipt phase ${index}`,
      );
      if (record.phase !== EVIDENCE_PHASES[index]) fail("receipt phase order is invalid");
      return Object.freeze({
        phase: record.phase,
        commandIdentity: shaOrNotAvailable(
          record.commandIdentity,
          `receipt phase ${record.phase} command identity`,
        ),
        exitClass: allowedText(
          record.exitClass,
          PHASE_EXIT_CLASSES,
          `receipt phase ${record.phase} exit class`,
        ),
        freshInvocationState: readBoolean(
          record,
          "freshInvocationState",
          `receipt phase ${record.phase}`,
        ),
        freshCacheEmpty: readBoolean(record, "freshCacheEmpty", `receipt phase ${record.phase}`),
      });
    }),
  );
}

function safeSeverityCounts(value) {
  const record = exactKeys(
    value,
    ["info", "low", "moderate", "high", "critical", "total"],
    "audit severity counts",
  );
  const output = Object.create(null);
  for (const name of ["info", "low", "moderate", "high", "critical", "total"])
    output[name] = nonnegativeInteger(record[name], `audit severity ${name}`);
  return Object.freeze(output);
}

function safeSbomRun(value, label) {
  const record = exactKeys(
    value,
    [
      "completeGraph",
      "exitClass",
      "rawByteLength",
      "rawSha256",
      "coverage",
      "declaredLicenseCounts",
    ],
    label,
  );
  const coverage = exactKeys(
    record.coverage,
    [
      "packagesExpected",
      "packagesObserved",
      "relationshipsExpected",
      "relationshipsObserved",
      "rootPresent",
      "categories",
    ],
    `${label}.coverage`,
  );
  const categories = exactKeys(
    coverage.categories,
    ["production", "development", "optional", "peer", "transitive"],
    `${label}.categories`,
  );
  const safeCategories = Object.create(null);
  for (const name of ["production", "development", "optional", "peer", "transitive"]) {
    const category = exactKeys(categories[name], ["expected", "observed"], `${label}.${name}`);
    safeCategories[name] = Object.freeze({
      expected: nonnegativeInteger(category.expected, `${label}.${name}.expected`),
      observed: nonnegativeInteger(category.observed, `${label}.${name}.observed`),
    });
  }
  const declarations = exactKeys(
    record.declaredLicenseCounts,
    [
      "missing",
      "empty",
      "malformed",
      "noAssertion",
      "unknown",
      "declared",
      "unmappable",
      "ambiguous",
    ],
    `${label}.declarations`,
  );
  const safeDeclarations = Object.create(null);
  for (const name of [
    "missing",
    "empty",
    "malformed",
    "noAssertion",
    "unknown",
    "declared",
    "unmappable",
    "ambiguous",
  ])
    safeDeclarations[name] = nonnegativeInteger(declarations[name], `${label}.${name}`);
  return Object.freeze({
    completeGraph: readBoolean(record, "completeGraph", label),
    exitClass: allowedText(record.exitClass, ["COMPLETE", "INCOMPLETE"], `${label}.exitClass`),
    rawByteLength: nonnegativeInteger(record.rawByteLength, `${label}.rawByteLength`),
    rawSha256: shaOrNotAvailable(record.rawSha256, `${label}.rawSha256`),
    coverage: Object.freeze({
      packagesExpected: nonnegativeInteger(
        coverage.packagesExpected,
        `${label}.coverage.packagesExpected`,
      ),
      packagesObserved: nonnegativeInteger(
        coverage.packagesObserved,
        `${label}.coverage.packagesObserved`,
      ),
      relationshipsExpected: nonnegativeInteger(
        coverage.relationshipsExpected,
        `${label}.coverage.relationshipsExpected`,
      ),
      relationshipsObserved: nonnegativeInteger(
        coverage.relationshipsObserved,
        `${label}.coverage.relationshipsObserved`,
      ),
      rootPresent: readBoolean(coverage, "rootPresent", `${label}.coverage`),
      categories: Object.freeze(safeCategories),
    }),
    declaredLicenseCounts: Object.freeze(safeDeclarations),
  });
}

function expectedCommandIdentity(label, toolchain, argumentsValue) {
  return fixedInvocationIdentity(
    label,
    toolchain.nodeSha256,
    toolchain.npmCmdSha256,
    toolchain.npmCliSha256,
    argumentsValue,
  );
}

function expectedPhaseCommandIdentity(phase, toolchain) {
  return expectedCommandIdentity(
    phase === "negative-audit" || phase === "positive-audit" ? "npm-audit" : "npm-sbom",
    toolchain,
    phase === "negative-audit" || phase === "positive-audit" ? AUDIT_ARGUMENTS : SBOM_ARGUMENTS,
  );
}

function isCompletePassLedger(ledger, toolchain) {
  return (
    ledger.every(
      (entry) =>
        entry.commandIdentity === expectedPhaseCommandIdentity(entry.phase, toolchain) &&
        entry.freshInvocationState &&
        entry.freshCacheEmpty,
    ) &&
    ledger[0].exitClass === "EXPECTED_NETWORK_UNAVAILABLE" &&
    ledger[1].exitClass === "COMPLETE" &&
    ledger[2].exitClass === "COMPLETE" &&
    ledger[3].exitClass === "DECLARATION_MISSING" &&
    ledger[4].exitClass === "DECLARATION_NOASSERTION" &&
    ledger[5].exitClass === "DECLARATION_MALFORMED" &&
    ledger[6].exitClass === "COMPLETE_NO_THRESHOLD_FINDING"
  );
}

function allTrue(record) {
  return Object.values(record).every((value) => value === true);
}

function hasCompleteCoverage(run) {
  if (
    run.completeGraph !== true ||
    run.exitClass !== "COMPLETE" ||
    run.rawByteLength <= 0 ||
    run.rawSha256 === "NOT AVAILABLE" ||
    run.coverage.rootPresent !== true
  ) {
    return false;
  }
  if (
    run.coverage.packagesExpected !== run.coverage.packagesObserved ||
    run.coverage.relationshipsExpected !== run.coverage.relationshipsObserved
  ) {
    return false;
  }
  if (
    !Object.values(run.coverage.categories).every(
      (category) => category.expected === category.observed,
    )
  ) {
    return false;
  }
  return (
    Object.values(run.declaredLicenseCounts).reduce((sum, count) => sum + count, 0) ===
    run.coverage.packagesObserved
  );
}

function hasConsistentSeverityCounts(severityCounts) {
  return (
    severityCounts.total ===
    severityCounts.info +
      severityCounts.low +
      severityCounts.moderate +
      severityCounts.high +
      severityCounts.critical
  );
}

function verifiedLifecycle(lifecycle) {
  return (
    lifecycle.ruleIdentitySha256 !== "NOT AVAILABLE" &&
    Object.entries(lifecycle)
      .filter(([name]) => name !== "ruleLifecycleClass" && name !== "ruleIdentitySha256")
      .every(([, value]) => value === true)
  );
}

export function buildSanitizedReceipt(input) {
  const value = exactKeys(
    input,
    [
      "schema",
      "procedureVersion",
      "status",
      "startedAtUtc",
      "finishedAtUtc",
      "platform",
      "toolchain",
      "ingress",
      "checkout",
      "configuration",
      "firewall",
      "phases",
      "audit",
      "sbom",
      "custody",
    ],
    "Windows evidence receipt",
  );
  const platform = exactKeys(
    value.platform,
    [
      "osFamilyWindows",
      "hostArchitecture",
      "processArchitecture",
      "processPlatform",
      "nativeArm64",
    ],
    "receipt platform",
  );
  const toolchain = exactKeys(
    value.toolchain,
    [
      "node",
      "npm",
      "nodeSha256",
      "npmCmdSha256",
      "npmCliSha256",
      "nodeVersionCommandIdentity",
      "npmVersionCommandIdentity",
      "nodeVersionMatched",
      "npmVersionMatched",
      "runtimeProvenanceMatched",
      "npmCmdBindingMatched",
      "launcherNodeIdentityMatched",
    ],
    "receipt toolchain",
  );
  const ingress = exactKeys(value.ingress, ["attestationSha256"], "receipt ingress");
  const checkout = exactKeys(
    value.checkout,
    ["commit", "tree", "packageLockSha256", "projectNpmrcSha256"],
    "receipt checkout",
  );
  const configuration = exactKeys(
    value.configuration,
    [
      "allowlistVersion",
      "probeSetVersion",
      "probeSetExitClass",
      "credentialBearingInputAbsent",
      "controlledConfigEmpty",
      "effectiveRegistryMatches",
      "networkModeOnline",
      "noScopeReduction",
      "proxiesAbsent",
      "workspaceSelectionInactive",
    ],
    "receipt configuration",
  );
  const firewall = exactKeys(
    value.firewall,
    ["recoveryChecked", "recoveryCompletedWhenNeeded", "ruleA", "ruleB"],
    "receipt firewall",
  );
  const custody = booleanRecord(
    value.custody,
    [
      "repositoryUnchanged",
      "untrackedStateEmpty",
      "noNodeModules",
      "cleanupVerified",
      "sanitizedReceiptOnly",
    ],
    "receipt custody",
  );
  const phases = safePhaseLedger(value.phases);
  const audit =
    value.audit === "NOT AVAILABLE"
      ? "NOT AVAILABLE"
      : (() => {
          const record = exactKeys(
            value.audit,
            ["complete", "exitClass", "rawByteLength", "rawSha256", "severityCounts"],
            "receipt audit",
          );
          return Object.freeze({
            complete: readBoolean(record, "complete", "receipt audit"),
            exitClass: allowedText(
              record.exitClass,
              ["COMPLETE_NO_THRESHOLD_FINDING", "COMPLETE_THRESHOLD_FINDING"],
              "receipt audit exit class",
            ),
            rawByteLength: nonnegativeInteger(
              record.rawByteLength,
              "receipt audit raw byte length",
            ),
            rawSha256: shaOrNotAvailable(record.rawSha256, "receipt audit raw hash"),
            severityCounts: safeSeverityCounts(record.severityCounts),
          });
        })();
  const sbom =
    value.sbom === "NOT AVAILABLE"
      ? "NOT AVAILABLE"
      : (() => {
          const record = exactKeys(
            value.sbom,
            ["determinism", "rawEqual", "semanticComparable", "semanticEqual", "first", "second"],
            "receipt SBOM",
          );
          return Object.freeze({
            determinism: allowedText(
              record.determinism,
              ["PASS", "NOT VERIFIED"],
              "receipt SBOM determinism",
            ),
            rawEqual: readBoolean(record, "rawEqual", "receipt SBOM"),
            semanticComparable: readBoolean(record, "semanticComparable", "receipt SBOM"),
            semanticEqual: readBoolean(record, "semanticEqual", "receipt SBOM"),
            first: safeSbomRun(record.first, "receipt first SBOM"),
            second: safeSbomRun(record.second, "receipt second SBOM"),
          });
        })();
  const receipt = Object.freeze({
    schema: allowedText(value.schema, [NDQA003_WINDOWS_EVIDENCE_RECEIPT_SCHEMA], "receipt schema"),
    procedureVersion: allowedText(
      value.procedureVersion,
      [NDQA003_WINDOWS_EVIDENCE_PROCEDURE_VERSION],
      "receipt procedure version",
    ),
    status: allowedText(value.status, RECEIPT_STATUSES, "receipt status"),
    startedAtUtc: safeUtc(value.startedAtUtc, "receipt start time"),
    finishedAtUtc: safeUtc(value.finishedAtUtc, "receipt finish time"),
    platform: Object.freeze({
      osFamilyWindows: readBoolean(platform, "osFamilyWindows", "receipt platform"),
      hostArchitecture: allowedText(
        platform.hostArchitecture,
        ["arm64", "NOT AVAILABLE"],
        "receipt host architecture",
      ),
      processArchitecture: allowedText(
        platform.processArchitecture,
        ["arm64", "NOT AVAILABLE"],
        "receipt process architecture",
      ),
      processPlatform: allowedText(
        platform.processPlatform,
        ["win32", "NOT AVAILABLE"],
        "receipt process platform",
      ),
      nativeArm64: readBoolean(platform, "nativeArm64", "receipt platform"),
    }),
    toolchain: Object.freeze({
      node: allowedText(
        toolchain.node,
        [NDQA003_WINDOWS_EVIDENCE_NODE_VERSION, "NOT AVAILABLE"],
        "receipt Node version",
      ),
      npm: allowedText(
        toolchain.npm,
        [NDQA003_WINDOWS_EVIDENCE_NPM_VERSION, "NOT AVAILABLE"],
        "receipt npm version",
      ),
      nodeSha256: shaOrNotAvailable(toolchain.nodeSha256, "receipt node hash"),
      npmCmdSha256: shaOrNotAvailable(toolchain.npmCmdSha256, "receipt npm.cmd hash"),
      npmCliSha256: shaOrNotAvailable(toolchain.npmCliSha256, "receipt npm CLI hash"),
      nodeVersionCommandIdentity: shaOrNotAvailable(
        toolchain.nodeVersionCommandIdentity,
        "receipt Node version command identity",
      ),
      npmVersionCommandIdentity: shaOrNotAvailable(
        toolchain.npmVersionCommandIdentity,
        "receipt npm version command identity",
      ),
      nodeVersionMatched: readBoolean(toolchain, "nodeVersionMatched", "receipt toolchain"),
      npmVersionMatched: readBoolean(toolchain, "npmVersionMatched", "receipt toolchain"),
      runtimeProvenanceMatched: readBoolean(
        toolchain,
        "runtimeProvenanceMatched",
        "receipt toolchain",
      ),
      npmCmdBindingMatched: readBoolean(toolchain, "npmCmdBindingMatched", "receipt toolchain"),
      launcherNodeIdentityMatched: readBoolean(
        toolchain,
        "launcherNodeIdentityMatched",
        "receipt toolchain",
      ),
    }),
    ingress: Object.freeze({
      attestationSha256: shaOrNotAvailable(ingress.attestationSha256, "receipt ingress hash"),
    }),
    checkout: Object.freeze({
      commit: sha1OrNotAvailable(checkout.commit, "receipt commit"),
      tree: sha1OrNotAvailable(checkout.tree, "receipt tree"),
      packageLockSha256: shaOrNotAvailable(checkout.packageLockSha256, "receipt package lock hash"),
      projectNpmrcSha256: shaOrNotAvailable(checkout.projectNpmrcSha256, "receipt npmrc hash"),
    }),
    configuration: Object.freeze({
      allowlistVersion: allowedText(
        configuration.allowlistVersion,
        [NDQA003_WINDOWS_EVIDENCE_ENVIRONMENT_ALLOWLIST_VERSION, "NOT AVAILABLE"],
        "receipt environment allowlist version",
      ),
      probeSetVersion: allowedText(
        configuration.probeSetVersion,
        [NDQA003_WINDOWS_EVIDENCE_PROBE_SET_VERSION, "NOT AVAILABLE"],
        "receipt probe set version",
      ),
      probeSetExitClass: allowedText(
        configuration.probeSetExitClass,
        ["COMPLETE", "NOT AVAILABLE"],
        "receipt probe set exit class",
      ),
      credentialBearingInputAbsent: readBoolean(
        configuration,
        "credentialBearingInputAbsent",
        "receipt configuration",
      ),
      controlledConfigEmpty: readBoolean(
        configuration,
        "controlledConfigEmpty",
        "receipt configuration",
      ),
      effectiveRegistryMatches: readBoolean(
        configuration,
        "effectiveRegistryMatches",
        "receipt configuration",
      ),
      networkModeOnline: readBoolean(configuration, "networkModeOnline", "receipt configuration"),
      noScopeReduction: readBoolean(configuration, "noScopeReduction", "receipt configuration"),
      proxiesAbsent: readBoolean(configuration, "proxiesAbsent", "receipt configuration"),
      workspaceSelectionInactive: readBoolean(
        configuration,
        "workspaceSelectionInactive",
        "receipt configuration",
      ),
    }),
    firewall: Object.freeze({
      recoveryChecked: readBoolean(firewall, "recoveryChecked", "receipt firewall"),
      recoveryCompletedWhenNeeded: readBoolean(
        firewall,
        "recoveryCompletedWhenNeeded",
        "receipt firewall",
      ),
      ruleA: safeLifecycle(firewall.ruleA, "receipt rule A lifecycle"),
      ruleB: safeLifecycle(firewall.ruleB, "receipt rule B lifecycle"),
    }),
    phases,
    audit,
    sbom,
    custody,
  });
  if (receipt.status === "PASS") {
    const configurationPredicates = Object.freeze({
      credentialBearingInputAbsent: receipt.configuration.credentialBearingInputAbsent,
      controlledConfigEmpty: receipt.configuration.controlledConfigEmpty,
      effectiveRegistryMatches: receipt.configuration.effectiveRegistryMatches,
      networkModeOnline: receipt.configuration.networkModeOnline,
      noScopeReduction: receipt.configuration.noScopeReduction,
      proxiesAbsent: receipt.configuration.proxiesAbsent,
      workspaceSelectionInactive: receipt.configuration.workspaceSelectionInactive,
    });
    const toolchainPredicates = Object.freeze({
      nodeVersionMatched: receipt.toolchain.nodeVersionMatched,
      npmVersionMatched: receipt.toolchain.npmVersionMatched,
      runtimeProvenanceMatched: receipt.toolchain.runtimeProvenanceMatched,
      npmCmdBindingMatched: receipt.toolchain.npmCmdBindingMatched,
      launcherNodeIdentityMatched: receipt.toolchain.launcherNodeIdentityMatched,
    });
    if (
      !isCompletePassLedger(phases, receipt.toolchain) ||
      receipt.platform.osFamilyWindows !== true ||
      receipt.platform.hostArchitecture !== "arm64" ||
      receipt.platform.processArchitecture !== "arm64" ||
      receipt.platform.processPlatform !== "win32" ||
      receipt.platform.nativeArm64 !== true ||
      receipt.ingress.attestationSha256 === "NOT AVAILABLE" ||
      receipt.checkout.commit === "NOT AVAILABLE" ||
      receipt.checkout.tree === "NOT AVAILABLE" ||
      receipt.checkout.packageLockSha256 === "NOT AVAILABLE" ||
      receipt.checkout.projectNpmrcSha256 === "NOT AVAILABLE" ||
      receipt.toolchain.node !== NDQA003_WINDOWS_EVIDENCE_NODE_VERSION ||
      receipt.toolchain.npm !== NDQA003_WINDOWS_EVIDENCE_NPM_VERSION ||
      receipt.toolchain.nodeSha256 === "NOT AVAILABLE" ||
      receipt.toolchain.npmCmdSha256 === "NOT AVAILABLE" ||
      receipt.toolchain.npmCliSha256 === "NOT AVAILABLE" ||
      receipt.toolchain.nodeVersionCommandIdentity === "NOT AVAILABLE" ||
      receipt.toolchain.npmVersionCommandIdentity === "NOT AVAILABLE" ||
      receipt.toolchain.nodeVersionCommandIdentity !==
        expectedCommandIdentity("node-version", receipt.toolchain, NODE_VERSION_ARGUMENTS) ||
      receipt.toolchain.npmVersionCommandIdentity !==
        expectedCommandIdentity("npm-version", receipt.toolchain, NPM_VERSION_ARGUMENTS) ||
      !allTrue(toolchainPredicates) ||
      receipt.configuration.allowlistVersion !==
        NDQA003_WINDOWS_EVIDENCE_ENVIRONMENT_ALLOWLIST_VERSION ||
      receipt.configuration.probeSetVersion !== NDQA003_WINDOWS_EVIDENCE_PROBE_SET_VERSION ||
      receipt.configuration.probeSetExitClass !== "COMPLETE" ||
      !allTrue(configurationPredicates) ||
      receipt.firewall.recoveryChecked !== true ||
      receipt.firewall.ruleA.ruleLifecycleClass !== "NEGATIVE_AUDIT" ||
      receipt.firewall.ruleB.ruleLifecycleClass !== "SBOM_AND_FIXTURES" ||
      !verifiedLifecycle(receipt.firewall.ruleA) ||
      !verifiedLifecycle(receipt.firewall.ruleB) ||
      !allTrue(receipt.custody) ||
      audit === "NOT AVAILABLE" ||
      audit.complete !== true ||
      audit.exitClass !== "COMPLETE_NO_THRESHOLD_FINDING" ||
      audit.rawByteLength <= 0 ||
      audit.rawSha256 === "NOT AVAILABLE" ||
      audit.severityCounts.high !== 0 ||
      audit.severityCounts.critical !== 0 ||
      !hasConsistentSeverityCounts(audit.severityCounts) ||
      sbom === "NOT AVAILABLE" ||
      sbom.determinism !== "PASS" ||
      sbom.rawEqual !== true ||
      sbom.first.rawByteLength !== sbom.second.rawByteLength ||
      sbom.first.rawSha256 !== sbom.second.rawSha256 ||
      !hasCompleteCoverage(sbom.first) ||
      !hasCompleteCoverage(sbom.second)
    ) {
      fail("PASS receipt requires complete verified phase evidence");
    }
  }
  return receipt;
}

export function canonicalReceiptBytes(input) {
  const receipt = buildSanitizedReceipt(input);
  const bodyBytes = Buffer.from(JSON.stringify(receipt), "utf8");
  const envelope = Object.freeze({ receipt, bodySha256: sha256(bodyBytes) });
  const bytes = Buffer.from(`${JSON.stringify(envelope)}\n`, "utf8");
  return Object.freeze({ bytes, receipt, sha256: sha256(bytes) });
}

export function validateCanonicalReceiptBytes(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.at(-1) !== 10) return false;
  try {
    const parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    const envelope = exactKeys(parsed, ["receipt", "bodySha256"], "receipt envelope");
    const receipt = buildSanitizedReceipt(envelope.receipt);
    const bodySha256 = exactSha256(envelope.bodySha256, "receipt body hash");
    if (sha256(Buffer.from(JSON.stringify(receipt), "utf8")) !== bodySha256) return false;
    return Buffer.from(`${JSON.stringify({ receipt, bodySha256 })}\n`, "utf8").equals(bytes);
  } catch {
    return false;
  }
}
export function assertWrapperIngress(ingress, expected) {
  const payload = exactKeys(ingress, ["child", "nonce", "schema", "wrapper"], "wrapper ingress");
  const wrapper = exactKeys(
    payload.wrapper,
    ["executableSha256", "processId", "scriptSha256"],
    "wrapper ingress wrapper",
  );
  const child = exactKeys(
    payload.child,
    ["executableSha256", "launcherSha256", "processId", "workingDirectorySha256"],
    "wrapper ingress child",
  );
  const intended = exactKeys(
    expected,
    ["launcherSha256", "nodeSha256", "workingDirectorySha256", "wrapperSha256"],
    "ingress expected identities",
  );
  if (
    payload.schema !== NDQA003_WINDOWS_EVIDENCE_WRAPPER_INGRESS_SCHEMA ||
    !/^[0-9a-f]{64}$/u.test(payload.nonce) ||
    !Number.isSafeInteger(wrapper.processId) ||
    !Number.isSafeInteger(child.processId) ||
    child.processId !== process.pid ||
    wrapper.processId <= 0 ||
    exactSha256(wrapper.executableSha256, "wrapper executable hash") === "" ||
    wrapper.scriptSha256 !== intended.wrapperSha256 ||
    child.executableSha256 !== intended.nodeSha256 ||
    child.launcherSha256 !== intended.launcherSha256 ||
    child.workingDirectorySha256 !== intended.workingDirectorySha256
  ) {
    fail("wrapper ingress does not bind the approved parent and child tuple");
  }
  return Object.freeze({ nonce: payload.nonce });
}
