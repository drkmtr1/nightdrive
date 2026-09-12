# Testing strategy

## Test layers

- Unit: theory/time primitives, constraints, seeded PRNG, generator decisions, editor commands, MIDI ordering/encoding, schema parsing.
- Property/invariant: pitch/range/tick bounds, positive durations, deterministic equality, transposition relationships, no locked mutation.
- Integration: full component pipelines, persistence transactions, migrations, export round trip, preview scheduling adapters.
- API/contract: auth, schema, idempotency, conflict, limits, typed errors, provider failure.
- Supabase/RLS: local/CI database with owner, other user, anonymous, and service-specific cases.
- E2E: first-time create/audition/edit/lock/vary/save/reopen/export workflows and failure recovery.
- Accessibility/responsive: automated axe-like checks plus keyboard, focus, screen reader, zoom, contrast, motion/audio and viewport matrix.
- Security: authorization, injection, size/depth, rate/timeout, secret/build scan, dependency review.
- AI evaluation: schema/adversarial/grounding/usefulness/cost/latency regression using frozen inputs and mocked provider for CI.
- FL Studio: retained export fixtures plus structured manual import protocol on supported version(s).

## Stage 2A baseline

The implemented foundation uses Biome `2.5.12` for formatting/linting, TypeScript `7.0.2` with `strict`, and Vitest `5.0.0` with Testing Library, jsdom, and axe-core. Current automated coverage verifies the semantic empty state, absence of misleading feature controls, baseline axe violations, and the liveness route contract. Color contrast is reviewed against committed tokens because jsdom cannot compute reliable rendered contrast. A production-server HTTP smoke check verifies `/`, `/api/health/live`, a missing route, and security headers.

Required Stage 2A commands are `npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run docs:check`, and `npm run build`. `npm run validate` composes all checks after installation. The runtime CI workflow runs them with the `.nvmrc` Node version while the original documentation workflow remains independent.

## Stage 3A musical-time core

The Stage 3A unit suite exhaustively round-trips every absolute tick from `0` through the inclusive conversion boundary `30720`. It separately verifies zero-based position examples, the unique terminal position, valid event-start versus event-end semantics, exact straight/dotted/triplet tick fixtures, positive-duration arithmetic, overflow, ordering, tempo rounding and derived seconds, time-signature validation, stable error codes/fields, and exact serialized strings. Invalid cases cover negative, zero where prohibited, fractional, non-finite, unsafe-integer, aliased-position, and out-of-section inputs.

A source-boundary test requires every production import in `src/music-domain` to be relative, preventing accidental Next.js, React, DOM, Node-only, provider, or third-party coupling. The full existing `npm run validate` gate remains unchanged and runs the new suite in both local and CI environments. No dependency or lockfile change is required.

## Stage 3B1 pitch identity

The Stage 3B1 suite exhaustively constructs and serializes all 12 pitch classes and all 128 MIDI pitches. For each MIDI value it verifies the exact `midiPitch % 12` extraction invariant, including fixtures `0→0`, `11→11`, `12→0`, `60→0`, and `127→7`. Boundary, fraction, non-finite, and unsafe-integer failures assert stable `PitchValueError` codes and fields. Equality and numeric ordering are tested without introducing note names, spelling, octave labels, or normalization arithmetic.

The music-domain dependency-boundary test now recognizes static imports, dynamic imports, re-exports, and side-effect-only imports before enforcing relative specifiers. This remains a deliberately small source guard rather than a general parser. The complete repository gate and dependency graph remain unchanged.

## Stage 3B2a chromatic interval

The Stage 3B2a suite covers signed and compound semitone values (`-19` through `19` fixtures), zero, strict numeric failures, equality, comparison, negation, addition/subtraction, safe-integer overflow, repeated fixed-order serialization, and the algebraic invariants for representative values. It exhaustively tests all `128 × 128 = 16,384` ordered MIDI-pitch pairs for exact `to - from` distance and antisymmetry. No pitch-class directional-distance API or MIDI transposition is introduced.

