# Stage 8 Motif 24-row representative-matrix coverage report

**Status:** EVIDENCE CANDIDATE; independent review pending.
**Generated UTC:** 2026-09-30 08:11:07 UTC.
**Finding:** S8-QUAL-001-CLOSURE-REV-001.

## Purpose and authority

This record answers the accepted Stage 8 Motif evidence-method requirement to retain a coverage report for every row in the fixed 24-request representative matrix. It uses the integrated evaluation-only independent reference chain and does not change its algorithm, expectations, source records, or policy.

The candidate reference artifact returned by the builder remains CANDIDATE. This report is not a captured or frozen vector artifact, a production comparison, supported-platform qualification, musical acceptance, Stage 8 exit, or finding closure. S8-QUAL-001 remains OPEN pending its independent closure review; S8-QUAL-002 and S8-QUAL-003 remain OPEN.

Authority: [accepted Stage 8 evidence method](STAGE8_MOTIF_EVIDENCE_METHOD_PROPOSAL.md), [accepted Motif projection contract](../MOTIF_MODEL.md), [Stage 8 test contract](../TESTING_STRATEGY.md#stage-8-v1-motif-evidence-contract), and [forward-looking S8-QUAL-001 definition](STAGE8_MOTIF_QUALIFICATION_FINDING_REPLACEMENTS.md#s8-qual-001--independent-semanticreference-evidence-completeness).

## Source and runtime provenance

- Local source checkout commit: fd23413f971ccb2e8af40928e0801dacbb4b5715.
- Local source tree: 952ed30ef2b830b4aacf7d39831c7e872550acec.
- The prior post-PR #269 reconciliation recorded protected main at 1a0d66fa6d3b3275c14b66da71a5686d1dae92b7 with this same tree. That merge commit object is not present in this local clone, and a live GitHub ref query failed with a connection error. Therefore this run binds directly to the locally available fd23413 commit/tree and does not claim a fresh live-main or ancestry check. Its source tree is byte-identical to the previously verified integration tree.
- Accepted frozen Harmony source: commit c67295bde50b599caba90f0433352815ebac9bc7; path src/evaluation/stage7-ac004-harmony-snapshots.ts; Git blob c9ea54f1b7b6a533724fb9782ac816e2b80f9422.
- Source-binding implementation blob: aa1d9d0e0d9b350cf780b7540c02e97d89ef1ca8. It binds the four source-record IDs listed below to that immutable snapshot source.
- package-lock.json blob: 737f41b5e4eac986604ef6bbab323314c1c0f119; raw SHA-256: 0DBB500F09ABFEA29C7D4AAB2079F5F5DF3956CECE7CBB027E5ACF1D86ED9464.
- Runtime: Node.js 24.19.0, Windows ARM64; Vitest 5.0.0 from the existing lock-aligned local installation. npm was not invoked and no package installation or registry access occurred. The accepted pinned Node 24.21.0 / npm 11.19.0 environment remains required for later capture; no capture occurred here.

The tested source and test identities are recorded by Git blob below. All are from the local source tree above.

| Source or evidence file | Git blob |
|---|---|
| src/evaluation/stage7-ac004-harmony-snapshots.ts | c9ea54f1b7b6a533724fb9782ac816e2b80f9422 |
| src/evaluation/stage8-motif-source-bindings.ts | aa1d9d0e0d9b350cf780b7540c02e97d89ef1ca8 |
| src/evaluation/stage8-motif-source-bindings.test.ts | 3a8ab39a2de119131ca3256cbb5fb49b0a4e8129 |
| src/evaluation/stage8-motif-reference-primitives.ts | d379f4cb7eea5244975e11f24de0f4352c044ac1 |
| src/evaluation/stage8-motif-reference-primitives.test.ts | 65abd05d683c300f2d44a9dadfd171d5cc3764fc |
| src/evaluation/stage8-motif-reference-primitives-independence.test.ts | c23464c23b1071ab7b1e6b7773d32047896f80ff |
| src/evaluation/stage8-motif-reference-policy.ts | 7e2aa97099fa200ce7bf550506c398fc6e9e37a0 |
| src/evaluation/stage8-motif-reference-policy.test.ts | 24c25fde505369d6d8eddf8abbd4fc9ec3b5f59d |
| src/evaluation/stage8-motif-reference-policy-independence.test.ts | 96086652229ec0f27f8515eab29ae00a7506862a |
| src/evaluation/stage8-motif-reference-plan-resolution.ts | 441d94e35f8380dd07ed7eae5b993fc0906b30c8 |
| src/evaluation/stage8-motif-reference-plan-resolution.test.ts | a10409dee7d89bb355e6d48fbc26bb689aacf11e |
| src/evaluation/stage8-motif-reference-plan-resolution-independence.test.ts | b114cc39e2da0fd69747177cb7f2118f15c630ee |
| src/evaluation/stage8-motif-reference-projector.ts | d45fb51cbcc2010a9255cf110d79ca877e145f73 |
| src/evaluation/stage8-motif-reference-projector.test.ts | ced06c9f3866d09a654bf7ee48e0bbd56b3b2eca |
| src/evaluation/stage8-motif-reference-projector-independence.test.ts | b44c3e6ad96e3fd9b847f272f323f1ec2bdb0898 |
| src/evaluation/stage8-motif-candidate-vectors.ts | eaf41c300df423ec6713825cbd96bdef201f27ad |
| src/evaluation/stage8-motif-candidate-vectors.test.ts | 4895867f629ca59e8222cdceecd5e7c0ffe58643 |
| src/evaluation/stage8-motif-candidate-vectors-independence.test.ts | 6542540442c79ddfae789431162efe876cf09582 |

## Bound extraction procedure

Command executed from the clean source checkout:

    C:\\Users\\WILLI\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe C:\\Users\\WILLI\\Projects\\nightdrive\\node_modules\\vitest\\vitest.mjs run --config vitest.config.ts --root . src/evaluation/stage8-motif-coverage-extraction.test.ts --reporter=verbose

The temporary one-test extraction imported only buildStage8MotifCandidateArtifact from src/evaluation/stage8-motif-candidate-vectors.ts. It parsed each returned reference resultJson, took the four policy selections from its independent reference plan, and computed event count and min/max/span from its reference events. It grouped events by the fixed half-open two-bar regions [0,7680), [7680,15360), [15360,23040), and [23040,30720) ticks; every onset and duration was checked to remain inside its assigned phrase. Each table row reports P1, P2, P3, and P4 event counts in that order.

For Phrase 3, the procedure computed the ordered semitone-interval arrays from the actual reference pitches in P1 and P3. Equality is direct row evidence of a complete exact-preservation path in the returned legal path; the accepted reference projector uses the exact-path search before its ordinary fallback. The per-row disposition was derived from those arrays, not inferred from profile, intent, or seed counts. The 24 matrix rows all selected an exact-preservation output; none selected ordinary fallback. This does not claim fallback coverage in the representative matrix.

The builder result remained CANDIDATE. No production Motif generator, production projector, or production serializer was imported, invoked, or used as an expectation. The integrated candidate-vector independence test inspects the transitive runtime graph and blocks production modules and ambient entropy.

## Frozen source-record bindings

| Matrix order | Source record ID | Profile | Harmony template | Frozen source identity |
|---:|---|---|---|---|
| 1 | dark-synthwave-chorus-001 | dark-synthwave | degree-0654-natural-minor-v1 | c67295bde50b599caba90f0433352815ebac9bc7:src/evaluation/stage7-ac004-harmony-snapshots.ts:c9ea54f1b7b6a533724fb9782ac816e2b80f9422 |
| 2 | classic-synthwave-chorus-001 | classic-synthwave | degree-0344-major-v1 | c67295bde50b599caba90f0433352815ebac9bc7:src/evaluation/stage7-ac004-harmony-snapshots.ts:c9ea54f1b7b6a533724fb9782ac816e2b80f9422 |
| 3 | darkwave-verse-001 | darkwave | degree-0654-natural-minor-v1 | c67295bde50b599caba90f0433352815ebac9bc7:src/evaluation/stage7-ac004-harmony-snapshots.ts:c9ea54f1b7b6a533724fb9782ac816e2b80f9422 |
| 4 | cyberpunk-build-001 | midtempo-cyberpunk | degree-0654-phrygian-v1 | c67295bde50b599caba90f0433352815ebac9bc7:src/evaluation/stage7-ac004-harmony-snapshots.ts:c9ea54f1b7b6a533724fb9782ac816e2b80f9422 |

The fixed matrix order is these four records, then intent pairs low/low, medium/medium, high/high, and then root seeds 0 and 4294967295. Vector IDs use the accepted eight-digit lowercase hexadecimal seed form.

## 24-row coverage report

The reported pitch span is max pitch minus min pitch, in MIDI semitones. Each phrase boundary is a two-bar region of 7680 ticks. Phrase counts and interval sequences are computed from returned reference events.

| Vector ID | Rhythm | Register | Tension | Phrase-4 displacement | Events | Min/max/span | P1/P2/P3/P4 counts | P1 intervals | P3 intervals | Phrase-3 disposition |
|---|---|---|---|---|---:|---|---|---|---|---|
| dark-synthwave-chorus-001-low-low-00000000 | steady-6 | upper | chordal | none | 24 | 74/84/10 | 6/6/6/6 | 4, 0, -4, 4, -4 | 4, 0, -4, 4, -4 | exact-preservation selected |
| dark-synthwave-chorus-001-low-low-ffffffff | sparse-4 | middle | diatonic-passing | none | 16 | 67/75/8 | 4/4/4/4 | 2, 1, -3 | 2, 1, -3 | exact-preservation selected |
| dark-synthwave-chorus-001-medium-medium-00000000 | sparse-4 | upper | chordal | none | 16 | 74/84/10 | 4/4/4/4 | 4, 0, -4 | 4, 0, -4 | exact-preservation selected |
| dark-synthwave-chorus-001-medium-medium-ffffffff | steady-6 | middle | chordal | none | 24 | 67/77/10 | 6/6/6/6 | 3, 0, -3, 3, -3 | 3, 0, -3, 3, -3 | exact-preservation selected |
| dark-synthwave-chorus-001-high-high-00000000 | active-8 | upper | chordal | none | 32 | 74/84/10 | 8/8/8/8 | 4, 0, 0, -4, 4, -4, 0 | 4, 0, 0, -4, 4, -4, 0 | exact-preservation selected |
| dark-synthwave-chorus-001-high-high-ffffffff | active-8 | middle | chordal | none | 32 | 67/77/10 | 8/8/8/8 | 3, 0, 0, -3, 3, -3, 0 | 3, 0, 0, -3, 3, -3, 0 | exact-preservation selected |
| classic-synthwave-chorus-001-low-low-00000000 | steady-6 | upper | chordal | none | 24 | 72/84/12 | 6/6/6/6 | 4, 0, -4, 4, -4 | 4, 0, -4, 4, -4 | exact-preservation selected |
| classic-synthwave-chorus-001-low-low-ffffffff | steady-6 | middle | diatonic-passing | none | 24 | 67/76/9 | 6/6/6/6 | 2, 2, -2, 2, -4 | 2, 2, -2, 2, -4 | exact-preservation selected |
| classic-synthwave-chorus-001-medium-medium-00000000 | sparse-4 | upper | chordal | none | 16 | 72/84/12 | 4/4/4/4 | 4, 0, -4 | 4, 0, -4 | exact-preservation selected |
| classic-synthwave-chorus-001-medium-medium-ffffffff | steady-6 | middle | chordal | none | 24 | 67/76/9 | 6/6/6/6 | 4, 0, -4, 4, -4 | 4, 0, -4, 4, -4 | exact-preservation selected |
| classic-synthwave-chorus-001-high-high-00000000 | active-8 | upper | chordal | none | 32 | 72/84/12 | 8/8/8/8 | 4, 0, 0, -4, 4, -4, 0 | 4, 0, 0, -4, 4, -4, 0 | exact-preservation selected |
| classic-synthwave-chorus-001-high-high-ffffffff | steady-6 | middle | chordal | none | 24 | 67/76/9 | 6/6/6/6 | 4, 0, -4, 4, -4 | 4, 0, -4, 4, -4 | exact-preservation selected |
| darkwave-verse-001-low-low-00000000 | sparse-4 | lower | chordal | none | 16 | 62/72/10 | 4/4/4/4 | 4, 0, -4 | 4, 0, -4 | exact-preservation selected |
| darkwave-verse-001-low-low-ffffffff | steady-6 | lower | diatonic-passing | none | 24 | 62/72/10 | 6/6/6/6 | 2, 2, -2, 2, -4 | 2, 2, -2, 2, -4 | exact-preservation selected |
| darkwave-verse-001-medium-medium-00000000 | sparse-4 | lower | diatonic-passing | none | 16 | 62/72/10 | 4/4/4/4 | 2, 2, -4 | 2, 2, -4 | exact-preservation selected |
| darkwave-verse-001-medium-medium-ffffffff | sparse-4 | lower | chordal | none | 16 | 62/72/10 | 4/4/4/4 | 4, 0, -4 | 4, 0, -4 | exact-preservation selected |
| darkwave-verse-001-high-high-00000000 | active-8 | lower | chordal | later-480 | 32 | 62/72/10 | 8/8/8/8 | 4, 0, 0, -4, 4, -4, 0 | 4, 0, 0, -4, 4, -4, 0 | exact-preservation selected |
| darkwave-verse-001-high-high-ffffffff | steady-6 | lower | chordal | none | 24 | 62/72/10 | 6/6/6/6 | 4, 0, -4, 4, -4 | 4, 0, -4, 4, -4 | exact-preservation selected |
| cyberpunk-build-001-low-low-00000000 | steady-6 | lower | chordal | none | 24 | 63/72/9 | 6/6/6/6 | 4, 0, -4, 4, -4 | 4, 0, -4, 4, -4 | exact-preservation selected |
| cyberpunk-build-001-low-low-ffffffff | steady-6 | middle | diatonic-passing | none | 24 | 67/77/10 | 6/6/6/6 | 1, 2, -2, 2, -3 | 1, 2, -2, 2, -3 | exact-preservation selected |
| cyberpunk-build-001-medium-medium-00000000 | active-8 | middle | chordal | earlier-480 | 32 | 67/77/10 | 8/8/8/8 | 0, 3, 0, -3, 3, -3, 0 | 0, 3, 0, -3, 3, -3, 0 | exact-preservation selected |
| cyberpunk-build-001-medium-medium-ffffffff | steady-6 | lower | chordal | none | 24 | 63/72/9 | 6/6/6/6 | 4, 0, -4, 4, -4 | 4, 0, -4, 4, -4 | exact-preservation selected |
| cyberpunk-build-001-high-high-00000000 | steady-6 | middle | chordal | later-480 | 24 | 67/77/10 | 6/6/6/6 | 0, 3, -3, 3, -3 | 0, 3, -3, 3, -3 | exact-preservation selected |
| cyberpunk-build-001-high-high-ffffffff | sparse-4 | middle | chordal | earlier-480 | 16 | 67/77/10 | 4/4/4/4 | 0, 3, -3 | 0, 3, -3 | exact-preservation selected |

## Focused branch and independence evidence

- Phrase-3 ordinary fallback: [projector tests](../../src/evaluation/stage8-motif-reference-projector.test.ts#L737), test “proves the named harmonic-minor fixture has E empty and a legal ordinary winner.” This fixture independently establishes E empty and a legal ordinary winner.
- Phrase-3 exact-preservation precedence: [projector tests](../../src/evaluation/stage8-motif-reference-projector.test.ts#L765), test “exhaustively selects the documented Phrase-3 exact subset before the ordinary objective.”
- Deterministic tie-breaking among multiple exact paths: [projector tests](../../src/evaluation/stage8-motif-reference-projector.test.ts#L802), test “breaks an equal-score exact-path tie by complete numeric pitch sequence.”
- Static plan/pitch path carried into canonical result representation: [candidate-vector tests](../../src/evaluation/stage8-motif-candidate-vectors.test.ts#L263).
- Runtime dependency graph and production/entropy blocking: [candidate-vector independence tests](../../src/evaluation/stage8-motif-candidate-vectors-independence.test.ts#L96).

These focused fixtures establish both Phrase-3 branches and the exact-path tie rule independently of the representative-matrix counts. Matrix rows alone are not claimed to cover the ordinary fallback branch.

## Validation and disposition limits

- Temporary focused extraction check: 1 Vitest test passed; it verified 24 unique IDs, exact source/intent/seed ordering, all four selected policy values per row, expected rhythm event counts, all phrase boundaries, per-event phrase containment, and all reported metrics.
- The temporary test and temporary dependency junction were removed after extraction. The only candidate repository change is this Markdown evidence record.
- Applicable documentation validation and git diff checks are run on the final candidate before review.
- No full-suite rerun was needed for this documentation-only evidence artifact; the prior required CI belongs to the unchanged integrated source tree.
- No real capture or freeze, production comparison, supported-platform qualification, AC closure, Stage 8 exit, or musical acceptance is established.
- S8-QUAL-001 remains OPEN pending independent closure review; S8-QUAL-002 and S8-QUAL-003 remain OPEN.
