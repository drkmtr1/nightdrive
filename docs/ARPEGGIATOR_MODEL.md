# Stage 7 Arpeggiator deterministic foundation contract

## Authority and status

Stage 7A freezes the smallest deterministic Arpeggiator foundation. Stage 7B1 is the accepted and merged bounded candidate foundation for Harmony validation and exact selected-voicing range filtering. Stage 7B2 is accepted and merged through PR #62 at approved head `b103a7c4e054f8b62ca81b660b53a2c6c2cdc797` with merge commit `acaea6da15dc3a97fc30421a181e0e7ca9d22c96`; it provides fixed-eighth, ascending, full-step event projection with slot-local traversal reset. Stage 7B3 rate/direction expansion is accepted and merged through PR #65 at approved head `7548055fe28c78d5f752481009e3f37970182054` with merge commit `74a77ebdee3a8d437697c47066adf14e934acff9`. Stage 7B4 integer gate control is accepted and merged through PR #68 at approved head `0878f77a5b6c5e31f142ab04771cc8bf1f7f0a8a` with merge commit `a061bb91d3fe3d973d0795df240cdd46d118a7af`. The Stage 7C documentation-only policy checkpoint is accepted and merged through PR #70; it defines future octave, density/mask, seeded resolution, provenance, and profile boundaries without authorizing runtime implementation. Stage 7C1 is accepted and merged through PR #72 at approved head `8d0a2d5ba3919e64b96cc2267cab0a0efd66d75e` with merge commit `77fde7d939f8da563cfbff28f4c5e69c37d754b2`. Stage 7C2 is accepted and merged through PR #73 at approved head `ef0f5f897eef215e01cf0857a0b1e92aa7979214` with merge commit `05a6f1a4b9e352bb8850c4f3ec3f034432d302bb`. Stage 7C3 component-seed derivation is accepted and merged through PR #75 at approved head `81b3c878daed262e18a50a2a539235c7bbc7e772` with merge commit `ec90258658a789d186f297cbc7041983bbbbea8a`; it was documentation-only and authorizes no runtime implementation. Stage 7C-P1 is accepted and merged through PR #79 at approved head `5a3f4cabd2dec99a309e50bf18a42d8c67ba17c0` with merge commit `2c138e67b8ed6003e2de273482f483289c4ce970`. Stage 7C4 is accepted and merged through PR #80 at approved head `2fb30286e9856e67b2ada775f187218a15303f95` with merge commit `4a1c8789e80087b66140740d71ec6663c3c8c6d0`. Stage 7C5 is accepted and merged through PR #81 at approved head `935f1570348d0b5565061e232f1783b9d2928291` with merge commit `d0dcd47c1568b448dae6b69ca425d174b95f49de`. Stage 7C6 is accepted and merged through PR #82 at approved head `82ca76bbb046669529d1515a2f534649e4d5675e` with merge commit `5d512548e4683ad90ec1c0eb5af3cdc9e72a73fb`. Stage 7C7a1 is accepted and merged through PR #83 at approved head `0d81cbed4797999a4f0ef4669e3a22feab47e974` with merge commit `a56cbb3f235c56f11551dac3773dda2741a6eb9d`. Stage 7C7a2 is accepted and merged through PR #84 at approved head `365b1855f008f2acf4a4a0642acea1cc057f60f7` with merge commit `0eb74c45174abd0659b8264313e483b6eb3e7e2a`; it implements only the internal deterministic weighted-choice primitive. Stage 7C7a3 is accepted and merged through PR #86 at approved head `b82651327e2dece6cb2c9d6462d3fb61d53179cb` with merge commit `adddaa0c5a6227583dd73c46b9b59747ac79b8d6`; it implements only the internal immutable Stage 7C1 density-mask catalog and deterministic lookup. Stage 7C7a4 is accepted and merged through PR #88 at approved head `5844ef48bdaf98bb638b081d8eb610842b90cc42` with merge commit `8ebc73a71703893ca1afa608b96264d0db51ee12`; it implements only the shared canonical Energy/Complexity runtime boundary. Stage 7C7a5 is accepted and merged through PR #90 at approved head `d2b18ca3156d358693e1d00456cde1558afcca51` with merge commit `e87e270745b6fe219df8b0cd76f47f47ded03400`; it implements only the shared Arpeggiator policy-configuration foundation. Stage 7C7a6 is accepted and merged through PR #92 at approved head `a7193128e9d8febcee6cca306a0f07fc1c6cc41a` with merge commit `e4ae8e8675a83e69752362565f94b73907ded10a`; it provides the internal genre-profile configuration runtime. Stage 7C7a7 policy resolution is accepted and merged through PR #94 at approved head `133c7f6fecc2a78ea4278fb7b44921a2484a0c13` with merge commit `afbe3493841ef38a62eb961368a2f1147f008725`. Stage 7C7a8 resolved-plan projection is accepted and merged through PR #96 at approved head `43d251c4c95d39f60320ad90bd80522c514d721c` with merge commit `a14b6e100d00464e314309b45813943e6f81b83a`. The enclosing Stage 7C integration/error-precedence operation is accepted and merged through PR #98 at approved head `d4373c60cb3242058df4bc1c898ccb2d465f0741` with merge commit `6f5e1d26e9f48a678f5c995538fdb218d29fd39d`. Aggregate provenance, structured human evaluation, and later work remain separately gated; Stage 7 and AC-011 are not claimed complete.

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

`ArpGenerationParametersV1` is the conceptual Stage 7A/B manual range/traversal shape. Stage 7C does not silently add seed, profile, octave, or mask policy to this accepted runtime API; a future separately reviewed resolver boundary composes the accepted traversal values into its resolved plan. Stage 7B3 introduces only this bounded runtime parameter object:

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

The optionality of the complete third argument remains unchanged. Omitting it is canonically equivalent to supplying `{ rate: "eighth", direction: "up" }`, with the absent gate defaulting to the selected eighth-note `rateTicks`; this preserves the Stage 7B2 call `generateArpEvents(progression, range)`. If the argument is supplied, `rate` and `direction` remain required and Stage 7B4 introduces only the optional `gateTicks` property. Existing Stage 7B3 calls containing exactly rate and direction remain valid and default to a full-step gate. The gate default depends on the validated selected rate, not a fixed tick constant. A missing `gateTicks` property and an own `gateTicks` property whose value is explicitly `undefined` both select that default. No other `Partial<ArpTraversalParametersV1>` semantics exist. Range remains the second argument. The accepted Stage 7B parameter object contains no density, seed, octave span, profile pattern, `alternate`, `seededRandom`, probability, velocity, MIDI field, ID, or provenance field.

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

Stage 7B3 remains full-step gate by default: every event has `durationTicks === selected rateTicks` when `gateTicks` is absent or explicitly `undefined`. The bounded Stage 7B4 implementation accepts `gateTicks` as a finite safe integer tick duration from `1` through the validated selected `rateTicks`, inclusive. It is canonical deterministic music-domain data, not a ratio, percentage, floating value, overlap, legato, articulation, or MIDI Note Off policy. Runtime values are validated without coercion; zero, negative, fractional, non-finite, unsafe, non-number, and over-rate supplied values are invalid. Explicit `undefined` is treated exactly like an absent property and selects the full-step default.

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

The versioned `nightdrive.prng.mulberry32.v1` primitive, canonical uint32 seed/state validation, deterministic stepping, and reusable Stage 7C7a1 component-seed derivation are implemented. Stage 7C7a2 implements only the generic internal weighted-choice primitive; it receives a supplied uint32 and does not call the PRNG. Stage 7C7a7 adds the first seed-consuming production Arpeggiator helper as a module-private policy resolver initialized from an already-derived component seed. Stage 7B still has no seed input, and the aggregate generator/provenance envelope is accepted separately from this transient domain boundary.

Foundation parameters therefore contain no seed. Foundation behavior is structurally deterministic and must not invent seed plumbing. The existence of the PRNG primitive alone does not establish full AC-004 replay evidence or seeded AC-011 completion.

## Stage 7C policy-resolution boundary

Stage 7C preserves two distinct layers:

```text
normalized composition intent
+ genre profile/version
+ energy/complexity
+ Arpeggiator component seed
→ deterministic resolved Arp plan
→ canonical Arp event projection
```

Stage 7C-P1 defines energy and complexity upstream as independent explicit `EnergyV1` and `ComplexityV1` values on the validated normalized composition brief. Their shared five-value vocabulary, ordinal order, `medium` omission defaults, and strict canonical validation are owned by the composition-brief boundary rather than the Arpeggiator. That prerequisite is accepted and merged through PR #79. Stage 7C4 freezes the exact Arpeggiator profile-policy consequences below without redefining either shared intent domain.

The resolved plan conceptually contains `rate`, `direction`, `gateTicks`, `octaveRange`, and `maskId: ArpDensityMaskIdV1` governed by the versioned mask catalog. It is bounded structured musical policy output, not an opaque random-note instruction. Stage 7B event projection remains responsible for canonical starts, durations, traversal, immutability, and boundary validation. Harmony remains authoritative for progression, Chord, inversion, and selected voicing. The future enclosing composition/generator schema owns the exact aggregate persistence representation; `ArpEvent` gains no seed, provenance, profile, policy, AI, MIDI, UI, or persistence fields.

Backward compatibility is mandatory. A resolved plan using octave range `1`, mask ID `full`, and the accepted Stage 7B default or explicit traversal values must reproduce Stage 7B pitch/event behavior exactly. Existing Stage 7B public calls remain valid; Stage 7C does not silently reinterpret them.

### Upward octave expansion

The closed V1 octave-range domain is `1 | 2 | 3`:

- `1` uses the exact Harmony-selected absolute pitches and reproduces Stage 7B pitch-source behavior.
- `2` considers each selected pitch at its original value and `+12` semitones.
- `3` considers each selected pitch at its original value, `+12`, and `+24` semitones.

Expansion is upward only. For each slot the normative transformation order is: (1) obtain the exact Harmony-selected pitches; (2) derive only the permitted upward octave equivalents; (3) discard values outside valid `MidiPitch` or the inclusive `ArpRange`; (4) deduplicate equal absolute pitches; (5) sort into stable ascending absolute-pitch order; and (6) apply the accepted direction traversal. The operation may create octave-equivalent copies only. It cannot invent a chord member, add a scale or chromatic passing tone, select a new voicing, change inversion, or reinterpret Harmony. A slot with no legal expanded pitch retains the existing whole-operation `NO_LEGAL_ARP_PITCH` meaning; Stage 7C5 below freezes malformed octave-range handling and its exact precedence at the owning profile-policy boundary.

### Deterministic density and rest masks

Density is policy input that resolves to an exact ordered on/rest mask; floating per-step probability is not canonical Arpeggiator behavior. Event projection advances one timeline step and one underlying direction-cycle position for every mask step. An `on` step emits the corresponding event; a `rest` step emits nothing but still consumes that pitch position. Therefore masking `C E G C` with `ON ON REST ON` yields `C E [rest] C`, not `C E [rest] G`. Changing only the mask cannot change the underlying full-density pitch cycle, rate grid, or slot-local traversal reset.

Stage 7C1 freezes the versioned catalog identity `nightdrive.arp-density-mask.v1` and this closed, case-sensitive V1 domain:

```ts
type ArpMaskStepV1 = "on" | "rest";

export type ArpDensityMaskIdV1 =
  | "full"
  | "three-of-four"
  | "alternating-on-rest"
  | "alternating-rest-on"
  | "one-of-four";
```

Every V1 mask contains exactly four rate steps:

| `ArpDensityMaskIdV1` | Exact ordered steps | On steps |
|---|---|---:|
| `full` | `on, on, on, on` | 4 |
| `three-of-four` | `on, on, rest, on` | 3 |
| `alternating-on-rest` | `on, rest, on, rest` | 2 |
| `alternating-rest-on` | `rest, on, rest, on` | 2 |
| `one-of-four` | `on, rest, rest, rest` | 1 |

This five-entry catalog is the smallest V1 set that represents full, three-quarter, half, and quarter density while retaining both possible alternating half-density phases. The table order is explanatory only; it does not define candidate order, selection weights, or PRNG bucket behavior. No all-rest mask exists in V1.

Mask positions operate over the selected Arpeggiator rate steps. At quarter, eighth, and sixteenth rates, one 4/4 bar contains exactly `4`, `8`, and `16` mask positions respectively. Every validated Harmony slot spans a positive integer number of bars, so its step count is an exact positive multiple of four at every accepted V1 rate. The four-step mask repeats by `maskIndex = slotStepIndex % 4` until the slot ends. It is never stretched, resampled, rotated, truncated mid-cycle, or carried into the next slot. A future rate or slot structure that does not preserve this exact relationship requires a separately versioned contract rather than implementation-defined partial-mask behavior.

Mask phase and traversal phase both reset at every Harmony slot. The first rate step of every slot uses mask index `0` and traversal index `0`; neither phase is free-running across slots. For each slot-local step, the projector first determines the pitch at the current traversal index, then reads the mask step. `on` emits that pitch and `rest` emits no event, but either value consumes the timeline step and advances traversal exactly once. Thus `on, on, rest, on` over `C, E, G, C` emits `C, E, [rest], C`; pausing traversal would incorrectly emit `C, E, [rest], G` and is prohibited.

Rate changes only the integer tick spacing of mask positions: quarter, eighth, and sixteenth use `960`, `480`, and `240` ticks per position. Rate does not change the four mask values, their order, repetition, reset, or traversal consumption. Gate continues to control only the duration of emitted events; a rest creates no `ArpEvent`.

`full` is the full-density identity. With octave range `1` and otherwise identical Stage 7B-compatible rate, direction, range, and gate values, it emits every traversal step and must produce canonical-value-equivalent Stage 7B events. The other masks may remove emissions only; they cannot change rate-step starts, the underlying full-density pitch cycle, selected-voicing ownership, or slot-local reset.

The resolved Arp plan carries `maskId: ArpDensityMaskIdV1`, not a caller-supplied free-form step array. The versioned catalog deterministically maps that ID to its frozen four-step sequence. The enclosing generator remains responsible for any eventual aggregate serialization and replay provenance, including the Arpeggiator policy/catalog version and resolved mask ID. `ArpEvent` remains only `pitch`, `startTick`, and `durationTicks`; it gains no mask, density, seed, profile, AI, MIDI, UI, or persistence field. No standalone mask serializer is defined here.