## Fixtures

Version controlled: theory tables, seed/generator/profile versions, canonical JSON snapshots, malformed boundary cases, MIDI goldens/round trips, editor command histories, RLS identities, API contracts, and the golden music cases in [Evaluation](EVALUATION_PLAN.md). Binary fixtures must have source/license/provenance and a text manifest.

## Stage 3B2b1 scale formula foundations

Tests cover each of the six exact formulas and their seven-offset invariants, immutable formula results, invalid scale identifiers and degrees, deterministic fixed-order serialization, and exhaustive projection behavior for all 72 tonic/scale combinations. Each context checks all seven ordered members and all twelve pitch-class membership outcomes.

## Stage 3B2b2a Key primitive

Tests exhaust all 72 tonic/scale Keys, verify immutable two-field construction, delegated seven-member projection, all seven degree lookups, all twelve membership outcomes, equivalent/different-key equality, forged runtime input rejection, and repeated fixed-order `nightdrive.key.v1` serialization without derived or spelling data.

## Stage 3B2b2b ChordQuality contract definition

This documentation-only gate reviews the exact three-quality table, formulas, profile rationale, quality/chord/voicing boundary, and seventh-as-extension decision. It must not be treated as production implementation or implementation test evidence.

## Stage 3B2b2d Chord aggregate contract definition

This documentation-only gate reviews minimal root-plus-quality identity, derived modulo-12 membership, deferred extensions, equality identity, serializer boundary, forbidden state, and Chord/Inversion/Voicing/Harmony separation. It must not be treated as production implementation evidence.

## Stage 3B2b2c ChordQuality primitive

Tests cover the closed three-ID vocabulary, runtime rejection of malformed and forged identities, exact formula invariants, frozen returned formulas, every ordered equality pair, exact fixed-order serialization fixtures, and exclusion of root, inversion, voicing, spelling, extension, display, and per-instance version fields.

## Stage 3B2b2e Chord primitive

The suite exhaustively constructs all 36 root/quality identities, verifies immutable two-field state and modulo-12 membership derivation, rejects forged runtime values, checks all 1,296 ordered equality pairs, and validates repeated exact minimal serialization with forbidden-field checks.

## Stage 3B2b2f ChordInversion contract definition

This documentation-only gate reviews the exact `0..2` member-index domain, canonical formula-order mapping, separation from Chord identity and voicing, reserved serializer shape, runtime-validation expectations, and explicit review requirement before wider chord cardinality. It provides no implementation evidence.

## Stage 3B2c1 Deterministic PRNG contract definition

This documentation-only gate reviews the versioned Mulberry32 selection and exact transition, uint32 seed/state/output boundaries, replay and lineage inputs, no-ambient-randomness and security boundaries, deferred stream/fork mechanics, and future known-answer, malformed-input, long-sequence, independent-instance, cross-runtime, and lineage/version-reference fixtures. It provides no implementation evidence; standalone PRNG serialization is deferred to the enclosing lineage/composition schema.

## Stage 3B2c2 Deterministic PRNG primitive

The implementation suite covers canonical seed boundaries and malformed/coercible rejection, fixed known-answer vectors for seeds `0`, `1`, and `0xffffffff`, independent and repeated-run determinism, exact state advancement, uint32 output invariants, forged-state rejection, algorithm identity, a longer deterministic sequence, and an ambient-randomness isolation test that fails if `Math.random()` is called. No bounded helpers, streams/forks, ambient randomness, or music policy are included.

## Stage 3B2b2h ChordVoicing contract definition

This documentation-only gate reviews the exact three-pitch representation, strict ordering and duplicate rules, malformed/forged MidiPitch expectations, Chord membership and ChordInversion compatibility boundaries, equality, reserved serialization, immutability, wrapped pitch-class examples, and deferred range/spacing/voice-leading policy. It provides no implementation evidence.

