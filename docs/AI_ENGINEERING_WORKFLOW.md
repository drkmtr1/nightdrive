# AI-assisted engineering execution

This document governs execution mechanics for AI-assisted engineering work. It does not define product scope, architecture, milestone eligibility, requirements, testing policy, architectural decisions, or project state. Those remain owned by their existing authoritative documents.

This is a thin execution layer for the existing [operating contract](../AGENTS.md), [development workflow](DEVELOPMENT_WORKFLOW.md), and [coding-agent rules](CODING_AGENT_RULES.md), not a parallel source of authority. Follow the existing source-of-truth rule in AGENTS.md; repository truth outranks conversation assumptions. Accepted domain contracts and typed deterministic musical ownership remain unchanged. Material conflicts require a stop, not an inferred resolution.

One bounded engineering task is performed at a time. Once the Product Owner directs work on Nightdrive, standing execution authority permits ChatGPT to advance through successive repository-eligible bounded tasks and routine operational steps without asking for another acknowledgement. Mechanical publication, merge, Git reconciliation, and post-merge coordination bookkeeping may be bundled when no new product, architecture, contract, roadmap, acceptance, scope, or implementation judgment is required. This permits larger operational chunks, not larger engineering chunks; completion never makes the next capability eligible by itself.

Task-specific STOP and no-publication boundaries remain binding within that task. A later eligible bounded task may begin under standing authority after its own precheck; standing authority never overrides an explicit scope exclusion or an unresolved consequential decision.

Use the [task packet](templates/CODEX_TASK.md) for ChatGPT-to-Codex handoff and the [result template](templates/CODEX_RESULT.md) for evidence. Templates organize scope and eligibility; they do not expand either.

## Roles

### Product Owner

Retains final authority over product direction, architecture changes, consequential contract changes, roadmap/stage policy, scope changes, and publication/merge policy. Standing execution authority follows those accepted policies; it does not transfer consequential decisions to an agent.

### ChatGPT

Acts as technical architect, engineering advisor, planner, reviewer, task decomposer, and milestone gatekeeper. Responsibilities may include reconciling repository truth, identifying the next eligible bounded task, classifying task type and implementation risk, confirming specification maturity, preparing Codex task packets, and reviewing an exact implementation commit. ChatGPT does not override accepted repository contracts. An exact-head PASS may lead to publication and merge under standing authority only when the reviewed tuple, required checks, accepted merge method, and current repository eligibility all hold.

### Codex

Acts as implementation engineer: verifies preconditions, inspects governing documents, implements only the bounded eligible scope, runs required validation, and reports exact evidence rather than inventing missing requirements or architecture. Codex does not independently make future roadmap work eligible or decide architecture changes, scope expansion, contract redefinition, or unrelated cleanup.

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

For nontrivial repository-eligible work, use this sequence, with each engineering task bounded separately:

1. RECONCILE
2. SELECT
3. CLASSIFY
4. CONFIRM CONTRACT
5. SELECT CODEX EXECUTION SETTINGS
6. ISSUE TASK PACKET
7. PRECHECK
8. IMPLEMENT
9. VALIDATE
10. RETURN EVIDENCE
11. REVIEW
12. APPROVE EXACT HEAD
13. PUBLISH
14. CI
15. MERGE
16. RECONCILE PROJECT STATE WHEN MATERIAL

Not every R0 task needs every step. Apply only actions permitted by the task type: ASSESS remains read-only; SPECIFY does not acquire runtime scope. PASS, REVISE, and BLOCKED are workflow states, not requests for permission. After PASS, ChatGPT may initiate the next bounded task only when repository truth already establishes eligibility. REVISE may lead to the smallest contract-determined correction; BLOCKED may lead to an objectively determined prerequisite ASSESS/SPECIFY task. Publication and merge may follow exact-head PASS under standing authority after required repository and CI checks. Stop for an unresolved consequential Product Owner decision; never infer a future capability from this sequence.

## Codex execution settings

Before issuing every substantive Codex task, ChatGPT selects and records task-specific execution settings. The selection must use the lowest-capability currently selectable Codex model and lowest reasoning effort reasonably likely to succeed, considering task ambiguity, specification maturity, deterministic/replay/serialization sensitivity, debugging difficulty, cross-file reasoning, implementation complexity, and required judgment. Prefer increasing reasoning effort before escalating the model when the same model remains capable.

The task packet must contain an `## CODEX EXECUTION SETTINGS` block with the exact currently selectable model label, exact currently selectable reasoning-effort label, a brief task-specific rationale, and a specific escalation-or-stop condition. If current availability is not known with sufficient confidence, ChatGPT verifies it before issuing the packet. Do not guess or invent model names or use generic family placeholders unless that is literally a selectable label. Do not establish a permanent default model or effort.

For Product Owner visibility, ChatGPT records the same settings with the task packet. Missing settings, unresolved placeholders, missing rationale, or missing escalation conditions make a substantive packet incomplete. Selecting settings does not expand task eligibility or change Product Owner authority; displaying the packet creates no acknowledgement gate.

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

A correct stop is valid engineering behavior. Report evidence and the decision needed; do not silently repair or expand scope.

## Scope discipline

