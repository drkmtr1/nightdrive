# Genre profile model

## Purpose

A genre profile is versioned structured configuration that bounds deterministic choices; it is not a claim that a genre has one objective formula. Initial profiles are Dark Synthwave, Classic Synthwave, Darkwave, and Midtempo Cyberpunk.

## Shape

A published immutable profile version includes stable ID/name/version/status; supported scales/keys and weighted defaults; BPM guidance as soft validated ranges; section mappings; harmonic templates/degrees/cadence/tension; voicing ranges/width/movement; allowed bass/arp archetypes and parameter bounds; motif range/density/leap/repetition rules; energy/complexity mappings; explanation labels; evaluation cases; provenance/authorship/license; engine/schema compatibility.

Weights are raw bounded integers consumed by the versioned deterministic weighted-choice contract without normalization, rescaling, or floating-point probability. Candidate array order is explicit versioned policy data; object key, map, set, database row, discovery, locale, or display-label order never determines a choice. Stage 7C4 freezes the Arpeggiator-specific candidates and weights below as a documentation-only contract; runtime use and other generator mappings remain separately gated. Hard constraints, soft preferences, and display copy are separate.

## Mood and section mapping

Mood descriptors map to a small versioned parameter vocabulary (for example tension, brightness, density, register, rhythmic aggression). Section type maps to bounded energy/density/voicing/motif behaviors. AI may propose these parameters but cannot add unknown dimensions or bypass profile bounds.

## Stage 7C4 Arpeggiator profile policy

The shared `EnergyV1` and `ComplexityV1` domains are owned by the normalized composition brief and defined in the [composition engine](COMPOSITION_ENGINE.md); profiles consume but do not redefine those identifiers, their order, independence, or `medium` defaults. Stage 7C4 freezes the four-profile Arpeggiator data set as `nightdrive.genre-profile.arpeggiator.v1`, keyed by the stable profile IDs `dark-synthwave`, `classic-synthwave`, `darkwave`, and `midtempo-cyberpunk`. The shared resolver mechanics and gate mapping belong to `nightdrive.arpeggiator-policy.v1` in the [Arpeggiator model](ARPEGGIATOR_MODEL.md). The pair of profile ID plus this immutable profile-data version owns the candidate membership, candidate order, raw weights, and energy/complexity mappings below.

These are Nightdrive V1 product-policy hypotheses for structured evaluation, not claims that any genre has one objective formula. A future poor listening result may justify a new profile-data version; it must not mutate this version or reinterpret historical generations.

### Exact weight construction

Every table uses the input labels `VL`, `L`, `M`, `H`, and `VH` as exact aliases for `very-low`, `low`, `medium`, `high`, and `very-high` only within the table. A vector's positions align exactly with the declared candidate order in the same row. For profile `p`, decision slot `s`, energy `e`, and complexity `c`, construct the final ordered weighted-candidate list without coercion as:

```text
candidateOrder = candidates[p, s]
rawWeights = energyWeights[p, s, e] + complexityAdditions[p, s, c]
```

Vector addition is exact left-to-right element-wise integer addition. It does not combine energy and complexity into one score: each dimension independently selects one explicit lookup row, after which their candidate-aligned integers are added. There is no interpolation, multiplication, clamping, normalization, rescaling, greatest-common-divisor reduction, sorting, or floating-point operation. Candidate membership and order never vary with energy or complexity. All 25 input pairs are therefore the exact Cartesian product of the five named energy rows and five named complexity rows. Every final candidate weight is in `1..10` and every final total is in `1..20`, inside `nightdrive.weighted-choice.uint32-modulo.v1`. No final Stage 7C4 list uses a zero weight.

`same [v]` means that the exact vector `v` is used for all five named input rows; it is not an inferred default. A dimension is energy-invariant when all five energy vectors are identical and complexity-invariant when all five complexity-addition vectors are identical.

### Dark Synthwave (`dark-synthwave`)

