# Capability-gated roadmap

This roadmap has no calendar promises. Each stage requires explicit authorization, satisfies its exit evidence, and stops before the next stage. A future-capable schema does not authorize future behavior. Implementation stages must complete the Build vs. Buy / Dependency Evaluation Gate before custom commodity infrastructure or consequential dependencies are authorized.

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

##### Stage 3B2b2i — ChordVoicing primitive implementation

**Status:** Merged and complete through PR #23 (merge commit `9daa8c37964d71d690f8bdf1dd86715879fa7fcd`). Stage 4 Harmony remains separately gated.
**Objective:** Implement the immutable triad-only ChordVoicing value and its Chord/ChordInversion compatibility predicates.
**Capabilities:** Exactly three validated strictly ascending MidiPitches, deterministic equality, `nightdrive.chord-voicing.v1` serialization, membership compatibility, and canonical-order inversion compatibility.
**Dependencies:** Merged Stage 3B2b2h contract, Chord, and ChordInversion primitives.
**Non-goals:** Generation, doubling, wider cardinality, extensions, sevenths, voice-leading, progression, harmony, MIDI file writing, spelling, UI, or AI.
**Tests:** Exhaustive malformed/forged validation, immutability, equality, exact serialization, all V1 quality/root/inversion compatibility contexts, and wrapped-order evidence.
**Exit:** MUS-021/NFR-020 and AC-048 pass without new dependencies, framework coupling, or Stage 4 behavior.

### Stage 4A — Harmony policy architecture and contract

**Status:** Merged and complete through PR #25 (merge commit `9f45744f067875955cc0e87b768cae56c8a95be9`). This was documentation-only; Harmony production implementation remains separately gated.
**Objective:** Define the smallest deterministic V1 Harmony policy before engine implementation.
**Capabilities:** Versioned templates, degree-to-Chord mapping, profile-approved triad qualities, bounded inversions/voicings, integer voice-leading cost and tie-breaks, seeded variation boundary, unsatisfiable reasons, and decision/provenance records for all four V1 profiles.
**Dependencies:** Merged Stage 3 primitives, reviewed profile data, and explicit Stage 4B implementation authorization.
**Non-goals:** Harmony TypeScript, progression generation, PRNG helpers, MIDI, bass, arp, melody, AI, persistence, UI, audio, extensions, or sevenths.
**Tests:** Future golden progressions, profile/template combinations, compatibility invariants, deterministic replay/ties, unsatisfiable cases, seeded fixtures, property checks, and preliminary human review.
**Exit:** MUS-022/NFR-021 and AC-049 contract review confirms representation, profile data, deterministic selection, failure behavior, provenance, and deferred implementation boundaries.

### Stage 4B1 — Harmony template runtime

**Status:** Merged and complete through PR #28 (merge commit `b4df679ce3c8aab4ed0dba4faca2c6a46b6fd35d`). Scope was limited to template/profile runtime data, validation, lookup, and degree-to-Chord realization; later Harmony behavior remains separately gated.
**Objective:** Execute the accepted `nightdrive.harmony-template.v1` contract deterministically against existing Keys and Chords.
**Capabilities:** Immutable concrete catalog, opaque-ID lookup, accepted profile/scale mappings, structural validation including optional slot inversion restrictions, scale-context validation, and explicit slot realization.
**Dependencies:** Merged Stage 4A and Stage 3 primitives.
**Non-goals:** Template selection, inversion/voicing selection, voice-leading, progression optimization, seeded variation, MIDI, bass, arp, melody, AI, UI, or persistence.
**Tests:** Catalog fidelity, profile mapping, opaque-ID boundary, golden degree roots/qualities/members, all-template realization, malformed input, scale mismatch, immutability, and determinism.
**Exit:** MUS-023/NFR-022 and AC-050 pass without new dependencies or later Stage 4 behavior.

### Stage 4B2 — Harmony voicing candidates

**Status:** Merged and complete through PR #30 (merge commit `776a10101b9c4eb267aa85c628b23228f0e3c7eb`). Scope remains limited to profile voicing policies, deterministic hard-valid ChordInversion/ChordVoicing candidate enumeration, range/span constraints, explicit inversion restrictions, deterministic lexicographic ordering, and `NO_INVERSION`; `NO_VOICING` remains reserved because fixed V1 policies admit candidates for every triad. Stage 4B3 and later Harmony behavior remain separately gated.
**Objective:** Enumerate deterministic hard-valid ChordInversion and ChordVoicing candidates under the accepted Stage 4A policy bounds.
**Capabilities:** Profile voicing policies, strict range/span validation, Chord membership and inversion compatibility filtering, explicit inversion restrictions, immutable candidates, deterministic lexicographic ordering, and structured no-inversion/no-voicing failures.
**Dependencies:** Merged Stage 4B1 and existing Chord, ChordInversion, and ChordVoicing primitives.
**Non-goals:** Candidate selection, scoring, voice-leading, progression generation, seeded variation, PRNG helpers, MIDI, bass, arp, melody, extensions, harmony implementation beyond this bounded candidate layer, AI, UI, or persistence.
**Tests:** Policy immutability, candidate invariants, ordering/uniqueness, restriction behavior, wrapped-root compatibility, fixed-policy boundary checks, and repeatability; no-voicing is reserved because every fixed V1 triad policy has candidates.
**Exit:** MUS-024/NFR-023 and AC-051 pass without new dependencies or selection, voice-leading, progression, or Stage 4 engine behavior.

