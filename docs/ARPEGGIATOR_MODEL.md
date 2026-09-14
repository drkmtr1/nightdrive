# Stage 7 Arpeggiator deterministic foundation contract

## Authority and status

Stage 7A freezes the smallest deterministic Arpeggiator foundation. Stage 7B1 is the accepted and merged bounded candidate foundation for Harmony validation and exact selected-voicing range filtering. Stage 7B2 is accepted and merged through PR #62 at approved head `b103a7c4e054f8b62ca81b660b53a2c6c2cdc797` with merge commit `acaea6da15dc3a97fc30421a181e0e7ca9d22c96`; it provides fixed-eighth, ascending, full-step event projection with slot-local traversal reset. Stage 7B3 rate/direction expansion is accepted and merged through PR #65 at approved head `7548055fe28c78d5f752481009e3f37970182054` with merge commit `74a77ebdee3a8d437697c47066adf14e934acff9`. Stage 7B4 now defines the configurable integer-gate contract for review; its production implementation has not started or been accepted. Octave, density, seed, and profile-policy capabilities remain separately gated. The foundation cannot by itself complete Stage 7 or AC-011.

## Ownership and boundaries

The Arpeggiator consumes one validated `HarmonyProgressionRealization`. Harmony remains authoritative for progression ordering, slot bar spans, `Chord`, `ChordInversion`, and the selected `ChordVoicing`. Arp must revalidate relevant runtime shape, primitive, compatibility, and timing invariants, but it must not choose, replace, reorder, or reinterpret Harmony's selected voicing.

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

`ArpGenerationParametersV1` is the eventual conceptual Stage 7 parameter shape. Stage 7B3 introduces only this bounded runtime parameter object:

```text
ArpTraversalParametersV1 = Readonly<{
  rate: ArpRateId
  direction: ArpDirectionId
  gateTicks?: DurationTicks
}>

generateArpEvents(
  progression: HarmonyProgressionRealization,
  range: ArpRange,
  parameters?: ArpTraversalParametersV1,
): readonly ArpEvent[]
```

The optionality of the complete third argument remains unchanged. Omitting it is canonically equivalent to supplying `{ rate: "eighth", direction: "up" }`, with the absent gate defaulting to the selected eighth-note `rateTicks`; this preserves the Stage 7B2 call `generateArpEvents(progression, range)`. If the argument is supplied, `rate` and `direction` remain required and Stage 7B4 introduces only the optional `gateTicks` property. Existing Stage 7B3 calls containing exactly rate and direction remain valid and default to a full-step gate. The gate default depends on the validated selected rate, not a fixed tick constant. A missing `gateTicks` property and an own `gateTicks` property whose value is explicitly `undefined` both select that default. No other `Partial<ArpTraversalParametersV1>` semantics exist. Range remains the second argument. The conceptual encompassing parameter object contains no density, seed, octave span, profile pattern, `alternate`, `seededRandom`, probability, velocity, MIDI field, ID, or provenance field.

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

Each Harmony slot duration is its positive integer `bars` span multiplied by the authoritative `3,840` ticks per bar. The duration must be exactly divisible by the selected rate. A partial final step is rejected rather than truncated, rounded, or carried into the next slot. For the canonical eight-bar section, quarter, eighth, and sixteenth rates produce exactly `32`, `64`, and `128` events respectively. With the absent or explicit full-step gate, the final event ends at tick `30,720`; a shortened gate makes the final event end earlier without changing its start or creating an event after it.

Stage 7B3 remains full-step gate only in the merged runtime: every event has `durationTicks === selected rateTicks`, and no `gateTicks` input is implemented. Stage 7B4 defines `gateTicks` as a finite safe integer tick duration from `1` through the validated selected `rateTicks`, inclusive. It is canonical deterministic music-domain data, not a ratio, percentage, floating value, overlap, legato, articulation, or MIDI Note Off policy. Runtime values are validated without coercion; zero, negative, fractional, non-finite, unsafe, non-number, and over-rate supplied values are invalid. Explicit `undefined` is treated exactly like an absent property and selects the full-step default.

Rate alone determines event start spacing. The effective gate—an explicit valid `gateTicks` or the selected rate when the property is absent or explicitly `undefined`—determines `durationTicks` only. Changing the gate cannot change pitch order, event count, start ticks, rate, direction cycle, or slot-local reset. `gateTicks === rateTicks` exactly preserves accepted Stage 7B3 output. Because the gate never exceeds the rate, every event ends no later than the next Arpeggiator step and cannot cross its Harmony slot or the eight-bar section boundary. At eighth rate with `gateTicks: 240`, starts remain `0, 480, 960, 1,440, ...` and every duration is `240` ticks. Same-pitch adjacent events remain distinct canonical events; a shortened gate leaves deterministic silence before the next step rather than joining, overlapping, or deleting events.

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

