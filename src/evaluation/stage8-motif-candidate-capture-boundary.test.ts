import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { buildStage8MotifCandidateArtifact } from "./stage8-motif-candidate-vectors";

// This native-Node custody module intentionally has no TypeScript declaration:
// its public surface is limited to the launcher and test-side inspection.
// @ts-expect-error Native ESM custody boundary has no declaration file.
const boundary = await import("./stage8-motif-candidate-capture-boundary.mjs");

const BOUNDARY_PATH = resolve(
  process.cwd(),
  "src/evaluation/stage8-motif-candidate-capture-boundary.mjs",
);
const BOUNDARY_SOURCE = readFileSync(BOUNDARY_PATH, "utf8");
const VITEST_CONFIG_PATH = resolve(
  process.cwd(),
  "src/evaluation/stage8-motif-candidate-capture.vitest.config.mjs",
);
const VITEST_CONFIG_SOURCE = readFileSync(VITEST_CONFIG_PATH, "utf8");
const ROOT_LOCK_PATH = resolve(process.cwd(), "package-lock.json");
const INSTALLED_LOCK_PATH = resolve(process.cwd(), "node_modules/.package-lock.json");

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function workerOutputForArtifact(
  artifact: unknown,
  overrides: Readonly<Record<string, unknown>> = {},
): Buffer {
  const text = `${JSON.stringify(artifact, null, 2)}\n`;
  const bytes = new TextEncoder().encode(text);
  const payload = {
    text,
    byteLength: bytes.byteLength,
    sha256: sha256(bytes),
    ...overrides,
  };
  return Buffer.from(
    `${boundary.STAGE8_MOTIF_CANDIDATE_CAPTURE_WORKER_MARKER}${Buffer.from(
      JSON.stringify(payload),
      "utf8",
    ).toString("base64")}\n`,
    "utf8",
  );
}

function exactWorkerOutput(overrides: Readonly<Record<string, unknown>> = {}): Buffer {
  return workerOutputForArtifact(buildStage8MotifCandidateArtifact(), overrides);
}

type MutableCandidateArtifact = {
  vectors: Array<{
    requestJson: string;
    resultJson: string;
    byteLengths: { request: number; result: number };
    sha256: { request: string; result: string };
  }>;
};

function rewriteEmbeddedVectorJson(
  artifact: MutableCandidateArtifact,
  field: "requestJson" | "resultJson",
  rewrite: (value: Record<string, unknown>) => void,
): void {
  const vector = artifact.vectors[0];
  if (vector === undefined) throw new Error("candidate fixture has no first vector");
  const value = JSON.parse(vector[field]) as Record<string, unknown>;
  rewrite(value);
  const text = JSON.stringify(value);
  vector[field] = text;
  const bytes = new TextEncoder().encode(text);
  const key = field === "requestJson" ? "request" : "result";
  vector.byteLengths[key] = bytes.byteLength;
  vector.sha256[key] = sha256(bytes);
}

