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

## Stage 6 Bass V1 and straight-rhythm contract

Stage 6A1/A2 implementation evidence covers the documented Bass V1 baseline: a validated Harmony progression is required; exactly one immutable domain-level event is emitted per slot; each pitch is the current Chord root modulo 12; events use the existing integer musical-time primitives and slot bar spans inside the eight-bar boundary; and the deterministic first-event anchor/continuity rule selects the legal pitch nearest MIDI `43`, then nearest the previous Bass pitch, with lower pitch on ties, inside the approved inclusive range `36..60`. Tests cover legal root-candidate derivation, every root class, lower and upper range boundaries, anchor and continuity selection, lower-pitch tie-breaking, deterministic public resolution, positive durations, repeated-root stability, malformed/empty harmonic context, invalid ranges, no legal root pitch, structured errors, mutation isolation, and output immutability. The current Bass runtime API has no seed/provenance input, so no seed-changing runtime fixture is claimed; ambient-randomness isolation is enforced instead. No passing/approach/pedal/slash/inversion behavior, cross-slot ties, seeded variation, MIDI IR/serialization, browser, UI, persistence, or AI behavior is included. Human listening and profile-fit review remain separate from deterministic correctness.

The merged implementation covers all five closed identifiers. `sustained` is canonical-value equivalent to Stage 6A2. Quarter, eighth, and sixteenth pulses assert exact starts, durations, and event counts at `960`, `480`, and `240` ticks. `offbeat-eighth` asserts no slot-start onset, duration `480`, per-local-bar starts `480`, `1,440`, `2,400`, and `3,360`, and exact repetition in multi-bar slots. Every mode proves that phase restarts at each Harmony slot, no event crosses a slot or section boundary, every event uses its slot's single resolved root pitch, Stage 6A1 continuity is preserved between slots, outputs and events are frozen, inputs are unchanged, repeated calls are canonical-value identical, and `Math.random()` is not called. Runtime invalid rhythm identifiers produce `INVALID_BASS_RHYTHM`; malformed or impossible projections continue to produce `INVALID_BASS_TIMING`.

## Stage 7A Arpeggiator deterministic foundation contract

Stage 7A is the accepted contract definition. Stage 7B1 implementation tests cover validated Harmony progression identity and ordered slots; Chord/inversion/voicing compatibility; exact selected-voicing pitch ownership; inclusive range boundaries; exact one-, two-, and three-candidate results; whole-operation no-candidate failure; forged and malformed values; stable ordering; immutability; input non-mutation; repeated equal calls; and ambient-randomness isolation. No event, timing, rate, direction, gate, octave, density, seed, or profile-policy evidence is claimed.

Stage 7B2 is accepted and merged through PR #62. Its implementation evidence covers the exact frozen three-field event shape; exact `480`-tick starts and full-step durations; one-, two-, and three-candidate ascending cycles; reset at every canonical slot; exact canonical slot start/end ticks; the complete 64-event eight-bar section from tick `0` through an event ending exactly at `30,720`; no slot or section crossing; use of only Stage 7B1 retained pitches; adjacent same-pitch event separation; frozen output; input non-mutation; equal-input replay; preserved Stage 7B1 failures; and failure if ambient `Math.random()` is consulted. The fixed V1 Harmony catalog currently has uniform two-bar slots, so no noncanonical variable-span fixture is claimed.

Stage 7B3 implementation evidence uses independent parameterized groups rather than a redundant full rate/direction/candidate Cartesian product. Rate cases cover all exact `960`/`480`/`240` mappings, full-step `durationTicks`, `32`/`64`/`128` section event counts, exact slot/section containment, and a final event ending at tick `30,720`. Direction cases cover all four exact cycles for one-, two-, and three-candidate sets without duplicated turning endpoints. Slot-reset cases assert the correct direction-first pitch at every slot; where canonical integer-bar event counts align with an `up-down` or `down-up` bounce cycle, public output cannot distinguish reset from carry and no noncanonical fixture is invented, while implementation resets structurally.

