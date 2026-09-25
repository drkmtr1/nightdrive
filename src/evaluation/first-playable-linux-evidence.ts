import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { release, tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import {
  serializeFirstPlayableArpeggiatorComponentV1,
  serializeFirstPlayableBassComponentV1,
  serializeFirstPlayableCompositionHashInputV1,
  serializeFirstPlayableCompositionV1,
  serializeFirstPlayableHarmonyComponentV1,
  verifyFirstPlayableCompositionV1,
  type FirstPlayableCompositionRequestV1,
} from "../composition/first-playable-composition";
import { generateFirstPlayableCompositionV1 } from "../generators/first-playable-composition";
import { verifyGeneratedArtifact } from "./first-playable-provenance-verifier";
import { FIRST_PLAYABLE_VECTOR_IDS } from "./first-playable-reference-vectors";

const SCHEMA = "nightdrive.first-playable-linux-evidence.v1";
const ARTIFACT_NAME = "first-playable-linux-evidence.json";
const FROZEN = Object.freeze([
  {
    path: "docs/reviews/FIRST_PLAYABLE_SOURCE_RECORDS.json",
    byteLength: 124275,
    sha256: "3a067218a0dd9d992e236ccff5fab839fa8c14b832c3436718453f305fda1946",
  },
  {
    path: "docs/reviews/FIRST_PLAYABLE_SOURCE_MANIFEST.json",
    byteLength: 27554,
    sha256: "b024ccc2e4b4507cee2614f86a117836817c91e030bc5311a98d06a4264202f1",
  },
  {
    path: "docs/reviews/FIRST_PLAYABLE_REFERENCE_MANIFEST.json",
    byteLength: 61686,
    sha256: "087a23f06a1bbe5dd834b6c533de0c9a5aef9228c719667390d33458ac514a28",
  },
  {
    path: "docs/reviews/FIRST_PLAYABLE_CANONICAL_ORACLE.json",
    byteLength: 251750,
    sha256: "fbd6d9adf052e317c5e37dff8415e383b3c070684bf0eb6472af233f0a654173",
  },
  {
    path: "docs/reviews/FIRST_PLAYABLE_ORACLE_RECOMPUTATION.json",
    byteLength: 9074,
    sha256: "6e7206ef07b3b922f7f2ecf625a383dff20f656f79f25bc06016c51374d43ad1",
  },
]);

type JsonRecord = Record<string, unknown>;
type FrozenData = {
  sources: { status: string; vectors: JsonRecord[] };
  oracle: {
    status: string;
    sourceManifestSha256: string;
    referenceManifestSha256: string;
    vectors: JsonRecord[];
  };
  identities: typeof FROZEN;
  provenance?: {
    acceptedMethodCommit: unknown;
    sourceRuntimeInputCommit: unknown;
    captureToolCommit: unknown;
  };
};
type ActualRow = {
  vectorId: string;
  components: unknown;
  componentJson: Record<"harmony" | "bass" | "arpeggiator", string>;
  resultHashInputJson: string;
  canonicalJson: string;
  utf8ByteLengths: Record<string, number>;
  utf8Base64: Record<string, string>;
  componentHashes: Record<string, string>;
  resultHash: string;
  canonicalUtf8Sha256: string;
  replayCanonicalJson: string;
  verifierAccepted: boolean;
};

export const FIRST_PLAYABLE_LINUX_AMBIENT = Object.freeze([
  { name: "utc-first", tz: "UTC", lang: "C.UTF-8" },
  { name: "utc-repeat", tz: "UTC", lang: "C.UTF-8" },
  { name: "utc-c", tz: "UTC", lang: "C" },
  { name: "honolulu", tz: "Pacific/Honolulu", lang: "C.UTF-8" },
]);

function record(value: unknown, label: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  return value as JsonRecord;
}
function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}
function command(name: string, args: string[]): string {
  return execFileSync(name, args, { encoding: "utf8" }).trim();
}
function utf8(value: string): Buffer {
  return Buffer.from(value, "utf8");
}
function firstByteDifference(actual: Buffer, expected: Buffer): number {
  const limit = Math.min(actual.length, expected.length);
  for (let index = 0; index < limit; index += 1)
    if (actual[index] !== expected[index]) return index;
  return limit;
}
export type FirstPlayableMismatchDiagnostic = Readonly<{
  vectorId: string;
  field: string;
  message: string;
  firstByteOffset?: number;
  actualLength?: number;
  expectedLength?: number;
  actualSha256?: string;
  expectedSha256?: string;
  calculatedSha256?: string;
}>;

export class FirstPlayableMismatch extends Error {
  readonly diagnostic: FirstPlayableMismatchDiagnostic;

  constructor(diagnostic: FirstPlayableMismatchDiagnostic) {
    super(diagnostic.message);
    this.name = "FirstPlayableMismatch";
    this.diagnostic = Object.freeze(diagnostic);
  }
}

