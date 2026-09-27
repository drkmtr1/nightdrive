# ND-QA-003 supply-chain security policy specification

## Status and decision record

**CANDIDATE. This exact policy becomes accepted implementation authority only after consequential external review PASS, explicit Product Owner acceptance of the reviewed tuple, and protected integration. Before those conditions are satisfied, it is not implementation authority.**

**Policy identifier:** `nightdrive.supply-chain.ndqa003.v1`.

**Decision authority input:** Product Owner policy decision record supplied on 2026-09-27 for repository baseline `25481e89ecae16d6df945552ed0efe67861e4217`.

This candidate resolves only the values intentionally reserved by the accepted [ND-QA-003 supply-chain security-control specification](NDQA003_SUPPLY_CHAIN_SECURITY_CONTROL_SPECIFICATION.md). It preserves that accepted native-first mechanism: pinned npm `audit`, pinned npm SBOM, and GitHub dependency graph / Dependabot alert and security-update controls. It does not revise the control design, add a provider, add a dependency, change a workflow, invoke a scanner, configure GitHub, or close `ND-QA-003`.

## Governing authority and current finding

- [`AGENTS.md`](../../AGENTS.md) requires the Build-vs-Buy gate and preserves external review for consequential security, trust, permission, egress, and dependency-policy changes.
- [`docs/SECURITY.md`](../SECURITY.md) requires automated vulnerability/license review, vulnerability alerts, lockfile provenance, pinned supported runtimes, protected branch/CI permissions, and limited CI token permissions.
- [`docs/DEPENDENCIES.md`](../DEPENDENCIES.md) requires clean locked installation, `npm ls`, and `npm audit` when dependencies change; it does not substitute for this recurring automated control.
- The accepted [control specification](NDQA003_SUPPLY_CHAIN_SECURITY_CONTROL_SPECIFICATION.md) selects the native-first mechanism and requires the policy, compatibility/egress spike, and implementation/configuration work as distinct tasks.
- The [Engineering Health Baseline](NIGHTDRIVE_ENGINEERING_HEALTH_BASELINE.md) records `ND-QA-003` as **MUST FIX BEFORE NEXT MILESTONE / OPEN**. Its closure evidence remains accepted design, enabled/configured automation, successful-run evidence, and required GitHub security-configuration evidence.
- [`PROJECT_STATE.md`](../../PROJECT_STATE.md) keeps the Health Baseline at `REVISE` and permits only separately bounded corrective work.

`ND-QA-004`, `ND-QA-005`, `MIA-003`, and `S8-QUAL-001`/`002`/`003` remain independent and unchanged.

## Purpose, claim boundary, and applicability

The future control makes only these bounded claims:

1. complete resolved-graph vulnerability review;
2. complete resolved-graph declared-license metadata review against this policy; and
3. pull-request dependency-change prevention through the accepted full-graph control where the selected mechanisms and repository entitlement support it, additive to recurring evidence; and
4. separately evidenced GitHub dependency-graph, Dependabot-alert, and Dependabot-security-update operation.

The declared-license claim is not legal advice, legal clearance, source-file analysis, copyright analysis, package-content inspection, or a general software-composition-analysis claim. The control must not treat a package's metadata as proof of a complete legal license inventory.

`ND-QA-003` remains **MUST FIX BEFORE NEXT MILESTONE / OPEN**. The Engineering Health Baseline remains **REVISE**. This policy does not authorize Stage 8 qualification, evidence capture/freeze, production/reference comparison, supported-platform qualification, another Stage 8 implementation slice, or ordinary roadmap work.

## Shared full-graph and evidence rules

The vulnerability and declared-license controls cover every resolved entry relevant to the exact `package-lock.json` installation graph: production, development, optional, peer, and transitive dependencies. No class is excluded because it is absent from a production bundle. A partial graph cannot satisfy either claim.

A successful result must bind the exact commit, lockfile identity, Node/npm identities, command identity, effective registry, policy identifier, exit/result state, and stable result identity. Raw audit responses, raw SBOM output, package/license detail, credentials, authorization headers, tokens, environment-variable values, and private configuration values must not be uploaded as CI artifacts or emitted wholesale to CI logs, stdout, stderr, or summaries. Retain only the minimum sanitized evidence above.

Missing lockfile/runtime/tool, malformed or incomplete result, unresolved graph, missing policy, unknown registry, ignored error, unapproved or expired exception, or unclassified output destination fails closed for the affected claim. It is not a warning-only pass, cache-derived fallback, partial result, auto-fix, dependency update, or lockfile mutation.