Stage 7B3 validation cases cover malformed, missing, explicitly `undefined`, wrong-case, and unsupported rate/direction values with `INVALID_ARP_RATE` at `parameters.rate` and `INVALID_ARP_DIRECTION` at `parameters.direction`; mixed-invalid cases lock the normative range, Harmony context, `NO_LEGAL_ARP_PITCH`, rate, direction, then internal-timing precedence. Compatibility evidence proves the existing two-argument call is canonically equal to supplying the complete `{ rate: "eighth", direction: "up" }` object and that partial objects have no accepted semantics. Replay, frozen output, input non-mutation, ambient-randomness isolation, and existing Stage 7B1/B2 failure behavior remain covered. Stage 7B3 accepts no gate input.

Stage 7B4 implementation evidence proves that the two-argument call and every existing complete rate/direction-only call remain canonical-value equivalent to an explicit full-step gate; absent and explicit-`undefined` gates are equivalent; `gateTicks === rateTicks` preserves Stage 7B3 at quarter, eighth, and sixteenth rates; and representative shortened gates at all three rates change only duration. Tests assert unchanged pitch order, event count, start ticks, slot-local reset, and section containment; positive duration no greater than the selected rate; no event crossing its next step, slot, or section; immutable output and input non-mutation; equal-input replay; and ambient-randomness isolation. Runtime cases cover the inclusive boundaries `1` and `rateTicks` and reject zero, negatives, over-rate integers, fractions, `NaN`, both infinities, unsafe integers, strings, booleans, nulls, objects, and arrays as `INVALID_ARP_GATE` at `parameters.gateTicks`. Mixed-invalid cases preserve range, Harmony context, `NO_LEGAL_ARP_PITCH`, rate, direction, gate, then internal-timing precedence. Regression coverage retains all Stage 7B1/B2/B3 behavior; no evidence claims gate ratios, percentages, overlap, velocity, MIDI articulation, octave, density, seed, or profile-policy behavior. Stage 7B4 evidence is accepted and merged through PR #68.

Stage 7C future implementation evidence must independently prove: octave range `1` is canonical-value compatible with Stage 7B; ranges `2` and `3` produce only legal upward octave equivalents with exact MIDI/range boundaries, deterministic deduplication, and ascending candidate order; exact on/rest masks preserve the full-density timeline and pitch cycle while every rest consumes its traversal position; equal normalized inputs, versions, and root seed produce the same resolved plan and events; and Harmony/Bass/motif random consumption cannot perturb the Arpeggiator component seed. Fixed vectors must cover the named component-seed derivation contract and its supported IDs across required JavaScript runtimes. Policy tests must prove exactly one PRNG output is consumed for each ordered rate, octave-range, direction, mask, and gate slot even when only one candidate is legal; no clock, network, locale, object order, or `Math.random()` influences output; and every selected value stays within the active profile bounds.

Stage 7C1's accepted catalog requires exact mask-identity, sequence, repetition, slot-reset, rest-consumes-traversal, and `full` compatibility evidence when runtime implementation is separately authorized. Stage 7C2's accepted weighted-choice contract requires future tests for the normative equal/unequal, first/last boundary, zero-weight, single-candidate, output-zero, and `0xffffffff` vectors; exact `0..65,535` weight and total boundaries; every malformed/overflow/all-zero case; declared-order sensitivity; confirmation that the generic mechanism performs no candidate-value equality or deduplication; fixed one-output consumption; immutability; ambient independence; and deterministic behavior across supported JavaScript runtimes. Owning policy dimensions test their own closed-vocabulary and uniqueness rules before weighted selection. Stage 7C3's accepted contract requires a complete sixteen-vector cross-product over roots `0`, `1`, `0xffffffff`, and `0x12345678` and the four closed component IDs; future implementation tests must reproduce every canonical input byte string and output in at least the supported JavaScript runtimes, cover exact root/ID validation, prove pure name-based isolation, accept zero hash output without retry if encountered, and detect changes to domain separation, encoding, byte order, Murmur arithmetic, or unsigned extraction. Stage 7C5 freezes the structured-error evidence contract below but adds no runtime evidence. Automated correctness does not establish genre fit: all four V1 profiles require structured human listening evidence for distinction, Harmony support, useful repetition, intuitive energy development, complexity without noise, and seed variation that remains recognizably inside profile identity. Foundation tests must not claim full AC-004 seeded replay, seeded AC-011 behavior, or complete profile-appropriate Stage 7 acceptance before those gates pass.

