# Capability-gated roadmap

This roadmap has no calendar promises. Each stage requires explicit authorization, satisfies its exit evidence, and stops before the next stage. A future-capable schema does not authorize future behavior.

## Stage 1 — Documentation and architecture

**Objective:** Freeze Version 1 and establish authoritative product/engineering contracts.
**Capabilities:** Requirements, acceptance, UX/flows, architecture, domain/time/MIDI/generation/profile/recipe models, data/API/AI/security/observability/deployment/testing/evaluation plans, ADRs/risks/rules.
**Dependencies:** Repository and remote inspection; approved brief.
**Non-goals:** Production scaffold, dependencies, Supabase, Vercel, application features.
**Tests/evidence:** Required-file inventory; Markdown/link/Mermaid review; ID/traceability/scope/contradiction audit; clean diff and Git evidence.
**Exit:** All Stage 1 exit criteria in the project brief pass; provisional decisions and assumptions remain clearly labeled.

## Stage 2 — Application foundation

### Stage 2A — Toolchain validation and minimal local shell

**Status:** Merged and complete through PR #2 (`06daf5a`).
**Objective:** Validate the framework direction and create the smallest production-quality local shell and engineering gates.
**Capabilities:** Accepted Next.js/TypeScript direction, exact Node/npm/framework policy, semantic layout, honest empty/loading/error/not-found states, design tokens, liveness route, strict type/format/lint/test/build gates, dependency register, runtime CI.
**Dependencies:** Merged Stage 1 foundation and explicit Stage 2A authorization.
**Non-goals:** Music/domain/time/MIDI/audio behavior, feature-like placeholder controls, persistence/auth/Supabase, AI, Vercel provisioning/deployment, observability vendors.
**Tests:** Clean install, format, lint, strict type check, component/route/accessibility tests, production build/server HTTP smoke, documentation validation, diff check, CI.
**Exit:** ADR-003 accepted with evidence; NFR-007/UX-005 and AC-031/032 pass; exact dependencies are documented; all checks pass.

### Stage 2B — Reserved application-foundation continuation

**Status:** Not authorized and intentionally unscoped.
**Objective:** To be defined by a future bounded brief if more non-domain foundation is justified.
**Capabilities:** None approved.
**Dependencies:** Stage 2A merge and explicit authorization.
**Non-goals:** Stage 3 or later capabilities.
**Tests/exit:** Must be specified before implementation; do not infer work from this placeholder gate.

## Stage 3 — Music theory and time core

### Stage 3A — Canonical musical time core

**Status:** Merged and complete through PR #3 (`e46fee9`).
**Objective:** Implement the framework-independent canonical time subset without opening the rest of Stage 3.
**Capabilities:** Branded 960 PPQ ticks/durations/position indices, the bounded 8-bar 4/4 conversion context, explicit validated tempo and time-signature values, exact straight/dotted/triplet subdivision fixtures, safe arithmetic/comparison/event-boundary validation, structured errors, and deterministic versioned primitive serialization.
**Dependencies:** Merged Stage 2A foundation and explicit Stage 3A authorization.
**Non-goals:** Pitch/interval/scale/key/chord primitives, canonical composition schema/hash, PRNG, MIDI serialization/export, generators, UI controls, audio, persistence, AI, Supabase, Vercel, or deployment.
**Tests:** Exhaustive tick/position round trip across ticks `0..30720`; straight/dotted/triplet fixtures; validation, arithmetic, boundary, tempo, serializer, and dependency-boundary tests; complete repository validation.
**Exit:** The Stage 3A subset of MIDI-001 plus MUS-007/NFR-008 and AC-033/034 pass without new dependencies or framework coupling.

### Stage 3B — Remaining music-theory and determinism foundations

#### Stage 3B1 — Pitch identity primitives

