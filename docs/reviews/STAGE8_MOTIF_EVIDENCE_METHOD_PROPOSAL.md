# Stage 8 Motif deterministic evidence method proposal

## Status and decision requested

PROPOSED; not accepted and not implementation authority. This document specializes the accepted [Stage 8 evidence contract](../TESTING_STRATEGY.md#stage-8-v1-motif-evidence-contract). It changes no musical behavior, canonical schema, Stage 8 exit requirement, or later-stage eligibility. External consequential review must return PASS, REVISE, or BLOCKED before this method is used to accept evidence.

The proposed choice is independently constructed semantic and representation expectations from frozen supplied Harmony. An alternative is production-derived musical snapshots with independent representation only; that alternative cannot independently establish Motif pitch selection and would require an explicit narrower claim plus separate semantic evidence. A renamed copy of the production projector is not independent semantic evidence. Recommend the independent method below because Motif's exhaustive path selection is the behavior under qualification.

## Reconciliation and preserved interrupted work

Live GitHub main, origin/main, and local main were verified at `81585bda44d0747216ad6de4b8e3489d9fdb0f05`, merged PR #229. The interrupted branch `codex/stage8-motif-qualification-vectors` contains one additional local commit, `4d1109b0026b1211c81c5c5537342aadeb930edf`, adding 24 candidate vectors, a builder, tests, and a writer. It has no remote tracking branch. Its index was empty; the builder was modified, writer deleted, and reference projector untracked. All that work remains preserved in its original checkout. This proposal is isolated from it.

The committed builder obtains expectations from the public production generator and serializer. The unfinished reference projector differs from production only in exported function/error names. The unfinished builder uses raw Harmony values where the canonical serializer requires versioned primitive wire wrappers. Under Node `24.21.0` and npm `11.19.0`, the focused suite returned two passes and one byte-comparison failure; TypeScript passed. The existing candidate JSON has no capture inventory. These facts prevent qualification claims; they do not establish a defect in accepted production output. No existing candidate or frozen evidence is overwritten or relabeled as accepted.

## Source and independence boundary

Use the four accepted literal Harmony snapshots in `src/evaluation/stage7-ac004-harmony-snapshots.ts` as supplied context, bound by immutable commit/path/raw-blob identities. Do not regenerate or modify them. They remain upstream input evidence, not Motif expectations. Record exact source-record identity, profile, template, Key, and all four slots for each request. Validate their compatibility with the accepted Motif request contract before capture.

Implement a separate evaluation-only reference from accepted documents: seed derivation, Mulberry32 transition, uint32-modulo choice, exact candidate/weight tables, catalogs, anchors, pitch vocabulary, complete-path constraints, Phrase-3 exact-preservation preference, ordinary lexicographic objective, plan/provenance construction, and wire representation. Independently encode contract facts; do not copy production algorithm source or use production results to select reference values. Record derivation provenance and review the algorithm against the mathematical contract before deriving an oracle.

Reference code must not import production Motif catalogs, profile tables/builders, seed/PRNG/choice implementations, generators, projectors, result builders, primitive serializers, or their transitive runtime values. Erased type-only imports are permitted. Shared standard JSON, UTF-8, integer arithmetic, and Node SHA-256 mechanisms are permitted. Frozen Harmony literals are permitted input data. Dependency inspection and prohibited-call tests must establish the actual boundary; a filename scan alone is insufficient.

The production comparison may use accepted constructors to reconstruct immutable valid requests, then call `generateMotifV1` and its serializer. It must be separate from reference derivation and must never supply expected bytes. The reference serializer independently emits all nested primitive wire identities and field names required by the accepted Motif and primitive contracts, including Key, Chord, ChordInversion, and ChordVoicing. Raw domain objects are not substitutes for wire embeddings.

## Bounded representative matrix and coverage

Retain the interrupted candidate's proposed 24 request identities as the initial matrix, without accepting its outputs: four source records in the order below, each crossed with intent pairs `(low, low)`, `(medium, medium)`, `(high, high)` in that order, then root seeds `0`, `4294967295` in that order.

1. `dark-synthwave-chorus-001`
2. `classic-synthwave-chorus-001`
3. `darkwave-verse-001`
4. `cyberpunk-build-001`

Every request uses the exact V1 identities and supplied-context contract in [Motif model](../MOTIF_MODEL.md). Vector IDs are source-record ID, energy, complexity, and eight-digit lowercase hexadecimal seed joined with hyphens. Store fully expanded input values, not moving references or shorthand deltas. Explanatory Harmony fields needed to construct a valid request are fixed evidence metadata, excluded from canonical Motif Harmony provenance as required by the production contract.

This matrix is representative byte/replay evidence, not exhaustive musical coverage. It does not replace all 400 policy-list checks, all 25 intent combinations, exact draw-schedule/isolation tests, public-error/adversarial tests, or focused projector evidence. Before acceptance, retain a coverage report listing every row's selected four policy values, event count, pitch span, phrase boundaries, and Phrase-3 exact-preservation/fallback disposition. Link the accepted focused fixtures proving both Phrase-3 branches and deterministic tie-breaking. Do not infer those branches from profile/seed counts. Any infeasible row or discrepancy stops capture for investigation; no seed search, row substitution, fallback, or silent expectation regeneration is allowed. A matrix revision requires renewed method review.

## Candidate capture and byte custody

First review and commit the reference tools and source bindings. Capture only from that exact clean reviewed commit using pinned Node `24.21.0`, npm `11.19.0`, and the locked dependency tree. Retain the exact invocation, UTC timestamp, exit code, and output. Write to a new explicit artifact path with exclusive creation; regression tests never write expectations. Preserve the interrupted candidate as historical unaccepted evidence.

Keep separate, acyclic records for source/tool provenance, candidate vectors, independent recomputation, and acceptance. Each candidate vector retains its complete normalized request, exact canonical result JSON string, UTF-8 result length, and lowercase SHA-256. Include ordered vector IDs and a CANDIDATE status. A request serialization is evidence-only and must not be presented as a new public canonical request schema. The envelope records exact source/tool manifest identities; manifests do not contain their own digests or depend on future commits. The captured artifact's raw-byte identity is recorded separately.

Apply ADR-024's distinct claims without waivers: inventory every execution-relevant tracked source/tool/configuration/lock file at its explicitly recorded immutable commit, in ordinal path order, with raw Git-blob byte length and SHA-256; record Git object IDs separately. Retain separately inspected capture and verification checkout bytes and explain applicable line-ending transformations from attributes/settings. Verify the actual runtime, npm, installed packages and platform binaries used. A locked version string alone is not actual-tool evidence. Required absent inputs, unexplained transformations, dirty capture state, mismatches, or unverified tools fail closed. Do not repair bytes or normalize artifacts to pass custody.

Before freeze, independently recompute every literal string's UTF-8 length and SHA-256 and the complete artifact raw-byte identity in a separate process with a second standard implementation, such as PowerShell/.NET. Retain commands, versions, inputs, and outputs. Reference digest tests include fixed empty, ASCII, and non-ASCII known answers. Independently inspect reference values against the accepted musical and representation contracts; digest equality alone proves no musical semantics. Acceptance binds the complete method/source/tool/candidate identities and recomputation evidence. Status or envelope changes require a new artifact digest without rewriting the original capture identity.

## Qualification and limits

Only accepted/frozen vectors may become authoritative regression expectations. Compare production result values and exact canonical bytes against them without writing. Run at least two fresh processes on each supported member: Windows ARM64 and Linux x64, with the pinned Node/npm versions and verified locked tooling. Preserve each complete ordered report and compare all rows' canonical strings, UTF-8 lengths, digests, input bindings, and frozen-artifact identities with zero tolerance across processes and platforms. Missing rows, duplicate identities, errors, or incomplete custody are failures, not skips or PASS defaults.

Run the existing full repository validation and all relevant First Playable, Stage 7, Harmony, Bass, and Arpeggiator regressions. Verify accepted frozen artifacts remain byte-identical. Publish a qualification record linking exact tested commits/trees, platform/tool evidence, reports, CI jobs/artifacts, review, and limitations. CI green status alone is insufficient. No broad AC-004 claim precedes both supported-platform evidence sets and exact comparison.

AC-012/004/013 and applicable AC-029 evidence remain conjunctive with the accepted focused semantic/negative tests. Structured human musical acceptance remains separate and follows deterministic qualification. This method grants no First Playable integration, browser generation, audio, MIDI, UI, persistence, or Stage 9 authority.

## Build versus buy and execution sequence

Classification: mixed. Nightdrive owns the contract-specific reference semantics and ordered representation; existing standard JSON/UTF-8/SHA-256 and test/process tools supply commodity mechanisms. No dependency is proposed. A general canonical JSON package would not supply the accepted schema-directed key order or independent musical oracle.

After external method acceptance: implement and independently review the reference/source tooling; capture new candidate evidence with complete custody; independently inspect/recompute and explicitly accept/freeze that evidence; implement production comparison and supported-platform qualification under this settled method; reconcile completion; then address the separate structured musical-review disposition. Each is a separately bounded task with required exact-head review, CI, and protected publication. The interrupted work is resumed as historical starting material, never silently promoted into an accepted oracle.