Future runtime validation must reject every value that is not one of the exact identifiers above, including non-strings, empty strings, unknown values, wrong-case or whitespace variants, arrays, and objects; it must not coerce aliases or accept caller-defined masks. Internal catalog evidence must prove unique IDs, exactly four frozen `on`/`rest` steps per entry, and at least one `on` step. Stage 7C5 classifies a malformed profile-owned mask candidate as invalid versioned policy configuration rather than introducing caller-defined mask input.

The catalog ID-to-sequence mapping, identifier vocabulary, step order, length, repetition rule, slot-reset rule, and rest-consumes-traversal rule are replay-relevant policy semantics. Adding, removing, renaming, or reinterpreting an identifier, or changing any of those mechanics, requires a new appropriate Arpeggiator policy/catalog version and must not silently reinterpret historical output. Candidate ordering and profile membership/weights are frozen by Stage 7C4, while the generic selection mechanics remain frozen by Stage 7C2.

#### Stage 7C7a3 internal catalog runtime boundary

Stage 7C7a3 owns only the Nightdrive-local immutable runtime representation and deterministic lookup of this already accepted five-entry catalog. Its smallest suitable boundary accepts one already accepted `ArpDensityMaskIdV1` and returns that identifier's canonical readonly four-step `readonly ArpMaskStepV1[]` sequence. The lookup is module-internal: it is not exported through the public music-domain barrel, accepts no caller-defined arrays, and adds no caller-facing API.

The catalog object, every entry, and every returned sequence must be frozen/immutable. Lookup is a pure identity-to-sequence mapping: it performs no sorting, rotation, resampling, normalization, aliasing, coercion, cloning policy, profile, energy, complexity, root/component seed, PRNG, clock, locale, network, AI, persistence, database, or discovery-order operation. Repeated equal lookups must produce canonical-value-equivalent sequences without mutating an input or catalog state. The implementation may defensively assert an impossible invalid internal ID at its direct internal boundary, but it introduces no Stage 7C5 public `ArpValueError` code, field, or precedence. Malformed profile-owned mask candidates remain owned by later profile/configuration and enclosing-operation boundaries.

Stage 7C7a3 does not execute the catalog semantics: it does not repeat masks, reset slot phase, advance traversal, consume rests, emit or remove events, expand octaves, resolve policy, consume PRNG output, make five-slot decisions, validate candidate membership or weights, project a resolved plan, invoke the enclosing Stage 7C operation, or own provenance/persistence. Those remain separately gated at their accepted owners.

The accepted Stage 7C7a3 implementation uses an explicit frozen five-key catalog and returns each canonical frozen sequence by reference through its internal deterministic lookup. Its direct evidence proves all five exact mappings and that no other IDs exist; exactly four ordered `on`/`rest` steps and at least one `on` per mask; catalog and sequences are immutable; lookup is non-mutating and deterministic; no ambient or environmental input is used; no public barrel exposure exists; and existing Stage 7B plus completed Stage 7C primitive regressions remain green. No dependency is justified: this small replay-critical Nightdrive domain catalog remains locally owned. It is accepted and merged through PR #86 at approved head `b82651327e2dece6cb2c9d6462d3fb61d53179cb` with merge commit `adddaa0c5a6227583dd73c46b9b59747ac79b8d6`.

### Component seed isolation and policy stream

The enclosing generator derives one canonical uint32 component seed from the canonical uint32 composition root seed and a closed stable component identity. V1 uses the conceptual identities `harmony`, `bass`, `arpeggiator`, and `motif`; `motif` is the generator identity for the scoped lead/motif component. Stable names, never positional child indices or discovery order, identify components. Harmony, Bass, or motif PRNG consumption cannot alter the Arpeggiator seed. A single mutable composition-wide stream is prohibited.

The Arpeggiator receives one component seed and uses one `nightdrive.prng.mulberry32.v1` stream inside its versioned policy. V1 does not create per-parameter seeds. The fixed policy decision-slot order is:

1. rate;
2. octave range;
3. direction;
4. rhythm/rest mask;
5. gate.

Exactly one PRNG uint32 output is consumed for every decision slot even when that decision slot has only one legal candidate. This keeps later decisions stable when an earlier dimension changes between one and several allowed candidates. Candidate order and decision-slot order are versioned policy data; changing either is a new Arpeggiator policy version.

### Deterministic weighted choice

Stage 7C2 accepts the generic weighted-choice contract identity `nightdrive.weighted-choice.uint32-modulo.v1`. It operates on a non-empty ordered list with this conceptual shape; it does not freeze a production TypeScript API:

```ts
type WeightedCandidate<T> = Readonly<{
  value: T;
  weight: number;
}>;
```

Each candidate weight must be a JavaScript `number` that is finite, a safe integer, and in the inclusive range `0..65,535`. Negative, fractional, non-number, non-finite, unsafe, or larger values are invalid without coercion. Zero is permitted, but the exact left-to-right sum of all weights must be in `1..65,535`; an empty list, an all-zero list, or a running/final total above `65,535` is invalid. The total is ordinary exact integer addition in declared order. V1 deliberately uses this small bounded integer domain: `65,535` is far beyond expected musical-policy weighting needs while keeping cumulative arithmetic and validation simple, exact, and deterministic. The ceiling is replay-relevant V1 behavior, not a requirement or implication that persistence, storage, or serialization use a uint16 representation. Expanding the weight or total domain requires an appropriate version change rather than silently altering V1. Weights are raw versioned policy data: there is no normalization, rescaling, clamping, wrapping, greatest-common-divisor reduction, or floating-point probability calculation.

Candidate order is semantically significant versioned policy data. Runtime selection must preserve the declared array order and must not sort candidates or derive order from object keys, maps, sets, discovery order, locale, display labels, or AI output. The generic weighted-choice mechanism defines no equality or canonical-identity operation for arbitrary `T`; it must not infer one through object identity, deep equality, JSON serialization, locale comparison, or another implicit generic rule. Each owning policy dimension constructs its ordered candidate list according to that domain's closed vocabulary and domain-specific uniqueness rules, then weighted choice consumes that already-constructed list without adding, removing, merging, or comparing candidate values.

For one supplied canonical uint32 output `u` in `0..4,294,967,295`, compute exactly:

```text
totalWeight = left-to-right sum of candidate weights
bucket = u % totalWeight
```

`bucket` is an integer in the half-open range `[0, totalWeight)`. Iterate candidates in declared order while accumulating `cumulativeExclusive`; a candidate owns the half-open interval `[previousCumulative, cumulativeExclusive)` and the first candidate for which `bucket < cumulativeExclusive` is selected. A zero-weight candidate owns an empty interval, remains present in versioned policy order, and can never be selected. A legal one-candidate list follows the same weight rules and still consumes exactly one PRNG output; every bucket selects that sole positive-weight candidate.

V1 explicitly accepts the small modulo bias that occurs whenever `totalWeight` does not divide `2^32`. Every bucket has either `floor(2^32 / totalWeight)` or `ceil(2^32 / totalWeight)` uint32 preimages, so bucket counts differ by at most one. With `totalWeight <= 65,535`, each bucket has at least `65,537` preimages, making the maximum relative count imbalance less than `1 / 65,537`; that bounded non-cryptographic bias is acceptable for musical-policy selection. Rejection sampling is prohibited because it would consume a variable number of PRNG outputs and violate the accepted fixed decision-slot schedule.

The selector is pure and immutable. It receives rather than produces the one uint32 output, consumes no additional PRNG values, never mutates candidates, and does not depend on `Math.random()`, wall clock, network, locale, ambient state, object iteration, or AI behavior. The existing `nightdrive.prng.mulberry32.v1` state transition and stepping semantics do not change.

Normative golden vectors use the declared candidate order shown:

| Ordered candidates | uint32 `u` | `totalWeight` | `bucket` | Half-open intervals | Selected |
|---|---:|---:|---:|---|---|
| `A:1, B:1, C:1` | `0` | `3` | `0` | `A [0,1)`, `B [1,2)`, `C [2,3)` | `A` |
| `A:1, B:1, C:1` | `2` | `3` | `2` | `A [0,1)`, `B [1,2)`, `C [2,3)` | `C` |
| `A:2, B:3, C:1` | `2` | `6` | `2` | `A [0,2)`, `B [2,5)`, `C [5,6)` | `B` |
| `A:2, B:3, C:1` | `5` | `6` | `5` | `A [0,2)`, `B [2,5)`, `C [5,6)` | `C` |
| `A:2, B:3, C:1` | `0xffffffff` | `6` | `3` | `A [0,2)`, `B [2,5)`, `C [5,6)` | `B` |
| `A:0, B:2, C:0` | `0` | `2` | `0` | `A [0,0)`, `B [0,2)`, `C [2,2)` | `B` |
| `A:7` | `0xffffffff` | `7` | `3` | `A [0,7)` | `A` |

Future runtime validation must reject an empty list; malformed candidates; weights outside the exact domain; zero or overflowing totals; and a supplied output that is not a canonical uint32. Domain-specific candidate construction remains responsible for its own closed vocabulary and uniqueness validation before invoking weighted choice. Stage 7C5 keeps this generic helper internal and translates malformed owning configuration at the Stage 7C operation boundary as specified below.

The weighted-choice identity, mapping algorithm, modulo-bias policy, candidate order, weight domain and total bound, raw-weight/no-normalization rule, zero-weight semantics, summation order, cumulative half-open boundary algorithm, and single-candidate consumption rule are replay-relevant. Changing any of them requires a new appropriate weighted-choice or Arpeggiator policy version rather than silently reinterpreting historical output. Stage 7C2 freezes no profile-specific candidates or weights and authorizes no runtime implementation.

### Exact Stage 7C4 profile-policy resolution

Stage 7C4 freezes the shared Arpeggiator policy identity `nightdrive.arpeggiator-policy.v1`. It owns the five decision dimensions and their fixed order, construction of exact weighted lists from independent energy and complexity lookup rows, sequential use of one Arpeggiator component PRNG stream, and the shared semantic-gate-to-integer mapping. The exact per-profile membership, order, raw base weights, and lookup adjustments belong to the immutable `nightdrive.genre-profile.arpeggiator.v1` data set in the [genre profile model](GENRE_PROFILE_MODEL.md), keyed by stable profile ID. The weighted-choice and seed-derivation identities remain `nightdrive.weighted-choice.uint32-modulo.v1` and `nightdrive.seed-derivation.component.v1`; Stage 7C4 does not alter them.

For each of the five policy slots, the active profile supplies one fixed candidate order, one exact energy weight vector selected by the explicit `EnergyV1` value, and one exact complexity-addition vector selected independently by the explicit `ComplexityV1` value. The final raw vector is their candidate-aligned element-wise integer sum. The lookup tables enumerate all five values of each dimension, so their Cartesian product defines every one of the 25 pairs without interpolation, ordinal arithmetic, scalar combination, hidden thresholds, clamping, normalization, or floating-point probability. A slot documented as invariant to one dimension supplies the same explicit vector for all five values of that dimension.

Resolution consumes the Arpeggiator component stream in this exact order:

1. construct the ordered rate list, consume one uint32, and select with `nightdrive.weighted-choice.uint32-modulo.v1`;
2. construct the ordered octave-range list, consume one uint32, and select;
3. construct the ordered direction list, consume one uint32, and select;
4. construct the ordered density/rest-mask list, consume one uint32, and select;
5. construct the ordered semantic gate list, consume one uint32, select, and map it to `gateTicks` using the already-selected rate.

Every slot consumes exactly one output even when its final list contains one candidate. Candidate construction consumes no PRNG output. Candidate order comes only from the immutable profile data and is never derived from object/map/set keys, database or discovery order, display labels, locale, or AI output.

The closed Stage 7C4 semantic gate vocabulary is:

```ts
type ArpGateIdV1 = "short" | "medium" | "long";
```

`ArpGateIdV1` is policy-only resolved data; canonical event projection still receives integer `gateTicks` and Stage 7B4 remains unchanged. The normative output is the complete lookup table below. Its rate-relative representation is the exact integer factor pair `short = (1,2)`, `medium = (3,4)`, and `long = (1,1)`, interpreted as `(rateTicks * numerator) / denominator` only after the accepted rate has established exact divisibility. Every quotient is exact; no rounding mode or general percentage calculation exists.

| Selected rate | `rateTicks` | `short` | `medium` | `long` |
|---|---:|---:|---:|---:|
| `quarter` | `960` | `480` | `720` | `960` |
| `eighth` | `480` | `240` | `360` | `480` |
| `sixteenth` | `240` | `120` | `180` | `240` |

The table values, not an implementation-dependent numeric conversion, are canonical. There is no rounding, ratio stored in the resolved plan, floating-point calculation, overlap, or value outside `1..rateTicks`. Gate changes duration only; rate continues to control event starts, counts, and mask spacing. `long` is the exact full-step Stage 7B gate. Existing Stage 7B calls remain valid without profile-policy resolution, while octave range `1`, mask `full`, and `long` retain the accepted Stage 7B-compatible meanings wherever an active profile permits those candidates.

The profile-data version fixes candidate membership, candidate order, raw energy vectors, and raw complexity additions. The Arpeggiator policy version fixes vector combination, decision-slot order, one-output-per-slot consumption, and gate resolution. Historical replay retains both identities plus normalized energy/complexity, profile ID/version, PRNG version, seed-derivation version, root seed, and enclosing generator/schema lineage. Changing any owned item requires a new appropriate version; a later musical evaluation result cannot silently mutate V1.

Stage 7C4 assigns no public error code, field, or mixed-invalid precedence. Stage 7C5 below freezes that separate contract without changing any Stage 7C4 policy data. This section defines no runtime type, selector, resolver, octave expansion, mask application, seed derivation, or event-projection implementation.

### Stage 7C7a5 shared policy-configuration foundation

