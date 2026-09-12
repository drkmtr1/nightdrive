# Stage 6 Bass V1 model

## Authority and status

This document defines the Stage 6 V1 Bass contract. The separately bounded Stage 6A1 root-pitch and Stage 6A2 canonical event implementations realize the sustained root-aligned baseline. The straight-rhythm contract is merged through PR #52, and its bounded production implementation is complete on the current unmerged review branch.

The contract reuses the existing `PitchClass`, `MidiPitch`, `Tick`, `DurationTicks`, `HarmonyProgressionRealization`, and shared composition-generator boundaries. It does not change Harmony semantics or create a second timing, provenance, or generator framework.

## V1 behavior

The implemented first slice is a generic **Bass V1 root-aligned baseline**, not one of the eventual named archetypes. It exists to prove a harmonically valid, structurally valid, deterministic, reproducible, domain-owned, independently testable bass track. Its rhythm identity is `sustained` under the straight-rhythm contract below.

For every validated Harmony progression slot:

1. the slot's existing `Chord.root` is the only permitted bass pitch class;
2. exactly one bass event is emitted for that slot;
3. the event starts at the slot's derived start tick and lasts for the slot's existing bar span;
4. the first event is resolved to the legal MIDI pitch nearest the fixed register anchor `43`; each later event is resolved to the legal pitch nearest the previously emitted Bass pitch. Equidistant candidates choose the lower MIDI pitch.

Non-chord tones are forbidden. Passing, approach, pedal-tone, slash-bass, and inversion-specific bass behavior are deferred. A selected chord voicing is not an input requirement for this baseline. Consecutive slots with the same root may therefore resolve to the same Bass pitch; V1 does not force octave movement merely to create variation.

## Timing and rhythm

The input is an already validated harmonic progression context derived from `HarmonyProgressionRealization`: its ordered slots preserve their positive integer `bars`, eight-bar total, and `Chord` identity. The baseline consumes each slot's `bars` and `Chord.root`; inversion and selected voicing are not semantically required. At the existing 960 PPQ, 4/4 context, one bar is 3,840 ticks and the section boundary is tick 30,720. For slot `i`,

```text
startTick = (sum of bars for slots before i) * 3840
durationTicks = slot[i].bars * 3840
```

The implementation must use the repository's `Tick` and `DurationTicks` primitives (or their accepted future composition wrapper), not floating-point time or a parallel clock. Starts are before tick 30,720, durations are positive, and ends are at or before tick 30,720. The implemented `sustained` baseline has no syncopation, intentional rest, or cross-slot tie. Consecutive equal roots therefore produce consecutive repeated pitches, each with its own slot-aligned event.

Timing/subdivision primitives are shared deterministic music-domain infrastructure. Rhythm vocabularies are owned by the musical component that uses them; there is no universal rhythm vocabulary that every instrument must support. Future Bass, Arp, Lead, and Drum generators may therefore expose different component-specific rhythm archetypes while sharing the canonical integer subdivision and boundary primitives.

The existing timing contract gives these exact integer relationships: quarter note `960` ticks, eighth note `480`, sixteenth note `240`, and one 4/4 bar `3,840` ticks. Eighth-note triplet subdivision `320`, sixteenth-note triplet subdivision `160`, and dotted eighth `720` are also exactly representable, but remain capability notes only and do not define compound Bass patterns.

## Straight-rhythm vocabulary and phase

The first rhythm-expansion contract is the closed Bass-owned `BassRhythmId` vocabulary:

| Stable identifier | Slot-local onset rule | Duration | Event count |
|---|---|---:|---:|
| `sustained` | exactly one event at local tick `0` | full Harmony slot | `1` per slot |
| `quarter-pulse` | every `960` ticks from local tick `0` | `960` ticks | `4 * slot.bars` |
| `eighth-pulse` | every `480` ticks from local tick `0` | `480` ticks | `8 * slot.bars` |
| `sixteenth-pulse` | every `240` ticks from local tick `0` | `240` ticks | `16 * slot.bars` |
| `offbeat-eighth` | local bar offsets `480`, `1,440`, `2,400`, and `3,360` | `480` ticks | `4 * slot.bars` |

