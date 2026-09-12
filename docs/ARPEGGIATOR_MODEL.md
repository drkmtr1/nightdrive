# Stage 7 Arpeggiator deterministic foundation contract

## Authority and status

Stage 7A freezes the smallest deterministic Arpeggiator foundation. Stage 7B1 is the current bounded implementation/review slice for Harmony validation and exact selected-voicing range filtering; it adds no event generation. The foundation supports later bounded implementation while preserving the eventual Stage 7 requirement for profile-appropriate rate, direction, range, gate, octave, density, and seeded behavior. It cannot by itself complete Stage 7 or AC-011.

## Ownership and boundaries

The future Arpeggiator consumes one validated `HarmonyProgressionRealization`. Harmony remains authoritative for progression ordering, slot bar spans, `Chord`, `ChordInversion`, and the selected `ChordVoicing`. Arp must revalidate relevant runtime shape, primitive, compatibility, and timing invariants, but it must not choose, replace, reorder, or reinterpret Harmony's selected voicing.

Arp owns only component-specific legal-pitch traversal and canonical event projection. Shared musical-time primitives own `Tick`, `DurationTicks`, 960 PPQ, bar length, and section boundaries. A future enclosing composition/generator layer owns generator and schema versions, seed lineage, stable aggregate IDs, provenance, hashes, locking, and aggregate serialization.

The component event is:

```text
ArpEvent {
  pitch: MidiPitch
  startTick: Tick
  durationTicks: DurationTicks
}
```

`ArpEvent` contains no MIDI channel, patch, velocity, track name, Note On/Off representation, browser/audio state, UI state, persistence fields, aggregate ID, provenance, seed, or AI output. Stage 7 does not introduce the broader conceptual aggregate `NoteEvent`; MIDI remains a downstream projection.

## Foundation parameters

The closed foundation vocabularies are:

```text
ArpRateId =
  "quarter" | "eighth" | "sixteenth"

ArpDirectionId =
  "up" | "down" | "up-down" | "down-up"

ArpRange {
  minMidiPitch: MidiPitch
  maxMidiPitch: MidiPitch
}

ArpGenerationParametersV1 {
  rate: ArpRateId
  direction: ArpDirectionId
  range: ArpRange
  gateTicks: DurationTicks
}
```

The parameter object contains no density, seed, octave span, profile pattern, `alternate`, `seededRandom`, probability, velocity, MIDI field, ID, or provenance field.

## Pitch source and range

For each ordered Harmony slot, take the exact ordered absolute MIDI pitches from Harmony's selected `ChordVoicing`. Revalidate the Chord, inversion, voicing, and both compatibility relationships rather than trusting forged branded values. `ChordVoicing` already guarantees strictly ascending absolute MIDI order, so Arp preserves that order without mutating or re-sorting Harmony state.

Filter those existing pitches using inclusive `ArpRange` bounds. Bounds must be valid `MidiPitch` values and `minMidiPitch` must not exceed `maxMidiPitch`. The foundation neither derives a replacement voicing nor adds octave-equivalent pitches. One, two, or three retained pitches are valid; no retained pitch produces `NO_LEGAL_ARP_PITCH` for that slot and fails the complete generation operation without partial success.

## Rate, timing, and gate

Rates map exactly to existing musical-time constants:

| Rate | Ticks |
|---|---:|
| `quarter` | `960` |
| `eighth` | `480` |
| `sixteenth` | `240` |

Each Harmony slot duration is its positive integer `bars` span multiplied by the authoritative `3,840` ticks per bar. The duration must be exactly divisible by the selected rate. A partial final step is rejected rather than truncated, rounded, or carried into the next slot.

`gateTicks` is an integer canonical `DurationTicks` from `1` through the selected `rateTicks`, inclusive. Zero, negative, fractional, unsafe, or over-rate values are invalid. An event therefore cannot overlap beyond its current rate step. Full gate means `gateTicks === rateTicks`; same-pitch adjacent events remain distinct canonical events whose boundary is exact.

Emit one monophonic `ArpEvent` at every configured rate step. Every start is inside its owning slot, every duration is positive, and no event may extend past its rate step, Harmony slot, or the canonical eight-bar boundary at tick `30,720`. Event starts remain strictly before that boundary; event ends may equal it.

## Direction and reset semantics

Let retained candidates be the ascending indices `0..n-1`. Direction cycles are exact:

```text
up:       0,1,...,n-1
down:     n-1,...,1,0
up-down:  0,1,...,n-1,n-2,...,1
down-up:  n-1,n-2,...,0,1,...,n-2
```

Turning endpoints are not duplicated inside a cycle. `up` and `up-down` start at the lowest retained pitch; `down` and `down-up` start at the highest.

For one candidate, every direction repeats index `0`. For two candidates, `up` and `up-down` repeat `0,1`; `down` and `down-up` repeat `1,0`.

Traversal resets at the beginning of every Harmony slot. A chord or slot change always begins a fresh direction cycle. Direction position never crosses a slot boundary, so differing candidate counts in successive slots cannot inherit or reinterpret the previous slot's index.