type PathEvidence = { path: string; pathBase64: string };
type GitDifference = PathEvidence & {
  status: string;
  oldMode: string;
  newMode: string;
  oldObject: string;
  newObject: string;
};
type InspectionEntry = PathEvidence & { flag: string };
type EvidenceCheck<T> = {
  disposition: "PASS" | "FAIL" | "UNAVAILABLE";
  entries: T[];
  error?: string;
};
type IgnoredStateEntry = PathEvidence & {
  role: "locked-installation-input" | "unknown-ignored-state";
  disposition: "LOCKED_INSTALLATION_INPUT" | "FAIL";
  reason: string;
};
export type RepositoryIntegrityEvidence = {
  disposition: "PASS" | "FAIL";
  testedCommit: string;
  observedHead: string;
  headMatchesTestedCommit: boolean;
  repositoryRoot: string;
  commitToIndex: EvidenceCheck<GitDifference>;
  indexToWorktree: EvidenceCheck<GitDifference>;
  unmerged: EvidenceCheck<InspectionEntry>;
  inspectionSuppressingState: EvidenceCheck<InspectionEntry> & { sparseCheckout: boolean | null };
  untracked: EvidenceCheck<PathEvidence>;
  ignoredState: EvidenceCheck<IgnoredStateEntry>;
  reasons: string[];
};

export class FrozenArtifactCustodyFailure extends Error {
  readonly diagnostic: {
    disposition: "FAIL";
    path: string;
    expectedByteLength: number;
    actualByteLength: number | null;
    expectedSha256: string;
    actualSha256: string | null;
    message: string;
  };

  constructor(diagnostic: FrozenArtifactCustodyFailure["diagnostic"]) {
    super(diagnostic.message);
    this.name = "FrozenArtifactCustodyFailure";
    this.diagnostic = diagnostic;
  }
}

function gitBytes(repositoryRoot: string, args: string[]): Buffer {
  const result = spawnSync("git", args, {
    cwd: repositoryRoot,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error || result.status !== 0 || !Buffer.isBuffer(result.stdout))
    throw new Error(
      `git ${args[0]} failed (${result.status ?? "unavailable"}): ${String(result.stderr ?? result.error ?? "")}`,
    );
  return result.stdout;
}

function nulRecords(bytes: Buffer): Buffer[] {
  if (bytes.length === 0) return [];
  if (bytes[bytes.length - 1] !== 0) throw new Error("Git output was not NUL terminated");
  const records: Buffer[] = [];
  let start = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] === 0) {
      records.push(bytes.subarray(start, index));
      start = index + 1;
    }
  }
  return records;
}

function pathEvidence(bytes: Buffer): PathEvidence {
  return { path: bytes.toString("utf8"), pathBase64: bytes.toString("base64") };
}

function rawDifferences(bytes: Buffer): GitDifference[] {
  const records = nulRecords(bytes);
  if (records.length % 2 !== 0) throw new Error("Incomplete NUL-delimited Git raw diff");
  const differences: GitDifference[] = [];
  for (let index = 0; index < records.length; index += 2) {
    const header = records[index]?.toString("ascii") ?? "";
    const match = /^:([0-7]{6}) ([0-7]{6}) ([0-9a-f]+) ([0-9a-f]+) ([A-Z][0-9]*)$/u.exec(header);
    if (!match || !records[index + 1]) throw new Error("Invalid Git raw-diff record");
    differences.push({
      ...pathEvidence(records[index + 1]),
      status: match[5] as string,
      oldMode: match[1] as string,
      newMode: match[2] as string,
      oldObject: match[3] as string,
      newObject: match[4] as string,
    });
  }
  return differences;
}

