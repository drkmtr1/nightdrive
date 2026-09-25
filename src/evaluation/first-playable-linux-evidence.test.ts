import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  assertAmbientRuns,
  assertLinuxCiIdentity,
  assertLinuxEnvironment,
  assertRowOrder,
  defaultLinuxEvidenceDirectory,
  executeFrozenRow,
  FirstPlayableMismatch,
  parseWorkerMismatch,
  runLinuxFirstPlayableEvidence,
  verifyFrozenCustody,
  workerMismatchLine,
  FIRST_PLAYABLE_LINUX_AMBIENT,
} from "./first-playable-linux-evidence";
import { FIRST_PLAYABLE_VECTOR_IDS } from "./first-playable-reference-vectors";

const valid = { platform: "linux", architecture: "x64", node: "v24.21.0", npm: "11.19.0" };
const rows = FIRST_PLAYABLE_VECTOR_IDS.map((vectorId) => ({ vectorId }));
type MutableOracleVector = {
  componentJson: { harmony: string };
  utf8ByteLengths: { harmony: number };
  componentHashes: { harmony: string };
  resultHash: string;
  canonicalUtf8Sha256: string;
};

async function inducedMismatch(
  change: (vector: MutableOracleVector) => void,
): Promise<FirstPlayableMismatch> {
  const sources = JSON.parse(
    readFileSync("docs/reviews/FIRST_PLAYABLE_SOURCE_RECORDS.json", "utf8"),
  );
  const oracle = JSON.parse(
    readFileSync("docs/reviews/FIRST_PLAYABLE_CANONICAL_ORACLE.json", "utf8"),
  ) as {
    status: string;
    sourceManifestSha256: string;
    referenceManifestSha256: string;
    vectors: MutableOracleVector[];
  };
  change(oracle.vectors[0]);
  try {
    await executeFrozenRow(0, { sources, oracle, identities: [] as never });
  } catch (error) {
    expect(error).toBeInstanceOf(FirstPlayableMismatch);
    return error as FirstPlayableMismatch;
  }
  throw new Error("Induced qualification mismatch was not rejected");
}

