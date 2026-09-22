import { describe, expect, it } from "vitest";
import {
  assertLinuxAc004Environment,
  canonicalEvidenceJson,
  runLinuxAc004Evidence,
  STAGE7_AC004_LINUX_VECTOR_IDS,
} from "./stage7-ac004-linux-evidence";

describe("Stage 7 AC-004 Linux evidence harness", () => {
  it("rejects a wrong Node version or architecture before execution", () => {
    expect(() => assertLinuxAc004Environment({ node: "v22.17.1", architecture: "x64" })).toThrow(
      "Node v24.21.0",
    );
    expect(() => assertLinuxAc004Environment({ node: "v24.21.0", architecture: "arm64" })).toThrow(
      "architecture x64",
    );
  });

  it("produces deterministic canonical ordering and rejects duplicate/missing IDs", () => {
    const row = (vectorId: string) => ({
      vectorId,
      sourceRecordId: vectorId,
      profileId: "profile",
      profileVersion: "v1",
      policyVersion: "v1",
      rootSeed: 0,
      energy: "medium",
      complexity: "medium",
      aggregateByteLength: 1,
      harmonySha256: "a",
      arpeggiatorSha256: "b",
      resultHash: "c",
    });
    const rows = STAGE7_AC004_LINUX_VECTOR_IDS.map(row);
    expect(canonicalEvidenceJson([...rows].reverse())).toBe(canonicalEvidenceJson(rows));
    expect(() =>
      canonicalEvidenceJson([...rows.slice(0, 16), row(rows[0]?.vectorId ?? "")]),
    ).toThrow("Duplicate AC-004 vector ID");
    expect(() => canonicalEvidenceJson([...rows.slice(0, 16), row("missing")])).toThrow(
      "Missing AC-004 vector ID",
    );
  });

  it("keeps environment metadata outside the canonical comparison payload", () => {
    const source = canonicalEvidenceJson(
      STAGE7_AC004_LINUX_VECTOR_IDS.map((vectorId) => ({
        vectorId,
        sourceRecordId: vectorId,
        profileId: "profile",
        profileVersion: "v1",
        policyVersion: "v1",
        rootSeed: 0,
        energy: "medium",
        complexity: "medium",
        aggregateByteLength: 1,
        harmonySha256: "a",
        arpeggiatorSha256: "b",
        resultHash: "c",
      })),
    );
    expect(source).not.toContain("runner");
    expect(source).not.toContain("node");
  });

  it.skipIf(process.env.AC004_LINUX_EVIDENCE !== "1")(
    "executes the complete Linux x64 fresh-process matrix and writes durable evidence",
    () => {
      const artifact = runLinuxAc004Evidence(
        process.env.AC004_OUTPUT_DIR ?? "./.ac004-linux-evidence",
      );
      expect(artifact.canonical.vectorCount).toBe(17);
      expect(artifact.ambientVariants.every((variant) => variant.matchesBase)).toBe(true);
    },
  );
});
