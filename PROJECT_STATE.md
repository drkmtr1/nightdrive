# Nightdrive Project State

## Current Phase

The Stage 7 baseline evidence and policy-sensitivity diagnostic are recorded in [evaluation results](docs/reviews/STAGE7_ARPEGGIATOR_EVALUATION_RESULTS.md). V2 successor compatibility is accepted through PR #109; the exact [R1 calibration dataset](docs/reviews/STAGE7_ARPEGGIATOR_V2_CALIBRATION.md) is accepted for dataset-only use at fingerprint `b6f7ee16f33cf649ae2c6f06e4b5eecf859409b1917e2bc641323857fc1956e8`. The complete [V2 public request/result/error contract](docs/ARPEGGIATOR_MODEL.md) is accepted and merged through PR #111 at approved head `f505dc7c14dc83b50c800986d883f7fe5d5da704` with merge commit `b3a42464ea44450bb017a1c65dd316d0d069c191`. The public V2 Arpeggiator operation is accepted and merged through PR #131 at approved head `a687433674e4c75f66a5ade99913ff46178a8e71` with merge commit `2257fb1f19325875f47c0940283cc3dd87897d60`. Stage 7 remains open.

## Current Milestone

The bounded frozen-R1 test-only diagnostic is accepted and merged through PR #114 at approved head `6631da6dd2d601032fe8f6aa27bf654960b1e4ac` with merge commit `9c985cfbea939bded4737676356047c51efe6c01`. It reproduces the documented collision totals and preservation anchors without modifying V1/R1 data or implementing V2 runtime. R1-REV-001 is PARTIALLY CLOSED: frozen-candidate numerical reproduction is satisfied; historical search execution, finalist selection, and no-retuning chronology remain unreproduced.

Stage 7A, Stage 7B1–B4, and Stage 7C runtime through public `generateArpEventsWithPolicyV1` (PR #98) are accepted and merged. PR #109 accepted exact V1/V2 compatibility pairs; V1 remains unchanged and replayable. [ADR-020](docs/DECISIONS.md) and the complete [V2 request/result/error contract](docs/ARPEGGIATOR_MODEL.md) are accepted and merged through PR #111 at approved head `f505dc7c14dc83b50c800986d883f7fe5d5da704` with merge commit `b3a42464ea44450bb017a1c65dd316d0d069c191`. The V2 profile-data foundation (PR #125), shared policy/compatibility foundation (PR #127), and resolver adaptation (PR #129) are accepted and merged. The public `generateArpEventsWithPolicyV2` operation is accepted and merged through PR #131 at approved head `a687433674e4c75f66a5ade99913ff46178a8e71` with merge commit `2257fb1f19325875f47c0940283cc3dd87897d60`; deterministic V2 runtime implementation is complete through that public operation. Runtime completion alone does not establish musical acceptance; the Product Owner's bounded acceptance is recorded in the evaluation-results document. The Stage 7 aggregate/provenance specification is accepted and merged through PR #143 at approved head `25b63ad210a1f9edffe412ecefa34bfaec278a6c` with merge commit `9223c9710c31b1830dd24cfe92207cbec22516c8`.

## Repository State

Git refs are authoritative for the current `HEAD` and local/remote synchronization. This snapshot records coordination state and stable accepted PR/merge references; it does not predict or store the commit SHA that will contain its own current update.

## Current Gate

The Stage 7 aggregate canonical foundation is accepted and merged through PR #144. The deterministic UTF-8/SHA-256 adapter is accepted and merged through PR #147 at approved head `7603a76c413ade8eb1b406509ebd34245cc5bcf1` with merge commit `a3caa041d35ecbaea370a123dbca5eb2afb4eb2d`. Component canonical projections and component-hash construction are accepted and merged through PR #149 at approved head `6273ea9712532c8824c3217bb7186830af765fec` with merge commit `3b273a8d5b71da531eb9f61acbf9af982fdd8e97`. The next eligible gate is a separately authorized R2 implementation of aggregate `resultHash` construction with exact self-exclusion semantics; digest verification, aggregate preflight/orchestration, and full pinned-Node AC-004 evidence remain separately gated.

The [Product Owner R1/V2 acceptance and comparison override](docs/reviews/STAGE7_ARPEGGIATOR_EVALUATION_RESULTS.md#product-owner-r1v2-acceptance-and-comparison-override) is accepted and merged through PR #142. The Product Owner accepts current R1/V2 behavior for continued development after personally listening to/analyzing the first 35 presented fixtures, together with existing deterministic and prior evidence. The remaining 245 Pass 1 judgments, full Pass 1 completion/lock, and Pass 2 are waived as prerequisites for that product acceptance. Pass 1 is incomplete/unlocked; Pass 2 was not executed; the 280-fixture protocol did not complete or pass. No profile/root/panel coverage is inferred from the 35-fixture count.

The accepted comparison protocol (PR #135), tooling (PR #137), generated package, accepted design/package locks, and accepted blank response instruments remain preserved; their remaining execution path is superseded, not completed. Baseline findings and deterministic limitations remain documented. V1 replay and ADR-019/020/021 semantics are unchanged. No further listening or mapping reveal is authorized. Stage 7 remains open for aggregate generator/provenance integration and complete exit-evidence reconciliation; Stage 8 remains unauthorized.

## Unresolved Risks

MIA-003 cross-platform line-ending/formatting policy remains deferred, non-blocking technical debt. MIA-004 is resolved/closed by PR #98, whose accepted evidence supplies the exact public Stage 7C structured-error codes/fields, mixed-invalid precedence, configuration translation, request-field ownership, and no-partial-result assertions. The previously reported Harmony timeout was resolved by MIA-001's test-only profile decomposition and five consecutive parallel-suite passes.

## Relevant Deferred Work

The completed evidence is an exploratory single-reviewer baseline, not a population claim. ND7-001 had prior non-scored setup exposure and is recorded as non-pristine first-exposure evidence. MIA-003 cross-platform line-ending/formatting policy remains deferred and non-blocking; aggregate orchestration, hashing/integrity verification, AC-004 environment evidence, and later capabilities remain separately gated. See [roadmap](docs/ROADMAP.md).

## Next Eligible Task

Implement the separately authorized R2 Stage 7 aggregate `resultHash` construction with exact self-exclusion semantics under the accepted [Stage 7 aggregate/provenance specification](docs/COMPOSITION_ENGINE.md#stage-7-aggregate-generation-contract). Digest verification, aggregate preflight/orchestration, and full pinned-Node AC-004 evidence remain later gates. Stage 7 remains open and Stage 8 unauthorized. AC-011/AC-013 remain satisfied, R1-REV-001 remains partially closed, and MIA-003 remains deferred/non-blocking.

## Maintenance

This file is a volatile coordination snapshot, not a requirements, architecture, contract, test, decision, roadmap, or history document. Replace stale state when coordination changes; keep permanent truth in authoritative documents and use Git for detailed history.
