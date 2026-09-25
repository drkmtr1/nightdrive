# Codex task packet

Use with the [AI engineering workflow](../AI_ENGINEERING_WORKFLOW.md). Codex prepares this reusable packet for one bounded repository-eligible task; it is subordinate to [AGENTS.md](../../AGENTS.md) and governing documents and cannot expand their scope. A separate ChatGPT-authored prompt is not required for a routine transition.

## TASK / CLASSIFICATION

- Objective: one bounded task.
- Type: `ASSESS | SPECIFY | IMPLEMENT` — select one; ASSESS remains read-only and SPECIFY does not include runtime implementation in the same task.
- Risk: `R0 | R1 | R2 | R3` with a brief rationale.

## CODEX EXECUTION SETTINGS

For every substantive task, record this block during precheck:

- Recommended/requested Codex model: verified selectable label when available; otherwise state the concrete availability limitation.
- Recommended/requested reasoning effort: verified selectable label when available; otherwise state the concrete availability limitation.
- Effective settings/configuration: observed values and method when available; otherwise state what cannot be verified or changed.
- Why: brief task-specific capability/risk rationale.
- Escalate if: specific condition requiring stronger settings or a stop.

Codex records a task-specific model/effort recommendation, rationale, and escalation condition for Product Owner visibility. Verify selectable labels when available; distinguish a recommendation from settings actually configured for an execution, and record effective settings only when observable. A prompt does not switch the running model. If selection or configuration is unavailable, state the limitation and assess whether the current execution can safely perform the task; do not invent labels, claim a switch, or establish a permanent default. Displaying the packet creates no acknowledgement gate.

## REPOSITORY ELIGIBILITY / STATE

- Current repository gate and evidence that the bounded task is eligible under `PROJECT_STATE.md`, `docs/ROADMAP.md`, or another governing contract. Identify any genuine Product Owner decision still required; standing execution authority supplies routine progression, not new capability scope.
- Expected branch:
- Expected base SHA/ref, when applicable:
- Working-tree/index assumptions and existing work/stashes to preserve:
- For publication-capable work: reviewed target-base SHA/ref, reviewed implementation-head SHA, expected remote target-base state, reviewed scope, and relevant review/validation/check evidence.

## AUTHORITY / SCOPE

- Governing documents and relevant requirement, acceptance, or contract sections, read in the order required by AGENTS.md. The task prompt does not outrank them.
- Allowed paths or explicitly bounded area, including any permitted existing changes. Do not infer scope for adjacent files.
- Required behavior: exact requirements, contract maturity, inputs/outputs, invariants, and failure behavior.

## NON-GOALS / DO NOT

- No unrelated refactors or fixes, speculative abstractions, unauthorized dependencies, future-stage implementation, or silent contract changes.
- Add task-specific exclusions, including publication, environment, and external-system boundaries.

## PRECHECK / EVIDENCE

- Verify branch/base, working-tree/index state, governing documents, scope, contract maturity, and compatibility with repository truth before edits; report meaningful precheck success.
- Review handoff for implementation: explain how the exact candidate will be inspectable. For a substantial/nontrivial local committed candidate, default to a standalone `.patch` outside the repository, equivalent to complete `git diff --full-index <base>..<head>` evidence including new files; do not commit the patch, push, add it to the PR, or paste it inline by default. Report its base/head, path/name, byte size, SHA-256, changed-file count, and completeness. A genuinely small diff may be inline when more efficient or explicitly requested. An uncommitted candidate requires complete working-tree/index evidence; a remotely fetchable candidate must identify the authoritative source and exact base/head evidence. Disclose unavailable, partial, binary, or non-inline-reviewable evidence; do not push unreviewed work merely for inspection.

## BUILD-VS-BUY

Choose one and explain: `Not applicable`; `Existing accepted approach applies` with the governing decision; or `Required` — perform the AGENTS.md gate before implementation.

## ACCEPTANCE / VALIDATION / STOP

- Acceptance criteria: observable conditions and evidence for each.
- Validation: exact task-specific commands, repository-required checks, manual evidence, and accepted limitations.
- Stop conditions: workflow-default `BLOCKED` triggers plus task-specific triggers. Do not repair unexpected state or broaden scope without an accepted decision establishing eligibility.

## PUBLICATION / MERGE DISPOSITION

Record the disposition for this bounded task. This is a scope/eligibility record, not a request for another acknowledgement:

- `LOCAL CANDIDATE — stop after the validated local commit for exact-head review` (when the task permits a commit).
- `STANDING PUBLICATION AFTER EXACT-HEAD PASS` — record reviewed SHA and scope, current base, required CI, accepted merge method, and exact push/PR/merge checks; proceed only while the tuple and repository eligibility remain valid.
- Another repository-compatible instruction, such as read-only evidence, leaving implementation uncommitted, or a task-specific no-publication stop.

For publication-capable work, record reviewed base/head/scope/evidence and expected remote target-base state; before publication or merge verify the live target base and state the base-match or bounded-base-movement disposition. After exact-head PASS, any branch mutation creates a new unreviewed head under the workflow's reviewed-head rule. ASSESS permits no edits or commits. Review and standing progression remain subject to Product Owner-set publication/merge policy and all repository checks.

For mechanical post-merge reconciliation, record whether the current bounded task includes it:

- `PUBLICATION ONLY` — stop after publication/merge verification required by existing repository mechanics.
- `PUBLICATION + MECHANICAL POST-MERGE RECONCILIATION` — list the allowed coordination/status paths (normally `PROJECT_STATE.md` and/or `docs/ROADMAP.md`), exact stop conditions, and the separate reconciliation commit/review/PR/CI/merge path. Do not begin a new engineering capability in that operational flow.

Mechanical reconciliation may follow under standing authority when repository truth and this task's scope determine the edit. It may not modify the reviewed implementation, and it must stop `BLOCKED` if any new engineering judgment or authoritative-document conflict is required.

## RETURN

Use [CODEX_RESULT.md](CODEX_RESULT.md), retaining all AGENTS.md delivery facts and applicable review/publication evidence. Report exact state, commands/results, scope, unavailable evidence, blockers, and the next gate; a recommendation alone does not establish future capability eligibility.