### Stage 4B3 — Adjacent voice-leading cost and candidate selection

**Status:** Merged and complete through PR #34 (merge commit `1e7a1cf3503ade791521df8ae967ea9857090f17`). Scope remains limited to adjacent voice-leading cost and deterministic selection from an existing hard-valid candidate set, with accepted applicable tie-breaks, immutable results, and `NO_VOICING` empty-candidate behavior. Full progression generation, lookahead, dynamic programming, global optimization, profile soft-preference scoring, cadence/first-slot policy, repeated-inversion preferences, seeded variation, MIDI, and later Harmony behavior remain separately gated.
**Objective:** Calculate accepted adjacent voice-leading cost and select one target candidate from an existing hard-valid set deterministically.
**Capabilities:** Exact integer three-voice cost, candidate-order-independent lower-cost selection, maximum-pitch/bass/middle/top tie-breaks, immutable selection results, and structured empty-input failure.
**Dependencies:** Existing Stage 4B2 candidate enumeration and ChordVoicing primitives.
**Non-goals:** Progression generation, lookahead, dynamic programming, global optimization, template/profile selection, scoring, seeded variation, PRNG helpers, MIDI, AI, UI, or persistence.
**Tests:** Exact cost fixtures, tie-break evidence, candidate-order independence, integer-cost invariants, immutability, empty input, and regression coverage.
**Exit:** MUS-025/NFR-024 and AC-052 pass without new dependencies or progression-wide Harmony behavior.

### Stage 4B4 — Harmony progression realization contract

**Status:** Merged and complete through PR #37 (merge commit `d5c11ef7a512cc2cbec1953591c25e5a74b5b31f`).
**Objective:** Define deterministic sequential realization of one complete ordered Harmony progression from the accepted template, Key, candidate, and adjacent-selection contracts.
**Capabilities:** Deterministic first-slot anchor, sequential greedy later-slot selection, explicit soft-preference ranks, hard restriction interaction, slot-duration preservation, specific failure propagation, immutable non-canonical result shape, and explanatory provenance boundary. Later-slot ranking is a separate Stage 4B4 orchestration policy that reuses Stage 4B3 adjacent cost and pitch tie-break definitions without modifying the Stage 4B3 selector.
**Dependencies:** Accepted Stage 4A, Stage 4B1, Stage 4B2, and Stage 4B3 contracts.
**Non-goals:** Production progression generator, lookahead, dynamic programming, global optimization, profile soft scoring beyond documented ranks, seeded variation, PRNG helpers, MIDI, bass, arp, melody, AI, UI, persistence, or Stage 4 completion.
**Tests:** First-slot and preference fixtures, sequential repeatability, slot/bar preservation, failure propagation, candidate restriction interaction, immutable result/provenance shape, and human musical-quality review.
**Exit:** MUS-026/NFR-025 and AC-053 contract review confirms deterministic sequential policy, preference priority, result boundaries, provenance, and deferred implementation scope.

## Stage 4 — Harmony engine

**Objective:** Generate valid progressions and voice-led chord tracks.
**Capabilities:** Initial profile harmony templates, chord construction, inversions, voicing/range/voice-leading, decision records.
**Dependencies:** Stage 3; reviewed initial profile data.
**Non-goals:** Bass/arp/melody, AI selection.
**Tests:** Golden harmony, property/invariant, unsatisfiable constraints, deterministic replay, preliminary human review.
**Exit:** AC-002/003/004 harmony evidence passes for every initial profile.

## Stage 5 — MIDI engine and export

Stage 5A below is the accepted boundary and dependency-spike definition. Stage 5B1, Stage 5B2a, Stage 5B2b, Stage 5C1, and Stage 5D1 are merged bounded implementation/evidence slices; MIDI-004 is accepted only for the declared tested FL Studio environment, while broader compatibility and later MIDI behavior remain separately gated.

### Stage 5A — MIDI boundary and dependency-spike definition

**Status:** Documentation-only contract milestone; implementation and dependency adoption remain separately gated.
**Objective:** Freeze the canonical-composition-to-MIDI boundary before any serializer or parser is selected.
**Capabilities:** Versioned Nightdrive-owned MIDI IR, validated canonical timing input, exactly 960-PPQ integer ticks, Standard MIDI File Format 1 with conductor track 0 and fixed component/channel policy, explicit Note Off representation, deterministic note lifecycle and equal-tick ordering, terminal End-of-Track at tick 30720 on every track, structured failures, semantic/binary determinism distinction, isolated adapter interface, independent-parser validation plan, FL Studio acceptance protocol, and a bounded `midi-file` versus `midi-writer-js` dependency spike definition.
**Dependencies:** Existing canonical composition/timing and Harmony contracts; no new package is added.
**Non-goals:** MIDI writer/parser implementation, browser download, `.mid` fixtures, package installation, instrument assignment, MIDI editing/import product behavior, or Stage 5B authorization.
**Tests/evidence:** Documentation review of the IR and ordering contract, malformed-input and binary-fixture strategy, independent parsing and round-trip plan, FL Studio import checklist, and evidence criteria for the later dependency spike.
**Exit:** MUS-027/NFR-026 and AC-054/055 confirm the boundary, deterministic policies, adapter isolation, validation strategy, and dependency evaluation gate without production MIDI behavior.

### Stage 5B — MIDI implementation

