# Nightdrive Project State

## Current Phase

The Stage 7 baseline evidence and policy-sensitivity diagnostic are recorded in [evaluation results](docs/reviews/STAGE7_ARPEGGIATOR_EVALUATION_RESULTS.md). V2 successor compatibility is accepted through PR #109; the exact [R1 calibration dataset](docs/reviews/STAGE7_ARPEGGIATOR_V2_CALIBRATION.md) is accepted for dataset-only use at fingerprint `b6f7ee16f33cf649ae2c6f06e4b5eecf859409b1917e2bc641323857fc1956e8`. The complete [V2 public request/result/error contract](docs/ARPEGGIATOR_MODEL.md) is accepted and merged through PR #111 at approved head `f505dc7c14dc83b50c800986d883f7fe5d5da704` with merge commit `b3a42464ea44450bb017a1c65dd316d0d069c191`. Stage 7 remains open.

## Current Milestone

The bounded frozen-R1 test-only diagnostic is accepted and merged through PR #114 at approved head `6631da6dd2d601032fe8f6aa27bf654960b1e4ac` with merge commit `9c985cfbea939bded4737676356047c51efe6c01`. It reproduces the documented collision totals and preservation anchors without modifying V1/R1 data or implementing V2 runtime. R1-REV-001 is PARTIALLY CLOSED: frozen-candidate numerical reproduction is satisfied; historical search execution, finalist selection, and no-retuning chronology remain unreproduced.

Stage 7A, Stage 7B1–B4, and Stage 7C runtime through public `generateArpEventsWithPolicyV1` (PR #98) are accepted and merged. PR #109 accepted exact V1/V2 compatibility pairs; V1 remains unchanged and replayable. [ADR-020](docs/DECISIONS.md) and the complete [V2 request/result/error contract](docs/ARPEGGIATOR_MODEL.md) are accepted and merged through PR #111 at approved head `f505dc7c14dc83b50c800986d883f7fe5d5da704` with merge commit `b3a42464ea44450bb017a1c65dd316d0d069c191`. V2 runtime remains unimplemented and separately gated. Aggregate provenance remains later.

## Repository State

Git refs are authoritative for the current `HEAD` and local/remote synchronization. This snapshot records coordination state and stable accepted PR/merge references; it does not predict or store the commit SHA that will contain its own current update.

## Current Gate

The completed [Stage 7 evaluation results](docs/reviews/STAGE7_ARPEGGIATOR_EVALUATION_RESULTS.md) close the baseline execution gate but not Stage 7 acceptance. Energy and especially Complexity sensitivity remain REVISE/open. The complete V2 public contract and exact R1 dataset are accepted; deterministic gains do not establish human musical benefit. Arithmetic, hash, structure, and permitted-delta evidence were independently verified, while collision totals are now reproduced by the accepted retained diagnostic; historical search execution, finalist selection, and no-retuning chronology remain unreproduced. The V2 internal profile-configuration clarification is accepted and merged through PR #116, the V2 profile-data foundation Slice 1 is accepted and merged through PR #125 at approved head `0d33abb8e21cc185cecd4de5f3cdf194dde114f6` with merge commit `bc9c13da0790bf5be8d6afbf4f8e675d736f23ee`, and the V2 shared policy/compatibility configuration foundation is accepted and merged through PR #127 at approved head `5f8c4c26dcbfe39954a40c4a4073e8149b51a5fb` with merge commit `51d450f08ef31778ec11f2702be0006b40ea67d4`. V1 remains unchanged and replayable. V2 resolver adaptation remains unimplemented and separately gated; the public V2 operation remains a later separately gated boundary. Matched V1/R1 comparative listening, aggregate provenance, and Stage 8 remain gated.

## Unresolved Risks

MIA-003 cross-platform line-ending/formatting policy remains deferred, non-blocking technical debt. MIA-004 is resolved/closed by PR #98, whose accepted evidence supplies the exact public Stage 7C structured-error codes/fields, mixed-invalid precedence, configuration translation, request-field ownership, and no-partial-result assertions. The previously reported Harmony timeout was resolved by MIA-001's test-only profile decomposition and five consecutive parallel-suite passes.

## Relevant Deferred Work

The completed evidence is an exploratory single-reviewer baseline, not a population claim. ND7-001 had prior non-scored setup exposure and is recorded as non-pristine first-exposure evidence. MIA-003 cross-platform line-ending/formatting policy remains deferred and non-blocking; aggregate provenance and later capabilities remain separately gated. See [roadmap](docs/ROADMAP.md).

## Next Eligible Task

The next eligible gate is a separately authorized bounded V2 resolver-adaptation slice. Resolver adaptation remains unimplemented and unauthorized; the public V2 operation remains later and separately gated. Matched V1/R1 human evaluation, aggregate provenance, and later Stage 7 work remain gated. Stage 8 is not authorized.

## Maintenance

This file is a volatile coordination snapshot, not a requirements, architecture, contract, test, decision, roadmap, or history document. Replace stale state when coordination changes; keep permanent truth in authoritative documents and use Git for detailed history.