Stage 7C7a5 implements the shared `nightdrive.arpeggiator-policy.v1` configuration boundary in the framework-independent direct module `src/music-domain/arpeggiator-policy-configuration.ts`. It does not live in genre-profile configuration, composition intent, projection, or generic configuration infrastructure. The module owns only shared policy identities, closed shared domains, the fixed decision schedule, the one supported profile/policy compatibility pair, exact semantic gate mappings, recursive immutability, and shared-policy structural validation. It contains no profile candidate or weight data and consumes no seed or PRNG output.

The exact direct-module types and constants are:

```ts
export const ARP_PROFILE_DATA_VERSION_V1 =
  "nightdrive.genre-profile.arpeggiator.v1" as const;
export type ArpProfileDataVersionV1 = typeof ARP_PROFILE_DATA_VERSION_V1;

export const ARP_POLICY_VERSION_V1 = "nightdrive.arpeggiator-policy.v1" as const;
export type ArpPolicyVersionV1 = typeof ARP_POLICY_VERSION_V1;

export const ARP_OCTAVE_RANGE_V1_VALUES = Object.freeze([1, 2, 3] as const);
export type ArpOctaveRangeV1 = (typeof ARP_OCTAVE_RANGE_V1_VALUES)[number];

export const ARP_GATE_ID_V1_VALUES = Object.freeze(["short", "medium", "long"] as const);
export type ArpGateIdV1 = (typeof ARP_GATE_ID_V1_VALUES)[number];

export const ARP_POLICY_DECISION_SLOT_V1_VALUES = Object.freeze([
  "rate",
  "octave-range",
  "direction",
  "mask",
  "gate",
] as const);
export type ArpPolicyDecisionSlotV1 =
  (typeof ARP_POLICY_DECISION_SLOT_V1_VALUES)[number];

export const ARP_WEIGHTED_CHOICE_VERSION_V1 =
  "nightdrive.weighted-choice.uint32-modulo.v1" as const;
export const ARP_DENSITY_MASK_CATALOG_VERSION_V1 =
  "nightdrive.arp-density-mask.v1" as const;
```

`ArpOctaveRangeV1` is a discrete policy domain, not an arbitrary positive-integer range, and Stage 7C7a5 performs no octave expansion. `ArpGateIdV1` is policy-only semantic data and never becomes a Stage 7B caller gate input. The tuple constants are the canonical order; neither their representation nor validation may derive order from object keys, `Map`, `Set`, database rows, discovery, display labels, locale, or AI output.

The smallest shared configuration shape is:

```ts
export type SharedArpPolicyConfigurationV1 = Readonly<{
  version: ArpPolicyVersionV1;
  compatibleProfileDataVersion: ArpProfileDataVersionV1;
  decisionSlots: readonly ["rate", "octave-range", "direction", "mask", "gate"];
  weightedChoiceVersion: typeof ARP_WEIGHTED_CHOICE_VERSION_V1;
  densityMaskCatalogVersion: typeof ARP_DENSITY_MASK_CATALOG_VERSION_V1;
  octaveRanges: readonly [1, 2, 3];
  gateIds: readonly ["short", "medium", "long"];
  gateTicksByRate: Readonly<{
    quarter: Readonly<{ short: DurationTicks; medium: DurationTicks; long: DurationTicks }>;
    eighth: Readonly<{ short: DurationTicks; medium: DurationTicks; long: DurationTicks }>;
    sixteenth: Readonly<{ short: DurationTicks; medium: DurationTicks; long: DurationTicks }>;
  }>;
}>;

export const SHARED_ARP_POLICY_CONFIGURATION_V1: SharedArpPolicyConfigurationV1;
```

This single explicit V1 object is the complete compatibility declaration: `nightdrive.arpeggiator-policy.v1` accepts only `nightdrive.genre-profile.arpeggiator.v1`. No generalized version registry, arbitrary configuration injection, profile records, candidate arrays, weight vectors, intent lookup tables, PRNG state, component seed, resolved plan, or event data belongs in it.

The canonical `gateTicksByRate` values are:

| Rate | `rateTicks` | `short` | `medium` | `long` |
|---|---:|---:|---:|---:|
| `quarter` | `960` | `480` | `720` | `960` |
| `eighth` | `480` | `240` | `360` | `480` |
| `sixteenth` | `240` | `120` | `180` | `240` |

These nine table values are canonical integers, not results of a canonical runtime percentage or floating calculation. Every value is in `1..rateTicks`, and `long` equals `rateTicks` for every rate. The accepted factor relationship may explain the values but supplies no rounding or alternate derivation semantics.

The direct shared validator has this boundary:

```ts
export type SharedArpPolicyConfigurationFailureKindV1 =
  | "INVALID_CONFIGURATION_SHAPE"
  | "INVALID_POLICY_VERSION"
  | "INCOMPATIBLE_PROFILE_DATA_VERSION"
  | "INVALID_DECISION_SLOTS"
  | "INVALID_WEIGHTED_CHOICE_VERSION"
  | "INVALID_DENSITY_MASK_CATALOG_VERSION"
  | "INVALID_OCTAVE_RANGES"
  | "INVALID_GATE_IDS"
  | "INVALID_GATE_MAPPINGS";

export class SharedArpPolicyConfigurationError extends RangeError {
  readonly owner: "policy.version";
  readonly kind: SharedArpPolicyConfigurationFailureKindV1;
}

export function validateSharedArpPolicyConfigurationV1(
  value: unknown,
): SharedArpPolicyConfigurationV1;
```

This error is direct-module/internal infrastructure, not `ArpValueError`, `CompositionIntentValueError`, or a new public Stage 7C5 code. It captures no arbitrary invalid payload. Its fixed owner preserves the enclosing operation's sole responsibility to translate every shared-policy configuration failure to `INVALID_ARP_POLICY_CONFIGURATION` at `policy.version`; diagnostic message prose is not a machine discriminator. The validator returns the recursively frozen canonical configuration by reference after exact validation and never mutates its input.

Direct validation precedence is exact: (1) plain non-array object with exactly the shared configuration properties; (2) policy identity; (3) compatible profile-data identity; (4) exact decision-slot tuple; (5) weighted-choice identity; (6) density-mask catalog identity; (7) exact octave-range tuple; (8) exact semantic-gate tuple; then (9) exact gate mapping in `quarter`, `eighth`, `sixteenth` rate order and `short`, `medium`, `long` gate order. At each tuple or mapping step, missing entries fail before extras, extras before duplicates where duplicates are representable, then order, type/integer/safe-integer status, lower bound, upper bound, exact canonical value, and the `long === rateTicks` invariant. This private order does not alter Stage 7C5's public mixed-invalid precedence.

The outer configuration, both ordered tuples, every nested rate mapping, and any identity/compatibility tuple used by the implementation must be frozen recursively. Mutation attempts cannot change subsequent reads. Validation is pure, deterministic, and input-preserving, and it cannot depend on `Math.random()`, the Nightdrive PRNG, root/component seeds, energy, complexity, profile selection, clock, locale, network, AI, persistence, database state, environment, or discovery/object order.

All Stage 7C7a5 configuration objects, validators, error types, and closed policy types remain direct-module exports only and are not re-exported from `src/music-domain/index.ts`. `WeightedCandidate<T>` remains non-barrel. The enclosing operation exposes only the accepted Stage 7C request, plan, result, closed mask/octave identifiers, and version identities; callers cannot inject arbitrary shared policy configuration.

No dependency is justified. This is small replay-critical Nightdrive-owned policy data and exact structural validation; a schema, configuration, or policy framework would add cost without owning the canonical semantics.

Stage 7C7a5 is accepted and merged through PR #90 at approved head `d2b18ca3156d358693e1d00456cde1558afcca51` with merge commit `e87e270745b6fe219df8b0cd76f47f47ded03400`. It does not include the four genre-profile records, profile candidate membership/order, energy weights, complexity additions, construction of the 500 final lists, profile-owned validation or `profile.version` failures, component-seed or PRNG use, weighted selection, resolution, `ResolvedArpPlanV1`, density-mask execution, octave expansion, projection, enclosing integration, Stage 7C5 public error translation, Stage 7B changes, MIA-004, human evaluation, UI, MIDI, persistence, browser/audio, AI, or dependencies.

### Stage 7C7a6 accepted genre-profile configuration runtime

Stage 7C7a6 is accepted and merged through PR #92 at approved head `a7193128e9d8febcee6cca306a0f07fc1c6cc41a` with merge commit `e4ae8e8675a83e69752362565f94b73907ded10a`. It owns only the immutable literal `nightdrive.genre-profile.arpeggiator.v1` data set, exact structural validation of that accepted data, and deterministic construction of one candidate-aligned raw weighted list. It reuses the Stage 7C7a5 policy identity and closed domains without redefining them, and it does not select a candidate. Stage 7C7a7 policy resolution is accepted and merged through PR #94 at approved head `133c7f6fecc2a78ea4278fb7b44921a2484a0c13` with merge commit `afbe3493841ef38a62eb961368a2f1147f008725` and reuses this accepted candidate-construction boundary unchanged.

The framework-independent direct module is fixed as `src/music-domain/arpeggiator-profile-configuration.ts`. Its smallest explicit representation preserves all semantically ordered collections as tuples with identity-bearing records rather than relying on object, map, set, database, discovery, display-label, or locale order:

```ts
export type ArpPolicyCandidateByDecisionSlotV1 = Readonly<{
  rate: ArpRateId;
  "octave-range": ArpOctaveRangeV1;
  direction: ArpDirectionId;
  mask: ArpDensityMaskIdV1;
  gate: ArpGateIdV1;
}>;

export type ArpProfileWeightRowV1<TLevel extends EnergyV1 | ComplexityV1> =
  Readonly<{ level: TLevel; values: readonly number[] }>;

export type ArpProfileDecisionSlotConfigurationV1<
  TSlot extends ArpPolicyDecisionSlotV1,
> = Readonly<{
  slot: TSlot;
  candidates: readonly ArpPolicyCandidateByDecisionSlotV1[TSlot][];
  energyWeights: readonly [
    ArpProfileWeightRowV1<"very-low">,
    ArpProfileWeightRowV1<"low">,
    ArpProfileWeightRowV1<"medium">,
    ArpProfileWeightRowV1<"high">,
    ArpProfileWeightRowV1<"very-high">,
  ];
  complexityAdditions: readonly [
    ArpProfileWeightRowV1<"very-low">,
    ArpProfileWeightRowV1<"low">,
    ArpProfileWeightRowV1<"medium">,
    ArpProfileWeightRowV1<"high">,
    ArpProfileWeightRowV1<"very-high">,
  ];
}>;

export type ArpGenreProfileConfigurationV1<
  TProfileId extends HarmonyProfileId = HarmonyProfileId,
> = Readonly<{
  profileId: TProfileId;
  decisionSlots: readonly [
    ArpProfileDecisionSlotConfigurationV1<"rate">,
    ArpProfileDecisionSlotConfigurationV1<"octave-range">,
    ArpProfileDecisionSlotConfigurationV1<"direction">,
    ArpProfileDecisionSlotConfigurationV1<"mask">,
    ArpProfileDecisionSlotConfigurationV1<"gate">,
  ];
}>;

export type ArpGenreProfileConfigurationDataV1 = Readonly<{
  version: ArpProfileDataVersionV1;
  profiles: readonly [
    ArpGenreProfileConfigurationV1<typeof HARMONY_PROFILE_IDS.darkSynthwave>,
    ArpGenreProfileConfigurationV1<typeof HARMONY_PROFILE_IDS.classicSynthwave>,
    ArpGenreProfileConfigurationV1<typeof HARMONY_PROFILE_IDS.darkwave>,
    ArpGenreProfileConfigurationV1<typeof HARMONY_PROFILE_IDS.midtempoCyberpunk>,
  ];
}>;

export const ARP_GENRE_PROFILE_CONFIGURATION_V1: ArpGenreProfileConfigurationDataV1;
```

`HarmonyProfileId`, `EnergyV1`, `ComplexityV1`, `ArpRateId`, `ArpDirectionId`, `ArpOctaveRangeV1`, `ArpGateIdV1`, `ArpDensityMaskIdV1`, `ArpProfileDataVersionV1`, and `ArpPolicyDecisionSlotV1` are imported from their owning modules. Stage 7C7a6 creates no aliases or second profile vocabulary. The profile tuple order is exactly `dark-synthwave`, `classic-synthwave`, `darkwave`, `midtempo-cyberpunk`; the slot tuple order is exactly `rate`, `octave-range`, `direction`, `mask`, `gate`; both five-row tuples are exactly `very-low`, `low`, `medium`, `high`, `very-high`. The candidates and every source vector are the literal accepted Stage 7C4 tables in the Genre Profile Model, without templates, inheritance, inference, tuning, or computed defaults.

The internal construction boundary reuses but does not publicly expose the existing `WeightedCandidate<T>` representation:

```ts
export function validateArpGenreProfileConfigurationV1(
  value: unknown,
): ArpGenreProfileConfigurationDataV1;

export function buildArpWeightedCandidatesV1<
  TSlot extends ArpPolicyDecisionSlotV1,
>(
  configuration: ArpGenreProfileConfigurationDataV1,
  profileId: HarmonyProfileId,
  decisionSlot: TSlot,
  energy: EnergyV1,
  complexity: ComplexityV1,
): readonly WeightedCandidate<ArpPolicyCandidateByDecisionSlotV1[TSlot]>[];
```

The builder validates the supplied configuration without mutation, finds profile, slot, energy row, and complexity row through their canonical tuples, and returns a newly recursively frozen list in the accepted candidate order. For each position `i`, `weight = energyWeight[i] + complexityAddition[i]` by exact safe-integer addition. It performs no normalization, sorting, interpolation, ordinal arithmetic, multiplication, division, floating probability, clamping, deduplication, candidate removal, PRNG operation, or weighted selection. A zero-weight entry, if a future compatible accepted configuration ever contains one, remains present and ordered; the accepted V1 tables produce only final weights `1..10` and totals `1..20`. All `4 × 5 × 25 = 500` profile/slot/energy-complexity lists are nonempty and within the Stage 7C2 individual `0..65,535` and total `1..65,535` bounds.

The direct validator failure boundary is exact:

```ts
export type ArpGenreProfileConfigurationFailureKindV1 =
  | "INVALID_CONFIGURATION_SHAPE"
  | "INVALID_PROFILE_DATA_VERSION"
  | "INVALID_PROFILE_SET"
  | "INVALID_SLOT_STRUCTURE"
  | "INVALID_CANDIDATES"
  | "INVALID_ENERGY_TABLE"
  | "INVALID_COMPLEXITY_TABLE"
  | "INVALID_VECTOR_ALIGNMENT"
  | "INVALID_WEIGHT"
  | "INVALID_FINAL_WEIGHTS";

export class ArpGenreProfileConfigurationError extends RangeError {
  readonly owner: "profile.version";
  readonly kind: ArpGenreProfileConfigurationFailureKindV1;
}
```

It captures no arbitrary invalid payload. It is not `ArpValueError`, `CompositionIntentValueError`, or `SharedArpPolicyConfigurationError`, and it adds no public Stage 7C5 code. The enclosing operation translates every such failure to the already accepted `INVALID_ARP_POLICY_CONFIGURATION` at `profile.version`.

Direct validation precedence is fixed as follows: (1) plain non-array top-level object with exactly `version` and `profiles`; (2) exact profile-data version; (3) exact supported profile count, identities, uniqueness, and canonical order; then, for each profile in canonical order and each slot in canonical order, (4) exact profile-record and five-slot structure, slot identities, uniqueness, and order; (5) nonempty unique candidates in the owning closed vocabulary and exact accepted membership/order; (6) exact five-row Energy table structure and row order; (7) exact five-row Complexity table structure and row order; (8) every vector length aligned to candidate count; (9) every Energy value followed by every Complexity value in row and candidate order is a number, finite integer, safe integer, nonnegative, within `0..65,535`, and exactly the accepted literal; then (10) all 25 final vectors for that slot have safe exact sums, retain every candidate, have individual weights in `0..65,535`, and totals in `1..65,535`. Missing entries fail before extras, extras before duplicate/order/value mismatches within the owning phase. No malformed input is repaired or normalized. This local order does not alter the Stage 7C5 public precedence.

The canonical outer data set, profile and slot records, candidate tuples, row tuples, vectors, and all nested records/tuples are recursively frozen. Mutation attempts cannot change later reads. Validation and construction do not mutate caller input and are deterministic under repeated calls and ambient changes.

All Stage 7C7a6 data, types, validator, builder, `WeightedCandidate<T>` relationship, and error remain direct-module/internal. `src/music-domain/index.ts` does not expand, and callers cannot inject arbitrary profile tables, candidates, or vectors into generation.

Stage 7C7a6 does not construct or consume PRNG state or component seeds, call `selectWeightedCandidateV1`, select values, construct `ResolvedArpPlanV1`, map selected gates to `gateTicks`, expand octaves, execute masks, traverse pitches, project events, implement `generateArpEventsWithPolicyV1`, translate Stage 7C5 public errors, check profile/Harmony compatibility, orchestrate no-partial-output behavior, alter Stage 7B, resolve MIA-003/MIA-004, or add dependencies. The separately bounded Stage 7C7a7 implementation consumes its accepted output without changing that ownership.

### Stage 7C7a7 accepted policy-resolution runtime

Stage 7C7a7 implements only the direct-module `src/music-domain/arpeggiator-policy-resolver.ts` boundary. `resolveArpPlanV1(context, componentSeed)` consumes the exact canonical profile ID, Energy, Complexity, and already-derived Arpeggiator component seed. It initializes one Mulberry32 V1 stream and consumes exactly five chained uint32 outputs in rate, octave-range, direction, mask, then gate order, including single-candidate slots. Each decision obtains its ordered raw list from `buildArpWeightedCandidatesV1` and delegates selection to `selectWeightedCandidateV1`; it performs no normalization, sorting, candidate removal, per-field seeding, or duplicate selection arithmetic.

The resolver maps the selected semantic gate through `SHARED_ARP_POLICY_CONFIGURATION_V1.gateTicksByRate` and returns only the recursively frozen `rate`, `direction`, `gateTicks`, `octaveRange`, and `maskId` plan fields. It remains absent from `src/music-domain/index.ts`. It receives no raw public request or root seed and performs no public preflight, Harmony compatibility validation, mask execution, octave expansion, traversal, event projection, enclosing-operation orchestration, provenance, or Stage 7C5 public error translation. The implementation and its evidence are accepted and merged through PR #94 at approved head `133c7f6fecc2a78ea4278fb7b44921a2484a0c13` with merge commit `afbe3493841ef38a62eb961368a2f1147f008725`.

### Stage 7C7a8 resolved-plan projection

Stage 7C7a8 implements only the cohesive module-private `projectResolvedArpPlanV1(progression, range, plan)` projector: the already accepted upward octave expansion from Harmony-selected voicings, inclusive MIDI/range filtering, stable deduplication and ascending order, slot-local direction traversal, repeating mask/rest consumption, integer rate starts, and integer gate durations. It returns frozen `ArpEvent` values without mutating inputs, consuming PRNG or seeds, adding public APIs, validating raw requests, or owning public structured errors. Focused evidence proves octave/range/deduplication/order, all directions, mask repetition/reset/rest consumption, timing/gates, Stage 7B canonical-value compatibility for octave `1` plus `full`, immutability, and no duplicate traversal semantics. It is accepted and merged through PR #96 at approved head `43d251c4c95d39f60320ad90bd80522c514d721c` with merge commit `a14b6e100d00464e314309b45813943e6f81b83a`. The separately gated enclosing operation retains preflight, public no-partial-result/error translation, and provenance ownership.

### Stage 7C5 structured-error taxonomy and precedence

Stage 7C5 is documentation-only. It freezes the public `code` and `field` behavior needed by a future Stage 7C operation while retaining the existing Stage 7B `ArpValueError` convention: a structured failure exposes `code`, `field`, and a diagnostic message, with no captured invalid-value property. Code and field are stable API behavior. Message prose is diagnostic, must not contradict them, and is not a machine discriminator or replay value.

The exact Stage 7C public taxonomy is:

| Owning boundary | Code | Exact field | Invalid condition | Classification |
|---|---|---|---|---|
| normalized composition brief | `INVALID_ENERGY` | `intent.energy` | The normalized brief does not contain one exact `EnergyV1` identifier | caller-invalid canonical input |
| normalized composition brief | `INVALID_COMPLEXITY` | `intent.complexity` | The normalized brief does not contain one exact `ComplexityV1` identifier | caller-invalid canonical input |
| enclosing Arpeggiator policy request | `INVALID_ARP_PROFILE` | `profile.id` | Missing, non-string, unknown, wrong-case, or whitespace-varied profile ID | caller-invalid canonical input |
| enclosing Arpeggiator policy request | `UNSUPPORTED_ARP_PROFILE_VERSION` | `profile.version` | Missing, malformed, or unsupported Arpeggiator profile-data version | unsupported version |
| enclosing Arpeggiator policy request | `UNSUPPORTED_ARP_POLICY_VERSION` | `policy.version` | Missing, malformed, or unsupported Arpeggiator policy version | unsupported version |
| enclosing Arpeggiator policy request | `INCOMPATIBLE_ARP_PROFILE_POLICY` | `policy.version` | Both versions are individually supported but the profile-data/policy-version pair is not declared compatible | unsupported version combination |
| enclosing Arpeggiator policy request | `INCOMPATIBLE_ARP_PROFILE_CONTEXT` | `profile.id` | The valid active Stage 7C profile ID differs from the valid `HarmonyProgressionRealization.profile` identity | incompatible canonical generation context |
| enclosing generation lineage | `UNSUPPORTED_SEED_DERIVATION_VERSION` | `seedDerivation.version` | The requested component-seed derivation version is not the exact supported identity | unsupported version |
| enclosing generation lineage | `UNSUPPORTED_PRNG_VERSION` | `prng.version` | The requested Arpeggiator PRNG version is not the exact supported identity | unsupported version |
| component-seed derivation | `INVALID_ROOT_SEED` | `rootSeed` | The value is not a finite safe integer in canonical uint32 `0..0xffffffff` without coercion | caller-invalid canonical input |
| component-seed derivation | `INVALID_COMPONENT_ID` | `componentId` | The value is not one exact case-sensitive Stage 7C3 component ID | caller-invalid canonical input at the reusable derivation boundary |
| profile-policy preflight | `INVALID_ARP_POLICY_CONFIGURATION` | `profile.version` | A known profile version has an empty, duplicate, out-of-vocabulary, misordered, vector-length-mismatched, invalid-weight, zero-total, or overflowing candidate list in any decision slot | invalid persisted/versioned configuration |
| shared policy preflight | `INVALID_ARP_POLICY_CONFIGURATION` | `policy.version` | The shared decision schedule, weighted-choice identity/constraints, or semantic-gate mapping is missing, malformed, incompatible, non-integral, or outside Stage 7B4 bounds | invalid persisted/versioned configuration |

Raw creation-input omission of energy or complexity retains the Stage 7C-P1 `medium` default before normalization. At the normalized boundary consumed by generation, missing or explicit `undefined`, wrong-case or whitespace variants, unknown strings, numbers, booleans, `null`, arrays, and objects fail with the corresponding exact intent code and field; no Arpeggiator-specific duplicate code is added.

The Stage 7C operation does not accept caller-defined `octaveRange`, `maskId`, semantic `gateId`, candidate arrays, weights, component ID, or resolved plan. Those are produced or fixed by accepted versioned policy. Consequently, Stage 7C5 does not invent public `INVALID_ARP_OCTAVE_RANGE`, `INVALID_ARP_MASK`, or second semantic-gate caller codes. An invalid octave, mask, rate, direction, or semantic gate inside profile-owned candidate data fails pre-selection as `INVALID_ARP_POLICY_CONFIGURATION` at `profile.version`; an impossible shared gate/rate mapping fails at `policy.version`. If a value outside the already validated candidate data nevertheless appears after selection, that is an internal invariant failure, not caller-invalid input.

The generic Stage 7C2 weighted-choice mechanism remains an internal Nightdrive primitive rather than a direct composition API. Its empty/malformed list, weight, total, and uint32-output checks must be tested at that primitive boundary, but the Stage 7C operation validates owning candidate construction before invoking it and exposes malformed profile-owned or shared policy data only as `INVALID_ARP_POLICY_CONFIGURATION` with the owning version field above. It never leaks helper-specific error paths or performs selection after a failed preflight.

The reusable Stage 7C3 component-seed boundary validates `rootSeed` before `componentId`. The Stage 7C Arpeggiator operation fixes the component ID internally to exact `arpeggiator`, so `INVALID_COMPONENT_ID` is observable only to a direct caller of the reusable derivation boundary. A different or malformed internally supplied ID is an invariant failure. Root seed `0` and component ID `arpeggiator` remain valid; signed reinterpretation, trimming, case folding, aliases, and coercion remain prohibited.

The active Stage 7C profile and the validated Harmony realization describe one canonical generation lineage. Once the Harmony progression is valid, its embedded `profile` must equal the already validated `profile.id` exactly. No aliasing, substitution, closest-profile fallback, cross-profile policy reuse, case folding, or coercion is permitted. A mismatch fails as `INCOMPATIBLE_ARP_PROFILE_CONTEXT` at `profile.id`; it does not make the independently canonical Harmony realization an `INVALID_HARMONIC_CONTEXT`.

The accepted Stage 7C public operation has this complete normative precedence. Steps 1–14 are preflight and consume no PRNG output:

1. `intent.energy`;
2. `intent.complexity`;
3. `profile.id`;
4. `profile.version` support;
5. `policy.version` support;
6. profile-data/policy-version compatibility;
7. `seedDerivation.version`;
8. `prng.version`;
9. `rootSeed`;
10. all profile-owned candidate construction, in fixed rate, octave-range, direction, mask, then gate slot order;
11. shared policy schedule, weighted-choice constraints, and all nine semantic-gate mappings;
12. existing Arpeggiator range validation;
13. existing Harmony context/compatibility validation sufficient to establish canonical `progression.profile`;
14. exact equality of `profile.id` and `progression.profile`.

Only after all preflight succeeds may the operation derive the component seed and consume the exact five policy-stream outputs. It then validates the resolved values against the already validated candidate lists as an internal assertion, performs upward octave expansion and range filtering, and reports the first slot with no legal pitch as the existing whole-operation `NO_LEGAL_ARP_PITCH` at `progression.slots[i].voicing.midiPitches`, with no partial output. An impossible post-preflight selection, mask lookup, gate mapping, plan value, or timing result uses the repository's internal assertion/failure convention: it is not `ArpValueError`, has no public `code` or `field`, exposes no implementation detail as caller guidance, and produces no partial output.

This Stage 7C pipeline does not change direct Stage 7B calls. They skip all Stage 7C preflight and retain their exact accepted order: range; Harmony context/compatibility; whole-operation `NO_LEGAL_ARP_PITCH`; rate; direction; gate; internal timing invariant. Their existing codes, fields, omission/default behavior, messages, and values are unchanged. A valid Stage 7C resolved plan reaches projection only after its rate, direction, and integer gate were validated through profile/shared policy preflight, so a defensive projection failure in one of those derived values is internal rather than a second caller-facing error contract.

Representative mixed-invalid results are normative:

| Invalid together | Required first public failure |
|---|---|
| energy and complexity | `INVALID_ENERGY`, `intent.energy` |
| complexity and profile ID | `INVALID_COMPLEXITY`, `intent.complexity` |
| profile ID and profile version | `INVALID_ARP_PROFILE`, `profile.id` |
| profile version and policy version | `UNSUPPORTED_ARP_PROFILE_VERSION`, `profile.version` |
| policy version and incompatible supported pair | `UNSUPPORTED_ARP_POLICY_VERSION`, `policy.version` |
| incompatible supported pair and root seed | `INCOMPATIBLE_ARP_PROFILE_POLICY`, `policy.version` |
| root seed and malformed profile candidate data | `INVALID_ROOT_SEED`, `rootSeed` |
| malformed profile candidate data and range | `INVALID_ARP_POLICY_CONFIGURATION`, `profile.version` |
| valid policy preflight with invalid range and invalid Harmony | `INVALID_ARP_RANGE` at the existing exact range field |
| valid range with invalid Harmony and no legal pitch | `INVALID_HARMONIC_CONTEXT` at the existing exact progression field |
| invalid Harmony and an apparent profile mismatch | `INVALID_HARMONIC_CONTEXT` at the existing exact progression field; mismatch is not evaluated until Harmony is valid |
| valid Harmony profile mismatch and invalid root seed | `INVALID_ROOT_SEED`, `rootSeed` |
| profile mismatch and malformed profile-owned policy configuration | `INVALID_ARP_POLICY_CONFIGURATION`, `profile.version` |
| otherwise valid input with valid but unequal profile IDs | `INCOMPATIBLE_ARP_PROFILE_CONTEXT`, `profile.id` |
| direct component derivation with invalid root seed and component ID | `INVALID_ROOT_SEED`, `rootSeed` |
| direct Stage 7B call with invalid range and traversal parameters | the existing `INVALID_ARP_RANGE` field before rate/direction/gate |

