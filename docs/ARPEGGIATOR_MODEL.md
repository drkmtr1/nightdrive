# Stage 7 Arpeggiator deterministic foundation contract

## Authority and status

Stage 7A freezes the smallest deterministic Arpeggiator foundation. Stage 7B1 is the accepted and merged bounded candidate foundation for Harmony validation and exact selected-voicing range filtering. Stage 7B2 is accepted and merged through PR #62 at approved head `b103a7c4e054f8b62ca81b660b53a2c6c2cdc797` with merge commit `acaea6da15dc3a97fc30421a181e0e7ca9d22c96`; it provides fixed-eighth, ascending, full-step event projection with slot-local traversal reset. Stage 7B3 rate/direction expansion is accepted and merged through PR #65 at approved head `7548055fe28c78d5f752481009e3f37970182054` with merge commit `74a77ebdee3a8d437697c47066adf14e934acff9`. Stage 7B4 integer gate control is accepted and merged through PR #68 at approved head `0878f77a5b6c5e31f142ab04771cc8bf1f7f0a8a` with merge commit `a061bb91d3fe3d973d0795df240cdd46d118a7af`. The Stage 7C documentation-only policy checkpoint is accepted and merged through PR #70; it defines future octave, density/mask, seeded resolution, provenance, and profile boundaries without authorizing runtime implementation. Stage 7C1 is accepted and merged through PR #72 at approved head `8d0a2d5ba3919e64b96cc2267cab0a0efd66d75e` with merge commit `77fde7d939f8da563cfbff28f4c5e69c37d754b2`. Stage 7C2 is the current documentation-only deterministic weighted-choice contract slice under review. The foundation cannot by itself complete Stage 7 or AC-011.

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

The versioned `nightdrive.prng.mulberry32.v1` primitive, canonical uint32 seed/state validation, and deterministic stepping are implemented. No accepted Arp-specific seed-bearing runtime boundary or seed-consuming production Arp consumer exists; Stage 7B1 and Stage 7B2 have no seed input, and Stage 7B3 adds none. Bounded choice, shuffle, weighting, stream/fork mechanics, Arp seed derivation, and the shared Arp generator/provenance envelope are not implemented contracts.

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

The resolved plan conceptually contains `rate`, `direction`, `gateTicks`, `octaveRange`, and `maskId: ArpDensityMaskIdV1` governed by the versioned mask catalog. It is bounded structured musical policy output, not an opaque random-note instruction. Stage 7B event projection remains responsible for canonical starts, durations, traversal, immutability, and boundary validation. Harmony remains authoritative for progression, Chord, inversion, and selected voicing. The future enclosing composition/generator schema owns the exact aggregate persistence representation; `ArpEvent` gains no seed, provenance, profile, policy, AI, MIDI, UI, or persistence fields.

Backward compatibility is mandatory. A resolved plan using octave range `1`, mask ID `full`, and the accepted Stage 7B default or explicit traversal values must reproduce Stage 7B pitch/event behavior exactly. Existing Stage 7B public calls remain valid; Stage 7C does not silently reinterpret them.

### Upward octave expansion

The closed V1 octave-range domain is `1 | 2 | 3`:

- `1` uses the exact Harmony-selected absolute pitches and reproduces Stage 7B pitch-source behavior.
- `2` considers each selected pitch at its original value and `+12` semitones.
- `3` considers each selected pitch at its original value, `+12`, and `+24` semitones.

Expansion is upward only. For each slot the normative transformation order is: (1) obtain the exact Harmony-selected pitches; (2) derive only the permitted upward octave equivalents; (3) discard values outside valid `MidiPitch` or the inclusive `ArpRange`; (4) deduplicate equal absolute pitches; (5) sort into stable ascending absolute-pitch order; and (6) apply the accepted direction traversal. The operation may create octave-equivalent copies only. It cannot invent a chord member, add a scale or chromatic passing tone, select a new voicing, change inversion, or reinterpret Harmony. A slot with no legal expanded pitch retains the existing whole-operation `NO_LEGAL_ARP_PITCH` meaning; validation of a malformed octave-range value and its exact precedence remain a separately frozen runtime contract.

### Deterministic density and rest masks

Density is policy input that resolves to an exact ordered on/rest mask; floating per-step probability is not canonical Arpeggiator behavior. Event projection advances one timeline step and one underlying direction-cycle position for every mask step. An `on` step emits the corresponding event; a `rest` step emits nothing but still consumes that pitch position. Therefore masking `C E G C` with `ON ON REST ON` yields `C E [rest] C`, not `C E [rest] G`. Changing only the mask cannot change the underlying full-density pitch cycle, rate grid, or slot-local traversal reset.

Stage 7C1 proposes the versioned catalog identity `nightdrive.arp-density-mask.v1` and this closed, case-sensitive V1 domain:

```ts
type ArpMaskStepV1 = "on" | "rest";

type ArpDensityMaskIdV1 =
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

Future runtime validation must reject every value that is not one of the exact identifiers above, including non-strings, empty strings, unknown values, wrong-case or whitespace variants, arrays, and objects; it must not coerce aliases or accept caller-defined masks. Internal catalog evidence must prove unique IDs, exactly four frozen `on`/`rest` steps per entry, and at least one `on` step. Stage 7C1 does not define a public error code, field, or mixed-invalid precedence for these failures; those remain inputs to the separately gated structured-error contract.

The catalog ID-to-sequence mapping, identifier vocabulary, step order, length, repetition rule, slot-reset rule, and rest-consumes-traversal rule are replay-relevant policy semantics. Adding, removing, renaming, or reinterpreting an identifier, or changing any of those mechanics, requires a new appropriate Arpeggiator policy/catalog version and must not silently reinterpret historical output. Candidate ordering, profile membership, weights, and weighted-choice mechanics remain unfrozen and separately gated.

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

Stage 7C2 proposes the generic weighted-choice contract identity `nightdrive.weighted-choice.uint32-modulo.v1`. It operates on a non-empty ordered list with this conceptual shape; it does not freeze a production TypeScript API:

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

Future runtime validation must reject an empty list; malformed candidates; weights outside the exact domain; zero or overflowing totals; and a supplied output that is not a canonical uint32. Domain-specific candidate construction remains responsible for its own closed vocabulary and uniqueness validation before invoking weighted choice. Stage 7C2 does not define public error codes, fields, or mixed-invalid precedence; those remain inputs to the separately gated structured-error contract.

The weighted-choice identity, mapping algorithm, modulo-bias policy, candidate order, weight domain and total bound, raw-weight/no-normalization rule, zero-weight semantics, summation order, cumulative half-open boundary algorithm, and single-candidate consumption rule are replay-relevant. Changing any of them requires a new appropriate weighted-choice or Arpeggiator policy version rather than silently reinterpreting historical output. Stage 7C2 freezes no profile-specific candidates or weights and authorizes no runtime implementation.

### Proposed component-seed derivation contract

`nightdrive.seed-derivation.component.v1` is the proposed versioned identity for a pure, deterministic, synchronous, framework-independent function from a canonical uint32 root seed and supported component ID to a canonical uint32 component seed. It performs no I/O, uses no ambient randomness, mutable shared stream, locale behavior, object iteration order, trimming, case folding, or Unicode normalization. Unsupported or differently cased component IDs are rejected rather than coerced.

The research recommendation is an in-repository, dependency-free MurmurHash3 x86_32-style hash over an exact canonical byte representation. This algorithm is **provisional**: constants, operation order, uint32 coercion points, `Math.imul` use, unsigned shifts, root-seed byte order, identifier bytes/encoding, final extraction, rejection behavior, and golden cross-runtime vectors are not fully frozen here. Proposed contract pending exact algorithm/byte-layout vectors before production implementation. No dependency is recommended because this small non-cryptographic replay mechanism must remain Nightdrive-owned and replaceable without giving a package authority over historical output.

### Provenance and version boundaries

Canonical generation lineage retains the root seed, seed-derivation version, PRNG version, Arpeggiator policy version, genre-profile ID/version, generator/engine/schema versions, normalized inputs, parent lineage, and canonical hashes already required by ADR-010 and ADR-014. Component child seeds, PRNG internal state, raw outputs, cumulative-weight calculations, temporary candidate arrays, and resolved intermediates are derived/transient values and need not be persisted as canonical composition state.

These version boundaries are independent: PRNG version controls uint32 state advancement; seed-derivation version controls root-seed/component-ID derivation; Arpeggiator policy version controls decision dimensions, order, and resolution mechanics; genre-profile version controls allowed/preferred choices and weights; generator/schema versions control the enclosing generation representation. Replay-relevant behavior changes at the boundary that owns them and never silently reinterpret historical output.

### Runtime validation gate

Future Stage 7C runtime work will require structured validation for malformed octave range, mask/pattern identity or shape, profile/policy input, root/component seed input, and unsupported component IDs. This checkpoint does not freeze new error codes or insert them into the accepted Stage 7B precedence. Exact taxonomy and precedence interactions must be reviewed in a bounded follow-on contract before implementation.

## Deferred Stage 7 behavior

The following remain separately gated for runtime implementation but are not removed from eventual Stage 7 scope: the accepted Stage 7C1 deterministic density/rest-mask contract; the Stage 7C2 deterministic weighted-choice contract while it remains under review; the documented upward octave expansion; seeded bounded policy resolution; concrete profile policy; and aggregate generator/provenance integration. Profile weights, component-seed vectors, exact profile mappings, and Stage 7C error precedence require separate follow-on contract review. `alternate` and `seededRandom` direction semantics, scale-tone transforms or other non-selected-voicing pitch sources, triplets, dotted and thirty-second rates, free-running Arp, VST automation, velocity/accent, MIDI, browser/audio, UI, persistence, and AI behavior remain outside this checkpoint.

Stage 7C records bounded candidate tendencies for Dark Synthwave, Classic Synthwave, Darkwave, and Midtempo Cyberpunk in the genre-profile model. They are not an executable profile catalog, exact weights, universal genre claims, or implementation authorization. Stage 7 cannot be declared profile-appropriate or complete until the remaining exact policy contracts, deterministic evidence, and structured human listening review are accepted.

## Bounded delivery sequence

1. **Stage 7A — contract definition:** this documentation-only foundation.
2. **Stage 7B1 — candidate foundation (accepted and merged through PR #59):** validate Harmony and compatibility, filter the exact selected voicing by range, and return immutable stable candidates or structured failure; no events or traversal.
3. **Stage 7B2 — simple event projection (accepted and merged through PR #62):** fixed eighth rate, up direction, full-step gate, monophonic events, and slot-local reset.
4. **Stage 7B3 — rate and direction expansion (accepted and merged through PR #65):** quarter/eighth/sixteenth and the four exact direction cycles through the complete optional runtime parameter object defined above.
5. **Stage 7B4 — integer gate control (accepted and merged through PR #68):** add optional `gateTicks` to the complete Stage 7B3 traversal argument; absence or explicit `undefined` defaults to the selected rate, while other values are validated in `1..rateTicks` without ratios, percentages, overlap, velocity, or MIDI articulation.
6. **Stage 7C — remaining policy definition (documentation checkpoint accepted through PR #70):** define octave behavior, deterministic density/rest-mask architecture, seeded policy resolution, component isolation, generator/provenance integration, and bounded profile candidates. Stage 7C1 is accepted and merged through PR #72; Stage 7C2 proposes the exact generic weighted-choice mechanics for review. Profile weights, seed vectors, exact profile mappings, runtime errors, implementation, and full Stage 7 acceptance remain separately gated.

This sequence describes review boundaries; it authorizes none of the implementation milestones.

## Requirement and evidence boundary

The foundation traces to MUS-003/AC-011, MUS-006/AC-013, and NFR-001/AC-004 only for behavior it actually implements later. Candidate and event evidence must cover active-Harmony derivation, compatibility, exact selected-voicing pitch source, inclusive range boundaries, one/two/three candidate sets, exact timings and cycles, slot/section containment, gate bounds, structured rejection, immutability, input non-mutation, repeatability, and ambient-randomness isolation.

Full Stage 7 remains pending until the Stage 7C contract and separately authorized runtime evidence satisfy the complete AC-011 and AC-004 scope. Human musical review of profile fit remains separate from deterministic correctness.

Stage 7B1 implementation evidence covers canonical Harmony progression identity and ordered-slot validation, Chord/inversion/voicing compatibility, inclusive `MidiPitch` range validation, exact one/two/three-pitch filtering, whole-operation `NO_LEGAL_ARP_PITCH` failure, stable frozen per-slot output, input non-mutation, repeatability, and ambient-randomness isolation. It does not provide event, timing, rate, direction, gate, octave, density, seed, or profile-policy evidence.

Stage 7B2 implementation evidence covers the exact three-field frozen `ArpEvent`, fixed `480`-tick starts and durations, ascending cycles for one/two/three retained pitches, traversal reset at every canonical slot, exact canonical slot boundaries, the complete 64-event eight-bar section ending at tick `30,720`, slot/section containment, selected-voicing candidate ownership, input non-mutation, replay, and ambient-randomness isolation. The fixed V1 Harmony catalog currently uses uniform two-bar slots; no noncanonical variable-span fixture is invented. Configurable rate and direction remain outside the merged Stage 7B2 slice.

Stage 7B3 implementation evidence covers all exact `960`/`480`/`240` rate mappings, full-step durations, `32`/`64`/`128` section event counts, exact slot/section containment, and final events ending at tick `30,720`. Independent direction cases cover all four exact cycles for one-, two-, and three-candidate sets without duplicated turning endpoints; slot-reset cases assert every canonical slot begins on the direction's first pitch while the implementation structurally resets its slot-local index. Validation cases cover malformed, incomplete, wrong-case, and unsupported parameters with exact rate/direction codes and fields, plus the normative precedence. Compatibility, frozen output, input non-mutation, replay, ambient-randomness isolation, and existing Stage 7B1/B2 failures remain covered. Gate, octave, density, seed, provenance, and profile policy remain outside the merged Stage 7B3 implementation.

Stage 7B4 implementation evidence proves omission compatibility for both the two-argument call and existing rate/direction-only calls; equivalence of explicit `undefined`; explicit full-step equivalence and shortened positive gates at quarter, eighth, and sixteenth rates; inclusive `1` and `rateTicks` boundaries; malformed and over-rate rejection with the exact gate code/field; the complete mixed-invalid precedence; and unchanged pitch order, counts, starts, slot reset, and section containment when only gate changes. It also retains frozen output, input safety, repeatability, ambient-randomness isolation, same-pitch adjacent-step behavior, and all Stage 7B1/B2/B3 regression evidence. This evidence was accepted and merged through PR #68.