| Decision slot | Exact ordered candidates | Energy weights `VL / L / M / H / VH` | Complexity additions `VL / L / M / H / VH` |
|---|---|---|---|
| rate | `eighth, sixteenth` | `[5,1] / [4,2] / [3,5] / [2,6] / [1,7]` | same `[0,0]` |
| octave range | `1, 2` | same `[2,5]` | `[2,0] / [1,0] / [0,0] / [0,1] / [0,2]` |
| direction | `down-up, down, up-down` | same `[6,4,1]` | `[0,1,0] / [0,0,0] / [0,0,0] / [1,0,1] / [2,0,2]` |
| density/rest mask | `three-of-four, full` | `[6,2] / [5,3] / [4,5] / [3,6] / [2,7]` | same `[0,0]` |
| gate | `short, medium` | `[2,6] / [3,5] / [4,4] / [5,3] / [6,2]` | same `[0,0]` |

Energy moves the profile toward faster, fuller, and shorter behavior while remaining inside its accepted bounds. Complexity affects register and direction variety but does not alter rate, mask membership, note-density weighting, or gate. `down-up` and `down` remain the leading direction tendencies, octave range `2` remains preferred, and the mask set remains medium-high to full.

### Classic Synthwave (`classic-synthwave`)

| Decision slot | Exact ordered candidates | Energy weights `VL / L / M / H / VH` | Complexity additions `VL / L / M / H / VH` |
|---|---|---|---|
| rate | `eighth, sixteenth` | `[5,1] / [4,2] / [3,5] / [2,6] / [1,7]` | same `[0,0]` |
| octave range | `1, 2` | `[5,2] / [4,3] / [3,5] / [2,6] / [1,7]` | same `[0,0]` |
| direction | `up, up-down, down-up` | same `[6,3,1]` | `[2,0,0] / [1,0,0] / [0,1,0] / [0,2,1] / [0,3,2]` |
| density/rest mask | `three-of-four, full` | `[6,2] / [5,3] / [3,6] / [2,7] / [1,8]` | same `[0,0]` |
| gate | `short, medium` | `[2,6] / [3,5] / [4,5] / [5,4] / [6,3]` | same `[0,0]` |

Energy moves the profile toward sixteenth rate, octave range `2`, fuller masks, and shorter gates. Complexity changes direction weighting only, increasing the relative role of `up-down` while retaining `up` and `up-down` as the leading tendencies. Complexity therefore adds traversal variety without being treated as raw note density.

### Darkwave (`darkwave`)

| Decision slot | Exact ordered candidates | Energy weights `VL / L / M / H / VH` | Complexity additions `VL / L / M / H / VH` |
|---|---|---|---|
| rate | `quarter, eighth` | `[6,2] / [5,3] / [3,6] / [2,7] / [1,8]` | same `[0,0]` |
| octave range | `1, 2` | same `[7,1]` | `[1,0] / [0,0] / [0,1] / [0,2] / [0,3]` |
| direction | `up, down, up-down` | same `[7,5,1]` | `[1,0,0] / [0,1,0] / [0,0,1] / [0,0,2] / [0,0,3]` |
| density/rest mask | `one-of-four, alternating-on-rest, alternating-rest-on` | `[7,2,1] / [6,3,2] / [4,6,3] / [3,7,4] / [2,8,5]` | `[2,1,0] / [1,1,0] / [0,1,1] / [0,1,2] / [0,1,3]` |
| gate | `medium, long` | `[2,7] / [3,6] / [4,5] / [6,3] / [7,2]` | same `[0,0]` |

Energy changes rate, density, and gate before register: octave weights are energy-invariant and octave range `1` remains preferred for every pair. Complexity can increase the relative use of octave range `2`, `up-down`, and the offbeat-phase `alternating-rest-on` mask without making any of them outrank the profile's primary low-register and `up`/`down` tendencies. Because the two alternating masks contain the same number of on steps, the complexity effect changes rhythmic phase/shape rather than merely adding notes.

### Midtempo Cyberpunk (`midtempo-cyberpunk`)

