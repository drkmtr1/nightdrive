/**
 * The sole Node ingress for the ND-QA-003 Windows ARM64 evidence wrapper.
 *
 * It verifies the live PowerShell parent and a bounded one-time attestation
 * before dynamically importing the otherwise inert semantic runner.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readSync, realpathSync } from "node:fs";
import { basename, resolve } from "node:path";

const WRAPPER_PATH = "scripts/run-ndqa003-windows-arm64-evidence.ps1";
const LAUNCHER_PATH = "src/evaluation/ndqa003-windows-arm64-evidence-launcher.mjs";
const RUNNER_PATH = "src/evaluation/ndqa003-windows-arm64-evidence-runner.mjs";
const INGRESS_SCHEMA = "nightdrive.ndqa003.windows-arm64-wrapper-ingress.v1";
const INGRESS_SENTINEL = "--ndqa003-windows-arm64-wrapper-ingress-v1";
const INGRESS_MAX_BYTES = 32 * 1024;

function fail(message) {
  throw new Error(`ND-QA-003 Windows ARM64 evidence launcher: ${message}`);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function realFile(value, label) {
  if (typeof value !== "string" || value.length === 0 || !existsSync(value))
    fail(`${label} is unavailable`);
  const resolved = realpathSync(value);
  if (!lstatSync(resolved).isFile()) fail(`${label} is not a file`);
  return resolved;
}

function samePath(left, right) {
  return left.localeCompare(right, undefined, { sensitivity: "accent" }) === 0;
}

function exactSha1(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/u.test(value)) fail(`${label} is invalid`);
  return value;
}

function plainRecord(value, label) {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    fail(`${label} is not a plain record`);
  }
  return value;
}

function exactKeys(value, keys, label) {
  const record = plainRecord(value, label);
  const observed = Object.keys(record);
  if (observed.length !== keys.length || observed.some((key, index) => key !== keys[index])) {
    fail(`${label} has an unexpected shape`);
  }
  return record;
}

function readIngress() {
  const chunks = [];
  const scratch = Buffer.allocUnsafe(4096);
  let length = 0;
  for (;;) {
    const read = readSync(0, scratch, 0, scratch.byteLength, null);
    if (read === 0) break;
    length += read;
    if (length > INGRESS_MAX_BYTES) fail("ingress attestation exceeds its fixed byte limit");
    chunks.push(Buffer.from(scratch.subarray(0, read)));
  }
  const bytes = Buffer.concat(chunks, length);
  let value;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    fail("ingress attestation is not UTF-8 JSON");
  }
  return Object.freeze({ bytes, value });
}

function assertNeutralEnvironment() {
  if (process.execArgv.length !== 0) fail("Node execution arguments are prohibited");
  for (const [name, value] of Object.entries(process.env)) {
    const key = name.toUpperCase();
    if (
      key.startsWith("NODE_") ||
      key.startsWith("NPM_CONFIG_") ||
      key.startsWith("GIT_") ||
      key.startsWith("VITE_") ||
      key.startsWith("VITEST_") ||
      key.startsWith("NDQA003_") ||
      key === "VITEST" ||
      key === "VP_RUN_NODE_CLIENT_PATH"
    ) {
      if (value !== undefined && value.length > 0)
        fail(`environment override is prohibited: ${name}`);
    }
  }
}

function parseWindowsCommandLine(commandLine) {
  if (typeof commandLine !== "string" || commandLine.length === 0 || /[\r\n]/u.test(commandLine)) {
    fail("parent command line is unavailable");
  }
  const result = [];
  let index = 0;
  const whitespace = (value) => value === " " || value === "\t";
  while (index < commandLine.length) {
    while (index < commandLine.length && whitespace(commandLine[index])) index += 1;
    if (index === commandLine.length) break;
    let argument = "";
    let quoted = false;
    for (;;) {
      if (index === commandLine.length) break;
      let slashes = 0;
      while (commandLine[index] === "\\") {
        slashes += 1;
        index += 1;
      }
      if (commandLine[index] === '"') {
        argument += "\\".repeat(Math.floor(slashes / 2));
        if (slashes % 2 === 1) {
          argument += '"';
          index += 1;
          continue;
        }
        if (quoted && commandLine[index + 1] === '"') {
          argument += '"';
          index += 2;
          continue;
        }
        quoted = !quoted;
        index += 1;
        continue;
      }
      argument += "\\".repeat(slashes);
      if (index === commandLine.length || (!quoted && whitespace(commandLine[index]))) break;
      argument += commandLine[index];
      index += 1;
    }
    if (quoted) fail("parent command line has an unmatched quote");
    result.push(argument);
  }
  if (result.length === 0) fail("parent command line has no arguments");
  return Object.freeze(result);
}

function inspectImmediateParent(cwd) {
  if (process.platform !== "win32") fail("Windows native PowerShell parent evidence is required");
  const systemRoot = process.env.SystemRoot ?? process.env.SYSTEMROOT;
  if (typeof systemRoot !== "string" || systemRoot.length === 0) fail("SystemRoot is unavailable");
  const inspector = realFile(
    resolve(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
    "parent-process inspector",
  );
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
    `$p = Get-CimInstance -ClassName Win32_Process -Filter 'ProcessId = ${process.ppid}'`,
    "if ($null -eq $p) { exit 3 }",
    "$r = [ordered]@{ processId = [int]$p.ProcessId; executablePath = [string]$p.ExecutablePath; commandLine = [string]$p.CommandLine }",
    "[Console]::Out.Write(($r | ConvertTo-Json -Compress -Depth 2))",
  ].join("; ");
  const result = spawnSync(inspector, ["-NoProfile", "-NonInteractive", "-Command", script], {
    cwd,
    encoding: "buffer",
    env: { ComSpec: process.env.ComSpec, PATH: process.env.PATH, SystemRoot: systemRoot },
    windowsHide: true,
  });
  if (result.error !== undefined || result.status !== 0 || (result.stderr?.length ?? 0) !== 0) {
    fail("parent-process inspection is unavailable");
  }
  const output = result.stdout ?? Buffer.alloc(0);
  let value;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(output));
  } catch {
    fail("parent-process inspection is not JSON");
  }
  const record = exactKeys(value, ["processId", "executablePath", "commandLine"], "parent process");
  if (!Number.isSafeInteger(record.processId) || record.processId <= 0)
    fail("parent process identifier is invalid");
  return Object.freeze({
    commandLine: record.commandLine,
    executable: realFile(record.executablePath, "parent executable"),
    processId: record.processId,
    inspectorSha256: sha256(readFileSync(inspector)),
  });
}

function assertArguments() {
  if (process.argv.length !== 9 || process.argv[2] !== INGRESS_SENTINEL) {
    fail("requires the exact approved wrapper argument vector");
  }
  const [
    receiptDirectory,
    reviewedCommit,
    reviewedTree,
    runtimeRoot,
    runtimeProvenance,
    recoveryRoot,
  ] = process.argv.slice(3);
  return Object.freeze({
    receiptDirectory: realFileOrAbsentParent(receiptDirectory, "receipt directory"),
    recoveryRoot: realFileOrDirectory(recoveryRoot, "recovery root"),
    reviewedCommit: exactSha1(reviewedCommit, "reviewed commit"),
    reviewedTree: exactSha1(reviewedTree, "reviewed tree"),
    runtimeProvenance: realFile(runtimeProvenance, "runtime provenance record"),
    runtimeRoot: realFileOrDirectory(runtimeRoot, "runtime root"),
  });
}

function realFileOrDirectory(value, label) {
  if (typeof value !== "string" || value.length === 0 || !existsSync(value))
    fail(`${label} is unavailable`);
  return realpathSync(value);
}

function realFileOrAbsentParent(value, label) {
  if (typeof value !== "string" || value.length === 0) fail(`${label} is unavailable`);
  const candidate = resolve(value);
  if (existsSync(candidate)) fail(`${label} must be initially absent`);
  const parent = resolve(candidate, "..");
  if (!existsSync(parent) || !lstatSync(parent).isDirectory())
    fail(`${label} parent is unavailable`);
  return candidate;
}

function assertTrackedLauncher(cwd) {
  const expected = realFile(resolve(cwd, LAUNCHER_PATH), "tracked launcher");
  const actual = realFile(process.argv[1], "launcher argument");
  if (!samePath(actual, expected)) fail("must invoke the tracked launcher from this checkout");
  return expected;
}

function assertIngress(claim, args, cwd, launcher) {
  const value = exactKeys(claim, ["child", "nonce", "schema", "wrapper"], "wrapper ingress");
  const wrapper = exactKeys(
    value.wrapper,
    ["arguments", "executable", "processId", "script"],
    "wrapper ingress wrapper",
  );
  const child = exactKeys(
    value.child,
    [
      "executable",
      "launcher",
      "launcherSha256",
      "nodeSha256",
      "processId",
      "runner",
      "runnerSha256",
      "workingDirectory",
    ],
    "wrapper ingress child",
  );
  if (
    value.schema !== INGRESS_SCHEMA ||
    typeof value.nonce !== "string" ||
    !/^[0-9a-f]{64}$/u.test(value.nonce) ||
    !Number.isSafeInteger(wrapper.processId) ||
    !Number.isSafeInteger(child.processId) ||
    child.processId !== process.pid ||
    wrapper.processId !== process.ppid ||
    !samePath(
      realFile(wrapper.script, "attested wrapper"),
      realFile(resolve(cwd, WRAPPER_PATH), "tracked wrapper"),
    ) ||
    !samePath(realFile(child.launcher, "attested launcher"), launcher) ||
    !samePath(
      realFile(child.runner, "attested runner"),
      realFile(resolve(cwd, RUNNER_PATH), "tracked runner"),
    ) ||
    !samePath(
      realFile(child.executable, "attested node executable"),
      realFile(process.execPath, "Node executable"),
    ) ||
    !samePath(realFile(child.workingDirectory, "attested working directory"), cwd)
  ) {
    fail("wrapper ingress does not bind this Node child to the approved tuple");
  }
  if (
    !/^[0-9a-f]{64}$/u.test(child.launcherSha256) ||
    !/^[0-9a-f]{64}$/u.test(child.nodeSha256) ||
    !/^[0-9a-f]{64}$/u.test(child.runnerSha256) ||
    sha256(readFileSync(launcher)) !== child.launcherSha256 ||
    sha256(readFileSync(process.execPath)) !== child.nodeSha256
  ) {
    fail("tracked launcher bytes do not equal the attested identity");
  }
  const runner = realFile(child.runner, "attested runner");
  const runnerBytes = readFileSync(runner);
  if (sha256(runnerBytes) !== child.runnerSha256) {
    fail("tracked semantic runner bytes do not equal the attested identity");
  }
  const parent = inspectImmediateParent(cwd);
  if (
    parent.processId !== process.ppid ||
    basename(parent.executable).toLowerCase() !== "pwsh.exe"
  ) {
    fail("immediate parent is not the approved PowerShell host");
  }
  if (!samePath(parent.executable, realFile(wrapper.executable, "attested PowerShell host"))) {
    fail("attested PowerShell host does not equal the live parent");
  }
  const parentArguments = parseWindowsCommandLine(parent.commandLine);
  const expected = [
    "-NoProfile",
    "-File",
    realFile(resolve(cwd, WRAPPER_PATH), "tracked wrapper"),
    args.receiptDirectory,
    args.reviewedCommit,
    args.reviewedTree,
    args.runtimeRoot,
    args.runtimeProvenance,
    args.recoveryRoot,
  ];
  if (
    parentArguments.length !== expected.length + 1 ||
    expected.some((item, index) => parentArguments[index + 1] !== item)
  ) {
    fail("live parent command line does not equal the approved wrapper invocation");
  }
  if (
    !Array.isArray(wrapper.arguments) ||
    JSON.stringify(wrapper.arguments) !== JSON.stringify(expected)
  ) {
    fail("attested wrapper arguments do not equal the approved tuple");
  }
  return Object.freeze({
    childExecutableSha256: sha256(readFileSync(process.execPath)),
    launcherSha256: sha256(readFileSync(launcher)),
    nonce: value.nonce,
    parentInspectorSha256: parent.inspectorSha256,
    wrapperExecutableSha256: sha256(readFileSync(parent.executable)),
    wrapperSha256: sha256(readFileSync(realFile(resolve(cwd, WRAPPER_PATH), "tracked wrapper"))),
    workingDirectorySha256: sha256(Buffer.from(cwd, "utf8")),
    runnerModuleUrl: `data:text/javascript;base64,${runnerBytes.toString("base64")}`,
    attestedNodeSha256: child.nodeSha256,
  });
}

async function main() {
  if (process.platform !== "win32" || process.arch !== "arm64") {
    fail("native Windows ARM64 Node execution is required");
  }
  assertNeutralEnvironment();
  const args = assertArguments();
  const cwd = realFileOrDirectory(process.cwd(), "current working directory");
  const launcher = assertTrackedLauncher(cwd);
  const ingress = readIngress();
  const bound = assertIngress(ingress.value, args, cwd, launcher);
  const runner = await import(bound.runnerModuleUrl);
  runner.assertWrapperIngress(
    {
      child: {
        executableSha256: bound.childExecutableSha256,
        launcherSha256: bound.launcherSha256,
        processId: process.pid,
        workingDirectorySha256: bound.workingDirectorySha256,
      },
      nonce: bound.nonce,
      schema: INGRESS_SCHEMA,
      wrapper: {
        executableSha256: bound.wrapperExecutableSha256,
        processId: process.ppid,
        scriptSha256: bound.wrapperSha256,
      },
    },
    {
      launcherSha256: bound.launcherSha256,
      nodeSha256: bound.attestedNodeSha256,
      workingDirectorySha256: bound.workingDirectorySha256,
      wrapperSha256: bound.wrapperSha256,
    },
  );
  if (bound.childExecutableSha256 !== bound.attestedNodeSha256) {
    fail("actual Node executable identity does not equal the approved isolated runtime");
  }
  process.stdout.write(`${JSON.stringify({ ingress: sha256(ingress.bytes), ready: true })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