function persistedFailure(mismatch: FirstPlayableMismatch) {
  const directory = mkdtempSync(join(tmpdir(), "nightdrive-fp-mismatch-"));
  try {
    expect(() =>
      runLinuxFirstPlayableEvidence(directory, { forceComparisonFailure: mismatch }),
    ).toThrow();
    const artifact = JSON.parse(
      readFileSync(join(directory, "first-playable-linux-evidence.json"), "utf8"),
    );
    expect(artifact.status).toBe("FAIL");
    expect(artifact.diagnostics.phase).toBe("row-execution");
    expect(artifact.diagnostics.vectorId).toBe("FP-01");
    expect(artifact.runs).toBeUndefined();
    const line = workerMismatchLine(mismatch);
    expect(line).toBeDefined();
    expect(parseWorkerMismatch(`${line}\n`)?.diagnostic).toEqual(mismatch.diagnostic);
    return artifact.diagnostics;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("First Playable Linux evidence harness", () => {
  it("requires the exact qualified runtime", () => {
    expect(() => assertLinuxEnvironment(valid)).not.toThrow();
    for (const change of [
      { platform: "win32" },
      { architecture: "arm64" },
      { node: "v24.19.0" },
      { npm: "11.18.0" },
    ])
      expect(() => assertLinuxEnvironment({ ...valid, ...change })).toThrow();
  });

  it("requires complete GitHub Linux runner identity", () => {
    const ci = {
      githubActions: "true",
      githubRunId: "123",
      githubRunAttempt: "1",
      githubJob: "validate",
      runnerOs: "Linux",
      runnerArchitecture: "X64",
      runnerName: "GitHub Actions 1",
      runnerImage: "ubuntu24",
      runnerImageVersion: "20260901",
    };
    expect(() => assertLinuxCiIdentity(ci)).not.toThrow();
    expect(() => assertLinuxCiIdentity({ ...ci, githubRunId: "local" })).toThrow();
    expect(() => assertLinuxCiIdentity({ ...ci, runnerArchitecture: "ARM64" })).toThrow();
  });

  it("rejects missing, duplicate, extra and unordered rows", () => {
    expect(() => assertRowOrder(rows)).not.toThrow();
    expect(() => assertRowOrder(rows.slice(1))).toThrow();
    expect(() => assertRowOrder([...rows, rows[0] as { vectorId: string }])).toThrow();
    expect(() => assertRowOrder([...rows.slice(0, 11), rows[0] as { vectorId: string }])).toThrow();
    expect(() => assertRowOrder([...rows].reverse())).toThrow();
  });

  it("requires all four distinct ambient executions", () => {
    const runs = FIRST_PLAYABLE_LINUX_AMBIENT.map(({ name }) => ({ name, rows }));
    expect(() => assertAmbientRuns(runs)).not.toThrow();
    expect(() => assertAmbientRuns(runs.slice(1))).toThrow();
    expect(() => assertAmbientRuns([runs[0], runs[0], runs[2], runs[3]] as typeof runs)).toThrow();
  });

  it("checks every frozen artifact by raw bytes before returning vectors", () => {
    expect(() =>
      verifyFrozenCustody((path) => {
        if (path.endsWith("FIRST_PLAYABLE_REFERENCE_MANIFEST.json")) {
          const original = readFileSync(path);
          return Buffer.concat([original, Buffer.from(" ")]);
        }
        return readFileSync(path);
      }),
    ).toThrow();
    expect(() =>
      verifyFrozenCustody((path) => {
        if (path.endsWith("FIRST_PLAYABLE_SOURCE_RECORDS.json"))
          throw new Error("missing frozen source records");
        return readFileSync(path);
      }),
    ).toThrow("missing frozen source records");
  });

  it("retains actual production bytes and replay values for all frozen rows", async () => {
    const paths = [
      "docs/reviews/FIRST_PLAYABLE_SOURCE_RECORDS.json",
      "docs/reviews/FIRST_PLAYABLE_SOURCE_MANIFEST.json",
      "docs/reviews/FIRST_PLAYABLE_REFERENCE_MANIFEST.json",
      "docs/reviews/FIRST_PLAYABLE_CANONICAL_ORACLE.json",
      "docs/reviews/FIRST_PLAYABLE_ORACLE_RECOMPUTATION.json",
    ];
    const before = paths.map((path) => readFileSync(path));
    const sources = JSON.parse(
      readFileSync("docs/reviews/FIRST_PLAYABLE_SOURCE_RECORDS.json", "utf8"),
    );
    const oracle = JSON.parse(
      readFileSync("docs/reviews/FIRST_PLAYABLE_CANONICAL_ORACLE.json", "utf8"),
    );
    const actual = [];
    for (let index = 0; index < 12; index += 1)
      actual.push(await executeFrozenRow(index, { sources, oracle, identities: [] as never }));
    assertRowOrder(actual);
    for (const row of actual) {
      expect(Buffer.from(row.utf8Base64.canonical as string, "base64").toString("utf8")).toBe(
        row.canonicalJson,
      );
      expect(row.replayCanonicalJson).toBe(row.canonicalJson);
      expect(row.verifierAccepted).toBe(true);
    }
    paths.forEach((path, index) => {
      expect(readFileSync(path).equals(before[index] as Buffer)).toBe(true);
    });
  }, 30_000);

  it("writes a FAIL artifact and propagates a preflight failure without executing rows", () => {
    const directory = mkdtempSync(join(tmpdir(), "nightdrive-fp-linux-fail-"));
    try {
      expect(() =>
        runLinuxFirstPlayableEvidence(directory, { forcePreflightFailure: true }),
      ).toThrow("Forced First Playable preflight failure");
      const artifact = JSON.parse(
        readFileSync(join(directory, "first-playable-linux-evidence.json"), "utf8"),
      );
      expect(artifact.status).toBe("FAIL");
      expect(artifact.diagnostics.phase).toBe("preflight");
      expect(artifact.runs).toBeUndefined();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("retains first-byte and explicit-length mismatch details", async () => {
    const bytes = persistedFailure(
      await inducedMismatch((vector) => {
        vector.componentJson.harmony += " ";
      }),
    );
    expect(bytes.field).toBe("harmonyJson");
    expect(bytes.firstByteOffset).toBeTypeOf("number");
    expect(bytes.actualLength).toBeTypeOf("number");
    expect(bytes.expectedLength).toBeTypeOf("number");
    expect(bytes.actualSha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(bytes.expectedSha256).toMatch(/^[0-9a-f]{64}$/u);
    const length = persistedFailure(
      await inducedMismatch((vector) => {
        vector.utf8ByteLengths.harmony += 1;
      }),
    );
    expect(length.field).toBe("utf8ByteLengths.harmony");
    expect(length.actualLength).toBe(length.expectedLength - 1);
    expect(length.actualSha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(length.expectedSha256).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("retains actual, expected and independently calculated component digests", async () => {
    const details = persistedFailure(
      await inducedMismatch((vector) => {
        vector.componentHashes.harmony = "0".repeat(64);
      }),
    );
    expect(details.field).toBe("componentHashes.harmony");
    expect(details.actualSha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(details.expectedSha256).toBe("0".repeat(64));
    expect(details.calculatedSha256).toBe(details.actualSha256);
  });

  it("retains actual and expected resultHash plus calculated hash-input digest", async () => {
    const details = persistedFailure(
      await inducedMismatch((vector) => {
        vector.resultHash = "0".repeat(64);
      }),
    );
    expect(details.field).toBe("resultHash");
    expect(details.actualSha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(details.expectedSha256).toBe("0".repeat(64));
    expect(details.calculatedSha256).toBe(details.actualSha256);
  });

  it("retains independently calculated and frozen final-byte digests", async () => {
    const details = persistedFailure(
      await inducedMismatch((vector) => {
        vector.canonicalUtf8Sha256 = "0".repeat(64);
      }),
    );
    expect(details.field).toBe("canonicalUtf8Sha256");
    expect(details.actualSha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(details.expectedSha256).toBe("0".repeat(64));
  });

  it("carries structured mismatch evidence through a failing fresh-process worker", () => {
    const result = spawnSync(
      process.execPath,
      [
        resolve("node_modules/vitest/vitest.mjs"),
        "run",
        "src/evaluation/first-playable-linux-worker.test.ts",
        "--reporter=dot",
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          FP_LINUX_WORKER: "1",
          FP_LINUX_INDEX: "0",
          FP_LINUX_TEST_MISMATCH: "1",
        },
        encoding: "utf8",
      },
    );
    expect(result.status).not.toBe(0);
    const diagnostic = parseWorkerMismatch(`${result.stdout}\n${result.stderr}`)?.diagnostic;
    expect(diagnostic).toMatchObject({
      vectorId: "FP-01",
      field: "componentHashes.harmony",
      actualSha256: "a".repeat(64),
      expectedSha256: "b".repeat(64),
    });
  }, 30_000);

  it.skipIf(process.env.FP_LINUX_EVIDENCE !== "1")(
    "writes complete actual evidence only on explicit Linux opt-in",
    () => {
      runLinuxFirstPlayableEvidence(defaultLinuxEvidenceDirectory());
    },
    600_000,
  );
});
