# ND-QA-003 GitHub Actions compatibility/egress spike harness specification

## Status and decision boundary

**CANDIDATE — not implementation authority.**

**Decision authority input:** Product Owner authorization received 2026-09-27 for a separately bounded GitHub Actions execution-harness task after reconciliation at `4f36094ad1aaeef187a2613da79fc80ad1379f38`.

This candidate specifies the minimum temporary harness needed to execute the already accepted ND-QA-003 compatibility/egress spike on an ordinary GitHub-hosted Linux x64 runner. It does not implement the harness, invoke `npm`, create a workflow run, select a permanent control, or change any accepted policy value.

Because this candidate specifies a security-sensitive CI, credential-boundary, network-isolation, evidence-retention, and external-egress mechanism, it requires consequential external exact-head review. It becomes accepted implementation authority only after consequential external review PASS, explicit Product Owner acceptance of the reviewed tuple, and protected integration. Before those conditions, it is not authority and no workflow or audit execution may proceed under it. No status-only post-review mutation is required to create that authority.

The accepted [ND-QA-003 supply-chain security policy](NDQA003_SUPPLY_CHAIN_SECURITY_POLICY_SPECIFICATION.md) remains binding. `ND-QA-003` remains **MUST FIX BEFORE NEXT MILESTONE / OPEN**. The Engineering Health Baseline remains **REVISE**. This candidate does not close `ND-QA-003`, enable GitHub security settings, add a permanent control, or authorize Stage 8 qualification or ordinary roadmap work.

## Governing authority

