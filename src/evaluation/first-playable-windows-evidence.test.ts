import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertWindowsEnvironment,
  assertWindowsLocalIdentity,
  defaultWindowsEvidenceDirectory,
  FirstPlayableMismatch,
  npmVersionInvocation,
  parseWindowsHostArchitecture,
  readNpmVersion,
  runWindowsFirstPlayableEvidence,
} from "./first-playable-linux-evidence";

const validRuntime = {
  platform: "win32",
  architecture: "arm64",
  hostArchitecture: "arm64",
  node: "v24.21.0",
  npm: "11.19.0",
};

const validLocalIdentity = {
  githubActions: "false",
  githubRunId: "local",
  githubRunAttempt: "local",
  githubJob: "local",
  runnerOs: "local",
  runnerArchitecture: "local",
  runnerName: "local",
  runnerImage: "local",
  runnerImageVersion: "local",
};

describe("First Playable Windows evidence harness", () => {
  it("uses a supported npm invocation for each process platform", () => {
    expect(npmVersionInvocation("win32")).toEqual({
      executable: process.env.ComSpec ?? "cmd.exe",
      args: ["/d", "/s", "/c", "npm.cmd --version"],
    });
    expect(npmVersionInvocation("linux")).toEqual({
      executable: "npm",
      args: ["--version"],
    });
  });

  it.skipIf(process.platform !== "win32")(
    "executes the selected Windows npm command-script path",
    () => {
      expect(readNpmVersion()).toMatch(/^\d+\.\d+\.\d+$/u);
    },
  );

  it("requires the exact native Windows ARM64 runtime", () => {
    expect(() => assertWindowsEnvironment(validRuntime)).not.toThrow();
    for (const change of [
      { platform: "linux" },
      { architecture: "x64" },
      { hostArchitecture: "x64" },
      { hostArchitecture: undefined },
      { node: "v24.19.0" },
      { npm: "11.18.0" },
    ])
      expect(() => assertWindowsEnvironment({ ...validRuntime, ...change })).toThrow();
  });

  it("records the native host architecture separately from process architecture", () => {
    expect(
      parseWindowsHostArchitecture(`
HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment
    PROCESSOR_ARCHITECTURE    REG_SZ    ARM64
`),
    ).toBe("arm64");
    expect(() => parseWindowsHostArchitecture("")).toThrow(
      "Windows host architecture is unavailable",
    );
  });

  it("requires explicit local rather than fabricated CI identity", () => {
    expect(() => assertWindowsLocalIdentity(validLocalIdentity)).not.toThrow();
    for (const change of [
      { githubActions: "true" },
      { githubRunId: "123" },
      { runnerOs: "Windows" },
      { runnerArchitecture: "ARM64" },
      { runnerName: "self-hosted" },
    ])
      expect(() => assertWindowsLocalIdentity({ ...validLocalIdentity, ...change })).toThrow();
  });

  it("writes target-specific fail-closed evidence without executing rows", () => {
    const directory = mkdtempSync(join(tmpdir(), "nightdrive-fp-windows-fail-"));
    const mismatch = new FirstPlayableMismatch({
      vectorId: "FP-01",
      field: "normalizedRequest",
      message: "Forced Windows normalized-request mismatch",
      firstByteOffset: 0,
      actualLength: 1,
      expectedLength: 1,
      actualSha256: "a".repeat(64),
      expectedSha256: "b".repeat(64),
    });
    try {
      expect(() =>
        runWindowsFirstPlayableEvidence(directory, { forceComparisonFailure: mismatch }),
      ).toThrow(FirstPlayableMismatch);
      const artifact = JSON.parse(
        readFileSync(join(directory, "first-playable-windows-evidence.json"), "utf8"),
      );
      expect(artifact).toMatchObject({
        schema: "nightdrive.first-playable-windows-evidence.v1",
        status: "FAIL",
        diagnostics: {
          phase: "row-execution",
          vectorId: "FP-01",
          field: "normalizedRequest",
          actualSha256: "a".repeat(64),
          expectedSha256: "b".repeat(64),
        },
      });
      expect(artifact.runs).toBeUndefined();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it.skipIf(process.env.FP_WINDOWS_EVIDENCE !== "1")(
    "writes complete actual evidence only on explicit Windows opt-in",
    () => {
      runWindowsFirstPlayableEvidence(defaultWindowsEvidenceDirectory());
    },
    600_000,
  );
});
