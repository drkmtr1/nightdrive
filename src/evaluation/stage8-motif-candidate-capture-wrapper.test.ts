import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const REPOSITORY_ROOT = process.cwd();
const WRAPPER_PATH = resolve(REPOSITORY_ROOT, "scripts/capture-stage8-motif-candidate.ps1");
const PLACEHOLDER_COMMIT = "0".repeat(40);
const PLACEHOLDER_TREE = "1".repeat(40);

function cleanCaptureEnvironment(): NodeJS.ProcessEnv {
  const environment = Object.create(null) as NodeJS.ProcessEnv;
  for (const [name, value] of Object.entries(process.env)) {
    const normalized = name.toUpperCase();
    if (
      normalized.startsWith("GIT_") ||
      normalized.startsWith("NODE_") ||
      normalized.startsWith("LD_") ||
      normalized.startsWith("DYLD_") ||
      normalized.startsWith("NAPI_RS_") ||
      normalized.startsWith("NPM_CONFIG_") ||
      normalized.startsWith("VITE_") ||
      normalized.startsWith("VITEST_") ||
      normalized.startsWith("STAGE8_MOTIF_CANDIDATE_CAPTURE_") ||
      normalized === "VITEST" ||
      normalized === "VP_RUN_NODE_CLIENT_PATH"
    ) {
      continue;
    }
    environment[name] = value;
  }
  return environment;
}

function outputDirectory(suffix: string): string {
  return join(tmpdir(), `nightdrive-stage8-capture-wrapper-${suffix}-${crypto.randomUUID()}`);
}

function invokeWrapper(
  environment: NodeJS.ProcessEnv,
  output: string,
  cwd = REPOSITORY_ROOT,
): Readonly<{ status: number | null; output: string }> {
  const result = spawnSync(
    "pwsh",
    ["-NoProfile", "-File", WRAPPER_PATH, output, PLACEHOLDER_COMMIT, PLACEHOLDER_TREE],
    {
      cwd,
      encoding: "utf8",
      env: environment,
      windowsHide: true,
    },
  );
  return Object.freeze({
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  });
}

describe.skipIf(process.platform !== "win32")("Stage 8 Motif capture PowerShell ingress", () => {
  it("does not expose a package-script capture route", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(REPOSITORY_ROOT, "package.json"), "utf8"),
    ) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts).not.toHaveProperty("capture:stage8-motif-candidate");
  });

  it("requires direct tracked-wrapper invocation from the repository root", () => {
    const output = outputDirectory("wrong-cwd");
    const result = invokeWrapper(cleanCaptureEnvironment(), output, tmpdir());
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("tracked wrapper directly from the repository root");
    expect(existsSync(output)).toBe(false);
  });

  it("rejects a Node-managed output override before Node can start", () => {
    const output = outputDirectory("node-coverage");
    const result = invokeWrapper(
      { ...cleanCaptureEnvironment(), NODE_V8_COVERAGE: join(tmpdir(), "unexpected-coverage") },
      output,
    );
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("NODE_V8_COVERAGE");
    expect(existsSync(output)).toBe(false);
  });

  it.each([
    ["VP_RUN_NODE_CLIENT_PATH", join(tmpdir(), "unexpected-vp-run-node-client.js")],
    ["NAPI_RS_NATIVE_LIBRARY_PATH", join(tmpdir(), "unexpected-rolldown.node")],
    ["LD_PRELOAD", join(tmpdir(), "unexpected-loader.so")],
    ["DYLD_INSERT_LIBRARIES", join(tmpdir(), "unexpected-loader.dylib")],
  ])("rejects %s before Vite or Rolldown can load it", (name, value) => {
    const output = outputDirectory(name.toLowerCase());
    const result = invokeWrapper({ ...cleanCaptureEnvironment(), [name]: value }, output);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain(name);
    expect(existsSync(output)).toBe(false);
  });

  it("strips npm configuration before the Node custody boundary runs", () => {
    const output = outputDirectory("npm-config");
    const result = invokeWrapper(
      {
        ...cleanCaptureEnvironment(),
        NPM_CONFIG_VITEST_MODULE_DIRECTORIES: join(tmpdir(), "untrusted-vitest-modules"),
      },
      output,
    );
    expect(result.status).not.toBe(0);
    expect(result.output).not.toContain("NPM_CONFIG_VITEST_MODULE_DIRECTORIES");
    expect(existsSync(output)).toBe(false);
  });
});