## Structured errors

Future implementation uses the existing stable `code`, `field`, and message convention:

| Code | Trigger |
|---|---|
| `INVALID_HARMONIC_CONTEXT` | Missing, empty, malformed, forged, incompatible, or non-eight-bar Harmony progression/slot input |
| `INVALID_ARP_RATE` | Runtime rate is outside the closed foundation vocabulary |
| `INVALID_ARP_DIRECTION` | Runtime direction is outside the closed foundation vocabulary |
| `INVALID_ARP_RANGE` | Bounds are malformed, outside `MidiPitch`, or reversed |
| `INVALID_ARP_GATE` | Gate is malformed or outside `1..rateTicks` |
| `NO_LEGAL_ARP_PITCH` | A validated slot has no selected-voicing pitch inside the range |
| `INVALID_ARP_TIMING` | Slot/rate projection is unsafe, non-integral, non-divisible, or outside slot/section boundaries |

There are no seed, density, octave-expansion, or profile-policy errors before those contracts exist. Impossible post-validation invariants use the repository's established internal assertion/failure convention rather than expanding the public vocabulary speculatively.

## Immutability and determinism

Returned events and the returned event array are frozen. Inputs are never mutated. Output order is stable ascending `startTick`; the monophonic foundation has exactly one event at each onset. Equal validated inputs produce canonical-value-equivalent output.

Candidate derivation, range filtering, rate projection, direction traversal, and gate behavior must not depend on `Math.random()`, wall clock, locale, network, database ordering, AI/LLM output, or object/discovery order.

## PRNG and provenance boundary

The versioned `nightdrive.prng.mulberry32.v1` primitive, canonical uint32 seed/state validation, and deterministic stepping are implemented. No accepted Arp-specific seed-bearing runtime boundary or production Arp consumer exists. Bounded choice, shuffle, weighting, stream/fork mechanics, Arp seed derivation, and the shared Arp generator/provenance envelope are not implemented contracts.

Foundation parameters therefore contain no seed. Foundation behavior is structurally deterministic and must not invent seed plumbing. The existence of the PRNG primitive alone does not establish full AC-004 replay evidence or seeded AC-011 completion.

## Deferred Stage 7 behavior

The following remain separately gated but are not removed from eventual Stage 7 scope: octave expansion; independently configurable density and deterministic rest/subsampling masks; seed-driven pattern, direction, octave, or density choices; `alternate` and `seededRandom` semantics; profile-specific patterns and musical policy; scale-tone transforms or other non-selected-voicing pitch sources; triplets; dotted and thirty-second rates; free-running Arp; VST automation; velocity/accent; MIDI; browser/audio; UI; persistence; and AI behavior.

No accepted concrete Arp mappings currently exist for Dark Synthwave, Classic Synthwave, Darkwave, or Midtempo Cyberpunk. The generic deterministic foundation may precede that musical policy, but Stage 7 cannot be declared profile-appropriate or complete until a separately reviewed policy contract and evidence exist.

## Bounded delivery sequence

1. **Stage 7A — contract definition:** this documentation-only foundation.
2. **Stage 7B1 — candidate foundation (current implementation/review slice):** validate Harmony and compatibility, filter the exact selected voicing by range, and return immutable stable candidates or structured failure; no events or traversal.
3. **Stage 7B2 — simple event projection:** fixed eighth rate, up direction, full gate, monophonic events, and slot-local reset.
4. **Stage 7B3 — rate and direction expansion:** quarter/eighth/sixteenth and the four exact direction cycles.
5. **Stage 7B4 — integer gate control:** `gateTicks` from `1..rateTicks` without ratios, percentages, overlap, velocity, or MIDI articulation.
6. **Stage 7C — remaining policy definition:** research/documentation first for octave behavior, density, seeded behavior, generator/provenance integration, and concrete profile policy.

This sequence describes review boundaries; it authorizes none of the implementation milestones.

## Requirement and evidence boundary

The foundation traces to MUS-003/AC-011, MUS-006/AC-013, and NFR-001/AC-004 only for behavior it actually implements later. Candidate and event evidence must cover active-Harmony derivation, compatibility, exact selected-voicing pitch source, inclusive range boundaries, one/two/three candidate sets, exact timings and cycles, slot/section containment, gate bounds, structured rejection, immutability, input non-mutation, repeatability, and ambient-randomness isolation.

Full Stage 7 remains pending until separately accepted octave, density, seeded, generator/provenance, and profile-policy contracts and evidence satisfy the complete AC-011 and AC-004 scope. Human musical review of profile fit remains separate from deterministic correctness.

Stage 7B1 implementation evidence covers canonical Harmony progression identity and ordered-slot validation, Chord/inversion/voicing compatibility, inclusive `MidiPitch` range validation, exact one/two/three-pitch filtering, whole-operation `NO_LEGAL_ARP_PITCH` failure, stable frozen per-slot output, input non-mutation, repeatability, and ambient-randomness isolation. It does not provide event, timing, rate, direction, gate, octave, density, seed, or profile-policy evidence.