Stage 5B is delivered through separately bounded implementation slices. Stage 5B1 establishes the owned semantic IR, Stage 5B2a provides the isolated serializer adapter, and Stage 5B2b provides independent parser/reference and round-trip evidence; production parser and later export work remain separately gated.

#### Stage 5B1 — Nightdrive-owned MIDI IR and strict validators

**Status:** Merged and complete through PR #42; later parser/reference and delivery work remains separately gated.
**Objective:** Establish the framework-independent Nightdrive MIDI IR and deterministic validation boundary before any third-party SMF adapter.
**Capabilities:** Versioned IR schema, closed conductor/chords/bass/arp/lead identities, fixed component channels, absolute 960-PPQ ticks, one-section boundary validation, typed conductor and component events, explicit Note On/Note Off semantics, source-note span expansion, stable structured failures, and immutable validated values.
**Dependencies:** Existing musical-time and pitch primitives; no new package.
**Non-goals:** Standard MIDI bytes, parser, VLQ/delta encoding, browser download, `.mid` fixtures, dependency adoption, FL Studio import, lane generation, Harmony changes, persistence, UI, or AI.
**Tests/evidence:** Focused boundary, component/channel, lifecycle, metadata, unsupported-event, immutability, forged-runtime, and explicit note-expansion tests; complete repository validation.
**Exit:** MUS-027, NFR-026, MIDI-001/002/003, AC-054, and ADR-017 are exercised by the owned IR/validator implementation without serializer or dependency behavior.

#### Stage 5B2a — Isolated deterministic SMF Format 1 serializer adapter

**Status:** Merged and complete through PR #43; independent parser/reference evidence is separately bounded in Stage 5B2b.
**Objective:** Serialize validated Nightdrive MIDI IR as deterministic Standard MIDI File Format 1 bytes without changing canonical ownership.
**Capabilities:** `serializeStandardMidiV1` environment-neutral byte output, strict IR revalidation, Format 1/960 header, conductor-first fixed component-track order, absolute-to-delta conversion, explicit Note Off `0x8n` with release velocity 0, and exactly one terminal End-of-Track at tick 30720 per emitted track.
**Dependencies:** Adopted `midi-file` `1.2.4` only behind the isolated adapter; no third-party types cross the public boundary and no runtime transitive dependencies are introduced.
**Non-goals:** Production parser/round-trip API, VLQ API exposure, browser delivery, FL Studio import, generation, Harmony changes, or later MIDI workflow behavior.
**Tests/evidence:** Focused byte-level SMF header/chunk/event inspection, fixed track/channel mapping, delta-time and explicit Note Off assertions, terminal EOT and no-extra-event checks, deterministic repeated serialization, forged-IR rejection, existing Stage 5B1 tests, and complete repository validation.
**Exit:** Stage 5B2a serializer tests and repository gates pass with adapter isolation, deterministic Format 1 bytes, exact boundary/EOT semantics, and no parser or browser-delivery behavior.

#### Stage 5B2b — Independent SMF parser/reference verification

**Status:** Merged and complete through PR #44; production parser, browser delivery, and FL Studio compatibility acceptance remain separately gated.
**Objective:** Provide test-only independent parser/reference evidence that the accepted Stage 5B2a bytes preserve semantic fields and deterministic Standard MIDI invariants.
**Capabilities:** Independent strict Format 1/960 parser, semantic round-trip assertions for accepted IR fields, deterministic golden byte fixtures and hashes, explicit Note Off and terminal EOT evidence, and malformed-file rejection coverage.
**Dependencies:** Merged Stage 5B1 IR and Stage 5B2a adapter; no new dependency.
**Non-goals:** Production parser, serializer changes, browser delivery, FL Studio import, `.mid` packaging, MIDI editing, generation, Harmony changes, or later MIDI workflow behavior.
**Tests/evidence:** Six deterministic golden fixtures covering conductor/component layouts, simultaneous notes, same-tick off-before-on, boundary-ending notes, and absent optional tracks; independent semantic round-trip checks; malformed header/chunk/VLQ/EOT/channel-event rejection; exact Note Off, ordering, and EOT assertions; repeated byte equality.
**Exit:** Stage 5B2b reference tests and repository gates pass with no serializer or IR changes, no third-party reader used as the sole oracle, and production parser/delivery still separately gated.

#### Stage 5C1 — Controlled FL Studio MIDI interoperability acceptance preparation

**Status:** Merged and complete through the controlled human review for FL Studio Producer Edition 2025 `26.1.6.5639`; MIDI-004 is satisfied for that declared tested environment only.
**Objective:** Prepare one deterministic Standard MIDI File fixture and a precise manual FL Studio verification record without automating or claiming interoperability.
**Capabilities:** Production-serializer-generated `stage-5c1-interoperability.mid`, committed source IR and SHA-256, independent parser semantic checks, and a controlled import/inspection checklist with evidence fields.
**Dependencies:** Merged Stage 5B1 IR, Stage 5B2a adapter, Stage 5B2b independent reference evidence, and an explicitly declared FL Studio test environment; no new dependency.
**Non-goals:** FL Studio automation/control, compatibility claims, browser delivery, ZIP/package export, parser or serializer changes, `.flp`, instrument assignment, generation, Harmony changes, persistence, UI, or AI.
**Tests/evidence:** Exact byte/hash regeneration, independent Format 1/960 parsing, expected tempo/meter/tracks/events, explicit Note Off and terminal-boundary checks, plus the manual protocol in `docs/reviews/STAGE5_FL_STUDIO_INTEROPERABILITY.md`.
**Exit:** Automated fixture evidence and the recorded clean re-import review pass for the declared environment; exact numeric velocity preservation remains not directly verifiable, and broader compatibility remains deferred.

