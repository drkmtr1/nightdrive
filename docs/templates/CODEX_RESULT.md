# Codex result evidence

This is a supplement/superset of the [AGENTS.md delivery-report requirements](../../AGENTS.md#delivery-report), not a replacement. Use with the [AI engineering workflow](../AI_ENGINEERING_WORKFLOW.md); retain task-specific evidence. Distinguish observed results from assumptions and checks not run. `PASS` concerns this bounded task, not automatic milestone, musical, or release acceptance.

## RESULT

`PASS | BLOCKED` — state the outcome and any blocking reason.

## TASK COMPLETED

Concise description; if blocked, distinguish completed work from remaining work.

## TASK TYPE

`ASSESS | SPECIFY | IMPLEMENT`

## RISK CLASS

`R0 | R1 | R2 | R3` with rationale.

## BASE

Exact starting SHA/ref and precheck result.

## BRANCH

Exact branch.

## COMMIT

Exact resulting SHA if created; otherwise `NONE`. Include final working-tree/index state.

## FILES MODIFIED

Exact list, identifying new files and each purpose; `NONE` for read-only work.

## IMPLEMENTATION

What changed. For ASSESS/SPECIFY, use `N/A` for runtime implementation where appropriate and describe the investigation or specification evidence instead.

## ACCEPTANCE VERIFICATION

Map each acceptance criterion to concrete evidence; identify unmet or unverified conditions.

## TESTS / VALIDATION

Exact commands and results, including failures and checks not run with reasons. Do not present inherited evidence as a fresh execution.

## DIFF CHECK

`PASS | FAIL | N/A` with command/result or reason.

## BUILD-VS-BUY / DEPENDENCIES

State applicability, classification, dependency changes, and governing accepted decision if applicable. Supply the existing AGENTS.md gate's required alternatives, selected approach, rationale, boundary impact, and dependency evidence when applicable; explain any `N/A`.

## ARCHITECTURE / DOCS CHANGES

Exact impact, including authoritative documents affected or preserved.

## UX / ACCESSIBILITY

Verification evidence, or `N/A` with reason when truly not applicable.

## SUPABASE CHANGES

`NONE` unless authorized; otherwise exact changes and verification.

## DEPLOYMENT CHANGES

`NONE` unless authorized; otherwise exact changes and verification.

## CONTRACT CHANGES

`NONE` or exact authorized details.

## SCOPE DEVIATION

`NONE` or exact details, including any stop and authorization needed.

## ASSUMPTIONS

`NONE` or exact details.

## REMAINING RISKS

`NONE` or exact details; keep uncertainty and deferred work explicit.

## PUSH / PR STATUS

Exact publication state: not pushed, or remote/head, PR and checks, merge status if authorized. State whether the reviewed head remains unchanged.

## OPEN QUESTIONS

`NONE` or exact decisions needed.

## NEXT SMALLEST BACKLOG TASK

Recommend only the smallest eligible follow-up, without beginning it.

> Recommendation does not authorize the next task.