| Decision slot | Exact ordered candidates | Energy weights `VL / L / M / H / VH` | Complexity additions `VL / L / M / H / VH` |
|---|---|---|---|
| rate | `eighth, sixteenth` | `[5,2] / [4,3] / [4,4] / [3,5] / [2,6]` | same `[0,0]` |
| octave range | `1, 2` | same `[4,4]` | `[2,0] / [1,0] / [0,0] / [0,1] / [0,2]` |
| direction | `down-up, up-down, down, up` | same `[5,5,2,2]` | `[0,0,1,1] / [0,0,1,0] / [1,1,0,0] / [2,2,0,0] / [3,3,0,0]` |
| density/rest mask | `three-of-four, alternating-on-rest, alternating-rest-on` | `[2,5,4] / [3,5,4] / [5,5,5] / [7,4,5] / [8,3,5]` | `[2,1,0] / [1,1,0] / [0,1,1] / [0,1,2] / [0,1,3]` |
| gate | `short` | same `[1]` | same `[0]` |

Energy moves rate toward sixteenth and density toward `three-of-four`; complexity moves octave weighting from range `1` toward `2`, strengthens the two preferred bounce directions, and shifts mask preference toward the offbeat-phase `alternating-rest-on`. The complexity mask effect changes pattern phase at equal two-on-step density rather than equating complexity with more notes. Gate is invariant and exactly short; its single-candidate list still consumes the fifth policy-stream output.

### Candidate-order and compatibility constraints

The orders above are deliberate policy data, not alphabetical, object-key, map/set, database, display-label, or discovery order. A resolver constructs all five ordered lists before applying the accepted weighted-choice mechanism and consumes one PRNG output in rate, octave range, direction, density/rest mask, then gate order even for the one-candidate Midtempo Cyberpunk gate list.

No profile expands its previously documented allowed rate, direction, or octave set, and every mask is an accepted `nightdrive.arp-density-mask.v1` ID. Existing Stage 7B calls remain valid without profile-policy resolution. Within Stage 7C, octave range `1` and the `full` mask retain their accepted Stage 7B compatibility meanings wherever present; the `long` gate maps to a full selected rate step. Profile policy never changes the semantics of those values.

### Stage 7C7a6 accepted runtime checkpoint

Stage 7C7a5 is accepted and merged through PR #90 at approved head `d2b18ca3156d358693e1d00456cde1558afcca51` with merge commit `e87e270745b6fe219df8b0cd76f47f47ded03400`; it supplies the compatible shared-policy identity, closed shared domains, fixed decision schedule, and exact semantic gate mappings. Stage 7C7a6 is accepted and merged through PR #92 at approved head `a7193128e9d8febcee6cca306a0f07fc1c6cc41a` with merge commit `e4ae8e8675a83e69752362565f94b73907ded10a`. Its direct internal module owns one recursively frozen literal `nightdrive.genre-profile.arpeggiator.v1` data set, exact structural validation, and deterministic candidate-aligned construction only. Stage 7C7a7 consumes that accepted boundary for module-private policy resolution and is accepted and merged through PR #94 at approved head `133c7f6fecc2a78ea4278fb7b44921a2484a0c13` with merge commit `afbe3493841ef38a62eb961368a2f1147f008725`.

The four tables above are the literal implementation source of truth. Runtime representation must preserve profile order as `dark-synthwave`, `classic-synthwave`, `darkwave`, `midtempo-cyberpunk`; slot order as rate, octave range, direction, density/rest mask, gate; candidate order exactly as printed; and Energy/Complexity row order as `very-low`, `low`, `medium`, `high`, `very-high`. It must reuse the existing canonical `HarmonyProfileId`, `EnergyV1`, `ComplexityV1`, and Arpeggiator closed-domain values rather than define aliases or another profile vocabulary. A generic rules engine, inheritance, inferred neighbor values, computed profile templates, dynamic registration, database configuration, arbitrary caller-defined tables, and object/map/set iteration as order are prohibited.

For each of the 500 profile/slot/input combinations, the runtime construction is exactly the existing element-wise `energyWeight + complexityAddition` rule and returns the same candidate order. Stage 7C7a6 does not invoke weighted selection or any PRNG. Its configuration validator must reject any version, profile, slot, candidate, row, vector, numeric bound, final-total, or literal-value mismatch without repair. Direct configuration failure remains internal and attributable to `profile.version`; the accepted enclosing operation translates it to `INVALID_ARP_POLICY_CONFIGURATION` at `profile.version`.

