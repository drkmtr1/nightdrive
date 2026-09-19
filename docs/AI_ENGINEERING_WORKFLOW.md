# AI-assisted engineering execution

This document governs execution mechanics for AI-assisted engineering work. It does not define product scope, architecture, milestone authorization, requirements, testing policy, architectural decisions, or project state. Those remain owned by their existing authoritative documents.

This is a thin execution layer for the existing [operating contract](../AGENTS.md), [development workflow](DEVELOPMENT_WORKFLOW.md), and [coding-agent rules](CODING_AGENT_RULES.md), not a parallel source of authority. Follow the existing source-of-truth rule in AGENTS.md; repository truth outranks conversation assumptions. Accepted domain contracts and typed deterministic musical ownership remain unchanged. Material conflicts require a stop, not an inferred resolution.

Use the [task packet](templates/CODEX_TASK.md) for ChatGPT-to-Codex handoff and the [result template](templates/CODEX_RESULT.md) for evidence. Templates organize the task; they do not grant authorization.

## Roles

### Product Owner

Retains final authority over product direction, architecture changes, consequential contract changes, roadmap/stage authorization, scope changes, and merge authorization. This workflow does not redefine that authority or transfer it to an agent.

### ChatGPT

Acts as technical architect, engineering advisor, planner, reviewer, task decomposer, and milestone gatekeeper. Responsibilities may include reconciling repository truth, identifying the next eligible bounded task, classifying task type and implementation risk, confirming specification maturity, preparing Codex task packets, reviewing evidence, and approving or rejecting an exact implementation commit. ChatGPT does not override accepted repository contracts; review approval is not itself Product Owner publication or merge authorization.

### Codex

Acts as implementation engineer: verifies preconditions, inspects governing documents, implements only authorized scope, runs required validation, reports exact evidence, and stops rather than inventing missing requirements or architecture. Codex does not independently authorize future roadmap work, architecture changes, scope expansion, contract redefinition, or unrelated cleanup.

## Task classifications

- **ASSESS:** Read-only investigation of facts, repository state, root cause, feasibility, or evidence. It does not authorize corrective implementation. When a formal engineering review is warranted, use the appropriate [Engineering Review Playbook](ENGINEERING_REVIEW_PLAYBOOK.md) procedure.
- **SPECIFY:** Resolve or document behavior, contracts, ownership, error semantics, deterministic policy, or another implementation prerequisite within explicit authorization. It does not imply runtime authorization. Architectural decisions continue to use [DECISIONS.md](DECISIONS.md).
- **IMPLEMENT:** Implement behavior that is sufficiently specified and explicitly authorized. Implementation must not silently become specification.

## Risk classifications

- **R0 — Mechanical:** Fully defined changes such as documentation-only reconciliation, formatting, mechanical renames, or repetitive edits. A documentation task that changes a contract is not automatically R0.
- **R1 — Bounded implementation:** An accepted contract exists, expected scope is known, blast radius is limited, no architecture change is expected, and no public contract is redefined.
- **R2 — Contract-sensitive behavior:** Work may affect deterministic output, replay, PRNG use, serialization, error taxonomy or precedence, compatibility, public API semantics, canonical state, or persistent representation. Confirm specification before implementation.
- **R3 — Architectural:** Work concerns module ownership, cross-stage boundaries, public architecture, persistent-state ownership, major abstractions, canonical data ownership, or major external integration boundaries. Resolve architecture before implementation.

Risk determines execution/review ceremony, not permission. These classes do not replace the playbook's review categories, findings severities, or procedures. No risk class bypasses authoritative scope, contracts, validation, or milestone authorization.

## Default execution lifecycle

For nontrivial work, use this sequence within the task's authorization:

1. RECONCILE
2. SELECT
3. CLASSIFY
4. CONFIRM CONTRACT
5. ISSUE TASK PACKET
6. PRECHECK
7. IMPLEMENT
8. VALIDATE
9. RETURN EVIDENCE
10. REVIEW
11. APPROVE EXACT HEAD
12. PUBLISH
13. CI
14. MERGE
15. RECONCILE PROJECT STATE WHEN MATERIAL

Not every R0 task needs every ceremony step. Apply only actions permitted by the task type: ASSESS remains read-only; SPECIFY does not acquire runtime scope. Selection/recommendation does not authorize the next task. Publication and merge require their explicit authorization and repository checks; the sequence is not blanket permission to continue.

## Codex precheck

Before implementation, verify as applicable the current branch, expected base SHA or authoritative base ref, working-tree/index state, governing documents, expected file scope, required contract maturity, and compatibility of task instructions with current repository truth. Preserve existing work and stashes. For meaningful implementation, explicitly report precheck success before editing; report the actual base and any authorized existing work being preserved.

## Stop conditions

Stop and report `BLOCKED` when:

- authoritative documents conflict materially;
- the expected base does not match;
- unexpected working-tree state makes the task unsafe;
- required behavior is underspecified or architecture must be decided;
- completion requires unauthorized files;
- a public or canonical contract must change unexpectedly;
- tests contradict accepted governing requirements;
- the task conflicts with current milestone authorization or would violate [SCOPE.md](SCOPE.md);
- dependency adoption requires unresolved Build-vs-Buy or architecture review;
- requested work is materially broader than the authorized task.

A correct stop is valid engineering behavior. Report evidence and the decision needed; do not silently repair or expand scope.

## Scope discipline

Apply AGENTS.md's one-bounded-task rule. Do not perform opportunistic refactoring, renaming, API redesign, documentation cleanup, dependency changes, abstractions for future work, out-of-scope defect fixes, or preparation for later roadmap stages. Report unrelated discoveries separately; fixing them requires separate authorization.