Stage 7C-P1 is accepted and merged through PR #79 and adds no runtime evidence. Future normalized composition-brief tests must accept each exact `very-low|low|medium|high|very-high` identifier independently for `EnergyV1` and `ComplexityV1`, lock that ordinal order, cover all 25 independent energy/complexity pairs, and prove raw omission of either or both fields produces explicit canonical `medium` before generator entry. Canonical-boundary cases must reject `undefined`, wrong-case and whitespace variants, unknown strings, numeric values including fractions, booleans, `null`, arrays, objects, and synonyms without coercion. Equal normalized values must remain canonical-value-equivalent independent of ambient randomness, time, locale, network, AI, or object iteration, and downstream generators must reject rather than invent domain values.

Stage 7C4 is documentation-only and adds no runtime evidence. Future policy fixtures must verify every profile's exact candidate membership and order for rate, octave range, direction, mask, and gate; reproduce the exact final raw vector for all `4 profiles × 5 slots × 25 input pairs`; and prove every list remains non-empty, unique by its owning closed vocabulary, and inside Stage 7C2 weight/total bounds without normalization. Independent cases must cover dimensions frozen invariant to energy or complexity, all nine exact rate/gate mappings, `long === rateTicks`, Stage 7B-compatible values where permitted, masks restricted to Stage 7C1 IDs, and the one-candidate Midtempo Cyberpunk gate consuming the fifth output. Replay tests must hold every relevant version and normalized input constant, exercise boundary PRNG outputs through Stage 7C2, prove component isolation and exact five-slot consumption, and reject influence from `Math.random`, time, locale, network, AI, object iteration, or database/discovery order. These fixtures do not authorize or prove Stage 7C runtime; Stage 7C5 separately freezes its structured-error contract and evidence requirements.

Stage 7C5 is documentation-only and adds no runtime evidence. Future tests must assert every exact public code and field at its owning boundary; all valid boundaries; missing, wrong-type, non-finite, fractional, unsafe, wrong-case, whitespace, alias, unknown, and unsupported-version cases as applicable; profile/policy incompatibility; malformed profile-owned versus shared policy configuration; and the complete mixed-invalid order frozen in the Arpeggiator model. Direct Stage 7B regression cases must retain the exact range, Harmony, whole-operation `NO_LEGAL_ARP_PITCH`, rate, direction, gate, then internal-timing order and all existing fields/defaults. Seed derivation must prove root-seed-before-component-ID precedence, zero-seed acceptance, exact component case sensitivity, and no coercion. The Stage 7C operation must validate normalized intent, lineage, all five candidate lists, shared policy/gate data, range, Harmony, and active-profile/Harmony-profile equality before consuming any component-seed or PRNG output. Profile-context fixtures must cover the four matching V1 pairs and all twelve ordered mismatches, with every mismatch producing `INCOMPATIBLE_ARP_PROFILE_CONTEXT` at `profile.id`; failures emit no partial plan/events and equal invalid input yields equal code/field independent of randomness, time, locale, network, AI, discovery, or object order. After valid preflight, whole-operation `NO_LEGAL_ARP_PITCH` remains exact, while impossible selected values, lookup results, or timing are internal assertions rather than caller errors. MIA-004 remains deferred until separately authorized runtime tests supply these exact assertions.

Stage 7C6 is documentation-only and adds no runtime evidence. The runtime-primitives slice must lock component-seed vectors, weighted-choice boundaries, immutable catalogs/configuration, and the absence of ambient inputs. Direct component-seed cases must assert neutral `ComponentSeedValueError`, exact root-before-component precedence, and exact codes/fields; no primitive case may receive `ArpValueError`. The policy-resolver slice must prove its private validated-context/component-seed input, exact frozen five-field plan output, all Stage 7C4 mappings, exact five-output consumption, deterministic replay, component isolation, and rejection of direct raw-request access. The projection slice must prove upward octave expansion, mask/rest traversal, Stage 7B-compatible equivalence, canonical timing, frozen events, no input mutation, and no duplicate traversal semantics. The enclosing-integration slice must assert the exact public request/result shape, every Stage 7C5 code/field and complete preflight order, `ArpValueError` for step-9 invalid root seed before primitive invocation, root-to-component handoff only after successful preflight, no helper bypass, no partial plan/events, and internal-assertion handling for an impossible post-preflight primitive failure. Final regression/evaluation evidence must rerun all Stage 7B behavior unchanged, prove cross-runtime replay and ambient-randomness isolation, and complete the already required deterministic and structured human profile evidence. MIA-004 remains deferred until the exact runtime structured-error assertions exist and pass.

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