## Vulnerability advisory egress and policy

### Authorized egress

A future policy-conformant `npm audit` invocation may send only the dependency-description information necessarily transmitted by the pinned npm CLI for advisory matching of Nightdrive's complete resolved dependency graph to:

```text
https://registry.npmjs.org/
```

That is the sole authorized outbound destination and purpose for the `npm audit` vulnerability-advisory-matching invocation. The effective registry must exactly equal that URL. Any other registry or outbound destination fails closed for the vulnerability-review claim.

The audit process must be credential-free. No npm authentication token, registry credential, user-level credential, private-registry credential, or other secret may be available to or transmitted by the process. Its inspectable configuration boundary permits only the tracked project npm configuration plus an explicitly controlled empty job configuration. Inherited user, global, environment, and machine-specific npm configuration are prohibited. No other registry or provider egress is authorized.

The later compatibility/egress spike and implementation must establish and use the pinned `npm audit --json --audit-level=high` form, so the minimum failing threshold is `high` and includes `critical`. It must use no `--omit`, production-only, or other scope-reducing option. This policy does not authorize `npm audit fix`, `npm install`, a dependency update, a lockfile mutation, or automatic remediation.

### Failure threshold and remediation

A complete vulnerability result fails the automated policy gate when it contains a `high` or `critical` advisory not covered by a valid exception. `moderate` and `low` advisories do not fail the gate by severity alone, but remain visible for ordinary engineering triage.

- **Critical:** assess immediately on discovery. Resolve it or obtain a valid Product Owner exception before further ordinary roadmap work.
- **High:** assess within 3 calendar days and resolve within 14 calendar days unless a valid Product Owner exception exists.
- **Moderate / low:** prioritize from demonstrated exploitability, exposure, dependency-change opportunities, and ordinary engineering evidence.

Unavailable advisory data, a registry/advisory outage, a malformed or incomplete result, an authentication/configuration anomaly, or inability to establish complete-graph review fails closed for the vulnerability-review claim. That outcome may block the control without asserting that a vulnerability exists.

### Vulnerability exceptions

An exception is valid only when it records the advisory identity, affected dependency and resolved version, why remediation is infeasible or disproportionate, Nightdrive exposure/applicability analysis, compensating controls, supporting evidence, accountable owner, Product Owner approval date, and expiry date. The Product Owner is the sole exception authority.

The maximum initial duration is 90 calendar days. Renewal requires explicit Product Owner approval with fresh evidence; there is no automatic renewal. A valid exception must remain visibly distinct from a clean result and never removes, suppresses, or rewrites the underlying advisory. An unapproved or expired exception fails closed.

## Declared-license metadata policy

### Automatic acceptance

A valid SPDX expression may pass automatically only when every license needed by the expression is one of:

- `0BSD`
- `Apache-2.0`
- `BSD-2-Clause`
- `BSD-3-Clause`
- `ISC`
- `MIT`

This is a policy table, not an inference from the current lockfile.

### Expressions requiring review

The following do not automatically pass. They require a matching valid Product Owner exception or a new explicit Product Owner disposition:

- LGPL-, GPL-, AGPL-, MPL-, EPL-, CDDL-, SSPL-, source-available, proprietary, commercial, and custom license families;
- SPDX exceptions; and
- any expression containing a license outside the automatic-acceptance table.

They are not categorically prohibited. The policy declines to encode a broad legal conclusion for them.

For SPDX expressions, every operand of an `AND` expression must independently satisfy the policy; otherwise the full expression does not automatically pass. An `OR` expression may pass only when at least one complete alternative independently satisfies the policy. The implementation must preserve parentheses and valid SPDX structure and must not arbitrarily choose an alternative without support from the declared expression semantics.

Missing, empty, malformed, `NOASSERTION`, unknown, unrecognized, unmappable, or ambiguously parsed license metadata fails closed for the license-policy claim. If correct evaluation exceeds the bounded native inventory path plus a small policy component, stop for a separate Build-vs-Buy decision rather than creating a generic SPDX parser.

### License exceptions

A license exception is valid only when it records the package and exact resolved version, declared expression, reason for acceptance, relevant use/distribution context, supporting evidence, accountable owner, Product Owner approval date, and expiry/review date. The Product Owner is the sole exception authority.

