# Stage 6 Bass V1 model

## Authority and status

This document defines the smallest Stage 6 V1 Bass contract. It is a documentation-only contract milestone; no Bass generator or Bass production type is implemented by this document. A separate bounded implementation task remains required, and the numeric range proposal below requires product-owner approval first.

The contract reuses the existing `PitchClass`, `MidiPitch`, `Tick`, `DurationTicks`, `HarmonyProgressionRealization`, and shared composition-generator boundaries. It does not change Harmony semantics or create a second timing, provenance, or generator framework.

## V1 behavior

The first slice is a generic **Bass V1 root-aligned baseline**, not one of the eventual named archetypes. It exists to prove a harmonically valid, structurally valid, deterministic, reproducible, domain-owned, independently testable bass track.

For every validated Harmony progression slot:

1. the slot's existing `Chord.root` is the only permitted bass pitch class;
2. exactly one bass event is emitted for that slot;
3. the event starts at the slot's derived start tick and lasts for the slot's existing bar span;
4. the event is resolved to the deterministic lowest legal MIDI pitch for that root in the approved Bass V1 range.

Non-chord tones are forbidden. Passing, approach, pedal-tone, slash-bass, and inversion-specific bass behavior are deferred. A selected chord voicing is not an input requirement for this baseline.

## Timing and rhythm

The input is an already validated harmonic progression context derived from `HarmonyProgressionRealization`: its ordered slots preserve their positive integer `bars`, eight-bar total, and `Chord` identity. The baseline consumes each slot's `bars` and `Chord.root`; inversion and selected voicing are not semantically required. At the existing 960 PPQ, 4/4 context, one bar is 3,840 ticks and the section boundary is tick 30,720. For slot `i`,

```text
startTick = (sum of bars for slots before i) * 3840
durationTicks = slot[i].bars * 3840
```

The implementation must use the repository's `Tick` and `DurationTicks` primitives (or their accepted future composition wrapper), not floating-point time or a parallel clock. Starts are before tick 30,720, durations are positive, and ends are at or before tick 30,720. There is no syncopation, intentional rest, or cross-slot tie in V1. Consecutive equal roots therefore produce consecutive repeated pitches, each with its own slot-aligned event.

## Bass range

The repository has no accepted numeric Bass V1 range and has no canonical note-name or octave-label convention; `MidiPitch` is the existing numeric `0..127` primitive. The following is therefore a product proposal, not an accepted value:

> **PROPOSED PRODUCT VALUE — pending product-owner approval:** inclusive `MidiPitch` range `36..60`, represented canonically as `{ minMidiPitch: 36, maxMidiPitch: 60 }`. “C2–C4” is explanatory only and is not a canonical octave-label commitment.

This 25-semitone window is low enough for a general bass register, high enough to keep every chromatic root available, and simple to validate. It contains at least one pitch of every pitch class, so the root-only baseline has a legal candidate for each possible `Chord.root`. No profile-specific ranges are introduced. The implementation must not treat this proposal as approved until the product decision is recorded.

## Deterministic root-to-pitch resolution

Given a validated root pitch class `r` and an approved inclusive range `[minMidiPitch, maxMidiPitch]`, the legal set is:

```text
{ p | minMidiPitch <= p <= maxMidiPitch and p % 12 == r }
```

Select the numerically lowest member of that set. Numeric order is the explicit tie-break, so the result is independent of candidate enumeration or object order and requires no randomness. The proposed `36..60` range makes this selection defined for all twelve roots. If a later approved range contains no legal member for a root, generation fails with the structured `NO_LEGAL_ROOT_PITCH` error below rather than wrapping, coercing, or changing the root.

## Domain event ownership

The existing `NoteEvent`/`Track` shape in [MUSIC_DOMAIN_MODEL.md](MUSIC_DOMAIN_MODEL.md) is a conceptual composition model, not a reusable production TypeScript type. It also carries broader optional composition concerns. The minimum future Bass domain projection is therefore:

```text
BassEvent {
  pitch: MidiPitch;
  startTick: Tick;
  durationTicks: DurationTicks;
}
```

`BassEvent` is owned by the framework-independent music domain. Its fields are immutable validated values. The enclosing canonical component/track owns the stable `bass` component identity; MIDI channel, velocity, serialization, and browser-delivery fields do not belong here. Events are in canonical Harmony slot order (equivalently ascending start tick in this one-event-per-slot policy); no unordered collection or iteration order may decide output.

Generator provenance remains in the shared generation-result/lineage envelope rather than being duplicated on each event. That envelope records the target component, input/version references, normalized V1 parameters, and explicit seed according to the existing composition-engine contract. The Bass event itself has no redundant schema, seed, hash, or hypothetical later-archetype fields.

## Generator boundary

The future bounded implementation receives:

| Field | V1 status |
|---|---|
| validated frozen shared composition/generation context | Required |
| validated harmonic progression context (ordered `HarmonyProgressionRealization` slots, using `bars` and `Chord.root`) | Required |
| target component `bass` | Required and fixed |
| generator, engine, profile, and Bass schema versions | Required |
| explicit validated uint32 seed | Required for shared provenance; not used for V1 pitch selection |
| product-approved `{ minMidiPitch, maxMidiPitch }` | Required; current numeric value is pending approval |