#### Stage 5D1 — Browser MIDI download delivery adapter

**Status:** Merged and complete through PR #47 (merge commit `62066db63a2dbf8f7a44498780a89ba27daa34f7`); full export UX and later delivery workflows remain separately gated.
**Objective:** Deliver already-produced deterministic MIDI bytes through a browser-only download adapter without changing MIDI semantics or requiring a server route.
**Capabilities:** Strict `Uint8Array` input, deterministic safe `.mid` filename normalization, `audio/midi` Blob creation, temporary-anchor download triggering, and deterministic anchor/object-URL cleanup.
**Dependencies:** Existing Stage 5B2a serializer adapter and browser platform APIs; no new package.
**Non-goals:** Serializer or IR changes, server/API delivery, persistence, package/ZIP export, component-file packaging, browser export UX, FL Studio compatibility claims, or later MIDI behavior.
**Tests/evidence:** Filename edge cases, exact Blob bytes and MIME type, click/filename/object-URL lifecycle, DOM cleanup, input immutability, repeated invocation, failure cleanup, and static inward-boundary checks.
**Exit:** Focused browser-delivery tests and repository gates pass with no MIDI semantic or serializer changes and no new dependency.

#### Later MIDI delivery and interoperability work

**Status:** Not authorized; requires a separate bounded task after any further compatibility review.
**Objective:** To be defined by an explicitly authorized implementation brief against the Stage 5A contract.
**Capabilities:** None approved.
**Dependencies:** Accepted Stage 5A contract, completed dependency spike, reviewed Stage 5B2a adapter, accepted Stage 5B2b evidence, and Stage 5C1 review.
**Non-goals:** Any work inferred from this placeholder, including package workflow or later delivery behavior.

**Umbrella objective:** Produce independently valid, deterministic standard MIDI from canonical events.
**Capabilities:** SMF writer/reader validation, conductor/component tracks, stable ordering, browser download adapter.
**Dependencies:** Stage 3; harmony fixtures.
**Non-goals:** Complete production package or `.flp`.
**Tests:** Binary fixtures, independent parser, round trip, malformed cases, FL Studio import spike.
**Exit:** AC-007/008 and an initial AC-009 compatibility record pass.

## Stage 6 — Bass engine

**Status:** Stage 6A1 root-pitch foundation and Stage 6A2 canonical event projection are merged; the straight-rhythm contract is merged through PR #52 (merge commit `fddc268e30bd365a9b6c04f3bc85fd2c4396f02e`) and its bounded production implementation is merged through PR #56 (merge commit `4cb0444d10cdd500bea1947680012e64087ad71b`); later Bass work remains separately gated.
**Objective:** Preserve the deterministic root-aligned Bass V1 baseline while defining the smallest component-owned straight-rhythm expansion.
**V1 contract:** Require validated Harmony progression context; preserve the approved root-pitch range/continuity policy; select one of the closed identifiers `sustained`, `quarter-pulse`, `eighth-pulse`, `sixteenth-pulse`, or `offbeat-eighth` through the shared bounded-parameter envelope; restart pattern phase at every slot; use only exact integer `960`/`480`/`240` tick subdivisions and the exact per-bar offbeat offsets; never cross a slot or the eight-bar boundary; keep seed provenance-only. Omitted rhythm maps to the implemented `sustained` Stage 6A2 behavior.
**Capabilities:** Bounded implementation of sustained, straight quarter/eighth/sixteenth pulses, and offbeat eighths. Compound rhythms, generalized syncopation, independent density, pitch movement, octave behavior, aggression, and seeded musical variation remain separately gated.
**Dependencies:** Stages 3–4.
**Non-goals:** Triplets, dotted figures, gallop/reverse-gallop, broader syncopation or rests, cross-slot ties, gate/velocity/accent patterns, passing/approach/pedal/slash/inversion behavior, octave patterns, seeded musical variation, profile-specific ranges, audio synthesis, arbitrary style libraries, MIDI, browser, UI, persistence, or AI behavior.
**Tests:** Merged implementation evidence covers exact per-mode starts/durations/counts, slot-local phase reset, offbeat multi-bar offsets and initial silence, no boundary crossing, root/continuity preservation, immutability, structured failures, repeatability, and ambient-randomness isolation. No seed-change fixture is claimed because the runtime Bass API has no seed/provenance input.
**Exit:** FR-002/AC-002, MUS-001, MUS-002/AC-010, MUS-006/AC-013, NFR-001/AC-004, and NFR-005/AC-029 evidence passed through PR #56 without compound/expressive rhythms, new dependencies, or later capabilities; the milestone is merged and complete.

## Stage 7 — Arpeggiator