describe("Stage 8 Motif candidate capture custody boundary", () => {
  it("accepts the complete canonical 24-row worker payload", () => {
    const parsed = boundary.parseStage8MotifCandidateCaptureWorkerOutput(exactWorkerOutput());
    expect(parsed).toMatchObject({
      byteLength: expect.any(Number),
      sha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
    });
    expect(JSON.parse(parsed.text)).toMatchObject({
      status: "CANDIDATE",
      matrix: { vectorCount: 24 },
    });
  });

  it("rejects a self-consistent but incomplete candidate envelope", () => {
    const text = `${JSON.stringify(
      {
        schema: "nightdrive.stage8-motif-candidate-vectors.v1",
        status: "CANDIDATE",
        generatedBy: "src/evaluation/stage8-motif-candidate-vectors.ts",
        sourceBindings: [],
        matrix: { vectorCount: 0, sourceRecordIds: [], intentPairs: [], rootSeeds: [] },
        vectors: [],
      },
      null,
      2,
    )}\n`;
    const bytes = new TextEncoder().encode(text);
    const payload = Buffer.from(
      `${boundary.STAGE8_MOTIF_CANDIDATE_CAPTURE_WORKER_MARKER}${Buffer.from(
        JSON.stringify({ text, byteLength: bytes.byteLength, sha256: sha256(bytes) }),
        "utf8",
      ).toString("base64")}\n`,
      "utf8",
    );
    expect(() => boundary.parseStage8MotifCandidateCaptureWorkerOutput(payload)).toThrow(
      /incomplete qualification matrix/u,
    );
  });

  it("rejects an altered retained byte identity", () => {
    expect(() =>
      boundary.parseStage8MotifCandidateCaptureWorkerOutput(
        exactWorkerOutput({ sha256: "0".repeat(64) }),
      ),
    ).toThrow(/bytes do not match/u);
  });

  it("rejects a self-consistent raw-Harmony substitution", () => {
    const artifact = structuredClone(
      buildStage8MotifCandidateArtifact(),
    ) as unknown as MutableCandidateArtifact;
    rewriteEmbeddedVectorJson(artifact, "requestJson", (request) => {
      const harmony = request.harmony as { key: { tonic: number } };
      harmony.key.tonic = 1;
    });
    expect(() =>
      boundary.parseStage8MotifCandidateCaptureWorkerOutput(workerOutputForArtifact(artifact)),
    ).toThrow(/frozen raw Harmony key/u);
  });

  it("rejects a self-consistent provenance-Harmony substitution", () => {
    const artifact = structuredClone(
      buildStage8MotifCandidateArtifact(),
    ) as unknown as MutableCandidateArtifact;
    rewriteEmbeddedVectorJson(artifact, "resultJson", (result) => {
      const provenance = result.provenance as {
        harmony: { slots: Array<{ chord: { rootSemitoneClass: number } }> };
      };
      const slot = provenance.harmony.slots[0];
      if (slot === undefined) throw new Error("candidate fixture has no first Harmony slot");
      slot.chord.rootSemitoneClass = 1;
    });
    expect(() =>
      boundary.parseStage8MotifCandidateCaptureWorkerOutput(workerOutputForArtifact(artifact)),
    ).toThrow(/frozen provenance Harmony slot/u);
  });

  it("requires every installed lock entry to match the committed dependency tree", () => {
    const rootLock = JSON.parse(readFileSync(ROOT_LOCK_PATH, "utf8")) as Record<string, unknown>;
    const installedLock = JSON.parse(readFileSync(INSTALLED_LOCK_PATH, "utf8")) as {
      packages: Record<string, Record<string, unknown>>;
    };
    const evidence = boundary.assertStage8MotifCandidateCaptureLockedDependencyTree(
      rootLock,
      installedLock,
    );
    expect(evidence.installedPackageCount).toBeGreaterThan(0);

    const alteredInstalledLock = structuredClone(installedLock);
    alteredInstalledLock.packages["node_modules/vitest"] = {
      ...alteredInstalledLock.packages["node_modules/vitest"],
      version: "0.0.0",
    };
    expect(() =>
      boundary.assertStage8MotifCandidateCaptureLockedDependencyTree(
        rootLock,
        alteredInstalledLock,
      ),
    ).toThrow(/installed dependency lock diverges/u);
  });

  it("binds every installed dependency byte into a stable manifest", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "nightdrive-stage8-dependency-manifest-"));
    try {
      const cliPath = join(fixtureRoot, "node_modules", "vitest", "dist", "cli.js");
      mkdirSync(join(fixtureRoot, "node_modules", "vitest", "dist"), { recursive: true });
      mkdirSync(join(fixtureRoot, "node_modules", "vite"), { recursive: true });
      writeFileSync(cliPath, "export const captured = 'first';\n", "utf8");
      writeFileSync(join(fixtureRoot, "node_modules", "vite", "index.js"), "export {};\n", "utf8");

      const first = boundary.buildStage8MotifCandidateCaptureDependencyManifest(fixtureRoot);
      const repeated = boundary.buildStage8MotifCandidateCaptureDependencyManifest(fixtureRoot);
      expect(repeated).toEqual(first);
      expect(first).toMatchObject({
        root: "node_modules",
        fileCount: 2,
        totalByteLength: expect.any(Number),
        sha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
      });

      writeFileSync(cliPath, "export const captured = 'second';\n", "utf8");
      const changed = boundary.buildStage8MotifCandidateCaptureDependencyManifest(fixtureRoot);
      expect(changed.sha256).not.toBe(first.sha256);
      expect(changed.totalByteLength).not.toBe(first.totalByteLength);
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true });
    }
  });

  it.skipIf(process.platform === "win32")(
    "retains an in-tree package link without following an external target",
    () => {
      const fixtureRoot = mkdtempSync(join(tmpdir(), "nightdrive-stage8-dependency-link-"));
      try {
        const dependencyRoot = join(fixtureRoot, "node_modules");
        const targetPath = join(dependencyRoot, "vitest", "dist", "cli.js");
        const linkPath = join(dependencyRoot, ".bin", "vitest");
        mkdirSync(join(dependencyRoot, "vitest", "dist"), { recursive: true });
        mkdirSync(join(dependencyRoot, ".bin"), { recursive: true });
        writeFileSync(targetPath, "export {};\n", "utf8");
        symlinkSync("../vitest/dist/cli.js", linkPath);

        const manifest = boundary.buildStage8MotifCandidateCaptureDependencyManifest(fixtureRoot);
        expect(manifest).toMatchObject({
          fileCount: 1,
          symbolicLinkCount: 1,
          sha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
        });
      } finally {
        rmSync(fixtureRoot, { force: true, recursive: true });
      }
    },
  );

  it("fixes dependency preparation and disables all configured Vitest write paths", () => {
    expect(boundary.STAGE8_MOTIF_CANDIDATE_CAPTURE_DEPENDENCY_INSTALL_ARGUMENTS).toEqual([
      "ci",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--include=dev",
      "--package-lock=true",
      "--loglevel=error",
      "--no-update-notifier",
    ]);
    expect(boundary.STAGE8_MOTIF_CANDIDATE_CAPTURE_TRACKED_INPUT_PATHS).toContain(".npmrc");
    expect(boundary.STAGE8_MOTIF_CANDIDATE_CAPTURE_SUPERVISOR_ARGUMENTS).toContain(
      "--configLoader=native",
    );
    expect(VITEST_CONFIG_SOURCE).toContain("envDir: false");
    expect(VITEST_CONFIG_SOURCE).toContain("cache: false");
    expect(VITEST_CONFIG_SOURCE).toContain("fsModuleCache: false");
    expect(VITEST_CONFIG_SOURCE).toContain('pool: "threads"');
    expect(VITEST_CONFIG_SOURCE).toContain('update: "none"');
    expect(VITEST_CONFIG_SOURCE).toContain("enabled: false");
  });

  it("keeps paired publication private to the one fixed custody route", () => {
    expect(BOUNDARY_SOURCE).toContain(
      "async function materializeExclusiveStage8MotifCandidateCapture",
    );
    expect(BOUNDARY_SOURCE).not.toContain(
      "export async function materializeExclusiveStage8MotifCandidateCapture",
    );
    expect(BOUNDARY_SOURCE).toContain("export async function runStage8MotifCandidateCapture");
    expect(BOUNDARY_SOURCE).toContain("const supervisor = runFixedWorker(preflight)");
    expect(BOUNDARY_SOURCE).toContain(
      "installedTreeManifest: buildStage8MotifCandidateCaptureDependencyManifest",
    );
    expect(BOUNDARY_SOURCE).toContain("const HOST_ENVIRONMENT_ALLOWLIST");
    expect(BOUNDARY_SOURCE).toContain("const HOST_EXECUTABLE_TRUST_BOUNDARY");
    expect(BOUNDARY_SOURCE).toContain("hostExecutableTrustBoundary");
    expect(BOUNDARY_SOURCE).toContain('role: "required execution input"');
    expect(BOUNDARY_SOURCE).toContain(
      'scope: "ignored node_modules in the capture repository root"',
    );
    expect(BOUNDARY_SOURCE).toContain('operation: "fresh locked npm ci before worker execution"');
    expect(BOUNDARY_SOURCE).toContain("postPreparationCustody");
    expect(BOUNDARY_SOURCE).not.toContain('resolveExecutable("npm"');
    expect(BOUNDARY_SOURCE).not.toContain('"where.exe"');
    expect(BOUNDARY_SOURCE).not.toContain('"which"');
    expect(BOUNDARY_SOURCE).toContain('? ["COMSPEC", "SYSTEMROOT", "WINDIR"]');
    expect(BOUNDARY_SOURCE).toContain("exclusiveWorkerScratchDirectory");
    expect(BOUNDARY_SOURCE).toContain("removeWorkerScratchDirectory(preflight.workerScratch)");
    expect(BOUNDARY_SOURCE).toContain("workerTemporaryState");
  });

  it("holds output incomplete until final custody and scratch cleanup have succeeded", () => {
    const runner = BOUNDARY_SOURCE.slice(
      BOUNDARY_SOURCE.indexOf("export async function runStage8MotifCandidateCapture"),
    );
    const materializer = BOUNDARY_SOURCE.slice(
      BOUNDARY_SOURCE.indexOf("async function materializeExclusiveStage8MotifCandidateCapture"),
      BOUNDARY_SOURCE.indexOf("export async function runStage8MotifCandidateCapture"),
    );
    const workerScratchCleanup = runner.indexOf(
      "removeWorkerScratchDirectory(preflight.workerScratch);",
    );
    const materialization = runner.indexOf(
      "const materialized = await materializeExclusiveStage8MotifCandidateCapture",
    );
    const finalCustodyCheck = materializer.lastIndexOf(
      "assertStage8MotifCandidateCaptureInputsUnchanged(preflight);",
    );
    const completion = materializer.lastIndexOf("await rm(incompleteMarker, { force: false });");
    expect(workerScratchCleanup).toBeGreaterThan(-1);
    expect(materialization).toBeGreaterThan(workerScratchCleanup);
    expect(finalCustodyCheck).toBeGreaterThan(materialization);
    expect(completion).toBeGreaterThan(finalCustodyCheck);
    expect(BOUNDARY_SOURCE).toContain(".stage8-motif-candidate-capture-incomplete");
    expect(BOUNDARY_SOURCE).toContain("await mkdir(destination)");
    expect(BOUNDARY_SOURCE).toContain("await rm(destination, { force: false, recursive: true })");
  });
});