**Status:** Merged and complete through PR #4 (`85c7958`).
**Objective:** Establish canonical chromatic and absolute MIDI pitch identity without introducing notation or theory relationships.
**Capabilities:** Strict branded `PitchClass` values `0..11`, strict branded `MidiPitch` values `0..127`, exact MIDI-to-pitch-class extraction, equality/comparison, stable typed errors, deterministic versioned serializers, and hardened music-domain import-boundary coverage.
**Dependencies:** Merged Stage 3A and explicit Stage 3B1 authorization.
**Non-goals:** Note/display names, octave conventions, accidentals, intervals, scales, keys, chords, PRNG/hash, composition/events, MIDI files, generation, audio, persistence, AI, UI, or deployment.
**Tests:** Exhaustive 12-value pitch-class and 128-value MIDI domains, extraction invariant, all invalid numeric classes, exact serialization/repetition, ordering/equality, and static/dynamic/re-export/side-effect import recognition.
**Exit:** The Stage 3B1 subset of MUS-001 plus MUS-008/NFR-009 and AC-035 pass without new dependencies or framework coupling.

#### Stage 3B2 — Remaining theory and determinism foundations

##### Stage 3B2a — Chromatic interval primitive

**Status:** Merged and complete through PR #5 (`d64b9c2`).
**Objective:** Establish signed chromatic semitone displacement without introducing traditional interval naming or notation semantics.
**Capabilities:** Strict signed safe-integer `Interval`, zero/positive/negative compound values, equality/comparison, negation, addition/subtraction with overflow rejection, exact directed MIDI-pitch distance, deterministic versioned serialization, and algebraic/exhaustive MIDI-pair fixtures.
**Dependencies:** Merged Stage 3B1 and explicit Stage 3B2a authorization.
**Non-goals:** Named/diatonic intervals, qualities, spelling, octave labels, pitch-class direction, transposition, scales, keys, chords, PRNG/hash, MIDI files, generation, audio, persistence, AI, UI, or deployment.
**Tests:** Representative signed/compound values, all invalid numeric classes, arithmetic overflow, algebraic invariants, repeated serialization, and all 16,384 ordered MIDI-pitch pairs.
**Exit:** The Stage 3B2a subset of MUS-001 plus MUS-009/NFR-010 and AC-036 pass without new dependencies or framework coupling.

##### Stage 3B2b1 — Scale formula foundations

**Status:** Merged and complete through PR #6 (`58e3845`).
**Objective:** Establish the closed V1 scale formula and numeric projection subset.
**Capabilities:** Exactly six immutable canonical formulas, zero-based `ScaleDegree` values `0..6`, tonic-relative pitch-class projection, degree lookup, exact twelve-class membership, and `nightdrive.scale.v1` serialization.
**Dependencies:** Merged Stage 3B2a and explicit Stage 3B2b1 authorization.
**Non-goals:** Note spelling, keys, named/diatonic intervals, chords, composition hashing, PRNG, generation, MIDI files, audio, persistence, AI, UI, or deployment.
**Tests:** Exact formula fixtures; all 72 tonic/scale contexts; all twelve membership classes; invalid degrees; immutable formula results; repeated serialization.
**Exit:** MUS-001 plus MUS-010/NFR-011 and AC-037 pass without new dependencies or framework coupling.

##### Stage 3B2b2a — Key primitive

**Status:** Merged and complete through PR #7 (`d06d898`).
**Objective:** Establish the canonical deterministic `Key` value as tonic `PitchClass` plus `ScaleType`.
**Capabilities:** Immutable two-field Key, runtime component revalidation, deterministic equality, delegated key pitch-class projection, degree lookup, exact membership, and `nightdrive.key.v1` serialization.
**Dependencies:** Merged Stage 3B2b1 and explicit Stage 3B2b2a authorization.
**Non-goals:** Note spelling, key signatures, named/diatonic intervals, chords, composition hashing, PRNG, generation, MIDI files, audio, persistence, AI, UI, or deployment.
**Tests:** All 72 tonic/scale keys; five readable numeric fixtures; seven degree and twelve membership checks per key; forged runtime inputs; immutability, equality, delegation, and repeated serialization.
**Exit:** MUS-001 plus MUS-011/NFR-012 and AC-038 pass without new dependencies or framework coupling.

##### Stage 3B2b2b — ChordQuality contract definition