Canonical generation never silently falls back to a different profile, profile-data version, policy version, seed-derivation version, or PRNG version. User-facing explanation may suggest supported or closest valid choices after a failure, but such guidance does not change the structured failure, retry automatically, coerce the request, or generate output.

The composition-brief schema/version owns `INVALID_ENERGY` and `INVALID_COMPLEXITY`; `nightdrive.seed-derivation.component.v1` owns root/component validation; the existing Stage 7B Arpeggiator API owns its established projection failures; and `nightdrive.arpeggiator-policy.v1` owns the Stage 7C resolver codes, fields, configuration translation, and complete Stage 7C precedence above. These are stable API semantics, not successful-generation canonical state. Changing a code, field, or precedence is a breaking change to its owning boundary and requires an appropriate versioned contract change, while message-only clarification that preserves code/field/meaning does not reinterpret replay.

### Stage 7C6 runtime interface contract

Stage 7C6 is documentation-only. It freezes one public enclosing Stage 7C Arpeggiator domain operation, one reusable cross-component seed primitive, and two module-private layers without changing the existing public `generateArpEvents(progression, range, parameters?)` operation:

```ts
export type ArpProfileDataVersionV1 = "nightdrive.genre-profile.arpeggiator.v1";
export type ArpPolicyVersionV1 = "nightdrive.arpeggiator-policy.v1";
export type ComponentSeedDerivationVersionV1 = "nightdrive.seed-derivation.component.v1";
export type ArpPrngVersionV1 = "nightdrive.prng.mulberry32.v1";
export type ArpOctaveRangeV1 = 1 | 2 | 3;
export type ComponentSeedComponentIdV1 =
  | "harmony"
  | "bass"
  | "arpeggiator"
  | "motif";

export type ComponentSeedErrorCode =
  | "INVALID_ROOT_SEED"
  | "INVALID_COMPONENT_ID";

export type ComponentSeedErrorField = "rootSeed" | "componentId";

export class ComponentSeedValueError extends RangeError {
  readonly code: ComponentSeedErrorCode;
  readonly field: ComponentSeedErrorField;
}

export type ArpPolicyGenerationRequestV1 = Readonly<{
  progression: HarmonyProgressionRealization;
  range: ArpRange;
  intent: Readonly<{
    energy: EnergyV1;
    complexity: ComplexityV1;
  }>;
  profile: Readonly<{
    id: HarmonyProfileId;
    version: ArpProfileDataVersionV1;
  }>;
  policy: Readonly<{
    version: ArpPolicyVersionV1;
  }>;
  seedDerivation: Readonly<{
    version: ComponentSeedDerivationVersionV1;
  }>;
  prng: Readonly<{
    version: ArpPrngVersionV1;
  }>;
  rootSeed: number;
}>;

export type ResolvedArpPlanV1 = Readonly<{
  rate: ArpRateId;
  direction: ArpDirectionId;
  gateTicks: DurationTicks;
  octaveRange: ArpOctaveRangeV1;
  maskId: ArpDensityMaskIdV1;
}>;

export type ArpPolicyGenerationResultV1 = Readonly<{
  plan: ResolvedArpPlanV1;
  events: readonly ArpEvent[];
}>;

export function deriveComponentSeedV1(
  rootSeed: number,
  componentId: ComponentSeedComponentIdV1,
): number;

export function generateArpEventsWithPolicyV1(
  request: ArpPolicyGenerationRequestV1,
): ArpPolicyGenerationResultV1;
```

These Nightdrive-owned request, plan, result, and operation types form the public Stage 7C Arpeggiator domain boundary. `deriveComponentSeedV1` is the separately reusable Stage 7C3 cross-component primitive: its `V1` name fixes `nightdrive.seed-derivation.component.v1`, it validates `rootSeed` before `componentId`, and its returned number is the canonical uint32 component seed. No suitable project-wide generic structured-error abstraction exists; consistent with the repository's boundary-specific `RangeError` subclasses, direct primitive validation throws neutral `ComponentSeedValueError` with only `INVALID_ROOT_SEED` at `rootSeed` or `INVALID_COMPONENT_ID` at `componentId`. It never throws `ArpValueError`, coerces input, reinterprets signed values, trims, folds case, or accepts aliases.

Every policy-request property shown is required; a missing or explicit `undefined` value is invalid at the Stage 7C5 field that owns it. The nested `intent`, `profile`, `policy`, `seedDerivation`, and `prng` objects make every accepted dotted field path exact and unambiguous. The only omission/default compatibility remains the separate two-argument Stage 7B call. The public Stage 7C operation receives the canonical composition root seed, fixes the component ID internally to exact `arpeggiator`, and itself validates `rootSeed` as Stage 7C5 preflight step 9, throwing `ArpValueError` with `INVALID_ROOT_SEED` at `rootSeed` on failure. It invokes `deriveComponentSeedV1` only after every preflight step succeeds. At that point a seed-primitive failure from the valid root seed and fixed valid component ID is an internal invariant failure rather than a second public Stage 7C error path. Callers neither supply nor receive the derived component seed.

`generateArpEventsWithPolicyV1` is the enclosing Stage 7C Arpeggiator domain operation, not the final aggregate composition-generator envelope. The future enclosing composition/generator layer continues to own aggregate provenance, warnings, result hashes, generator/schema versions, persistence, and serialization. The Stage 7C result remains exactly `plan` plus `events`; this interface does not assume aggregate persistence or move canonical lineage ownership into the Arpeggiator.

`ResolvedArpPlanV1` is public and inspectable only as the frozen `plan` member of `ArpPolicyGenerationResultV1`. It has no public constructor, independent resolver API, or accepted caller-input role. The enclosing operation returns it so deterministic decisions can be inspected and tested without duplicating them in `ArpEvent`; it remains a transient derived decision until an authorized aggregate generator/provenance schema decides how to retain it. The plan must not gain profile, version, root/component seed, raw PRNG output/state, candidate arrays, weights, cumulative arithmetic, Harmony, MIDI, UI, AI, persistence, or arbitrary provenance fields. `ArpPolicyGenerationResultV1`, its plan, its event array, and every event are recursively immutable/frozen, and no input or versioned configuration is mutated.

The policy resolver has exactly one module-private contract:

```ts
type ValidatedArpPolicyContextV1 = Readonly<{
  profileId: HarmonyProfileId;
  energy: EnergyV1;
  complexity: ComplexityV1;
}>;

function resolveArpPlanV1(
  context: ValidatedArpPolicyContextV1,
  componentSeed: number,
): ResolvedArpPlanV1;
```

The enclosing operation alone creates this module-private validated context after validating profile-owned and shared immutable configuration. The private resolver cannot be called with raw request data, does not receive range or Harmony, performs no caller-facing validation, and exposes no alternate public errors. It constructs the exact Stage 7C4 weighted lists from the validated profile, energy, and complexity, initializes one `nightdrive.prng.mulberry32.v1` stream from the already derived component seed, consumes exactly five outputs in rate, octave-range, direction, mask, then gate order, maps them through the accepted Stage 7C2 mechanism, resolves the semantic gate to integer ticks, and returns the frozen plan. Impossible selected values are internal assertions.

Canonical Stage 7C projection has exactly one module-private contract:

```ts
function projectResolvedArpPlanV1(
  progression: HarmonyProgressionRealization,
  range: ArpRange,
  plan: ResolvedArpPlanV1,
): readonly ArpEvent[];
```

It receives only the already validated progression/range and complete validated plan. It performs the accepted upward octave expansion, selected-voicing filtering/deduplication/order, direction traversal, mask application, rate starts, and gate durations. It must reuse or extract the existing private Stage 7B candidate/traversal/timing mechanics rather than require callers to translate the plan into `ArpTraversalParametersV1` or duplicate canonical semantics. Defensive invalid plan, mask lookup, or timing states are internal assertions; a valid plan with a first unsatisfied slot surfaces the existing whole-operation `NO_LEGAL_ARP_PITCH` through the enclosing public operation with no partial result.

`generateArpEventsWithPolicyV1` is the only callable that exposes the Stage 7C5 Arpeggiator request taxonomy and its complete public precedence. It performs steps 1–14 exactly as frozen above before deriving the component seed, constructing a PRNG, calling the resolver, or calling the projector. That single ownership prevents helper invocation from producing a different observable order. It may expose `INVALID_ENERGY`, `INVALID_COMPLEXITY`, `INVALID_ARP_PROFILE`, `UNSUPPORTED_ARP_PROFILE_VERSION`, `UNSUPPORTED_ARP_POLICY_VERSION`, `INCOMPATIBLE_ARP_PROFILE_POLICY`, `UNSUPPORTED_SEED_DERIVATION_VERSION`, `UNSUPPORTED_PRNG_VERSION`, `INVALID_ROOT_SEED`, both forms of `INVALID_ARP_POLICY_CONFIGURATION`, existing range/Harmony failures, `INCOMPATIBLE_ARP_PROFILE_CONTEXT`, and post-resolution `NO_LEGAL_ARP_PITCH`; each is an `ArpValueError`, and no failure returns a partial plan or events. Direct `deriveComponentSeedV1` instead exposes `ComponentSeedValueError` with `INVALID_ROOT_SEED` and `INVALID_COMPONENT_ID` in that order. The enclosing operation fixes a valid component ID and validates root seed before invoking the primitive, so neither primitive error is an ordinary observable Stage 7C operation result. The module-private resolver and projector expose no public structured-error surface.

Version input is explicit only where replay may select or reject a supported identity: profile-data version, Arpeggiator policy version, component-seed derivation version, and PRNG version are required request fields. The normalized composition-brief schema version remains owned and validated upstream and is not redundantly repeated because this boundary consumes only its canonical energy/complexity values. `nightdrive.weighted-choice.uint32-modulo.v1` and `nightdrive.arp-density-mask.v1` are fixed module-owned identities selected by `nightdrive.arpeggiator-policy.v1`, not redundant caller fields; malformed shared configuration maps to `policy.version`. The component identity is fixed internally to `arpeggiator`. No database, serialization, UI, AI/provider, MIDI, framework, network, clock, locale, ambient randomness, hidden global, or discovery/object-order input crosses any Stage 7C6 interface.

The exact request and result are new Stage 7C interfaces. Existing Stage 7B exports, signatures, default/explicit-`undefined` behavior, values, validation precedence, errors, and event semantics remain source-compatible and unchanged. A Stage 7C plan with octave range `1`, mask `full`, and Stage 7B-compatible rate/direction/full-step gate must project canonical-value-equivalent Stage 7B events.

### Stage 7 successor compatibility and R1 dataset-only acceptance

The accepted successor architecture in [ADR-019](DECISIONS.md) was merged through PR #109. It pairs a new immutable profile-data identity, `nightdrive.genre-profile.arpeggiator.v2` (`ARP_PROFILE_DATA_VERSION_V2` naming direction), with a new policy/compatibility identity, `nightdrive.arpeggiator-policy.v2` (`ARP_POLICY_VERSION_V2` naming direction). These identities are implemented and accepted through PR #131; they do not denote a new selection algorithm. The exact numerical R1 dataset is [accepted separately](reviews/STAGE7_ARPEGGIATOR_V2_CALIBRATION.md) for dataset-only use at fingerprint `b6f7ee16f33cf649ae2c6f06e4b5eecf859409b1917e2bc641323857fc1956e8`. The complete public V1 contract, literal V1 data, and `generateArpEventsWithPolicyV1` remain unchanged and authoritative. In particular, the V1 operation must not accept profile-data V2.

| Explicit policy identity | Explicit profile-data identity | Initial successor compatibility |
|---|---|---|
| `nightdrive.arpeggiator-policy.v1` | `nightdrive.genre-profile.arpeggiator.v1` | Supported; historical V1 pair |
| `nightdrive.arpeggiator-policy.v1` | `nightdrive.genre-profile.arpeggiator.v2` | Unsupported |
| `nightdrive.arpeggiator-policy.v2` | `nightdrive.genre-profile.arpeggiator.v1` | Unsupported |
| `nightdrive.arpeggiator-policy.v2` | `nightdrive.genre-profile.arpeggiator.v2` | Supported; public V2 runtime accepted through PR #131 |

The public enclosing operation owns rejection of an incompatible requested pair before component-seed derivation or selection. V1 retains its exact supported-version checks, structured errors, fields, and precedence. There is no implicit fallback, coercion, `latest` alias, or conversion of persisted V1 requests. [ADR-020](DECISIONS.md) accepts operation-local V2 version support and the additional-property rule; the accepted V2 public request/result/error contract is defined below and was merged through PR #111 at approved head `f505dc7c14dc83b50c800986d883f7fe5d5da704` with merge commit `b3a42464ea44450bb017a1c65dd316d0d069c191`. No internal refactor or public helper exposure is authorized by this contract.

Policy V2 denotes the new compatibility lineage, **not** a changed selection algorithm. The first successor retains the five exact slots and order `rate → octave-range → direction → mask → gate`, one Mulberry32 V1 stream, and exactly one uint32 draw per slot, including single-candidate slots. It retains the component-seed derivation V1 contract, `nightdrive.weighted-choice.uint32-modulo.v1` modulo arithmetic and half-open intervals, the existing candidate domains and per-profile candidate subset/order, the nine semantic gate mappings, and the V1 density-mask catalog and semantics. There are no conditional draws, redraws, rejection sampling, cross-slot coupling, or new musical dimensions. For the same canonical root seed and fixed `arpeggiator` component ID, unchanged seed derivation yields the same component seed across the two policy/profile pairs; any selected-plan differences arise from versioned profile data. No separate algorithm identity or runtime abstraction is introduced.