## Stage 3B2b2i ChordVoicing primitive

The implementation suite verifies exactly three immutable strictly ascending MidiPitches, source and returned-array mutation isolation, malformed and forged runtime rejection, deterministic ordered equality, exact minimal `nightdrive.chord-voicing.v1` serialization, and forbidden-field absence. It exhaustively checks Chord membership and ChordInversion compatibility across 12 roots, the three V1 qualities, and all three inversion indices, including wrapped B-diminished canonical order. No generation, doubling, wider cardinality, extensions, voice-leading, harmony, or MIDI behavior is included.

## Stage 4A Harmony policy contract

This documentation-only gate reviews the versioned template shape, all four bounded V1 profile datasets, explicit degree-to-Chord mappings and unsupported-combination failures, inversion and voicing hard bounds, integer voice-leading costs and deterministic tie-breaks, bounded PRNG participation, structured unsatisfiable reasons, provenance records, worked examples, and future golden/property/replay evidence. It provides no Harmony implementation evidence; human review remains a separate musical-quality gate.

## Stage 4B1 Harmony template runtime

Tests cover the immutable concrete catalog, opaque template-ID lookup, exact profile/scale mappings, strict template validation including optional inversion restrictions, scale mismatch rejection, deterministic explicit degree-to-Chord realization, major/natural-minor and wrapped-root fixtures, all-template execution, and repeatability. No selection, inversion/voicing, voice-leading, progression, seeded variation, or Harmony engine behavior is included.

## Stage 4B2 Harmony voicing candidates

Tests cover immutable profile voicing policies, deterministic lexicographic candidate ordering and uniqueness, strict MIDI range/span bounds, Chord membership and ChordInversion compatibility across all V1 qualities, explicit inversion restrictions, wrapped-root cases, exact minimum/maximum boundaries, and stable `NO_INVERSION` failure semantics. No-voicing failure is not reachable under the fixed V1 policies and is reserved for a future configurable-policy contract. No candidate selection, scoring, voice-leading, progression, seeded variation, MIDI realization, or later Harmony behavior is included.

## Stage 4B3 Adjacent voice-leading selection

Tests cover exact integer adjacent voice-leading cost, deterministic lower-cost selection, independent lower-maximum, lower-bass, and lower-middle tie-break evidence, candidate-order independence, immutable results, and stable empty-input failure. The lower-top tie-break is redundant because top pitch is the maximum pitch for a strictly ascending three-note voicing. No progression-wide optimization, lookahead, seeded variation, PRNG, MIDI, or later Harmony behavior is included.

## Stage 4B4 Harmony progression realization contract

Implementation evidence covers deterministic first-slot anchoring, sequential adjacent selection, and the separate Stage 4B4 progression-level ranking of hard-valid candidates by lower Stage 4B3 adjacent cost, applicable profile soft-preference rank, then the accepted Stage 4B3 pitch tie-break sequence. It also covers template inversion restrictions, slot order and bar preservation, specific failure propagation, immutable non-canonical result/provenance shape, repeatability, and human review of usefulness and profile fit. Tests may reuse Stage 4B3 cost/tie-break fixtures but must not imply that the Stage 4B3 selector itself performs profile-aware ranking. Darkwave cadence inversions `0` and `1` share a soft preferred rank over `2`; deterministic pitch tie-breaks decide otherwise-tied `0`/`1` candidates. It does not claim progression-wide optimization, seeded variation, MIDI, or later Harmony behavior.

## Stage 6 Bass V1 root-aligned baseline

