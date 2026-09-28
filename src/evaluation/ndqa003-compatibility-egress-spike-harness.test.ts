import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// @ts-expect-error Native ESM harness has no declaration file.
import * as harness from "./ndqa003-compatibility-egress-spike-harness.mjs";

const configurationValues = Object.freeze({
  "https-proxy": "null",
  "package-lock": "true",
  "prefer-offline": "false",
  httpsProxy: undefined,
  offline: "false",
  omit: "",
  production: "false",
  proxy: "null",
  registry: "https://registry.npmjs.org/",
  workspace: "null",
  workspaces: "false",
});

function auditReport(high: number, critical: number) {
  return JSON.stringify({
    auditReportVersion: 2,
    metadata: {
      vulnerabilities: {
        critical,
        high,
        info: 0,
        low: 0,
        moderate: 0,
        total: high + critical,
      },
    },
  });
}

function completeSbom(created: string, documentNamespace: string) {
  return JSON.stringify({
    creationInfo: { created },
    documentDescribes: ["SPDXRef-root"],
    documentNamespace,
    packages: [
      {
        SPDXID: "SPDXRef-root",
        licenseDeclared: "MIT",
        name: "root",
        versionInfo: "1.0.0",
      },
      {
        SPDXID: "SPDXRef-dependency",
        licenseDeclared: "MIT",
        name: "dependency",
        versionInfo: "2.0.0",
      },
    ],
    relationships: [
      {
        relatedSpdxElement: "SPDXRef-dependency",
        relationshipType: "DEPENDS_ON",
        spdxElementId: "SPDXRef-root",
      },
    ],
    spdxVersion: "SPDX-2.3",
  });
}

const safeCommit = "a".repeat(40);
const safeTree = "b".repeat(40);
const safeHash = "c".repeat(64);

function completeConfiguration() {
  return {
    credentialBearingInputAbsent: true,
    effectiveRegistry: "https://registry.npmjs.org/",
    effectiveRegistryMatches: true,
    httpsProxyAbsent: true,
    jobConfigEmpty: true,
    noScopeReducingArguments: true,
    offlineFalse: true,
    omitEmpty: true,
    packageLockTrue: true,
    preferOfflineFalse: true,
    productionFalse: true,
    projectConfigTracked: true,
    proxyAbsent: true,
    readable: true,
    workspaceAbsent: true,
    workspacesFalse: true,
  };
}

function completeSpdxSummary() {
  return {
    completeGraph: true,
    coverage: {
      actualEntries: 2,
      developmentEntries: 0,
      expectedEntries: 2,
      missingEntries: 0,
      optionalEntries: 0,
      peerEntries: 0,
      productionEntries: 2,
      relationshipsPresent: true,
      rootPresent: true,
      unexpectedEntries: 0,
    },
    declaredLicenseCounts: {
      ambiguous: 0,
      declared: 2,
      empty: 0,
      malformed: 0,
      missing: 0,
      noAssertion: 0,
      unknown: 0,
      unmappable: 0,
    },
    exitClass: "COMPLETE",
    rawByteLength: 1,
    rawSha256: safeHash,
    rootLicenseCategory: "declared",
    schemaValid: true,
    schemaVersion: "SPDX-2.3",
  };
}

