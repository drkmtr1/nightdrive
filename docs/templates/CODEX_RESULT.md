# Codex result evidence

This is a supplement/superset of the [AGENTS.md delivery-report requirements](../../AGENTS.md#delivery-report), not a replacement. Use with the [AI engineering workflow](../AI_ENGINEERING_WORKFLOW.md), distinguish observed results from assumptions/checks not run, and remember that `PASS` applies only to this bounded task. Standing progression still requires independent repository eligibility for each next task.

## RESULT / TASK

- Result: `PASS | BLOCKED` — include the blocker when blocked.
- Task completed: concise description; distinguish completed and remaining work when blocked.
- Task type: `ASSESS | SPECIFY | IMPLEMENT`.
- Risk class: `R0 | R1 | R2 | R3` with rationale.
- Execution settings: recommended/requested model and effort; effective settings if observable; configuration method or limitation. Do not infer an actual switch from task text.

## REPOSITORY STATE

- Base: exact starting SHA/ref and precheck result.
- Branch:
- Commit: exact resulting SHA, or `NONE`; include final working-tree/index state.
- For publication-capable work: reviewed target base; reviewed implementation head; live target base immediately before publication/merge; remote PR head and branch; base-match/base-movement disposition; merge commit; final target-branch SHA; and ancestry/integration verification. If the base moved, record bounded assessment/refreshed evidence or `BLOCKED`; never imply automatic repair or unchanged approval.

## FILES / IMPLEMENTATION

- Files modified: exact list, identifying new files and purpose; `NONE` for read-only work.
- Implementation: what changed. For ASSESS/SPECIFY, use runtime `N/A` where appropriate and describe the investigation/specification evidence instead.

## ACCEPTANCE / VALIDATION

- Acceptance verification: map every criterion to evidence and identify unmet/unverified conditions; reserve subjective product or musical acceptance for the Product Owner.
- Tests/validation: exact commands and results, failures, and checks not run with reasons; do not present inherited evidence as freshly executed.
- Diff check: `PASS | FAIL | N/A` with command/result or reason.

## REVIEW EVIDENCE

For implementation review, report:

- Evidence supplied directly:
- Evidence fetched or available from an authoritative source:
- Exact base/head or working-tree/index state covered:
- Changed-file scope covered:
- Completeness: `COMPLETE | PARTIAL | N/A`:
- Unavailable/partial evidence and resulting review limitations:

For substantial/nontrivial local committed candidates, default to a standalone `.patch` outside the repository, equivalent to complete `git diff --full-index <base>..<head>` evidence including new files. Report its filename/path, byte size, SHA-256, changed-file count, and complete base-to-head coverage confirmation. Do not emit the complete patch inline unless the task or reviewer explicitly requests it. A genuinely small diff may be supplied inline when more efficient. Local committed candidates still require complete base-to-head evidence; uncommitted candidates require complete working-tree/index evidence; remotely fetchable candidates must identify the authoritative source and exact base/head evidence. Patch metadata, validation, scope summaries, or commit messages do not replace inspection of actual candidate content. Partial evidence cannot support exact-head implementation approval.

## BUILD-VS-BUY / DEPENDENCIES

State applicability/classification, dependency changes, governing decision, selected approach, rationale, boundary impact, and required AGENTS.md alternatives/evidence. Explain any `N/A`.

## IMPACT / CONTRACTS

- Architecture/docs changes: exact impact and authoritative documents affected or preserved.
- UX/accessibility: evidence, or `N/A` with a reason when truly inapplicable.
- Supabase changes: `NONE` unless authorized.
- Deployment changes: `NONE` unless authorized.
- Contract changes: `NONE` or exact authorized details.

## PUBLICATION / INTEGRATION

State exact push/PR/check/merge status, whether the reviewed head remains unchanged, and—when applicable—the reviewed-base/implementation-head/PR-head/merge-commit/final-target relationship, ancestry, and whether merged scope matches review. Exact-head PASS may progress through publication and merge under standing execution authority only when repository eligibility, required checks, and Product Owner-set Git policy permit it.

## DEVIATIONS / ASSUMPTIONS / RISKS / QUESTIONS

- Scope deviation: `NONE` or exact details, including any stop and authorization needed.
- Assumptions: `NONE` or exact details.
- Remaining risks: `NONE` or exact details; keep uncertainty and deferred work explicit.
- Open questions: `NONE` or exact decisions needed.

For `BLOCKED`, clearly state the blocker, verified repository state, work/evidence completed, unsafe or unauthorized next action, and decision/authorization required. ASSESS and SPECIFY results report evidence appropriate to their type rather than fabricated implementation evidence.

For a resumable checkpoint, record the current bounded task, actual base/head and worktree state, completed checks, unresolved findings, review disposition, and next safe action. A resumed session rechecks refs, working state, authority, and review validity before acting; it does not assume that this result restarted or contacted another session.

## NEXT SMALLEST BACKLOG TASK

Recommend or select only the smallest eligible follow-up. During the active session, Codex may begin a subsequent bounded task under standing execution authority when repository truth independently establishes eligibility and the current task's stop boundary has been honored. Stop when no next task is eligible or required independent review is unavailable.

> Recommendation alone does not make a future capability eligible.
