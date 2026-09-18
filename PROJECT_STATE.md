# Nightdrive Project State

## Current Phase

The external Stage 7 baseline package, completed Pass 1 and Pass 2 evidence, and policy-sensitivity diagnostic are locked in [Stage 7 Arpeggiator evaluation results](docs/reviews/STAGE7_ARPEGGIATOR_EVALUATION_RESULTS.md). No runtime defect was identified. V2 successor compatibility is accepted and merged through PR #109; the exact [R1 calibration candidate](docs/reviews/STAGE7_ARPEGGIATOR_V2_CALIBRATION.md) is documented for review. Stage 7 remains open.

## Current Milestone

Stage 7A, Stage 7B1–B4, and Stage 7C runtime through public `generateArpEventsWithPolicyV1` (PR #98) are accepted and merged. PR #109 accepted the exact V1/V2 compatibility pairs; V1 remains unchanged and replayable. The current documentation checkpoint freezes the numerical R1 candidate for review, without implementing V2 or defining its public request/result/error boundary. Aggregate provenance remains later.

## Recent Accepted Work

Stage 6A2 Bass V1 event generation is merged through PR #51 at `14191127ac861562332309cb30ea93961c9cda05`.

The straight-rhythm contract is merged through PR #52 at `fddc268e30bd365a9b6c04f3bc85fd2c4396f02e`.

The project-state maintenance workflow is merged through PR #53 at `45f831c6ea5fdc549a0176a2b3ed43b7f20ab842`.

The bounded Bass straight-rhythm production implementation is merged through PR #56 at `4cb0444d10cdd500bea1947680012e64087ad71b`.

## Repository State

Git refs are authoritative for the current `HEAD` and local/remote synchronization. This snapshot records coordination state and stable accepted PR/merge references; it does not predict or store the commit SHA that will contain its own current update.

## Current Gate

The completed [Stage 7 evaluation results](docs/reviews/STAGE7_ARPEGGIATOR_EVALUATION_RESULTS.md) close the baseline execution gate but not Stage 7 acceptance. Energy and especially Complexity sensitivity remain REVISE/open. R1 research is reviewed and its exact candidate tables are documentation-only and review-pending; deterministic gains do not establish human musical benefit. V2 runtime, comparative listening, aggregate provenance, and Stage 8 remain gated.

## Unresolved Risks

MIA-003 cross-platform line-ending/formatting policy remains deferred, non-blocking technical debt. MIA-004 is resolved/closed by PR #98, whose accepted evidence supplies the exact public Stage 7C structured-error codes/fields, mixed-invalid precedence, configuration translation, request-field ownership, and no-partial-result assertions. The previously reported Harmony timeout was resolved by MIA-001's test-only profile decomposition and five consecutive parallel-suite passes.

## Relevant Deferred Work

The completed evidence is an exploratory single-reviewer baseline, not a population claim. ND7-001 had prior non-scored setup exposure and is recorded as non-pristine first-exposure evidence. MIA-003 cross-platform line-ending/formatting policy remains deferred and non-blocking; aggregate provenance and later capabilities remain separately gated. See [roadmap](docs/ROADMAP.md).

## Next Eligible Task

After this R1 documentation checkpoint is accepted and merged, the next eligible task is a separately authorized exact V2 public request/result/error contract. Runtime implementation and matched V1/R1 human evaluation remain later gates. Stage 8 is not authorized.

## Maintenance

This file is a volatile coordination snapshot, not a requirements, architecture, contract, test, decision, roadmap, or history document. Replace stale state when coordination changes; keep permanent truth in authoritative documents and use Git for detailed history.