**Status:** Merged and complete through PR #8 (`f744a1f`).
**Objective:** Freeze the smallest closed V1 chord-quality vocabulary and its boundaries before deterministic harmony implementation.
**Contract:** One explicitly versioned V1 vocabulary maps stable IDs to immutable formulas: major triad `major-triad` `[0,4,7]`; minor triad `minor-triad` `[0,3,7]`; diminished triad `diminished-triad` `[0,3,6]`. The version belongs to the vocabulary/schema contract, not redundant per-instance state. Formulas are tonic-relative pitch-class membership sets only: no ordering, octave, inversion, voicing, spelling, root, or extension semantics. Serialization/version mechanics remain for implementation.
**Profile rationale:** Major and minor support the harmonic center of all four accepted profiles; diminished supplies leading-tone/tension color for harmonic-minor and darker chromatic contexts without opening a broad vocabulary.
**Seventh decision:** Seventh structures are deferred extension metadata outside `ChordQuality`; they are not standalone qualities in this contract. Future `Chord` owns root plus quality and any explicitly versioned extensions; inversions and voicings remain separate.
**Dependencies:** Merged Stage 3B2b2a and explicit authorization for a later implementation task.
**Non-goals:** `ChordQuality` production code, `Chord`, extensions implementation, harmony, voicing, inversions, progression, named intervals, spelling, generation, MIDI, persistence, AI, or UI.
**Exit:** MUS-012 and AC-039 contract evidence is reviewed; no implementation completion is claimed.

##### Stage 3B2b2c — ChordQuality primitive

**Status:** Merged and complete through PR #9 (`6ca4611`).
**Objective:** Implement the versioned closed V1 ChordQuality contract without introducing Chord or harmony semantics.
**Capabilities:** Exactly three canonical IDs, immutable validated formulas, deterministic equality, and `nightdrive.chord-quality.v1` serialization.
**Dependencies:** Merged Stage 3B2b2b contract and explicit Stage 3B2b2c authorization.
**Non-goals:** Chord, roots, extensions, seventh identities, inversions, voicings, harmony, progression, spelling, named intervals, generation, MIDI, persistence, AI, UI, or deployment.
**Tests:** Closed-vocabulary rejection, exact formula invariants, immutability, all ordered equality pairs, serializer fixtures, and forbidden-field checks.
**Exit:** MUS-013/NFR-013 and AC-040 pass without new dependencies or framework coupling.

##### Stage 3B2b2d — Chord aggregate contract definition

**Status:** Merged and complete through PR #10; contract definition preceded the Stage 3B2b2e implementation.
**Objective:** Freeze the minimal canonical Chord identity and its boundaries before implementation.
**Contract:** Chord contains root `PitchClass` plus `ChordQuality`; triad membership is derived by tonic-relative formula plus modulo-12 root projection. Extensions are deferred and initially unsupported. Equality uses canonical stored identity; serialization is reserved as `nightdrive.chord.v1` without derived membership.
**Dependencies:** Merged Stage 3B2b2c and explicit authorization for a later Chord implementation task.
**Non-goals:** Chord production code, extensions, inversions, voicings, harmony, progression, spelling, MIDI, generation, persistence, AI, or UI.

##### Stage 3B2b2e — Chord primitive implementation

**Status:** Merged and complete through PR #11 (merge commit `4e84eec9150841f4b7a25a5709771cb6b016135d`).
**Objective:** Implement the canonical triad-only Chord identity.
**Capabilities:** Immutable root `PitchClass` plus `ChordQuality`, derived modulo-12 membership, canonical equality, and minimal `nightdrive.chord.v1` serialization.
**Dependencies:** Merged Stage 3B2b2d and explicit Stage 3B2b2e authorization.
**Non-goals:** Extensions, seventh identities, inversions, voicings, harmony, progression, spelling, MIDI, generation, persistence, AI, UI, or deployment.
**Tests:** All 36 canonical chords, membership derivation and immutability, 1,296 ordered equality pairs, runtime forgery rejection, exact serialization fixtures, and forbidden-field checks.
**Exit:** MUS-015/NFR-014 and AC-042 pass with the Chord primitive and tests implemented, without extensions, inversion, voicing, harmony, new dependencies, or framework coupling.

##### Stage 3B2b2f — ChordInversion contract definition

