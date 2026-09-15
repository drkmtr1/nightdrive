# Composition engine design

## Shared generator contract

Every generator receives a validated frozen context, target component, current/locked components and hashes, engine/generator/profile/schema versions, bounded parameters, and explicit seed. It returns canonical events, decisions/provenance, warnings, result hash, and structured errors. No ambient time, global random source, network, AI, database, locale, or unordered iteration may affect output.

## Normalized composition-intent energy and complexity

The normalized V1 composition brief owns two independent canonical intent dimensions:

```ts
type EnergyV1 = "very-low" | "low" | "medium" | "high" | "very-high";

type ComplexityV1 = "very-low" | "low" | "medium" | "high" | "very-high";
```

Both domains have the exact ordinal order `very-low < low < medium < high < very-high`. The order is a stable policy-comparison relation only: it does not assign numeric spacing, percentages, probabilities, arithmetic, interpolation, or a continuous scale.

| Level | `EnergyV1` meaning | `ComplexityV1` meaning |
|---|---|---|
| `very-low` | The lowest shared level of intended musical intensity and activity; downstream realization remains inside the active bounded profile and does not require silence. | The lowest shared level of intended structural or musical intricacy; downstream realization remains inside the active bounded profile and does not require fewer notes. |
| `low` | Restrained intended intensity and activity below the neutral default. | Restrained intended intricacy and policy variety below the neutral default. |
| `medium` | Neutral/default intended intensity and activity. | Neutral/default intended intricacy and policy variety. |
| `high` | Elevated intended intensity and activity above the neutral default. | Elevated intended intricacy and policy variety above the neutral default. |
| `very-high` | The highest shared level of intended intensity and activity; downstream realization remains inside the active bounded profile. | The highest shared level of intended intricacy and policy variety; downstream realization remains inside the active bounded profile. |

Energy may inform bounded rhythmic activity, density, register expansion, articulation/gate tendency, movement, or intensity policy. Complexity may inform bounded rhythmic variation, pattern variety, harmonic or melodic elaboration, transformation choice, or permissible policy diversity. Complexity is not a synonym for note count. Neither dimension directly authorizes notes, events, structural changes, or behavior outside the active generator and profile contracts.

The dimensions are orthogonal. Every one of the 25 ordered `EnergyV1`/`ComplexityV1` pairs is valid, including high energy with low complexity, low energy with high complexity, medium with medium, and very-high energy with very-low complexity. No implementation may collapse them into one score or infer one from the other.

Composition-brief creation/defaulting owns omission normalization. If the raw creation input omits energy or complexity, that field becomes the exact canonical value `medium`. A validated normalized brief consumed by deterministic generators must contain both fields explicitly. At that canonical boundary a present value is valid only when it is one exact case-sensitive identifier above; `undefined`, wrong-case or whitespace variants, aliases, unknown strings, numbers including fractions, booleans, `null`, arrays, and objects are invalid without trimming, case folding, clamping, interpolation, numeric parsing, synonym translation, or other coercion. A UI or AI adapter may interpret user language only before this boundary and must emit one schema-valid canonical identifier.

These identifiers, their order, meanings, independence, and omission defaults belong to the composition-brief schema/version boundary, not to Arpeggiator, Harmony, Bass, motif, a genre profile, AI, or UI state. Historical normalized briefs retain explicit energy and complexity values with their schema and generation lineage. Adding, removing, or renaming an identifier, changing order or meaning, or changing omission/default behavior requires an appropriate new composition-brief schema version rather than silently reinterpreting history. Each downstream generator consumes the two explicit values and maps them only through its own separately versioned bounded policy; different genre profiles may therefore produce different deterministic consequences from the same canonical pair.

### Stage 7C7a4 canonical runtime boundary

