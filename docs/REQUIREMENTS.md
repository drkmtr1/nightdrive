# Version 1 requirements

Priorities: **P0** release-blocking, **P1** important, **P2** desirable. Acceptance mappings refer to [Acceptance criteria](ACCEPTANCE_CRITERIA.md); milestones refer to [Roadmap](ROADMAP.md).

## Functional

| ID | Pri | Requirement | Acceptance | Stage |
|---|---:|---|---|---:|
| FR-001 | P0 | The user can create an 8-bar composition brief with supported genre, mood, BPM, key/auto-key, scale, section, energy, and complexity. | AC-001 | 2–4 |
| FR-002 | P0 | The system produces separate chord, bass, arp, and lead components from a valid brief. | AC-002 | 4–8 |
| FR-003 | P0 | The user can audition components independently and together with synchronized transport. | AC-014 | 9 |
| FR-004 | P0 | The user can perform the limited note edits defined in scope with undo/redo. | AC-015 | 10 |
| FR-005 | P0 | The user can lock components and regenerate an unlocked component without altering locked canonical data. | AC-005 | 11 |
| FR-006 | P0 | Each variation retains its parent and complete reproducibility record without overwriting history. | AC-004, AC-006 | 11–12 |
| FR-007 | P0 | Authenticated users can save, reopen, rename, and delete their own projects. | AC-016, AC-020 | 12 |
| FR-008 | P0 | The user can export component tracks as a standard MIDI package suitable for FL Studio. | AC-007–AC-009 | 5, 16 |
| FR-009 | P1 | The system explains harmony, pattern, and motif decisions from structured composition state. | AC-018 | 13–14 |
| FR-010 | P1 | The user can request bounded intent changes such as darker, less busy, or larger chorus. | AC-019 | 13 |
| FR-011 | P1 | The system offers actionable producer-coach observations and labels subjective recommendations. | AC-018 | 14 |
| FR-012 | P1 | The system provides structured synth recipes for supported synth profiles. | AC-021 | 15 |
| FR-013 | P1 | Export includes human-readable production notes and canonical composition metadata. | AC-009 | 16 |

## Music-domain and MIDI

| ID | Pri | Requirement | Acceptance | Stage |
|---|---:|---|---|---:|
| MUS-001 | P0 | Canonical pitches, scales, chords, voicings, and intervals use typed deterministic primitives. | AC-002, AC-003 | 3 |
| MUS-002 | P0 | Bass generation receives harmonic context and respects it unless a selected archetype explicitly permits non-chord behavior. | AC-010 | 6 |
| MUS-003 | P0 | Arpeggios derive from current harmony and versioned pattern parameters. | AC-011 | 7 |
| MUS-004 | P0 | Motifs model identity, repetition, variation, phrase boundary, target tones, tension/resolution, register, range, and leaps. | AC-012 | 8 |
| MUS-005 | P0 | Voice-leading obeys documented ranges, chord membership, spacing, and movement constraints or returns a structured failure. | AC-003 | 4 |
| MUS-006 | P0 | All generated events remain within the 8-bar section and valid musical grid unless explicit bounded microtiming is later supported. | AC-013 | 3–8 |
| MIDI-001 | P0 | Canonical musical time uses integer ticks at 960 PPQ with explicit bar/beat conversion. | AC-007, AC-033 | 3A, 5 |
| MIDI-002 | P0 | Export preserves pitch, start, duration, velocity, tempo, PPQ, and track identity. | AC-008 | 5 |
| MIDI-003 | P0 | MIDI serialization has stable event ordering and valid note-on/off semantics. | AC-007 | 5 |
| MIDI-004 | P0 | Exported fixtures import into a supported FL Studio version with correct length and alignment. | AC-009 | 5, 16 |
| MUS-007 | P0 | Musical-time constructors and arithmetic use explicit units, stable typed errors, safe-integer validation, and unambiguous 8-bar event boundaries without coercion or clamping. | AC-033 | 3A |
| MUS-008 | P0 | Canonical pitch identity uses strictly validated `PitchClass` values 0–11 and `MidiPitch` values 0–127; MIDI pitch-class extraction is exact and independent of spelling or octave labels. | AC-035 | 3B1 |
| MUS-009 | P0 | Canonical intervals use strictly validated signed safe-integer semitone displacement, support deterministic arithmetic, and compute directed distance between valid MIDI pitches without pitch-class ambiguity or transposition. | AC-036 | 3B2a |
| MUS-010 | P0 | Canonical scales use exactly six closed immutable seven-offset formulas; tonic-relative projection, zero-based degree lookup, and exact pitch-class membership are strictly validated and do not introduce spelling or key semantics. | AC-037 | 3B2b1 |
| MUS-011 | P0 | Canonical keys contain only a strictly validated tonic `PitchClass` and closed canonical `ScaleType`; projection, degree lookup, membership, equality, and serialization preserve those numeric identities without spelling or key-signature semantics. | AC-038 | 3B2b2a |
| MUS-012 | P0 | The V1 `ChordQuality` contract is one explicitly versioned closed triad-only vocabulary with stable IDs and exact tonic-relative chromatic membership formulas; version belongs to the vocabulary/schema contract rather than redundant per-instance state. Quality excludes root, ordering, inversions, voicings, spelling, and extensions, and seventh structures remain deferred extension metadata. | AC-039 | 3B2b2b |
| MUS-013 | P0 | The implemented `ChordQuality` primitive accepts exactly the three versioned canonical IDs and immutable formulas, supports deterministic equality and serialization, and does not introduce Chord, extension, inversion, voicing, root, spelling, or harmony semantics. | AC-040 | 3B2b2c |
| MUS-014 | P0 | The future canonical Chord contract contains only numeric root `PitchClass` and `ChordQuality` initially; base membership is deterministic derived modulo-12 state, extensions are deferred, and inversion, voicing, harmony, spelling, and context remain outside Chord identity. | AC-041 | 3B2b2d |
| MUS-015 | P0 | The implemented Chord primitive contains exactly root `PitchClass` and `ChordQuality`; membership is derived modulo 12, equality uses canonical identity, and serialization excludes derived or future extension state. | AC-042 | 3B2b2e |
| MUS-016 | P0 | The V1 ChordInversion contract defines exactly validated member indices `0..2` in canonical triad membership order, separate from Chord identity and realized voicing; wider cardinality requires explicit versioned review. | AC-043 | 3B2b2f |
| MUS-017 | P0 | The implemented ChordInversion primitive accepts exactly validated indices `0..2`, supports deterministic equality and serialization, and introduces no Chord, voicing, or harmony semantics. | AC-044 | 3B2b2g |