**Status:** Merged and complete through PR #14; contract definition preceded the Stage 3B2b2g implementation.
**Objective:** Define the smallest deterministic V1 inversion metadata contract before implementation or Stage 4 harmony work.
**Contract:** `ChordInversion` is exactly a validated member index `0..2` in canonical triad membership order: root position, first inversion, and second inversion. It remains separate from `Chord` identity and from realized voicing.
**Serialization:** Reserve `nightdrive.chord-inversion.v1` with only `schema` and `memberIndex`; no chord, pitch, voicing, label, or redundant version state.
**Dependencies:** Merged Stage 3B2b2e Chord primitive and explicit authorization for a later implementation task.
**Non-goals:** Production code, implementation tests, arbitrary-cardinality generalization, extensions, sevenths, voicing, MIDI realization, harmony, progression, spelling, or UI.
**Exit:** MUS-016/NFR-015 and AC-043 contract review confirms valid indices, canonical ordering, Chord/voicing boundaries, reserved serialization, runtime-validation expectations, and deferred wider cardinality without implementation claims.

##### Stage 3B2b2g — ChordInversion primitive implementation

**Status:** Merged and complete through PR #15 (merge commit `ba1d102cf70be8bde6a00557410d8a07adacc09e`).
**Objective:** Implement the deterministic triad-only `ChordInversion` scalar defined by Stage 3B2b2f.
**Capabilities:** Validated indices `0..2`, deterministic equality, and exact `nightdrive.chord-inversion.v1` serialization.
**Dependencies:** Merged Stage 3B2b2f and explicit Stage 3B2b2g authorization.
**Non-goals:** Chord changes, extensions, sevenths, voicing, MIDI realization, harmony, progression, spelling, UI, or persistence.
**Tests:** All valid values, invalid numeric/runtime classes, forged-value revalidation, all 9 ordered equality pairs, exact serialization, byte stability, and forbidden-field checks.
**Exit:** MUS-017/NFR-016 and AC-044 pass without voicing, harmony, new dependencies, or framework coupling.

##### Stage 3B2b2 — Remaining theory and determinism foundations

**Status:** Not authorized and intentionally unscoped.
**Objective:** Define future bounded briefs for the remaining theory and determinism contracts.
**Capabilities:** Note/spelling, named/diatonic interval metadata, canonical composition schema/hash, and fixed PRNG contract, only if separately authorized.
**Dependencies:** Merged Stage 3B2b2a and explicit authorization for each bounded slice.
**Non-goals:** Progression/pattern generation, MIDI export, or UI piano roll.
**Tests/exit:** Must be specified before implementation; do not infer work from this placeholder gate.

##### Stage 3B2c1 — Deterministic PRNG contract definition

**Status:** Merged and complete through PR #17 (merge commit `91230834bbd0056996c2aecb70f7319ad71a82c3`); PRNG implementation remains separately gated.
**Objective:** Define the smallest versioned deterministic random primitive required for reproducible future generation.
**Contract:** V1 uses Mulberry32 (`nightdrive.prng.mulberry32.v1`), an in-repository uint32 state transition with no `Math.random()` or operating-system entropy after initialization. It is deterministic infrastructure, not a cryptographic generator.
**Transition:** For uint32 state `s`, set `s = (s + 0x6D2B79F5) >>> 0`; set `t = s`; then `t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0`; then `t = (t ^ ((t + Math.imul(t ^ (t >>> 7), t | 61)) >>> 0)) >>> 0`; return `(t ^ (t >>> 14)) >>> 0`. `Math.imul` supplies signed 32-bit multiplication with low-32-bit result; every `>>> 0` is a uint32 truncation/coercion point, shifts are unsigned-right shifts, state updates before output mixing, and outputs are in `[0, 2^32)`.
**Seed/state:** The canonical seed is a finite safe integer in `0..4,294,967,295`, including zero; negative, fractional, non-safe, non-number, and coerced values are invalid. State is one uint32 value; transient state is not canonical composition data.
**Output:** The primitive emits uint32 values in `[0, 2^32)`. Bounded integer, boolean, shuffle, weighted-choice, and musical decision helpers remain separate implementation contracts unless later authorized.
**Replay/lineage:** Replay requires identical seed, PRNG contract version, generator/engine/profile/schema versions, normalized inputs, and canonical parameters. Algorithm changes require a new version; old sequences are reproducible only when their version is selected. Seed and version belong in generation lineage; derived random values need not be persisted.
**Serialization:** Stage 3B2c1 defines the seed value domain and PRNG identifier only. Their enclosing canonical lineage serialization is deferred to the future lineage/composition schema contract; no standalone PRNG serializer fixture is defined here.
**Streams:** Independent component streams are a future requirement for lock-safe regeneration; stream/fork mechanics are explicitly deferred to a separately authorized contract.
**Non-goals:** PRNG code, composition hashing, music policy, generation, harmony, MIDI, persistence, UI, AI, or security-sensitive randomness.
**Tests/exit:** Future implementation requires known-answer, boundary/malformed, repeated-run, independent-instance, long-sequence, cross-runtime, no-`Math.random()`, and lineage/version-reference fixtures; exit requires MUS-018/NFR-017 and AC-045 contract review without implementation claims.