function checkGit<T>(
  repositoryRoot: string,
  args: string[],
  parse: (bytes: Buffer) => T[],
): EvidenceCheck<T> {
  try {
    const entries = parse(gitBytes(repositoryRoot, args));
    return { disposition: entries.length === 0 ? "PASS" : "FAIL", entries };
  } catch (error) {
    return {
      disposition: "UNAVAILABLE",
      entries: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function inspectionEntries(bytes: Buffer): InspectionEntry[] {
  return nulRecords(bytes).map((record) => {
    if (record.length < 3 || record[1] !== 32) throw new Error("Invalid Git index-flag record");
    return { ...pathEvidence(record.subarray(2)), flag: String.fromCharCode(record[0] as number) };
  });
}

function unmergedEntries(bytes: Buffer): InspectionEntry[] {
  return nulRecords(bytes).map((record) => {
    const separator = record.indexOf(9);
    if (separator < 0) throw new Error("Invalid Git unmerged record");
    return {
      ...pathEvidence(record.subarray(separator + 1)),
      flag: record.subarray(0, separator).toString("ascii"),
    };
  });
}

function ignoredStateEntry(path: Buffer): IgnoredStateEntry {
  const evidence = pathEvidence(path);
  if (evidence.path === "node_modules/")
    return {
      ...evidence,
      role: "locked-installation-input",
      disposition: "LOCKED_INSTALLATION_INPUT",
      reason:
        "The qualification invocation consumes the root npm installation; npm, package-lock, and actual runtime evidence remain independently required.",
    };
  return {
    ...evidence,
    role: "unknown-ignored-state",
    disposition: "FAIL",
    reason:
      "No accepted non-input or locked-toolchain role is established for this ignored path in the actual qualification invocation.",
  };
}

/** Read-only Git evidence for the exact checkout used by this qualification. */
export function inspectRepositoryIntegrity(
  repositoryRoot: string,
  testedCommit: string,
): RepositoryIntegrityEvidence {
  const root = resolve(repositoryRoot);
  const evidence: RepositoryIntegrityEvidence = {
    disposition: "FAIL",
    testedCommit,
    observedHead: "unavailable",
    headMatchesTestedCommit: false,
    repositoryRoot: root,
    commitToIndex: { disposition: "UNAVAILABLE", entries: [] },
    indexToWorktree: { disposition: "UNAVAILABLE", entries: [] },
    unmerged: { disposition: "UNAVAILABLE", entries: [] },
    inspectionSuppressingState: { disposition: "UNAVAILABLE", entries: [], sparseCheckout: null },
    untracked: { disposition: "UNAVAILABLE", entries: [] },
    ignoredState: { disposition: "UNAVAILABLE", entries: [] },
    reasons: [],
  };
  try {
    const observedRoot = resolve(
      gitBytes(root, ["rev-parse", "--show-toplevel"])
        .toString("utf8")
        .replace(/\r?\n$/u, ""),
    );
    if (
      (process.platform === "win32" ? observedRoot.toLowerCase() : observedRoot) !==
      (process.platform === "win32" ? root.toLowerCase() : root)
    )
      evidence.reasons.push("Qualification Git root differs from the execution root");
    if (
      gitBytes(root, ["rev-parse", "--show-prefix"])
        .toString("utf8")
        .replace(/\r?\n$/u, "") !== ""
    )
      evidence.reasons.push("Qualification Git checks did not start at repository root");
    evidence.observedHead = gitBytes(root, ["rev-parse", "--verify", "HEAD"])
      .toString("ascii")
      .trim();
  } catch (error) {
    evidence.reasons.push(error instanceof Error ? error.message : String(error));
  }
  let commitAvailable = false;
  if (/^[0-9a-f]{40}$/u.test(testedCommit)) {
    try {
      commitAvailable =
        gitBytes(root, ["rev-parse", "--verify", `${testedCommit}^{commit}`])
          .toString("ascii")
          .trim() === testedCommit;
    } catch (error) {
      evidence.reasons.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (!commitAvailable) evidence.reasons.push("Immutable tested commit is unavailable");
  evidence.headMatchesTestedCommit = commitAvailable && evidence.observedHead === testedCommit;
  if (!evidence.headMatchesTestedCommit) evidence.reasons.push("HEAD differs from tested commit");

  if (commitAvailable)
    evidence.commitToIndex = checkGit(
      root,
      [
        "diff",
        "--cached",
        "--raw",
        "-z",
        "--no-renames",
        "--no-ext-diff",
        "--no-textconv",
        testedCommit,
        "--",
      ],
      rawDifferences,
    );
  evidence.indexToWorktree = checkGit(
    root,
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
    rawDifferences,
  );
  evidence.unmerged = checkGit(root, ["ls-files", "--unmerged", "-z"], unmergedEntries);
  const flags = checkGit(root, ["ls-files", "-v", "-z"], inspectionEntries);
  evidence.inspectionSuppressingState.entries = flags.entries.filter((entry) => entry.flag !== "H");
  evidence.inspectionSuppressingState.error = flags.error;
  try {
    const sparse = spawnSync("git", ["config", "--bool", "--get", "core.sparseCheckout"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (sparse.error || (sparse.status !== 0 && sparse.status !== 1))
      throw new Error("Sparse-checkout configuration unavailable");
    evidence.inspectionSuppressingState.sparseCheckout =
      sparse.status === 0 && sparse.stdout.trim() === "true";
  } catch (error) {
    evidence.inspectionSuppressingState.error =
      error instanceof Error ? error.message : String(error);
  }
  evidence.inspectionSuppressingState.disposition =
    flags.disposition === "UNAVAILABLE" ||
    evidence.inspectionSuppressingState.sparseCheckout === null
      ? "UNAVAILABLE"
      : evidence.inspectionSuppressingState.entries.length > 0 ||
          evidence.inspectionSuppressingState.sparseCheckout
        ? "FAIL"
        : "PASS";
  evidence.untracked = checkGit(
    root,
    ["ls-files", "--others", "--exclude-standard", "-z"],
    (bytes) => nulRecords(bytes).map(pathEvidence),
  );
  const ignored = checkGit(
    root,
    ["ls-files", "--others", "--ignored", "--exclude-standard", "--directory", "-z"],
    nulRecords,
  );
  evidence.ignoredState = {
    disposition: ignored.disposition === "UNAVAILABLE" ? "UNAVAILABLE" : "PASS",
    entries: ignored.entries.map(ignoredStateEntry),
    ...(ignored.error === undefined ? {} : { error: ignored.error }),
  };
  if (evidence.ignoredState.entries.some((entry) => entry.disposition === "FAIL"))
    evidence.ignoredState.disposition = "FAIL";
  for (const [name, check] of Object.entries({
    commitToIndex: evidence.commitToIndex,
    indexToWorktree: evidence.indexToWorktree,
    unmerged: evidence.unmerged,
    inspectionSuppressingState: evidence.inspectionSuppressingState,
    untracked: evidence.untracked,
    ignoredState: evidence.ignoredState,
  }))
    if (check.disposition !== "PASS") evidence.reasons.push(`${name}: ${check.disposition}`);
  evidence.disposition = evidence.reasons.length === 0 ? "PASS" : "FAIL";
  return evidence;
}

export function workerMismatchLine(error: unknown): string | undefined {
  return error instanceof FirstPlayableMismatch
    ? `FP_LINUX_FAILURE_JSON:${JSON.stringify(error.diagnostic)}`
    : undefined;
}

export function parseWorkerMismatch(output: string): FirstPlayableMismatch | undefined {
  const lines = [...output.matchAll(/^FP_LINUX_FAILURE_JSON:(.+)$/gmu)];
  if (lines.length !== 1 || !lines[0]?.[1]) return undefined;
  try {
    const diagnostic = JSON.parse(lines[0][1]) as FirstPlayableMismatchDiagnostic;
    if (
      typeof diagnostic.vectorId !== "string" ||
      typeof diagnostic.field !== "string" ||
      typeof diagnostic.message !== "string"
    )
      return undefined;
    return new FirstPlayableMismatch(diagnostic);
  } catch {
    return undefined;
  }
}

function exact(actual: string, expected: unknown, vectorId: string, field: string): void {
  if (typeof expected !== "string") throw new Error(`${vectorId}.${field}: frozen value missing`);
  const a = utf8(actual),
    e = utf8(expected);
  if (!a.equals(e))
    throw new FirstPlayableMismatch({
      vectorId,
      field,
      message: `${vectorId}.${field}: firstByte=${firstByteDifference(a, e)} actualLength=${a.length} expectedLength=${e.length} actualSha256=${sha256(a)} expectedSha256=${sha256(e)}`,
      firstByteOffset: firstByteDifference(a, e),
      actualLength: a.length,
      expectedLength: e.length,
      actualSha256: sha256(a),
      expectedSha256: sha256(e),
    });
}

export function assertLinuxEnvironment(environment: {
  platform: string;
  architecture: string;
  node: string;
  npm: string;
}): void {
  if (environment.platform !== "linux")
    throw new Error(`First Playable Linux evidence requires linux, got ${environment.platform}`);
  if (environment.architecture !== "x64")
    throw new Error(`First Playable Linux evidence requires x64, got ${environment.architecture}`);
  if (environment.node !== "v24.21.0")
    throw new Error(
      `First Playable Linux evidence requires Node v24.21.0, got ${environment.node}`,
    );
  if (environment.npm !== "11.19.0")
    throw new Error(`First Playable Linux evidence requires npm 11.19.0, got ${environment.npm}`);
}

export function assertLinuxCiIdentity(environment: {
  githubActions: string;
  githubRunId: string;
  githubRunAttempt: string;
  githubJob: string;
  runnerOs: string;
  runnerArchitecture: string;
  runnerName: string;
  runnerImage: string;
  runnerImageVersion: string;
}): void {
  if (
    environment.githubActions !== "true" ||
    !/^[1-9][0-9]*$/u.test(environment.githubRunId) ||
    !/^[1-9][0-9]*$/u.test(environment.githubRunAttempt) ||
    environment.githubJob === "local" ||
    environment.runnerOs !== "Linux" ||
    environment.runnerArchitecture !== "X64" ||
    environment.runnerName === "local" ||
    environment.runnerImage === "local" ||
    environment.runnerImageVersion === "local"
  )
    throw new Error("Incomplete GitHub Linux runner identity");
}

export function assertRowOrder(rows: readonly { vectorId: string }[]): void {
  if (rows.length !== FIRST_PLAYABLE_VECTOR_IDS.length)
    throw new Error(`Expected exactly 12 rows, got ${rows.length}`);
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    if (seen.has(row.vectorId)) throw new Error(`Duplicate vector ${row.vectorId}`);
    seen.add(row.vectorId);
    if (row.vectorId !== FIRST_PLAYABLE_VECTOR_IDS[index])
      throw new Error(`Unexpected vector/order at ${index}: ${row.vectorId}`);
  });
}

export function assertAmbientRuns(
  runs: readonly { name: string; rows: readonly { vectorId: string }[] }[],
): void {
  if (runs.length !== FIRST_PLAYABLE_LINUX_AMBIENT.length)
    throw new Error(`Expected four ambient runs, got ${runs.length}`);
  runs.forEach((run, index) => {
    if (run.name !== FIRST_PLAYABLE_LINUX_AMBIENT[index]?.name)
      throw new Error(`Unexpected ambient run ${run.name}`);
    assertRowOrder(run.rows);
  });
}

export function verifyFrozenCustody(
  readBytes: (path: string) => Buffer = (path) => readFileSync(path),
): FrozenData {
  const raw = new Map<string, Buffer>();
  for (const identity of FROZEN) {
    let bytes: Buffer;
    try {
      bytes = readBytes(identity.path);
    } catch (error) {
      throw new FrozenArtifactCustodyFailure({
        disposition: "FAIL",
        path: identity.path,
        expectedByteLength: identity.byteLength,
        actualByteLength: null,
        expectedSha256: identity.sha256,
        actualSha256: null,
        message: `Frozen artifact unavailable: ${identity.path}: ${String(error)}`,
      });
    }
    try {
      verifyGeneratedArtifact(bytes, identity);
    } catch {
      throw new FrozenArtifactCustodyFailure({
        disposition: "FAIL",
        path: identity.path,
        expectedByteLength: identity.byteLength,
        actualByteLength: bytes.byteLength,
        expectedSha256: identity.sha256,
        actualSha256: sha256(bytes),
        message: `Frozen artifact raw-byte mismatch: ${identity.path}`,
      });
    }
    raw.set(identity.path, bytes);
  }
  const parsed = (path: string) => JSON.parse((raw.get(path) as Buffer).toString("utf8"));
  const sources = parsed(FROZEN[0].path) as FrozenData["sources"];
  const sourceManifest = parsed(FROZEN[1].path) as JsonRecord;
  const referenceManifest = parsed(FROZEN[2].path) as JsonRecord;
  const oracle = parsed(FROZEN[3].path) as FrozenData["oracle"];
  const recomputation = parsed(FROZEN[4].path) as JsonRecord;
  if (
    sources.status !== "ACCEPTED/FROZEN" ||
    sourceManifest.status !== "ACCEPTED/FROZEN" ||
    referenceManifest.status !== "ACCEPTED/FROZEN" ||
    oracle.status !== "ACCEPTED/FROZEN"
  )
    throw new Error("Frozen artifact lifecycle mismatch");
  if (
    oracle.sourceManifestSha256 !== FROZEN[1].sha256 ||
    oracle.referenceManifestSha256 !== FROZEN[2].sha256
  )
    throw new Error("Frozen oracle manifest binding mismatch");
  const sourceIdentity = record(referenceManifest.sourceIdentity, "reference source identity");
  if (
    sourceIdentity.recordsSha256 !== FROZEN[0].sha256 ||
    sourceIdentity.manifestSha256 !== FROZEN[1].sha256
  )
    throw new Error("Reference/source binding mismatch");
  if (recomputation.candidateOraclePath !== FROZEN[3].path)
    throw new Error("Recomputation/oracle path mismatch");
  assertRowOrder(sources.vectors as { vectorId: string }[]);
  assertRowOrder(oracle.vectors as { vectorId: string }[]);
  assertRowOrder(record(recomputation, "recomputation").vectors as { vectorId: string }[]);
  return {
    sources,
    oracle,
    identities: FROZEN,
    provenance: {
      acceptedMethodCommit: sourceManifest.acceptedMethodCommit,
      sourceRuntimeInputCommit: sourceManifest.sourceRuntimeInputCommit,
      captureToolCommit: sourceManifest.captureToolCommit,
    },
  };
}

function replayRequest(result: JsonRecord): FirstPlayableCompositionRequestV1 {
  const provenance = record(result.provenance, "result provenance");
  const template = record(provenance.harmonyTemplate, "harmonyTemplate");
  const harmony = record(record(result.components, "components").harmony, "harmony");
  return {
    schema: "nightdrive.first-playable-composition-request.v1",
    engineVersion: result.engineVersion,
    generatorVersion: result.generatorVersion,
    profile: provenance.profile,
    harmony: { templateId: template.id, templateVersion: template.version, key: harmony.key },
    section: { tempo: record(result.section, "section").tempo },
    intent: provenance.intent,
    rootSeed: provenance.rootSeed,
    bass: provenance.bass,
    arpeggiator: provenance.arpeggiator,
  } as FirstPlayableCompositionRequestV1;
}

export async function executeFrozenRow(
  index: number,
  data: FrozenData = verifyFrozenCustody(),
): Promise<ActualRow> {
  const source = data.sources.vectors[index],
    oracle = data.oracle.vectors[index];
  if (
    !source ||
    !oracle ||
    source.vectorId !== FIRST_PLAYABLE_VECTOR_IDS[index] ||
    oracle.vectorId !== source.vectorId
  )
    throw new Error(`Invalid frozen row index ${index}`);
  const result = await generateFirstPlayableCompositionV1(
    structuredClone(source.normalizedRequest) as FirstPlayableCompositionRequestV1,
  );
  const section = result.section;
  const componentJson = {
    harmony: serializeFirstPlayableHarmonyComponentV1(section, result.components.harmony),
    bass: serializeFirstPlayableBassComponentV1(section, result.components.bass),
    arpeggiator: serializeFirstPlayableArpeggiatorComponentV1(
      section,
      result.components.arpeggiator,
    ),
  };
  const resultHashInputJson = serializeFirstPlayableCompositionHashInputV1(result);
  const canonicalJson = serializeFirstPlayableCompositionV1(result);
  const strings = {
    ...componentJson,
    resultHashInput: resultHashInputJson,
    canonical: canonicalJson,
  };
  const expected = record(oracle.componentJson, "oracle componentJson");
  for (const key of ["harmony", "bass", "arpeggiator"] as const)
    exact(strings[key], expected[key], source.vectorId as string, `${key}Json`);
  exact(
    resultHashInputJson,
    oracle.resultHashInputJson,
    source.vectorId as string,
    "resultHashInputJson",
  );
  exact(canonicalJson, oracle.canonicalJson, source.vectorId as string, "canonicalJson");
  exact(
    JSON.stringify(result.components),
    JSON.stringify(source.components),
    source.vectorId as string,
    "sourceComponents",
  );
  const expectedLengths = record(oracle.utf8ByteLengths, "oracle lengths");
  const expectedHashes = record(oracle.componentHashes, "oracle hashes");
  const utf8ByteLengths: Record<string, number> = {},
    utf8Base64: Record<string, string> = {};
  for (const [key, value] of Object.entries(strings)) {
    utf8ByteLengths[key] = utf8(value).length;
    utf8Base64[key] = utf8(value).toString("base64");
    if (utf8ByteLengths[key] !== expectedLengths[key]) {
      const frozenString =
        key === "resultHashInput"
          ? oracle.resultHashInputJson
          : key === "canonical"
            ? oracle.canonicalJson
            : expected[key];
      throw new FirstPlayableMismatch({
        vectorId: source.vectorId as string,
        field: `utf8ByteLengths.${key}`,
        message: `${source.vectorId}.${key} byte length mismatch`,
        actualLength: utf8ByteLengths[key],
        expectedLength: expectedLengths[key] as number,
        actualSha256: sha256(utf8(value)),
        ...(typeof frozenString === "string" ? { expectedSha256: sha256(utf8(frozenString)) } : {}),
      });
    }
  }
  for (const key of ["harmony", "bass", "arpeggiator"] as const) {
    const calculatedSha256 = sha256(utf8(strings[key]));
    if (
      result.componentHashes[key] !== expectedHashes[key] ||
      calculatedSha256 !== expectedHashes[key]
    )
      throw new FirstPlayableMismatch({
        vectorId: source.vectorId as string,
        field: `componentHashes.${key}`,
        message: `${source.vectorId}.${key} digest mismatch`,
        actualSha256: result.componentHashes[key],
        expectedSha256: expectedHashes[key] as string,
        calculatedSha256,
      });
  }
  const calculatedResultHash = sha256(utf8(resultHashInputJson));
  if (result.resultHash !== oracle.resultHash || calculatedResultHash !== result.resultHash)
    throw new FirstPlayableMismatch({
      vectorId: source.vectorId as string,
      field: "resultHash",
      message: `${source.vectorId} resultHash mismatch`,
      actualSha256: result.resultHash,
      expectedSha256: oracle.resultHash as string,
      calculatedSha256: calculatedResultHash,
    });
  const canonicalUtf8Sha256 = sha256(utf8(canonicalJson));
  if (canonicalUtf8Sha256 !== oracle.canonicalUtf8Sha256)
    throw new FirstPlayableMismatch({
      vectorId: source.vectorId as string,
      field: "canonicalUtf8Sha256",
      message: `${source.vectorId} final-byte digest mismatch`,
      actualSha256: canonicalUtf8Sha256,
      expectedSha256: oracle.canonicalUtf8Sha256 as string,
    });
  const replay = await generateFirstPlayableCompositionV1(
    replayRequest(result as unknown as JsonRecord),
  );
  const replayCanonicalJson = serializeFirstPlayableCompositionV1(replay);
  exact(replayCanonicalJson, canonicalJson, source.vectorId as string, "replayCanonicalJson");
  verifyFirstPlayableCompositionV1(result);
  return {
    vectorId: source.vectorId as string,
    components: result.components,
    componentJson,
    resultHashInputJson,
    canonicalJson,
    utf8ByteLengths,
    utf8Base64,
    componentHashes: result.componentHashes,
    resultHash: result.resultHash,
    canonicalUtf8Sha256,
    replayCanonicalJson,
    verifierAccepted: true,
  };
}

function observedAmbient() {
  return {
    resolvedOptions: Intl.DateTimeFormat().resolvedOptions(),
    fixedInstantProbe: new Intl.DateTimeFormat("en-US", {
      timeZoneName: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
    }).format(new Date("2020-01-01T12:00:00Z")),
  };
}

export async function executeWorker(index: number) {
  if (process.platform !== "linux" || process.arch !== "x64" || process.version !== "v24.21.0")
    throw new Error("First Playable worker requires pinned Linux x64 Node v24.21.0");
  const row = await executeFrozenRow(index);
  return {
    row,
    observed: observedAmbient(),
    process: { platform: process.platform, architecture: process.arch, node: process.version },
    processEnvironment: {
      TZ: process.env.TZ ?? null,
      LANG: process.env.LANG ?? null,
      LC_ALL: process.env.LC_ALL ?? null,
      LC_TIME: process.env.LC_TIME ?? null,
    },
  };
}

function writeArtifact(directory: string, artifact: unknown): void {
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, ARTIFACT_NAME), `${JSON.stringify(artifact)}\n`, "utf8");
}

export function runLinuxFirstPlayableEvidence(
  directory: string,
  options: {
    forcePreflightFailure?: boolean;
    forceComparisonFailure?: FirstPlayableMismatch;
    forceCustodyFailure?: FrozenArtifactCustodyFailure;
    preflightFixture?: { repositoryRoot: string; testedCommit: string };
  } = {},
): void {
  const startedAtUtc = new Date().toISOString();
  const outputRelative = relative(process.cwd(), resolve(directory));
  const environment = {
    platform: process.platform,
    architecture: process.arch,
    node: process.version,
    npm: "unavailable",
    osRelease: release(),
    osDistribution: "unavailable",
    runnerOs: process.env.RUNNER_OS ?? "local",
    runnerArchitecture: process.env.RUNNER_ARCH ?? "local",
    githubActions: process.env.GITHUB_ACTIONS ?? "false",
    runnerName: process.env.RUNNER_NAME ?? "local",
    runnerImage: process.env.ImageOS ?? "local",
    runnerImageVersion: process.env.ImageVersion ?? "local",
    githubRunId: process.env.GITHUB_RUN_ID ?? "local",
    githubRunAttempt: process.env.GITHUB_RUN_ATTEMPT ?? "local",
    githubJob: process.env.GITHUB_JOB ?? "local",
    testedCommit: "unavailable",
    observedHead: "unavailable",
    repositoryIntegrity: null as RepositoryIntegrityEvidence | null,
    output: {
      path: resolve(directory),
      role: "execution-local-non-input",
      outsideRepository:
        outputRelative === ".." ||
        outputRelative.startsWith(`..${sep}`) ||
        isAbsolute(outputRelative),
    },
    packageLockSha256: "unavailable",
    invocation:
      "npm exec -- vitest run src/evaluation/first-playable-linux-evidence.test.ts --reporter=verbose",
  };
  let phase = "preflight";
  let failedProcess: unknown;
  try {
    if (options.forcePreflightFailure) throw new Error("Forced First Playable preflight failure");
    if (options.forceComparisonFailure) {
      phase = "row-execution";
      throw options.forceComparisonFailure;
    }
    if (options.forceCustodyFailure) {
      phase = "frozen-custody";
      throw options.forceCustodyFailure;
    }
    environment.osDistribution =
      process.platform === "linux" ? readFileSync("/etc/os-release", "utf8") : "not-linux";
    environment.packageLockSha256 = sha256(readFileSync("package-lock.json"));
    environment.testedCommit =
      options.preflightFixture?.testedCommit ??
      (process.env.GITHUB_ACTIONS === "true"
        ? (process.env.GITHUB_SHA ?? "unavailable")
        : (process.env.FP_TESTED_COMMIT ?? "unavailable"));
    environment.repositoryIntegrity = inspectRepositoryIntegrity(
      options.preflightFixture?.repositoryRoot ?? process.cwd(),
      environment.testedCommit,
    );
    environment.observedHead = environment.repositoryIntegrity.observedHead;
    if (!environment.output.outsideRepository)
      throw new Error("First Playable evidence output must be outside the repository");
    if (environment.repositoryIntegrity.disposition !== "PASS")
      throw new Error(
        `First Playable repository integrity failed: ${environment.repositoryIntegrity.reasons.join("; ")}`,
      );
    if (options.preflightFixture)
      throw new Error("A preflight fixture cannot produce qualification evidence");
    environment.npm = command("npm", ["--version"]);
    assertLinuxEnvironment(environment);
    assertLinuxCiIdentity(environment);
    phase = "frozen-custody";
    const frozen = verifyFrozenCustody();
    phase = "row-execution";
    const runs = FIRST_PLAYABLE_LINUX_AMBIENT.map((ambient) => {
      const rows: ActualRow[] = [];
      const processes: unknown[] = [];
      for (let index = 0; index < FIRST_PLAYABLE_VECTOR_IDS.length; index += 1) {
        const env: NodeJS.ProcessEnv = {
          ...process.env,
          TZ: ambient.tz,
          LANG: ambient.lang,
          FP_LINUX_WORKER: "1",
          FP_LINUX_INDEX: String(index),
        };
        delete env.LC_ALL;
        delete env.LC_TIME;
        const args = [
          resolve("node_modules/vitest/vitest.mjs"),
          "run",
          "src/evaluation/first-playable-linux-worker.test.ts",
          "--reporter=dot",
        ];
        const started = new Date().toISOString();
        const result = spawnSync(process.execPath, args, {
          cwd: process.cwd(),
          env,
          encoding: "utf8",
          maxBuffer: 16 * 1024 * 1024,
        });
        const commandLine = `${process.execPath} ${args.join(" ")}`;
        processes.push({
          vectorId: FIRST_PLAYABLE_VECTOR_IDS[index],
          command: commandLine,
          startedAtUtc: started,
          finishedAtUtc: new Date().toISOString(),
          exitStatus: result.status,
          stdoutSha256: sha256(result.stdout ?? ""),
          stderrSha256: sha256(result.stderr ?? ""),
          stdout: result.stdout,
          stderr: result.stderr,
        });
        if (result.status !== 0) {
          failedProcess = processes[processes.length - 1];
          const mismatch = parseWorkerMismatch(`${result.stdout}\n${result.stderr}`);
          if (mismatch) throw mismatch;
          throw new Error(
            `${ambient.name}/${FIRST_PLAYABLE_VECTOR_IDS[index]} worker exited ${result.status}: ${result.error?.message ?? ""}\n${result.stdout}\n${result.stderr}`,
          );
        }
        const matches = result.stdout.matchAll(/^FP_LINUX_ROW:(.+)$/gmu);
        const payloads = [...matches];
        if (payloads.length !== 1 || !payloads[0]?.[1])
          throw new Error(
            `${ambient.name}/${FIRST_PLAYABLE_VECTOR_IDS[index]} missing/duplicate worker payload`,
          );
        const payload = JSON.parse(payloads[0][1]) as {
          row: ActualRow;
          observed: unknown;
          process: unknown;
          processEnvironment: {
            TZ: string | null;
            LANG: string | null;
            LC_ALL: string | null;
            LC_TIME: string | null;
          };
        };
        if (
          payload.processEnvironment.TZ !== ambient.tz ||
          payload.processEnvironment.LANG !== ambient.lang ||
          payload.processEnvironment.LC_ALL !== null ||
          payload.processEnvironment.LC_TIME !== null
        )
          throw new Error(
            `${ambient.name}/${FIRST_PLAYABLE_VECTOR_IDS[index]} process environment mismatch`,
          );
        rows.push(payload.row);
        (processes[processes.length - 1] as JsonRecord).observed = payload.observed;
        (processes[processes.length - 1] as JsonRecord).process = payload.process;
        (processes[processes.length - 1] as JsonRecord).processEnvironment =
          payload.processEnvironment;
      }
      assertRowOrder(rows);
      return {
        name: ambient.name,
        requested: { TZ: ambient.tz, LANG: ambient.lang, LC_ALL: "unset", LC_TIME: "unset" },
        rows,
        processes,
      };
    });
    phase = "ambient-comparison";
    assertAmbientRuns(runs);
    const base = runs[0]?.rows as ActualRow[];
    for (const run of runs.slice(1)) {
      for (let index = 0; index < base.length; index += 1)
        exact(
          JSON.stringify(run.rows[index]),
          JSON.stringify(base[index]),
          base[index]?.vectorId ?? "unknown",
          `ambient.${run.name}`,
        );
    }
    const utcProbe = record(runs[0]?.processes[0], "UTC process").observed as JsonRecord;
    const honoluluProbe = record(runs[3]?.processes[0], "Honolulu process").observed as JsonRecord;
    if (utcProbe.fixedInstantProbe === honoluluProbe.fixedInstantProbe)
      throw new Error("UTC/Honolulu fixed-instant timezone probes did not differ");
    writeArtifact(directory, {
      schema: SCHEMA,
      status: "PASS",
      startedAtUtc,
      finishedAtUtc: new Date().toISOString(),
      environment,
      frozenArtifactIdentities: frozen.identities,
      provenance: frozen.provenance,
      runs,
    });
  } catch (error) {
    try {
      writeArtifact(directory, {
        schema: SCHEMA,
        status: "FAIL",
        startedAtUtc,
        finishedAtUtc: new Date().toISOString(),
        environment,
        diagnostics:
          error instanceof FirstPlayableMismatch
            ? { phase, ...error.diagnostic }
            : error instanceof FrozenArtifactCustodyFailure
              ? { phase, ...error.diagnostic }
              : {
                  phase,
                  message: error instanceof Error ? error.message : String(error),
                  ...(environment.repositoryIntegrity?.disposition === "FAIL"
                    ? { repositoryIntegrity: environment.repositoryIntegrity }
                    : {}),
                },
        ...(failedProcess === undefined ? {} : { failedProcess }),
      });
    } catch {
      /* Original failure remains primary. */
    }
    throw error;
  }
}

export function defaultLinuxEvidenceDirectory(): string {
  return process.env.FP_LINUX_OUTPUT_DIR ?? join(tmpdir(), "nightdrive-first-playable-linux");
}