Stage 7C7a7 implements only profile-list selection, supplied component-seed PRNG consumption, canonical gate mapping, and the frozen resolved plan. Stage 7C7a8 implements only the accepted module-private projection boundary and is accepted and merged through PR #96 at approved head `43d251c4c95d39f60320ad90bd80522c514d721c` with merge commit `a14b6e100d00464e314309b45813943e6f81b83a`. Profile/Harmony compatibility, enclosing integration, and public error translation are implemented and validation-complete through accepted PR #98 without changing the profile-data contract.

### First successor profile-data ownership — R1 dataset accepted

The successor compatibility direction in [ADR-019](DECISIONS.md) is accepted and merged through PR #109. It reserves `nightdrive.genre-profile.arpeggiator.v2` for the accepted exact R1 dataset of the same four profile IDs: `dark-synthwave`, `classic-synthwave`, `darkwave`, and `midtempo-cyberpunk`. It is paired only with `nightdrive.arpeggiator-policy.v2` under the exact compatibility matrix in the [Arpeggiator model](ARPEGGIATOR_MODEL.md). Both identities are implemented through the accepted public V2 operation (PR #131). The exact numerical R1 dataset and research fingerprint are documented separately in the [Stage 7 V2 calibration record](reviews/STAGE7_ARPEGGIATOR_V2_CALIBRATION.md); that record is an ordered research representation, not caller-supplied runtime configuration or a canonical persistence format. The accepted PR #116 V2 internal-profile clarification reuses the existing internal configuration error vocabulary/order while validating only the V2 identity and exact R1 literals; it does not widen V1. The V1 records above remain literal, immutable, and replay-authoritative.

For every existing profile/decision slot, the first successor retains V1 candidate membership and declaration order. R1 represents each list with five Energy weight vectors and five Complexity-addition vectors only: the selected vectors are added element-wise, without a third base-weight array, interpolation, normalization, rescaling, sorting, or candidate removal. The exact R1 values, observed `1..14` final weights and `1..27` final totals, preserved center and Darkwave Energy anchors, and complete V1 change ledger are in the candidate record. These R1 observations do not loosen V1 literal validation or change the shared Stage 7C2 bounds and zero-weight semantics. Changing subsets or order is deferred to a separate contract decision; no new profile, slot, candidate domain, or musical dimension is included.

The R1 dataset adjusts Complexity rows across all four profiles and Energy rows in Dark Synthwave, Classic Synthwave, and Midtempo Cyberpunk. Darkwave's medium-Complexity Energy path is preserved as a positive control. The candidate record supplies all 500 effective lists by exact construction and documents its retained regressions. Its arithmetic, hash, structure, and permitted-delta evidence were independently verified; collision totals are now reproduced by the accepted retained diagnostic; historical search/finalist chronology remains unreproduced. The diagnostic and public V2 runtime are accepted through PR #114 and PR #131 respectively; V1 replay isolation and exact data remain unchanged. Current R1/V2 behavior is Product Owner accepted for continued development under the [35-fixture evaluation override](reviews/STAGE7_ARPEGGIATOR_EVALUATION_RESULTS.md#product-owner-r1v2-acceptance-and-comparison-override). This is not a completed full matched-comparison result, and its retained numerical limitations remain unchanged. Aggregate provenance is accepted through PR #155; the Stage 8 contract is accepted through PR #217, with bounded implementation now eligible under that separate settled authority.

## Stage 8 V1 motif profile policy

The Product Owner accepts `nightdrive.genre-profile.motif.v1` as an initial musical-policy hypothesis for structured evaluation. The shared mechanics and exact operation contract are in [Stage 8 melody and motif model](MOTIF_MODEL.md). These tables are literal V1 data, not objective genre claims. A later change creates a new profile-data version and preserves V1 history.

The exact slot schedule is rhythm template, register band, tension mode, then Phrase-4 displacement. Each slot consumes one chained Motif PRNG output. Table labels `VL / L / M / H / VH` mean `very-low / low / medium / high / very-high`. `same` supplies the displayed vector for all five rows. Final weights are the selected Energy vector plus the selected Complexity vector element by element in the declared candidate order. There is no sorting, normalization, interpolation, rescaling, candidate removal, fallback, or additional draw.

### Dark Synthwave