##### Stage 3B2c2 — Deterministic PRNG primitive implementation

**Status:** Merged and complete through PR #19 (merge commit `696d896dff4444693c2c578f75a76068ee2cd285`).
**Objective:** Implement the versioned Mulberry32 PRNG contract without musical policy.
**Capabilities:** Canonical uint32 seed validation, deterministic immutable state transitions, uint32 output, and `nightdrive.prng.mulberry32.v1` identity.
**Dependencies:** Merged Stage 3B2c1 and explicit Stage 3B2c2 authorization.
**Non-goals:** Bounded helpers, streams/forks, hashing, generation, harmony, MIDI, persistence, UI, AI, or security randomness.
**Tests:** Known-answer vectors, seed boundaries and malformed values, repeatability, independent instances, state advancement, output invariants, ambient-randomness isolation, and longer deterministic sequences.
**Exit:** MUS-019/NFR-018 and AC-046 pass without new dependencies or framework coupling.

##### Stage 3B2b2h — ChordVoicing contract definition

**Status:** Merged and accepted through PR #21 (merge commit `c33255433d7cc9682e53b01d1c3be36081b06956`). ChordVoicing implementation remains separately gated.
**Objective:** Freeze the smallest deterministic V1 realized ChordVoicing contract before implementation or Stage 4 harmony.
**Contract:** Exactly three validated `MidiPitch` values, strictly ascending absolute MIDI order, no duplicate MIDI pitches, one realization of each triad member, and separate contextual checks for Chord membership and ChordInversion compatibility.
**Serialization:** Reserve `nightdrive.chord-voicing.v1` with only ordered `midiPitches`; exclude Chord, inversion, pitch-class, label, range, spacing, profile, and harmony fields.
**Dependencies:** Merged Chord and ChordInversion primitives plus explicit authorization for a later implementation task.
**Non-goals:** Production code, doubling, wider cardinality, extensions, sevenths, voice-leading, progression, harmony, MIDI file writing, spelling, UI, or AI.
**Exit:** MUS-020/NFR-019 and AC-047 contract review confirms representation, ordering, membership/inversion boundaries, serialization, validation expectations, and deferred policy without implementation claims.

## Stage 4 — Harmony engine

**Objective:** Generate valid progressions and voice-led chord tracks.
**Capabilities:** Initial profile harmony templates, chord construction, inversions, voicing/range/voice-leading, decision records.
**Dependencies:** Stage 3; reviewed initial profile data.
**Non-goals:** Bass/arp/melody, AI selection.
**Tests:** Golden harmony, property/invariant, unsatisfiable constraints, deterministic replay, preliminary human review.
**Exit:** AC-002/003/004 harmony evidence passes for every initial profile.

## Stage 5 — MIDI engine and export

**Objective:** Produce independently valid, deterministic standard MIDI from canonical events.
**Capabilities:** SMF writer/reader validation, conductor/component tracks, stable ordering, initial download.
**Dependencies:** Stage 3; harmony fixtures.
**Non-goals:** Complete production package or `.flp`.
**Tests:** Binary fixtures, independent parser, round trip, malformed cases, FL Studio import spike.
**Exit:** AC-007/008 and an initial AC-009 compatibility record pass.

