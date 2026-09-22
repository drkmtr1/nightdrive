import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { release, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createArpRange } from "../music-domain/arpeggiator";
import { createChord } from "../music-domain/chord";
import { createChordInversion } from "../music-domain/chord-inversion";
import { createChordQuality } from "../music-domain/chord-quality";
import { createChordVoicing } from "../music-domain/chord-voicing";
import { createKey } from "../music-domain/key";
import { createTempoFromMicrosecondsPerQuarter } from "../music-domain/musical-time";
import { createPitchClass } from "../music-domain/pitch";
import { createScaleDegree, createScaleType } from "../music-domain/scale";
import {
  serializeStage7ArpeggiatorAggregateHashInputV1,
  serializeStage7ArpeggiatorAggregateV1,
} from "../composition/stage7-arpeggiator-aggregate";
import { generateStage7ArpeggiatorAggregateV1 } from "../generators/stage7-arpeggiator-aggregate";
import { getStage7Ac004HarmonySnapshot } from "./stage7-ac004-harmony-snapshots";

export const STAGE7_AC004_LINUX_EVIDENCE_SCHEMA =
  "nightdrive.stage7-ac004-linux-evidence.v1" as const;
export const STAGE7_AC004_LINUX_NODE_VERSION = "v24.21.0" as const;
export const STAGE7_AC004_LINUX_NPM_VERSION = "11.19.0" as const;
export const STAGE7_AC004_LINUX_ARCHITECTURE = "x64" as const;

type CandidateVector = {
  vectorId: string;
  sourceRecordId: string;
  profileId: string;
  profileVersion: string;
  policyVersion: string;
  rootSeed: number;
  intent: { energy: string; complexity: string };
  range: { minMidiPitch: number; maxMidiPitch: number };
  events: readonly Readonly<Record<string, number>>[];
  aggregateJson: string;
  aggregateHashInputJson: string;
  byteLengths: { harmony: number; arpeggiator: number; aggregate: number };
  harmonySha256: string;
  arpeggiatorSha256: string;
  resultHash: string;
};

type CandidateArtifact = { vectors: readonly CandidateVector[] };

export type Stage7Ac004LinuxEvidenceRow = Readonly<{
  vectorId: string;
  sourceRecordId: string;
  profileId: string;
  profileVersion: string;
  policyVersion: string;
  rootSeed: number;
  energy: string;
  complexity: string;
  aggregateByteLength: number;
  aggregateCanonicalSha256: string;
  harmonySha256: string;
  arpeggiatorSha256: string;
  resultHash: string;
}>;

export type Stage7Ac004LinuxEnvironment = Readonly<{
  os: string;
  osVersion: string;
  runnerOs: string;
  runnerArchitecture: string;
  architecture: string;
  node: string;
  npm: string;
  commit: string;
}>;

export type Stage7Ac004LinuxEvidenceArtifact = Readonly<{
  schema: typeof STAGE7_AC004_LINUX_EVIDENCE_SCHEMA;
  canonical: Readonly<{
    vectorCount: number;
    vectors: readonly Stage7Ac004LinuxEvidenceRow[];
    sha256: string;
  }>;
  environment: Stage7Ac004LinuxEnvironment;
  ambientVariants: readonly Readonly<{
    name: string;
    canonicalSha256: string;
    matchesBase: boolean;
  }>[];
}>;

function loadArtifact(): CandidateArtifact {
  return JSON.parse(
    readFileSync("docs/reviews/STAGE7_AC004_CANDIDATE_GOLDEN_VECTORS.json", "utf8"),
  ) as CandidateArtifact;
}

const ARTIFACT = loadArtifact();
export const STAGE7_AC004_LINUX_VECTOR_IDS = Object.freeze(
  ARTIFACT.vectors.map((vector) => vector.vectorId),
);

function buildProgression(snapshot: ReturnType<typeof getStage7Ac004HarmonySnapshot>) {
  return {
    profile: snapshot.profile,
    templateId: snapshot.templateId,
    templateVersion: snapshot.templateVersion,
    key: createKey(createPitchClass(snapshot.key.tonic), createScaleType(snapshot.key.scale)),
    slots: snapshot.slots.map((slot) => ({
      index: slot.index,
      degree: createScaleDegree(slot.degree),
      bars: slot.bars,
      chord: createChord(createPitchClass(slot.chord.root), createChordQuality(slot.chord.quality)),
      inversion: createChordInversion(slot.inversion),
      voicing: createChordVoicing(slot.voicing.midiPitches),
      adjacentCost: null,
      rationale: { preferenceRank: 0, tieBreak: "AC-004 evidence snapshot" },
    })),
  };
}

