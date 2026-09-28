import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// @ts-expect-error Native ESM procedure boundary has no declaration file.
import * as runner from "./ndqa003-windows-arm64-evidence-runner.mjs";

const sha = "a".repeat(64);
const commit = "b".repeat(40);
const tree = "c".repeat(40);

function probes(overrides: Record<string, string> = {}) {
  return {
    userconfig: "C:/private/user.npmrc\r\n",
    globalconfig: "C:/private/global.npmrc\r\n",
    registry: "https://registry.npmjs.org/\r\n",
    proxy: "null\r\n",
    "https-proxy": "null\r\n",
    omit: "\r\n",
    production: "false\r\n",
    offline: "false\r\n",
    "prefer-offline": "false\r\n",
    "package-lock": "true\r\n",
    workspace: "\r\n",
    workspaces: "null\r\n",
    ...overrides,
  };
}

function sources(overrides: Record<string, boolean> = {}) {
  return {
    credentialBearingInputAbsent: true,
    controlledFilesEmpty: true,
    projectNpmrcOnlySaveExact: true,
    scopeDirectiveAbsent: true,
    ...overrides,
  };
}

function lifecycle(ruleLifecycleClass: "NEGATIVE_AUDIT" | "SBOM_AND_FIXTURES") {
  return {
    ruleLifecycleClass,
    persistentRuleAbsentBefore: true,
    activeRuleAbsentBefore: true,
    firewallRuleCreated: true,
    firewallRuleActive: true,
    allProfilesEnabledDuringLifecycle: true,
    profileStateRecheckPassed: true,
    ruleEffectiveForActiveProfiles: true,
    firewallProgramIdentityMatched: true,
    firewallScopeVerified: true,
    runtimeCollisionAbsent: true,
    persistentRuleAbsentAfter: true,
    activeRuleAbsentAfter: true,
    ruleIdentitySha256: sha,
  };
}

function completeSbomRun() {
  const category = { expected: 1, observed: 1 };
  return {
    completeGraph: true,
    exitClass: "COMPLETE",
    rawByteLength: 1,
    rawSha256: sha,
    coverage: {
      packagesExpected: 1,
      packagesObserved: 1,
      relationshipsExpected: 1,
      relationshipsObserved: 1,
      rootPresent: true,
      categories: {
        production: category,
        development: category,
        optional: category,
        peer: category,
        transitive: category,
      },
    },
    declaredLicenseCounts: {
      missing: 0,
      empty: 0,
      malformed: 0,
      noAssertion: 0,
      unknown: 0,
      declared: 1,
      unmappable: 0,
      ambiguous: 0,
    },
  };
}

