# Nightdrive Engineering Health Baseline

## Assessment identity and limits

**Classification:** ASSESS - read-only
**Assessed integrated commit:** d46bbbfa7b05095d60461de5387d824913759547
**Assessed tree:** ef69c63987eff3b44c0fc8cc2de8efa6b3956894
**Assessed branch:** main, synchronized with origin/main at the assessed commit
**Assessor:** Codex, read-only local assessment
**Assessed worktree:** clean tracked state
**Result:** **REVISE**

This record preserves the comprehensive Engineering Health Baseline required
after Stage 8 candidate-capture custody tooling. The assessment inspected the
integrated repository as a whole and did not modify the assessed worktree,
create a correction, rebaseline evidence, change configuration, or perform a
real Stage 8 capture, evidence freeze, production/reference comparison, or
supported-platform qualification.

This is an assessment record, not implementation authority, acceptance,
closure evidence, a roadmap authorization, or a Stage 8 qualification result.
Corrections remain separately bounded work subject to their applicable review,
CI, and protected-integration gates.

## Authority and assessment evidence

The assessment followed [AGENTS.md](../../AGENTS.md), [Decisions](../DECISIONS.md),
[Scope](../SCOPE.md), [Testing strategy](../TESTING_STRATEGY.md), the
[Engineering Review Playbook](../ENGINEERING_REVIEW_PLAYBOOK.md), the
[AI engineering workflow](../AI_ENGINEERING_WORKFLOW.md), the
[roadmap](../ROADMAP.md), and the then-current project-state coordination
snapshot. The Stage 8 contract and evidence/custody documents were inspected
as domain-specific authority.

