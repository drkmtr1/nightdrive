import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import {
  assertAmbientRuns,
  assertLinuxCiIdentity,
  assertLinuxEnvironment,
  assertRowOrder,
  defaultLinuxEvidenceDirectory,
  executeFrozenRow,
  FirstPlayableMismatch,
  FrozenArtifactCustodyFailure,
  inspectRepositoryIntegrity,
  parseWorkerMismatch,
  runLinuxFirstPlayableEvidence,
  verifyFrozenCustody,
  verifyTrackedSourceCustody,
  workerMismatchLine,
  FIRST_PLAYABLE_LINUX_AMBIENT,
} from "./first-playable-linux-evidence";
import { FIRST_PLAYABLE_VECTOR_IDS } from "./first-playable-reference-vectors";

const valid = { platform: "linux", architecture: "x64", node: "v24.21.0", npm: "11.19.0" };
const rows = FIRST_PLAYABLE_VECTOR_IDS.map((vectorId) => ({ vectorId }));

function withGitFixture(
  run: (fixture: { root: string; testedCommit: string; git: (args: string[]) => string }) => void,
): void {
  const root = mkdtempSync(join(tmpdir(), "nightdrive-fp-integrity-"));
  if (!resolve(root).startsWith(`${resolve(tmpdir())}${sep}`))
    throw new Error("Temporary Git fixture escaped the temporary directory");
  const git = (args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  try {
    git(["init", "-q"]);
    git(["config", "user.email", "fixture@example.invalid"]);
    git(["config", "user.name", "Fixture"]);
    git(["config", "core.autocrlf", "false"]);
    writeFileSync(
      join(root, ".gitignore"),
      "node_modules/\n.next/\ntsconfig.tsbuildinfo\n.env\ntemp/\n.idea/\n*.log\n",
    );
    writeFileSync(join(root, "tracked.txt"), "baseline\n");
    git(["add", "."]);
    git(["commit", "-qm", "baseline"]);
    run({ root, testedCommit: git(["rev-parse", "HEAD"]), git });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
type MutableOracleVector = {
  normalizedRequest: Record<string, unknown>;
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
  it("accepts only the authority-backed locked npm installation", () => {
    withGitFixture(({ root, testedCommit }) => {
      mkdirSync(join(root, "node_modules"));
      writeFileSync(join(root, "node_modules", "package.json"), "{}");
      const evidence = inspectRepositoryIntegrity(root, testedCommit);
      expect(evidence.disposition, JSON.stringify(evidence, null, 2)).toBe("PASS");
      expect(evidence.observedHead).toBe(testedCommit);
      expect(evidence.headMatchesTestedCommit).toBe(true);
      expect(evidence.ignoredState.entries).toEqual([
        expect.objectContaining({
          path: "node_modules/",
          role: "locked-installation-input",
          disposition: "LOCKED_INSTALLATION_INPUT",
          reason: expect.stringContaining("npm, package-lock, and actual runtime evidence"),
        }),
      ]);
    });
  });

  it("does not exempt ignored build, compiler, cache, log, temp, or editor paths", () => {
    withGitFixture(({ root, testedCommit }) => {
      mkdirSync(join(root, ".next"));
      writeFileSync(join(root, ".next", "cache.bin"), "build output");
      writeFileSync(join(root, "tsconfig.tsbuildinfo"), "compiler output");
      mkdirSync(join(root, "temp"));
      writeFileSync(join(root, "temp", "scratch"), "temporary output");
      mkdirSync(join(root, ".idea"));
      writeFileSync(join(root, ".idea", "workspace.xml"), "editor output");
      writeFileSync(join(root, "debug.log"), "log output");
      const evidence = inspectRepositoryIntegrity(root, testedCommit);
      expect(evidence.disposition).toBe("FAIL");
      for (const path of [".idea/", ".next/", "debug.log", "temp/", "tsconfig.tsbuildinfo"])
        expect(evidence.ignoredState.entries).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path,
              role: "unknown-ignored-state",
              disposition: "FAIL",
              reason: expect.stringContaining("No accepted non-input or locked-toolchain role"),
            }),
          ]),
        );
    });
  });

  it("rejects a different HEAD even when its tracked tree is unchanged", () => {
    withGitFixture(({ root, testedCommit, git }) => {
      git(["commit", "--allow-empty", "-qm", "different commit"]);
      const evidence = inspectRepositoryIntegrity(root, testedCommit);
      expect(evidence.disposition).toBe("FAIL");
      expect(evidence.testedCommit).toBe(testedCommit);
      expect(evidence.observedHead).toBe(git(["rev-parse", "HEAD"]));
      expect(evidence.headMatchesTestedCommit).toBe(false);
      expect(evidence.commitToIndex.disposition).toBe("PASS");
    });
  });

  it("retains staged and unstaged tracked path/status evidence", () => {
    withGitFixture(({ root, testedCommit, git }) => {
      writeFileSync(join(root, "tracked.txt"), "staged\n");
      git(["add", "tracked.txt"]);
      let evidence = inspectRepositoryIntegrity(root, testedCommit);
      expect(evidence.disposition).toBe("FAIL");
      expect(evidence.commitToIndex.entries).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: "tracked.txt", status: "M" })]),
      );
      expect(evidence.indexToWorktree.disposition).toBe("PASS");
      writeFileSync(join(root, "tracked.txt"), "unstaged\n");
      evidence = inspectRepositoryIntegrity(root, testedCommit);
      expect(evidence.indexToWorktree.entries).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: "tracked.txt", status: "M" })]),
      );
    });
  });

  it("rejects tracked deletion, addition, and replacement", () => {
    withGitFixture(({ root, testedCommit, git }) => {
      rmSync(join(root, "tracked.txt"));
      let evidence = inspectRepositoryIntegrity(root, testedCommit);
      expect(evidence.indexToWorktree.entries).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: "tracked.txt", status: "D" })]),
      );
      writeFileSync(join(root, "replacement.txt"), "replacement\n");
      git(["add", "-A"]);
      evidence = inspectRepositoryIntegrity(root, testedCommit);
      expect(evidence.commitToIndex.entries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "tracked.txt", status: "D" }),
          expect.objectContaining({ path: "replacement.txt", status: "A" }),
        ]),
      );
    });
  });

  it("rejects unknown untracked and execution-affecting ignored paths", () => {
    withGitFixture(({ root, testedCommit }) => {
      writeFileSync(join(root, "unexpected file.txt"), "unexpected");
      writeFileSync(join(root, ".env"), "fixture only");
      const evidence = inspectRepositoryIntegrity(root, testedCommit);
      expect(evidence.untracked.entries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "unexpected file.txt",
            pathBase64: Buffer.from("unexpected file.txt").toString("base64"),
          }),
        ]),
      );
      expect(evidence.ignoredState.entries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ".env",
            role: "unknown-ignored-state",
            disposition: "FAIL",
            reason: expect.stringContaining("actual qualification invocation"),
          }),
        ]),
      );
      expect(evidence.disposition).toBe("FAIL");
    });
  });

  it("rejects an unmerged index and retains its staged path", () => {
    withGitFixture(({ root, testedCommit, git }) => {
      git(["switch", "-qc", "left"]);
      writeFileSync(join(root, "tracked.txt"), "left\n");
      git(["add", "tracked.txt"]);
      git(["commit", "-qm", "left"]);
      git(["switch", "-qc", "right", testedCommit]);
      writeFileSync(join(root, "tracked.txt"), "right\n");
      git(["add", "tracked.txt"]);
      git(["commit", "-qm", "right"]);
      const merge = spawnSync("git", ["merge", "left"], { cwd: root });
      expect(merge.status).not.toBe(0);
      const evidence = inspectRepositoryIntegrity(root, testedCommit);
      expect(evidence.unmerged.entries).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: "tracked.txt" })]),
      );
      expect(evidence.disposition).toBe("FAIL");
    });
  });

  it("rejects assume-unchanged, skip-worktree, and sparse checkout state", () => {
    withGitFixture(({ root, testedCommit, git }) => {
      git(["update-index", "--assume-unchanged", "tracked.txt"]);
      let evidence = inspectRepositoryIntegrity(root, testedCommit);
      expect(evidence.inspectionSuppressingState.entries).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: "tracked.txt", flag: "h" })]),
      );
      git(["update-index", "--no-assume-unchanged", "tracked.txt"]);
      git(["update-index", "--skip-worktree", "tracked.txt"]);
      evidence = inspectRepositoryIntegrity(root, testedCommit);
      expect(evidence.inspectionSuppressingState.entries).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: "tracked.txt", flag: "S" })]),
      );
      git(["update-index", "--no-skip-worktree", "tracked.txt"]);
      git(["config", "core.sparseCheckout", "true"]);
      evidence = inspectRepositoryIntegrity(root, testedCommit);
      expect(evidence.inspectionSuppressingState.sparseCheckout).toBe(true);
      expect(evidence.disposition).toBe("FAIL");
    });
  });

  it("writes exact repository failure evidence and executes no rows", () => {
    const directory = mkdtempSync(join(tmpdir(), "nightdrive-fp-integrity-fail-"));
    if (!resolve(directory).startsWith(`${resolve(tmpdir())}${sep}`))
      throw new Error("Evidence fixture escaped the temporary directory");
    try {
      withGitFixture(({ root, testedCommit }) => {
        writeFileSync(join(root, "tracked.txt"), "changed\n");
        expect(() =>
          runLinuxFirstPlayableEvidence(directory, {
            preflightFixture: { repositoryRoot: root, testedCommit },
          }),
        ).toThrow("First Playable repository integrity failed");
        const artifact = JSON.parse(
          readFileSync(join(directory, "first-playable-linux-evidence.json"), "utf8"),
        );
        expect(artifact.status).toBe("FAIL");
        expect(artifact.diagnostics.phase).toBe("preflight");
        expect(artifact.environment.testedCommit).toBe(testedCommit);
        expect(artifact.environment.observedHead).toBe(testedCommit);
        expect(artifact.diagnostics.repositoryIntegrity.indexToWorktree.entries).toEqual(
          expect.arrayContaining([expect.objectContaining({ path: "tracked.txt", status: "M" })]),
        );
        expect(artifact.runs).toBeUndefined();
        expect(artifact.failedProcess).toBeUndefined();
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("persists ignored-state failure evidence and executes no workers", () => {
    const directory = mkdtempSync(join(tmpdir(), "nightdrive-fp-ignored-fail-"));
    if (!resolve(directory).startsWith(`${resolve(tmpdir())}${sep}`))
      throw new Error("Evidence fixture escaped the temporary directory");
    try {
      withGitFixture(({ root, testedCommit }) => {
        mkdirSync(join(root, ".next"));
        writeFileSync(join(root, ".next", "cache.bin"), "build output");
        expect(() =>
          runLinuxFirstPlayableEvidence(directory, {
            preflightFixture: { repositoryRoot: root, testedCommit },
          }),
        ).toThrow("First Playable repository integrity failed");
        const artifact = JSON.parse(
          readFileSync(join(directory, "first-playable-linux-evidence.json"), "utf8"),
        );
        expect(artifact.status).toBe("FAIL");
        expect(artifact.diagnostics.phase).toBe("preflight");
        expect(artifact.diagnostics.repositoryIntegrity.ignoredState).toMatchObject({
          disposition: "FAIL",
          entries: [
            {
              path: ".next/",
              pathBase64: Buffer.from(".next/").toString("base64"),
              role: "unknown-ignored-state",
              disposition: "FAIL",
              reason:
                "No accepted non-input or locked-toolchain role is established for this ignored path in the actual qualification invocation.",
            },
          ],
        });
        expect(artifact.runs).toBeUndefined();
        expect(artifact.failedProcess).toBeUndefined();
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("persists both commit identities on a HEAD mismatch", () => {
    const directory = mkdtempSync(join(tmpdir(), "nightdrive-fp-head-fail-"));
    if (!resolve(directory).startsWith(`${resolve(tmpdir())}${sep}`))
      throw new Error("Evidence fixture escaped the temporary directory");
    try {
      withGitFixture(({ root, testedCommit, git }) => {
        git(["commit", "--allow-empty", "-qm", "different checkout"]);
        expect(() =>
          runLinuxFirstPlayableEvidence(directory, {
            preflightFixture: { repositoryRoot: root, testedCommit },
          }),
        ).toThrow("First Playable repository integrity failed");
        const artifact = JSON.parse(
          readFileSync(join(directory, "first-playable-linux-evidence.json"), "utf8"),
        );
        expect(artifact.status).toBe("FAIL");
        expect(artifact.environment.testedCommit).toBe(testedCommit);
        expect(artifact.environment.observedHead).toBe(git(["rev-parse", "HEAD"]));
        expect(artifact.diagnostics.repositoryIntegrity.headMatchesTestedCommit).toBe(false);
        expect(artifact.runs).toBeUndefined();
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

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

  it("verifies every accepted tracked source identity against its immutable Git blob", () => {
    const manifest = JSON.parse(
      readFileSync("docs/reviews/FIRST_PLAYABLE_SOURCE_MANIFEST.json", "utf8"),
    );
    const evidence = verifyTrackedSourceCustody(process.cwd(), manifest);
    expect(evidence.disposition).toBe("PASS");
    expect(evidence.count).toBe(61);
    expect(evidence.identities).toEqual(manifest.trackedSourceBlobInventory);
    expect(evidence.historicalCheckout).toMatchObject({
      disposition: "PASS",
      platform: "win32",
      architecture: "arm64",
      count: 61,
    });
    expect(
      evidence.historicalCheckout.relationships.filter(
        ({ relationship }) => relationship === "raw-git-blob",
      ),
    ).toHaveLength(6);
    expect(
      evidence.historicalCheckout.relationships.filter(
        ({ relationship }) => relationship === "lf-to-crlf",
      ),
    ).toHaveLength(55);

    const mismatched = structuredClone(manifest);
    mismatched.trackedSourceBlobInventory[0].sha256 = "0".repeat(64);
    expect(() => verifyTrackedSourceCustody(process.cwd(), mismatched)).toThrow(
      "tracked blob SHA-256 mismatch",
    );

    const invalidHistorical = structuredClone(manifest);
    invalidHistorical.historicalCaptureInventory[0].sha256 = "0".repeat(64);
    expect(() => verifyTrackedSourceCustody(process.cwd(), invalidHistorical)).toThrow(
      "historical checkout SHA-256 mismatch",
    );
  }, 30_000);

  it("retains exact frozen-artifact identity on a raw-byte mismatch", () => {
    const original = readFileSync("docs/reviews/FIRST_PLAYABLE_SOURCE_RECORDS.json");
    const altered = Buffer.concat([original, Buffer.from(" ")]);
    withGitFixture(({ root, testedCommit }) => {
      expect(inspectRepositoryIntegrity(root, testedCommit).disposition).toBe("PASS");
    });
    try {
      verifyFrozenCustody((path) =>
        path.endsWith("FIRST_PLAYABLE_SOURCE_RECORDS.json") ? altered : readFileSync(path),
      );
      throw new Error("Altered frozen source records were accepted");
    } catch (error) {
      expect(error).toBeInstanceOf(FrozenArtifactCustodyFailure);
      const diagnostic = (error as FrozenArtifactCustodyFailure).diagnostic;
      expect(diagnostic).toMatchObject({
        disposition: "FAIL",
        path: "docs/reviews/FIRST_PLAYABLE_SOURCE_RECORDS.json",
        expectedByteLength: original.byteLength,
        actualByteLength: altered.byteLength,
        expectedSha256: createHash("sha256").update(original).digest("hex"),
        actualSha256: createHash("sha256").update(altered).digest("hex"),
      });
      const directory = mkdtempSync(join(tmpdir(), "nightdrive-fp-custody-fail-"));
      if (!resolve(directory).startsWith(`${resolve(tmpdir())}${sep}`))
        throw new Error("Evidence fixture escaped the temporary directory");
      try {
        expect(() =>
          runLinuxFirstPlayableEvidence(directory, {
            forceCustodyFailure: error as FrozenArtifactCustodyFailure,
          }),
        ).toThrow("Frozen artifact raw-byte mismatch");
        const artifact = JSON.parse(
          readFileSync(join(directory, "first-playable-linux-evidence.json"), "utf8"),
        );
        expect(artifact.status).toBe("FAIL");
        expect(artifact.diagnostics).toMatchObject({ phase: "frozen-custody", ...diagnostic });
        expect(artifact.runs).toBeUndefined();
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    }
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

  it("rejects an oracle/source normalized-request mismatch before production comparison", async () => {
    const mismatch = await inducedMismatch((vector) => {
      vector.normalizedRequest.rootSeed = 1;
    });
    expect(mismatch.diagnostic.field).toBe("normalizedRequest");
    expect(mismatch.diagnostic.firstByteOffset).toBeTypeOf("number");
    expect(mismatch.diagnostic.actualSha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(mismatch.diagnostic.expectedSha256).toMatch(/^[0-9a-f]{64}$/u);
  });

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
