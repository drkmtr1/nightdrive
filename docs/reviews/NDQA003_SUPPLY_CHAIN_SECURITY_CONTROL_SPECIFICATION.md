# ND-QA-003 supply-chain security-control specification

## Status and decision record

**ACCEPTED / BINDING.** The exact reviewed tuple — base `64b86b45bf1ec7152a265ac19de0ba6a7c81b137`, head `e356447fb1ae8bd0232d15b58b6f4eefd4db3716`, tree `887cd26ac008f6538b19848d3dc3b210bbc4bce0`, scope `docs/reviews/NDQA003_SUPPLY_CHAIN_SECURITY_CONTROL_SPECIFICATION.md` only, and 22,292-byte full-index patch SHA-256 `9FA3023B54BFF46EC6328B2DD4D5B98410A4B73B5084C2A563FC40F3CE24D6CD` — received consequential external exact-head PASS and explicit Product Owner acceptance. [PR #246](https://github.com/drkmtr1/nightdrive/pull/246) protected-squash-integrated the reviewed tree as `b4523d9d16a4b67044f216cb7b57a85f06dab0dd`; the integration tree is exactly the reviewed tree. Documentation / validate passed in [run 36306594034](https://github.com/drkmtr1/nightdrive/actions/runs/36306594034), and Runtime foundation / validate passed in [run 36306594016](https://github.com/drkmtr1/nightdrive/actions/runs/36306594016). The mechanism-selection authority became binding at protected integration; this lifecycle record does not create authority retroactively.

This accepted specification does **not** supply the later Product Owner-owned registry-egress disposition, vulnerability threshold, license policy, exception authority, alert owner, or GitHub administrative action. Those remain deliberately separate prerequisites for implementation. It does not close `ND-QA-003`.

## Objective and strict boundary

Specify the smallest auditable control design that can eventually satisfy the accepted requirements for automated vulnerability review, automated license review, and vulnerability alerts without silently selecting an external provider, accepting a legal license policy, or changing existing CI/security configuration.

The exact reviewed candidate changed only this new review record. It does not change `AGENTS.md`, `PROJECT_STATE.md`, the roadmap, `docs/SECURITY.md`, decisions, workflows, Dependabot configuration, package manifests, lockfiles, scripts, source, tests, GitHub settings, branch protection, dependencies, or runtime behavior. It installs nothing, invokes no security scanner, uploads no artifact, enables no alert, and transmits no dependency data.

## Governing authority and current finding

- [`docs/SECURITY.md`](../SECURITY.md) requires a lockfile, pinned supported runtimes, **automated vulnerability/license review**, minimal packages, protected branch/CI permissions, provenance/lockfile review, vulnerability alerts, and limited CI token permissions.
- [`docs/DEPENDENCIES.md`](../DEPENDENCIES.md) requires lockfile review, clean `npm ci`, `npm ls`, and `npm audit` when dependencies change. Those manual/update-time controls do not replace recurring automated review.
- [`NIGHTDRIVE_ENGINEERING_HEALTH_BASELINE.md`](NIGHTDRIVE_ENGINEERING_HEALTH_BASELINE.md) records `ND-QA-003` as **MUST FIX BEFORE NEXT MILESTONE — OPEN**. Its closure evidence is: an accepted control design, enabled/configured automation, successful-run evidence, and required GitHub security-configuration evidence.
- [`PROJECT_STATE.md`](../../PROJECT_STATE.md) and [`docs/ROADMAP.md`](../ROADMAP.md) make this the only eligible corrective task. They prohibit Stage 8 qualification progression and ordinary roadmap work while the Health Baseline remains `REVISE`.
- [`AGENTS.md`](../../AGENTS.md) requires the Build-vs-Buy gate and external review for consequential security, trust, permission, or dependency-policy changes not already settled by accepted authority.

The historic one-off `npm audit --omit=dev --audit-level=high` is insufficient: it excluded development dependencies, had no automated license review, did not establish recurring operation, and did not establish GitHub alert configuration. Its use of `high` is historical evidence only, not an accepted threshold for the proposed control.

## Current-state evidence and limits

The following is a dated baseline for this proposal, not a claim about future configuration or control effectiveness:

| Item | Observed state at integrated base `64b86b45bf1ec7152a265ac19de0ba6a7c81b137` | Limit |
| --- | --- | --- |
| Runtime/toolchain | `package.json` pins Node `>=24.15.0 <25`, npm `>=11.19.0 <12`, and `npm@11.19.0`; `.nvmrc` is `24.21.0`. | Pinned tools do not themselves supply audit, license, alert, or successful-run evidence. |
| Dependency input | `package-lock.json` v3 contains 210 non-root entries. All declare a `license` field, including compound expressions and LGPL values. | Declared package metadata is inventory evidence, not legal clearance, source-file scanning, or an accepted allow/deny policy. |
| Existing workflows | Only `documentation.yml` and `runtime.yml` are tracked. They run docs/runtime validation with `contents: read`; neither performs audit/license review or has a schedule. | Existing mutable action-tag exposure remains `ND-QA-005`; this proposal neither resolves nor expands that finding. |
| Tracked Dependabot configuration | No `.github/dependabot.yml` or `.github/dependabot.yaml` is tracked. | Dependabot alerts are repository settings, not proof from the absence of this file. |
| Limited live API probe, 2026-09-27 UTC | A read-only local client observed a `404` disabled diagnostic from the vulnerability-alert endpoint, a `204` response from the automated-security-fixes endpoint, a disabled/administrative-scope diagnostic while listing Dependabot alerts, and a `404` response from the legacy main-branch-protection endpoint. | These are sanitized single-client endpoint/status observations, **NOT VERIFIED** evidence of effective alert, update, entitlement, routing, or protection state. No credential, configuration value, alert, or response payload is retained here. The probe must be repeated under appropriate repository-admin access before implementation or closure. A legacy branch-protection response cannot rule out rulesets and is an out-of-scope observed condition requiring separate authority-led classification; this candidate does not relabel it as an ND-QA finding. |

No statement above establishes current hosted entitlement, alert recipients, available GitHub Code Security/GitHub Advanced Security features, administrative authority, or effective branch protection. The Health Baseline remains the historical assessment record; this limited probe does not contradict, replace, or close it.

## Coverage model

The eventual control must make four distinct claims with separate evidence:

1. **Full resolved-graph vulnerability review:** evaluate all resolved lockfile entries, including production, development, optional, peer, and transitive entries. Do not omit development dependencies or substitute a direct-dependency-only result.
2. **Full resolved-graph declared-license inventory and policy review:** evaluate every resolved entry's declared license expression against a separately accepted Nightdrive policy. Unknown, missing, malformed, undetected, or policy-unlisted values are not a pass.
3. **Pull-request dependency-change prevention:** review changes before merge where the selected mechanisms and repository entitlement support it. This is additive to, not a replacement for, recurring full-graph evidence.
4. **Vulnerability alert/update channel:** Dependabot alerts and security updates provide advisory/remediation workflow evidence, distinct from a CI result. An update pull request is not an accepted remediation until ordinary review, CI, and merge policy pass.

The license claim is intentionally limited to the declared dependency metadata represented by the approved lockfile/SBOM path. It makes no legal conclusion, source-file license scan, copyright claim, or assertion that a package's metadata is complete. A broader source-scanning claim requires a separately evaluated mechanism and authority.

## Build-versus-buy evaluation

Classification: **mixed**. Vulnerability matching, SBOM generation, and hosted dependency alerts are commodity controls. Nightdrive owns the exact graph scope, evidence envelope, no-mutation behavior, policy input boundary, exception evidence, result/provenance requirements, and `ND-QA-003` closure determination.

| Alternative | Strengths | Material limits | Disposition |
| --- | --- | --- | --- |
| Custom vulnerability and SPDX/license parser | Could avoid external tooling. | Reimplements advisory matching and SPDX-expression semantics; expands Nightdrive-owned security code without evidence of need. | Rejected. |
| GitHub dependency review action alone | Can inspect pull-request dependency deltas and can enforce vulnerability/licensing options. | For private repositories it requires verified GitHub Code Security or GitHub Advanced Security entitlement; it is PR-delta rather than recurring full-graph review; it does not supply Nightdrive's policy. | Not selected as the required baseline control. It may be evaluated later as an additive PR gate under a separate accepted entitlement/pinning decision. |
| External hosted scanner/service | May combine advisory, license, and policy features. | Adds provider trust, data egress, account/token, cost, retention, availability, and permission decisions. | Not selected. A future provider requires a new Build-vs-Buy and consequential authority decision. |
| CycloneDX generator plus policy utility | Standardized SBOM and policy capability, including SPDX-expression handling. | Adds multiple dependency/tool supply-chain entries and policy semantics; output/retention and runtime behavior need direct evidence. | Deferred. Evaluate only if the native-first compatibility spike cannot produce the bounded declared-metadata evidence below. |
| Direct installed-tree license checker | May inspect package files and enforce a policy. | Current candidates require separate maturity, transitive, platform, output, and maintenance evidence; their broader scanning claim is not required for declared-metadata review. | Not selected. |
| **Native npm audit + npm SBOM with GitHub Dependabot alerts/security updates** | Uses the already pinned npm toolchain and GitHub's repository-native alert channel; adds no package, provider, action, or source scanner. Supports a full lockfile graph and a portable, standard inventory format. | `npm audit` sends a dependency description to the configured registry, and no registry destination/payload authorization exists in current authority; SBOM output is inventory rather than legal policy; GitHub settings/entitlement and later policy values still require authority. | **Recommended only after a separate accepted registry-egress disposition, network-isolated compatibility evidence, and policy specification.** |

Primary external behavior references are [npm audit](https://docs.npmjs.com/cli/v11/commands/npm-audit/), [npm SBOM](https://docs.npmjs.com/cli/commands/npm-sbom/), [GitHub's dependency graph](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-graph), [Dependabot alerts](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-dependabot-alerts), [Dependabot security updates](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-security-updates), and [GitHub dependency review](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review). These references support mechanism capabilities and limits; they do not choose Nightdrive's policy values.

## Recommended nonbinding control design

Because this exact proposal is binding mechanism-selection authority, subsequent work may prepare a separate policy specification and then an implementation/configuration candidate only under these constraints:

### Vulnerability review

- Do not run networked `npm audit` in a spike, CI, or implementation until a separate accepted registry-egress disposition names the exact destination, dependency-description payload category, purpose, credential rule, and result-retention boundary. A public/default registry is not implicitly authorized. Once that disposition exists, run the pinned npm CLI against the complete locked graph with `npm audit --json`; do not run `npm audit fix`, `npm install`, dependency update, or lockfile mutation as part of review.
- The later policy specification must set the minimum failing severity, remediation expectation, exception record format/expiry/owner, treatment of unavailable advisory data, and any report-retention boundary. No threshold is selected here.
- Before any audit invocation, the spike and later implementation must establish an inspectable credential-free npm configuration boundary: only the tracked project `.npmrc` and explicit empty controlled job configuration may be used; inherited user/global/environment configuration or registry credentials are prohibited. Record only source identities/provenance and the effective registry, never secret values. The invocation must prove that its configured registry exactly matches the separately accepted egress disposition. Any private or nonstandard registry, registry credential, inherited configuration, unreviewed outbound destination, policy mismatch, or unavailable authorization fails closed. npm documents that audit submits a dependency description to the configured registry.
- Run on pull requests, pushes to the default branch, and at least weekly against the default branch. A successful run must identify the exact commit, lockfile bytes, Node/npm versions, command, exit code, policy version, and result identity.

### Declared-license review

- Produce a full-graph SPDX inventory from the exact `package-lock.json` with the pinned npm CLI's SBOM capability. The future compatibility spike must prove its supported command/options, deterministic output behavior, full-graph coverage, and network behavior under an enforced network-isolated check before adoption. If SBOM attempts external access, cannot run in that check, or yields ambiguous network evidence, the spike fails closed and this native approach is not adopted.
- A later accepted Nightdrive license-policy record must contain an explicit version, graph scope, exact accepted expression/exception rules, handling for `AND`/`OR` expressions, `NOASSERTION`/missing/unknown values, optional/development/peer entries, exception evidence, expiry, and decision owner.
- A later small policy-result component may compare raw inventory expressions against that accepted policy and produce a stable result envelope. It must not present itself as a generic SPDX parser, legal-analysis engine, or source scanner. If semantic expression interpretation or source-file scanning becomes necessary, return to Build-vs-Buy rather than expanding the local component.
- Until an accepted policy exists, generated inventory is evidence only and cannot return a license-policy PASS. It must not be turned into a generic allowlist based on whatever currently appears in the lockfile.

### Dependabot alert/update channel

- Enable the GitHub dependency graph as required by the feature, Dependabot alerts, and Dependabot security updates through an appropriately authorized repository-admin action. The control must retain date-bound configuration evidence and demonstrate that alerts can be observed under the selected role/access model.
- No `dependabot.yml` version-update schedule, private registry, secret, label, reviewer, or routing configuration is authorized by this proposal. Security updates may operate without a version-update configuration, but their effectiveness still depends on alerts and supported graph data.
- Alert triage/remediation owner, response expectation, dismissal/exception evidence, and notification scope require the separate accepted policy specification. GitHub defaults must not be treated as a Nightdrive decision.

### Least privilege, data handling, and failure behavior

- CI remains least-privilege: do not add write, security-event, package, repository-admin, or secret access merely to run audit/SBOM review. Hosted settings are outside the workflow and must be changed through their own authorized path.
- Do not upload raw audit/SBOM/license-text artifacts or emit their raw JSON/package/license detail to CI stdout, stderr, step summaries, or other logs by default. Before any retention, upload, or output, classify the report for package names, private metadata, license text, and destination; retain or emit only the minimum accepted sanitized evidence.
- Missing lockfile/runtime/tool, malformed SBOM, unresolved dependency graph, missing policy, missing registry-egress disposition, unknown registry, unavailable advisory service, unknown/missing license declaration, unclassified raw output destination, ignored error, or unapproved exception is a fail-closed result for the relevant claim. It is not a skip, warning-only pass, fallback, auto-fix, or substitute artifact.
- No mechanism here weakens existing CI, branch, review, or `ND-QA-005` action-provenance obligations.

## Decisions intentionally reserved

The following values are not determined by existing repository authority and cannot be inferred from current dependency metadata, a generic license allowlist, the historical audit command, or GitHub defaults:

1. exact `npm audit` registry destination, dependency-description payload category, purpose, credential rule, and report/log retention for its network egress;
2. vulnerability failure threshold and remediation deadline/exception process;
3. accepted graph scope if it is narrower than the recommended complete resolved graph;
4. accepted declared-license expressions or policy families, `AND`/`OR` treatment, unknown/missing/undetected behavior, and exception/expiry/owner;
5. alert triage/remediation owner and notification/response expectations;
6. current GitHub feature entitlement and repository-admin action to enable/verify dependency graph, alerts, security updates, and any optional dependency-review feature;
7. whether a later source-scanning or external-provider capability is needed beyond this bounded declared-metadata claim; and
8. classification and remediation path for the observed main-branch-protection response.

A later policy specification must obtain explicit Product Owner authority for these values. An implementation task must stop rather than fill them with local assumptions.

## Required pre-implementation compatibility/egress spike

Before any implementation/configuration candidate, run one bounded, read-only spike on a clean checkout at Node `24.21.0` and npm `11.19.0`. It must use the exact `package.json` and `package-lock.json`, install no new package, change no tracked or untracked repository state, and retain sanitized commands/results only.

It must prove or fail closed on:

- network-isolated `npm audit` behavior: prove it cannot silently use cache, a fallback, or a partial report as a pass when egress is unavailable; after the separate egress disposition, prove complete-graph scope, report/exit behavior at the later accepted threshold, exact registry match, credential-free configuration boundary, and no mutation;
- `npm sbom` lockfile-only behavior, transitive and scope coverage, declared-license output, deterministic reproducibility, output schema, and network behavior under an enforced network-isolated check;
- Windows ARM64 and Linux x64 compatibility at the pinned toolchain, CI runtime/cost, and evidence retention classification;
- unsupported/missing/unknown declaration behavior and no permissive fallback; and
- an exact removal path: no added dependency or provider is expected for the recommended native-first design.

A failed or ambiguous spike does not authorize a substitute tool. It returns to a separately bounded Build-vs-Buy decision with the observed evidence.

## Implementation, validation, and closure plan

After the completed external review, Product Owner acceptance, and protected-integration lifecycle recorded above:

1. Specify the reserved registry-egress, vulnerability, license, exception, alert-owner, and access values as a separate consequential policy task.
2. Perform the bounded compatibility/egress spike only after that task makes its inputs eligible.
3. Implement/configure the accepted control in a separate candidate, including any GitHub admin action under explicit access authority. Do not bundle policy selection, hosted configuration, workflow changes, new dependencies, or unrelated action pinning changes without their own accepted scope.
4. Validate complete-graph vulnerability and declared-license results, failure paths, no-mutation behavior, exact CI triggers, least privileges, alert/update observation, and reviewed artifact/report handling at the supported runtime/platforms.
5. Collect the Health Baseline's required closure evidence: accepted control design, enabled/configured automation, successful-run evidence, and required GitHub security-configuration evidence.
6. Reconcile `ND-QA-003` only after those conditions are demonstrated. Preserve `ND-QA-004`, `ND-QA-005`, `MIA-003`, and `S8-QUAL-001`/`002`/`003` independently. The Health Baseline remains `REVISE` until applicable open findings have valid closure evidence.

This proposal does not authorize Stage 8 capture, evidence freeze, production/reference comparison, supported-platform qualification, further Stage 8 implementation, or ordinary roadmap work.

## Review and acceptance record

This consequential security/trust/permission/dependency-policy specification was outside the settled-contract dedicated-reviewer substitution gate. Completed route:

1. consequential external exact-head review of the immutable base/head/tree/scope and complete candidate content;
2. explicit Product Owner acceptance of the reviewed tuple, limited to this mechanism-selection authority; and
3. protected integration with required CI, followed by mechanical coordination reconciliation if repository truth becomes stale.

External PASS did not accept later policy values, hosted settings, external providers, dependency additions, implementation, alert operation, vulnerability/license results, `ND-QA-003` closure, or Stage 8 qualification.