Stage 7C7a4 is the accepted and merged smallest shared runtime representation of the Stage 7C-P1 domains. It is merged through PR #88 at approved head `5844ef48bdaf98bb638b081d8eb610842b90cc42` with merge commit `8ebc73a71703893ca1afa608b96264d0db51ee12`. The implementation belongs in the framework-independent composition-intent domain at `src/music-domain/composition-intent.ts`; it does not live in an Arpeggiator-specific module or implement the broader future composition-brief schema. The module owns only these two shared fields, their creation defaults, canonical validation, immutable normalized pair, and neutral shared-domain failures.

The exact TypeScript boundary is:

```ts
export const ENERGY_V1_VALUES = Object.freeze([
  "very-low",
  "low",
  "medium",
  "high",
  "very-high",
] as const);

export const COMPLEXITY_V1_VALUES = Object.freeze([
  "very-low",
  "low",
  "medium",
  "high",
  "very-high",
] as const);

export type EnergyV1 = (typeof ENERGY_V1_VALUES)[number];
export type ComplexityV1 = (typeof COMPLEXITY_V1_VALUES)[number];

export type CompositionIntentCreationInputV1 = Readonly<{
  energy?: unknown;
  complexity?: unknown;
}>;

export type NormalizedCompositionIntentV1 = Readonly<{
  energy: EnergyV1;
  complexity: ComplexityV1;
}>;

export type CompositionIntentErrorCode = "INVALID_ENERGY" | "INVALID_COMPLEXITY";
export type CompositionIntentErrorField = "energy" | "complexity";

export class CompositionIntentValueError extends RangeError {
  readonly code: CompositionIntentErrorCode;
  readonly field: CompositionIntentErrorField;
}

export function normalizeCompositionIntentV1(
  input: CompositionIntentCreationInputV1,
): NormalizedCompositionIntentV1;

export function validateNormalizedCompositionIntentV1(
  input: Readonly<{ energy: unknown; complexity: unknown }>,
): NormalizedCompositionIntentV1;
```

`ENERGY_V1_VALUES` and `COMPLEXITY_V1_VALUES` are distinct frozen tuples even though they contain the same V1 vocabulary. Their array positions preserve only the accepted ordinal order; positions are not scores, distances, percentages, probabilities, interpolation inputs, or authorization for arithmetic. The distinct derived types preserve independent semantic ownership and must not be collapsed into one interchangeable domain type. Internal membership machinery may be shared without changing that distinction.

`normalizeCompositionIntentV1` is the raw creation/defaulting boundary for these two fields only. An absent property or a property whose value is explicitly `undefined` is omission and becomes exact `medium`; therefore `{}`, `{ energy: undefined }`, `{ complexity: undefined }`, and `{ energy: undefined, complexity: undefined }` normalize to the corresponding explicit `medium` values. Every other present value must already be one exact case-sensitive identifier. Malformed present energy fails before malformed present complexity. This function performs no trimming, case folding, aliasing, parsing, clamping, interpolation, synonym translation, or other coercion, and it never falls back to `medium` for a malformed non-`undefined` value.

`validateNormalizedCompositionIntentV1` is the canonical boundary used before deterministic generators consume the pair. Both properties are required and explicit; an absent property or explicit `undefined` is invalid. It validates energy before complexity and accepts only the exact case-sensitive identifiers. Wrong-case or whitespace variants, aliases or synonyms, unknown strings, every number including integers, fractions, `NaN`, and infinities, booleans, `null`, arrays, and objects fail without coercion. Both functions return a newly frozen `NormalizedCompositionIntentV1` and never mutate their input or the frozen vocabulary tuples.

Direct failures use `CompositionIntentValueError`: malformed energy uses `INVALID_ENERGY` at `energy`, and malformed complexity uses `INVALID_COMPLEXITY` at `complexity`. The error contains no captured invalid-value property. These errors belong to the shared composition-intent boundary and are not `ArpValueError`. The future `generateArpEventsWithPolicyV1` boundary continues to own its already accepted Stage 7C5 `ArpValueError` fields `intent.energy` and `intent.complexity` and their precedence; Stage 7C7a4 neither adds nor changes an Arpeggiator code, field, message contract, translation, or precedence.