These identifiers are stable machine values, not display labels. Shared musical-time infrastructure owns generic integer ticks, durations, and subdivision values; Bass owns this vocabulary and its event-placement policy. No universal rhythm enum is created for Bass, Arp, Lead, and Drums. Other components may define their own closed vocabularies while reusing the shared time primitives.

Every pattern restarts at each Harmony slot boundary. Phase never continues across a chord change in this slice. For a slot beginning at absolute tick `S` with duration `D`, straight-pulse starts are `S + n * subdivision` for every integer `n >= 0` where the event end is at or before `S + D`. Because Harmony slot spans are positive integer bars and `3,840` is divisible by `960`, `480`, and `240`, these modes have no remainder or quantization rule. No event crosses a slot boundary.

For `offbeat-eighth`, each bar local to the slot is silent for its first `480` ticks and then emits at offsets `480`, `1,440`, `2,400`, and `3,360`, each lasting `480` ticks. For every zero-based local bar `b`, absolute starts are `S + b * 3,840 + offset` for those four offsets. Multi-bar slots repeat the same set in every bar. The next slot restarts from its own boundary, including a new initial `480`-tick silence. This is the only intentional rest space defined by the first straight-rhythm slice; it does not authorize generalized syncopation or rest patterns.

Each slot resolves one Bass root pitch through the existing Stage 6A1 policy before expanding rhythm events. Every event within that slot uses that same resolved pitch. At the next slot, the new root pitch is resolved nearest to the prior slot's resolved Bass pitch, which is also the immediately previous emitted pitch for every nonempty mode here. Rhythm never changes pitch, octave, chord-tone choice, or continuity policy.

For identical validated Harmony progression, Bass range, and normalized rhythm identifier, the canonical ordered `BassEvent` sequence is identical. The current Bass API has no runtime seed/provenance envelope and reads no ambient randomness. Seed lineage remains owned by the future enclosing composition-generator boundary; seed-driven musical variation remains deferred. Events and returned collections remain frozen, and generation must not mutate Harmony or parameter inputs.

## Bass range

The repository has no canonical note-name or octave-label convention; `MidiPitch` is the existing numeric `0..127` primitive. The approved Bass V1 range is:

> **APPROVED PRODUCT VALUE:** inclusive `MidiPitch` range `36..60`, represented canonically as `{ minMidiPitch: 36, maxMidiPitch: 60 }`. “C2–C4” is explanatory only and is not a canonical octave-label commitment.

This 25-semitone window is low enough for a general bass register, high enough to keep every chromatic root available, and simple to validate. It contains at least one pitch of every pitch class, so the root-only baseline has a legal candidate for each possible `Chord.root`. No profile-specific ranges are introduced.

## Deterministic root-to-pitch resolution

Given a validated root pitch class `r` and the approved inclusive range `[36, 60]`, the legal set is:

```text
{ p | minMidiPitch <= p <= maxMidiPitch and p % 12 == r }
```

For the first event, select the member minimizing `abs(p - 43)`. For each subsequent event, select the member minimizing `abs(p - previousBassPitch)`. If two candidates have equal distance, select the lower MIDI pitch. These comparisons are total numeric rules, so candidate enumeration order and object order cannot affect the result and no PRNG is used. The approved range makes this selection defined for all twelve roots. If a validated range supplied by a future separately authorized context contains no legal member for a root, generation fails with the structured `NO_LEGAL_ROOT_PITCH` error below rather than wrapping, coercing, or changing the root.

## Domain event ownership

The existing `NoteEvent`/`Track` shape in [MUSIC_DOMAIN_MODEL.md](MUSIC_DOMAIN_MODEL.md) is a conceptual composition model, not a reusable production TypeScript type. It also carries broader optional composition concerns. The minimum Bass domain projection is therefore:

```text
BassEvent {
  pitch: MidiPitch;
  startTick: Tick;
  durationTicks: DurationTicks;
}
```

`BassEvent` is owned by the framework-independent music domain. Its fields are immutable validated values. The enclosing canonical component/track owns the stable `bass` component identity; MIDI channel, velocity, serialization, and browser-delivery fields do not belong here. Events are in ascending start-tick order—Harmony slot order, then local onset order within each slot. No unordered collection or iteration order may decide output.