Stage 6A1/A2 implementation evidence covers the documented Bass V1 baseline: a validated Harmony progression is required; exactly one immutable domain-level event is emitted per slot; each pitch is the current Chord root modulo 12; events use the existing integer musical-time primitives and slot bar spans inside the eight-bar boundary; and the deterministic first-event anchor/continuity rule selects the legal pitch nearest MIDI `43`, then nearest the previous Bass pitch, with lower pitch on ties, inside the approved inclusive range `36..60`. Tests cover legal root-candidate derivation, every root class, lower and upper range boundaries, anchor and continuity selection, lower-pitch tie-breaking, deterministic public resolution, positive durations, repeated-root stability, malformed/empty harmonic context, invalid ranges, no legal root pitch, structured errors, mutation isolation, and output immutability. The required shared seed is provenance-only in V1, so changing only the seed must not change musical events. No passing/approach/pedal/slash/inversion behavior, syncopation, rests, cross-slot ties, seeded variation, MIDI IR/serialization, browser, UI, persistence, or AI behavior is included. Human listening and profile-fit review remain separate from deterministic correctness.

## Stage 3B2b2g ChordInversion primitive

The implementation tests exactly three valid indices (`0..2`), reject malformed and forged runtime values, cover all 9 ordered equality pairs, and assert exact `nightdrive.chord-inversion.v1` fixtures for `0`, `1`, and `2`. They verify repeated byte-stable serialization, forbidden-field absence, and no coercion or wrapping. No Chord, voicing, harmony, MIDI realization, or wider-cardinality behavior is included.

Mock network/provider/storage clocks at boundaries; do not mock deterministic domain code in integration tests. Use a seeded project factory and fixed UTC clock. Human musical ratings are preserved as evaluation evidence, not converted into unit-test truth.

## CI gates

A release-candidate build requires clean install/lockfile integrity, format/lint/type checks, all unit/property/integration/API/schema/MIDI tests, migration and RLS tests, production build, E2E critical path, automated accessibility, security/secret/dependency gates, deterministic cross-runtime fixtures, and required evaluation/manual evidence. Tests cannot be deleted, weakened, or skipped merely to pass; a quarantine requires owner, reason, risk, expiry, and non-release status if release-blocking.

## Coverage philosophy

Prioritize behavioral/invariant and branch-risk coverage over a single percentage. Before implementation, each stage specifies exact thresholds for its modules and mutation/property testing where valuable. Generated code, trivial adapters, and UI presentation may have different targets, but P0 acceptance paths need direct evidence.

## Environments

Fast deterministic checks run on every change. Database/browser suites run in CI with isolated data. Preview smoke tests run after deployment. Production gets non-destructive smoke checks. FL Studio verification remains a controlled human gate until automatable evidence is credible.

## Stage 5A MIDI boundary and dependency-spike definition

This documentation-only milestone freezes the evidence plan for a Nightdrive-owned MIDI IR and isolated Standard MIDI adapter. Review covers validated canonical-composition input, exactly 960-PPQ integer ticks, Format 1 with conductor track 0 and fixed component/channel policy, explicit `0x8n` Note Off with release velocity 0, note-on/off expansion, equal-tick ordering, and the terminal-sentinel rule that places exactly one End-of-Track at tick 30720 on every track after any tick-30720 note-offs. It also covers structured failures, semantic versus binary determinism, and the FL Studio import checklist. It does not claim a writer, parser, browser download, `.mid` fixture, or dependency exists.

The later bounded dependency spike compares `midi-file` and `midi-writer-js` using deterministic binary fixtures, independent parsing, malformed-input behavior, browser/Node and TypeScript support, license/health/security, size/transitives, and adapter replaceability. Adoption requires evidence that Nightdrive semantics remain adapter-owned; otherwise custom encoding requires architecture review. No package installation or implementation evidence belongs to Stage 5A.

## Stage 5B1 MIDI IR and validator implementation