export async function runStage7Ac004Vector(index: number): Promise<Stage7Ac004LinuxEvidenceRow> {
  const vector = ARTIFACT.vectors[index];
  if (vector === undefined) throw new Error(`Unknown AC-004 vector index: ${index}`);
  const snapshot = getStage7Ac004HarmonySnapshot(vector.sourceRecordId);
  const output = await generateStage7ArpeggiatorAggregateV1({
    schema: "nightdrive.stage7-arpeggiator-aggregate.v1",
    engineVersion: "nightdrive.engine.stage7-aggregate.v1",
    generatorVersion: "nightdrive.generator.stage7-arpeggiator.v1",
    parent: null,
    tempo: createTempoFromMicrosecondsPerQuarter(500000),
    progression: buildProgression(snapshot),
    range: createArpRange(vector.range),
    intent: vector.intent,
    profile: { id: vector.profileId, version: vector.profileVersion },
    policy: { version: vector.policyVersion },
    seedDerivation: { version: "nightdrive.seed-derivation.component.v1" },
    prng: { version: "nightdrive.prng.mulberry32.v1" },
    rootSeed: vector.rootSeed,
  } as never);

  const aggregateHashInputJson = serializeStage7ArpeggiatorAggregateHashInputV1(output);
  const aggregateJson = serializeStage7ArpeggiatorAggregateV1(output);
  if (
    JSON.stringify(output.components.arpeggiator) !== JSON.stringify(vector.events) ||
    aggregateHashInputJson !== vector.aggregateHashInputJson ||
    aggregateJson !== vector.aggregateJson ||
    output.componentHashes.harmony !== vector.harmonySha256 ||
    output.componentHashes.arpeggiator !== vector.arpeggiatorSha256 ||
    output.resultHash !== vector.resultHash ||
    new TextEncoder().encode(aggregateJson).byteLength !== vector.byteLengths.aggregate
  ) {
    throw new Error(`AC-004 production/oracle mismatch for ${vector.vectorId}.`);
  }

  return {
    vectorId: vector.vectorId,
    sourceRecordId: vector.sourceRecordId,
    profileId: vector.profileId,
    profileVersion: vector.profileVersion,
    policyVersion: vector.policyVersion,
    rootSeed: vector.rootSeed,
    energy: vector.intent.energy,
    complexity: vector.intent.complexity,
    aggregateByteLength: vector.byteLengths.aggregate,
    aggregateCanonicalSha256: sha256Utf8(aggregateJson),
    harmonySha256: vector.harmonySha256,
    arpeggiatorSha256: vector.arpeggiatorSha256,
    resultHash: vector.resultHash,
  };
}

export function assertLinuxAc004Environment(
  environment: Pick<Stage7Ac004LinuxEnvironment, "os" | "architecture" | "node" | "npm">,
): void {
  if (environment.os !== "linux") {
    throw new Error(`AC-004 requires Linux; received ${environment.os}.`);
  }
  if (environment.architecture !== STAGE7_AC004_LINUX_ARCHITECTURE) {
    throw new Error(
      `AC-004 requires Linux architecture x64; received ${environment.architecture}.`,
    );
  }
  if (environment.node !== STAGE7_AC004_LINUX_NODE_VERSION) {
    throw new Error(
      `AC-004 requires Node ${STAGE7_AC004_LINUX_NODE_VERSION}; received ${environment.node}.`,
    );
  }
  if (environment.npm !== STAGE7_AC004_LINUX_NPM_VERSION) {
    throw new Error(
      `AC-004 requires npm ${STAGE7_AC004_LINUX_NPM_VERSION}; received ${environment.npm}.`,
    );
  }
}

export function canonicalizeLinuxAc004Rows(
  rows: readonly Stage7Ac004LinuxEvidenceRow[],
): readonly Stage7Ac004LinuxEvidenceRow[] {
  if (rows.length !== ARTIFACT.vectors.length) {
    throw new Error(`AC-004 evidence must contain exactly ${ARTIFACT.vectors.length} rows.`);
  }
  const byId = new Map<string, Stage7Ac004LinuxEvidenceRow>();
  for (const row of rows) {
    if (byId.has(row.vectorId)) throw new Error(`Duplicate AC-004 vector ID: ${row.vectorId}.`);
    byId.set(row.vectorId, row);
  }
  const ordered = ARTIFACT.vectors.map((vector) => {
    const row = byId.get(vector.vectorId);
    if (row === undefined) throw new Error(`Missing AC-004 vector ID: ${vector.vectorId}.`);
    return row;
  });
  return Object.freeze(ordered);
}