The canonical constants, canonical types, normalized result type, shared error types/class, and `validateNormalizedCompositionIntentV1` are shared music-domain exports through `src/music-domain/index.ts` for legitimate deterministic-generator use. `CompositionIntentCreationInputV1` and `normalizeCompositionIntentV1` remain direct-module exports only for the future composition-brief creation/defaulting boundary; they are not re-exported through the broad music-domain barrel. Downstream generators consume the already normalized explicit pair and must not invoke creation defaulting.

The boundary is pure and deterministic. It consumes no PRNG or seed and cannot depend on `Math.random()`, time, locale, network, AI, persistence, database state, environment, object/discovery order, or another ambient input. Equal valid inputs produce canonical-value-equivalent frozen outputs. No dependency is justified for these tiny replay-relevant Nightdrive-owned domains and rules.

Stage 7C7a4 implements only this shared canonical boundary. It does not implement the Stage 7C4 profile tables, candidate construction or validation, energy/complexity lookup additions, gate mappings, weighted selection, PRNG consumption, policy resolution, resolved plans, mask execution, octave expansion, event projection, the Stage 7C enclosing operation or public preflight, provenance, persistence, MIA-004, human evaluation, UI, MIDI, or browser/audio behavior. Stage 7C7a5 separately defines the shared Arpeggiator policy-configuration foundation without authorizing its runtime, and all later runtime work remains separately gated.

## Pipeline

```mermaid
flowchart LR
  B[Validated brief] --> H[Harmony]
  H --> BA[Bass]
  H --> AR[Arp]
  H --> ME[Motif]
  BA --> VA[Aggregate validator]
  AR --> VA
  ME --> VA
  H --> VA
  VA --> R[Canonical revision + provenance]
```

Targeted regeneration loads authoritative harmony and locked components. The aggregate validator rejects changes whose hashes differ from submitted locks.

## Harmony engine

Inputs: key/scale, profile/section, tension, complexity, movement, voicing width/range, seed. Responsibilities: select a profile-approved functional/degree template; construct chords; choose inversions/voicings; optimize voice-leading under hard constraints and deterministic tie breaks. Return a structured unsatisfiable result rather than silently violating hard constraints.

## Bass engine

Stage 6 V1 receives a validated Harmony progression, uses each slot's Chord root, and selects the first legal root pitch nearest MIDI `43`, then each later slot pitch nearest the prior resolved Bass pitch, choosing the lower pitch on ties within the approved `36..60` range. The bounded straight-rhythm implementation projects that one slot pitch as `sustained`, straight quarter/eighth/sixteenth pulses, or the exact contracted offbeat-eighth pattern using integer slot-local timing. Omitted rhythm preserves the sustained one-event-per-slot baseline. The current Bass runtime has no seed input and reads no ambient randomness; seed lineage remains owned by the future enclosing generator boundary. Passing, approach, pedal, slash/inversion, compound or generalized syncopation/rest, cross-slot-tie, and profile-specific behavior are not active. The six named archetypes—Driving 8ths, Driving 16ths, Midtempo Stomp, Pedal Tone, Octave Pulse, and Syncopated Darkwave—and their eventual parameters remain separately authorized future slices; they must not be inferred from this contract.

## Arpeggiator

Stage 7A defines the deterministic foundation over a validated Harmony progression. Stage 7B1 implements exact selected-voicing range filtering, and accepted merged Stage 7B2 projects monophonic immutable `ArpEvent` values at fixed eighth rate, ascending direction, full-step gate, and slot-local reset. Stage 7B3 rate/direction expansion is accepted and merged through a complete optional third `ArpTraversalParametersV1` argument containing required rate (`quarter|eighth|sixteenth`) and direction (`up|down|up-down|down-up`) fields; omitting the argument preserves the Stage 7B2 defaults. Stage 7B4 integer gate control is accepted and merged through PR #68: it adds optional integer `gateTicks` to that same argument, treats absence or explicit `undefined` as the selected-rate full-step default, and changes duration only. Inclusive absolute MIDI range remains the second argument. See [Arpeggiator model](ARPEGGIATOR_MODEL.md) for normative cycles, validation, and boundary behavior.