For one candidate, every direction repeats `[0]`. For two candidates, `up` and `up-down` repeat `[0,1]`; `down` and `down-up` repeat `[1,0]`. For three candidates, `up` repeats `[0,1,2]`, `down` repeats `[2,1,0]`, `up-down` repeats `[0,1,2,1]`, and `down-up` repeats `[2,1,0,1]`.

Traversal resets at the beginning of every Harmony slot. A chord or slot change always begins a fresh direction cycle. Direction position never crosses a slot boundary, so differing candidate counts in successive slots cannot inherit or reinterpret the previous slot's index.

Public-output tests must assert that every slot begins at the first index of the selected direction. Valid Harmony slots span integer bars, and the canonical rates produce slot event counts aligned with some bounce-cycle lengths; in those `up-down`/`down-up` cases, canonical public output cannot distinguish reset from carry. The implementation must nevertheless reset traversal state structurally for every slot. Tests must not invent noncanonical Harmony fixtures merely to force that distinction.

## Structured errors

Stage 7B3 activates the rate and direction entries in the existing stable `code`, `field`, and message convention. Errors gain no captured-value property:

| Code | Trigger |
|---|---|
| `INVALID_HARMONIC_CONTEXT` | Missing, empty, malformed, forged, incompatible, or non-eight-bar Harmony progression/slot input |
| `INVALID_ARP_RATE` | A supplied parameter object is malformed, incomplete at `rate`, or has a rate outside the closed vocabulary; field `parameters.rate` |
| `INVALID_ARP_DIRECTION` | A supplied complete-rate parameter object is incomplete at `direction` or has a direction outside the closed vocabulary; field `parameters.direction` |
| `INVALID_ARP_RANGE` | Bounds are malformed, outside `MidiPitch`, or reversed |
| `INVALID_ARP_GATE` | Gate is malformed or outside `1..rateTicks` |
| `NO_LEGAL_ARP_PITCH` | A validated slot has no selected-voicing pitch inside the range |
| `INVALID_ARP_TIMING` | Slot/rate projection is unsafe, non-integral, non-divisible, or outside slot/section boundaries |

Mixed-invalid Stage 7B4 input is validated in this normative order: range; Harmony context; whole-operation `NO_LEGAL_ARP_PITCH`; rate; direction; gate; internal timing invariant. This preserves the complete Stage 7B3 precedence prefix and places gate after the selected rate and required direction are valid. Gate failure uses `INVALID_ARP_GATE` with field `parameters.gateTicks`. Omitting the entire parameter argument selects the Stage 7B2 compatibility rate/direction defaults and then the full-step gate default. In a supplied parameter object, rate and direction must be complete; an absent `gateTicks` property or an explicit `gateTicks: undefined` has default semantics. There are no seed, density, octave-expansion, or profile-policy errors before those contracts exist.

`INVALID_ARP_TIMING` remains in the documented vocabulary but is unreachable for validated V1 Harmony at the Stage 7B3 rates: Harmony-valid slots span positive integer bars, and the canonical `3,840` ticks per bar is exactly divisible by `960`, `480`, and `240`. Forged or malformed bar spans fail earlier as `INVALID_HARMONIC_CONTEXT`. Impossible post-validation timing conditions use the repository's internal assertion/failure convention rather than manufacturing a public Stage 7B3 error path.

## Immutability and determinism

Returned events and the returned event array are frozen. Inputs are never mutated. Output order is stable ascending `startTick`; the monophonic foundation has exactly one event at each onset. Equal validated inputs produce canonical-value-equivalent output.

Candidate derivation, range filtering, rate projection, direction traversal, and gate behavior must not depend on `Math.random()`, wall clock, locale, network, database ordering, AI/LLM output, or object/discovery order.

## PRNG and provenance boundary

The versioned `nightdrive.prng.mulberry32.v1` primitive, canonical uint32 seed/state validation, and deterministic stepping are implemented. No accepted Arp-specific seed-bearing runtime boundary or seed-consuming production Arp consumer exists; Stage 7B1 and Stage 7B2 have no seed input, and Stage 7B3 adds none. Bounded choice, shuffle, weighting, stream/fork mechanics, Arp seed derivation, and the shared Arp generator/provenance envelope are not implemented contracts.

Foundation parameters therefore contain no seed. Foundation behavior is structurally deterministic and must not invent seed plumbing. The existence of the PRNG primitive alone does not establish full AC-004 replay evidence or seeded AC-011 completion.

## Deferred Stage 7 behavior

The following remain separately gated but are not removed from eventual Stage 7 scope: octave expansion; independently configurable density and deterministic rest/subsampling masks; seed-driven pattern, direction, octave, or density choices; `alternate` and `seededRandom` semantics; profile-specific patterns and musical policy; scale-tone transforms or other non-selected-voicing pitch sources; triplets; dotted and thirty-second rates; free-running Arp; VST automation; velocity/accent; MIDI; browser/audio; UI; persistence; and AI behavior.

