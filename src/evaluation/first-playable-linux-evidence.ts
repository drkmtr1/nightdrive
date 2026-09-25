import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { release, tmpdir } from "node:os";
import { join, resolve } from "node:path";
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
    const bytes = readBytes(identity.path);
    verifyGeneratedArtifact(bytes, identity);
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
  options: { forcePreflightFailure?: boolean; forceComparisonFailure?: FirstPlayableMismatch } = {},
): void {
  const startedAtUtc = new Date().toISOString();
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
    commit: "unavailable",
    cleanTree: false,
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
    environment.osDistribution =
      process.platform === "linux" ? readFileSync("/etc/os-release", "utf8") : "not-linux";
    environment.npm = command("npm", ["--version"]);
    environment.commit = command("git", ["rev-parse", "HEAD"]);
    environment.cleanTree = command("git", ["status", "--porcelain=v1"]) === "";
    environment.packageLockSha256 = sha256(readFileSync("package-lock.json"));
    assertLinuxEnvironment(environment);
    assertLinuxCiIdentity(environment);
    if (!environment.cleanTree) throw new Error("Linux evidence requires clean checkout");
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
            : { phase, message: error instanceof Error ? error.message : String(error) },
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