The output is a canonical immutable Bass component containing ordered `BassEvent` values plus the shared decisions/provenance/result envelope. It is not MIDI IR, serialized MIDI, a browser download, UI state, or a persistence record. The implementation must not read ambient randomness, clocks, locale, network, AI output, database order, or an unvalidated voicing.

## Parameter and archetype boundary

Only parameters with V1 meaning are exposed:

| Roadmap parameter | V1 classification |
|---|---|
| range | **ACTIVE IN V1** after the proposed product value is approved |
| density | **FIXED BY V1 POLICY:** one event per Harmony slot |
| syncopation | **FIXED BY V1 POLICY:** disabled |
| movement | **FIXED BY V1 POLICY:** slot/chord aligned |
| root loyalty | **FIXED BY V1 POLICY:** chord root only |
| octave behavior | **FIXED BY V1 POLICY:** lowest legal root pitch in range |
| aggression | **DEFERRED** |
| seed-driven variation | **DEFERRED**; the required seed is provenance-only in V1 |

The repository names six eventual archetypes—Driving 8ths, Driving 16ths, Midtempo Stomp, Pedal Tone, Octave Pulse, and Syncopated Darkwave—but does not yet define their normative behavior. V1 therefore uses the generic root-aligned baseline and does not select, rename, or define all six.

## Structured errors

The implementation must use the established structured-error shape (stable `code`, `field`, and message, as used by Harmony/shared generator validation). The smallest V1 vocabulary is:

| Code | Trigger | Fields | Class |
|---|---|---|---|
| `INVALID_HARMONIC_CONTEXT` | Progression is missing, empty, malformed, or contains an unvalidated slot/root | `progression` or `progression.slots[i]` | Input validation |
| `INVALID_BASS_RANGE` | Bounds are missing, non-integer, unsafe, out of the `MidiPitch` domain, or `minMidiPitch > maxMidiPitch` | `range`, `range.minMidiPitch`, or `range.maxMidiPitch` | Input validation |
| `NO_LEGAL_ROOT_PITCH` | A validated root has no member in the approved inclusive range | `slots[i].chord.root` and `range` | Generation failure |
| `INVALID_BASS_TIMING` | Derived slot timing is non-integer, non-positive, outside the existing eight-bar boundary, or inconsistent with slot bar spans | `slots[i].bars`, `startTick`, or `durationTicks` | Input validation |

No separate public Bass invariant code is invented for this contract. An impossible post-validation invariant must use the repository's existing internal/assertion or shared structured-failure convention rather than silently emitting data. No error is coerced, wrapped, or replaced with a MIDI-layer error.

## Requirement trace

This contract adds no new global requirement IDs. It operationalizes the accepted parent requirements and evidence:

| Contract concern | Accepted source |
|---|---|
| distinct bass component from a valid brief | `FR-002` / `AC-002` |
| typed deterministic musical-domain values | `MUS-001` |
| required harmonic context and root/chord-tone compliance | `MUS-002` / `AC-010` |
| integer in-section event timing | `MUS-006` / `AC-013` |
| reproducible canonical output for equal inputs/versions/seed | `NFR-001` / `AC-004` |
| complete validation gates | `NFR-005` / `AC-029` |

## Test contract for the first implementation

Deterministic automated evidence must verify:

- equal validated input produces byte-equivalent canonical Bass output;
- changing only the required seed does not change V1 musical events;
- input Harmony context and returned values are mutation-safe and frozen according to repository conventions;
- every event pitch equals its slot Chord root modulo 12 and lies within the approved inclusive range;
- lower and upper range boundaries, every root pitch class, and deterministic lowest-pitch selection are covered;
- candidate/input order cannot affect resolution, if an implementation internally enumerates candidates;
- starts and positive durations are integer canonical time values, follow slot bar spans exactly, and remain within the 8-bar boundary;
- repeated consecutive roots produce repeated slot-aligned events;
- empty/malformed harmonic context, invalid range, and no-legal-pitch cases produce the documented structured errors;
- no ambient randomness, floating-point timing, MIDI IR, serialized MIDI, browser, UI, persistence, or AI path participates in the result.

Human listening and profile-fit review remain separate evidence. Listening cannot replace these deterministic assertions.

## Deferred behavior and implementation gate

Deferred until separately authorized Stage 6 slices are passing V1 evidence: the six named archetypes; density variation; syncopation; rests; cross-chord ties; passing and approach tones; pedal tones; slash-bass and inversion-aware bass; octave pulses; seeded musical variation; profile-specific ranges; movement/aggression policy; full composition orchestration; and any MIDI, browser, UI, persistence, audio, or AI behavior.

The next implementation task may implement only the generic root-aligned baseline after the product owner approves the proposed range. It must preserve the shared generator contract, existing Harmony and musical-time primitives, immutable canonical state, and the MIDI-derived boundary.
