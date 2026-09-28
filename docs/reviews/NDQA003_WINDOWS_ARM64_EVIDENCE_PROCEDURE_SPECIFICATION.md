# ND-QA-003 Windows ARM64 local evidence-procedure specification

## Status and lifecycle

**CANDIDATE.** This exact procedure becomes accepted implementation authority only after consequential external exact-head review PASS, explicit Product Owner acceptance of the reviewed tuple, and protected integration. Before all three conditions are satisfied, it does not authorize a firewall change, npm audit, npm SBOM, registry egress, Linux workflow dispatch, a compatibility result, or finding closure. External PASS is technical approval only. No status-only post-review mutation is required for the procedure to become binding at protected integration.

This candidate defines only the missing Windows ARM64 member of the accepted two-platform ND-QA-003 compatibility/egress spike. It does not revise the accepted control design, policy values, Linux GitHub Actions harness, full-graph scope, registry destination, vulnerability threshold, declared-license policy, exception authority, custody rules, or finding status.

ND-QA-003 remains **MUST FIX BEFORE NEXT MILESTONE / OPEN**. The Engineering Health Baseline remains **REVISE**. The complete spike remains blocked until this procedure is accepted, protected-integrated, and both platform members are eligible.

## Objective and non-goals

The later procedure must establish auditable local Windows ARM64 compatibility/egress evidence against one immutable Nightdrive checkout and retain one sanitized receipt outside that checkout.

This is documentation only. It does not implement a script, create a workflow, inspect or modify the live firewall, install a runtime, invoke an npm command, contact a registry, create an artifact, or execute any part of the spike.

The Product Owner-provided isolated Windows runtime receipt is only provenance for the official installed Node distribution. It is not compatibility/egress evidence and cannot substitute for this procedure.

This candidate does not alter the Linux harness, enable a permanent control, configure GitHub, add a dependency/provider/action, modify a manifest/lockfile, change branch protection, close ND-QA-003, resolve another Health finding, resume Stage 8, or begin ordinary roadmap work.

## Governing authority

