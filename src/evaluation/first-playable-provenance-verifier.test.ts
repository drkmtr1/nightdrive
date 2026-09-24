import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  inspectInstalledTool,
  verifyGeneratedArtifact,
  verifyHistoricalCheckout,
  verifyTrackedBlob,
} from "./first-playable-provenance-verifier";

const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const identity = (bytes: Uint8Array) => ({ byteLength: bytes.byteLength, sha256: sha256(bytes) });
const git = (cwd: string, ...args: string[]): Buffer =>
  execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });

function acceptedBlob(path: string): Buffer {
  // HEAD contains these accepted artifacts even in a shallow CI checkout.
  return git(process.cwd(), "show", `HEAD:${path}`);
}

describe("First Playable ADR-024 provenance verifier", () => {
  it("uses the recorded immutable Git blob rather than the checkout or current HEAD", () => {
    const root = mkdtempSync(join(tmpdir(), "nightdrive-provenance-"));
    try {
      git(root, "init", "-q");
      writeFileSync(join(root, "source.txt"), "one\ntwo\n");
      git(root, "add", "source.txt");
      git(
        root,
        "-c",
        "user.name=Fixture",
        "-c",
        "user.email=fixture@example.invalid",
        "commit",
        "-qm",
        "first",
      );
      const commit = git(root, "rev-parse", "HEAD").toString("utf8").trim();
      const blob = git(root, "show", `${commit}:source.txt`);
      const gitBlobOid = git(root, "rev-parse", `${commit}:source.txt`).toString("utf8").trim();
      const recorded = { commit, path: "source.txt", ...identity(blob), gitBlobOid };

      writeFileSync(join(root, "source.txt"), "different working tree\r\n");
      expect(verifyTrackedBlob(root, recorded)).toEqual(blob);
      git(root, "add", "source.txt");
      git(
        root,
        "-c",
        "user.name=Fixture",
        "-c",
        "user.email=fixture@example.invalid",
        "commit",
        "-qm",
        "second",
      );
      expect(verifyTrackedBlob(root, recorded)).toEqual(blob);
      expect(() => verifyTrackedBlob(root, { ...recorded, byteLength: blob.length + 1 })).toThrow(
        "byte length mismatch",
      );
      expect(() => verifyTrackedBlob(root, { ...recorded, sha256: "0".repeat(64) })).toThrow(
        "SHA-256 mismatch",
      );
      expect(() => verifyTrackedBlob(root, { ...recorded, gitBlobOid: "0".repeat(40) })).toThrow(
        "Git blob OID mismatch",
      );
      expect(() => verifyTrackedBlob(root, { ...recorded, commit: "HEAD" })).toThrow(
        "invalid full commit SHA",
      );
      expect(() => verifyTrackedBlob(root, { ...recorded, commit: "0".repeat(40) })).toThrow(
        "unavailable",
      );
      expect(() => verifyTrackedBlob(root, { ...recorded, path: "missing.txt" })).toThrow(
        "unavailable",
      );
      for (const path of ["/absolute", "C:/absolute", "dir\\file", "../source.txt"]) {
        expect(() => verifyTrackedBlob(root, { ...recorded, path })).toThrow(
          "invalid slash-relative path",
        );
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("retains historical checkout bytes as a separately explained observation", () => {
    const portable = Buffer.from("a\nb\n", "utf8");
    const expanded = Buffer.from("a\r\nb\r\n", "utf8");
    const common = { platform: "win32", architecture: "arm64" };
    expect(
      verifyHistoricalCheckout(portable, {
        ...common,
        ...identity(portable),
        relationship: "raw-git-blob",
      }),
    ).toEqual({ kind: "historical-checkout", ...common });
    expect(
      verifyHistoricalCheckout(
        portable,
        { ...common, ...identity(expanded), relationship: "lf-to-crlf" },
        expanded,
      ),
    ).toEqual({ kind: "historical-checkout", ...common });
    expect(() =>
      verifyHistoricalCheckout(portable, {
        ...common,
        ...identity(expanded),
        relationship: "raw-git-blob",
      }),
    ).toThrow("byte length mismatch");
    expect(() =>
      verifyHistoricalCheckout(
        portable,
        { ...common, ...identity(expanded), relationship: "lf-to-crlf" },
        Buffer.from("altered"),
      ),
    ).toThrow("bytes do not match claimed relationship");
    expect(() =>
      verifyHistoricalCheckout(portable, {
        ...common,
        ...identity(portable),
        relationship: "unexplained" as "raw-git-blob",
      }),
    ).toThrow("unexplained checkout relationship");
    // No working-tree path or historical Git configuration enters this call.
  });

  it("requires exact generated-artifact bytes without reclassifying them as tracked source", () => {
    const bytes = Buffer.from('{"evidence":true}\n', "utf8");
    expect(verifyGeneratedArtifact(bytes, identity(bytes))).toEqual({ kind: "generated-artifact" });
    const altered = Buffer.from(bytes);
    altered[1] ^= 1;
    expect(() => verifyGeneratedArtifact(altered, identity(bytes))).toThrow("SHA-256 mismatch");
  });

  it("retains installed Windows ARM64 tool evidence without asserting Linux qualification", () => {
    const observation = {
      platform: "win32",
      architecture: "arm64",
      packageName: "@biomejs/cli-win32-arm64",
      packageVersion: "2.5.12",
      files: [
        {
          path: "node_modules/@biomejs/cli-win32-arm64/biome.exe",
          byteLength: 64,
          sha256: "a".repeat(64),
        },
      ],
    };
    expect(inspectInstalledTool(observation)).toEqual({
      kind: "installed-tool",
      platform: "win32",
      architecture: "arm64",
      packageName: observation.packageName,
      packageVersion: observation.packageVersion,
      fileCount: 1,
    });
    expect(() => inspectInstalledTool({ ...observation, files: [] })).toThrow("incomplete");
    // Structural inspection does not open node_modules or claim a Linux PASS.
  });

  it("recognizes accepted evidence classes and exact raw artifact identities", () => {
    const sourcePath = "docs/reviews/FIRST_PLAYABLE_SOURCE_MANIFEST.json";
    const referencePath = "docs/reviews/FIRST_PLAYABLE_REFERENCE_MANIFEST.json";
    const recordsPath = "docs/reviews/FIRST_PLAYABLE_SOURCE_RECORDS.json";
    const sourceBytes = acceptedBlob(sourcePath);
    const referenceBytes = acceptedBlob(referencePath);
    const recordsBytes = acceptedBlob(recordsPath);
    expect(identity(sourceBytes)).toEqual({
      byteLength: 27554,
      sha256: "b024ccc2e4b4507cee2614f86a117836817c91e030bc5311a98d06a4264202f1",
    });
    expect(identity(referenceBytes)).toEqual({
      byteLength: 61686,
      sha256: "087a23f06a1bbe5dd834b6c533de0c9a5aef9228c719667390d33458ac514a28",
    });
    expect(identity(recordsBytes)).toEqual({
      byteLength: 124275,
      sha256: "3a067218a0dd9d992e236ccff5fab839fa8c14b832c3436718453f305fda1946",
    });
    const source = JSON.parse(sourceBytes.toString("utf8"));
    const reference = JSON.parse(referenceBytes.toString("utf8"));
    const records = JSON.parse(recordsBytes.toString("utf8"));
    expect(source.status).toBe("ACCEPTED/FROZEN");
    expect(reference.status).toBe("ACCEPTED/FROZEN");
    expect(source).not.toHaveProperty("fileInventory");
    expect(reference).not.toHaveProperty("fileInventory");
    expect(source.trackedSourceBlobInventory).toHaveLength(61);
    expect(source.historicalCaptureInventory).toHaveLength(62);
    expect(source.sourceRecords).toMatchObject(identity(recordsBytes));
    expect(reference.trackedSourceBlobInventory).toHaveLength(15);
    expect(reference.generatedEvidenceArtifacts).toHaveLength(3);
    expect(reference.historicalCheckoutEvidence.files).toHaveLength(15);
    expect(
      reference.installedToolEvidence.packages.flatMap(
        (entry: { files: unknown[] }) => entry.files,
      ),
    ).toHaveLength(9);
    expect(records.vectors.map((vector: { vectorId: string }) => vector.vectorId)).toEqual(
      Array.from({ length: 12 }, (_, index) => `FP-${String(index + 1).padStart(2, "0")}`),
    );
    expect(verifyGeneratedArtifact(recordsBytes, source.sourceRecords)).toEqual({
      kind: "generated-artifact",
    });
  });

  it("is isolated from production canonical and candidate-reference modules", () => {
    const moduleText = readFileSync("src/evaluation/first-playable-provenance-verifier.ts", "utf8");
    const testText = readFileSync(
      "src/evaluation/first-playable-provenance-verifier.test.ts",
      "utf8",
    );
    for (const text of [moduleText, testText]) {
      expect(text).not.toMatch(
        /from ["'][^"']*(?:composition-engine|canonical-serialization|first-playable-reference-vectors)[^"']*["']/,
      );
      expect(text).not.toMatch(/https?:\/\/|\bfetch\(|\bwriteFileSync\(\s*["']docs\/reviews\//);
    }
    expect(moduleText).not.toMatch(/\bwriteFileSync\b|\bmkdirSync\b|\brmSync\b/);
  });
});