**Status:** Stage 7A is merged through PR #58; Stage 7B1 candidate foundation is accepted and merged through PR #59 at `c6593f38ef1987c5156a3000d2a0325a1da40aaa`; Stage 7B2 simple event projection is accepted and merged through PR #62 at approved head `b103a7c4e054f8b62ca81b660b53a2c6c2cdc797` with merge commit `acaea6da15dc3a97fc30421a181e0e7ca9d22c96`; Stage 7B3 rate/direction expansion is accepted and merged through PR #65 at approved head `7548055fe28c78d5f752481009e3f37970182054` with merge commit `74a77ebdee3a8d437697c47066adf14e934acff9`; Stage 7B4 integer gate control is accepted and merged through PR #68 at approved head `0878f77a5b6c5e31f142ab04771cc8bf1f7f0a8a` with merge commit `a061bb91d3fe3d973d0795df240cdd46d118a7af`. Full Stage 7 remains pending.
**Objective:** Generate profile-appropriate arpeggios from harmony.
**Foundation contract:** Consume validated Harmony progression slots without replacing their Chord, inversion, or selected voicing; filter exact selected-voicing MIDI pitches through an inclusive range; project immutable monophonic events at exact integer quarter/eighth/sixteenth rates; use exact up/down/up-down/down-up traversal with slot-local reset; and constrain integer `gateTicks` to `1..rateTicks`. See [Arpeggiator model](ARPEGGIATOR_MODEL.md).
**Eventual capabilities:** Rate, direction, range, gate, octave, density, seeded patterns, and concrete profile policy. Octave expansion, density, seeded behavior, and profile mappings remain separately gated and are not removed from Stage 7 completion.
**Dependencies:** Stages 3–4.
**Non-goals:** Free-running audio Arp, VST automation, MIDI ownership, browser/audio behavior, UI, persistence, or AI-authored canonical notes.
**Tests:** Active-Harmony derivation, selected-voicing compatibility, boundary/gate/range, exact direction cycles, slot reset, immutability, ambient-randomness isolation, replay, and golden review; later evidence must cover accepted octave, density, seed, and profile behavior.
**Exit:** AC-011/004/013 pass in full. The deterministic foundation may satisfy only its applicable structural subset and must not be treated as full Stage 7 acceptance.

### Stage 7A — Deterministic foundation contract definition

Documentation only: freeze ownership, component event shape, exact rates/directions, selected-voicing range filtering, integer gate, slot reset, errors, determinism, test expectations, and explicit deferrals. No runtime implementation.

### Stage 7B1 — Candidate foundation

Merged and accepted through PR #59: validate Harmony input and Chord/inversion/voicing compatibility; derive the immutable stable in-range subset of the exact selected voicing; return structured failures. No events, timing, traversal, gate, seed, density, or octave expansion.

### Stage 7B2 — Simple canonical event projection

Merged and accepted through PR #62: project monophonic slot-local events using the fixed baseline of eighth-note rate, up direction, and full-step gate. No configurable rate/direction/gate expansion.

### Stage 7B3 — Rate and direction expansion

Merged and accepted through PR #65: accept an optional complete `ArpTraversalParametersV1` containing exact quarter/eighth/sixteenth rate and up/down/up-down/down-up direction, while omission preserves the Stage 7B2 eighth/up behavior. Duration remains the full selected rate step. No partial parameter objects, gate input, compound rates, seed, density, or octave expansion.

### Stage 7B4 — Integer gate control

Accepted and merged through PR #68 (approved head `0878f77a5b6c5e31f142ab04771cc8bf1f7f0a8a`, merge commit `a061bb91d3fe3d973d0795df240cdd46d118a7af`). The complete Stage 7B3 traversal argument now accepts optional integer `gateTicks`. Absence or explicit `gateTicks: undefined` defaults to the selected `rateTicks`, including existing rate/direction-only calls; every other supplied value must be a finite safe integer in `1..rateTicks`. Gate changes event duration only: rate continues to own event starts, counts, pitch traversal, and slot-local reset. Invalid values produce `INVALID_ARP_GATE` at `parameters.gateTicks` after rate and direction validation and before internal timing validation. No ratios, floating percentages, overlap, velocity, ties, MIDI articulation, octave expansion, density, seed, or profile policy.

### Stage 7C — Remaining policy definition

