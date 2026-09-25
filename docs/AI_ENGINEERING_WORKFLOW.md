# AI-assisted engineering execution

This document governs execution mechanics for AI-assisted engineering work. It does not define product scope, architecture, milestone eligibility, requirements, testing policy, architectural decisions, or project state. Those remain owned by their existing authoritative documents.

This is a thin execution layer for the existing [operating contract](../AGENTS.md), [development workflow](DEVELOPMENT_WORKFLOW.md), and [coding-agent rules](CODING_AGENT_RULES.md), not a parallel source of authority. Follow the existing source-of-truth rule in AGENTS.md; repository truth outranks conversation assumptions. Accepted domain contracts and typed deterministic musical ownership remain unchanged. Material conflicts require a stop, not an inferred resolution.

One bounded engineering task is performed at a time. Once the Product Owner directs work on Nightdrive, standing execution authority permits Codex to reconcile repository truth, select and prepare successive repository-eligible bounded tasks, and perform routine operational steps during the active session without asking for another acknowledgement. Mechanical publication, merge, Git reconciliation, and post-merge coordination bookkeeping may be bundled when no new product, architecture, contract, roadmap, acceptance, scope, or implementation judgment is required. This permits larger operational chunks, not larger engineering chunks; completion never makes the next capability eligible by itself.

Task-specific STOP and no-publication boundaries remain binding within that task. A later eligible bounded task may begin under standing authority after its own precheck; standing authority never overrides an explicit scope exclusion or an unresolved consequential decision.

Codex prepares the compact [task packet](templates/CODEX_TASK.md) for each bounded task and uses the [result template](templates/CODEX_RESULT.md) for evidence and resumable checkpoints. Templates organize scope and eligibility; they do not expand either. A separate ChatGPT-authored prompt is not required for every routine transition.

## Roles

### Product Owner

Retains final authority over product direction, architecture changes, consequential contract changes, roadmap/stage policy, scope changes, and publication/merge policy. Standing execution authority follows those accepted policies; it does not transfer consequential decisions to an agent.

### ChatGPT