Generator provenance remains in the shared generation-result/lineage envelope rather than being duplicated on each event. That envelope records the target component, input/version references, normalized V1 parameters, and explicit seed according to the existing composition-engine contract. The Bass event itself has no redundant schema, seed, hash, or hypothetical later-archetype fields.

## Generator boundary

The accepted future enclosing generator boundary contains:

| Field | V1 status |
|---|---|
| validated frozen shared composition/generation context | Required |
| validated harmonic progression context (ordered `HarmonyProgressionRealization` slots, using `bars` and `Chord.root`) | Required |
| target component `bass` | Required and fixed |
| generator, engine, profile, and Bass schema versions | Required |
| explicit validated uint32 seed | Required for shared provenance; not used for V1 pitch selection |
| approved `{ minMidiPitch: 36, maxMidiPitch: 60 }` | Required and fixed for V1 |
| normalized Bass rhythm selection | `BassGenerationParameters.rhythm`; one closed `BassRhythmId` |

The current Bass projection implements the validated Harmony progression, approved range, and normalized Bass rhythm inputs and returns ordered immutable `BassEvent` values. It does not yet implement the shared decisions/provenance/result envelope. At that future enclosing boundary, the output is a canonical immutable Bass component plus shared provenance. Neither boundary is MIDI IR, serialized MIDI, a browser download, UI state, or a persistence record. The implementation must not read ambient randomness, clocks, locale, network, AI output, database order, or an unvalidated voicing.

**Generator-selection decision: C.** Rhythm selection belongs to the existing shared generator contract's bounded-parameters envelope, not a parallel Bass configuration framework:

```text
BassGenerationParameters {
  rhythm: BassRhythmId;
}
```

The implemented Bass boundary receives and normalizes the closed identifier without creating a parallel shared generator framework. A future outer envelope continues to own seed and version provenance. Omitting rhythm selection maps exactly to `sustained`, preserving existing Stage 6A2 callers and canonical-value-equivalent event behavior. A supplied `sustained` value and an omitted value are behaviorally identical after normalization.

## Parameter and archetype boundary

Only parameters with V1 meaning are exposed:

| Roadmap parameter | V1 classification |
|---|---|
| range | **ACTIVE IN V1:** approved inclusive `36..60` |
| rhythm | **IMPLEMENTED ON THE CURRENT REVIEW BRANCH:** one of the five closed straight-rhythm identifiers; omitted means `sustained` |
| density | **DERIVED BY RHYTHM:** no independent density control |
| syncopation | **FIXED BY V1 POLICY:** only the exact `offbeat-eighth` placement above; no general control |
| movement | **FIXED BY V1 POLICY:** slot/chord aligned |
| root loyalty | **FIXED BY V1 POLICY:** chord root only |
| octave behavior | **FIXED BY V1 POLICY:** first event nearest anchor `43`, later events nearest previous Bass pitch, lower pitch on ties |
| aggression | **DEFERRED** |
| seed-driven variation | **DEFERRED**; the required seed is provenance-only in V1 |

The repository names six eventual archetypes—Driving 8ths, Driving 16ths, Midtempo Stomp, Pedal Tone, Octave Pulse, and Syncopated Darkwave—but does not yet define their normative behavior. V1 therefore uses the generic root-aligned baseline and does not select, rename, or define all six.

### Stage 6 progression

The intended sequencing keeps the first implementation narrow:

1. **Foundation (V1):** chord-root-only Bass, deterministic register continuity, Harmony-slot-aligned events, no syncopation, no inserted rests, and no seed-driven variation.
2. **Straight rhythm expansion (implemented on the current review branch):** sustained, quarter, eighth, sixteenth, and offbeat-eighth patterns with exact slot-local timing.
3. **Compound rhythm expansion (future):** triplets, dotted figures, and gallop/reverse-gallop families.
4. **Expressive deterministic rhythm (future):** controlled syncopation, rests, density, movement, octave behavior, and later seeded variation.

These are sequencing directions rather than new roadmap substage IDs. This milestone implements only the accepted straight-rhythm contract; the implementation remains unmerged pending review. Other components may define their own Arp-, Lead-, or Drum-specific pattern sets without changing this shared timing ownership principle.

## Structured errors

The implementation must use the established structured-error shape (stable `code`, `field`, and message, as used by Harmony/shared generator validation). The smallest V1 vocabulary is:

| Code | Trigger | Fields | Class |
|---|---|---|---|
| `INVALID_HARMONIC_CONTEXT` | Progression is missing, empty, malformed, or contains an unvalidated slot/root | `progression` or `progression.slots[i]` | Input validation |
| `INVALID_BASS_RANGE` | Bounds are missing, non-integer, unsafe, out of the `MidiPitch` domain, or `minMidiPitch > maxMidiPitch` | `range`, `range.minMidiPitch`, or `range.maxMidiPitch` | Input validation |
| `NO_LEGAL_ROOT_PITCH` | A validated root has no member in the approved inclusive range | `slots[i].chord.root` and `range` | Generation failure |
| `INVALID_BASS_TIMING` | Derived slot timing is non-integer, non-positive, outside the existing eight-bar boundary, or inconsistent with slot bar spans | `slots[i].bars`, `startTick`, or `durationTicks` | Input validation |
| `INVALID_BASS_RHYTHM` | Runtime input is not one of the five closed `BassRhythmId` values | `parameters.rhythm` | Input validation |

The implementation uses a closed `BassRhythmId` type and validates untrusted runtime input at the bounded-parameter boundary. `INVALID_BASS_TIMING` remains sufficient for malformed or impossible onset/duration projection; an invalid identifier is not misreported as timing and therefore uses `INVALID_BASS_RHYTHM`. No separate public Bass invariant code is invented. An impossible post-validation invariant must use the repository's existing internal/assertion or shared structured-failure convention rather than silently emitting data. No error is coerced, wrapped, or replaced with a MIDI-layer error.

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

## Test evidence

Deterministic automated evidence must verify:

- equal validated input produces byte-equivalent canonical Bass output;
- no ambient randomness participates in Bass generation; no seed-change fixture is claimed because the current runtime Bass API has no seed/provenance input;
- input Harmony context and returned values are mutation-safe and frozen according to repository conventions;
- every event pitch equals its slot Chord root modulo 12 and lies within the approved inclusive range;
- lower and upper range boundaries, every root pitch class, first-event selection nearest anchor `43`, and subsequent continuity selection are covered;
- candidate/input order cannot affect resolution, if an implementation internally enumerates candidates;
- starts and positive durations are integer canonical time values, follow slot bar spans exactly, and remain within the 8-bar boundary;
- repeated consecutive roots produce repeated slot-aligned events;
- empty/malformed harmonic context, invalid range, and no-legal-pitch cases produce the documented structured errors;
- no ambient randomness, floating-point timing, MIDI IR, serialized MIDI, browser, UI, persistence, or AI path participates in the result.

Human listening and profile-fit review remain separate evidence. Listening cannot replace these deterministic assertions.

The current branch additionally verifies exact starts, durations, and counts for quarter (`960`), eighth (`480`), and sixteenth (`240`) pulses; `offbeat-eighth` starts at `480`, `1,440`, `2,400`, and `3,360` per local bar with duration `480`, including multi-bar repetition and no onset at a slot boundary. `sustained` remains canonical-value equivalent to Stage 6A2. Every mode proves slot-boundary phase reset, no crossing, correct per-slot root pitch, Stage 6A1 continuity between slots, frozen values and collections, input mutation isolation, identical repeated output, section-boundary safety, and ambient-randomness isolation. Runtime rejection of unsupported rhythm identifiers and malformed timing asserts the structured codes above.

## Deferred behavior and implementation gate

Deferred until separately authorized Stage 6 slices are passing V1 evidence: eighth-note and sixteenth-note triplets; dotted-eighth/sixteenth figures; gallop and reverse gallop; broader syncopated-eighth patterns; rests beyond the exact offbeat spaces above; cross-slot ties; gate percentages; velocity patterns; accents; ghost notes; passing and approach tones; pedal tones; slash-bass and inversion-aware Bass; octave pulses; seeded pattern variation; density, movement, and aggression controls; profile-specific ranges; full composition orchestration; and any MIDI, browser, UI, persistence, audio, or AI behavior.

The current unmerged branch expands the Stage 6A1/A2 baseline only with the five accepted straight-rhythm projections. It preserves the approved range, pitch-resolution policy, existing Harmony and musical-time primitives, immutable canonical state, and MIDI-derived boundary.
