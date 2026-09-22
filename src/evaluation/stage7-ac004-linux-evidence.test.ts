import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertLinuxAc004Environment,
  canonicalEvidenceJson,
  runLinuxAc004Evidence,
  sha256Utf8,
  STAGE7_AC004_LINUX_NPM_VERSION,
  STAGE7_AC004_LINUX_NODE_VERSION,
  STAGE7_AC004_LINUX_ARCHITECTURE,
  STAGE7_AC004_LINUX_VECTOR_IDS,
} from "./stage7-ac004-linux-evidence";

describe("Stage 7 AC-004 Linux evidence harness", () => {
  it("accepts only the locked Linux/x64/Node/npm environment", () => {
    expect(() =>
      assertLinuxAc004Environment({
        os: "linux",
        node: STAGE7_AC004_LINUX_NODE_VERSION,
        npm: STAGE7_AC004_LINUX_NPM_VERSION,
        architecture: STAGE7_AC004_LINUX_ARCHITECTURE,
      }),
    ).not.toThrow();
    expect(() =>
      assertLinuxAc004Environment({
        os: "linux",
        node: "v22.17.1",
        npm: STAGE7_AC004_LINUX_NPM_VERSION,
        architecture: "x64",
      }),
    ).toThrow("Node v24.21.0");
    expect(() =>
      assertLinuxAc004Environment({
        os: "linux",
        node: STAGE7_AC004_LINUX_NODE_VERSION,
        npm: STAGE7_AC004_LINUX_NPM_VERSION,
        architecture: "arm64",
      }),
    ).toThrow("architecture x64");
    expect(() =>
      assertLinuxAc004Environment({
        os: "linux",
        node: STAGE7_AC004_LINUX_NODE_VERSION,
        npm: "10.9.2",
        architecture: STAGE7_AC004_LINUX_ARCHITECTURE,
      }),
    ).toThrow("npm 11.19.0");
    expect(() =>
      assertLinuxAc004Environment({
        os: "win32",
        node: STAGE7_AC004_LINUX_NODE_VERSION,
        npm: STAGE7_AC004_LINUX_NPM_VERSION,
        architecture: STAGE7_AC004_LINUX_ARCHITECTURE,
      }),
    ).toThrow("Linux");
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
      aggregateCanonicalSha256: "d",
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

  it("records an independent lowercase SHA-256 fingerprint of canonical aggregate bytes", () => {
    const canonical = '{"schema":"nightdrive.stage7-arpeggiator-aggregate.v1"}';
    const fingerprint = sha256Utf8(canonical);
    const independentlyCalculated = createHash("sha256")
      .update(new TextEncoder().encode(canonical))
      .digest("hex");
    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/u);
    expect(fingerprint).toBe(independentlyCalculated);
    expect(sha256Utf8(`${canonical} `)).not.toBe(fingerprint);
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
        aggregateCanonicalSha256: "d",
        harmonySha256: "a",
        arpeggiatorSha256: "b",
        resultHash: "c",
      })),
    );
    expect(source).toContain('"aggregateCanonicalSha256"');
    expect(source).not.toContain("runner");
    expect(source).not.toContain("node");
  });

  it("writes an explicit FAIL artifact and rethrows environment failures", () => {
    const directory = mkdtempSync(join(tmpdir(), "nightdrive-ac004-fail-env-"));
    try {
      expect(() => runLinuxAc004Evidence(directory, { forceFailure: "environment" })).toThrow(
        "Forced AC-004 environment failure",
      );
      const artifact = JSON.parse(
        readFileSync(join(directory, "stage7-ac004-linux-evidence.json"), "utf8"),
      ) as { status: string; canonical: unknown; diagnostics: { phase: string } };
      expect(artifact.status).toBe("FAIL");
      expect(artifact.canonical).toBeNull();
      expect(artifact.diagnostics.phase).toBe("environment-qualification");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("writes an explicit FAIL artifact and rethrows vector failures", () => {
    const directory = mkdtempSync(join(tmpdir(), "nightdrive-ac004-fail-vector-"));
    try {
      expect(() => runLinuxAc004Evidence(directory, { forceFailure: "vector" })).toThrow(
        "Forced AC-004 vector failure",
      );
      expect(existsSync(join(directory, "stage7-ac004-linux-evidence.json"))).toBe(true);
      const artifact = JSON.parse(
        readFileSync(join(directory, "stage7-ac004-linux-evidence.json"), "utf8"),
      ) as {
        status: string;
        canonical: unknown;
        diagnostics: { phase: string; vectorId?: string };
      };
      expect(artifact.status).toBe("FAIL");
      expect(artifact.canonical).toBeNull();
      expect(artifact.diagnostics.phase).toBe("vector-execution");
      expect(artifact.diagnostics.vectorId).toBe(STAGE7_AC004_LINUX_VECTOR_IDS[0]);
      expect(JSON.stringify(artifact.canonical)).not.toContain("diagnostics");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it.skipIf(
    process.platform !== "linux" ||
      process.arch !== STAGE7_AC004_LINUX_ARCHITECTURE ||
      process.version !== STAGE7_AC004_LINUX_NODE_VERSION,
  )(
    "writes a PASS artifact with the complete canonical payload",
    () => {
      const directory = mkdtempSync(join(tmpdir(), "nightdrive-ac004-pass-"));
      try {
        const artifact = runLinuxAc004Evidence(directory);
        expect(artifact.status).toBe("PASS");
        if (artifact.status === "PASS") {
          expect(artifact.canonical.vectorCount).toBe(17);
          expect(artifact.canonical.vectors).toHaveLength(17);
          expect(
            artifact.canonical.vectors.every((row) =>
              /^[0-9a-f]{64}$/u.test(row.aggregateCanonicalSha256),
            ),
          ).toBe(true);
        }
        expect(existsSync(join(directory, "stage7-ac004-linux-evidence.json"))).toBe(true);
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
    120_000,
  );

  it.skipIf(
    process.platform !== "linux" ||
      process.arch !== STAGE7_AC004_LINUX_ARCHITECTURE ||
      process.version !== STAGE7_AC004_LINUX_NODE_VERSION,
  )(
    "executes the complete Linux x64 fresh-process matrix and writes durable evidence",
    () => {
      const artifact = runLinuxAc004Evidence(
        process.env.AC004_OUTPUT_DIR ?? "./.ac004-linux-evidence",
      );
      expect(artifact.status).toBe("PASS");
      if (artifact.status !== "PASS") return;
      expect(artifact.canonical.vectorCount).toBe(17);
      expect(artifact.ambientVariants.every((variant) => variant.matchesBase)).toBe(true);
    },
    120_000,
  );
});