**Status:** Documentation-only contract checkpoint accepted and merged through PR #70 (approved head `294a93ed665120f0a0b99cb2ca7cd05ac12cfdcf`, merge commit `02c03de62bda6ef8b6b167dcae624d48a5890126`). Stage 7C7a3 is accepted and merged through PR #86 at approved head `b82651327e2dece6cb2c9d6462d3fb61d53179cb` with merge commit `adddaa0c5a6227583dd73c46b9b59747ac79b8d6`; it implements only the internal immutable density-mask catalog and deterministic lookup. Stage 7C7a4 is accepted and merged through PR #88 at approved head `5844ef48bdaf98bb638b081d8eb610842b90cc42` with merge commit `8ebc73a71703893ca1afa608b96264d0db51ee12`; it implements only the shared canonical Energy/Complexity runtime boundary. Stage 7C7a5 is accepted and merged through PR #90 at approved head `d2b18ca3156d358693e1d00456cde1558afcca51` with merge commit `e87e270745b6fe219df8b0cd76f47f47ded03400`; it implements only the shared Arpeggiator policy-configuration foundation. Stage 7C7a6 is accepted and merged through PR #92 at approved head `a7193128e9d8febcee6cca306a0f07fc1c6cc41a` with merge commit `e4ae8e8675a83e69752362565f94b73907ded10a`; it implements only the internal immutable genre-profile configuration runtime. Stage 7C7a7 policy resolution is accepted and merged through PR #94 at approved head `133c7f6fecc2a78ea4278fb7b44921a2484a0c13` with merge commit `afbe3493841ef38a62eb961368a2f1147f008725`. Stage 7C7a8 resolved-plan projection is accepted and merged through PR #96 at approved head `43d251c4c95d39f60320ad90bd80522c514d721c` with merge commit `a14b6e100d00464e314309b45813943e6f81b83a`. The enclosing Stage 7C integration/error-precedence operation is accepted and merged through PR #98 at approved head `d4373c60cb3242058df4bc1c898ccb2d465f0741` with merge commit `6f5e1d26e9f48a678f5c995538fdb218d29fd39d`; aggregate provenance, structured human evaluation, and all later work remain separately gated.
**Accepted bounded slices:** Stage 7C1 is accepted and merged through PR #72 (approved head `8d0a2d5ba3919e64b96cc2267cab0a0efd66d75e`, merge commit `77fde7d939f8da563cfbff28f4c5e69c37d754b2`). Stage 7C2 is accepted and merged through PR #73 (approved head `ef0f5f897eef215e01cf0857a0b1e92aa7979214`, merge commit `05a6f1a4b9e352bb8850c4f3ec3f034432d302bb`). Stage 7C3 component-seed derivation is accepted and merged through PR #75 (approved head `81b3c878daed262e18a50a2a539235c7bbc7e772`, merge commit `ec90258658a789d186f297cbc7041983bbbbea8a`); it was documentation-only and included the closed component vocabulary, canonical domain-separated bytes, MurmurHash3 x86_32 arithmetic, output semantics, isolation guarantees, validation implications, and normative vectors without runtime implementation.
**Accepted prerequisite contract:** Stage 7C-P1 is accepted and merged through PR #79 at approved head `5a3f4cabd2dec99a309e50bf18a42d8c67ba17c0` with merge commit `2c138e67b8ed6003e2de273482f483289c4ce970`. It freezes the shared normalized composition-brief `EnergyV1` and `ComplexityV1` domains: exact five identifiers, ordinal order, orthogonality, `medium` creation defaults, strict canonical validation, and composition-brief schema/replay ownership.
**Accepted profile-policy contract:** Stage 7C4 is accepted and merged through PR #80 (approved head `2fb30286e9856e67b2ada775f187218a15303f95`, merge commit `4a1c8789e80087b66140740d71ec6663c3c8c6d0`). It freezes `nightdrive.arpeggiator-policy.v1`, the `nightdrive.genre-profile.arpeggiator.v1` profile-data set, exact profile candidate order and raw integer weights for all five decision slots, explicit energy/complexity lookup construction for all 25 pairs, and exact integer `short|medium|long` gate resolution without authorizing runtime implementation.
**Accepted structured-error contract:** Stage 7C5 is accepted and merged through PR #81 (approved head `935f1570348d0b5565061e232f1783b9d2928291`, merge commit `d0dcd47c1568b448dae6b69ca425d174b95f49de`). It freezes exact boundary-owned structured-error codes and fields, deterministic two-phase mixed-invalid precedence, configuration-versus-caller failure semantics, and unchanged Stage 7B error compatibility without runtime evidence.
**Accepted runtime-interface contract:** Stage 7C6 is accepted and merged through PR #82 (approved head `82ca76bbb046669529d1515a2f534649e4d5675e`, merge commit `5d512548e4683ad90ec1c0eb5af3cdc9e72a73fb`). It freezes the exact public request/result operation, root-to-component seed handoff, inspectable five-field resolved plan, module-private resolver/projector boundaries, error ownership, version inputs, immutability, and Stage 7B compatibility without itself implementing runtime behavior or resolving MIA-004.
**Accepted first runtime slice:** Stage 7C7a1 is accepted and merged through PR #83 (approved head `0d81cbed4797999a4f0ef4669e3a22feab47e974`, merge commit `a56cbb3f235c56f11551dac3773dda2741a6eb9d`). It implements only the reusable `deriveComponentSeedV1` primitive, its neutral `ComponentSeedValueError` boundary, the exact Stage 7C3 canonical bytes and MurmurHash3 x86_32 arithmetic, and deterministic evidence for all normative vectors.
**Accepted bounded runtime slice:** Stage 7C7a2 implements only the internal `nightdrive.weighted-choice.uint32-modulo.v1` mechanism and its direct deterministic evidence. It preserves declared order, raw weights, exact bounded summation, modulo selection, half-open intervals, zero-weight and single-candidate semantics, generic value identity, and strict validation without becoming a public barrel API or calling the PRNG. It does not implement masks, profile configuration, policy resolution, event projection, the enclosing Stage 7C operation, or any profile behavior.

**Accepted bounded runtime slice:** Stage 7C7a3 implements only the Nightdrive-local immutable runtime representation and deterministic lookup of the accepted `nightdrive.arp-density-mask.v1` catalog. Its module-internal lookup accepts one accepted `ArpDensityMaskIdV1` and returns that canonical readonly four-step `on|rest` sequence by reference; the catalog and sequences are frozen. It has no public barrel API, caller-defined mask-array input, Stage 7C5 public error surface, PRNG consumption, profile/configuration validation, mask repetition/reset/traversal execution, event projection, octave expansion, resolver, or enclosing-operation behavior. Direct evidence locks the five exact mappings, closed catalog, four-step canonical contents, at-least-one-`on` invariant, immutability, deterministic non-mutating lookup, ambient and Nightdrive-PRNG isolation, private visibility, and Stage 7B/completed-primitive regressions. No new dependency is justified because this small replay-critical domain catalog remains Nightdrive-owned.

