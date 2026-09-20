# Codex task packet

Use with the [AI engineering workflow](../AI_ENGINEERING_WORKFLOW.md). This reusable packet is subordinate to [AGENTS.md](../../AGENTS.md) and the governing repository documents; it organizes a bounded task but grants no authority.

## TASK / CLASSIFICATION

- Objective: one bounded task.
- Type: `ASSESS | SPECIFY | IMPLEMENT` — select one; ASSESS remains read-only and SPECIFY does not imply runtime authorization.
- Risk: `R0 | R1 | R2 | R3` with a brief rationale.

## CODEX EXECUTION SETTINGS

For every substantive task, resolve this block before issuing the packet:

- Codex model: exact currently selectable label.
- Reasoning effort: exact currently selectable label.
- Why: brief task-specific capability/risk rationale.
- Escalate if: specific condition requiring stronger settings or a stop.

ChatGPT presents these same settings immediately before the paste-ready task for Product Owner visibility. Select the lowest-capability model and lowest effort reasonably likely to succeed; prefer increasing effort before model when the same model remains capable. Verify current availability when uncertain. Do not guess labels, use unresolved placeholders, or establish defaults. A substantive packet without this resolved block, rationale, or escalation condition is incomplete and must not be issued for Product Owner use.

## AUTHORIZATION / REPOSITORY STATE

- Current authorization and why the task is eligible under `PROJECT_STATE.md`, `docs/ROADMAP.md`, or another governing contract. Eligibility alone is not authorization.
- Expected branch:
- Expected base SHA/ref, when applicable:
- Working-tree/index assumptions and existing work/stashes to preserve:
- For publication-capable work: reviewed target-base SHA/ref, reviewed implementation-head SHA, expected remote target-base state, reviewed scope, and relevant review/validation/check evidence.

## AUTHORITY / SCOPE

- Governing documents and relevant requirement, acceptance, or contract sections, read in the order required by AGENTS.md. The task prompt does not outrank them.
- Allowed paths or explicitly bounded area, including any permitted existing changes. Do not infer permission for adjacent files.
- Required behavior: exact requirements, contract maturity, inputs/outputs, invariants, and failure behavior.

## NON-GOALS / DO NOT

- No unrelated refactors or fixes, speculative abstractions, unauthorized dependencies, future-stage implementation, or silent contract changes.
- Add task-specific exclusions, including publication, environment, and external-system boundaries.

## PRECHECK / EVIDENCE

- Verify branch/base, working-tree/index state, governing documents, scope, contract maturity, and compatibility with repository truth before edits; report meaningful precheck success.
- Review handoff for implementation: explain how the exact candidate will be inspectable. For a substantial/nontrivial local committed candidate, default to a standalone `.patch` outside the repository, equivalent to complete `git diff --full-index <base>..<head>` evidence including new files; do not commit, push, add it to the PR, or paste it inline by default. Report its base/head, path/name, byte size, SHA-256, changed-file count, and completeness. A genuinely small diff may be inline when more efficient or explicitly requested. An uncommitted candidate requires complete working-tree/index evidence; a remotely fetchable candidate must identify the authoritative source and exact base/head evidence. Disclose unavailable, partial, binary, or non-inline-reviewable evidence; do not push unreviewed work merely for inspection.

## BUILD-VS-BUY

Choose one and explain: `Not applicable`; `Existing accepted approach applies` with the governing decision; or `Required` — perform the AGENTS.md gate before implementation.

## ACCEPTANCE / VALIDATION / STOP

- Acceptance criteria: observable conditions and evidence for each.
- Validation: exact task-specific commands, repository-required checks, manual evidence, and accepted limitations.
- Stop conditions: workflow-default `BLOCKED` triggers plus task-specific triggers. Do not repair unexpected state or broaden scope without authorization.

## PUBLICATION AUTHORIZATION

Choose one explicit instruction:

- `NOT AUTHORIZED — stop after local validated commit` (only when local commit is authorized).
- `AUTHORIZED AFTER REVIEWED-HEAD CONFIRMATION` — record approved SHA, reviewed scope, exact push/PR/merge actions, required CI, and Product Owner merge authorization.
- Another repository-compatible instruction, such as read-only evidence or leaving implementation uncommitted.

For publication-capable work, record reviewed base/head/scope/evidence and expected remote target-base state; before publication or merge verify the live target base and state the base-match or bounded-base-movement disposition. After exact-head approval, any branch mutation creates a new unreviewed head under the workflow's reviewed-head rule. For ASSESS, authorize no edits or commits. Technical review never replaces Product Owner publication/merge authority.

## RETURN

Use [CODEX_RESULT.md](CODEX_RESULT.md), retaining all AGENTS.md delivery facts and applicable review/publication evidence. Report exact state, commands/results, scope, unavailable evidence, blockers, and the next gate; a recommendation does not authorize continuation.