| Slot | Ordered candidates | Energy weights `VL / L / M / H / VH` | Complexity additions `VL / L / M / H / VH` |
|---|---|---|---|
| rhythm | `sparse-4, steady-6, active-8` | `[6,3,1] / [5,4,1] / [3,6,3] / [2,5,6] / [1,3,8]` | same `[0,0,0]` |
| register | `middle, upper` | `[6,2] / [5,3] / [4,4] / [3,5] / [2,6]` | same `[0,0]` |
| tension | `chordal, diatonic-passing` | same `[5,3]` | `[2,0] / [1,0] / [0,0] / [0,2] / [0,4]` |
| displacement | `none, later-480, earlier-480` | same `[6,3,2]` | `[2,0,0] / [1,0,0] / [0,0,0] / [0,1,1] / [0,2,2]` |

### Classic Synthwave

| Slot | Ordered candidates | Energy weights `VL / L / M / H / VH` | Complexity additions `VL / L / M / H / VH` |
|---|---|---|---|
| rhythm | `sparse-4, steady-6, active-8` | `[5,4,1] / [4,5,1] / [2,7,3] / [2,6,5] / [1,5,7]` | same `[0,0,0]` |
| register | `middle, upper` | `[6,2] / [5,3] / [4,4] / [3,5] / [2,6]` | same `[0,0]` |
| tension | `chordal, diatonic-passing` | same `[6,2]` | `[2,0] / [1,0] / [0,0] / [0,2] / [0,3]` |
| displacement | `none, earlier-480, later-480` | same `[7,2,2]` | `[2,0,0] / [1,0,0] / [0,0,0] / [0,1,1] / [0,2,2]` |

### Darkwave

| Slot | Ordered candidates | Energy weights `VL / L / M / H / VH` | Complexity additions `VL / L / M / H / VH` |
|---|---|---|---|
| rhythm | `sparse-4, steady-6, active-8` | `[8,2,1] / [7,3,1] / [5,5,2] / [3,7,3] / [2,7,5]` | same `[0,0,0]` |
| register | `lower, middle` | same `[7,3]` | `[2,0] / [1,0] / [0,0] / [0,1] / [0,2]` |
| tension | `chordal, diatonic-passing` | same `[4,4]` | `[2,0] / [1,0] / [0,0] / [0,2] / [0,4]` |
| displacement | `none, later-480, earlier-480` | same `[5,4,2]` | `[2,0,0] / [1,0,0] / [0,0,0] / [0,2,1] / [0,3,2]` |

### Midtempo Cyberpunk

| Slot | Ordered candidates | Energy weights `VL / L / M / H / VH` | Complexity additions `VL / L / M / H / VH` |
|---|---|---|---|
| rhythm | `sparse-4, steady-6, active-8` | `[6,4,1] / [5,5,1] / [4,6,3] / [3,7,4] / [2,7,6]` | same `[0,0,0]` |
| register | `lower, middle, upper` | `[5,5,2] / [4,6,2] / [3,7,3] / [2,7,5] / [1,6,7]` | same `[0,0,0]` |
| tension | `chordal, diatonic-passing` | same `[5,3]` | `[2,0] / [1,0] / [0,0] / [0,2] / [0,4]` |
| displacement | `none, earlier-480, later-480` | same `[4,4,3]` | `[2,0,0] / [1,0,0] / [0,0,0] / [0,2,2] / [0,3,3]` |

Every V1 literal, order, and construction rule is immutable. Runtime validation must exhaustively reject any altered identity, profile order, slot order, candidate order, row, vector length, integer, or final weight rather than normalize or repair it.

## Governance

Profile changes create new versions and require deterministic fixtures plus structured musical review. Historical generation retains the exact version. Do not add dozens of genres; a new profile requires user need, distinct rule evidence, evaluation cases, maintenance owner, and roadmap/scope approval.

## Failure behavior

Unsupported combinations fail canonical generation with the owning structured code and field; they are never silently coerced or resolved through a closest-version fallback. User-facing guidance may explain the failure and suggest supported or closest valid choices only after that failure, without changing it or automatically generating. A malformed known Arpeggiator profile version is invalid versioned configuration rather than an ordinary caller mask/octave/gate error; the exact Stage 7C taxonomy and precedence live in the [Arpeggiator model](ARPEGGIATOR_MODEL.md). If hard profile constraints yield no valid musical candidate, generation returns the owning structured unsatisfiable error rather than partial output.