## Stage 6 — Bass engine

**Objective:** Generate harmonically grounded bass using the bounded archetypes.
**Capabilities:** Six planned archetypes, density/syncopation/movement/root/octave/aggression parameters, provenance.
**Dependencies:** Stages 3–4.
**Non-goals:** Audio synthesis or arbitrary style library.
**Tests:** Harmonic-context, range/grid, archetype, deterministic/golden and musical review.
**Exit:** AC-010 and relevant AC-004/013 evidence pass across profiles.

## Stage 7 — Arpeggiator

**Objective:** Generate profile-appropriate arpeggios from harmony.
**Capabilities:** Rate/direction/range/gate/octave/density and seeded patterns.
**Dependencies:** Stages 3–4.
**Non-goals:** Free-running audio arp or VST automation.
**Tests:** Active-chord derivation, boundary/gate/range, all directions, replay/golden review.
**Exit:** AC-011/004/013 pass.

## Stage 8 — Melody and motif engine

**Objective:** Produce coherent, inspectable lead motifs and variations.
**Capabilities:** Motif identity, phrase/repetition/call-response, target/passing/tension/resolution notes, range/leap constraints.
**Dependencies:** Stages 3–4; profile evaluation baseline.
**Non-goals:** LLM notes, vocal melody, full-song development.
**Tests:** Transformation/constraint/property fixtures, deterministic replay, structured human review.
**Exit:** AC-012/004/013 and agreed human-review disposition pass.

## Stage 9 — Browser audition

**Objective:** Synchronously preview canonical tracks with simple role voices.
**Capabilities:** Play/stop/loop/playhead, mute/solo, user-initiated audio, scheduler/degraded states.
**Dependencies:** Stages 3–8; ADR-011 timing spike.
**Non-goals:** Production synthesis, rendering, mixing/mastering.
**Tests:** Clock/scheduling/drift, tempo/loop, tab suspension, device/browser, accessibility and latency.
**Exit:** AC-014 passes within a measured documented tolerance.

## Stage 10 — Lightweight piano roll

**Objective:** Let users make bounded corrections without recreating a DAW.
**Capabilities:** Select/add/delete/drag/resize/velocity/transpose/snap, undo/redo, keyboard-accessible alternative.
**Dependencies:** Canonical domain/time and audition.
**Non-goals:** Automation lanes, advanced articulation, mobile-first editing.
**Tests:** Command/undo exactness, invalid edits, rendering/performance, keyboard/screen-reader/responsive.
**Exit:** AC-015 and relevant accessibility evidence pass.

## Stage 11 — Locking and variations

**Objective:** Make independent, non-destructive iteration trustworthy.
**Capabilities:** Track locks/hashes, targeted generation, compare/retain parent/child, manual-edit lineage.
**Dependencies:** All four generators and revision model.
**Non-goals:** Branch merging/collaboration.
**Tests:** Lock hash invariants, stale/conflict/error recovery, lineage/replay.
**Exit:** AC-005/006 pass for every target component.

## Stage 12 — Supabase persistence

**Objective:** Persist owned projects, revisions, runs, profiles, recipes, and export records securely.
**Capabilities:** Auth, migrations, repository layer, RLS, save/open/delete/history, optimistic concurrency.
**Dependencies:** ADR-004 validation and Stages 2–11 data contracts.
**Non-goals:** AI and public collaboration.
**Tests:** Migration, constraints, transaction/idempotency, RLS cross-user, deletion/retention, E2E.
**Exit:** AC-016/020/022 persistence evidence passes with no service-role client exposure.

## Stage 13 — AI intent layer

**Objective:** Translate natural language into inspectable bounded parameter proposals.
**Capabilities:** Provider adapter, prompt/schema versions, proposal review/confirm, safe failure, usage/cost telemetry.
**Dependencies:** Deterministic transformations; security/privacy/provider review.
**Non-goals:** Raw note generation, direct mutations, autonomous agent.
**Tests:** Schema/domain, injection/adversarial, grounding, timeout/refusal/cost/rate limit, regression dataset.
**Exit:** AC-017/019/023/024 pass and deterministic flows work without AI.