function completeReceiptWithNestedSentinels() {
  const nestedSentinel = {
    license: "LICENSE-SENTINEL",
    packageName: "PACKAGE-SENTINEL",
    path: "C:/private/PATH-SENTINEL",
    token: "TOKEN-SENTINEL",
    version: "VERSION-SENTINEL",
  };
  return {
    billing: "BILLING-SENTINEL",
    checkout: {
      commit: safeCommit,
      packageLock: { byteLength: 1, sha256: safeHash, ...nestedSentinel },
      projectNpmrc: { byteLength: 1, sha256: safeHash, ...nestedSentinel },
      tree: safeTree,
      ...nestedSentinel,
    },
    configuration: { ...completeConfiguration(), ...nestedSentinel },
    confirmation: "ACCEPTED",
    custody: {
      artifactRetention: "SANITIZED_RECEIPT_ONLY",
      artifactTarget: "receipt.json",
      artifactUploaderReceiptOnly: true,
      cleanupFailure: false,
      rawTemporaryFilesDeleted: true,
      ...nestedSentinel,
    },
    durationMilliseconds: 1,
    failures: [{ code: "SBOM_RAW_DETERMINISM_NOT_VERIFIED", phase: "sbom-determinism" }],
    finishedAtUtc: "2026-09-27T00:00:01.000Z",
    github: {
      attempt: "1",
      job: "spike",
      runId: "1",
      sha: safeCommit,
      ...nestedSentinel,
    },
    negativeControl: {
      configuration: { ...completeConfiguration(), ...nestedSentinel },
      namespace: {
        distinct: true,
        loopbackOnly: true,
        noIpv4DefaultRoute: true,
        noIpv6DefaultRoute: true,
        ...nestedSentinel,
      },
      negativeAudit: {
        classified: true,
        exitClass: "EXPECTED_NETWORK_UNAVAILABLE",
        rawByteLength: 1,
        rawSha256: safeHash,
        ...nestedSentinel,
      },
      ...nestedSentinel,
    },
    policy: "untrusted-policy-value",
    positiveAudit: {
      complete: true,
      exitClass: "COMPLETE_NO_THRESHOLD_FINDING",
      fullGraphEstablished: true,
      rawByteLength: 1,
      rawSha256: safeHash,
      reportVersion: 2,
      severityCounts: {
        critical: 0,
        high: 0,
        info: 0,
        low: 0,
        moderate: 0,
        total: 0,
        ...nestedSentinel,
      },
      ...nestedSentinel,
    },
    runner: {
      hostArchitecture: "x86_64",
      image: "ubuntu-24.04",
      imageVersion: "20260927.1",
      processArch: "x64",
      processPlatform: "linux",
      runnerArch: "X64",
      runnerOs: "Linux",
      ...nestedSentinel,
    },
    sbom: {
      determinism: "NOT VERIFIED",
      first: { ...completeSpdxSummary(), ...nestedSentinel },
      fixtures: [
        { classification: "MISSING", verified: true, ...nestedSentinel },
        { classification: "NOASSERTION", verified: true, ...nestedSentinel },
        { classification: "MALFORMED", verified: true, ...nestedSentinel },
      ],
      rawEqual: false,
      second: { ...completeSpdxSummary(), ...nestedSentinel },
      semanticComparable: true,
      semanticEqual: true,
      status: "NOT VERIFIED",
      ...nestedSentinel,
    },
    startedAtUtc: "2026-09-27T00:00:00.000Z",
    status: "NOT VERIFIED",
    toolchain: { node: "v24.21.0", npm: "11.19.0", ...nestedSentinel },
    ...nestedSentinel,
  };
}