The R1 candidate changes only profile-owned Energy weights and Complexity additions on existing slots. Its exact construction has no third base-weight array. It retains strict bounded nonnegative safe-integer source values, Stage 7C2 final candidate weight `0..65,535` and total `1..65,535` limits, no normalization or sorting, and immutable declared data. R1's derived final weights are `1..14` and totals `1..27`; the V1 literal `1..10` final weights and `1..20` totals remain V1-specific facts. Literal R1 validation must check exact content and structure, not only ranges. Every profile/slot keeps its V1 candidate subset and declaration order. Changing either later is deferred to a separately justified contract decision; this checkpoint does not resolve broader candidate-order ownership wording.

#### Accepted V2 internal profile-configuration contract — PR #116

The accepted clarification was merged through PR #116 at approved head `84fccb2624f020f3b814309328ef12b61e6a48a5` with merge commit `a43040cc69a04ec93275298c77cca02cf3a815be`. The accepted V2 direct-module validator/builder reuses the existing `ArpGenreProfileConfigurationError` class unchanged: it remains a `RangeError` with `owner: "profile.version"`, the existing `ArpGenreProfileConfigurationFailureKindV1` vocabulary, diagnostic message semantics, and no arbitrary invalid-payload capture. The reused kinds are `INVALID_CONFIGURATION_SHAPE`, `INVALID_PROFILE_DATA_VERSION`, `INVALID_PROFILE_SET`, `INVALID_SLOT_STRUCTURE`, `INVALID_CANDIDATES`, `INVALID_ENERGY_TABLE`, `INVALID_COMPLEXITY_TABLE`, `INVALID_VECTOR_ALIGNMENT`, `INVALID_WEIGHT`, and `INVALID_FINAL_WEIGHTS`. This is reuse of an internal error vocabulary, not V1 profile-data compatibility, a second V2 error class, renamed kinds, shared error-framework work, or public-barrel exposure.

The V2 validator targets only `nightdrive.genre-profile.arpeggiator.v2` and the exact accepted R1 payload at fingerprint `b6f7ee16f33cf649ae2c6f06e4b5eecf859409b1917e2bc641323857fc1956e8`. It does not call the V1 validator on V2 data, cast V2 data to a V1 configuration, or broaden V1 validation; V1 remains V1-only and unchanged.

V2 adopts the accepted Stage 7C7a6 nested validation order, substituting only the expected V2 identity and literal R1 data: (1) exact plain non-array top-level shape; (2) exact V2 identity; (3) exact profile count, identities, uniqueness, and canonical order; (4) exact profile-record and five-slot structure, identities, and order; (5) exact nonempty candidate membership, types, uniqueness, and order; (6) exact five-row Energy structure and row order; (7) exact five-row Complexity structure and row order; (8) candidate-aligned vector lengths; (9) source-number validation and exact R1 literal equality; and (10) safe final-vector construction and accepted bounds. This remains nested—not ten global data-set sweeps: after top-level/version/profile-set checks, profiles are visited in canonical order, each profile's slot structure is validated, then slots are visited in canonical order using the existing within-slot phase sequence. Missing entries precede extras; structural/value ordering and required Energy-before-Complexity checks are unchanged. Source and final individual weights remain bounded `0..65,535` as applicable; final totals remain `1..65,535`. Exact R1 literals additionally establish positive final weights, observed `1..14` final weights, and observed `1..27` totals. Range checks never substitute for literal equality.

The configuration error remains direct-module/internal. The public V2 operation accepted through PR #131 translates a profile-owned configuration failure to `ArpValueError` `INVALID_ARP_POLICY_CONFIGURATION` at `profile.version`; Slice 1 does not implement that translation, expose kinds/messages as public discriminators, or change the public V2 fourteen-step preflight. Public request additional-property tolerance does not apply to strict internal versioned configuration. Unrelated programmer and lookup invariants remain internal rather than new caller failures. This adoption is fixed to the currently accepted vocabulary/order and does not automatically inherit a future V1 or shared-contract change.

V2 consumes the same complete five-field resolved plan through the existing projector semantics: Harmony-selected pitches, upward octave expansion, inclusive MIDI/range filtering, stable deduplication, direction cycles and slot reset, four-step density-mask reset and rest traversal consumption, rate starts, gate durations, and unchanged three-field `ArpEvent`. The five rare Midtempo projection collapses in the accepted diagnostic are not projector defects and are not corrected here. No aggregate provenance, MIDI, UI, AI, or persistence ownership moves into this operation; no dependency or infrastructure change is introduced.

Historical V1 requests, plans, ArpEvents, and baseline/evaluation artifacts retain their original explicit identities and exact replay behavior. V2 requires its own deterministic fixtures/vectors and must never reinterpret V1 evidence. The exact four-profile R1 dataset is accepted for dataset-only use in the linked calibration record; it is implemented through PR #131 and current R1/V2 behavior is Product Owner accepted under the [partial-evaluation override](reviews/STAGE7_ARPEGGIATOR_EVALUATION_RESULTS.md#product-owner-r1v2-acceptance-and-comparison-override), not a completed matched-protocol claim. Arithmetic, hash, structure, and permitted-delta evidence were independently verified, while collision totals are now reproduced by the accepted retained diagnostic; historical search/finalist chronology remains unreproduced. The diagnostic reproducibility gate and public V2 runtime are accepted. Runtime evidence obligations remain literal R1 data, V1 regression and version isolation, all 500 profile/slot/intent lists, operation-local version rejection, five-draw replay and seed sensitivity, no ambient randomness, and reproduced candidate diagnostics. The remaining full matched-comparison prerequisite is waived for current R1 acceptance; only 35 fixtures were assessed, 245 were not, Pass 1 was not completed/locked, and Pass 2 was not executed. No numeric human acceptance threshold is set here. Stage 7 remains open; Stage 8 is not authorized.

### Accepted Stage 7 V2 public Arpeggiator operation — merged through PR #111

This is the exact accepted domain interface for the first V2 successor. [ADR-019](DECISIONS.md) accepts a separate operation and unchanged musical machinery; [ADR-020](DECISIONS.md) accepts operation-local version support and the limited additional-property policy. The complete interface, taxonomy, and precedence in this section were accepted and merged through PR #111. Nothing in this section implements V2, changes the accepted V1 operation, or authorizes runtime or musical acceptance.

```ts
export const ARP_PROFILE_DATA_VERSION_V2 = "nightdrive.genre-profile.arpeggiator.v2";
export type ArpProfileDataVersionV2 = typeof ARP_PROFILE_DATA_VERSION_V2;
export const ARP_POLICY_VERSION_V2 = "nightdrive.arpeggiator-policy.v2";
export type ArpPolicyVersionV2 = typeof ARP_POLICY_VERSION_V2;

export type ArpPolicyGenerationRequestV2 = Readonly<{
  progression: HarmonyProgressionRealization;
  range: ArpRange;
  intent: Readonly<{ energy: EnergyV1; complexity: ComplexityV1 }>;
  profile: Readonly<{ id: HarmonyProfileId; version: ArpProfileDataVersionV2 }>;
  policy: Readonly<{ version: ArpPolicyVersionV2 }>;
  seedDerivation: Readonly<{ version: ComponentSeedDerivationVersionV1 }>;
  prng: Readonly<{ version: ArpPrngVersionV1 }>;
  rootSeed: number;
}>;

export type ArpPolicyGenerationResultV2 = Readonly<{
  plan: ResolvedArpPlanV1;
  events: readonly ArpEvent[];
}>;

export function generateArpEventsWithPolicyV2(
  request: ArpPolicyGenerationRequestV2,
): ArpPolicyGenerationResultV2;
```

These are the only accepted new public operation, types, and identity constants. The V2 boundary reuses the accepted `HarmonyProgressionRealization`, `ArpRange`, `EnergyV1`, `ComplexityV1`, `HarmonyProfileId`, `ComponentSeedDerivationVersionV1`, `ArpPrngVersionV1`, five-field `ResolvedArpPlanV1`, and three-field `ArpEvent` types; unchanged primitives do not acquire artificial V2 names. The public barrel exposes the accepted V2 operation, request/result types, V2 version types/constants, and the already public reused types through PR #131. No public generic dispatcher, resolver, projector, plan constructor, arbitrary configuration injection, or new musical primitive is included.

Every displayed request property is required; there are no optional fields or defaults at this normalized generation boundary. `intent.energy` and `intent.complexity` are independent exact members of `very-low | low | medium | high | very-high`; the upstream raw creation-input `medium` default does not apply. `profile.id` is exactly one of `dark-synthwave | classic-synthwave | darkwave | midtempo-cyberpunk`, and after Harmony validation it must equal `progression.profile`. `profile.version` and `policy.version` must be their exact V2 identities above. `seedDerivation.version` remains exactly `nightdrive.seed-derivation.component.v1`; `prng.version` remains exactly `nightdrive.prng.mulberry32.v1`. `rootSeed` is a finite safe integer in the inclusive uint32 range `0..0xffffffff`, with no coercion. `range` retains the existing inclusive `ArpRange` contract: canonical integer MIDI pitches `0..127` at `minMidiPitch` and `maxMidiPitch`, with minimum no greater than maximum. `progression` retains the existing independently validated canonical eight-bar Harmony realization, including its own profile, template, key, ordered slots, Chords, inversions, and selected voicings. Missing, explicit `undefined`, malformed wrapper/value, wrong-case, whitespace-varied, and unsupported values fail through the first owning validation field below; no trimming, parsing, substitution, version inference, or repair occurs.

At this V2 operation boundary only, additional properties on the top-level request or its `intent`, `profile`, `policy`, `seedDerivation`, or `prng` wrapper are ignored. They are neither rejection reasons nor generation inputs, are not copied to the result, and cannot change the plan, events, version routing, internal policy choice, or error precedence. This includes attempted extra `weights`, candidate arrays, `componentSeed`, `componentId`, `maskId`, or `plan`. An extra never substitutes for a missing required property. The public request type has no arbitrary-data bag. This rule does not change the validation or unknown-property handling of `progression`, `range`, internal versioned configuration, or any other API; it does not retroactively specify V1 behavior.

For this operation, individual version support is local: only profile-data V2 passes `profile.version`, and only policy V2 passes `policy.version`. The support checks run in that order, after intent and profile-ID validation. A version accepted by V1 is not individually supported by V2. The compatibility check still follows both support checks and precedes seed-version validation; `INCOMPATIBLE_ARP_PROFILE_POLICY` means two individually supported versions form an undeclared pair. With the initial single supported version at each field, the V2/V2 pair is declared compatible and no caller-supplied pair can currently reach that error. Do not widen support to make it reachable.

| Requested profile version | Requested policy version | First V2 version outcome, assuming earlier fields valid |
|---|---|---|
| V2 | V2 | Continue through compatibility and remaining preflight |
| V1 | V2 | `UNSUPPORTED_ARP_PROFILE_VERSION` at `profile.version` |
| V2 | V1 | `UNSUPPORTED_ARP_POLICY_VERSION` at `policy.version` |
| V1 | V1 | `UNSUPPORTED_ARP_PROFILE_VERSION` at `profile.version` |

Any missing, malformed, or other unsupported profile version fails at `profile.version` regardless of policy input; only an exact V2 profile version allows the policy check, where any missing, malformed, or other unsupported policy version fails at `policy.version`. No V1/V2 pair becomes a compatibility error, and there is no fallback, alias, automatic dispatch, or migration. `generateArpEventsWithPolicyV1` continues to accept only its V1 pair with its existing codes, fields, order, values, and replay meaning; a V2 request never silently runs through V1. Historical locked V1 evidence is not regenerated or reinterpreted by V2.

All ordinary public V2 failures use the existing `ArpValueError extends RangeError` convention: stable `code` and exact `field`, plus diagnostic message prose that is not a machine discriminator or replay value. No invalid-value capture or new V2 error class is included. The complete V2 code/field ownership is:

| Code | Exact `field` | Meaning |
|---|---|---|
| `INVALID_ENERGY` | `intent.energy` | Missing or noncanonical normalized Energy |
| `INVALID_COMPLEXITY` | `intent.complexity` | Missing or noncanonical normalized Complexity |
| `INVALID_ARP_PROFILE` | `profile.id` | Missing or noncanonical profile ID |
| `UNSUPPORTED_ARP_PROFILE_VERSION` | `profile.version` | Anything other than exact V2 profile-data identity |
| `UNSUPPORTED_ARP_POLICY_VERSION` | `policy.version` | Anything other than exact V2 policy identity, after valid profile version |
| `INCOMPATIBLE_ARP_PROFILE_POLICY` | `policy.version` | Both versions individually supported but undeclared as a pair; unreachable from initial caller-supplied V2 versions |
| `UNSUPPORTED_SEED_DERIVATION_VERSION` | `seedDerivation.version` | Anything other than the retained exact component-seed V1 identity |
| `UNSUPPORTED_PRNG_VERSION` | `prng.version` | Anything other than the retained exact Mulberry32 V1 identity |
| `INVALID_ROOT_SEED` | `rootSeed` | Not a canonical uint32 finite safe integer |
| `INVALID_ARP_POLICY_CONFIGURATION` | `profile.version` | Malformed versioned profile-owned data or candidate construction in any accepted slot |
| `INVALID_ARP_POLICY_CONFIGURATION` | `policy.version` | Malformed shared policy schedule, selector constraints, catalog identity, domain, or gate mapping |
| `INVALID_ARP_RANGE` | `range`, `range.minMidiPitch`, or `range.maxMidiPitch` as determined by the existing ordered `createArpRange` validation | Existing malformed/reversed range behavior unchanged |
| `INVALID_HARMONIC_CONTEXT` | The exact first existing `progression` field reported by accepted Harmony/Arpeggiator validation | Existing malformed/incompatible Harmony behavior unchanged; never used for a valid profile mismatch |
| `INCOMPATIBLE_ARP_PROFILE_CONTEXT` | `profile.id` | Valid profile ID differs from independently validated `progression.profile` |
| `NO_LEGAL_ARP_PITCH` | `progression.slots[i].voicing.midiPitches` for the first unsatisfied slot | Valid resolved plan has no legal expanded pitch there; complete operation fails |