**Accepted bounded runtime slice:** Stage 7C7a4 implements the shared `src/music-domain/composition-intent.ts` boundary for distinct canonical `EnergyV1` and `ComplexityV1` types, separate frozen ordered vocabularies, raw creation omission/defaulting, strict canonical validation, a frozen explicit `{ energy, complexity }` result, neutral shared `CompositionIntentValueError`, and selective music-domain barrel visibility. At raw creation only, absent properties and explicit `undefined` both default independently to `medium`; at the canonical boundary both explicit fields are required and `undefined` is invalid. No coercion is permitted. The slice does not implement the broader composition brief, Arpeggiator profile configuration, candidate/weight construction, policy resolution, PRNG consumption, resolved plans, masks, octaves, projection, the enclosing operation, Stage 7C5 public errors, provenance, persistence, MIA-004, human evaluation, UI, MIDI, or browser/audio behavior. No dependency is justified.

**Accepted bounded runtime slice:** Stage 7C7a5 implements the direct-module `src/music-domain/arpeggiator-policy-configuration.ts` boundary for the exact policy and compatible profile-data identities, closed `1|2|3` octave and `short|medium|long` gate domains, exact rate→octave-range→direction→mask→gate schedule, weighted-choice and density-mask identities, all nine canonical semantic gate mappings, recursive immutability, deterministic shared-policy validation, and a private `policy.version`-owned failure discriminator. It adds no public barrel API, profile records or weights, candidate construction, seed/PRNG use, selection, resolver, plan, projection, enclosing operation, or public Stage 7C5 translation. No dependency is justified.
**Accepted runtime slice:** Stage 7C7a6 implements the direct-module `src/music-domain/arpeggiator-profile-configuration.ts` boundary for the literal accepted `nightdrive.genre-profile.arpeggiator.v1` data set. It owns only four canonical profile records in explicit order, five explicit slot records per profile, exact candidate tuples, five Energy vectors and five Complexity-addition vectors per slot, recursive immutability, deterministic local validation with `profile.version` ownership, and construction of ordered raw `WeightedCandidate<T>` lists by exact element-wise addition. Its focused evidence exhaustively locks all 500 accepted profile/slot/input lists without normalization, sorting, candidate removal, seed/PRNG use, or selection. It is accepted and merged through PR #92 at approved head `a7193128e9d8febcee6cca306a0f07fc1c6cc41a` with merge commit `e4ae8e8675a83e69752362565f94b73907ded10a`; it adds no public barrel API, resolver, plan, mask execution, octave expansion, projection, enclosing operation, or public Stage 7C5 translation. No dependency is justified.
**Accepted bounded runtime slice:** Stage 7C7a7 implements only the direct-module `resolveArpPlanV1` policy resolver. It consumes canonical profile, Energy, Complexity, and an already-derived component seed; advances one Mulberry32 stream exactly once through the rate→octave-range→direction→mask→gate schedule; reuses the accepted candidate builder and weighted-choice primitive; maps the selected semantic gate through the accepted policy table; and returns the exact frozen five-field resolved plan. It adds no public barrel API, preflight, root-seed derivation, Harmony validation, mask execution, octave expansion, event projection, enclosing operation, public Stage 7C5 translation, provenance, or dependency. It is accepted and merged through PR #94 at approved head `133c7f6fecc2a78ea4278fb7b44921a2484a0c13` with merge commit `afbe3493841ef38a62eb961368a2f1147f008725`.
**Accepted bounded runtime slice — Stage 7C7a8 resolved-plan projection:** The implementation adds the single module-private `projectResolvedArpPlanV1(progression, range, plan)` boundary. Its only scope is canonical event projection from a complete validated `ResolvedArpPlanV1`: upward `1|2|3` octave expansion from Harmony-selected voicings; inclusive MIDI/range filtering; stable deduplication and ascending ordering; accepted direction cycles with slot-local reset; exact repeating four-step mask behavior where rests consume both timeline and traversal; accepted integer rate starts and gate durations; and frozen, non-mutating `ArpEvent` output. Focused evidence covers octave/range/dedup/order, all directions and mask/reset/rest behavior, timing/gates, Stage 7B canonical-value compatibility for octave `1` plus `full`, immutability, and no duplicate traversal semantics. It consumes no PRNG/seed, exposes no public API or public structured errors, does not validate raw requests or profile/Harmony compatibility, and does not implement the enclosing operation, provenance, persistence, MIDI, UI, or later behavior. It is accepted and merged through PR #96 at approved head `43d251c4c95d39f60320ad90bd80522c514d721c` with merge commit `a14b6e100d00464e314309b45813943e6f81b83a`.
**Architecture:** Separate deterministic policy resolution from canonical event projection. Resolve bounded rate, octave range, direction, exact mask, and gate choices from normalized intent, profile/version, energy/complexity, and one component-isolated Arpeggiator seed; then project events without changing Harmony ownership or placing seed/provenance in `ArpEvent`.
**Contract direction:** V1 upward octave range is exactly `1|2|3`; octave range `1` is Stage 7B-compatible. Density resolves to an exact on/rest mask, and a rest consumes both its timeline step and underlying traversal position. One Arpeggiator Mulberry32 stream consumes exactly one output for each versioned decision slot in rate, octave-range, direction, mask, then gate order, including single-candidate slots. Stable named component seeds prevent Harmony/Bass/motif PRNG consumption from perturbing Arpeggiator output.
**Profile direction:** Four V1 profiles have exact allowed rate, direction, octave, density-mask, and gate candidate orders and small raw integer weights. Independent energy and complexity lookup vectors may bias choices only inside those bounds. These data are Nightdrive policy hypotheses requiring deterministic and structured human evaluation, not universal genre formulas.
**Current gate:** The corrected listening setup, external 28-fixture package, locked Pass 1/Pass 2 evidence, and deterministic policy-sensitivity diagnostic are recorded in [Stage 7 Arpeggiator evaluation results](reviews/STAGE7_ARPEGGIATOR_EVALUATION_RESULTS.md). No runtime defect was identified; individual usability and seed stability passed for the exploratory single-reviewer baseline, while Energy and Complexity sensitivity remain REVISE/open. Successor compatibility is accepted and merged through PR #109. The exact [R1 V2 calibration candidate](reviews/STAGE7_ARPEGGIATOR_V2_CALIBRATION.md) is documented for review, and the proposed V2 public request/result/error contract is [defined for review](ARPEGGIATOR_MODEL.md) under accepted [ADR-020](DECISIONS.md) decisions. Neither is implemented or musically accepted. ChatGPT review of the complete V2 public contract is the next gate; V2 runtime, matched human comparison, aggregate provenance, and Stage 8 remain later.
**Dependencies:** No new dependency is recommended. Seed derivation and policy ordering are small replay-critical Nightdrive infrastructure; existing `nightdrive.prng.mulberry32.v1` remains the PRNG boundary.
**Non-goals:** Runtime beyond the accepted enclosing operation; aggregate provenance; AI-authored or arbitrary chromatic notes; chord/scale additions; Harmony replacement or new voicing authority; floating per-step probability; velocity/accent, swing, humanization, MIDI articulation, browser/audio, UI, persistence, arbitrary scripting, or dependency installation.
**Evidence before completion:** Stage 7B compatibility; octave `2`/`3` bounds/deduplication/order; exact mask behavior and traversal consumption; every Stage 7C4 candidate order and final raw weight across all 25 energy/complexity pairs; all exact gate mappings; equal-input/seed/version replay; component-seed isolation; fixed decision-slot consumption; ambient-independence; profile-bound enforcement; seed-derivation golden/cross-runtime vectors; AC-004/AC-011/AC-013 evidence; and structured human listening evaluation for all four profiles.
**Exit:** Documentation review may accept the architectural direction, but Stage 7C and full Stage 7 remain incomplete until the separately gated exact contracts, implementation, automated evidence, and human musical evaluation are accepted.