describe("ND-QA-003 compatibility/egress spike harness", () => {
  it("constructs the fixed npm and namespace commands without a fallback option", () => {
    expect(harness.buildAuditInvocation()).toEqual({
      arguments: ["audit", "--json", "--audit-level=high"],
      executable: "npm",
    });
    expect(harness.buildSbomInvocation()).toEqual({
      arguments: ["sbom", "--package-lock-only", "--sbom-format=spdx"],
      executable: "npm",
    });
    const namespace = harness.buildNamespaceInvocation("/runner.mjs", "/control.json");
    expect(namespace.executable).toBe("sudo");
    expect(namespace.arguments.slice(0, 5)).toEqual([
      "-n",
      "unshare",
      "--net",
      "--fork",
      "--mount-proc",
    ]);
    expect(namespace.arguments).not.toContain("--offline");
  });

  it("creates an allowlisted npm child environment", () => {
    const environment = harness.buildSterileNpmEnvironment(
      {
        cache: "/temporary/cache",
        home: "/temporary/home",
        logs: "/temporary/logs",
        xdgConfig: "/temporary/xdg",
      },
      { globalConfig: "/temporary/global.npmrc", userConfig: "/temporary/user.npmrc" },
      "/toolchain/node",
    );
    expect(environment).toEqual({
      HOME: "/temporary/home",
      NPM_CONFIG_CACHE: "/temporary/cache",
      NPM_CONFIG_GLOBALCONFIG: "/temporary/global.npmrc",
      NPM_CONFIG_LOGS_DIR: "/temporary/logs",
      NPM_CONFIG_USERCONFIG: "/temporary/user.npmrc",
      PATH: "/toolchain:/usr/local/bin:/usr/bin:/bin",
      XDG_CONFIG_HOME: "/temporary/xdg",
    });
    expect(environment).not.toHaveProperty("GITHUB_TOKEN");
    expect(environment).not.toHaveProperty("NODE_ENV");
    expect(environment).not.toHaveProperty("HTTPS_PROXY");
  });

  it("requires the full declared configuration and rejects scope reduction", () => {
    const configuration = harness.summarizeNpmConfiguration(configurationValues);
    expect(configuration.ok).toBe(true);
    for (const invalid of [
      { registry: "https://registry.invalid/" },
      { proxy: "http://proxy.invalid/" },
      { "https-proxy": "https://proxy.invalid/" },
      { omit: "dev" },
      { production: "true" },
      { offline: "true" },
      { "prefer-offline": "true" },
      { "package-lock": "false" },
      { workspace: "stage8" },
      { workspaces: "true" },
    ]) {
      expect(harness.summarizeNpmConfiguration({ ...configurationValues, ...invalid }).ok).toBe(
        false,
      );
    }
  });

  it("fails closed for an incomplete network namespace", () => {
    expect(
      harness.assertNamespaceEvidence({
        distinct: true,
        loopbackOnly: true,
        noIpv4DefaultRoute: true,
        noIpv6DefaultRoute: true,
      }),
    ).toBe(true);
    expect(
      harness.assertNamespaceEvidence({
        distinct: false,
        loopbackOnly: true,
        noIpv4DefaultRoute: true,
        noIpv6DefaultRoute: true,
      }),
    ).toBe(false);
  });

  it("distinguishes a classified isolated-network error from a complete audit report", () => {
    expect(
      harness.summarizeNegativeAuditResult(JSON.stringify({ error: { code: "ENETUNREACH" } }), 1)
        .classified,
    ).toBe(true);
    expect(
      harness.summarizeNegativeAuditResult(JSON.stringify({ error: { code: "ENETUNREACH" } }), 0)
        .classified,
    ).toBe(false);
    expect(
      harness.summarizeNegativeAuditResult(JSON.stringify({ error: { code: "EUNKNOWN" } }), 1)
        .classified,
    ).toBe(false);
    expect(harness.summarizeNegativeAuditResult(auditReport(0, 0), 1).classified).toBe(false);
    expect(harness.summarizeAuditResult(auditReport(0, 0), 0, true)).toMatchObject({
      complete: true,
      exitClass: "COMPLETE_NO_THRESHOLD_FINDING",
      fullGraphEstablished: true,
    });
    expect(harness.summarizeAuditResult(auditReport(1, 1), 1, true)).toMatchObject({
      complete: true,
      exitClass: "COMPLETE_THRESHOLD_FINDING",
      fullGraphEstablished: true,
    });
  });

  it("retains raw SBOM inequality while limiting semantic comparison to documented volatile fields", () => {
    const graph = harness.describeLockfileGraph({
      packages: {
        "": { name: "root", version: "1.0.0" },
        "node_modules/dependency": { version: "2.0.0" },
      },
    });
    expect(graph).toBeDefined();
    expect(
      harness.summarizeSpdxSbom(completeSbom("2026-09-27T00:00:00Z", "urn:first"), graph),
    ).toMatchObject({
      completeGraph: true,
      rootLicenseCategory: "declared",
      schemaValid: true,
    });
    expect(
      harness.compareSbomRawAndSemantic(
        completeSbom("2026-09-27T00:00:00Z", "urn:first"),
        completeSbom("2026-09-27T00:00:01Z", "urn:second"),
      ),
    ).toEqual({
      determinism: "NOT VERIFIED",
      rawEqual: false,
      semanticComparable: true,
      semanticEqual: true,
    });
    expect(
      harness.compareSbomRawAndSemantic(
        completeSbom("2026-09-27T00:00:00Z", "urn:first"),
        completeSbom("2026-09-27T00:00:00Z", "urn:first").replace(
          '"versionInfo":"2.0.0"',
          '"versionInfo":"3.0.0"',
        ),
      ),
    ).toMatchObject({
      rawEqual: false,
      semanticComparable: true,
      semanticEqual: false,
    });
  });

  it("projects a complete receipt through an explicit nested allowlist", () => {
    const receipt = harness.buildSanitizedReceipt(completeReceiptWithNestedSentinels());
    const serialized = JSON.stringify(receipt);
    for (const sentinel of [
      "BILLING-SENTINEL",
      "LICENSE-SENTINEL",
      "PACKAGE-SENTINEL",
      "PATH-SENTINEL",
      "TOKEN-SENTINEL",
      "VERSION-SENTINEL",
    ])
      expect(serialized).not.toContain(sentinel);
    expect(Object.keys(receipt)).toEqual([
      "schema",
      "status",
      "policy",
      "startedAtUtc",
      "finishedAtUtc",
      "durationMilliseconds",
      "confirmation",
      "toolchain",
      "commands",
      "custody",
      "billing",
      "failures",
      "checkout",
      "configuration",
      "github",
      "negativeControl",
      "positiveAudit",
      "runner",
      "sbom",
    ]);
    expect(receipt).toMatchObject({
      checkout: { commit: safeCommit, tree: safeTree },
      configuration: { effectiveRegistry: "https://registry.npmjs.org/" },
      github: { attempt: "1", job: "spike", runId: "1", sha: safeCommit },
      negativeControl: { negativeAudit: { classified: true } },
      positiveAudit: { complete: true, fullGraphEstablished: true },
      runner: { processArch: "x64", processPlatform: "linux" },
      sbom: { status: "NOT VERIFIED" },
    });
    expect(receipt.policy).toBe("nightdrive.supply-chain.ndqa003.v1");
  });

  it("requires complete canonical evidence before preserving an existing failure receipt", () => {
    const bootstrap = harness.buildSanitizedReceipt({
      checkout: { verified: false },
      confirmation: "REJECTED",
      custody: {
        artifactRetention: "SANITIZED_RECEIPT_ONLY",
        artifactTarget: "receipt.json",
        artifactUploaderReceiptOnly: true,
        cleanupFailure: false,
        rawTemporaryFilesDeleted: true,
      },
      durationMilliseconds: 0,
      failures: [{ code: "RUNNER_UNAVAILABLE", phase: "WORKFLOW-BOOTSTRAP" }],
      finishedAtUtc: "2026-09-27T00:00:00.000Z",
      startedAtUtc: "2026-09-27T00:00:00.000Z",
      status: "FAIL",
      toolchain: { node: "UNVERIFIED", npm: "UNVERIFIED" },
    });
    const canonical = Buffer.from(`${JSON.stringify(bootstrap)}\n`, "utf8");
    expect(harness.validatePreservableFailureReceiptBytes(canonical)).toBe(true);
    expect(
      harness.validatePreservableFailureReceiptBytes(
        Buffer.from(
          canonical
            .toString("utf8")
            .replace(
              '"billing":"NOT AVAILABLE"',
              '"billing":"TOKEN-SENTINEL","billing":"NOT AVAILABLE"',
            ),
          "utf8",
        ),
      ),
    ).toBe(false);
    expect(
      harness.validatePreservableFailureReceiptBytes(Buffer.concat([canonical, Buffer.from(" ")])),
    ).toBe(false);
    for (const raw of ["null\n", "[]\n", '"unexpected"\n', "{}\n"])
      expect(harness.validatePreservableFailureReceiptBytes(Buffer.from(raw, "utf8"))).toBe(false);

    const passing = structuredClone(completeReceiptWithNestedSentinels());
    passing.failures = [];
    passing.sbom.determinism = "PASS";
    passing.sbom.rawEqual = true;
    passing.sbom.status = "PASS";
    passing.status = "PASS";
    const passReceipt = harness.buildSanitizedReceipt(passing);
    expect(passReceipt.status).toBe("PASS");
    expect(
      harness.validatePreservableFailureReceiptBytes(
        Buffer.from(`${JSON.stringify(passReceipt)}\n`, "utf8"),
      ),
    ).toBe(false);
    expect(
      harness.buildSanitizedReceipt({
        ...passing,
        confirmation: "REJECTED",
      }).status,
    ).toBe("FAIL");
    expect(
      harness.buildSanitizedReceipt({
        ...passing,
        failures: [{ code: "UNEXPECTED_HARNESS_FAILURE", phase: "harness" }],
      }).status,
    ).toBe("FAIL");
    const missingGithub = structuredClone(completeReceiptWithNestedSentinels());
    Reflect.deleteProperty(missingGithub, "github");
    expect(harness.buildSanitizedReceipt(missingGithub).status).toBe("FAIL");
    const mismatchedCommit = structuredClone(completeReceiptWithNestedSentinels());
    mismatchedCommit.checkout.commit = "d".repeat(40);
    expect(harness.buildSanitizedReceipt(mismatchedCommit).status).toBe("FAIL");
    for (const toolchain of [
      { node: "v22.17.1", npm: "11.19.0" },
      { node: "v24.21.0", npm: "10.9.2" },
    ])
      expect(
        harness.buildSanitizedReceipt({
          ...completeReceiptWithNestedSentinels(),
          toolchain,
        }).status,
      ).toBe("FAIL");
    expect(
      harness.buildSanitizedReceipt({
        confirmation: "ACCEPTED",
        custody: bootstrap.custody,
        durationMilliseconds: 0,
        failures: [],
        finishedAtUtc: "2026-09-27T00:00:00.000Z",
        startedAtUtc: "2026-09-27T00:00:00.000Z",
        status: "PASS",
        toolchain: { node: "v24.21.0", npm: "11.19.0" },
      }).status,
    ).toBe("FAIL");
  });

  it("keeps the workflow manual, temporary, receipt-only, and free of package installation", () => {
    const workflow = readFileSync(
      resolve(process.cwd(), ".github/workflows/ndqa003-compatibility-egress-spike.yml"),
      "utf8",
    );
    const triggers = workflow.slice(0, workflow.indexOf("permissions:"));
    const actionReferences = [...workflow.matchAll(/^\s*uses:\s*([^\s]+)\s*$/gmu)].map(
      (match) => match[1],
    );
    const artifactPaths = [...workflow.matchAll(/^\s+path:\s+(.+)$/gmu)].map((match) => match[1]);
    expect([...triggers.matchAll(/^ {2}([a-z_]+):/gmu)].map((match) => match[1])).toEqual([
      "workflow_dispatch",
    ]);
    expect(workflow).toContain("confirmation:");
    expect(workflow).toMatch(/^permissions:\n {2}contents: read$/mu);
    expect(workflow).toContain("runs-on: ubuntu-latest");
    expect(actionReferences).toEqual([
      "actions/checkout@v4",
      "actions/setup-node@v4",
      "actions/upload-artifact@v4",
    ]);
    expect(workflow).toContain(`ref: \${{ github.sha }}`);
    expect(workflow).toContain("fetch-depth: 0");
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).toContain('node-version: "24.21.0"');
    expect(workflow).toContain(`if: \${{ always() }}`);
    expect(artifactPaths).toEqual([
      `\${{ runner.temp }}/nightdrive-ndqa003-compatibility-egress-spike/receipt.json`,
    ]);
    expect(workflow).toContain(`if: \${{ failure() }}`);
    expect(workflow).toContain(
      `: "\${RUNNER_TEMP:?GitHub Actions runner temporary root is required}"`,
    );
    expect(workflow).toContain('[ "$NDQA003_OUTPUT_DIR" = "$expected_output" ] || exit 1');
    expect(workflow).toContain('[ -d "$NDQA003_OUTPUT_DIR" ]');
    expect(workflow).toContain('[ ! -L "$NDQA003_OUTPUT_DIR" ]');
    expect(workflow).toContain('[ ! -L "$receipt" ]');
    expect(workflow).toContain("validatePreservableFailureReceiptBytes");
    expect(workflow).toContain('find "$NDQA003_OUTPUT_DIR" -mindepth 1 -maxdepth 1');
    expect(workflow).toContain("umask 077");
    expect(workflow).toContain('\\"checkout\\":{\\"verified\\":false}');
    expect(workflow).toContain(
      'github_fragment=",\\"github\\":{\\"attempt\\":\\"$GITHUB_RUN_ATTEMPT\\",\\"job\\":\\"$GITHUB_JOB\\",\\"runId\\":\\"$GITHUB_RUN_ID\\",\\"sha\\":\\"$GITHUB_SHA\\"}"',
    );
    expect(workflow).toContain('process.platform + " " + process.arch');
    expect(workflow).not.toContain('"processArch":"UNVERIFIED"');
    expect(workflow).not.toMatch(/^\s+cache:/mu);
    expect(workflow).not.toMatch(/\b(?:npx|npm\s+(?:ci|install|i|update|audit\s+fix))\b/iu);
    expect(workflow).not.toContain("continue-on-error");
    expect(workflow).not.toContain("|| true");
    expect(workflow).not.toMatch(
      /docker|self-hosted|iptables|nft|proxy|vnet|ubuntu-slim|larger|codespaces|aws/iu,
    );
  });
});