export function canonicalEvidenceJson(rows: readonly Stage7Ac004LinuxEvidenceRow[]): string {
  const ordered = canonicalizeLinuxAc004Rows(rows);
  return JSON.stringify({ vectorCount: ordered.length, vectors: ordered });
}

export function sha256Utf8(value: string): string {
  return createHash("sha256").update(new TextEncoder().encode(value)).digest("hex");
}

function readNpmVersion(): string {
  return execFileSync("npm", ["--version"], { encoding: "utf8" }).trim();
}

export function readLinuxAc004Environment(): Stage7Ac004LinuxEnvironment {
  const environment = {
    os: process.platform,
    osVersion: release(),
    runnerOs: process.env.RUNNER_OS ?? "unknown",
    runnerArchitecture: process.env.RUNNER_ARCH ?? "unknown",
    architecture: process.arch,
    node: process.version,
    npm: readNpmVersion(),
    commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  } satisfies Stage7Ac004LinuxEnvironment;
  assertLinuxAc004Environment(environment);
  return environment;
}

function freshVector(
  index: number,
  overrides: Readonly<Record<string, string>>,
): Stage7Ac004LinuxEvidenceRow {
  const result = spawnSync(
    process.execPath,
    [
      resolve("node_modules/vitest/vitest.mjs"),
      "run",
      "src/evaluation/stage7-ac004-linux-worker.test.ts",
      "--reporter=dot",
    ],
    {
      cwd: process.cwd(),
      env: { ...process.env, ...overrides, AC004_VECTOR_INDEX: String(index), AC004_WORKER: "1" },
      encoding: "utf8",
    },
  );
  if (result.status !== 0)
    throw new Error(`AC-004 fresh process ${index} failed:\n${result.stdout}\n${result.stderr}`);
  const match = `${result.stdout}\n${result.stderr}`.match(/AC004_VECTOR_JSON:(\{[^\r\n]+\})/u);
  if (match?.[1] === undefined)
    throw new Error(`AC-004 fresh process ${index} emitted no evidence row.`);
  return JSON.parse(match[1]) as Stage7Ac004LinuxEvidenceRow;
}

function runMatrix(overrides: Readonly<Record<string, string>>): string {
  const rows = ARTIFACT.vectors.map((_, index) => freshVector(index, overrides));
  return canonicalEvidenceJson(rows);
}

export function runLinuxAc004Evidence(outputDirectory: string): Stage7Ac004LinuxEvidenceArtifact {
  const environment = readLinuxAc004Environment();
  const baseJson = runMatrix({ TZ: "UTC", LANG: "C.UTF-8" });
  const repeatJson = runMatrix({ TZ: "UTC", LANG: "C.UTF-8" });
  if (repeatJson !== baseJson)
    throw new Error("Repeated Linux AC-004 evidence is not byte-identical.");
  const ambientVariants = [
    { name: "UTC-C", env: { TZ: "UTC", LANG: "C" } },
    { name: "Honolulu-C.UTF-8", env: { TZ: "Pacific/Honolulu", LANG: "C.UTF-8" } },
  ].map((variant) => {
    const variantJson = runMatrix(variant.env);
    const variantHash = sha256Utf8(variantJson);
    return {
      name: variant.name,
      canonicalSha256: variantHash,
      matchesBase: variantJson === baseJson,
    };
  });
  if (ambientVariants.some((variant) => !variant.matchesBase)) {
    throw new Error("Linux AC-004 evidence changed across timezone/locale variants.");
  }
  const canonical = JSON.parse(baseJson) as {
    vectorCount: number;
    vectors: readonly Stage7Ac004LinuxEvidenceRow[];
  };
  const artifact: Stage7Ac004LinuxEvidenceArtifact = {
    schema: STAGE7_AC004_LINUX_EVIDENCE_SCHEMA,
    canonical: { ...canonical, sha256: sha256Utf8(baseJson) },
    environment,
    ambientVariants,
  };
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(
    join(outputDirectory, "stage7-ac004-linux-evidence.json"),
    `${JSON.stringify(artifact)}\n`,
    "utf8",
  );
  return artifact;
}

export function defaultEvidenceOutputDirectory(): string {
  return process.env.AC004_OUTPUT_DIR ?? join(tmpdir(), "nightdrive-stage7-ac004-linux");
}