function receiptInput(status: "PASS" | "FAIL" | "BLOCKED" | "NOT VERIFIED" = "NOT VERIFIED") {
  const rawPass = status === "PASS";
  return {
    schema: runner.NDQA003_WINDOWS_EVIDENCE_RECEIPT_SCHEMA,
    procedureVersion: runner.NDQA003_WINDOWS_EVIDENCE_PROCEDURE_VERSION,
    status,
    startedAtUtc: "2026-09-27T00:00:00.000Z",
    finishedAtUtc: "2026-09-27T00:00:01.000Z",
    platform: {
      osFamilyWindows: true,
      hostArchitecture: "arm64",
      processArchitecture: "arm64",
      processPlatform: "win32",
      nativeArm64: true,
    },
    toolchain: {
      node: "v24.21.0",
      npm: "11.19.0",
      nodeSha256: sha,
      npmCmdSha256: sha,
      npmCliSha256: sha,
      nodeVersionCommandIdentity: sha,
      npmVersionCommandIdentity: sha,
      nodeVersionMatched: true,
      npmVersionMatched: true,
      runtimeProvenanceMatched: true,
      npmCmdBindingMatched: true,
      launcherNodeIdentityMatched: true,
    },
    ingress: { attestationSha256: sha },
    checkout: {
      commit,
      tree,
      packageLockSha256: sha,
      projectNpmrcSha256: sha,
    },
    configuration: {
      allowlistVersion: runner.NDQA003_WINDOWS_EVIDENCE_ENVIRONMENT_ALLOWLIST_VERSION,
      probeSetVersion: runner.NDQA003_WINDOWS_EVIDENCE_PROBE_SET_VERSION,
      probeSetExitClass: "COMPLETE",
      credentialBearingInputAbsent: true,
      controlledConfigEmpty: true,
      effectiveRegistryMatches: true,
      networkModeOnline: true,
      noScopeReduction: true,
      proxiesAbsent: true,
      workspaceSelectionInactive: true,
    },
    firewall: {
      recoveryChecked: true,
      recoveryCompletedWhenNeeded: false,
      ruleA: lifecycle("NEGATIVE_AUDIT"),
      ruleB: lifecycle("SBOM_AND_FIXTURES"),
    },
    phases: [
      {
        phase: "negative-audit",
        commandIdentity: sha,
        exitClass: "EXPECTED_NETWORK_UNAVAILABLE",
        freshInvocationState: true,
        freshCacheEmpty: true,
      },
      {
        phase: "sbom-first",
        commandIdentity: sha,
        exitClass: "COMPLETE",
        freshInvocationState: true,
        freshCacheEmpty: true,
      },
      {
        phase: "sbom-second",
        commandIdentity: sha,
        exitClass: "COMPLETE",
        freshInvocationState: true,
        freshCacheEmpty: true,
      },
      {
        phase: "fixture-missing",
        commandIdentity: sha,
        exitClass: "DECLARATION_MISSING",
        freshInvocationState: true,
        freshCacheEmpty: true,
      },
      {
        phase: "fixture-noassertion",
        commandIdentity: sha,
        exitClass: "DECLARATION_NOASSERTION",
        freshInvocationState: true,
        freshCacheEmpty: true,
      },
      {
        phase: "fixture-malformed",
        commandIdentity: sha,
        exitClass: "DECLARATION_MALFORMED",
        freshInvocationState: true,
        freshCacheEmpty: true,
      },
      {
        phase: "positive-audit",
        commandIdentity: sha,
        exitClass: "COMPLETE_NO_THRESHOLD_FINDING",
        freshInvocationState: true,
        freshCacheEmpty: true,
      },
    ],
    audit: {
      complete: true,
      exitClass: "COMPLETE_NO_THRESHOLD_FINDING",
      rawByteLength: 1,
      rawSha256: sha,
      severityCounts: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 },
    },
    sbom: {
      determinism: rawPass ? "PASS" : "NOT VERIFIED",
      rawEqual: rawPass,
      semanticComparable: true,
      semanticEqual: true,
      first: completeSbomRun(),
      second: completeSbomRun(),
    },
    custody: {
      repositoryUnchanged: true,
      untrackedStateEmpty: true,
      noNodeModules: true,
      cleanupVerified: true,
      sanitizedReceiptOnly: true,
    },
  };
}

function passReceiptInput() {
  const input = receiptInput("PASS");
  input.toolchain.nodeVersionCommandIdentity = runner.fixedInvocationIdentity(
    "node-version",
    sha,
    sha,
    sha,
    runner.NODE_VERSION_ARGUMENTS,
  );
  input.toolchain.npmVersionCommandIdentity = runner.fixedInvocationIdentity(
    "npm-version",
    sha,
    sha,
    sha,
    runner.NPM_VERSION_ARGUMENTS,
  );
  input.phases = input.phases.map((phase) => ({
    ...phase,
    commandIdentity: runner.fixedInvocationIdentity(
      phase.phase === "negative-audit" || phase.phase === "positive-audit"
        ? "npm-audit"
        : "npm-sbom",
      sha,
      sha,
      sha,
      phase.phase === "negative-audit" || phase.phase === "positive-audit"
        ? runner.AUDIT_ARGUMENTS
        : runner.SBOM_ARGUMENTS,
    ),
  }));
  return input;
}