Existing range field selection is exact: a malformed range wrapper or reversed bounds reports `range`; an invalid minimum reports `range.minMidiPitch` before an invalid maximum at `range.maxMidiPitch`. Harmony's existing ordered validation and exact fields remain authoritative: `progression`, `progression.profile`, `progression.templateId`, `progression.templateVersion`, `progression.key`, `progression.key.scale`, `progression.slots`, and, for the first invalid zero-based slot `i`, `progression.slots[i]`, `progression.slots[i].index`, `progression.slots[i].degree`, `progression.slots[i].chord`, `progression.slots[i].inversion`, or `progression.slots[i].voicing` as owned by the existing validator. Step 13 checks Harmony validity independently of resolved Arpeggiator pitch eligibility; only post-resolution projection can report `NO_LEGAL_ARP_PITCH`. This V2 contract adds no alternate Harmony validator, duplicate field mapping, or new caller error for resolved octave, mask, semantic gate, component ID, or timing. Direct `deriveComponentSeedV1` retains its independent `ComponentSeedValueError` contract; a failure after valid root-seed preflight and internally fixed `arpeggiator` component ID is an impossible internal invariant, not an ordinary V2 public failure. Profile-owned and shared configuration failures translate only to the respective `INVALID_ARP_POLICY_CONFIGURATION` owner field; internal helper error kinds/messages are not exposed as public machine semantics. Unrelated programmer failures and impossible selected values remain internal assertions without public `code`/`field` or partial result.

The complete normative V2 preflight order is below. Every step must succeed before deriving a component seed, creating/consuming PRNG state, calling policy resolution, or projecting events:

1. Validate `intent.energy`.
2. Validate `intent.complexity`.
3. Validate `profile.id`.
4. Validate exact V2 `profile.version` support.
5. Validate exact V2 `policy.version` support.
6. Check declared profile/policy compatibility; the initial caller-unreachable limitation above applies.
7. Validate `seedDerivation.version`.
8. Validate `prng.version`.
9. Validate `rootSeed`.
10. Validate all profile-owned configuration and construct candidate lists in `rate → octave-range → direction → mask → gate` order.
11. Validate shared policy decision schedule, weighted-choice identity/constraints, density-mask identity, octave/gate domains, and all nine semantic gate mappings.
12. Validate `range` using the existing Arpeggiator range boundary.
13. Validate `progression` through the existing Harmony context/compatibility boundary, establishing canonical `progression.profile`.
14. Compare validated `profile.id` and `progression.profile` exactly.

Thus an earlier invalid intent or profile ID wins over either version defect; invalid profile version wins over invalid policy version; invalid root seed wins over malformed configuration; profile configuration wins over shared configuration and range; invalid range wins over Harmony; invalid Harmony wins over a merely apparent profile mismatch; and only after valid Harmony can a real mismatch fail at `profile.id`. Additional properties introduce no phase and cannot change these outcomes. Only after all 14 steps pass does the fixed `arpeggiator` component-seed handoff occur. The accepted resolver uses one Mulberry32 V1 stream and exactly five ordered outputs, one per slot even for a singleton candidate, with the unchanged weighted-choice and gate mappings. Projection retains Harmony-selected pitch ownership, upward octave expansion, inclusive range filtering, stable deduplication/ascending pitch order, exact direction traversal and slot reset, four-step mask reset with rests consuming time and traversal, integer rate starts, and gate-only duration control. Event order is ascending `startTick`, at most one event per rate step, with no partial or out-of-slot event. Equal complete inputs and versions replay to canonical-value-equivalent plan/events without ambient randomness, clock, locale, network, database, AI, or discovery/object-order dependence.

The successful result has exactly `{ plan, events }`. `plan` has exactly `rate`, `direction`, `gateTicks`, `octaveRange`, and `maskId` with the accepted V1 domains; `events` contains unchanged `{ pitch, startTick, durationTicks }` ArpEvents in canonical order. The result object, plan, event array, and every event are frozen; request, progression, range, intent, and versioned configuration are not mutated. A public or internal failure returns no result, plan, partial events, or warning. The plan remains a transient inspectable policy decision, not a caller input or independent public constructor. This boundary neither accepts nor returns candidate arrays, weights, component seed, PRNG values/state, hashes, warnings, profile/version fields on the plan, aggregate provenance, MIDI, UI, persistence, or serialized composition state. Normalized composition-brief schema ownership remains upstream; aggregate generator/schema versions, immutable generation lineage, canonical serialization, persistence, and result hashes remain with a later enclosing composition/generator layer. The R1 research JSON fingerprint is not a serialization format for the V2 operation. No new output serialization or migration rule is introduced here.

### Component-seed derivation contract

Stage 7C3 defines and accepts `nightdrive.seed-derivation.component.v1` as the exact versioned identity for a pure, deterministic, synchronous, framework-independent function from one canonical root seed and one supported component ID to one canonical component seed. This version owns the closed component vocabulary, input validation semantics, domain tag and delimiter, byte encoding and concatenation order, hash variant and initialization, every arithmetic operation, and unsigned output extraction specified below. It performs no I/O and uses no ambient randomness, mutable shared stream, locale behavior, object iteration order, or platform-native integer serialization.

The canonical root seed is a mathematical unsigned 32-bit integer in the inclusive domain `0..0xffffffff` (`0..4,294,967,295`). Zero is valid. The public contract does not reinterpret signed integers or coerce strings, `bigint`, floats, negative numbers, non-finite numbers, or other values into that domain.

The closed, case-sensitive V1 component-ID vocabulary is exactly:

- `harmony`
- `bass`
- `arpeggiator`
- `motif`

No aliasing, trimming, case folding, or Unicode normalization occurs. Unsupported IDs, wrong-case spellings, whitespace variants, and non-string values are invalid. Adding or changing an identifier is not a silent extension of this V1 vocabulary.

#### Canonical input bytes and domain separation

The exact byte sequence supplied to the hash is:

```text
UTF8("nightdrive.seed-derivation.component.v1")
|| 0x00
|| uint32LE(rootSeed)
|| uint8(componentIdByteLength)
|| UTF8(componentId)
```

The fixed domain tag contains exactly 39 ASCII characters, encoded as their identical 39 UTF-8 bytes. Its hexadecimal representation is:

```text
6e6967687464726976652e736565642d64657269766174696f6e2e636f6d706f6e656e742e7631
```

Exactly one `00` delimiter follows that tag. The root seed then occupies exactly four bytes in little-endian order. The component identifier is UTF-8 encoded; its byte count is encoded immediately before it as exactly one unsigned byte. The four accepted identifiers have lengths `07`, `04`, `0b`, and `05`, respectively. There is no byte-order mark, trailing NUL, platform-native representation, JSON representation, additional separator, or additional length prefix.

The fixed tag and delimiter make the hash input specific to this derivation/version rather than an unlabelled byte sequence that another future hash use might interpret differently. The component length makes the final field boundary explicit even though the accepted ASCII identifiers are already distinct.

#### Exact MurmurHash3 x86_32 algorithm

Hash the complete canonical byte sequence with MurmurHash3 x86_32 initialized with hash seed `0`. All values and intermediate results are unsigned 32-bit bit patterns; additions and multiplications discard all but the low 32 bits. `rotl32(x, r)` is `((x << r) | (x >>> (32 - r))) >>> 0`. JavaScript/TypeScript implementations use `Math.imul` for every multiplication; other runtimes must use equivalent low-32-bit multiplication. Every right shift below is unsigned.

1. Set `h = 0`, `c1 = 0xcc9e2d51`, and `c2 = 0x1b873593`.
2. Process complete four-byte blocks in increasing byte-offset order. Decode each block little-endian as `k = b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)`, coerced to uint32.
3. For each block, perform exactly:

   ```text
   k = low32(k * 0xcc9e2d51)
   k = rotl32(k, 15)
   k = low32(k * 0x1b873593)
   h = h XOR k
   h = rotl32(h, 13)
   h = low32(low32(h * 5) + 0xe6546b64)
   ```

4. Build one tail `k = 0` from the remaining zero to three bytes in their original order. For three remaining bytes, XOR `b2 << 16`; for two or more, XOR `b1 << 8`; for one or more, XOR `b0`. If at least one tail byte exists, perform exactly the same `c1`, rotate-left-15, and `c2` mix shown above, then set `h = h XOR k`. Do not apply the per-block rotate-left-13/add step to the tail.
5. XOR `h` with the total byte length of the complete canonical input and finalize exactly:

   ```text
   h = h XOR (h >>> 16)
   h = low32(h * 0x85ebca6b)
   h = h XOR (h >>> 13)
   h = low32(h * 0xc2b2ae35)
   h = h XOR (h >>> 16)
   ```

6. Extract `h >>> 0` as the canonical result.

No floating-point multiplication, signed right shift, locale operation, or implementation-defined overflow may affect the result. JavaScript's bitwise signed views are incidental only; `Math.imul`, explicit unsigned shifts, and `>>> 0` preserve the specified bit patterns.

#### Output and isolation semantics

The output is one canonical uint32 in `0..0xffffffff`. Every output, including zero, is valid. A zero result is not retried, remapped, rehashed, or passed through a hidden PRNG step. This derivation does not alter `nightdrive.prng.mulberry32.v1`; the Arpeggiator later initializes its one accepted component stream with the derived Arpeggiator seed.

Each child seed is a direct pure function of only the root seed, this derivation version, and the stable component ID. It never depends on component discovery/order or on PRNG consumption by Harmony, Bass, motif, or Arpeggiator. Consequently, changing Harmony or Bass consumption cannot alter the Arpeggiator seed. Adding a future component cannot alter existing V1 outputs; supporting a new identifier requires an appropriate new derivation version rather than mutating the closed V1 vocabulary.

#### Normative golden vectors

Every conforming implementation must reproduce the exact canonical input bytes and result for all 16 vectors below.

| Root decimal | Root hex | Component ID | Canonical input bytes (hex) | Result decimal | Result hex |
| ---: | ---: | --- | --- | ---: | ---: |
| `0` | `0x00000000` | `harmony` | `6e6967687464726976652e736565642d64657269766174696f6e2e636f6d706f6e656e742e76310000000000076861726d6f6e79` | `622364116` | `0x251885d4` |
| `0` | `0x00000000` | `bass` | `6e6967687464726976652e736565642d64657269766174696f6e2e636f6d706f6e656e742e763100000000000462617373` | `3844702028` | `0xe5297f4c` |
| `0` | `0x00000000` | `arpeggiator` | `6e6967687464726976652e736565642d64657269766174696f6e2e636f6d706f6e656e742e763100000000000b6172706567676961746f72` | `2011937067` | `0x77ebb92b` |
| `0` | `0x00000000` | `motif` | `6e6967687464726976652e736565642d64657269766174696f6e2e636f6d706f6e656e742e76310000000000056d6f746966` | `3256624460` | `0xc21c254c` |
| `1` | `0x00000001` | `harmony` | `6e6967687464726976652e736565642d64657269766174696f6e2e636f6d706f6e656e742e76310001000000076861726d6f6e79` | `2090515199` | `0x7c9abaff` |
| `1` | `0x00000001` | `bass` | `6e6967687464726976652e736565642d64657269766174696f6e2e636f6d706f6e656e742e763100010000000462617373` | `4258129003` | `0xfdcde46b` |
| `1` | `0x00000001` | `arpeggiator` | `6e6967687464726976652e736565642d64657269766174696f6e2e636f6d706f6e656e742e763100010000000b6172706567676961746f72` | `2926668988` | `0xae716cbc` |
| `1` | `0x00000001` | `motif` | `6e6967687464726976652e736565642d64657269766174696f6e2e636f6d706f6e656e742e76310001000000056d6f746966` | `3484630024` | `0xcfb33c08` |
| `4294967295` | `0xffffffff` | `harmony` | `6e6967687464726976652e736565642d64657269766174696f6e2e636f6d706f6e656e742e763100ffffffff076861726d6f6e79` | `1380703219` | `0x524bdbf3` |
| `4294967295` | `0xffffffff` | `bass` | `6e6967687464726976652e736565642d64657269766174696f6e2e636f6d706f6e656e742e763100ffffffff0462617373` | `1905880034` | `0x71996be2` |
| `4294967295` | `0xffffffff` | `arpeggiator` | `6e6967687464726976652e736565642d64657269766174696f6e2e636f6d706f6e656e742e763100ffffffff0b6172706567676961746f72` | `561390553` | `0x217623d9` |
| `4294967295` | `0xffffffff` | `motif` | `6e6967687464726976652e736565642d64657269766174696f6e2e636f6d706f6e656e742e763100ffffffff056d6f746966` | `1158484109` | `0x450d108d` |
| `305419896` | `0x12345678` | `harmony` | `6e6967687464726976652e736565642d64657269766174696f6e2e636f6d706f6e656e742e76310078563412076861726d6f6e79` | `4067537834` | `0xf271b3aa` |
| `305419896` | `0x12345678` | `bass` | `6e6967687464726976652e736565642d64657269766174696f6e2e636f6d706f6e656e742e763100785634120462617373` | `1025326744` | `0x3d1d3e98` |
| `305419896` | `0x12345678` | `arpeggiator` | `6e6967687464726976652e736565642d64657269766174696f6e2e636f6d706f6e656e742e763100785634120b6172706567676961746f72` | `3753044731` | `0xdfb2eafb` |
| `305419896` | `0x12345678` | `motif` | `6e6967687464726976652e736565642d64657269766174696f6e2e636f6d706f6e656e742e76310078563412056d6f746966` | `2373523338` | `0x8d79178a` |

Equivalent implementations in JavaScript/TypeScript and any later supported native or DSP runtime must reproduce these vectors byte-for-byte and bit-for-bit. Implementations must model modulo-`2^32` arithmetic explicitly; language-specific signed 32-bit display or wider-integer arithmetic must not change the canonical unsigned result.

Changing the component-vocabulary semantics, byte order, encoding, domain tag or delimiter, field lengths/order, hash algorithm or variant, constants, operation order, initialization, tail handling, finalization, or unsigned output extraction requires a new derivation version. Historical outputs retain their original version semantics and must never be silently reinterpreted.