## AI behavior

| ID | Pri | Requirement | Acceptance | Stage |
|---|---:|---|---|---:|
| AI-001 | P0 | An LLM never serves as the canonical raw-note, chord, time, or MIDI generator. | AC-017 | 13 |
| AI-002 | P0 | Every AI response that can influence generation is validated against a versioned schema and bounded values before use. | AC-017, AC-019 | 13 |
| AI-003 | P0 | AI cannot directly mutate canonical database state or invoke privileged tools. | AC-017, AC-022 | 13 |
| AI-004 | P1 | Explanations cite structured observations and distinguish recommendation from deterministic fact. | AC-018 | 13–14 |
| AI-005 | P1 | AI calls record provider/model identifier, schema version, latency, token usage, estimated cost, and validation outcome without logging sensitive prompt content by default. | AC-024 | 13 |

## UX and accessibility

| ID | Pri | Requirement | Acceptance | Stage |
|---|---:|---|---|---:|
| UX-001 | P0 | A first-time user can complete the main create-to-export workflow without external documentation. | AC-001 | 19 |
| UX-002 | P0 | The composition brief uses meaningful defaults, progressive disclosure, inline validation, and recoverable errors. | AC-001, AC-025 | 2, 19 |
| UX-003 | P0 | Transport, timeline, tracks, selection, locks, unsaved state, and generation status are visually unambiguous. | AC-014, AC-015 | 9–11, 19 |
| UX-004 | P1 | Desktop is optimized for authoring; smaller screens support listening, inspection, and basic settings without claiming full editor parity. | AC-026 | 19 |
| A11Y-001 | P0 | Main workflow is keyboard operable with visible focus and no keyboard trap. | AC-027 | 19 |
| A11Y-002 | P0 | Text/control contrast meets WCAG 2.2 AA and state is never communicated by color alone. | AC-027 | 19 |
| A11Y-003 | P0 | Controls have programmatic names, error association, appropriate semantics, and touch-safe targets where applicable. | AC-027 | 19 |
| A11Y-004 | P1 | Motion/audio feedback respects user settings, and audition never autoplays unexpectedly. | AC-014, AC-027 | 9, 19 |

## Security, persistence, and operations