### Stage 7 successor versioning and compatibility checkpoint

**Status:** Compatibility architecture accepted and merged through PR #109 at merge commit `590075f45a4d5e03480b1d8c3a076d1119cb03e9`. [ADR-019](DECISIONS.md), the [Arpeggiator model](ARPEGGIATOR_MODEL.md), and the [genre-profile model](GENRE_PROFILE_MODEL.md) define the exact V1/V2 pairs and preserve V1 replay. The first successor keeps the same five-slot algorithm, seed/PRNG/selector/projector, shared domains, and every profile's candidate subset/order; only profile-owned Energy weights and Complexity additions may change. The exact [R1 candidate calibration contract](reviews/STAGE7_ARPEGGIATOR_V2_CALIBRATION.md) is documented for review with its full tables, fingerprint, V1 ledger, research gains, and retained regressions. [ADR-020](DECISIONS.md) accepts the two public-boundary decisions on additional properties and operation-local version checks; the complete [V2 public contract](ARPEGGIATOR_MODEL.md) is proposed for ChatGPT review. Neither R1 nor V2 is implemented or musically accepted. Runtime implementation and matched comparative human listening remain later, separately authorized gates. Stage 7 is open and Stage 8 unauthorized.

## Stage 8 — Melody and motif engine

**Objective:** Produce coherent, inspectable lead motifs and variations.
**Capabilities:** Motif identity, phrase/repetition/call-response, target/passing/tension/resolution notes, range/leap constraints.
**Dependencies:** Stages 3–4; profile evaluation baseline.
**Non-goals:** LLM notes, vocal melody, full-song development.
**Tests:** Transformation/constraint/property fixtures, deterministic replay, structured human review.
**Exit:** AC-012/004/013 and agreed human-review disposition pass.

## Deferred UI Visual Reference Gate

**Status:** Deferred checkpoint; not reached or authorized.
**Trigger:** Reach this gate only when accepted Version 1 capabilities and primary workflows are sufficiently defined to enumerate the required screens, panels, controls, interaction states, information hierarchy, user-facing feedback, and important empty/loading/error states. The trigger is based on project state, not a date or milestone number.
**Required sequence:** Before substantial UI implementation, define the UI/UX requirements and interface inventory, establish the interaction architecture, obtain the product owner's visual-direction decision, translate that decision into a visual design brief, create a comprehensive ChatGPT Image reference package, obtain product-owner review/acceptance, and record accepted design-system decisions. Only then may bounded UI implementation be separately authorized.
**Visual authority:** Cyberpunk is only a current provisional direction until the product owner confirms, refines, combines, or replaces it. Visual references are design references, not functional specifications; accepted product requirements, architecture, contracts, and UI/UX requirements remain authoritative. Codex must not independently select or formalize the final visual identity.
**Scope protection:** This checkpoint does not authorize UI/UX definition, visual-reference generation, visual styling, frontend infrastructure, or any current milestone work.

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