Future runtime validation must reject malformed root seeds and unsupported, wrong-case, whitespace-varied, or non-string component IDs exactly as described above. Stage 7C5 freezes `INVALID_ROOT_SEED` at `rootSeed`, `INVALID_COMPONENT_ID` at `componentId`, and root-before-component precedence for the reusable derivation boundary.

No dependency is justified. This is small, replay-critical Nightdrive infrastructure whose exact historical behavior must remain locally auditable and under Nightdrive ownership. A third-party hashing package would add authority, lifecycle, and replacement risk without meaningful value over the specified in-repository operations.

### Provenance and version boundaries

The accepted [Stage 7 aggregate contract](COMPOSITION_ENGINE.md#stage-7-aggregate-generation-contract) owns the enclosing supplied-Harmony/Arp record, normalization, root lineage, canonical JSON and hashes under ADR-022. It neither generates Harmony nor changes these V1/V2 domain operations. Aggregate runtime and pinned-Node AC-004 evidence are accepted through PRs #155 and #169; browser audition does not authorize browser canonical generation.

Canonical generation lineage retains the root seed, seed-derivation version, PRNG version, Arpeggiator policy version, genre-profile ID/version, generator/engine/schema versions, normalized inputs, parent lineage, and canonical hashes already required by ADR-010 and ADR-014. Component child seeds, PRNG internal state, raw outputs, cumulative-weight calculations, temporary candidate arrays, and resolved intermediates are derived/transient values and need not be persisted as canonical composition state.

These version boundaries are independent: PRNG version controls uint32 state advancement; seed-derivation version controls root-seed/component-ID derivation; Arpeggiator policy version controls decision dimensions, order, and resolution mechanics; genre-profile version controls allowed/preferred choices and weights; generator/schema versions control the enclosing generation representation. Replay-relevant behavior changes at the boundary that owns them and never silently reinterpret historical output.

### Runtime validation gate

Stage 7C5 freezes the taxonomy, field ownership, and two-phase precedence above, and Stage 7C6 freezes the public enclosing interface and private helper ownership. Stage 7C7a1 implements only the reusable neutral component-seed derivation boundary, Stage 7C7a2 implements only the internal generic weighted-choice primitive, Stage 7C7a3 implements only the internal immutable density-mask catalog and deterministic lookup, and accepted Stage 7C7a4 implements only the upstream shared canonical Energy/Complexity boundary consumed by the request. Stage 7C7a5 implements only the accepted shared policy-configuration foundation and its private `policy.version`-owned failure boundary; Stage 7C7a6 implements only accepted genre-profile configuration and candidate construction. Stage 7C7a7 implements only the module-private policy resolver and is accepted and merged through PR #94 at approved head `133c7f6fecc2a78ea4278fb7b44921a2484a0c13` with merge commit `afbe3493841ef38a62eb961368a2f1147f008725`. Stage 7C7a8 implements the module-private resolved-plan projector and is accepted and merged through PR #96 at approved head `43d251c4c95d39f60320ad90bd80522c514d721c` with merge commit `a14b6e100d00464e314309b45813943e6f81b83a`. Direct shared-domain and shared-configuration errors remain distinct from the enclosing operation's `ArpValueError` behavior. The public enclosing operation and its Arpeggiator-owned preflight, translation, orchestration, and no-partial-result behavior are accepted and merged through PR #98 at approved head `d4373c60cb3242058df4bc1c898ccb2d465f0741` with merge commit `6f5e1d26e9f48a678f5c995538fdb218d29fd39d`; aggregate provenance and later behavior remain unimplemented.

## Deferred Stage 7 behavior

The following remain separately gated: further human profile-fit evaluation beyond the [bounded current R1 acceptance](reviews/STAGE7_ARPEGGIATOR_EVALUATION_RESULTS.md#product-owner-r1v2-acceptance-and-comparison-override) and later capability work. Aggregate generator/provenance integration is accepted through PR #155, while `alternate` and `seededRandom` direction semantics, scale-tone transforms or other non-selected-voicing pitch sources, triplets, dotted and thirty-second rates, free-running Arp, VST automation, velocity/accent, MIDI, browser/audio, UI, persistence, and AI behavior remain outside this checkpoint.

Stage 7C4 freezes exact ordered candidates and raw integer weights for Dark Synthwave, Classic Synthwave, Darkwave, and Midtempo Cyberpunk in the genre-profile model. They are versioned Nightdrive hypotheses, not universal genre claims or runtime authorization. Stage 7C5 freezes error behavior only. The accepted runtime and deterministic evidence now satisfy the technical Stage 7 obligations; the linked Product Owner override satisfies the current R1 product-acceptance gate by exception, not by completion of the full comparison. Aggregate generator/provenance integration and AC-004 evidence are accepted through PRs #155 and #169. Full Stage 7 exit-evidence reconciliation remains outstanding; this decision does not close Stage 7.

## Bounded delivery sequence

1. **Stage 7A — contract definition:** this documentation-only foundation.
2. **Stage 7B1 — candidate foundation (accepted and merged through PR #59):** validate Harmony and compatibility, filter the exact selected voicing by range, and return immutable stable candidates or structured failure; no events or traversal.
3. **Stage 7B2 — simple event projection (accepted and merged through PR #62):** fixed eighth rate, up direction, full-step gate, monophonic events, and slot-local reset.
4. **Stage 7B3 — rate and direction expansion (accepted and merged through PR #65):** quarter/eighth/sixteenth and the four exact direction cycles through the complete optional runtime parameter object defined above.
5. **Stage 7B4 — integer gate control (accepted and merged through PR #68):** add optional `gateTicks` to the complete Stage 7B3 traversal argument; absence or explicit `undefined` defaults to the selected rate, while other values are validated in `1..rateTicks` without ratios, percentages, overlap, velocity, or MIDI articulation.
6. **Stage 7C — remaining policy definition and bounded runtime delivery (documentation checkpoint accepted through PR #70):** define octave behavior, deterministic density/rest-mask architecture, seeded policy resolution, component isolation, generator/provenance integration, and bounded profile candidates. Stage 7C1 is accepted and merged through PR #72; Stage 7C2 is accepted and merged through PR #73; Stage 7C3 exact component-seed derivation and normative vectors are accepted and merged through PR #75; Stage 7C-P1 is accepted and merged through PR #79; Stage 7C4 exact profile policy is accepted and merged through PR #80; Stage 7C5 structured errors are accepted and merged through PR #81; Stage 7C6 runtime interfaces are accepted and merged through PR #82; Stage 7C7a1 component-seed runtime is accepted and merged through PR #83; Stage 7C7a2 weighted-choice runtime is accepted and merged through PR #84; Stage 7C7a3 immutable density-mask catalog runtime is accepted and merged through PR #86; Stage 7C7a4 canonical Energy/Complexity runtime is accepted and merged through PR #88; Stage 7C7a5 shared policy-configuration runtime is accepted and merged through PR #90; and Stage 7C7a6 genre-profile configuration runtime is accepted and merged through PR #92 at approved head `a7193128e9d8febcee6cca306a0f07fc1c6cc41a` with merge commit `e4ae8e8675a83e69752362565f94b73907ded10a`. Stage 7C7a7 policy resolution is accepted and merged through PR #94 at approved head `133c7f6fecc2a78ea4278fb7b44921a2484a0c13` with merge commit `afbe3493841ef38a62eb961368a2f1147f008725`; Stage 7C7a8 resolved-plan projection is accepted and merged through PR #96 at approved head `43d251c4c95d39f60320ad90bd80522c514d721c` with merge commit `a14b6e100d00464e314309b45813943e6f81b83a`.

This sequence describes review boundaries; it authorizes none of the implementation milestones.

## Requirement and evidence boundary

The foundation traces to MUS-003/AC-011, MUS-006/AC-013, and NFR-001/AC-004 only for behavior it actually implements later. Candidate and event evidence must cover active-Harmony derivation, compatibility, exact selected-voicing pitch source, inclusive range boundaries, one/two/three candidate sets, exact timings and cycles, slot/section containment, gate bounds, structured rejection, immutability, input non-mutation, repeatability, and ambient-randomness isolation.

The accepted Stage 7C contract and runtime evidence satisfy the complete AC-011 and AC-004 technical scope; AC-013 timing evidence remains satisfied by the accepted projection/enclosing-operation tests. Human musical review of profile fit remains separately governed by the accepted Product Owner R1/V2 exception. Full Stage 7 remains open only for exit-evidence reconciliation and closure.

Stage 7B1 implementation evidence covers canonical Harmony progression identity and ordered-slot validation, Chord/inversion/voicing compatibility, inclusive `MidiPitch` range validation, exact one/two/three-pitch filtering, whole-operation `NO_LEGAL_ARP_PITCH` failure, stable frozen per-slot output, input non-mutation, repeatability, and ambient-randomness isolation. It does not provide event, timing, rate, direction, gate, octave, density, seed, or profile-policy evidence.

Stage 7B2 implementation evidence covers the exact three-field frozen `ArpEvent`, fixed `480`-tick starts and durations, ascending cycles for one/two/three retained pitches, traversal reset at every canonical slot, exact canonical slot boundaries, the complete 64-event eight-bar section ending at tick `30,720`, slot/section containment, selected-voicing candidate ownership, input non-mutation, replay, and ambient-randomness isolation. The fixed V1 Harmony catalog currently uses uniform two-bar slots; no noncanonical variable-span fixture is invented. Configurable rate and direction remain outside the merged Stage 7B2 slice.

Stage 7B3 implementation evidence covers all exact `960`/`480`/`240` rate mappings, full-step durations, `32`/`64`/`128` section event counts, exact slot/section containment, and final events ending at tick `30,720`. Independent direction cases cover all four exact cycles for one-, two-, and three-candidate sets without duplicated turning endpoints; slot-reset cases assert every canonical slot begins on the direction's first pitch while the implementation structurally resets its slot-local index. Validation cases cover malformed, incomplete, wrong-case, and unsupported parameters with exact rate/direction codes and fields, plus the normative precedence. Compatibility, frozen output, input non-mutation, replay, ambient-randomness isolation, and existing Stage 7B1/B2 failures remain covered. Gate, octave, density, seed, provenance, and profile policy remain outside the merged Stage 7B3 implementation.

Stage 7B4 implementation evidence proves omission compatibility for both the two-argument call and existing rate/direction-only calls; equivalence of explicit `undefined`; explicit full-step equivalence and shortened positive gates at quarter, eighth, and sixteenth rates; inclusive `1` and `rateTicks` boundaries; malformed and over-rate rejection with the exact gate code/field; the complete mixed-invalid precedence; and unchanged pitch order, counts, starts, slot reset, and section containment when only gate changes. It also retains frozen output, input safety, repeatability, ambient-randomness isolation, same-pitch adjacent-step behavior, and all Stage 7B1/B2/B3 regression evidence. This evidence was accepted and merged through PR #68.

Stage 7C7a8 accepted and merged implementation evidence covers exact upward octave ranges `1|2|3`, canonical MIDI and inclusive Arp-range filtering, stable deduplication before ascending traversal, all four accepted direction cycles without repeated bounce endpoints, slot-local traversal and four-step mask reset, all five accepted masks, and rests consuming both time and traversal. It covers exact quarter/eighth/sixteenth starts, resolved gate-only durations, slot/section containment, direct Stage 7B canonical-value compatibility across representative rate/direction/gate combinations, frozen outputs, input/catalog non-mutation, deterministic replay, ambient-randomness isolation, private barrel visibility, internal-only impossible-state assertions, and absence of seed, PRNG, policy resolution, public error, enclosing-operation, or provenance behavior. It is recorded through PR #96 at approved head `43d251c4c95d39f60320ad90bd80522c514d721c` with merge commit `a14b6e100d00464e314309b45813943e6f81b83a`.

The accepted enclosing-operation evidence covers the exact public request/result shape, all four matching profiles and twelve ordered mismatches, every request-owned Stage 7C5 code/field, representative mixed-invalid precedence, profile/shared configuration translation, all fourteen preflight steps before seed/PRNG/resolver/projector work, fixed `arpeggiator` component-seed handoff, reuse of the accepted resolver/projector, post-resolution no-legal-pitch translation, internal impossible-state handling, no partial result, recursive freezing, literal deterministic profile fixtures, Stage 7B compatibility, and ambient-randomness isolation. This supplies the exact public Arpeggiator structured-error assertions previously deferred as MIA-004; it does not broaden MIA-004 into unrelated historical cleanup.

Accepted Stage 7C7a6 evidence enumerates every profile and policy slot to prove exact candidate membership, order, and final raw weights for all 25 energy/complexity pairs; every final list satisfies Stage 7C2 without reordering or normalization. Independent fixtures prove that changing only energy or only complexity leaves every documented invariant slot unchanged, that Darkwave energy changes density before register, and that Midtempo Cyberpunk complexity changes mask phase preference without equating complexity to note count. Gate fixtures cover all nine rate/gate mappings, legal Stage 7B4 integer bounds, duration-only effects, and exact `long === rateTicks` compatibility. Replay fixtures hold profile ID/data version, Arpeggiator policy version, normalized intent, root seed, seed-derivation version, and PRNG version constant; prove the fixed five-output schedule including the one-candidate Midtempo gate; prove component isolation; and fail if `Math.random`, wall clock, locale, network, AI output, database/discovery order, or object iteration affects resolution. Human profile-fit evaluation remains a separate acceptance gate from deterministic correctness.

The accepted Stage 7C5 runtime evidence asserts exact public codes and fields at their owning boundaries, valid root-seed bounds, missing and explicit-`undefined` request fields, representative malformed values and the complete documented mixed-invalid order, exact Stage 7B regression compatibility, configuration ownership, incompatible canonical context, whole-operation musical unsatisfiability, and internal assertions. It proves all five candidate lists plus shared policy/gate data, range, Harmony, and profile-context equality validate before seed derivation or the first PRNG output; all four matching profile pairs pass and all twelve ordered unequal pairs fail as `INCOMPATIBLE_ARP_PROFILE_CONTEXT` at `profile.id`; mismatch consumes no component-seed or PRNG output; and no partial plan or events escape a failure. Aggregate provenance remains separately gated; the PR #142 Product Owner exception satisfies current R1 human product acceptance without claiming full comparison execution.