Stage 7C defines two separate conceptual layers. A deterministic policy resolver consumes normalized intent, profile/version, energy/complexity, and an Arpeggiator component seed and returns a bounded resolved Arp plan containing rate, direction, gate, octave range, and `maskId: ArpDensityMaskIdV1` governed by the versioned mask catalog. Canonical event projection consumes that plan and the validated Harmony realization. The active Stage 7C profile ID must equal the independently validated Harmony realization's canonical profile identity before seed derivation or policy selection; cross-profile policy reuse is invalid generation lineage. Projection may add only permitted upward octave equivalents of Harmony-selected pitches and may mask traversal steps, but it never selects a replacement voicing, invents chord/scale tones, or makes random note decisions. Stage 7B calls remain compatible: octave range `1`, the `full` mask, and the existing explicit/default traversal parameters reproduce the accepted pitch and event behavior.

The enclosing generator, not `ArpEvent`, owns root seed, component-seed derivation version, PRNG version, Arp policy version, profile version, generator/schema versions, normalized inputs, lineage, and hashes. Stage 7C6 freezes `generateArpEventsWithPolicyV1(request)` as the public Arpeggiator boundary: it receives the root seed and complete canonical/versioned request, owns the Stage 7C5 preflight, derives the fixed `arpeggiator` component seed only after successful preflight, calls a module-private resolver, then calls a module-private projector. It returns a recursively frozen `{ plan, events }` result so the exact five-field `ResolvedArpPlanV1` is inspectable without becoming caller input or duplicating aggregate provenance. A single mutable composition-wide PRNG stream and per-parameter seed trees are prohibited. Stage 7C2 accepts one generic replay-versioned weighted-choice mechanism: preserve each policy's declared candidate order, sum raw integer weights exactly without normalization, map exactly one supplied uint32 output with modulo into half-open cumulative intervals, and consume that output even for a single candidate. Zero-weight candidates remain ordered but unselectable; no sorting, floating probability, rejection sampling, or additional PRNG output is permitted. Stage 7C3 accepts exact domain-separated MurmurHash3 x86_32 derivation from the canonical root seed and one closed stable component ID; the normative byte layout and vectors live in the Arpeggiator model. Stage 7C-P1 and the exact Stage 7C4 profile policy are accepted and merged. Stage 7C5 freezes boundary-owned structured errors and requires normalized intent, lineage, policy configuration, range, and Harmony preflight before any PRNG output; the exact taxonomy and precedence live in the Arpeggiator model. This does not authorize Stage 7C implementation or move normalized-brief, seed-lineage, Harmony, or event-projection validation into the policy resolver.

## Melody/motif engine

Represent motif identity as a base interval/rhythm contour plus transformations. Build phrases using repetition, transposition, rhythmic displacement/augmentation where supported, call/response, chord targets, passing/tension notes, resolution, register/range, and leap/recovery constraints. Candidate scoring and tie breaking are deterministic and explainable; no arbitrary LLM note stream.

## Reproducibility and lineage

Specify and version PRNG state advancement, root-to-component seed derivation, generator policy, profile data, parameter normalization, generator ordering, candidate sorting, and the canonical serializer. Replay-relevant changes use the appropriate version boundary rather than silently changing historical output. A variation creates a child run/revision. Manual edits create a new revision with command provenance. History is not overwritten.

## Explanation records

Generators emit machine-readable decision codes and references (for example, selected template, voice-leading cost, archetype, target-tone position). AI or deterministic text may explain those records but cannot rewrite them.