Apply AGENTS.md's one-bounded-task rule. Do not perform opportunistic refactoring, renaming, API redesign, documentation cleanup, dependency changes, abstractions for future work, out-of-scope defect fixes, or preparation for later roadmap stages. Report unrelated discoveries separately; a correction requires its own bounded eligible task.

## Compact handoffs

Templates optimize communication, not evidence. Use the shortest report that completely proves the task: group related facts when that improves clarity, and omit template-only sections only when they are genuinely inapplicable and omission cannot hide a consequential impact. Explicit task requirements and AGENTS.md always win. Higher-risk work naturally requires more evidence than R0 work. A compact result must still preserve applicable repository state, scope, validation, review, publication, authority, and next-gate evidence; ASSESS, SPECIFY, and BLOCKED work should report the evidence appropriate to that type rather than imitate an implementation report.

## Build-vs-Buy

Every implementation task subject to the [AGENTS.md dependency evaluation gate](../AGENTS.md#build-vs-buy--dependency-evaluation-gate) must satisfy its existing evaluation and reporting requirements. This workflow does not replace or duplicate that gate.

## Reviews

Formal review procedures remain owned by the [Engineering Review Playbook](ENGINEERING_REVIEW_PLAYBOOK.md). Select review type based on risk/change. Reviews remain read-only. A REVISE finding may lead automatically to a subsequent bounded contract-determined correction, not an expanded review; a finding requiring consequential judgment stops for Product Owner input.

## Implementation review evidence

Full implementation approval requires inspectable candidate content, not only a commit SHA, changed-file names, an implementation summary, reported validation, or a Codex PASS. The review evidence must identify the exact reviewed-base/head tuple and scope already required by this workflow.

For a nontrivial local-only committed candidate that the reviewer cannot fetch, Codex normally generates the complete equivalent of `git diff --full-index <base>..<head>`, including new files, as a standalone `.patch` artifact outside the repository working tree. It does not commit, push, place in the PR, or print the patch contents inline by default. The result reports base/head, patch path or filename, byte size, SHA-256, changed-file count, completeness, and confirmation of complete full-index base-to-head coverage. The Product Owner transfers or attaches the patch for ChatGPT review. An uncommitted candidate must return complete working-tree/index candidate evidence; this does not require committing or pushing unreviewed work. If the candidate is already remotely fetchable and the reviewer actually obtains the complete relevant contents from an authoritative source, Codex identifies that source and need not redundantly create the patch.

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

## Implementation/publication separation

### Implementation gate

For nontrivial implementation tasks, Codex performs precheck, implements the bounded eligible scope, validates, commits locally when the task permits, reports exact evidence and the resulting SHA, and stops for review. A no-commit task stops with its validated working tree instead; later commit preservation remains a separate bounded action.

### Publication gate

After exact-head PASS, Codex may proceed to publication under standing execution authority when repository eligibility and accepted Git policy permit it. Record the reviewed target base, reviewed implementation head, reviewed scope, relevant validation/check evidence, and expected target-base state. Verify the current remote target base, branch/head, PR head, and unchanged scope before pushing only reviewed work and creating/updating the PR. No implementation changes are made unless review is reopened. Required checks, base-match disposition, accepted merge method, and unchanged reviewed scope must be confirmed before merge; failures, base movement, or conflicts trigger bounded assessment or a stop under the existing rules.

The same operational publication flow may continue through deterministic post-merge reconciliation when task-specific restrictions do not exclude it: verify the merged scope and reviewed-head ancestry, inspect whether `PROJECT_STATE.md` or `docs/ROADMAP.md` became materially stale solely because of that merge, make only mechanically determined coordination/status edits, validate them, and create a separate reconciliation commit. Publish or merge that reconciliation through its own exact-head review and normal PR/CI/merge path. The reviewed implementation candidate remains frozen throughout.

Bundled reconciliation is permitted only when no new product, architecture, contract, error-semantic, roadmap-ordering, acceptance, scope, implementation, corrective, substantive-test, dependency, or configuration judgment is required and authoritative documents do not conflict. Otherwise stop and report `BLOCKED`; never infer the next engineering capability or repair the candidate. Any next engineering task must independently satisfy repository eligibility.

This split is not required for trivial tasks where existing repository practice allows a simpler flow. It never permits bypassing required review, CI, or accepted merge policy.

## Post-merge reconciliation

After consequential merges, verify whether coordination state changed materially. Apply the existing [AGENTS.md](../AGENTS.md) maintenance policy for [PROJECT_STATE.md](../PROJECT_STATE.md): update only a stale current coordination snapshot, never create a permanent history log. Do not require a bookkeeping commit merely for every PR number or merge SHA when the snapshot remains accurate. Apply the same principle to `docs/ROADMAP.md`; preserve its authoritative gate/capability wording without accumulating mechanical merge history. Permanent decisions remain in DECISIONS.md; scope, architecture, and testing remain with their existing owners. For publication evidence, distinguish the reviewed base, reviewed implementation head, PR head, resulting merge commit, and final target-branch head; verify the reviewed head's ancestry and accepted integration relationship. If reconciliation is bundled, keep it separate from the implementation commit, validate it, and stop after final reconciliation. If a task-specific restriction excludes edits, report any stale wording for a later bounded task; if judgment is required, stop for the Product Owner.
