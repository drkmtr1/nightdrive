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

## Governance

Profile changes create new versions and require deterministic fixtures plus structured musical review. Historical generation retains the exact version. Do not add dozens of genres; a new profile requires user need, distinct rule evidence, evaluation cases, maintenance owner, and roadmap/scope approval.

## Failure behavior

Unsupported combinations return an explanation and closest valid choices; they are not silently coerced. If hard profile constraints yield no valid candidate, generation returns a structured unsatisfiable error with constraint codes.