The maximum initial duration is 180 calendar days unless the Product Owner records a different evidence-backed duration. An unapproved or expired exception fails closed. A valid exception must remain distinct from an automatically accepted result and does not alter the package's declared metadata.

## Dependabot ownership and GitHub controls

The Product Owner is accountable for Dependabot alert triage and remediation. Codex may, under the existing Nightdrive engineering workflow, inspect an alert, establish the affected dependency/version and repository applicability, determine whether a straightforward supported remediation exists, prepare the smallest eligible remediation candidate, and validate it. Codex may not independently dismiss, suppress, or permanently accept a vulnerability.

- **Critical alert:** triage in the next active Nightdrive engineering session before ordinary roadmap work.
- **High alert:** triage within 3 calendar days.
- **Moderate / low alert:** include in normal Engineering Health review unless evidence elevates urgency.

A dismissal or exception requires a durable evidence-backed record and Product Owner approval; a GitHub default dismissal reason alone is insufficient. GitHub-native notifications are sufficient for this initial control. No email, Slack, webhook, or other external notification integration is authorized.

Read-only verification is authorized, using repository-admin-capable access where available, for the dependency graph, Dependabot alerts, Dependabot security updates, and the relevant entitlement/access state. After the required compatibility/egress spike and a separately accepted implementation/configuration scope, repository-admin enablement is authorized only for the dependency graph, Dependabot alerts, and Dependabot security updates.

Until that authorized verification establishes the effective state, entitlement and settings are **NOT VERIFIED**. Unavailable or ambiguous verification cannot be presented as enabled, observable, or operational.

This policy excludes Dependabot version-update schedules, private registries, secrets, automatic merging, reviewer/label/routing configuration, GitHub Advanced Security purchase or billing changes, unrelated repository administration, and the optional GitHub dependency-review feature. Dependency review may be considered later only through a separate Build-vs-Buy and entitlement/action-pinning decision.

## Excluded broader scanning and separate protection assessment

Declared dependency metadata is sufficient for `ND-QA-003`. Do not add source-file license scanning, external SCA providers, hosted third-party scanners, package-content inspection tools, or additional SBOM/scanner dependencies solely to close this finding. If the native npm/Dependabot approach fails its required compatibility/egress spike or cannot reliably meet this declared-metadata policy, stop and conduct a separate bounded Build-vs-Buy task. Failure does not authorize a substitute provider or dependency.

The legacy branch-protection endpoint observation does not establish the effective protection state. After the currently eligible ND-QA-003 policy work permits progression, conduct a separate read-only assessment of `main` protection, rulesets, accessible legacy configuration, required checks, pull-request reviews, force-push/deletion restrictions, and connector/API permission limits. That assessment must not modify repository protection or rulesets. Any required change returns to the Product Owner as a separately consequential decision unless existing accepted authority determines it exactly.

## Required sequence and remaining closure evidence

After this exact policy receives consequential external exact-head PASS, explicit Product Owner acceptance of its reviewed tuple, and protected integration:

1. Run the accepted bounded compatibility/egress spike on a clean checkout at Node `24.21.0` and npm `11.19.0`.
2. If it passes, prepare a separate implementation/configuration candidate. Do not bundle policy selection, hosted configuration, workflow changes, action pinning, dependencies, or unrelated security work.
3. Perform the authorized GitHub settings enablement only within that later separately accepted configuration scope.
4. Collect the accepted control design, enabled/configured automation, successful-run evidence, and required GitHub security-configuration evidence before reconciling `ND-QA-003`.

The spike remains read-only and must prove or fail closed on the complete-graph audit boundary, exact egress/credential boundary, no-mutation behavior, network-isolated audit failure behavior, SBOM coverage/determinism/network behavior, missing/unknown declaration behavior, Windows ARM64 and Linux x64 compatibility, CI cost, and sanitized evidence handling. A failed or ambiguous spike returns to Build-vs-Buy; it does not authorize a substitute.

When a later accepted implementation/configuration candidate enables the control, it must run on pull requests, pushes to the default branch, and at least weekly against the default branch. This inherited operating cadence does not authorize a workflow or schedule in this candidate.

## Review and integration boundary

This is a consequential security, trust, permission, egress, and dependency-policy candidate. It requires consequential external exact-head review. External PASS is technical approval only; explicit Product Owner acceptance of the exact reviewed tuple and protected integration are also required. No status-only post-review mutation is needed to convert this candidate into accepted implementation authority.