## Stage 14 — Producer Coach

**Objective:** Offer actionable, evidence-linked advice from structured state.
**Capabilities:** Computed density/range/tension/role/motif/overlap/contrast observations and labeled suggestions.
**Dependencies:** Mature canonical state, AI boundary, evaluation protocol.
**Non-goals:** Claims of objective taste or automatic unconfirmed edits.
**Tests:** Observation correctness, reference grounding, subjective-label, usefulness/safety human review.
**Exit:** AC-018 passes with acceptable evaluation disposition.

## Stage 15 — Synth recipe system

**Objective:** Provide validated structured recipes for supported synths.
**Capabilities:** Profile/version store, recipe validator, role-specific structured recipes and narratives, generic fallback.
**Dependencies:** Verified synth documentation/licensing and coach/AI grounding.
**Non-goals:** Loading/controlling VSTs or exhaustive synth catalog.
**Tests:** Vocabulary/range/capability schema, human reproduction and role-fit review.
**Exit:** AC-021 passes for declared instrument versions.

## Stage 16 — Complete FL Studio MIDI package

**Objective:** Deliver a polished portable handoff.
**Capabilities:** Component and combined MIDI, canonical JSON manifest, production notes, instructions, safe ZIP naming/download/history.
**Dependencies:** MIDI, persistence, explanations/recipes as available.
**Non-goals:** `.flp`, VST state, automatic DAW actions.
**Tests:** Manifest/hash/ZIP security, content, retry/expiry, FL Studio import matrix.
**Exit:** Full AC-009 and FR-013 evidence passes.

## Stage 17 — Evaluation maturity

**Objective:** Establish credible release thresholds and regression history.
**Capabilities:** Versioned golden dataset, automated result reports, structured producer review, performance budgets.
**Dependencies:** Complete workflow and representative outputs.
**Non-goals:** Pretending subjective scores are objective quality.
**Tests:** Dataset integrity, evaluator reproducibility, all deterministic and human protocols.
**Exit:** All profiles covered; thresholds/disagreements/issues documented; AC-028 supported by evidence.

## Stage 18 — Security hardening

**Objective:** Validate production threat controls and operational readiness.
**Capabilities:** Abuse/rate limits, headers/CSP, secret/dependency controls, privacy/retention, incident/restore runbooks, security telemetry.
**Dependencies:** Full architecture and target providers.
**Non-goals:** New product features.
**Tests:** Threat-model cases, auth/RLS, injection, resource abuse, build artifact/secrets, backup/restore, dependency review.
**Exit:** SEC requirements and AC-022/023/024 pass; high-severity findings resolved.

## Stage 19 — UX and accessibility verification

**Objective:** Verify the complete workflow for first-time and assistive-technology users.
**Capabilities:** Refined hierarchy/copy/states/responsiveness/keyboard/AT support based on evidence.
**Dependencies:** Feature-complete workflow.
**Non-goals:** Scope expansion or mobile DAW parity.
**Tests:** Moderated primary-flow usability, keyboard, screen readers, zoom/reflow, contrast, touch targets, reduced motion, device matrix.
**Exit:** AC-001/025/026/027 and UX/A11Y requirements pass or have approved non-release-blocking disposition.

## Stage 20 — Version 1 production release

**Objective:** Release and verify the bounded Version 1 safely.
**Capabilities:** Production configuration/migration/deploy, release record, monitoring, support/runbooks, rollback.
**Dependencies:** All prior release gates, explicit deployment authorization, provider accounts/configuration.
**Non-goals:** Any deferred feature.
**Tests:** Full CI/evaluation/security/UX gates, production smoke, FL Studio artifact check, observability and rollback readiness.
**Exit:** AC-029/030 and all P0 requirements have linked evidence; production is healthy and release is documented.

## Deferred future milestones

Multi-section composition, full-song arrangement, energy curves, advanced production guidance, Reference Rebuild interoperability, additional meters/tempo maps, and deeper official FL Studio integration require new bounded objectives and ADRs.