| ID | Pri | Requirement | Acceptance | Stage |
|---|---:|---|---|---:|
| SEC-001 | P0 | Authentication establishes a user identity; authorization and RLS restrict every user-owned row to its owner. | AC-020, AC-022 | 12, 18 |
| SEC-002 | P0 | Privileged credentials remain server-side and no secret is committed or exposed to browser bundles/logs. | AC-022 | 12, 18 |
| SEC-003 | P0 | All API, database, and AI-boundary inputs/outputs are schema and authorization validated. | AC-017, AC-022 | 12–13, 18 |
| SEC-004 | P0 | Destructive actions require explicit target confirmation and produce auditable, ownership-checked outcomes. | AC-020, AC-022 | 12, 18 |
| SEC-005 | P1 | Cost-bearing and abuse-prone endpoints use per-user rate limits and bounded payload/time budgets. | AC-023 | 13, 18 |
| NFR-001 | P0 | Equal valid inputs, engine/profile versions, and seed produce byte-equivalent canonical JSON after normalization. | AC-004 | 3–8 |
| NFR-002 | P0 | Generation and variation history is immutable; edits create versioned state rather than silently rewriting provenance. | AC-006 | 11–12 |
| NFR-003 | P0 | Common non-AI deterministic generation completes within a budget established by representative performance tests before release. | AC-028 | 17 |
| NFR-004 | P0 | The system emits structured, correlated observability events while excluding secrets, raw tokens, and unnecessary personal content. | AC-024 | 18 |
| NFR-005 | P0 | A passing build satisfies lint/type/unit/integration/API/RLS/E2E/accessibility/security and required evaluation gates defined in the testing strategy. | AC-029 | 2–20 |
| NFR-006 | P1 | Versioned canonical formats have documented migration and backward-compatibility behavior. | AC-030 | 3, 12 |
| NFR-007 | P0 | The application foundation uses documented supported exact tool versions and a locked dependency graph that passes clean install, format, lint, strict type, test, documentation, and production-build gates. | AC-031 | 2A |
| NFR-008 | P0 | Equivalent validated musical-time primitives serialize to byte-equivalent versioned JSON independent of locale, timezone, framework, and runtime ambient state. | AC-034 | 3A |
| NFR-009 | P0 | Equivalent validated pitch-identity primitives serialize to byte-equivalent versioned JSON independent of locale, spelling, octave convention, framework, and runtime ambient state. | AC-035 | 3B1 |
| NFR-010 | P0 | Equivalent validated intervals serialize to byte-equivalent versioned JSON preserving sign and compound semitone distance without names, spelling, octave, locale, timezone, or ambient runtime state. | AC-036 | 3B2a |
| NFR-011 | P0 | Equivalent validated scale identities and formulas serialize to byte-equivalent fixed-order `nightdrive.scale.v1` JSON independent of locale, framework, and ambient runtime state. | AC-037 | 3B2b1 |
| NFR-012 | P0 | Equivalent validated keys serialize to byte-equivalent fixed-order `nightdrive.key.v1` JSON containing only tonic semitone class and canonical scale identity. | AC-038 | 3B2b2a |
| NFR-013 | P0 | Equivalent validated ChordQuality values serialize to byte-equivalent fixed-order `nightdrive.chord-quality.v1` JSON containing only canonical quality ID and formula. | AC-040 | 3B2b2c |
| NFR-014 | P0 | Equivalent validated Chord values serialize to byte-equivalent fixed-order `nightdrive.chord.v1` JSON containing only root semitone class and canonical quality ID. | AC-042 | 3B2b2e |
| NFR-015 | P0 | The reserved ChordInversion representation is versioned as `nightdrive.chord-inversion.v1` with only validated `memberIndex` and no chord, pitch, voicing, label, or redundant per-instance version state. | AC-043 | 3B2b2f |
| NFR-016 | P0 | Equivalent validated ChordInversion values serialize to byte-equivalent fixed-order `nightdrive.chord-inversion.v1` JSON containing only `memberIndex`. | AC-044 | 3B2b2g |
| UX-005 | P0 | The foundation shell uses semantic landmarks/headings, accessible contrast/focus, responsive layout, recoverable state pages, and explicitly states that composition features are unavailable. | AC-032 | 2A |

## Requirement change rules

IDs are never reused. Removed requirements remain recorded as superseded in history. A requirement is release-complete only when its acceptance criterion has evidence and its roadmap exit gate passes.