## Build-vs-Buy

Every implementation task subject to the [AGENTS.md dependency evaluation gate](../AGENTS.md#build-vs-buy--dependency-evaluation-gate) must satisfy its existing evaluation and reporting requirements. This workflow does not replace or duplicate that gate.

## Reviews

Formal review procedures remain owned by the [Engineering Review Playbook](ENGINEERING_REVIEW_PLAYBOOK.md). Select review type based on risk/change. Reviews remain read-only unless corrective work is separately authorized; findings do not themselves authorize implementation. Corrective work requires a subsequent bounded task, not an expanded review.

## Implementation review evidence

Full implementation approval requires inspectable candidate content, not only a commit SHA, changed-file names, an implementation summary, reported validation, or a Codex PASS. The review evidence must identify the exact reviewed-base/head tuple and scope already required by this workflow.

For a local-only committed candidate that the reviewer cannot fetch, Codex returns the complete base-to-head diff, including new files, or an equivalent complete artifact tied unambiguously to the exact base/head. An uncommitted candidate must return complete working-tree/index candidate evidence; this does not require committing or pushing unreviewed work. If the candidate is already remotely fetchable and the reviewer actually obtains the complete relevant contents from an authoritative source, Codex identifies that source and need not redundantly paste the same diff.

Large evidence must be split into complete labeled parts or replaced by another complete inspectable artifact; partial or silently truncated evidence cannot support full exact-head implementation approval. New text files require full content in the diff/artifact. Binary or otherwise non-inline-reviewable artifacts require exact metadata/hash and an available artifact or source, with limitations disclosed. Candidate-content evidence remains separate from tests, validation, scope, architecture/contract, and CI evidence.

If the reviewer has not inspected the actual candidate contents, the result must say that review is summary-only, candidate inspection is incomplete, or review is blocked pending evidence. It must not represent technical approval as full exact-head implementation approval. Technical approval and evidence transfer do not authorize publication or merge.

## Reviewed-head rule

Once ChatGPT explicitly approves a specific implementation commit SHA, it becomes the reviewed head for the current publication gate. Any subsequent change to the implementation branch, including an additional commit, amend, rebase, force-push replacement, formatting, documentation, or code change, creates a new unreviewed head/state. Uncommitted changes also prevent exact-head publication. The new head must be reviewed before publication/merge authorization.

Record the approved SHA and reviewed scope in the publication task. This rule supplements existing Git/PR practice; it does not override branch or CI policy, and review approval does not replace Product Owner merge authorization.

## Reviewed-base binding and integration tuple

For work intended for publication, technical approval is bound to an inspectable review tuple, recorded in the task and result evidence:

- reviewed target-base SHA/ref used for the review;
- reviewed implementation-head SHA;
- reviewed file scope;
- relevant review, validation, and CI/check evidence.

This tuple establishes what was technically reviewed. It does not authorize publication or merge; Product Owner authorization remains a separate gate.

Immediately before authorized publication or merge, verify the current remote target branch against the reviewed target base. If it still equals the reviewed target base, continue under the existing exact-head, scope, CI, and authorization gates. If it has advanced, stop normal publication and perform a bounded impact assessment before proceeding. Do not automatically rebase, merge the target branch into the implementation branch, cherry-pick into a replacement commit, assume an unchanged head remains approved, or merge merely because there is no textual conflict.

The bounded assessment determines whether reviewed files or relevant contracts changed, integration semantics or conflicts exist, prior validation remains applicable, refreshed validation/review is required, or a replacement implementation commit is needed. A replacement, amended, or rebased implementation commit is a new unreviewed head under the reviewed-head rule. Refreshed work is proportional to the observed impact; target-base movement does not by itself require full reimplementation or a new architecture review.

The reviewed implementation-head SHA and the resulting merge-commit SHA are distinct objects when the authorized merge method creates a merge commit. Do not require them to be equal. Post-merge evidence instead verifies the reviewed head is in the resulting target-branch ancestry, the authorized target-base/integration state was used, the merged change corresponds to the reviewed scope, and no unauthorized changes entered through publication.

## Implementation/publication separation

### Implementation gate

For nontrivial implementation tasks, Codex performs precheck, implements authorized scope, validates, commits locally when authorized, reports exact evidence and the resulting SHA, and stops for review. An explicit no-commit task stops with its validated working tree instead; later commit preservation remains a bounded authorized action.

### Publication gate

Only after an exact head is approved, and publication is authorized, Codex records the reviewed target base, reviewed implementation head, reviewed scope, relevant validation/check evidence, and expected target-base state. It then verifies the current remote target base, branch/head, PR head, and unchanged scope before pushing only approved work and creating/updating the PR when authorized. No implementation changes are made unless review is reopened. Required checks, base-match disposition, and unchanged reviewed scope must be confirmed before an authorized merge; failures, base movement, or conflicts are reported rather than repaired under publication-only authority.

This split is not required for trivial tasks where existing repository practice and explicit authorization allow a simpler flow. It never permits bypassing required review, CI, or merge authorization.

## Post-merge reconciliation

After consequential merges, verify whether coordination state changed materially. Apply the existing [AGENTS.md](../AGENTS.md) maintenance policy for [PROJECT_STATE.md](../PROJECT_STATE.md): update only a stale current coordination snapshot, never create a permanent history log. Permanent decisions remain in DECISIONS.md; scope, roadmap, architecture, and testing remain with their existing owners. For publication evidence, distinguish the reviewed base, reviewed implementation head, PR head, resulting merge commit, and final target-branch head; verify the reviewed head's ancestry and authorized integration relationship. If the publication task excludes edits, report stale wording for separately authorized reconciliation rather than creating another commit.
