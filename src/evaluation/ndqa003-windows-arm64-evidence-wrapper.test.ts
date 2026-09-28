import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const evaluationDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(evaluationDirectory, "..", "..");
const wrapper = resolve(root, "scripts", "run-ndqa003-windows-arm64-evidence.ps1");
const launcher = resolve(evaluationDirectory, "ndqa003-windows-arm64-evidence-launcher.mjs");
const runner = resolve(evaluationDirectory, "ndqa003-windows-arm64-evidence-runner.mjs");

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("ND-QA-003 Windows ARM64 evidence wrapper boundary", () => {
  it("uses the tracked PowerShell ingress and freezes the validated runner bytes before import", () => {
    const wrapperSource = source(wrapper);
    const launcherSource = source(launcher);
    expect(wrapperSource).toContain("Set-StrictMode -Version Latest");
    expect(wrapperSource).toContain("Assert-NoUnsafeProcessStartOverrides");
    expect(wrapperSource).toContain("ProcessStartInfo");
    expect(wrapperSource).toContain("ArgumentList.Add");
    expect(wrapperSource).toContain("RedirectStandardInput = $true");
    expect(launcherSource).toContain("-NoProfile");
    expect(launcherSource).toContain("--ndqa003-windows-arm64-wrapper-ingress-v1");
    expect(launcherSource).toContain("Get-CimInstance -ClassName Win32_Process");
    expect(launcherSource).toContain("parseWindowsCommandLine");
    expect(launcherSource).toContain("nodeSha256");
    expect(launcherSource).toContain("data:text/javascript;base64,");
    expect(launcherSource).toContain('process.arch !== "arm64"');
    expect(launcherSource).toContain("await import");
    expect(launcherSource.indexOf("await import")).toBeGreaterThan(
      launcherSource.indexOf("assertIngress"),
    );
    expect(launcherSource).not.toContain("stage8-motif-candidate-capture");
    expect(source(runner)).not.toContain("node:child_process");
  });

  it("keeps complete Git visibility and all phase command forms fixed", () => {
    const wrapperSource = source(wrapper);
    expect(wrapperSource).toContain('@("ls-files", "--others", "-z")');
    expect(wrapperSource).not.toContain("--exclude-standard");
    expect(wrapperSource).toContain('@("audit", "--json", "--audit-level=high")');
    expect(wrapperSource).toContain('@("sbom", "--package-lock-only", "--sbom-format=spdx")');
    expect(wrapperSource).toContain("NOT_RUN_PRECONDITION_FAILED");
    expect(wrapperSource).toContain("EXECUTION_FAILED");
    expect(wrapperSource).toContain("Mark-PhaseExecutionAttempt");
    expect(wrapperSource).toContain("Get-CommandIdentity");
    expect(wrapperSource).toContain("probeSetExitClass");
    expect(wrapperSource).toContain("node_modules is prohibited");
    expect(wrapperSource).not.toContain("audit fix");
    expect(wrapperSource).not.toContain("npm install");
  });

  it("contains the required marker and exact PersistentStore/ActiveStore lifecycle", () => {
    const wrapperSource = source(wrapper);
    for (const required of [
      "FileMode]::CreateNew",
      "FileOptions]::WriteThrough",
      "Set-PrivateAcl",
      "Assert-PrivateAcl",
      "$acl.SetOwner($current)",
      "GetOwner([Security.Principal.SecurityIdentifier])",
      "Assert-NoReparsePointAncestor",
      "Recover-TaskFirewallRule",
      "Enter-RecoveryBoundary",
      "recovery boundary acquisition cleanup cannot be verified",
      "New-NetFirewallRule",
      "PersistentStore",
      "ActiveStore",
      "Get-NetFirewallApplicationFilter",
      "Remove-NetFirewallRule",
      "Assert-AllFirewallProfilesEnabled",
      "Assert-RuntimeCollisionAbsent",
    ]) {
      expect(wrapperSource).toContain(required);
    }
    expect(wrapperSource).toContain(
      "-Direction Outbound -Action Block -Enabled True -Profile Any -Program $Runtime.Node",
    );
    expect(wrapperSource).not.toContain("Set-NetFirewallProfile");
  });

  it("verifies Rule A and Rule B immediately before and after every protected npm child", () => {
    const wrapperSource = source(wrapper);
    const protectedStart = wrapperSource.indexOf("$ruleA = $null");
    const protectedEnd = wrapperSource.indexOf(
      'Mark-PhaseExecutionAttempt -Ledger $ledger -Phase "positive-audit"',
    );
    expect(protectedStart).toBeGreaterThanOrEqual(0);
    expect(protectedEnd).toBeGreaterThan(protectedStart);
    const lines = wrapperSource
      .slice(protectedStart, protectedEnd)
      .split(/\r?\n/)
      .map((line) => line.trim());
    const protectedCalls = [
      { variable: "$negative", rule: "$firewall.ruleA", phase: "negative-audit" },
      { variable: "$first", rule: "$firewall.ruleB", phase: "sbom-first" },
      { variable: "$second", rule: "$firewall.ruleB", phase: "sbom-second" },
      { variable: "$fixtureResult", rule: "$firewall.ruleB", phase: "fixture" },
    ];
    expect(lines.filter((line) => line.includes("Invoke-FreshNpmCommand"))).toHaveLength(4);
    for (const protectedCall of protectedCalls) {
      const invocationIndex = lines.findIndex((line) =>
        line.startsWith(`${protectedCall.variable} = Invoke-FreshNpmCommand`),
      );
      const verification =
        "Set-FirewallLifecycleActive -Lifecycle " +
        protectedCall.rule +
        " -Rule " +
        (protectedCall.rule === "$firewall.ruleA" ? "$ruleA" : "$ruleB") +
        " -Runtime $runtime";
      const marker =
        protectedCall.phase === "fixture"
          ? 'Mark-PhaseExecutionAttempt -Ledger $ledger -Phase ("fixture-" + $kind)'
          : `Mark-PhaseExecutionAttempt -Ledger $ledger -Phase "${protectedCall.phase}"`;
      const markerIndex = lines.indexOf(marker);
      expect(markerIndex).toBeGreaterThanOrEqual(0);
      expect(invocationIndex).toBeGreaterThan(markerIndex + 1);
      expect(lines[invocationIndex - 1]).toBe(verification);
      expect(lines[invocationIndex + 1]).toBe(verification);
    }
    expect(lines).toContain('foreach ($kind in @("missing", "noassertion", "malformed")) {');

    const lifecycleStart = wrapperSource.indexOf("function Set-FirewallLifecycleActive");
    const lifecycleEnd = wrapperSource.indexOf(
      "function Invoke-WindowsArm64Evidence",
      lifecycleStart,
    );
    const lifecycleSource = wrapperSource.slice(lifecycleStart, lifecycleEnd);
    expect(lifecycleSource).toContain(
      "[void](Assert-ExactFirewallRule -RuleName $Rule.RuleName -NodePath $Runtime.Node)",
    );
    const exactRuleStart = wrapperSource.indexOf("function Assert-ExactFirewallRule");
    const exactRuleEnd = wrapperSource.indexOf(
      "function Remove-ExactTaskFirewallRule",
      exactRuleStart,
    );
    const exactRuleSource = wrapperSource.slice(exactRuleStart, exactRuleEnd);
    expect(exactRuleSource).toContain("Assert-AllFirewallProfilesEnabled");
    expect(exactRuleSource).toContain("Assert-RuntimeCollisionAbsent -NodePath $NodePath");
  });

  it("makes recovery and post-cleanup custody fail closed before any later phase", () => {
    const wrapperSource = source(wrapper);
    expect(wrapperSource).toContain("Assert-RecoveryRootContents");
    expect(wrapperSource).toContain("Read-RecoveryMarker");
    expect(wrapperSource).toContain("Assert-FinalMaterialCustody");
    expect(wrapperSource).toContain("Assert-PostCleanupRepositoryCustody");
    expect(wrapperSource).toContain("Assert-MaterialCustody");
    expect(wrapperSource).toContain(
      "private task-layout scratch boundary cannot be cleaned safely",
    );
    expect(wrapperSource).toContain("final custody private boundary cannot be cleaned safely");
    expect(wrapperSource).toContain("Resolve-TrustedReceiptDirectory");
    expect(wrapperSource).toContain("receiptRetentionSafe");
    expect(wrapperSource).toContain("sanitized receipt publication cleanup cannot be verified");
    expect(wrapperSource).toContain(
      "sanitized receipt publication boundary cannot be cleaned safely",
    );
    expect(wrapperSource).toContain("Assert-PassReceiptBody");
    expect(wrapperSource).toContain("Assert-RuntimeProvenanceStillBound");
    expect(wrapperSource).toContain("CopyToAsync");
    expect(wrapperSource).not.toContain("--exclude-standard");
    expect(wrapperSource).not.toContain("GetTempPath");
  });

  it("binds each declaration fixture to its copied project configuration", () => {
    const wrapperSource = source(wrapper);
    expect(wrapperSource).toContain(
      "fixture npm configuration does not preserve checked-out bytes",
    );
    expect(wrapperSource).toContain("Assert-FixtureMutation -Fixture $fixture -Checkout $checkout");
    expect(wrapperSource).toContain(
      '-Checkout $fixture -WorkingDirectory $fixture -NpmArguments @("sbom", "--package-lock-only", "--sbom-format=spdx")',
    );
  });

  it("does not create a package-script, workflow, or environment opt-in ingress", () => {
    const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    expect(JSON.stringify(packageJson.scripts)).not.toContain("ndqa003-windows-arm64");
    expect(
      existsSync(resolve(root, ".github", "workflows", "ndqa003-windows-arm64-evidence.yml")),
    ).toBe(false);
    const wrapperSource = source(wrapper);
    expect(wrapperSource).not.toContain("--dry-run");
    expect(wrapperSource).not.toContain("--mock");
    expect(wrapperSource).not.toContain("NDQA003_RUN");
  });
});

describe.skipIf(process.platform !== "win32")("Windows invalid-ingress failure probes", () => {
  it("rejects direct launcher invocation without creating an output directory", () => {
    const receipt = resolve(process.env.TEMP ?? root, `ndqa003-direct-${randomUUID()}`);
    const result = spawnSync(process.execPath, [launcher], { encoding: "utf8", windowsHide: true });
    expect(result.status).not.toBe(0);
    expect(existsSync(receipt)).toBe(false);
  });

  it("rejects an injected process-start override before any valid wrapper path", () => {
    const result = spawnSync(process.execPath, [launcher], {
      encoding: "utf8",
      env: { ...process.env, NODE_OPTIONS: "--trace-warnings" },
      windowsHide: true,
    });
    expect(result.status).not.toBe(0);
  });

  it("rejects an incomplete wrapper argument tuple before its procedure can start", () => {
    const result = spawnSync("pwsh.exe", ["-NoProfile", "-File", wrapper, "only-one-argument"], {
      encoding: "utf8",
      windowsHide: true,
    });
    expect(result.status).not.toBe(0);
  });
});
