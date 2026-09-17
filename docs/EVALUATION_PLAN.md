# Evaluation plan

## Purpose

Evaluation separates machine-checkable correctness from subjective musical usefulness. Automated scores cannot prove that music is good, genre-authentic, or useful to a producer.

## Golden cases

Start with versioned briefs and expected invariants for:

- `dark-synthwave-chorus-001`
- `darkwave-verse-001`
- `cyberpunk-build-001`
- `classic-synthwave-chorus-001`

The fixed source context for these cases is frozen in [Stage 7 Arpeggiator golden-case source records](reviews/STAGE7_ARPEGGIATOR_GOLDEN_CASES.md). Energy, Complexity, additional seeds, fixture outputs, and evaluation results remain outside that source-selection checkpoint.

Each record includes dataset version, full brief, engine/generator/profile/schema versions, seed, expected structural invariants, canonical result/hash, MIDI artifact/validator result, reviewer ratings, build/commit, and date. Keep prior results immutable.

## Deterministic evaluation

For every case validate pitch/velocity/tick bounds; scale/chord membership under explicit exception policies; voicing/range/voice-leading; harmonic-context use; section boundaries; 960 PPQ conversion; deterministic cross-run output; stable serialization; lock hashes; variation lineage; database constraints; MIDI parse/round trip; and FL Studio import protocol.

Correctness gates are binary. Performance budgets are reported with hardware/runtime and percentiles. Cross-runtime equality is required before browser-produced canonical results can be trusted by the server.

## Musical evaluation rubric

Human reviewers score each dimension 1–5 with short evidence:

| Dimension | 1 | 3 | 5 |
|---|---|---|---|
| Harmonic coherence | contradictory/unusable | mostly coherent with repairs | coherent and purposeful |
| Rhythmic appropriateness | conflicts/unstable | plausible but generic | supports section/genre strongly |
| Motif consistency | arbitrary | recognizable with issues | memorable, reusable identity |
| Register/arrangement | severe collisions/gaps | workable | clear complementary roles |
| Section/genre alignment | mismatched | broadly plausible | convincing within bounded profile |
| Musical usefulness | discard | develop with material edits | would use/develop directly |

The anchor question is: **Would a producer actually use or develop this material?** Reviewers also choose `yes`, `maybe`, or `no` and explain. Do not average away strong disagreement; preserve individual ratings and summarize distribution.

This generic composition/system rubric remains available where its dimensions are meaningful. The deliberately minimal Stage 7 blind Chords + Arp baseline instead uses the categorical override in the [Stage 7 Arpeggiator baseline evaluation protocol](reviews/STAGE7_ARPEGGIATOR_EVALUATION_PROTOCOL.md); it does not use numerical `1–5` scores.

## Human review protocol

Use multiple reviewers when feasible, blind case/version identity where practical, consistent preview sounds and level, randomized order, and declared expertise/context. Collect consent and only necessary metadata. Broader Nightdrive evaluations may review both browser preview and exported MIDI in FL Studio because preview timbre can bias judgment. The initial Stage 7 baseline is explicitly exempt from browser-preview requirements: its accepted route is manual FL Studio MIDI audition only.

### Stage 7C Arpeggiator profile review

Stage 7C profile acceptance requires deterministic evidence plus structured listening across Dark Synthwave, Classic Synthwave, Darkwave, and Midtempo Cyberpunk. For the initial eight-bar Chords + Arp diagnostic baseline, use only the [specific Pass 1 and Pass 2 questions](reviews/STAGE7_ARPEGGIATOR_EVALUATION_PROTOCOL.md): perceptibility and usability of Arp behavior, within-case Energy/Complexity tendencies and seed relatedness, and post-reveal distinguishability of complete experiences. Do not score genre or section authenticity or attribute cross-case differences solely to Arpeggiator policy. Preserve individual judgments; a single product-owner reviewer is an exploratory baseline, and additional reviewers are not required to begin. Stage 7C4's exact candidate orders and integer weights are frozen V1 Nightdrive hypotheses, not proven genre truths. Poor results may justify a new immutable genre-profile data version with comparative evidence, never silent mutation. No numeric acceptance threshold is established for this baseline; weighted policy does not guarantee monotonic audible outcomes.

The initial Stage 7 [audition-artifact contract](reviews/STAGE7_ARPEGGIATOR_AUDITION_ARTIFACT.md) and [baseline protocol](reviews/STAGE7_ARPEGGIATOR_EVALUATION_PROTOCOL.md) govern the accepted 28-fixture matrix and evaluation-only MIDI route. The corrected [FL Studio listening setup](reviews/STAGE7_ARPEGGIATOR_LISTENING_SETUP.md) and categorical Pass 1 direction are accepted through PR #106. A subsequent Evaluation Integrity Audit is complete; its consolidated execution-protocol correction is implemented in documentation and review-pending. The external package is generated and hash-verified, but the final blind-only handoff and response workbook are not created. ND7-001 had non-scored setup exposure. Pass 1 remains BLOCKED/unstarted, no fixture has a rating, and Pass 2 has not started.

## AI evaluation

Measure schema validity, allowed-parameter adherence, observation grounding, deterministic-fact accuracy, recommendation labeling, prompt-injection resistance, unsafe direct-mutation attempts, latency, tokens, and estimated cost. Human review covers clarity and actionability. Provider/model/prompt changes require regression comparison.

## Release gates

Numeric thresholds for broader release decisions require baseline evidence and a later decision; none is imposed on the initial Stage 7 categorical baseline. P0 deterministic/MIDI/security criteria require zero known violations in release fixtures. Musical evaluation must cover all initial profiles and show documented reviewer disposition for every severe issue. Results link to acceptance IDs and cannot be overwritten.