The Stage 5B1 suite covers the immutable Nightdrive-owned MIDI IR boundary: the V1 schema, closed conductor/component identities and fixed channels, fixed role names, required conductor metadata at tick 0, rejection of conductor metadata on component tracks, 960 PPQ, the 30720 section boundary, source-note span validation and explicit note-on/note-off expansion, MIDI pitch and velocity bounds, terminal End-of-Track placement, ascending absolute-event ordering with ordinary metadata before note-offs and note-ons, deterministic rejection of indistinguishable same-tick duplicates, matched non-overlapping note lifecycles, unsupported-event rejection, stable structured failures, and the absence of third-party MIDI types. It does not claim Standard MIDI serialization, parsing, browser delivery, `.mid` fixtures, or future musical-lane generation.

## Stage 5B2a deterministic SMF serializer adapter

The Stage 5B2a suite validates the isolated `serializeStandardMidiV1` boundary over revalidated Nightdrive IR. Independent byte-level helpers inspect the `MThd`/`MTrk` chunks, Format 1 header, 960 division, conductor-first fixed track order and channels, accepted metadata and note mapping, absolute-to-nonnegative-delta conversion, explicit `0x8n` Note Off with release velocity 0, and omission of absent components. Each emitted track is checked for exactly one terminal End-of-Track at tick `30720`, with tick-`30720` Note Off events before the sentinel and no later events. Repeated serialization must be byte-identical, forged/unsupported IR is rejected by the owned validator, and no third-party types cross the public adapter boundary. Parser/round-trip, `.mid` fixture, browser delivery, FL Studio import, and later MIDI behavior are outside that milestone.

## Stage 5B2b independent parser/reference verification

The Stage 5B2b suite uses a test-only independent reader rather than `midi-file` or the serializer as its sole oracle. It checks valid Format 1/960 headers, bounded `MTrk` chunks, explicit channel statuses, deterministic VLQ decoding, exactly one terminal End-of-Track at tick `30720`, and rejection of events after the sentinel. Six exact golden fixtures cover conductor plus one Chords note, multiple component tracks, simultaneous ascending chord notes, same-tick Note Off before Note On, a note ending at tick `30720`, and absent optional components. Each fixture asserts exact bytes, a stable SHA-256 hash, repeated byte equality, and semantic round-trip of track identity, tempo/meter, channels, pitches, Note On velocities, explicit Note Off velocity `0`, absolute starts/ends, durations, and terminal placement. Malformed/truncated headers and track boundaries, overlong/truncated VLQs, missing or misplaced EOT, wrong format/division, and truncated channel events are rejected. No production parser, serializer change, browser delivery, FL Studio import, or later MIDI behavior is included.

## Stage 5C1 controlled FL Studio interoperability preparation

The Stage 5C1 fixture suite validates the committed `src/midi/fixtures/stage-5c1-interoperability.mid` against its source IR and the accepted production serializer. Tests require byte-identical regeneration and the documented SHA-256, then use the independent Stage 5B2b reader to verify Format 1/960, 120 BPM, 4/4, conductor-first fixed tracks/channels, expected chord/bass/arp/lead starts, durations, velocities, explicit Note Off velocity `0`, and exactly one terminal End-of-Track at tick `30720` per track. The accompanying manual protocol records the FL Studio Producer Edition 2025 `26.1.6.5639` import, options, and PASS/FAIL/NOT DIRECTLY VERIFIABLE observations; the clean re-import satisfies MIDI-004 for that environment, while exact numeric velocity preservation remains not directly verifiable. It does not claim broader compatibility, automate the application, or implement browser delivery.

## Stage 5D1 browser MIDI delivery adapter

The Stage 5D1 suite covers only delivery of already-produced `Uint8Array` MIDI bytes. Filename tests cover normal, missing/duplicate `.mid` extensions, separators, forbidden/control characters, whitespace, invalid input fallback, and repeatability. Browser tests verify exact Blob bytes, `audio/midi`, deterministic filename and object URL assignment, one click, temporary-anchor removal, URL revocation after the trigger, input immutability, independent repeated calls, and cleanup on click failure. A static boundary test keeps browser delivery out of the semantic IR and serializer modules; no server route, package export, serializer/IR change, FL Studio claim, or full export UX is tested.