| Area | Evidence and result | Limit |
|---|---|---|
| Repository integrity | git fsck --no-reflogs --connectivity-only --no-dangling, clean tracked worktree, and git diff --check passed. | The preserved user worktree and deferred stash were inspected only for preservation; neither was used as assessment input. |
| Static and documentation validation | Fresh locked install, lint, strict TypeScript, build, documentation validation, and lockfile-only top-level dependency inspection passed. | The local host was Node 22.17.1 / npm 10.9.2, outside the accepted Stage 8 capture runtime. Local success is not supported-platform qualification. |
| Test evidence | The ordinary full run had only timeout failures on the unsupported local host. With extended Vitest hook/test timeouts it had 1,170 passing tests, 9 expected skips, and one remaining explicit 30-second test timeout after 57 seconds, with no assertion failure. | This is an environment/performance limitation, not proof of a supported-platform replay result. |
| Protected-main CI | Current-main Documentation and Runtime foundation validation passed in recorded GitHub-hosted CI: [Documentation run 36293854489](https://github.com/drkmtr1/nightdrive/actions/runs/36293854489) and [Runtime foundation run 36293854551](https://github.com/drkmtr1/nightdrive/actions/runs/36293854551). | CI evidence does not establish any unperformed Stage 8 qualification step. |
| Dependency and security spot checks | The one-off npm audit --omit=dev --audit-level=high run reported no high-or-higher finding for the non-dev production dependency graph. Tracked secret-path/pattern checks found no standard secret files. | It did not assess omitted dev dependencies, provide license-review evidence, replace a durable automated control, or assert absence of all security issues. |
| Formatting | The repository-wide formatter check reproduced the accepted MIA-003 CRLF/LF baseline. | MIA-003 remains deferred and non-blocking; it was not rebaselined or corrected. |

## Findings ledger

### ND-QA-001 - BLOCKER - RESOLVED

**Observed condition:** The durable repository record does not contain the
required individual origin tuple, affected scope, violation condition,
contract basis, and closure evidence for S8-QUAL-001, S8-QUAL-002, or
S8-QUAL-003. The tracked coordination snapshot records only that the three
IDs remain OPEN.

**Affected components:** PROJECT_STATE.md; Stage 8 review/result evidence
under docs/reviews/.

**Governing authority:** [AI engineering workflow review continuity
requirements](../AI_ENGINEERING_WORKFLOW.md#reviews) and [Engineering Review
Playbook finding continuity](../ENGINEERING_REVIEW_PLAYBOOK.md#contract-first-exact-head-review).

**Evidence:** A read-only scan of tracked content reachable from all local
heads, remotes, and tags found no individual durable ledger. Recovered GitHub
metadata for [PR #231](https://github.com/drkmtr1/nightdrive/pull/231)
corroborates that all three IDs remained OPEN at its integration, but contains
only group-level negative scope rather than an individual finding crosswalk.
The group record is described below; it is not an original finding ledger.

**Impact:** A later exact-head reviewer cannot carry, compare, or close the
three finding conditions without inventing missing terms. This blocks Stage 8
qualification progression.

**Smallest safe action:** Recover the authoritative original review/result
record and record each finding durably. If the evidence cannot be recovered,
retain every missing field as NOT VERIFIED and obtain the required
authoritative disposition; do not reconstruct a condition from generic Stage
8 requirements.

**Decision owner:** Evidence recovery is mechanical; an unavailable or
ambiguous origin/closure condition requires the external authority that owns
the missing record.

**Closure evidence required:** A durable per-ID record containing the
originating base/head (or an explicit authoritative replacement), affected
scope, condition, contract basis, and explicit closure criteria/evidence.

### ND-QA-002 - MUST FIX BEFORE NEXT MILESTONE - RESOLVED

**Observed condition:** Several live authority documents described an earlier
Stage 8 or Product Integration gate as current or eligible even though the
integrated Health Baseline now returns REVISE.

**Affected components:** PROJECT_STATE.md, docs/ROADMAP.md,
docs/ARCHITECTURE.md, docs/MOTIF_MODEL.md, docs/COMPOSITION_ENGINE.md,
docs/GENRE_PROFILE_MODEL.md, docs/ARPEGGIATOR_MODEL.md, and
docs/EVALUATION_PLAN.md.

**Governing authority:** AGENTS.md source-of-truth and coordination rules;
the current roadmap and project-state gate.

**Evidence:** The pre-correction live clauses included PROJECT_STATE.md
lines 5, 19, 23, and 35; docs/ROADMAP.md lines 409, 417, 425, and 429;
docs/ARCHITECTURE.md lines 5, 43, and 55; docs/MOTIF_MODEL.md line 5;
docs/COMPOSITION_ENGINE.md line 372; docs/GENRE_PROFILE_MODEL.md line 106;
docs/ARPEGGIATOR_MODEL.md lines 989 and 1006; and docs/EVALUATION_PLAN.md
line 57.

**Impact:** Conflicting present-tense status can falsely imply eligibility for
work that the current assessment gate prohibits.

**Smallest safe action:** Mechanically reconcile only live status clauses to
defer to the current project state, roadmap, and this assessment. Preserve
historical review evidence and accepted behavioral contracts.

**Decision owner:** Mechanically determined; no product or architecture
decision is needed while the correction changes no historical claim or
contract.

**Closure evidence required:** Exact-head review and protected integration of
the bounded documentation reconciliation that removes the stale live claims.

### ND-QA-003 - MUST FIX BEFORE NEXT MILESTONE - OPEN

**Observed condition:** The security contract requires automated
vulnerability/license review and vulnerability alerts, but neither current CI
workflow runs a vulnerability or license control. GitHub reported Dependabot
alerts and Dependabot security updates disabled at assessment time.

**Affected components:** docs/SECURITY.md, .github/workflows/documentation.yml,
.github/workflows/runtime.yml, and repository security configuration.

**Governing authority:** [Security design](../SECURITY.md#controls) and
[Security design abuse controls](../SECURITY.md#abuse-cases).

**Evidence:** docs/SECURITY.md lines 17 and 32 require the control. The current
workflows contain no audit/license step. GitHub reported Dependabot alerts
disabled and automatic security updates disabled. The current lockfile's npm
audit --omit=dev --audit-level=high run reported no high-or-higher finding for the non-dev production dependency graph; it did not assess omitted dev dependencies or provide license-review evidence.

**Impact:** The required recurring control and alert channel are absent even
though no active vulnerability, license violation, or remediation is asserted
by this assessment.

**Smallest safe action:** Run a separately bounded supply-chain control
SPECIFY/Build-vs-Buy task, then implement the accepted control and obtain
closure evidence. That task must determine the license-review mechanism and
may require repository-administrator access to enable GitHub alerts.

**Decision owner:** The security goal is accepted; the control mechanism and
any required hosted-service configuration need the applicable technical/access
authority.

**Closure evidence required:** Accepted control design, enabled/configured
automation, evidence of a successful run, and any required GitHub security
configuration evidence.

### ND-QA-004 - SHOULD FIX SOON - OPEN

**Observed condition:** src/music-domain/motif-result.ts imports and invokes
generator-layer resolution/projection boundaries, while the architecture says
that immutable Motif values and invariants belong in music-domain and policy
resolution/projection belongs in generators.

**Affected components:** src/music-domain/motif-result.ts;
docs/ARCHITECTURE.md.

**Governing authority:** [Architecture module ownership](../ARCHITECTURE.md#modules)
and the Stage 8 ownership statement in docs/ARCHITECTURE.md.

**Evidence:** The result module imports generator-layer helpers and uses them
while validating/reconstructing Motif results. No runtime behavior defect or
circular-oracle failure was demonstrated by the assessment.

**Impact:** The current dependency direction can erode the stated module
ownership boundary and complicate independent-reference reasoning.

**Smallest safe action:** Obtain an architecture disposition that chooses a
lower shared primitive or moves the verifier boundary upward, then implement
only that accepted choice.

**Decision owner:** Architecture authority; this is not a mechanical move.

**Closure evidence required:** Accepted architecture/contract disposition,
bounded implementation evidence, and dependency-boundary review.

### ND-QA-005 - SHOULD FIX SOON - OPEN

**Observed condition:** CI uses mutable GitHub Action major tags instead of
immutable reviewed commit SHAs.

**Affected components:** .github/workflows/documentation.yml and
.github/workflows/runtime.yml.

**Governing authority:** [Security design](../SECURITY.md#controls) supply-chain
control intent.

**Evidence:** The workflows use actions/checkout@v4; the runtime workflow also
uses actions/setup-node@v4 and actions/upload-artifact@v4.

**Impact:** An upstream tag movement could change CI action code without an
in-repository reviewed SHA change.

**Smallest safe action:** Verify action provenance and pin the reviewed
actions to immutable commit SHAs in a separately bounded CI hardening task.

**Decision owner:** Mechanically actionable after provenance verification; it
does not require a product decision.

**Closure evidence required:** Reviewed immutable pins and passing protected
CI on the resulting exact head.

## Prior Stage 8 qualification-finding continuity

| Finding | Status | Origin tuple | Affected scope | Condition and contract basis | Closure evidence | Evidence limit |
|---|---|---|---|---|---|---|
| S8-QUAL-001 | OPEN | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | Tracked repository material contains the OPEN-ID statement and recovered group-level PR metadata only. |
| S8-QUAL-002 | OPEN | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | Tracked repository material contains the OPEN-ID statement and recovered group-level PR metadata only. |
| S8-QUAL-003 | OPEN | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | Tracked repository material contains the OPEN-ID statement and recovered group-level PR metadata only. |

No crosswalk from an S8-QUAL finding to an ND-QA finding is asserted.
This assessment does not infer, alter, supersede, resolve, or characterize any
of the three Stage 8 findings from generic qualification requirements.

### Recovered PR #231 integration evidence

The recovered group evidence is read-only GitHub PR metadata for [PR #231](https://github.com/drkmtr1/nightdrive/pull/231)
records target base ff1c271f5bc39da0e9eee8d321347c18eae75289,
reviewed head 6929137ca3df973d22888fccf7e20663e9604c8f, tree
b69e1ae6e43643b56c03880f640bcf43452d3784, and merge
02c8d2c95447cb677bed0a81140418df1a404fdb. Local Git confirms that the
merge has the target base and reviewed head as parents, and that the merged
change contained only the two Stage 8 source-binding files. Its external review preserved all
three S8-QUAL IDs as OPEN and named group-level unestablished areas,
including semantic-reference correctness, golden Motif bytes, custody,
cross-platform qualification, and musical acceptance.

That metadata establishes integration/scope continuity only. It does not
establish an individual finding's origin, affected behavior, violation
condition, contract basis, closure criterion, qualification success, or
musical acceptance.

## Known limitations and non-findings

- MIA-003 remains ACCEPTABLE / DEFERRED cross-platform
  line-ending/formatting technical debt. The assessment neither rebaselined it
  nor treated it as a Stage 8 qualification result.
- The Stage 8 independent-reference dependency graph and its production-import
  rejection tests did not demonstrate a new circular-oracle defect. This is a
  NO ISSUE observation, not proof of semantic correctness.
- Real Stage 8 candidate capture, evidence freeze, production comparison,
  supported-platform replay, AC-012/AC-004/AC-013 closure, and structured
  musical acceptance remain unestablished and separately gated. They are
  NOT VERIFIED by this assessment.
- The local runtime was outside the accepted qualification environment. Its
  test timing evidence does not replace the pinned-runtime CI evidence or
  establish a new repository assertion failure.

## Executive Assessment

The integrated repository has no demonstrated current-main assertion
regression, but it is not ready to continue the currently authorized Stage 8
milestone. ND-QA-001 prevents finding continuity, ND-QA-002 requires a live
status correction, and ND-QA-003 requires a supply-chain control before the
next milestone.

## Validation Results

Repository integrity, strict TypeScript, lint, build, documentation validation,
and protected-main GitHub-hosted CI passed as recorded above. The local full
test timing limitation is not a supported-platform qualification result. The
one-off non-dev production audit result does not replace automated
vulnerability or license review.

## Findings

ND-QA-001 through ND-QA-005 and their evidence, impact, smallest safe action,
decision owner, and closure evidence are recorded in the findings ledger
above. No finding is closed by this assessment record.

## Technical Debt Inventory

MIA-003 remains ACCEPTABLE / DEFERRED. ND-QA-004 and ND-QA-005 remain SHOULD
FIX SOON. These classifications do not weaken the blocking and
must-fix-before-next-milestone findings.

## Recommended Corrective Actions

1. Recover authoritative individual records for S8-QUAL-001, S8-QUAL-002, and
   S8-QUAL-003 without inventing their missing terms.
2. Complete the bounded live-status reconciliation for ND-QA-002 through exact
   review and protected integration.
3. Specify and then implement the accepted automated supply-chain control for
   ND-QA-003.

## Safe-to-Defer Items

MIA-003, ND-QA-004, and ND-QA-005 retain their stated classifications. They
remain visible debt and do not receive closure from this assessment.

## Readiness for Next Milestone

Not ready. The current coordination state in PROJECT_STATE.md and the roadmap
record this REVISE outcome and permit only separately bounded corrective work.
No real Stage 8 capture, evidence freeze, production/reference comparison,
supported-platform qualification, implementation slice, or ordinary roadmap
progression is authorized.

## Suggested Next Milestone

No ordinary roadmap milestone is suggested. After this documentation
reconciliation is reviewed and integrated, the next bounded work is
authoritative recovery or disposition of the missing S8-QUAL finding records;
then address the supply-chain control under its own required gate.

## Final disposition

REVISE

## Post-assessment ND-QA-002 closure record

This addendum is a separately bounded, mechanical post-merge reconciliation. It
preserves the original ASSESS identity, observed condition, authority, impact,
closure requirement, and `REVISE` result above; the assessment itself did not
close a finding.

| Field | Evidence |
| --- | --- |
| Finding | `ND-QA-002` |
| Current status | `RESOLVED` |
| Reviewed correction | External exact-head PASS for base `d46bbbfa7b05095d60461de5387d824913759547`, head `0f1317fc2ccf9e00058e51201065bed7acb08ac7`, tree `30abd6d57ea914efac3c6aaa98a00a9cfa3355a7`, nine-document scope, 67,445-byte full-index patch, and SHA-256 `8dd7477a1365778ced63ace0de4bfc7ce6895aea2f956808c892573fa86da9b0`. |
| Protected integration | [PR #242](https://github.com/drkmtr1/nightdrive/pull/242) bound the reviewed base and head, then squash-integrated the reviewed tree as `282f378b3b9089c2a0eb306b5ce503f76f1db6e6`; post-merge verification found `origin/main` at that commit with no out-of-scope merged path. |
| Required CI | Documentation / validate passed in [run 36297305489](https://github.com/drkmtr1/nightdrive/actions/runs/36297305489); Runtime foundation / validate passed in [run 36297305454](https://github.com/drkmtr1/nightdrive/actions/runs/36297305454). |
| Closure scope | The integrated correction removes only the stale live eligibility/current-gate clauses identified above. It does not alter a behavioral contract, roadmap order, qualification evidence, or historical review result. |
| Continuing gate | The Health Baseline remains `REVISE`. `ND-QA-001` and `ND-QA-003` remain OPEN, the three `S8-QUAL-*` findings remain OPEN with original terms NOT VERIFIED, and Stage 8 qualification progression remains blocked. |

## Post-assessment S8-QUAL replacement-definition candidate

This addendum records the Product Owner's later bounded consequential SPECIFY
authorization after `ND-QA-001` historical evidence recovery completed with a
BLOCKED result. It preserves the original assessment finding, the continuity
table's `NOT VERIFIED` cells, and the Health Baseline result of `REVISE`.

| Field | Evidence |
| --- | --- |
| Finding | `ND-QA-001` |
| Current status | `BLOCKER - OPEN` |
| Historical-recovery outcome | Original individual finding provenance for `S8-QUAL-001`, `S8-QUAL-002`, and `S8-QUAL-003` is `NOT VERIFIED / unrecoverable`. No original terms are reconstructed. |
| Candidate record | [Stage 8 Motif qualification finding replacements](STAGE8_MOTIF_QUALIFICATION_FINDING_REPLACEMENTS.md) is a Product Owner-authorized forward-looking replacement-definition candidate dated 2026-09-26. |
| Binding lifecycle | Consequential external exact-head review PASS is technical approval only. The exact record becomes binding only after that PASS, explicit Product Owner acceptance of the reviewed tuple, and protected integration. Its binding commit is recorded during later post-integration reconciliation and is never asserted as a historical origin. |
| Continuing gate | Until the lifecycle completes, `ND-QA-001` remains OPEN, all three `S8-QUAL-*` findings remain OPEN, and no Stage 8 qualification work may rely on the candidate for continuity or closure. The Health Baseline remains `REVISE`. |

The candidate supersedes ambiguous use of the stable `S8-QUAL-*` labels only
from protected integration forward. Historical commits, pull requests, and
reviews that merely state “remain OPEN” remain historical evidence and are not
rewritten. The candidate does not close an `S8-QUAL-*` finding or accept real
Stage 8 capture, evidence freeze, production/reference comparison,
supported-platform qualification, AC closure, Stage 8 exit, or musical output.

Only after protected integration may a separate post-integration reconciliation
mark `ND-QA-001` RESOLVED, and only if the Health Baseline's durable per-ID
record closure criterion is verified. Until then, no ordinary roadmap or Stage
8 qualification progression is eligible.

## Post-assessment ND-QA-001 closure record

This addendum is a separately bounded, mechanical post-integration
reconciliation. It preserves the original ASSESS identity, observed condition,
authority, impact, and `REVISE` result above. The historical assessment text
is not rewritten; this record establishes the current finding status from
subsequent protected-integration evidence.

| Field | Evidence |
| --- | --- |
| Finding | `ND-QA-001` |
| Current status | `RESOLVED` |
| Historical-recovery boundary | Original individual provenance, scope, condition, contract basis, closure terms, and originating tuple for `S8-QUAL-001`, `S8-QUAL-002`, and `S8-QUAL-003` remain `NOT VERIFIED / unrecoverable`. No historical meaning is reconstructed. |
| Explicit authoritative replacement | The protected-integrated [Stage 8 Motif qualification finding replacements](STAGE8_MOTIF_QUALIFICATION_FINDING_REPLACEMENTS.md) record provides a durable per-ID forward-looking authority with affected scope, condition, contract basis, and explicit closure criteria/evidence. |
| Reviewed candidate | Consequential external exact-head PASS for base `e64ce881d0b4ad47934a43122af04a7a3ef9cbee`, head `92f9188f067140773dd763efd89d9aa3c52f8f9d`, tree `9c7c2937e606888466efc7183d8582816b457dae`, three-document scope, 18,594-byte full-index patch, and SHA-256 `76D22A56B0E280445F3A244064C35DF1B2A46F8174B1EAF3D259CA82116D7E70`. |
| Product Owner acceptance | The Product Owner explicitly accepted the exact reviewed tuple as forward-looking authority only, without asserting reconstruction of any unrecoverable historical meaning. |
| Protected integration | [PR #244](https://github.com/drkmtr1/nightdrive/pull/244) bound the reviewed base and head, then squash-integrated the reviewed tree as `5c230878a7500f29ac37d53634b77bd42cfafca5`. Post-merge verification found `origin/main` at that commit, the integrated tree equal to the reviewed tree, and no out-of-scope merged path. |
| Required CI | Documentation / validate passed in [run 36301387195](https://github.com/drkmtr1/nightdrive/actions/runs/36301387195); Runtime foundation / validate passed in [run 36301387265](https://github.com/drkmtr1/nightdrive/actions/runs/36301387265). |
| Closure verification | The durable replacement record satisfies the required per-ID replacement form: explicit authoritative replacement in place of an unavailable origin tuple, affected scope, condition, contract basis, and explicit closure criteria/evidence for each stable ID. |
| Closure scope | This closes only the Engineering Health finding `ND-QA-001`. It does not close or redefine `S8-QUAL-001`, `S8-QUAL-002`, or `S8-QUAL-003`; all remain OPEN under the protected-integrated forward-looking definitions. |
| Continuing gate | The Health Baseline remains `REVISE`. `ND-QA-003` remains OPEN and is the next MUST FIX priority. Real Stage 8 capture, evidence freeze, production/reference comparison, supported-platform qualification, implementation, and ordinary roadmap progression remain blocked. |

## Post-assessment ND-QA-003 mechanism-selection record

This addendum is a separately bounded, mechanical post-integration reconciliation. It preserves the original ASSESS identity, observed condition, affected components, authority, impact, closure requirement, and `REVISE` result above. It records only the completed mechanism-selection lifecycle; it does not enable a control or close the finding.

| Field | Evidence |
| --- | --- |
| Finding | `ND-QA-003` |
| Current status | `MUST FIX BEFORE NEXT MILESTONE - OPEN` |
| Accepted control-design component | The [ND-QA-003 supply-chain security-control specification](NDQA003_SUPPLY_CHAIN_SECURITY_CONTROL_SPECIFICATION.md) supplies the accepted bounded native-first mechanism-selection authority only: pinned npm audit for full-graph vulnerability evidence, pinned npm SBOM for declared-license inventory, and GitHub dependency graph / Dependabot alerts / security updates for hosted advisory/remediation workflow. It reserves all consequential policy values and implementation. |
| Reviewed candidate | Consequential external exact-head PASS for base `64b86b45bf1ec7152a265ac19de0ba6a7c81b137`, head `e356447fb1ae8bd0232d15b58b6f4eefd4db3716`, tree `887cd26ac008f6538b19848d3dc3b210bbc4bce0`, one-document scope, 22,292-byte full-index patch, and SHA-256 `9FA3023B54BFF46EC6328B2DD4D5B98410A4B73B5084C2A563FC40F3CE24D6CD`. |
| Product Owner acceptance | The Product Owner explicitly accepted the exact reviewed tuple as mechanism-selection authority only, expressly withholding registry egress, policy values, GitHub administration, implementation/configuration, and finding closure. |
| Protected integration | [PR #246](https://github.com/drkmtr1/nightdrive/pull/246) bound the reviewed tuple and then squash-integrated the reviewed tree as `b4523d9d16a4b67044f216cb7b57a85f06dab0dd`. Post-merge verification found the integration tree equal to the reviewed tree and no out-of-scope merged path. |
| Required CI | Documentation / validate passed in [run 36306594034](https://github.com/drkmtr1/nightdrive/actions/runs/36306594034); Runtime foundation / validate passed in [run 36306594016](https://github.com/drkmtr1/nightdrive/actions/runs/36306594016). |
| Closure-criterion disposition | **Accepted control design:** satisfied. **Enabled/configured automation:** not demonstrated. **Successful-run evidence:** not demonstrated. **Required GitHub security-configuration evidence:** not demonstrated. All four conditions remain required for closure. |
| Continuing gate | The Health Baseline remains `REVISE`. `ND-QA-003` remains OPEN; `ND-QA-004` and `ND-QA-005` remain OPEN; MIA-003 remains deferred. No networked npm audit, GitHub security setting, workflow/scanner implementation, compatibility/egress spike, Stage 8 qualification progression, or ordinary roadmap work is authorized. |
| Next eligible task | A separate consequential Product Owner policy specification for registry/data egress, vulnerability threshold/remediation and exceptions, declared-license rules and exceptions, alert ownership/response, and GitHub access/administrative decisions. |

## Post-assessment ND-QA-003 policy record

This addendum is a separately bounded, mechanical post-integration reconciliation. It preserves the original ASSESS identity, observed condition, affected components, authority, impact, closure requirement, and `REVISE` result above. It records only the completed policy lifecycle; it does not enable or configure a control, execute a control, change GitHub settings, or close the finding.

| Field | Evidence |
| --- | --- |
| Finding | `ND-QA-003` |
| Current status | `MUST FIX BEFORE NEXT MILESTONE - OPEN` |
| Accepted control-design and policy components | The protected-integrated [control specification](NDQA003_SUPPLY_CHAIN_SECURITY_CONTROL_SPECIFICATION.md) and [supply-chain security policy](NDQA003_SUPPLY_CHAIN_SECURITY_POLICY_SPECIFICATION.md) provide accepted bounded authority for the native-first mechanism and its reserved policy values. They do not themselves enable or configure automation. |
| Reviewed policy candidate | Consequential external exact-head PASS for base `25481e89ecae16d6df945552ed0efe67861e4217`, head `af220dba37ecf1a4a0461f9c8a8c47d2f027d268`, tree `1e42f46fbbff2cd2922ed111887aa09659c1ee14`, one-document scope, 16,249-byte full-index patch, and SHA-256 `0FA035425F5357BAE35BC082F8ABBAEFD98818774F16565DD2F8D6A2EE4AA211`. |
| Product Owner acceptance | The Product Owner explicitly accepted the exact reviewed policy tuple under the existing Nightdrive workflow, without authorizing candidate mutation, implementation/configuration work before repository eligibility, finding closure, Stage 8 progression, or unrelated roadmap work. |
| Protected integration | [PR #249](https://github.com/drkmtr1/nightdrive/pull/249) bound the reviewed tuple and then protected-squash-integrated the reviewed tree as `f265d8b397352ff4e81014c55c2af8bbfaa0d3c7`. Post-merge verification found the integration tree exactly equal to the reviewed tree and no out-of-scope merged path. The policy became binding at protected integration; this record does not create authority retroactively. |
| Required CI | Documentation / validate passed in [run 36342388746](https://github.com/drkmtr1/nightdrive/actions/runs/36342388746); Runtime foundation / validate passed in [run 36342388654](https://github.com/drkmtr1/nightdrive/actions/runs/36342388654). |
| Closure-criterion disposition | **Accepted control design:** satisfied. **Accepted policy:** satisfied. **Enabled/configured automation:** not demonstrated. **Successful-run evidence:** not demonstrated. **Required GitHub security-configuration evidence:** not demonstrated. The latter three remain required for closure. |
| Closure scope | This record does not invoke `npm audit` or SBOM, enable a workflow, configure a repository or GitHub setting, select a provider or dependency, close `ND-QA-003`, or authorize Stage 8 qualification progression. |
| Harness-specification integration | [PR #251](https://github.com/drkmtr1/nightdrive/pull/251) protected-squash-integrated the externally reviewed and Product Owner-accepted [GitHub Actions compatibility/egress spike harness specification](NDQA003_GITHUB_ACTIONS_SPIKE_HARNESS_SPECIFICATION.md) as `af0e07cf201cf514238abdfb68f2be338e3886dd`. The integration tree equals the reviewed tree `ee7a61d5510e4e545faa7c6e0ad50118554fe392`; required Documentation and Runtime foundation CI passed on the reviewed pull request and the protected integration commit. The specification became binding at protected integration; this reconciliation only records that completed lifecycle. |
| Next eligible task | A separately bounded IMPLEMENT candidate for the temporary manual-only GitHub Actions spike harness under the protected-integrated specification. It must receive its own exact-head review, CI, protected integration, and reconciliation before the actual read-only compatibility/egress spike becomes eligible; it does not itself dispatch or execute audit/SBOM, enable a permanent control, change GitHub security settings, branch protection, or policy, add a dependency/provider/new action, or close `ND-QA-003`. |
| Continuing gate | The Health Baseline remains `REVISE`. `ND-QA-003` remains OPEN; `ND-QA-004` and `ND-QA-005` remain OPEN; MIA-003 remains deferred; and all three `S8-QUAL-*` findings remain OPEN. No Stage 8 qualification progression or ordinary roadmap work is authorized. |

## Post-assessment ND-QA-003 temporary-harness implementation integration record

This addendum is a separately bounded, mechanical post-integration reconciliation. It preserves the original ASSESS identity, observed condition, affected components, authority, impact, closure requirement, and `REVISE` result above. It records only the completed temporary-harness implementation lifecycle; it does not dispatch or execute the compatibility/egress spike, invoke npm audit or SBOM, enable or configure a permanent control, change GitHub settings, or close the finding.

| Field | Evidence |
| --- | --- |
| Finding | `ND-QA-003` |
| Current status | `MUST FIX BEFORE NEXT MILESTONE - OPEN` |
| Reviewed implementation candidate | Renewed external exact-head PASS for base `ba5233b197856995a7424789c1fcfdeae2ba8699`, head `e0526a3567d5b6a8a44dea09dbed456ef768cf17`, tree `6294a10fe42c8457194db4933509ed3829e6f288`, the temporary workflow/standard-library harness/focused-test three-file scope, 105,686-byte full-index patch, and SHA-256 `f3d5207893628846da45bbd086a6f47b7aaf48eb42574c5d466a6140ed82d1da`. |
| Protected integration | [PR #253](https://github.com/drkmtr1/nightdrive/pull/253) protected-merged the reviewed head as `a11304e95b5904e05bc706b70eb92138294764ba`. The integration tree is exactly the reviewed tree, the reviewed head is target-branch ancestry, and no out-of-scope path entered through publication. |
| Required CI | Documentation / validate passed in [run 36368903621](https://github.com/drkmtr1/nightdrive/actions/runs/36368903621) and Runtime foundation / validate passed in [run 36368903708](https://github.com/drkmtr1/nightdrive/actions/runs/36368903708) on the reviewed pull request. Documentation passed again in [run 36369644701](https://github.com/drkmtr1/nightdrive/actions/runs/36369644701) and Runtime foundation passed again in [run 36369644696](https://github.com/drkmtr1/nightdrive/actions/runs/36369644696) on the merged target branch. |
| Closure-criterion disposition | **Accepted control design:** satisfied. **Accepted policy:** satisfied. **Temporary manual-only harness:** integrated. **Enabled/configured automation:** not demonstrated. **Successful-run evidence:** not demonstrated. **Required GitHub security-configuration evidence:** not demonstrated. The latter three remain required for closure. |
| Next eligible task | After this reconciliation is protected-integrated, a separately bounded, read-only actual compatibility/egress spike under the binding control specification, policy, and harness. It must use the accepted clean-checkout, exact Node/npm, Windows ARM64 and GitHub-hosted Linux x64, credential-free configuration, registry, network-isolation, custody, and fail-closed boundaries. Failed or ambiguous evidence returns to Build-vs-Buy without selecting a substitute mechanism. |
| Continuing gate | The Health Baseline remains `REVISE`. `ND-QA-003` remains OPEN; `ND-QA-004` and `ND-QA-005` remain OPEN; MIA-003 remains deferred; and all three `S8-QUAL-*` findings remain OPEN. No Stage 8 qualification progression or ordinary roadmap work is authorized. |

## Post-assessment ND-QA-003 Windows ARM64 evidence-procedure integration record

This addendum is a separately bounded, mechanical post-integration reconciliation. It preserves the original ASSESS identity, observed condition, affected components, authority, impact, closure requirement, and `REVISE` result above. It records only the completed Windows evidence-procedure lifecycle; it does not execute a firewall procedure, invoke npm audit or SBOM, permit registry egress, dispatch Linux execution, enable a permanent control, change GitHub settings, or close the finding.

| Field | Evidence |
| --- | --- |
| Finding | `ND-QA-003` |
| Current status | `MUST FIX BEFORE NEXT MILESTONE - OPEN` |
| Reviewed procedure candidate | Consequential external exact-head PASS for base `e7c84e17a01b296c81383ed735f3e1ac1c7422cd`, head `025c08b1239560c2f3e9980533f7fef0a3d67703`, tree `4e97cc32710f653adfb81631e448d86b03f86266`, one-document scope `docs/reviews/NDQA003_WINDOWS_ARM64_EVIDENCE_PROCEDURE_SPECIFICATION.md`, 35,594-byte full-index patch, and SHA-256 `306D0013763ABEB36936EF8089D7C3B3144231DF3014A72455A2CFF635EC9798`. |
| Product Owner acceptance | The Product Owner explicitly accepted the exact reviewed tuple as the Windows ARM64 evidence-procedure specification under the existing protected-integration lifecycle, without authorizing premature firewall/npm/registry/Linux execution, a permanent control, finding closure, Stage 8, or ordinary roadmap work. |
| Protected integration | [PR #255](https://github.com/drkmtr1/nightdrive/pull/255) protected-squash-integrated the reviewed procedure as `e4cd7f64bf67a9cde1597e6be06e1c93626c4a8d`. The integration parent is the reviewed base, the integration tree exactly equals the reviewed tree, and the base-to-integration scope contains only the reviewed procedure document. The server-side squash integration does not place the reviewed candidate commit in target-branch ancestry; exact tree and blob equality establish the reviewed-content correspondence. |
| Required CI | Documentation / validate passed in [run 36392620849](https://github.com/drkmtr1/nightdrive/actions/runs/36392620849) and Runtime foundation / validate passed in [run 36392620842](https://github.com/drkmtr1/nightdrive/actions/runs/36392620842) on the reviewed pull request. Documentation / validate passed again in [run 36393535770](https://github.com/drkmtr1/nightdrive/actions/runs/36393535770) and Runtime foundation / validate passed again in [run 36393535757](https://github.com/drkmtr1/nightdrive/actions/runs/36393535757) on the protected integration commit. |
| Binding lifecycle | The evidence procedure became binding implementation authority at protected integration. This record reports that completed lifecycle and does not create authority retroactively. |
| Closure-criterion disposition | **Accepted control design:** satisfied. **Accepted policy:** satisfied. **Temporary Linux harness:** integrated. **Windows evidence procedure:** integrated. **Windows wrapper:** not implemented. **Successful two-platform evidence:** not demonstrated. **Enabled/configured automation:** not demonstrated. **Required GitHub security-configuration evidence:** not demonstrated. `ND-QA-003` remains OPEN. |
| Next eligible task | After this reconciliation is protected-integrated, a separately bounded Windows ARM64 wrapper IMPLEMENT candidate under the binding procedure. It must complete its own validation, independent exact-head review, CI, protected integration, and reconciliation before the actual two-platform compatibility/egress spike can become eligible. |
| Continuing gate | The Health Baseline remains `REVISE`. `ND-QA-003` remains OPEN; `ND-QA-004` and `ND-QA-005` remain OPEN; MIA-003 remains deferred; and all three `S8-QUAL-*` findings remain OPEN. No Stage 8 qualification progression or ordinary roadmap work is authorized. |
## Post-assessment ND-QA-003 Windows ARM64 wrapper implementation integration record

This addendum is a separately bounded, mechanical post-integration reconciliation. It preserves the original ASSESS identity, observed condition, affected components, authority, impact, closure requirement, and `REVISE` result above. It records only the completed Windows wrapper lifecycle; it does not execute a firewall procedure, invoke npm audit or SBOM, permit registry egress, dispatch Linux execution, enable a permanent control, change GitHub settings, or close the finding.

| Field | Evidence |
| --- | --- |
| Finding | `ND-QA-003` |
| Current status | `MUST FIX BEFORE NEXT MILESTONE - OPEN` |
| Reviewed implementation candidate | External exact-head PASS for base `1c9a315a4ade6d6d82c87a1d1b7de8e54df52572`, head `c677ff6a3838b45b47948f161613251a6ecdf727`, tree `6399a7f494b99510ff3752d09ff2ecac4c6d8713`, the five-file Windows ARM64 wrapper scope, 239,707-byte full-index patch, and SHA-256 `e435ce0466e4a6a39fae1d77975793d826c6f9753d2342a04b8948caeee43bb3`. |
| Corrective-review disposition | Renewed external exact-head review PASS confirmed `NDQA003-WIN-IMPL-001` RESOLVED: every firewall-protected npm child has explicit immediate pre/post verification. This establishes the bounded wrapper correction only. |
| Protected integration | [PR #257](https://github.com/drkmtr1/nightdrive/pull/257) protected-squash-integrated the reviewed scope as `70ec88f9f1f8f20795eeea3444db8bf2d3eb116d`. The integration parent is the reviewed base, the integration tree exactly equals the reviewed tree, and the base-to-integration scope contains only the reviewed five files. The server-side squash integration does not place the reviewed candidate commit in target-branch ancestry; exact tree and blob equality establish the reviewed-content correspondence. |
| Required CI | Documentation / validate passed in [run 36451180707](https://github.com/drkmtr1/nightdrive/actions/runs/36451180707) and Runtime foundation / validate passed in [run 36451180753](https://github.com/drkmtr1/nightdrive/actions/runs/36451180753) on the reviewed pull request. Documentation / validate passed again in [run 36452440674](https://github.com/drkmtr1/nightdrive/actions/runs/36452440674) and Runtime foundation / validate passed again in [run 36452440718](https://github.com/drkmtr1/nightdrive/actions/runs/36452440718) on the protected integration commit. |
| Execution boundary | GitHub reports zero runs of the manual ND-QA-003 compatibility/egress spike workflow. Neither wrapper integration nor this reconciliation dispatched or executed the spike, changed a firewall rule, invoked npm audit or SBOM, permitted registry egress, enabled a permanent control, changed GitHub security settings, or added a dependency/provider/action. |
| Closure-criterion disposition | **Accepted control design:** satisfied. **Accepted policy:** satisfied. **Temporary Linux harness:** integrated. **Windows evidence procedure:** integrated. **Windows wrapper:** integrated; `NDQA003-WIN-IMPL-001` resolved. **Successful two-platform evidence:** not demonstrated. **Enabled/configured automation:** not demonstrated. **Required GitHub security-configuration evidence:** not demonstrated. `ND-QA-003` remains OPEN. |
| Next eligible task | A separately directed consequential governance SPECIFY candidate records the Product Owner's withdrawal of the mandatory Permanent Engineering Health cadence and replaces it with lightweight risk-triggered engineering-review consideration. It requires external exact-head review, explicit Product Owner acceptance, protected integration, and reconciliation. Only afterward, and only after a fresh preflight, can the actual read-only two-platform compatibility/egress spike be considered for eligibility under the binding control, policy, Linux harness, Windows procedure, and wrapper. |
| Continuing gate | The Health Baseline remains `REVISE`. `ND-QA-003` remains OPEN; `ND-QA-004` and `ND-QA-005` remain OPEN; MIA-003 remains deferred; and all three `S8-QUAL-*` findings remain OPEN. No Stage 8 qualification progression or ordinary roadmap work is authorized. |

## Post-assessment risk-triggered engineering-review consideration integration record

This addendum is a separately bounded, mechanical post-integration reconciliation. It preserves the original ASSESS identity, observed condition, affected components, authority, impact, closure requirement, and `REVISE` disposition. It records only the completed risk-triggered engineering-review consideration lifecycle; it does not reassess findings, create a recurring review/governance process, execute the ND-QA-003 spike, enable a permanent control, change GitHub security settings, or authorize Stage 8 qualification or ordinary roadmap work.

| Field | Evidence |
| --- | --- |
| Current health disposition | `REVISE`. `ND-QA-003` remains `MUST FIX BEFORE NEXT MILESTONE - OPEN`; `ND-QA-004` and `ND-QA-005` remain OPEN; MIA-003 remains deferred; and `S8-QUAL-001`, `S8-QUAL-002`, and `S8-QUAL-003` remain OPEN. |
| Reviewed governance candidate | Consequential external exact-head PASS for base `e1d0fbf7b5a10e9454e38bbc48197567fc08938c`, head `39ecdf0f92724bb771b47fc32332ce7b1154b3cc`, tree `98d1b64ac3e45feff411f081567a91ccdfaa4602`, four-file scope `PROJECT_STATE.md`, `docs/AI_ENGINEERING_WORKFLOW.md`, `docs/ENGINEERING_REVIEW_PLAYBOOK.md`, and `docs/reviews/NDQA003_WINDOWS_ARM64_EVIDENCE_PROCEDURE_SPECIFICATION.md`, 14,794-byte full-index patch, and SHA-256 `a163a0df3d59fc35d170c67d30085b99967d3e42be7a2a7136115bd7fd30fa36`. |
| Product Owner acceptance | The Product Owner explicitly accepted only the exact reviewed tuple, including its withdrawal of the former mandatory Permanent Engineering Health cadence and its lightweight risk-triggered consideration replacement. |
| Protected integration | [PR #259](https://github.com/drkmtr1/nightdrive/pull/259) protected-squash-integrated the reviewed scope as `ffc17663bfee1e7be6d93d3f5fe0b053f87e6e84`. Its sole parent is the reviewed base, its integration tree exactly equals the reviewed tree, and the base-to-integration scope contains only the reviewed four files. The server-side squash integration does not place the reviewed candidate commit in target-branch ancestry; exact tree and blob equality establish the reviewed-content correspondence. |
| Required CI | Documentation / validate passed in [run 36469510547](https://github.com/drkmtr1/nightdrive/actions/runs/36469510547) and Runtime foundation / validate passed in [run 36469510430](https://github.com/drkmtr1/nightdrive/actions/runs/36469510430) on the reviewed pull request. Documentation / validate passed again in [run 36470722516](https://github.com/drkmtr1/nightdrive/actions/runs/36470722516) and Runtime foundation / validate passed again in [run 36470722544](https://github.com/drkmtr1/nightdrive/actions/runs/36470722544) on the protected integration commit. |
| Binding policy effect | At protected integration, the replacement became binding: during normal RECONCILE and SELECT ONE TASK, consider only the smallest existing read-only Playbook review proportionate to demonstrated risk; do not trigger a review solely because time elapsed, milestone count, or a recurring schedule. It does not create a Permanent Engineering Health cadence, expand review authority, or override current review, CI, protected-integration, or Product Owner boundaries. |
| Next eligible task | The separately bounded consequential Engineering Review Proportionality Hardening documentation/governance SPECIFY candidate directed by the Product Owner. It remains separate from the actual ND-QA-003 compatibility/egress spike and must complete its own external exact-head review, explicit Product Owner acceptance, protected integration, and reconciliation before a fresh preflight can consider the spike. |


## Post-assessment Product Owner ND-QA-003 risk treatment and roadmap materiality

This addendum records the explicit Product Owner decision supplied on 2026-09-28, under the materiality and proportionality rules in the [Engineering Review Playbook](../ENGINEERING_REVIEW_PLAYBOOK.md). It preserves the original comprehensive assessment identity and REVISE result, the historical ND-QA-003 finding and accepted technical requirements, and all prior technical evidence. It supersedes earlier coordination statements in this report only where they say ND-QA-003 or the historical REVISE label bars ordinary already-in-scope application-roadmap work; it does not rewrite those earlier events or the original assessment. Its coordination effect becomes binding only after consequential external exact-head review PASS, explicit Product Owner acceptance of that reviewed tuple, protected integration, and mechanical reconciliation.

### ND-QA-003 residual-risk acceptance

| Field | Evidence |
| --- | --- |
| Historical finding | The original baseline identified the absence of recurring automated full-graph vulnerability/license review and vulnerability alerts. At assessment time it classified ND-QA-003 as MUST FIX BEFORE NEXT MILESTONE - OPEN. |
| Remediation work completed | The bounded native-first [control](NDQA003_SUPPLY_CHAIN_SECURITY_CONTROL_SPECIFICATION.md) and [policy](NDQA003_SUPPLY_CHAIN_SECURITY_POLICY_SPECIFICATION.md), temporary manual [GitHub Actions harness](NDQA003_GITHUB_ACTIONS_SPIKE_HARNESS_SPECIFICATION.md), and [Windows ARM64 evidence procedure](NDQA003_WINDOWS_ARM64_EVIDENCE_PROCEDURE_SPECIFICATION.md) and wrapper were specified, reviewed, and integrated under the existing lifecycle. They remain available if the finding is explicitly revisited. |
| Final experiment outcome | The accepted two-platform compatibility/egress spike was not completed. Two recorded Windows elevation attempts were canceled before the elevated tracked wrapper started. No valid Windows receipt was produced; no audit/SBOM phase, firewall-rule lifecycle, or registry request ran; the Linux workflow was not dispatched; and no cross-platform comparison exists. |
| Technical disposition | ND-QA-003 remains OPEN. It is not technically PASS, experimentally verified, or fully qualified. No vulnerability/license result, successful control operation, or compliance claim is established. |
| Product defect evidence | No Nightdrive product defect resulting from the incomplete spike has been demonstrated. This is not evidence that the unexecuted security controls passed or that the dependency graph has no vulnerability/license issue. |
| Current treatment | ACCEPTABLE / DEFERRED, by explicit Product Owner acceptance of the residual engineering-assurance risk. Further ND-QA-003 investigation, spike work, UAC troubleshooting, firewall experimentation, dependency-security qualification, and alternative-remedy research are not authorized now. |
| Roadmap effect | Following the completed lifecycle recorded below, the OPEN finding no longer blocks ordinary in-scope application-roadmap progression. This is a risk treatment, not closure, technical qualification, a waiver of the accepted security requirement, permission to claim control compliance, or authorization to release. |
| Revisit condition | Revisit only on explicit Product Owner request, or when new concrete evidence establishes materially greater product risk and repository governance requires reconsideration. Time passage, milestone count, or review cadence alone does not reopen it. |
| Health result | The original Engineering Health Baseline disposition remains REVISE; this addendum does not convert the assessment to PASS or reassess the entire repository. |

### Protected integration and binding-status reconciliation

| Lifecycle evidence | Record |
| --- | --- |
| Reviewed tuple | Base `2d6d00fcd35356dc4827b7de1f9e73538e22767a`; head `7b6c28cf68cacf7e2ba53162cdb1143fbf6ea84d`; tree `cab9da99b3c3d9c38d50cebf5c6a392db2c0cb34`; scope `PROJECT_STATE.md`, `docs/ROADMAP.md`, and `docs/reviews/NIGHTDRIVE_ENGINEERING_HEALTH_BASELINE.md`; full-index patch SHA-256 `4588eaf53b041bd7a798ce497c56b7adafc4a7719ac43a67b6692896b8faff36`. |
| External review and Product Owner acceptance | Consequential external exact-head review returned PASS, and the Product Owner explicitly accepted this exact tuple for protected integration. |
| Protected integration | PR #265 was squash-merged as `ee63751c881f68c29b481be1c088bbc935d27586`. Its sole parent is the reviewed base and its tree exactly equals the reviewed tree. The integrated scope contains only the three reviewed documents. |
| Required CI | Documentation and Runtime foundation passed on the reviewed PR (runs `36514034604` and `36514034605`) and again on the protected integration commit (runs `36514825073` and `36514825037`). |
| Binding effect | This reconciliation records the accepted residual-risk treatment as binding. ND-QA-003 remains technically OPEN / ACCEPTABLE / DEFERRED; no experiment, technical PASS, or security-control compliance is established. The original Engineering Health Baseline result remains REVISE. |

This reconciliation records the completed exact-tuple lifecycle only. It neither changes the accepted technical security requirement nor authorizes further ND-QA-003 work, Stage 8 qualification, a release, or a new product feature.

### Materiality of remaining OPEN findings

The binding [forward-looking Stage 8 finding definitions](STAGE8_MOTIF_QUALIFICATION_FINDING_REPLACEMENTS.md) govern the three S8-QUAL entries below; their individual historical origins remain unrecoverable.

#### ND-QA-004 — SHOULD FIX SOON / OPEN

- **Affected components and authority:** [src/music-domain/motif-result.ts](../../src/music-domain/motif-result.ts) and [docs/ARCHITECTURE.md](../ARCHITECTURE.md); the accepted module-ownership direction places immutable Motif values/invariants in music-domain and policy resolution/projection in generators.
- **Evidence and product impact:** The Motif result module imports generator-layer resolution/projection helpers. The baseline demonstrated no runtime defect or circular-oracle failure. The concrete impact is limited to Stage 8 Motif dependency direction and the clarity of independent-reference reasoning.
- **Materiality:** It does not materially block unrelated, already-in-scope application work. It remains SHOULD FIX SOON and may matter before work that relies on or changes the affected Stage 8 boundary; the S8-QUAL findings already keep Stage 8 qualification gated.
- **Smallest sufficient correction and complexity:** Obtain an architecture disposition between a lower shared primitive and a higher verifier boundary, then make only that bounded move and review its dependency direction. Complexity is moderate because it crosses an ownership boundary and is not mechanically determined.
- **Product Owner judgment:** No decision is required to keep unrelated application work moving. An architecture authority decision is required before choosing the correction; any change to accepted scope or ownership remains subject to its existing Product Owner/architecture gate.

#### ND-QA-005 — SHOULD FIX SOON / OPEN

- **Affected components and authority:** [.github/workflows/documentation.yml](../../.github/workflows/documentation.yml), [.github/workflows/runtime.yml](../../.github/workflows/runtime.yml), and the accepted security supply-chain control intent.
- **Evidence and product impact:** The workflows use mutable GitHub Action major tags (actions/checkout@v4, actions/setup-node@v4, and actions/upload-artifact@v4). A tag movement could change CI action code without a reviewed in-repository SHA change. No tag movement or compromise is evidenced; prior required CI has passed. The risk affects CI supply-chain integrity, not demonstrated Nightdrive runtime behavior.
- **Materiality:** It does not currently materially block unrelated application development; required CI remains available and no compromise evidence was found. It remains visible SHOULD FIX SOON debt.
- **Smallest sufficient correction and complexity:** Verify exact action provenance, pin only the existing actions to reviewed immutable commit SHAs, and pass protected CI. Complexity is low once provenance is verified.
- **Product Owner judgment:** None is required for that bounded correction after provenance verification. If provenance cannot be verified or remediation expands beyond existing actions, stop for the applicable authority.

#### S8-QUAL-001 — Independent semantic/reference evidence completeness — OPEN

- **Affected scope and authority:** Stage 8 evaluation/reference implementation and semantic fixtures under the accepted Stage 8 evidence method, [docs/MOTIF_MODEL.md](../MOTIF_MODEL.md), and applicable ADR/profile contracts.
- **Evidence and product impact:** The forward-looking finding requires a complete independent reference chain with no unresolved semantic gaps, production-derived oracle dependency, circular expectation path, or missing required branch/negative evidence. Closure evidence is not established. Without it, Stage 8 Motif semantics lack the accepted independent evidence needed for deterministic qualification.
- **Materiality:** It materially blocks Stage 8 qualification and any product claim relying on qualified Stage 8 Motif behavior. It does not block unrelated in-scope application work that does not depend on that unqualified behavior.
- **Smallest sufficient correction and complexity:** Complete and integrate only the remaining independent-reference obligations and required fixtures under the accepted method, then obtain the required independent review. Complexity is substantial because the chain spans multiple semantic boundaries.
- **Product Owner judgment:** The technical closure criteria are already accepted; no new contract choice is identified. Product Owner selection of Stage 8 as the work to prioritize over other application tasks remains a roadmap decision.

#### S8-QUAL-002 — Candidate evidence capture, custody, and freeze completeness — OPEN

- **Affected scope and authority:** Stage 8 vectors/artifacts, reviewed capture tooling, provenance, pinned runtime/dependency evidence, independent digest recomputation, and the accepted evidence method.
- **Evidence and product impact:** The finding requires a reviewed-tooling capture, complete custody, independent recomputation/inspection, and explicit acceptance/freeze. No real Stage 8 capture or freeze is established. Without accepted frozen evidence, production comparison cannot support qualification.
- **Materiality:** It materially blocks Stage 8 qualification and any claim based on accepted frozen Motif expectations; it does not independently block unrelated application work.
- **Smallest sufficient correction and complexity:** Run the already-integrated capture process only after Stage 8 work becomes eligible, then independently recompute and inspect custody and obtain the required freeze acceptance. Complexity is substantial because it requires a real pinned-platform evidence lifecycle.
- **Product Owner judgment:** No new evidence-method choice is identified; existing evidence acceptance/freeze authority remains applicable. Whether Stage 8 should delay other application work is a roadmap decision.

#### S8-QUAL-003 — Production comparison and supported-platform qualification completeness — OPEN

- **Affected scope and authority:** Stage 8 production Motif output, frozen independent vectors, repeated fresh-process replay, Windows ARM64/Linux x64 evidence, canonical byte/digest equality, and the accepted Stage 8 evidence method.
- **Evidence and product impact:** No production comparison, supported-platform Stage 8 qualification, or exact cross-platform equality evidence is established. The user-visible implication is that deterministic Stage 8 Motif output has not been qualified across the required paths.
- **Materiality:** It materially blocks Stage 8 qualification and release/acceptance claims that depend on that qualification; it does not block unrelated application work.
- **Smallest sufficient correction and complexity:** After valid independent evidence is frozen, compare production output, run the required repeated-process checks on Windows ARM64 and Linux x64, establish exact canonical equality, and obtain the required independent review/acceptance. Complexity is high because it depends on the prior reference and custody gates and two platform runs.
- **Product Owner judgment:** The technical criteria are already accepted. Musical acceptance remains separately governed; no musical or release acceptance is implied here.

### Current readiness boundary

ND-QA-001 and ND-QA-002 remain RESOLVED; ND-QA-003 remains OPEN / ACCEPTABLE / DEFERRED; ND-QA-004 and ND-QA-005 remain OPEN / SHOULD FIX SOON; S8-QUAL-001/002/003 remain OPEN; MIA-003 remains ACCEPTABLE / DEFERRED. The reconciled risk treatment means no remaining OPEN Engineering Health finding is assessed to materially block unrelated, already-in-scope application-roadmap work on current evidence; the S8-QUAL findings still block Stage 8 qualification specifically. The historical comprehensive assessment result remains REVISE. This reconciliation selects no product feature, creates no scope, and authorizes no Stage 8 qualification or change to browser/audio, UI, persistence, release, or Stage 9 gates. Stage 8 remains the selected next product milestone, but its qualification is blocked by the three OPEN findings. No other product-development task is currently selected; prioritizing a bounded task outside Stage 8 or changing roadmap order remains a Product Owner decision.