No accepted concrete Arp mappings currently exist for Dark Synthwave, Classic Synthwave, Darkwave, or Midtempo Cyberpunk. The generic deterministic foundation may precede that musical policy, but Stage 7 cannot be declared profile-appropriate or complete until a separately reviewed policy contract and evidence exist.

## Bounded delivery sequence

1. **Stage 7A — contract definition:** this documentation-only foundation.
2. **Stage 7B1 — candidate foundation (accepted and merged through PR #59):** validate Harmony and compatibility, filter the exact selected voicing by range, and return immutable stable candidates or structured failure; no events or traversal.
3. **Stage 7B2 — simple event projection (accepted and merged through PR #62):** fixed eighth rate, up direction, full-step gate, monophonic events, and slot-local reset.
4. **Stage 7B3 — rate and direction expansion (accepted and merged through PR #65):** quarter/eighth/sixteenth and the four exact direction cycles through the complete optional runtime parameter object defined above.
5. **Stage 7B4 — integer gate control (contract defined for review; implementation unstarted):** add optional `gateTicks` to the complete Stage 7B3 traversal argument; absence defaults to the selected rate, while explicit values are validated in `1..rateTicks` without ratios, percentages, overlap, velocity, or MIDI articulation.
6. **Stage 7C — remaining policy definition:** research/documentation first for octave behavior, density, seeded behavior, generator/provenance integration, and concrete profile policy.

This sequence describes review boundaries; it authorizes none of the implementation milestones.

## Requirement and evidence boundary

The foundation traces to MUS-003/AC-011, MUS-006/AC-013, and NFR-001/AC-004 only for behavior it actually implements later. Candidate and event evidence must cover active-Harmony derivation, compatibility, exact selected-voicing pitch source, inclusive range boundaries, one/two/three candidate sets, exact timings and cycles, slot/section containment, gate bounds, structured rejection, immutability, input non-mutation, repeatability, and ambient-randomness isolation.

Full Stage 7 remains pending until separately accepted octave, density, seeded, generator/provenance, and profile-policy contracts and evidence satisfy the complete AC-011 and AC-004 scope. Human musical review of profile fit remains separate from deterministic correctness.

Stage 7B1 implementation evidence covers canonical Harmony progression identity and ordered-slot validation, Chord/inversion/voicing compatibility, inclusive `MidiPitch` range validation, exact one/two/three-pitch filtering, whole-operation `NO_LEGAL_ARP_PITCH` failure, stable frozen per-slot output, input non-mutation, repeatability, and ambient-randomness isolation. It does not provide event, timing, rate, direction, gate, octave, density, seed, or profile-policy evidence.

Stage 7B2 implementation evidence covers the exact three-field frozen `ArpEvent`, fixed `480`-tick starts and durations, ascending cycles for one/two/three retained pitches, traversal reset at every canonical slot, exact canonical slot boundaries, the complete 64-event eight-bar section ending at tick `30,720`, slot/section containment, selected-voicing candidate ownership, input non-mutation, replay, and ambient-randomness isolation. The fixed V1 Harmony catalog currently uses uniform two-bar slots; no noncanonical variable-span fixture is invented. Configurable rate and direction remain outside the merged Stage 7B2 slice.

Stage 7B3 implementation evidence covers all exact `960`/`480`/`240` rate mappings, full-step durations, `32`/`64`/`128` section event counts, exact slot/section containment, and final events ending at tick `30,720`. Independent direction cases cover all four exact cycles for one-, two-, and three-candidate sets without duplicated turning endpoints; slot-reset cases assert every canonical slot begins on the direction's first pitch while the implementation structurally resets its slot-local index. Validation cases cover malformed, incomplete, wrong-case, and unsupported parameters with exact rate/direction codes and fields, plus the normative precedence. Compatibility, frozen output, input non-mutation, replay, ambient-randomness isolation, and existing Stage 7B1/B2 failures remain covered. Gate, octave, density, seed, provenance, and profile policy remain outside the merged Stage 7B3 implementation.

Future Stage 7B4 implementation evidence must prove omission compatibility for both the two-argument call and existing rate/direction-only calls; explicit full-step equivalence and shortened positive gates at quarter, eighth, and sixteenth rates; inclusive `1` and `rateTicks` boundaries; exhaustive malformed and over-rate rejection with the exact gate code/field; the complete mixed-invalid precedence; and unchanged pitch order, counts, starts, slot reset, and section containment when only gate changes. It must also retain frozen output, input safety, repeatability, ambient-randomness isolation, same-pitch adjacent-step behavior, and all Stage 7B1/B2/B3 regression evidence. Documentation of these obligations is not implementation or acceptance evidence.