- AGENTS.md requires exact-head review, a single bounded task, fail-closed evidence, and preserved security/review/CI boundaries.
- The accepted ND-QA-003 control specification requires a clean pinned Node 24.21.0 / npm 11.19.0 spike, complete lockfile graph, enforced network-isolation behavior, Windows ARM64 plus Linux x64 evidence, sanitized retention, and Build-vs-Buy return on ambiguous evidence.
- The accepted policy fixes the full-graph scope, credential-free boundary, registry https://registry.npmjs.org/, audit command and high threshold, lockfile-only SBOM command, output custody, and no-mutation requirements.
- The accepted Linux harness establishes analogous receipt/custody principles but is Linux/x64-specific. Its network namespace is not Windows authority and must not be modified or used as a fallback.
- The Product Owner designated the local laptop/runtime as the Windows ARM64 member only, then authorized this consequential specification to resolve the missing Windows evidence method.
- Microsoft documents that New-NetFirewallRule creates local firewall policy, that its default policy store is PersistentStore, and that ActiveStore is resultant effective policy. ActiveStore must be queried for enforcement; it is not a rule-creation target. See [New-NetFirewallRule](https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule?view=windowsserver2019-ps), [Get-NetFirewallApplicationFilter](https://learn.microsoft.com/powershell/module/netsecurity/get-netfirewallapplicationfilter), and [Windows Firewall rules](https://learn.microsoft.com/windows/security/operating-system-security/network-security/windows-firewall/rules).

A conflict, unavailable prerequisite, or uncertain observation is a non-success. The later procedure must not select a proxy, fake registry, DNS/hosts modification, container, emulation layer, third-party firewall, hosted provider, dependency, or other substitute.

## Future wrapper and invocation boundary

A later implementation must provide one tracked Windows-native wrapper/runner. It must launch the exact preflight-verified node.exe, npm.cmd, and npm CLI entrypoint by explicit argument vector, never by an ambient interactive shell, profile, alias, function, or inherited environment. Before a firewall lifecycle or npm child, it must privately prove the launcher/CLI identities and bind the actual child node executable to the verified node.exe; a mismatch fails before egress.

Before any Node/npm child starts, the wrapper must establish temporary paths, preflight facts, a one-time parent/child attestation, a closed child-environment allowlist, and any necessary task-owned firewall recovery. It must own firewall creation/removal in a try/finally boundary and reject direct child invocation, unknown arguments, a missing/mismatched attestation, a mismatched executable identity, or an ambiguous parent/child tuple.

The implementation may reuse the principles of the Stage 8 capture wrapper and custody boundary: explicit child launch, one-time attestation, full Git visibility, exclusive receipt creation, byte reread, and fatal cleanup failure. It must not import that capture tooling, use its output path, or inherit its scope.

## Required preflight

Before configuration probes, network control, audit, SBOM, or fixtures, the later procedure must prove every predicate below. Failure writes only a sanitized terminal receipt and prevents later phases.

| Concern | Required predicate | Retained evidence |
| --- | --- | --- |
| Operating system | Native Windows host. | OS-family boolean only. |
| Host and process architecture | Native ARM64 host; process platform is win32 and process architecture is arm64. x64 emulation, Linux, WSL, QEMU, Docker, or another translated runtime fails. | Normalized platform/architecture facts and pass boolean. |
| Toolchain | node --version is exactly v24.21.0. The native Windows npm path cmd.exe /d /s /c npm.cmd --version is exactly 11.19.0. | Version strings and fixed command-vector identities. |
| Runtime provenance | Resolved node.exe, npm.cmd, and the npm CLI entrypoint belong to the pre-provisioned isolated official runtime and match recorded identities. The launcher must be proven to start that node.exe and CLI entrypoint. | Match booleans and SHA-256 identities, never paths. |
| Source identity | Supplied commit, HEAD, and resolved tree agree; the commit object resolves locally. | Commit/tree IDs. |
| Repository integrity | Clean index and tracked worktree; no unmerged entries, inspection-suppressing index flags, sparse checkout, untracked or ignored path, or node_modules. | Predicate booleans only. |
| Immutable inputs | Tracked package.json, package-lock.json, and .npmrc exist; package-lock and project-config hashes are captured. | SHA-256 identities. |
| Task boundary | Unique initially absent temporary directories exist outside the checkout for controlled home, configs, cache, logs, raw output, fixtures, and receipt. A separate stable private recovery root exists outside both checkout and disposable scratch. | Role/uniqueness/outside-checkout predicates only. |
| Timing | UTC start and fixed command identities are recorded. | UTC and labels only. |

Repository integrity must use complete Git visibility. In particular, git ls-files --others -z must report no path. The implementation must not use --exclude-standard, an ignore exception, an allowlist, repair, cleanup, stash, reset, clean, install, or another mutation to conceal state. A failed integrity check is not repairable inside the procedure.

No raw host inventory, user/machine identity, command line, environment value, checkout/runtime/temp path, firewall listing, recovery-marker value, or firewall command output may enter the receipt.

## Sterile Windows npm configuration and read-only probes

Every npm-related child must run in the exact checkout with its tracked .npmrc and only explicitly controlled empty user/global config files. It must use new task-local home, cache, log, TEMP, and TMP locations outside the checkout.

The wrapper must construct every child environment from zero using one versioned, documented allowlist. The allowlist may contain only SystemRoot, ComSpec, PATHEXT, a constructed PATH limited to the isolated runtime and required Windows system directories, task-local HOME/USERPROFILE/APPDATA/LOCALAPPDATA/TEMP/TMP, and these exact controlled npm path selectors:

- NPM_CONFIG_USERCONFIG and NPM_CONFIG_GLOBALCONFIG point to the controlled empty files.
- NPM_CONFIG_CACHE and NPM_CONFIG_LOGS_DIR point to fresh task-local locations.
No other inherited key or NPM_CONFIG category is permitted. Only NPM_CONFIG_USERCONFIG, NPM_CONFIG_GLOBALCONFIG, NPM_CONFIG_CACHE, and NPM_CONFIG_LOGS_DIR may exist, case-insensitively. Policy-sensitive configuration must not be injected through NPM_CONFIG_* or extra CLI configuration flags. Other than the mandatory toolchain preflight cmd.exe /d /s /c npm.cmd --version, the only permitted npm argument vectors are the fixed read-only npm config get probes and the exact semantic commands enumerated below: npm audit --json --audit-level=high and npm sbom --package-lock-only --sbom-format=spdx. Those fixed command vectors do not replace the required configuration probes. No additional or substituted argv token may set or override registry, omit, production, offline, prefer-offline, package-lock, workspace/workspaces, include, proxy, TLS/auth, audit/audit-level, or another configuration value. Required policy predicates must derive only from the tracked .npmrc, controlled empty user/global configuration files, and verified npm built-in/default behavior; the read-only probes below must observe them. In particular, the child environment must exclude registry credentials, npm/GitHub tokens, proxy settings, NODE_ENV, generic npm configuration, shell-profile state, user/global npm configuration, ambient cache state, and unrelated environment values. An unknown key, value source, configuration source, required launch value, or observed policy value is a fail-closed preflight error. The receipt retains only the allowlist-version identity and predicate results, never values.

The wrapper may perform only this versioned read-only npm configuration-probe vector set, through the isolated npm.cmd and sterile child environment:

- npm config get userconfig
- npm config get globalconfig
- npm config get registry
- npm config get proxy
- npm config get https-proxy
- npm config get omit
- npm config get production
- npm config get offline
- npm config get prefer-offline
- npm config get package-lock
- npm config get workspace
- npm config get workspaces

The wrapper must privately parse each configuration source needed to establish that no credential-bearing directive, unapproved registry/scope/proxy directive, or other disallowed input is present. It may not print a configuration value. npm config set, delete, edit, fix, install, update, and every configuration mutation are prohibited. The receipt retains one fixed probe-set vector identity, probe success/exit-class summary, and only the predicates below:

For the `workspace` and `workspaces` probes, a raw probe token is stdout after removal of only its single terminal CRLF or LF; no trimming, coercion, case folding, JSON parsing, or other normalization is permitted. `workspaceSelectorAbsent` is true only when `npm config get workspace` yields the empty token. `workspacesUnsetDefault` is true only when `npm config get workspaces` yields the literal token `null`, the unconfigured npm default. `workspaceSelectionInactive` is true only when both preceding predicates are true and private source/argv inspection establishes that neither the tracked `.npmrc` nor the controlled empty configuration files supplies a `workspace` or `workspaces` directive and no non-probe command vector contains a workspace selector. The configuration probes themselves are observation keys, not workspace selectors.

Raw `null` and raw `false` are distinct and must never be equated. For the current tracked `.npmrc`, whose sole directive is `save-exact=true`, raw `false`, `true`, `[]`, an empty `workspaces` token, a name/list/object, multiline output, source mismatch, or any other representation fails closed. A different raw state can become valid only through separately accepted tracked repository configuration that identifies its exact source and raw meaning as non-scope-reducing; user/global/environment/CLI configuration cannot establish it. The receipt retains only the derived predicates, never raw values.

| Predicate | Required result |
| --- | --- |
| Project config | The tracked .npmrc hash equals its preflight identity. |
| Controlled config | User/global config files are empty and match the empty-file identity. |
| Registry | Effective registry is exactly https://registry.npmjs.org/. |
| Proxy | Effective proxy and HTTPS-proxy are absent. |
| Graph scope | Omit is empty; production is false; package-lock is enabled; `workspaceSelectionInactive` is true under the exact raw-probe mapping above; no scope-reducing configuration is active. |
| Network mode | Offline and prefer-offline are both false. |
| Command form | No command includes omit, production, no-package-lock, offline, prefer-offline, workspace selection, install, update, fix, remediation, or another scope reduction. |
| Credentials | The curated child environment and privately inspected config sources have no credential-bearing input category. |

An unavailable probe, unknown configuration source, nonempty proxy/credential category, nonstandard registry, scope reduction, parse failure, or ambiguity fails closed. No configuration text, environment value, credential-store content, header, proxy endpoint, or path is retained or printed.

## Fixed commands and per-invocation receipt

The later procedure may use only these npm semantic commands:

    npm audit --json --audit-level=high
    npm sbom --package-lock-only --sbom-format=spdx

The Windows invocation must use the exact isolated npm.cmd shim through fixed argument vectors. It may not use a shell string, global npm update, install, cache restore, audit fix, dependency update, lockfile mutation, or fallback command.

For every planned phase, the receipt must retain exactly one phase record. A phase that cannot start because an earlier predicate fails uses the canonical NOT_RUN_PRECONDITION_FAILED class and its planned semantic command-form identity; it starts no child and retains no raw output. For every invocation that starts, the wrapper must create a canonical safe command-vector identity from the fixed command label, executable/launcher/CLI identities, and argv tokens, then retain that identity plus an exit/result class separately for negative audit, positive audit, SBOM run 1, SBOM run 2, and each declaration fixture. A missing, duplicate, or unclassified phase record fails closed. It must not retain an absolute executable path, raw command line, raw stdout, raw stderr, or fixture path.

## Windows-native isolated-network negative control

### Proposed mechanism and claim limit

The proposed future mechanism is one temporary, uniquely named Windows Firewall outbound Block rule bound to the exact preflight-verified isolated node.exe program path. It uses only a Windows inbox facility and adds no package, service, third-party firewall, proxy, container, emulator, provider, or permanent control.

The rule is proposed as a local PersistentStore rule with a separately verified ActiveStore representation. It must be outbound, enabled, Block action, all profiles, and exact node.exe program scope. It must not contain an exception/override, service/package substitution, remote/local address, port, interface, protocol, user, authentication, or other condition that could let the audit child evade a full outbound block.

A firewall program rule is executable-path scope, not PID scope. The procedure may proceed only when the exact isolated runtime is task-owned and preflight proves no unrelated live process uses that node.exe. If exclusive runtime ownership/collision absence cannot be proved, the result is BLOCKED. The rule must not broaden to all processes or accept collateral impact.

This method proves an enforced negative control for the isolated Node/npm child. It does not claim a packet capture, FQDN allowlist, behavior of every system process, or wire-level proof of the later positive request. The accepted positive-path destination evidence remains sterile configuration plus exact effective registry.

### Mandatory crash-safe recovery boundary

A try/finally block alone is insufficient because the proposed rule is local persistent policy. Before every new firewall lifecycle, the wrapper must run a task-owned recovery preflight before any Node/npm child or rule creation.

Before recovery, the implementation must acquire an exclusive task lock in a stable private recovery root outside the checkout and disposable task scratch. The root may contain only one active marker. The root and each marker must use a restrictive ACL that permits only the intended local execution identity and required local system service identity. A marker is exclusive-created before its associated rule can be created, then written with Windows write-through/flush semantics, byte-reread, and self-integrity-verified before New-NetFirewallRule can run. Failure to establish this durable marker boundary is BLOCKED. It contains only the private facts needed to recover one rule: procedure version, opaque generated rule name, intended fixed rule attributes, isolated node.exe path and SHA-256 binding, and a self-integrity identity. It is never retained in the receipt, copied to an artifact, logged, or transmitted.

Recovery may query only the exact rule name recorded in an existing marker and its associated filters. It must not enumerate, export, modify, or remove an unrelated firewall rule. For a valid marker:

1. If the marker-named rule is present, its persistent/active representations and associated filters must exactly match the marker-defined task-owned attributes and marker-defined isolated node.exe binding before removal.
2. If it is absent, absence must be proven in both PersistentStore and ActiveStore before marker deletion.
3. If it is removable, removal must target only that exact name; absence must then be proven in both stores before marker deletion.
4. If a marker is malformed, inaccessible, has an unexpected binding, cannot be inspected, cannot be removed, or cannot be proven absent, the result is BLOCKED. No new rule, Node/npm child, or positive egress may proceed.

A marker is deleted only after exact rule absence is proven in both stores. Normal completion uses the same removal/verification sequence in finally. An abnormal wrapper termination leaves the marker in place and yields no successful procedure result; mandatory recovery occurs before a later invocation can create a rule or start a child. If this recovery boundary cannot be implemented and objectively verified on the execution host, the method is BLOCKED rather than treated as a temporary or safely cleaned rule.

### Rule lifecycle predicates and enforcement

Before creating either task rule, the wrapper must prove:

1. Windows inbox commandlets needed to create, query, inspect associated application filters, and remove one specifically named rule are available.
2. The invocation holds an administrative token sufficient only for the task-owned local rule. It must not silently elevate, change a firewall profile, disable the firewall, modify group policy, or enumerate/export unrelated firewall rules.
3. Every Windows firewall profile is enabled before rule creation and remains so for the full task-rule lifecycle. The wrapper must prove this immediately before and after every Node/npm child and prove the generated rule effective for every active profile. A profile-state change, disabled profile, unavailable recheck, or policy ambiguity invalidates the phase and is BLOCKED. The wrapper must not alter a profile to make this true.
4. The generated opaque rule identity is absent from PersistentStore and ActiveStore before marker creation. A collision, inaccessible store, disabled active profile, inactive effective policy, or policy ambiguity fails closed.
5. Exact executable identity, argument vector, fresh cache, sterile online configuration, and recovery preflight are already established. No Node/npm child starts first.

For each lifecycle the wrapper must first prove persistentRuleAbsentBefore and activeRuleAbsentBefore, atomically create its marker, then create the exact task rule with native semantics equivalent to:

    New-NetFirewallRule
      -Name <opaque-task-rule-id>
      -DisplayName <opaque-task-rule-label>
      -PolicyStore PersistentStore
      -Direction Outbound
      -Action Block
      -Enabled True
      -Profile Any
      -Program <resolved-isolated-node-exe>

It must query the generated rule by exact name in PersistentStore and ActiveStore. It must query the associated application filter and any other associated filter needed to establish the fixed scope; unexpected scope/filter conditions fail closed. Before accepting isolation, it must prove:

- exactly one task rule exists under the generated identity;
- persistent and active representations are present;
- the active rule is enabled, outbound, and Block;
- all Windows firewall profiles are enabled, the profile-state recheck passes, and the rule applies effectively to each active profile;
- the application filter exactly matches the preflight node.exe;
- scope contains no exception, override, service/package substitution, address, port, interface, protocol, user, or authentication condition;
- runtime-collision predicate remains true; and
- raw firewall output reached no log, receipt, or artifact.

The receipt must retain only ruleLifecycleClass, persistentRuleAbsentBefore, activeRuleAbsentBefore, firewallRuleCreated, firewallRuleActive, allProfilesEnabledDuringLifecycle, profileStateRecheckPassed, ruleEffectiveForActiveProfiles, firewallProgramIdentityMatched, firewallScopeVerified, runtimeCollisionAbsent, persistentRuleAbsentAfter, activeRuleAbsentAfter, recoveryChecked, recoveryCompletedWhenNeeded, and a SHA-256 identity of the opaque rule. It must not retain a rule name, marker value, program path, filter text, policy/profile/network value, or command output.

### Required phase sequence

1. **Rule A: negative audit.** Create one fresh marker/rule lifecycle only for the fixed negative audit. With Rule A verified active, run the fixed audit once with normal-online sterile configuration and a demonstrably fresh empty cache. It must not set offline mode, alter DNS/hosts, use a fake registry/proxy/VPN, or use WSL/Docker/QEMU.

   The negative control passes only if active-rule/filter/enforcement/profile-state predicates hold; cache is fresh; registry/proxy/omit/production/offline/prefer-offline/package-lock/workspace/credential predicates still hold; the audit returns a non-success classified network-unavailability outcome; it produces no complete report, zero-vulnerability report, cache result, partial report, malformed success, or unclassified result; and no repository mutation occurs.

   The later implementation must use a fixed, tested network-unavailability classifier. It may accept only explicit nonzero transport/name-resolution/connection-unavailable classification with no complete audit report. A generic failure, unknown text, successful zero result, cache/partial result, report ambiguity, or timeout without a classified transport result fails closed.

   In finally, remove Rule A by exact name, prove persistentRuleAbsentAfter and activeRuleAbsentAfter, repeat repository/immutable-input checks, then delete Rule A's marker. Any creation/query/child/classifier/removal/post-removal/marker-cleanup failure is terminal FAIL or BLOCKED. Rule B and positive egress remain prohibited until Rule A cleanup is verified.

2. **Rule B: lockfile-only SBOM and fixtures.** Only after verified Rule A removal, run a separate fresh, fully preflighted and verified Rule B marker/rule lifecycle. Rule B uses a distinct opaque identity, a fresh controlled cache/state, and the same PersistentStore/ActiveStore, active-profile, filter, collision, marker, and receipt predicates as Rule A.

   With Rule B verified active, run the fixed lockfile-only SBOM command twice using the exact checkout, no node_modules, sterile configuration, fresh controlled task state, and separate private raw-output files. Run each missing, NOASSERTION, and malformed declaration fixture under the same verified Rule B and sterile boundary, with a fresh disposable fixture copy and fresh controlled state per invocation.

   In finally, remove Rule B by exact name, prove persistentRuleAbsentAfter and activeRuleAbsentAfter, repeat repository/immutable-input checks, then delete Rule B's marker. A residual Rule B, marker-cleanup uncertainty, or cleanup failure blocks the positive audit and final success.

3. **Positive audit.** Only after Rule A and Rule B have each completed verified removal, recovery-marker deletion, repository integrity, and immutable-input checks may the positive audit run exactly once. It uses the fixed normal-online sterile command:

       npm audit --json --audit-level=high

   Its stdout/stderr stay private outside the checkout. A nonzero exit caused by a complete high/critical report is a classified result, not an execution error. An unavailable service, malformed/error response, incomplete graph, unexpected result shape, unclassified exit, raw-output custody failure, or mutation fails closed.

## Lockfile-only SBOM behavior

Rule B may run only this fixed command:

    npm sbom --package-lock-only --sbom-format=spdx

Each base invocation must establish or fail closed on valid SPDX JSON/schema; complete production/development/optional/peer/transitive resolved-graph coverage; root/relationship coverage; declared-license-field presence; missing/empty/malformed/NOASSERTION/unknown/unmappable/ambiguous declaration counts; raw lengths/hashes/equality; and Rule B network-isolation predicates.

Missing, NOASSERTION, and malformed declaration fixtures must be disposable copies of exact checked-out inputs outside the repository. Each fixture records its own fixed command-vector identity and exit/result class and must yield an explicit non-pass declaration classification. The procedure must not invent a license or normalize absent metadata into acceptance.

Raw SBOM equality is a within-platform observation. Different raw bytes retain raw nondeterminism and NOT VERIFIED. A semantic comparison may describe documented volatile fields but cannot relabel normalized bytes as a raw deterministic PASS. The existing external/Product Owner decision boundary for semantic reproducibility remains unchanged.

## Receipt, cleanup, and no mutation

The versioned Windows receipt must be sanitized, exclusively created, byte-reread, self-hashed, and retained only outside the checkout after private raw/config/cache/log/fixture data is deleted.

It may retain terminal disposition; platform/toolchain; UTC/duration; commit/tree; lockfile/.npmrc hashes; configuration-probe-set identity and predicates; each fixed audit/SBOM/fixture command-vector identity plus exit/result class; firewall lifecycle predicates; audit severity counts and raw length/hash; SBOM coverage/declaration counts, raw identities/equality, determinism disposition; no-mutation/cleanup/retention predicates; and NOT AVAILABLE where an authorized fact cannot be observed.

It must never retain raw audit/SBOM JSON, dependency/package inventory, names/versions, license strings, tokens, headers, environment/configuration values, firewall text, marker data, machine/user identity, private paths, raw stdout/stderr, or an enclosing temporary directory. No automatic upload, Git commit, or third-party transfer is authorized for the local receipt.

After every material phase — recovery preflight, configuration probes, Rule A pre-state/creation/negative audit/removal, Rule B pre-state/creation/each SBOM/fixture/removal, positive audit, and final cleanup — repeat clean index/tracked-worktree/no-untracked/no-node_modules checks and lockfile/.npmrc identities. A changed tracked file, new ignored/untracked path, hash mismatch, missing input, or inspection failure fails closed. The procedure must not repair, delete, stash, reset, clean, update, install, or mutate repository state to continue.

All private scratch, raw, config, cache, log, and fixture data must be deleted after evidence extraction. Cleanup failure fails closed. The stable recovery root is not general scratch: it may retain an unresolved marker only for mandatory exact-rule recovery after abnormal termination. A terminal success requires every marker absent after verified PersistentStore and ActiveStore absence.

## Cross-platform combination boundary

A later complete spike may combine one accepted Windows receipt with one accepted manual Linux GitHub Actions receipt only after each independently meets its own custody and preconditions.

The following are the only already-established literal-equality predicates:

| Predicate | Combination rule |
| --- | --- |
| Source and immutable inputs | Same commit, resolved tree, package-lock SHA-256, and tracked .npmrc SHA-256. |
| Toolchain and commands | Node v24.21.0, npm 11.19.0, and the fixed audit/SBOM semantic command forms and argv tokens. Each platform independently verifies its platform-specific executable identity. |
| Configuration and graph scope | Exact registry; credential-free boundary; no proxy; empty omit; production false; package-lock enabled; no workspace/scope reduction; full lockfile graph. |

The common receipt schema must also compare these facts without inventing an acceptance/equivalence rule:

| Comparison | Required treatment |
| --- | --- |
| Audit completion, exit, and result classification | Expose equal, different, or notComparable. A different, missing, ambiguous, or time-incomparable class is NOT VERIFIED. |
| Comparable audit severity vector | Expose equal, different, or notComparable for each named severity. A difference or unestablished comparability is NOT VERIFIED; this specification does not declare it acceptable. |
| SBOM complete-graph coverage | Compare production/development/optional/peer/transitive, root, and relationship predicates/counts. A difference or missing fact is NOT VERIFIED. |
| Declaration categories | Compare missing/empty/malformed/NOASSERTION/unknown/unmappable/ambiguous counts. A difference or missing category is NOT VERIFIED. |
| Determinism disposition | Compare the within-platform raw-equality/determinism disposition. Cross-platform raw byte equality is retained but is not required by existing authority. |
| No-mutation, custody, and cleanup | Both receipts must independently prove no repository mutation/node_modules, private raw custody, required rule/namespace isolation, verified cleanup, and sanitized retention. Any false or unavailable predicate prevents a combined result. |

There is no tolerance, semantic equivalence, freshness allowance, or inferred exception in this specification. Every mismatch, missing comparison fact, unestablished comparability, unresolved equality requirement, or ambiguous timing/classification is NOT VERIFIED for cross-platform agreement and blocks a complete platform-compatible PASS until Product Owner/external evidence authority resolves it.

Neither platform receipt, a successful spike, nor their combination closes ND-QA-003, enables a permanent control, configures GitHub, or authorizes Stage 8.

## Failure routing and review

| Condition | Required result |
| --- | --- |
| Missing platform/toolchain/source/integrity/configuration predicate | FAIL or BLOCKED; no npm command. |
| Recovery-marker, firewall capability, privilege, active-profile enforcement, active-rule proof, exclusive runtime ownership, or cleanup unavailable | BLOCKED; no substitute network mechanism. |
| Negative audit zero/cache/partial/malformed/unclassified result | FAIL; no Rule B or positive audit. |
| Rule B/SBOM/fixture/coverage/declaration ambiguity | FAIL or NOT VERIFIED; never invent a declaration or normalization pass. |
| Positive audit unavailable/malformed/incomplete/unexpectedly configured | FAIL; sanitize evidence only. |
| Raw SBOM nondeterminism | NOT VERIFIED; semantic result remains descriptive. |
| Cross-platform mismatch/unresolved comparison | NOT VERIFIED; no complete platform-compatible PASS. |
| Linux member unavailable/ambiguous | Return to accepted Build-vs-Buy; no substitute provider/cache/proxy/scanner/dependency/altered harness. |
| High/critical complete audit result | Preserve classified result; it is not a control PASS or policy exception. |

This candidate requires consequential external exact-head review. The review must verify no policy/harness/registry/graph/threshold/license/exception expansion; Windows-native reversible program-scoped firewall limits; strict sterile configuration and raw-data custody; crash-safe marker/recovery and persistent/active-store/active-profile proof; exact command/graph/fixture/determinism behavior; preserved platform distinction; and no firewall execution, registry egress, workflow/action/dependency/provider change, finding closure, Stage 8, or roadmap expansion.

After external PASS, explicit Product Owner acceptance, protected integration, and mechanical reconciliation, repository truth may make only a separately bounded Windows ARM64 wrapper IMPLEMENT candidate eligible under this procedure. That candidate requires its own exact-head review, CI, protected integration, and reconciliation. Only then may a separately bounded read-only two-platform spike be selected after clean-checkout/toolchain/firewall-recovery and Linux-harness eligibility preflight. This specification itself dispatches no Linux run and executes no Windows evidence.

## Candidate validation

Before external review:

1. confirm this candidate changes only this documentation record;
2. run repository documentation validation;
3. run git diff --check;
4. verify no npm audit/SBOM, registry egress, Linux workflow dispatch, firewall inspection/change, runtime installation, or runtime/configuration change occurred; and
5. report base/head/tree, full-index patch byte size/SHA-256, and clean worktree.

**Supersession:** The Product Owner withdrew the former mandatory Permanent Engineering Health cadence. This procedure creates no cadence. During normal RECONCILE and task selection, the [AI engineering workflow](../AI_ENGINEERING_WORKFLOW.md) requires risk-triggered, evidence-based consideration of existing Playbook reviews; that consideration does not alter this procedure's evidence requirements, lifecycle gates, or finding status.
