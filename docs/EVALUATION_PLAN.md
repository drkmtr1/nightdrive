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

Use multiple reviewers when feasible, blind case/version identity where practical, consistent preview sounds and level, randomized order, and declared expertise/context. Collect consent and only necessary metadata. Review both browser preview and exported MIDI in FL Studio because preview timbre can bias judgment.

### Stage 7C Arpeggiator profile review

Stage 7C profile acceptance requires deterministic evidence plus structured listening across Dark Synthwave, Classic Synthwave, Darkwave, and Midtempo Cyberpunk. Reviewers assess whether the profiles are meaningfully distinguishable; the Arpeggiator supports rather than obscures Harmony; repetition remains useful; energy changes feel intuitive; complexity increases musical interest rather than noise; and seed variation stays recognizably within the selected profile. Preserve individual judgments and disagreements. Stage 7C4's exact candidate orders and integer weights are frozen V1 Nightdrive hypotheses, not proven genre truths or a substitute for listening. Poor results may justify a new immutable genre-profile data version with comparative evidence, but never silent mutation or reinterpretation of historical V1 policy. No numeric acceptance threshold is established until baseline evidence exists, and candidate profile tendencies must not be reported as universal genre facts.

The initial Stage 7 audition-artifact route is frozen in [Stage 7 Arpeggiator audition-artifact contract](reviews/STAGE7_ARPEGGIATOR_AUDITION_ARTIFACT.md): the accepted evaluation-only assembler maps Harmony plus Arp output into Nightdrive MIDI IR. The accepted and merged [Stage 7 Arpeggiator baseline evaluation protocol](reviews/STAGE7_ARPEGGIATOR_EVALUATION_PROTOCOL.md) fixes the approved 28-fixture Energy/Complexity/seed matrix, blind and revealed listening passes, presentation ordering, audition controls, and interpretation limits. This initial Stage 7 baseline uses manual FL Studio audition; it does not require browser preview. The original product-owner [FL Studio listening-setup reproducibility checkpoint](reviews/STAGE7_ARPEGGIATOR_LISTENING_SETUP.md) is merged through PR #104 and remains historical evidence; its corrected preset/template state is implemented manually, documented, and review-pending after non-scored ND7-001 setup validation. The product-owner-approved Stage 7-specific categorical Pass 1 rubric is likewise documented and review-pending; it replaces the generic numeric rubric only for this blind diagnostic baseline. Deterministic fixture-package construction and bounded materialization tooling is accepted and merged through PR #105, and the external 28-fixture baseline package is generated and hash-verified; no Pass 1 response, rating, or listening result exists.

## AI evaluation

Measure schema validity, allowed-parameter adherence, observation grounding, deterministic-fact accuracy, recommendation labeling, prompt-injection resistance, unsafe direct-mutation attempts, latency, tokens, and estimated cost. Human review covers clarity and actionability. Provider/model/prompt changes require regression comparison.

## Release gates

Exact numeric thresholds are established from an initial baseline before each engine stage is accepted; they must not be invented without evidence. P0 deterministic/MIDI/security criteria require zero known violations in release fixtures. Musical evaluation must cover all initial profiles and show documented reviewer disposition for every severe issue. Results link to acceptance IDs and cannot be overwritten.