describe("ND-QA-003 Windows ARM64 evidence runner", () => {
  it("is inert on import and fixes every permitted command vector", () => {
    const source = readFileSync(
      fileURLToPath(new URL(import.meta.url.replace(/\.test\.ts$/u, ".mjs"), import.meta.url)),
      "utf8",
    );
    expect(source).not.toContain("node:child_process");
    expect(runner.AUDIT_ARGUMENTS).toEqual(["audit", "--json", "--audit-level=high"]);
    expect(runner.SBOM_ARGUMENTS).toEqual(["sbom", "--package-lock-only", "--sbom-format=spdx"]);
    expect(runner.NODE_VERSION_ARGUMENTS).toEqual(["--version"]);
    expect(runner.NPM_VERSION_ARGUMENTS).toEqual(["--version"]);
    expect(runner.assertAllowedNpmArguments(runner.AUDIT_ARGUMENTS, "audit")).toBe(true);
    expect(
      runner.assertAllowedNpmArguments([...runner.AUDIT_ARGUMENTS, "--omit=dev"], "audit"),
    ).toBe(false);
    expect(runner.assertAllowedNpmArguments(["audit", "--json"], "audit")).toBe(false);
    expect(
      runner.assertAllowedNpmArguments(
        ["sbom", "--package-lock-only", "--sbom-format=spdx", "--offline"],
        "sbom",
      ),
    ).toBe(false);
  });

  it("uses a closed case-insensitive environment and ordered configuration probes", () => {
    const environment = runner.buildSterileNpmEnvironment({
      appData: "C:/private/appdata",
      cache: "C:/private/cache",
      comSpec: "C:/Windows/System32/cmd.exe",
      globalConfig: "C:/private/global.npmrc",
      home: "C:/private/home",
      localAppData: "C:/private/localappdata",
      logs: "C:/private/logs",
      path: "C:/runtime;C:/Windows/System32;C:/Windows",
      pathExt: ".COM;.EXE;.BAT;.CMD",
      systemRoot: "C:/Windows",
      temp: "C:/private/temp",
      userConfig: "C:/private/user.npmrc",
    });
    expect(runner.assertSterileNpmEnvironment(environment)).toBe(true);
    expect(runner.assertSterileNpmEnvironment({ ...environment, npm_config_token: "secret" })).toBe(
      false,
    );
    expect(runner.NPM_CONFIGURATION_PROBES).toEqual([
      "userconfig",
      "globalconfig",
      "registry",
      "proxy",
      "https-proxy",
      "omit",
      "production",
      "offline",
      "prefer-offline",
      "package-lock",
      "workspace",
      "workspaces",
    ]);
    expect(runner.buildNpmProbeArguments("workspace")).toEqual(["config", "get", "workspace"]);
  });

  it("requires raw empty workspace and literal-null workspaces without normalization", () => {
    expect(runner.summarizeConfigurationProbes(probes(), sources()).ok).toBe(true);
    for (const invalid of [
      probes({ workspace: " false\r\n" }),
      probes({ workspaces: "false\r\n" }),
      probes({ workspaces: "null \r\n" }),
      probes({ workspaces: "null\r\nextra" }),
      probes({ registry: "https://registry.invalid/\r\n" }),
      probes({ proxy: "http://proxy.invalid/\r\n" }),
      probes({ omit: "dev\r\n" }),
      probes({ production: "true\r\n" }),
      probes({ offline: "true\r\n" }),
      probes({ "package-lock": "false\r\n" }),
    ]) {
      let valid = false;
      try {
        valid = runner.summarizeConfigurationProbes(invalid, sources()).ok;
      } catch {
        valid = false;
      }
      expect(valid).toBe(false);
    }
    expect(
      runner.summarizeConfigurationProbes(probes(), sources({ scopeDirectiveAbsent: false })).ok,
    ).toBe(false);
  });

  it("classifies only explicit nonzero network failures without a report", () => {
    expect(
      runner.classifyNegativeAudit({
        exitCode: 1,
        stderr: "npm ERR! code ENETUNREACH",
        stdout: "",
      }),
    ).toEqual({
      classified: true,
      exitClass: "EXPECTED_NETWORK_UNAVAILABLE",
    });
    for (const result of [
      { exitCode: 0, stderr: "npm ERR! code ENETUNREACH", stdout: "" },
      { exitCode: 1, stderr: "timed out", stdout: "" },
      { exitCode: 1, stderr: "npm ERR! code EUNKNOWN", stdout: "" },
      { exitCode: 1, stderr: "cache hit ENOTFOUND", stdout: "" },
      { exitCode: 1, stderr: "", stdout: '{"metadata":{"vulnerabilities":{}}}' },
    ]) {
      expect(runner.classifyNegativeAudit(result).classified).toBe(false);
    }
  });

  it("derives and proves SPDX membership, category, root, and relationship coverage from lockfile truth", () => {
    const graph = runner.deriveLockfileGraph({
      lockfileVersion: 3,
      packages: {
        "": {
          dependencies: { dep: "1.0.0" },
          devDependencies: { dev: "1.0.0" },
          name: "root",
          version: "1.0.0",
        },
        "node_modules/dep": { license: "MIT", version: "1.0.0" },
        "node_modules/dev": { dev: true, license: "MIT", version: "1.0.0" },
      },
    });
    const first = JSON.stringify({
      documentDescribes: ["SPDXRef-root"],
      documentNamespace: "urn:first",
      packages: [
        { SPDXID: "SPDXRef-root", licenseDeclared: "MIT", name: "root", versionInfo: "1.0.0" },
        {
          SPDXID: "SPDXRef-dep",
          licenseDeclared: "NOASSERTION",
          name: "dep",
          versionInfo: "1.0.0",
        },
        { SPDXID: "SPDXRef-dev", licenseDeclared: "MIT", name: "dev", versionInfo: "1.0.0" },
      ],
      relationships: [
        {
          relatedSpdxElement: "SPDXRef-dep",
          relationshipType: "DEPENDS_ON",
          spdxElementId: "SPDXRef-root",
        },
        {
          relatedSpdxElement: "SPDXRef-dev",
          relationshipType: "DEPENDS_ON",
          spdxElementId: "SPDXRef-root",
        },
      ],
      spdxVersion: "SPDX-2.3",
    });
    const summary = runner.summarizeSpdxSbom(Buffer.from(first, "utf8"), graph);
    expect(summary).toMatchObject({
      completeGraph: true,
      exitClass: "COMPLETE",
      schemaValid: true,
    });
    expect(summary.coverage.categories.production).toEqual({ expected: 2, observed: 2 });
    expect(summary.coverage.categories.development).toEqual({ expected: 1, observed: 1 });
    expect(runner.classifyDeclarationFixture(summary, "noAssertion")).toEqual({
      classification: "UNVERIFIED",
      verified: false,
    });
    const incompleteDocument = JSON.parse(first);
    incompleteDocument.relationships = [];
    expect(
      runner.summarizeSpdxSbom(Buffer.from(JSON.stringify(incompleteDocument), "utf8"), graph)
        .completeGraph,
    ).toBe(false);
    const second = Buffer.from(first.replace("urn:first", "urn:second"), "utf8");
    expect(runner.compareRawSbom(Buffer.from(first, "utf8"), second)).toEqual({
      determinism: "NOT VERIFIED",
      rawEqual: false,
      semanticComparable: true,
      semanticEqual: true,
    });
  });

  it("does not invent an unresolved optional peer edge and rejects every other unresolved edge", () => {
    const optionalPeerLock = {
      lockfileVersion: 3,
      packages: {
        "": { name: "root", version: "1.0.0" },
        "node_modules/peer-owner": {
          peerDependencies: { absent: "1.0.0" },
          peerDependenciesMeta: { absent: { optional: true } },
          version: "1.0.0",
        },
      },
    };
    expect(runner.deriveLockfileGraph(optionalPeerLock).relationshipKeys).toEqual([]);
    const requiredPeerLock = structuredClone(optionalPeerLock);
    requiredPeerLock.packages["node_modules/peer-owner"].peerDependenciesMeta.absent.optional =
      false;
    expect(() => runner.deriveLockfileGraph(requiredPeerLock)).toThrow(
      "lockfile dependency relationship is unresolved",
    );
  });

  it("derives the checked-out lockfile graph without inventing optional peer edges", () => {
    const lockfile = JSON.parse(
      readFileSync(
        resolve(fileURLToPath(import.meta.url), "..", "..", "..", "package-lock.json"),
        "utf8",
      ),
    );
    const graph = runner.deriveLockfileGraph(lockfile);
    expect(graph.packageKeys.length).toBeGreaterThan(0);
    expect(graph.relationshipKeys.length).toBeGreaterThan(0);
  });
  it("requires every PersistentStore and ActiveStore enforcement predicate", () => {
    const snapshot = {
      activeRulePresent: true,
      allProfilesEnabled: true,
      firewallProgramIdentityMatched: true,
      firewallScopeVerified: true,
      persistentRulePresent: true,
      profileStateRecheckPassed: true,
      ruleEffectiveForActiveProfiles: true,
      runtimeCollisionAbsent: true,
    };
    expect(runner.validateFirewallSnapshot(snapshot).verified).toBe(true);
    expect(
      runner.validateFirewallSnapshot({ ...snapshot, activeRulePresent: false }).verified,
    ).toBe(false);
    expect(
      runner.validateFirewallSnapshot({ ...snapshot, firewallScopeVerified: false }).verified,
    ).toBe(false);
    expect(
      runner.validateFirewallSnapshot({ ...snapshot, runtimeCollisionAbsent: false }).verified,
    ).toBe(false);
  });

  it("retains exactly seven canonical phase records and blocks later starts", () => {
    let ledger = runner.createPhaseLedger({ audit: sha, sbom: sha });
    expect(ledger.map((entry: { phase: string }) => entry.phase)).toEqual([
      "negative-audit",
      "sbom-first",
      "sbom-second",
      "fixture-missing",
      "fixture-noassertion",
      "fixture-malformed",
      "positive-audit",
    ]);
    expect(() => runner.recordPhase(ledger, "sbom-first", "COMPLETE")).toThrow();
    ledger = runner.recordPhase(ledger, "negative-audit", "EXPECTED_NETWORK_UNAVAILABLE");
    expect(runner.assertCompletePhaseLedger(runner.stopRemainingPhases(ledger))).toBe(true);
  });

  it("uses the same fixed command-identity byte record as the PowerShell wrapper", () => {
    expect(runner.fixedInvocationIdentity("npm-audit", sha, sha, sha, runner.AUDIT_ARGUMENTS)).toBe(
      "9e0911790832009ea118459641d4e15f0e84e62606866b8fd063b6f0a4d30443",
    );
  });

  it("rejects nested receipt data and incomplete PASS evidence", () => {
    const severityLeak = receiptInput();
    (severityLeak.audit.severityCounts as Record<string, unknown>).token = "SECRET";
    expect(() => runner.buildSanitizedReceipt(severityLeak)).toThrow();
    const incompletePass = passReceiptInput();
    incompletePass.phases[6] = {
      ...incompletePass.phases[6],
      exitClass: runner.NOT_RUN_PRECONDITION_FAILED,
    };
    expect(() => runner.buildSanitizedReceipt(incompletePass)).toThrow();
    const falseFirewallPass = passReceiptInput();
    falseFirewallPass.firewall.ruleA.activeRuleAbsentAfter = false;
    expect(() => runner.buildSanitizedReceipt(falseFirewallPass)).toThrow();
    const wrongPlatformPass = passReceiptInput();
    wrongPlatformPass.platform.processArchitecture = "NOT AVAILABLE";
    expect(() => runner.buildSanitizedReceipt(wrongPlatformPass)).toThrow();
    const unavailableProbeIdentityPass = passReceiptInput();
    unavailableProbeIdentityPass.configuration.probeSetVersion = "NOT AVAILABLE";
    expect(() => runner.buildSanitizedReceipt(unavailableProbeIdentityPass)).toThrow();
    const wrongCommandPass = passReceiptInput();
    wrongCommandPass.phases[0] = { ...wrongCommandPass.phases[0], commandIdentity: sha };
    expect(() => runner.buildSanitizedReceipt(wrongCommandPass)).toThrow();
    const wrongLifecyclePass = passReceiptInput();
    wrongLifecyclePass.firewall.ruleA.ruleLifecycleClass = "SBOM_AND_FIXTURES";
    expect(() => runner.buildSanitizedReceipt(wrongLifecyclePass)).toThrow();
    const missingRawPass = passReceiptInput();
    missingRawPass.sbom.first.rawSha256 = "NOT AVAILABLE";
    expect(() => runner.buildSanitizedReceipt(missingRawPass)).toThrow();
    const unequalRawPass = passReceiptInput();
    unequalRawPass.sbom.second.rawSha256 = "b".repeat(64);
    expect(() => runner.buildSanitizedReceipt(unequalRawPass)).toThrow();
    const unequalRawLengthPass = passReceiptInput();
    unequalRawLengthPass.sbom.second.rawByteLength = 2;
    expect(() => runner.buildSanitizedReceipt(unequalRawLengthPass)).toThrow();
    const thresholdFindingPass = passReceiptInput();
    thresholdFindingPass.audit.severityCounts.high = 1;
    expect(() => runner.buildSanitizedReceipt(thresholdFindingPass)).toThrow();
    const inconsistentSeverityPass = passReceiptInput();
    inconsistentSeverityPass.audit.severityCounts.total = 1;
    expect(() => runner.buildSanitizedReceipt(inconsistentSeverityPass)).toThrow();
    const incompleteDeclarationAccountingPass = passReceiptInput();
    incompleteDeclarationAccountingPass.sbom.first.declaredLicenseCounts.declared = 0;
    expect(() => runner.buildSanitizedReceipt(incompleteDeclarationAccountingPass)).toThrow();
    expect(runner.buildSanitizedReceipt(passReceiptInput()).status).toBe("PASS");
  });

  it("serializes an explicit receipt allowlist and validates its exact persisted bytes", () => {
    const canonical = runner.canonicalReceiptBytes(receiptInput());
    expect(runner.validateCanonicalReceiptBytes(canonical.bytes)).toBe(true);
    expect(
      runner.validateCanonicalReceiptBytes(Buffer.concat([canonical.bytes, Buffer.from(" ")])),
    ).toBe(false);
    expect(() =>
      runner.canonicalReceiptBytes({ ...receiptInput(), credential: "TOKEN-SENTINEL" }),
    ).toThrow();
    expect(() =>
      runner.canonicalReceiptBytes({ ...receiptInput(), path: "C:/private/PATH-SENTINEL" }),
    ).toThrow();

    const forged = JSON.parse(canonical.bytes.toString("utf8"));
    forged.receipt.audit = { ...forged.receipt.audit, rawOutput: "SECRET" };
    forged.bodySha256 = createHash("sha256").update(JSON.stringify(forged.receipt)).digest("hex");
    expect(
      runner.validateCanonicalReceiptBytes(Buffer.from(`${JSON.stringify(forged)}\n`, "utf8")),
    ).toBe(false);
  });
});