Provides independent exact-head review outside the narrow [routine dedicated-reviewer substitution gate](#routine-dedicated-reviewer-substitution), consequential architecture and contract review, and help with genuinely unresolved blockers through an available review channel. ChatGPT does not override accepted repository contracts or routinely author every task packet. An exact-head PASS may lead to publication and merge under standing authority only when the reviewed tuple, required checks, accepted merge method, and current repository eligibility all hold.

### Codex

Leads routine engineering execution: reconciles current authority and Git state, selects and records one eligible bounded task, confirms contract maturity, prepares its own task packet, implements or investigates within scope, validates, self-reviews preliminarily, and prepares exact-head evidence for independent review. After PASS it may perform permitted publication, CI, merge, and reconciliation, then select the next independently eligible task during the active session. Codex does not approve its own final candidate, make future roadmap work eligible, or decide architecture changes, scope expansion, contract redefinition, or unrelated cleanup.

## Task classifications

- **ASSESS:** Read-only investigation of facts, repository state, root cause, feasibility, or evidence. It does not itself include corrective implementation; a contract-determined correction may follow as a separate eligible bounded task. When a formal engineering review is warranted, use the appropriate [Engineering Review Playbook](ENGINEERING_REVIEW_PLAYBOOK.md) procedure.
- **SPECIFY:** Resolve or document behavior, contracts, ownership, error semantics, deterministic policy, or another eligible implementation prerequisite. It does not itself include runtime implementation. Architectural decisions continue to use [DECISIONS.md](DECISIONS.md).
- **IMPLEMENT:** Implement sufficiently specified, repository-eligible behavior within its bounded scope. Implementation must not silently become specification.

## Risk classifications

- **R0 — Mechanical:** Fully defined changes such as documentation-only reconciliation, formatting, mechanical renames, or repetitive edits. A documentation task that changes a contract is not automatically R0.
- **R1 — Bounded implementation:** An accepted contract exists, expected scope is known, blast radius is limited, no architecture change is expected, and no public contract is redefined.
- **R2 — Contract-sensitive behavior:** Work may affect deterministic output, replay, PRNG use, serialization, error taxonomy or precedence, compatibility, public API semantics, canonical state, or persistent representation. Confirm specification before implementation.
- **R3 — Architectural:** Work concerns module ownership, cross-stage boundaries, public architecture, persistent-state ownership, major abstractions, canonical data ownership, or major external integration boundaries. Resolve architecture before implementation.

Risk determines execution/review rigor, not eligibility. These classes do not replace the playbook's review categories, findings severities, or procedures. No risk class bypasses authoritative scope, contracts, validation, or milestone boundaries.

## Default execution lifecycle

For nontrivial repository-eligible work, Codex uses this loop, with each engineering task bounded separately:

1. **RECONCILE:** Read current authority and coordination state; verify branch/base, worktree/index, existing work, stashes, and review status.
2. **SELECT ONE TASK:** Establish eligibility from accepted prerequisites; record type, risk, objective, allowed scope, acceptance criteria, validation, and stop conditions in the existing task packet.
3. **CONFIRM CONTRACT:** ASSESS stays read-only; SPECIFY records only what authority determines; IMPLEMENT requires a sufficiently defined accepted contract. An agent cannot write a new binding contract, declare it accepted itself, and immediately implement it.
4. **EXECUTE AND VALIDATE:** Work within the bounded scope. Use focused checks during iteration and all required validation before the final candidate. Fix supported defects within the accepted contract without a separate external review for every local edit.
5. **PREPARE FINAL CANDIDATE:** Self-review against requirements and scope, resolve supported local findings, rerun affected checks, and prepare one complete exact-head candidate and evidence handoff.
6. **INDEPENDENT REVIEW:** Stop at the required review boundary. PASS applies only to the reviewed base/head/scope; REVISE permits a separate bounded contract-determined correction and a new exact head; BLOCKED permits an objectively determined prerequisite ASSESS/SPECIFY task or a stop for consequential judgment.
7. **PUBLISH / CI / MERGE:** After PASS, verify the reviewed tuple and current base, inspect actual required checks and artifacts, then perform only repository-permitted publication and merge.
8. **RECONCILE / CONTINUE:** Verify ancestry, merged contents, final Git state, and material coordination staleness. During the active session select the next already-eligible bounded task unless a task-specific stop or review boundary applies. If none is eligible, stop and report the current gate without inventing new scope.

Apply only actions permitted by the task type; R0 does not bypass an applicable review or acceptance gate. PASS, REVISE, and BLOCKED are workflow states, not permission requests. Neither a merge nor a recommendation makes the next capability eligible. Stop for an unresolved consequential Product Owner decision.

## Codex execution settings

For every substantive task, Codex records a task-specific model/effort recommendation and the effective settings when observable. Prefer the lowest-capability available model and lowest reasoning effort reasonably likely to succeed, considering ambiguity, contract maturity, deterministic/replay/serialization sensitivity, debugging difficulty, cross-file reasoning, complexity, and required judgment. Prefer increasing effort before escalating model capability when the same model remains capable.

The task packet retains an `## CODEX EXECUTION SETTINGS` block with verified selectable labels when available, rationale, and a specific escalation-or-stop condition. Record how settings were configured for a new execution when supported; distinguish recommendation, requested settings, and observed effective settings. A prompt naming a model or effort does not itself switch the running execution. If availability, configuration, or effective settings cannot be verified, state that limitation and assess whether the current execution is sufficient; if it is insufficient, stop with a resumable checkpoint. Do not invent labels, claim a switch, or establish a permanent default.

Codex records the settings and limitations for Product Owner visibility. Missing rationale or escalation conditions make a substantive packet incomplete. Selecting settings does not expand eligibility or change Product Owner authority; displaying the packet creates no acknowledgement gate. Tool approvals, sandboxing, credentials, branch protection, and access controls remain in force.

## Codex precheck

Before implementation, verify as applicable the current branch, expected base SHA or authoritative base ref, working-tree/index state, governing documents, expected file scope, required contract maturity, and compatibility of task instructions with current repository truth. Preserve existing work and stashes. For meaningful implementation, explicitly report precheck success before editing; report the actual base and any in-scope existing work being preserved.

## Stop conditions

Stop and report `BLOCKED` when:

- authoritative documents conflict materially;
- the expected base does not match;
- unexpected working-tree state makes the task unsafe;
- required behavior is underspecified or architecture must be decided;
- completion requires files outside the bounded eligible scope;
- a public or canonical contract must change unexpectedly;
- tests contradict accepted governing requirements;
- the task conflicts with current milestone eligibility or would violate [SCOPE.md](SCOPE.md);
- dependency adoption requires unresolved Build-vs-Buy or architecture review;
- requested work is materially broader than the bounded eligible task.

A correct stop is valid engineering behavior. BLOCKED does not automatically request human permission: if repository truth identifies a bounded read-only investigation or prerequisite, select it as a separate eligible task. For an unresolved consequential choice, report the evidence, precise question, viable alternatives and tradeoffs, and a recommendation when justified. Repeated attempts without new evidence or progress require a checkpoint and technical escalation, not an indefinite retry loop. Do not silently repair or expand scope.

## Scope discipline

Apply AGENTS.md's one-bounded-task rule. Correct supported defects within the current accepted contract and allowed scope during local iteration, then rerun affected validation before final review. Do not perform opportunistic refactoring, renaming, API redesign, documentation cleanup, dependency changes, abstractions for future work, out-of-scope defect fixes, or preparation for later roadmap stages. Report unrelated discoveries separately; an out-of-scope correction requires its own bounded eligible task.

## Compact handoffs

Templates optimize communication, not evidence. Use the shortest report that completely proves the task: group related facts when that improves clarity, and omit template-only sections only when they are genuinely inapplicable and omission cannot hide a consequential impact. Explicit task requirements and AGENTS.md always win. Higher-risk work naturally requires more evidence than R0 work. A compact result must still preserve applicable repository state, scope, validation, review, publication, authority, and next-gate evidence; ASSESS, SPECIFY, and BLOCKED work should report the evidence appropriate to that type rather than imitate an implementation report.

## Build-vs-Buy

Every implementation task subject to the [AGENTS.md dependency evaluation gate](../AGENTS.md#build-vs-buy--dependency-evaluation-gate) must satisfy its existing evaluation and reporting requirements. This workflow does not replace or duplicate that gate.

## Reviews

Formal review procedures remain owned by the [Engineering Review Playbook](ENGINEERING_REVIEW_PLAYBOOK.md). Select review type based on risk/change. Reviews remain read-only. Preserve independent exact-head review before publication of nontrivial implementation candidates and independent review for consequential contracts, architecture, canonical/evidence changes, milestone closure, and releases. Codex self-review is preliminary and never substitutes for required independent acceptance. A separate Codex reviewer may add findings but replaces the required reviewer only if accepted policy explicitly permits that substitution. A REVISE finding may lead automatically to a subsequent bounded contract-determined correction; a finding requiring consequential judgment stops for Product Owner input. An R0/R1 label alone grants no self-approval or automatic-merge exemption.

For an exact-head review handoff, freeze the target-base commit, candidate commit and tree, changed-file scope, governing authority, and applicable OPEN findings before review. The read-only reviewer inspects immutable candidate content and returns the [playbook's contract-first result](ENGINEERING_REVIEW_PLAYBOOK.md#contract-first-exact-head-review), including obligation and permissive-path dispositions. Keep material finding details in existing review/result evidence with stable IDs, origin tuple, affected paths/blobs where practical, and closure evidence; put only current coordination impact in `PROJECT_STATE.md`. During RECONCILE and before readiness or publication, compare affected content and behavior with OPEN findings. A new SHA, base, or branch does not close an unchanged finding. Missing review fields, unresolved applicable violations, unverified material obligations, or incomplete candidate evidence preclude PASS. This procedure does not itself authorize a separate Codex reviewer to provide required independent acceptance.

## Routine dedicated-reviewer substitution

A separate Codex reviewer may satisfy the required independent exact-head review only for a routine R0 or R1 candidate whose accepted contract, scope, and validation are already determined and whose review can be decided without new product, architecture, contract, roadmap, acceptance, or risk judgment. The author records the eligibility basis in the task packet before invoking the reviewer. A risk label alone is insufficient. The author and reviewer must run in separate contexts; author self-review never qualifies.

This substitution is unavailable for R2/R3 work; changes to review or publication governance, accepted decisions, requirements, scope, roadmap, architecture, public contracts, canonical musical semantics/bytes/hashes, frozen evidence, provenance/custody/qualification, security or other fail-closed trust boundaries, dependencies, CI/configuration, milestone closure, or release. It is also unavailable when an applicable material finding remains OPEN, authoritative sources conflict, or a consequential interpretation is needed. Route such work to the existing independent reviewer; do not relabel it R0/R1 to obtain substitution. A corrected OPEN finding requires independent adjudication before it can cease blocking this gate.

For an eligible candidate, invoke the dedicated Codex `exec review` path demonstrated in qualification. The initial configuration requests `gpt-6-sol`/high effort, a read-only sandbox, and disabled approvals; a different configuration needs separate qualification. Verify effective settings from an execution receipt rather than the prompt or the reviewer's self-report. Supply a neutral request containing the immutable base/head/tree/scope, governing accepted authority, applicable prior findings and validation evidence, and the [contract-first playbook](ENGINEERING_REVIEW_PLAYBOOK.md#contract-first-exact-head-review); do not supply a desired verdict or let a candidate summary replace source inspection. Retain the invocation/settings/sandbox receipt, complete reviewer result, inspected-object evidence, and validation limitations. The receiving agent independently verifies the current tuple, every required result field, materially complete obligation and permissive-path audits, and prior-finding disposition. Only a complete PASS with no material `VIOLATED` or `NOT VERIFIED` obligation and no applicable blocking finding satisfies routine review. REVISE, BLOCKED, missing or unverifiable settings, incomplete content/result, or an uncertain eligibility basis return to correction or the existing independent reviewer, never to inferred PASS.

Material changes to the reviewer model, invocation, sandbox enforcement, review protocol, or a failed qualification control suspend substitution until new independent qualification is accepted. The reviewer cannot approve changes to this gate or its own qualification. Even a valid routine PASS remains bound to the reviewed base/head/tree/scope and leaves current-base assessment, required CI, Product Owner-set Git policy, and merge checks intact. It grants no unattended merge authority; the separate server-side enforcement prerequisite remains binding.

## Implementation review evidence

Full implementation approval requires inspectable candidate content, not only a commit SHA, changed-file names, an implementation summary, reported validation, or a Codex PASS. The review evidence must identify the exact reviewed-base/head tuple and scope already required by this workflow.

For a nontrivial local-only committed candidate that the reviewer cannot fetch, Codex normally generates the complete equivalent of `git diff --full-index <base>..<head>`, including new files, as a standalone `.patch` artifact outside the repository working tree. It does not commit, push, place in the PR, or print the patch contents inline by default. The result reports base/head, patch path or filename, byte size, SHA-256, changed-file count, completeness, and confirmation of complete full-index base-to-head coverage. Supply the patch through an available review channel; if no such channel is available, preserve a resumable checkpoint and stop at the review boundary. Do not assume Codex can contact this ChatGPT conversation automatically. An uncommitted candidate must return complete working-tree/index candidate evidence; this does not require committing or pushing unreviewed work. If the candidate is already remotely fetchable and the reviewer actually obtains the complete relevant contents from an authoritative source, Codex identifies that source and need not redundantly create the patch.

A genuinely small, easily inspectable diff may be supplied inline when that is more efficient, including when the task or reviewer explicitly requests inline evidence. Otherwise, substantial/nontrivial complete evidence defaults to the standalone patch. Partial or silently truncated evidence cannot support full exact-head implementation approval. New text files require full content in the diff/artifact. Binary or otherwise non-inline-reviewable artifacts require exact metadata/hash and an available artifact or source, with limitations disclosed. Candidate-content evidence remains separate from tests, validation, scope, architecture/contract, and CI evidence.

If the reviewer has not inspected the actual candidate contents, the result must say that review is summary-only, candidate inspection is incomplete, or review is blocked pending evidence. It must not represent technical approval as full exact-head implementation approval. Evidence transfer alone does not satisfy exact-head review; publication and merge still require repository eligibility, a valid reviewed tuple, required checks, and accepted Git policy.

## Reviewed-head rule

Once exact-head review passes for a specific implementation commit SHA, it becomes the reviewed head for the current publication gate. Any subsequent change to the implementation branch, including an additional commit, amend, rebase, force-push replacement, formatting, documentation, or code change, creates a new unreviewed head/state. Uncommitted changes also prevent exact-head publication. The new head must be reviewed before publication or merge.

Record the approved SHA and reviewed scope in publication evidence. This rule supplements existing Git/PR practice; it does not override branch, CI, or Product Owner-set merge policy. A valid exact-head PASS can progress under standing execution authority without another acknowledgement.

## Reviewed-base binding and integration tuple

For work intended for publication, technical approval is bound to an inspectable review tuple, recorded in the task and result evidence:

- reviewed target-base SHA/ref used for the review;
- reviewed implementation-head SHA;
- reviewed file scope;
- relevant review, validation, and CI/check evidence.

This tuple establishes what was technically reviewed. Publication and merge may proceed under standing execution authority only after exact-head PASS, current-base/scope checks, required CI, accepted merge policy, and repository eligibility all hold.

Immediately before publication or merge, verify the current remote target branch against the reviewed target base. If it still equals the reviewed target base, continue under the existing exact-head, scope, CI, and merge-policy gates. If it has advanced, stop normal publication and perform a bounded impact assessment before proceeding. Do not automatically rebase, merge the target branch into the implementation branch, cherry-pick into a replacement commit, assume an unchanged head remains approved, or merge merely because there is no textual conflict.

The bounded assessment determines whether reviewed files or relevant contracts changed, integration semantics or conflicts exist, prior validation remains applicable, refreshed validation/review is required, or a replacement implementation commit is needed. A replacement, amended, or rebased implementation commit is a new unreviewed head under the reviewed-head rule. Refreshed work is proportional to the observed impact; target-base movement does not by itself require full reimplementation or a new architecture review.

The reviewed implementation-head SHA and the resulting merge-commit SHA are distinct objects when the accepted merge method creates a merge commit. Do not require them to be equal. Post-merge evidence instead verifies the reviewed head is in the resulting target-branch ancestry, the accepted target-base/integration state was used, the merged change corresponds to the reviewed scope, and no out-of-scope changes entered through publication.

Routine unattended merging remains ineligible unless accepted server-side protections enforce the required checks and merge policy; a reviewer qualification result alone cannot supply that enforcement. Verify live protections before relying on them. This condition is separate from reviewer authority and does not change the existing standing, checked publication flow.

## Implementation/publication separation

### Implementation gate

For nontrivial implementation tasks, Codex performs precheck, implements the bounded eligible scope, validates, and preliminarily self-reviews. It may make several local corrections within that one task before preparing the final reviewed candidate. It commits locally when the task permits, reports exact evidence and the resulting SHA, and stops at the required independent review boundary. A no-commit task stops with its validated working tree instead; later commit preservation remains a separate bounded action.

### Publication gate

After exact-head PASS, Codex may proceed to publication under standing execution authority when repository eligibility and accepted Git policy permit it. Record the reviewed target base, reviewed implementation head, reviewed scope, relevant validation/check evidence, and expected target-base state. Verify the current remote target base, branch/head, PR head, and unchanged scope before pushing only reviewed work and creating/updating the PR. No implementation changes are made unless review is reopened. Inspect actual required CI jobs, commands, logs, and artifacts where applicable; a green status alone does not prove required evidence executed. Required checks, base-match disposition, accepted merge method, and unchanged reviewed scope must be confirmed before merge. On CI failure, leave the candidate unmerged, inspect evidence, and distinguish a demonstrated defect from an unknown cause. A contract-determined implementation correction becomes a bounded local task and a new unreviewed head requiring renewed review before publication; do not push an unreviewed correction merely to obtain another CI attempt. Base movement or conflicts trigger bounded assessment or a stop under the existing rules.

The same operational publication flow may continue through deterministic post-merge reconciliation when task-specific restrictions do not exclude it: verify the merged scope and reviewed-head ancestry, inspect whether `PROJECT_STATE.md` or `docs/ROADMAP.md` became materially stale solely because of that merge, make only mechanically determined coordination/status edits, validate them, and create a separate reconciliation commit. Publish or merge that reconciliation through its own exact-head review and normal PR/CI/merge path. The reviewed implementation candidate remains frozen throughout.

Bundled reconciliation is permitted only when no new product, architecture, contract, error-semantic, roadmap-ordering, acceptance, scope, implementation, corrective, substantive-test, dependency, or configuration judgment is required and authoritative documents do not conflict. Otherwise stop and report `BLOCKED`; never infer the next engineering capability or repair the candidate. Any next engineering task must independently satisfy repository eligibility.

This split is not required for trivial tasks where existing repository practice allows a simpler flow. It never permits bypassing required review, CI, or accepted merge policy.

## Post-merge reconciliation

After consequential merges, verify whether coordination state changed materially. Apply the existing [AGENTS.md](../AGENTS.md) maintenance policy for [PROJECT_STATE.md](../PROJECT_STATE.md): update only a stale current coordination snapshot, never create a permanent history log. Do not require a bookkeeping commit merely for every PR number or merge SHA when the snapshot remains accurate. Apply the same principle to `docs/ROADMAP.md`; preserve its authoritative gate/capability wording without accumulating mechanical merge history. Permanent decisions remain in DECISIONS.md; scope, architecture, and testing remain with their existing owners. For publication evidence, distinguish the reviewed base, reviewed implementation head, PR head, resulting merge commit, and final target-branch head; verify the reviewed head's ancestry and accepted integration relationship. If reconciliation is bundled, keep it separate from the implementation commit, validate it, and complete that bounded task before selecting another. If a task-specific restriction excludes edits, report any stale wording for a later bounded task; if judgment is required, stop for the Product Owner. During the active session, continue only to a separately bounded next task whose eligibility is established by current repository truth.

## Root-cause discipline and resumption

Investigate failures from observed commands, paths, logs, and artifacts. Do not call a check incorrect merely because it failed, invent the cause of dirty paths or missing evidence, or weaken assertions, allowlists, custody, or validation to obtain PASS. Reuse inspected evidence until relevant files, contracts, or refs change; avoid identical retries without new evidence or a justified transient cause.

Keep a compact checkpoint in the task result when review, access, or session continuity prevents progress: current bounded task, actual base/head and worktree state, completed checks, unresolved findings, review disposition, and next safe action. Git owns history; `PROJECT_STATE.md` remains a current coordination snapshot. A resumed session must recheck repository state, authority, and review validity before acting. Do not assume Codex can restart itself, continue after a session ends, or obtain external review automatically. Use only supported built-in review, subagent, and session mechanisms; unavailable capabilities or permissions remain explicit blockers rather than reasons to bypass a gate.