- [`AGENTS.md`](../../AGENTS.md) requires one bounded task, no silent dependency/action adoption, preserved review and CI gates, and external review for consequential security, trust, permission, egress, and dependency-policy authority.
- [`docs/SECURITY.md`](../SECURITY.md) requires automated vulnerability/license review, lockfile provenance, protected CI permissions, and limited CI-token access.
- The accepted [control specification](NDQA003_SUPPLY_CHAIN_SECURITY_CONTROL_SPECIFICATION.md) requires a read-only clean-checkout spike at exact Node `24.21.0` and npm `11.19.0`, full-graph audit/SBOM behavior, enforced network-isolation evidence, Windows ARM64/Linux x64 compatibility, CI runtime/cost, no mutation, and sanitized evidence.
- The accepted [policy specification](NDQA003_SUPPLY_CHAIN_SECURITY_POLICY_SPECIFICATION.md) fixes the audit registry to `https://registry.npmjs.org/`, requires a credential-free audit process, fixes the audit command and `high` threshold, rejects omitted/reduced graph scope and mutation, and prohibits raw audit/SBOM/configuration output retention.
- [`docs/TESTING_STRATEGY.md`](../TESTING_STRATEGY.md#pinned-runtime-and-ambient-matrix) establishes Nightdrive's existing Linux qualification member as GitHub Actions `linux/x64`, exact Node/npm, a clean checked-out commit, recorded runner facts, and fail-closed missing evidence.
- The Product Owner's 2026-09-27 GitHub Actions authorization permits only the minimum temporary repository/workflow change necessary to make this spike executable. It does not authorize a permanent control, a provider, a new action, a dependency, a runner upgrade, self-hosted infrastructure, a subscription, or an additional billing commitment.
- GitHub documents ordinary hosted Linux runners as x64 virtual machines with passwordless `sudo`; npm documents that `audit` submits its dependency description to the configured default registry, and that lockfile-only SBOM mode ignores `node_modules`. These platform facts support the bounded mechanism here but do not supersede Nightdrive's stricter evidence rules.

If any governing authority conflicts, the later implementation stops and reports the conflict rather than selecting a permissive interpretation.

## Narrow scope and non-goals

A later implementation candidate may add only the following temporary-harness surface, plus focused tests directly required to prove it:

1. one manual-only GitHub Actions workflow dedicated to this spike;
2. one evaluation/tooling runner that writes a single sanitized receipt outside the repository; and
3. focused tests or static checks for command construction, configuration isolation, receipt redaction, cleanup, and fail-closed paths.

It must not modify application/runtime source, `package.json`, `package-lock.json`, dependencies, permanent workflows, existing workflow behavior, GitHub security settings, branch protection, alert settings, vulnerability threshold, declared-license policy, exceptions, graph scope, registry destination, Product Owner authority, or accepted architecture.

The harness is not a permanent vulnerability/license control. It is not scheduled, does not run on push or pull request, does not make a pass/fail release decision, does not upload raw dependency data, and does not claim that GitHub-hosted runner infrastructure enforces a packet-level hostname allowlist.

No new GitHub Action may be introduced. A later implementation may reuse only the action mechanisms already present in [`.github/workflows/runtime.yml`](../../.github/workflows/runtime.yml), without changing their action references as part of this task. The separate `ND-QA-005` action-provenance finding remains OPEN and is not resolved, weakened, or expanded by this harness.

## Required GitHub-hosted execution shape

The future workflow must meet all of the following requirements.

| Concern | Required behavior |
| --- | --- |
| Trigger | `workflow_dispatch` only, with an explicit confirmation input. No `push`, `pull_request`, schedule, or reusable-workflow trigger. |
| Runner | Ordinary GitHub-hosted `ubuntu-latest`, never `ubuntu-slim`, larger, self-hosted, AWS, Codespaces, or another provider. |
| Permissions | `contents: read` only. No write token, security-events, packages, id-token, pull-request, or administration permission. |
| Checkout | Full-history checkout of the workflow-selected immutable commit; preflight requires `HEAD == GITHUB_SHA`, resolves the exact tree, and records only safe commit/tree identities. |
| Toolchain | Existing Node setup mechanism requests exactly `24.21.0`; preflight requires actual `node --version == v24.21.0` and `npm --version == 11.19.0`. No global npm upgrade is allowed. |
| Installation/cache | No `npm ci`, `npm install`, `npm update`, `npm audit fix`, dependency-package download, cache restore/save, or `node_modules` creation. The workflow must not use an npm cache option. |
| Output | All raw working data and the one sanitized receipt live below a newly created job-temporary directory outside the checkout. The workflow may upload only that one receipt, using the existing artifact mechanism, with `if: always()` so a fail-closed receipt remains inspectable. |
| Failure | The workflow exits nonzero for a failed preflight, incomplete/ambiguous evidence, unexpected network result, raw-data retention failure, or post-execution repository mutation. It never converts such a result to a warning-only pass. |

Existing GitHub Actions checkout, Node setup, and receipt-upload control-plane traffic are platform bootstrap/retention operations already present in the repository's CI. They are not an npm audit dependency-description transmission and must not be treated as authorization for another registry, scanner, dependency-package download, or provider.

The workflow must record, in the sanitized receipt only: GitHub run, job, and attempt identifiers; UTC timestamps; runner OS/image/version when observable; `process.platform`, `process.arch`, and host architecture; exact Node/npm versions; tested commit/tree; package-lock and tracked project `.npmrc` SHA-256 identities; exact command identities; exit classes; artifact retention classification; harness duration; and billing/minute metadata only when directly exposed. A missing billing value is `NOT AVAILABLE`, never inferred as zero cost.

## Clean checkout and toolchain preflight

Before any npm command, the future runner must prove all of these predicates. A failed predicate writes a sanitized `FAIL` receipt and runs no later phase.

1. `process.platform === "linux"`, `process.arch === "x64"`, and the observed host architecture is `x86_64`/`amd64` under the runner's standard identity commands.
2. Node is exactly `v24.21.0` and npm is exactly `11.19.0`.
3. The checkout's `HEAD`, supplied GitHub commit identity, and resolved tree agree. The commit object must resolve locally.
4. The index is clean, the tracked working tree is clean, there are no unmerged entries or inspection-suppressing index flags, and `git ls-files --others -z` reports no untracked path, including ignored paths.
5. `node_modules` is absent before and after every phase.
6. `package.json`, `package-lock.json`, and the tracked project `.npmrc` exist, and the package-lock identity is recorded before and after every phase.
7. The temporary working directory is outside the checkout, unique to the job, and contains separate raw-output, cache, logs, controlled-home, and controlled-config directories.

The preflight must not create files in the repository. It must retain only pass/fail dispositions and allowed identities; it must not print raw Git/configuration output to the workflow log.

## Credential-free npm configuration boundary

Each npm invocation must run in a sterile child environment created with `env -i` or an equivalently inspectable allowlist. It may receive only paths and variables needed for the command, a newly created empty job-local npm configuration, a job-local `HOME`/`XDG_CONFIG_HOME`, a fresh job-local cache and logs directory, and the tracked project `.npmrc` discovered from the checkout. The child must not inherit user/global npm configuration, proxy variables, `NODE_ENV`, credential variables, registry tokens, GitHub tokens, generic environment-variable values, or machine-specific npm settings.

The implementation must not dump `npm config`, environment variables, configuration files, or credential checks to logs or artifacts. It may record only the following sanitized facts:

- the project config file's tracked SHA-256 matches the preflight identity;
- the job config is empty and its SHA-256 matches the empty-file identity;
- the effective registry equals exactly `https://registry.npmjs.org/`;
- effective proxy and HTTPS-proxy configuration are absent;
- effective `omit` scope is empty, production mode is false, and neither `offline` nor `prefer-offline` is true;
- the command has no workspace selector, scope-reducing option, `--no-package-lock`, `fix`, install, update, or remediation argument; and
- the curated child environment contains no credential-bearing input category.

Any other registry, nonempty proxy, omitted/reduced graph, unknown configuration source, nonempty credential category, unavailable fact, or parse error fails closed. The configuration proof establishes the accepted npm configured-registry predicate; it does not claim packet-level hostname filtering by GitHub's provider network.

## Network-isolated negative control

The harness must use the ordinary runner's documented passwordless `sudo` only to create an isolated child Linux network namespace. It must not alter the parent runner's interfaces, routes, firewall, DNS configuration, proxy, or GitHub control-plane traffic. It must not install a network tool, manipulate `iptables`/`nft`, use Docker, create a proxy, configure a VNET, use a larger runner, or introduce another provider.

The later implementation must run the isolated child through a capability-gated command equivalent to:

```text
sudo -n unshare --net --fork --mount-proc <isolated-command>
```

The capability is not assumed. The child may bring its loopback interface up solely to inspect its own namespace, but may create no veth or other interface. Before accepting its result, the child must prove in the receipt that it has a distinct network-namespace identity, only that loopback interface, and no IPv4 or IPv6 default route. If `sudo -n`, `unshare`, `ip`, the namespace proof, or the required fresh temporary npm state is unavailable, the result is `FAIL`/`BLOCKED` for this harness; it must not fall back to a cache, a simulated block, an `--offline` npm setting, a Docker container, a firewall rule, or a warning-only result.

Within that objectively isolated child, the exact non-fixing audit command must execute with the same sterile configuration and a fresh empty cache:

```text
npm audit --json --audit-level=high
```

The negative control must leave npm's effective `offline` setting false. npm offline mode is not an acceptable substitute because it can create a zero-vulnerability result without contacting the advisory service. The isolated audit must therefore yield a classified non-success/error outcome and no complete accepted audit result. A zero exit, zero-vulnerability report, cache-derived report, partial report, malformed report treated as success, or another ambiguous outcome fails closed.

The lockfile-only SBOM commands described below also run in this namespace. They may succeed only if their receipt proves the namespace and no-route predicates; this demonstrates their observed no-network behavior rather than granting a cache/network fallback.

This network namespace mechanism establishes an enforced offline negative control. It does not claim that ordinary GitHub-hosted Actions provides an independent wire-level/FQDN allowlist for the later authorized audit request. If an external reviewer or Product Owner requires that stronger claim, this scope is BLOCKED; it must not add a proxy, VNET, firewall, or provider mechanism.

## Authorized audit positive path

Only after all preflight, sterile-configuration, and isolated-negative-control predicates pass may the job execute the accepted networked audit command exactly once:

```text
npm audit --json --audit-level=high
```

The harness must not append a graph-reducing option. Its preflight absence of `node_modules`, retained package-lock identity, no `--no-package-lock` configuration, and empty omit/production predicates establish the complete resolved lockfile graph boundary without changing the accepted command form.

The audit subprocess writes stdout/stderr only to private files below the job-temporary raw-output directory. It must never forward raw output to the workflow log, step summary, artifact, or receipt. The runner parses only the minimum structure needed to establish a complete result: report shape/version, full-graph binding, severity counts, exit class, raw byte length, and raw SHA-256. A complete report may have a nonzero exit because of a high/critical finding; that is a completed result, not an execution-error conversion. An unavailable service, malformed/error response, unexpected result shape, unclassified exit, incomplete graph, unexpected request behavior, or raw-output handling failure is a fail-closed audit result.

The receipt must record the fixed effective registry and the npm command identity. It must not claim visibility into raw wire packets or a provider-enforced hostname firewall. npm's documented registry behavior and the sterile configuration boundary are the sole destination evidence this task is authorized to establish.

## Lockfile-only SBOM probes

The harness must run npm's native lockfile-only SPDX mode twice under the enforced isolated-network child:

```text
npm sbom --package-lock-only --sbom-format=spdx
```

Each run uses the exact checked-out `package.json` and `package-lock.json`, no `node_modules`, the same sterile configuration, and separate temporary raw-output files. The runner must verify and retain only sanitized observations for:

- valid SPDX JSON/schema identity;
- root and complete resolved dependency-graph coverage derived from the exact lockfile, including production, development, optional, peer, and transitive entries;
- dependency relationships and declared-license field presence;
- missing, empty, malformed, `NOASSERTION`, unknown, unmappable, or ambiguous declaration counts; and
- raw output byte lengths, SHA-256 identities, and equality/non-equality.

The harness must also create external, disposable negative fixtures from copies of the tracked package/lock files, never from repository mutations. It must test a deterministically selected declared-license field made missing, `NOASSERTION`, and malformed. Each fixture runs in the same isolated namespace and must produce an explicit non-pass classification for the declared-license claim. If npm fails earlier, emits an unparseable result, or renders a value that cannot be classified, the harness reports that fact as fail closed. It must not invent a fallback license or treat metadata absence as accepted.

npm's SPDX output can contain creation time and document-namespace values generated per run. The harness must preserve each raw identity and report raw byte equality separately. It may compare parsed outputs with only those documented volatile fields omitted to describe an observed semantic difference, but it must not relabel normalized bytes as raw deterministic output and must not treat semantic equality as an accepted determinism PASS. Whether semantic reproducibility is sufficient when raw bytes differ remains an external/Product Owner evidence decision. Until then, the receipt must report that predicate as `NOT VERIFIED`, and the overall spike cannot claim a complete PASS on SBOM determinism.

## Receipt, raw-data custody, and cleanup

The sole retained job artifact is a sanitized JSON receipt with a versioned schema and a terminal `PASS`, `FAIL`, `BLOCKED`, or `NOT VERIFIED` disposition. It may retain the minimum safe identifiers and booleans required by the accepted policy; it may not retain raw audit JSON, raw SBOM JSON, package names, package versions, dependency inventory, license strings, tokens, headers, credentials, private configuration, environment-variable values, absolute local paths, or raw stderr/stdout.

The receipt must state whether raw temporary files were deleted, whether the artifact uploader received only the sanitized receipt path, and whether a cleanup failure occurred. Cleanup runs on every success/failure path. A cleanup failure, output-destination uncertainty, or evidence that raw data reached logs/artifacts fails closed. The workflow may upload the receipt after a failure but must never upload an enclosing temporary directory.

The receipt identifies GitHub run/job/attempt and observed runner image/version where available. It records harness duration and optional whole-job duration. It records billing/minute metadata only if GitHub exposes that fact directly to the workflow or an authorized read-only API; otherwise the value is exactly `NOT AVAILABLE`. The harness must not infer a free tier, zero billable time, account plan, quota, storage cost, or future cost from historic runs.

## Required postconditions and execution boundary

After every phase, the runner repeats the repository-integrity, no-untracked-state, absent-`node_modules`, package-lock identity, and tracked-project-config identity checks. Any mutation is a fail-closed result. The harness returns a sanitized receipt even for preflight failure and exits nonzero whenever a required predicate is not established.

A later protected integration of the harness does not itself execute the spike, accept a result, enable the permanent control, enable GitHub security features, close `ND-QA-003`, or authorize Stage 8. The actual manual Linux run remains read-only and must be evaluated together with separately obtained Windows ARM64 evidence. A failed or ambiguous result returns to the accepted Build-vs-Buy boundary; it does not permit a substitute provider, dependency, scanner, cache, proxy, or fallback.

## Review boundary

This candidate must receive consequential external exact-head review. The review must inspect the full candidate scope against the accepted control/policy, especially:

- no redefinition of the audit registry, threshold, graph, license, exception, or permanent-control authority;
- correct manual-only, least-privilege, no-cache/no-install workflow constraints;
- enforceable network-namespace negative control and explicit limits on its claim;
- credential/configuration isolation and absence of raw-output exposure;
- audit exit/error classification and no `--offline` false pass;
- SBOM full-graph, declaration-negative, and raw-versus-semantic reproducibility handling; and
- no action/dependency/provider/firewall/proxy/VNET/self-hosted/paid-infrastructure expansion.

External PASS is technical approval only. Explicit Product Owner acceptance of the exact reviewed tuple and protected integration remain required before an implementation candidate may use this specification.
