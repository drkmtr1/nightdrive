# Codex task packet

Use with the [AI engineering workflow](../AI_ENGINEERING_WORKFLOW.md). Complete the fields for one bounded task; this packet is subordinate to [AGENTS.md](../../AGENTS.md) and the governing repository documents, not an alternative source of authority.

## TASK

One bounded objective.

## TASK TYPE

`ASSESS | SPECIFY | IMPLEMENT` — select one and explain if necessary.

## RISK CLASS

`R0 | R1 | R2 | R3` — select one with a brief rationale.

## CURRENT AUTHORIZATION

State the explicit authorization and why this task is currently eligible under PROJECT_STATE.md, docs/ROADMAP.md, or another governing contract. Eligibility alone is not authorization.

## BASE / REPOSITORY STATE

- Expected branch:
- Expected base SHA/ref, when applicable:
- For publication-capable tasks, reviewed target-base SHA/ref used for technical review:
- For publication-capable tasks, reviewed implementation-head SHA:
- For publication-capable tasks, expected target-base state immediately before publication (normally unchanged):
- For publication-capable tasks, reviewed file scope and relevant review/validation/check evidence:
- Working-tree/index assumptions and existing work/stashes to preserve:

## AUTHORITY

List exact governing documents and relevant requirement/acceptance IDs or contract sections. Read in the order required by AGENTS.md. The task prompt does not outrank them.

## ALLOWED SCOPE

Expected/allowed paths or an explicitly bounded area. Identify any permitted existing changes; do not infer permission for adjacent files.

## REQUIRED BEHAVIOR

Exact requirements, contract maturity, inputs/outputs, invariants, and failure behavior applicable to this task.

## NON-GOALS / DO NOT

- No unrelated refactors or fixes.
- No speculative abstractions or unauthorized dependencies.
- No future-stage implementation or silent contract changes.
- Add task-specific exclusions, including publication and environment boundaries.

## PRECHECK

Verify branch/base, working-tree/index state, governing documents, file scope, contract maturity, and compatibility with repository truth before edits. Explicitly report precheck success for meaningful implementation. ASSESS remains read-only.

## REVIEW EVIDENCE HANDOFF

For implementation tasks that will undergo review, state how the exact candidate will be made inspectable when applicable:

- Local-only committed candidate: provide the complete base-to-head diff, including new files, or an equivalent complete artifact tied to the exact base/head.
- Uncommitted candidate: provide complete working-tree/index candidate evidence without inferring a commit requirement.
- Remotely fetchable candidate: identify the authoritative source and exact base/head evidence actually fetched; do not duplicate a complete diff solely because this template exists.
- Disclose unavailable, partial, binary, or otherwise non-inline-reviewable evidence and any resulting review limitation. Do not require pushing unreviewed work merely for inspection.

## BUILD-VS-BUY

Select one:

- `Not applicable` — explain briefly.
- `Existing accepted approach applies` — cite the governing repository decision.
- `Required` — perform the AGENTS.md Build-vs-Buy gate before implementation.

## ACCEPTANCE CRITERIA

List observable conditions and the evidence required to verify each.

## VALIDATION

List exact task-specific commands and repository-required checks, plus applicable manual evidence. State any accepted limitation without weakening required checks.

## STOP CONDITIONS

Apply the workflow's default `BLOCKED` conditions and list task-specific triggers. Do not repair unexpected state or broaden scope without authorization.

## PUBLICATION AUTHORIZATION

Choose an explicit instruction:

- `NOT AUTHORIZED — stop after local validated commit` (only if local committing is authorized).
- `AUTHORIZED AFTER REVIEWED-HEAD CONFIRMATION` — record approved SHA, reviewed scope, and exact permitted push/PR/merge actions; preserve required CI and Product Owner merge authorization.
- Another explicit repository-compatible instruction, such as read-only evidence with no commit, or implementation left uncommitted for review.

For publication-capable tasks, also record the reviewed target base, reviewed implementation head, reviewed scope, relevant evidence, and the expected current remote target-base state. Before publication/merge, verify the live target base and state the base-match or bounded-base-movement disposition; do not infer authorization from technical approval alone.

For ASSESS, authorize no edits or commits. Do not infer publication from permission to implement or commit.

## RETURN

Return evidence using the [Codex result template](CODEX_RESULT.md), including the applicable review-evidence handoff and its exact base/head or working-tree coverage. Retain all AGENTS.md delivery requirements. Report exact state, commands/results, scope, unavailable evidence, and blockers. Stop at this task's gate; a recommendation does not authorize continuation.
