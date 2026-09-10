# Evaluation plan

## Purpose

Evaluation separates machine-checkable correctness from subjective musical usefulness. Automated scores cannot prove that music is good, genre-authentic, or useful to a producer.

## Golden cases

Start with versioned briefs and expected invariants for:

- `dark-synthwave-chorus-001`
- `darkwave-verse-001`
- `cyberpunk-build-001`
- `classic-synthwave-chorus-001`

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

## Human review protocol

Use multiple reviewers when feasible, blind case/version identity where practical, consistent preview sounds and level, randomized order, and declared expertise/context. Collect consent and only necessary metadata. Review both browser preview and exported MIDI in FL Studio because preview timbre can bias judgment.

## AI evaluation

Measure schema validity, allowed-parameter adherence, observation grounding, deterministic-fact accuracy, recommendation labeling, prompt-injection resistance, unsafe direct-mutation attempts, latency, tokens, and estimated cost. Human review covers clarity and actionability. Provider/model/prompt changes require regression comparison.

## Release gates

Exact numeric thresholds are established from an initial baseline before each engine stage is accepted; they must not be invented without evidence. P0 deterministic/MIDI/security criteria require zero known violations in release fixtures. Musical evaluation must cover all initial profiles and show documented reviewer disposition for every severe issue. Results link to acceptance IDs and cannot be overwritten.
