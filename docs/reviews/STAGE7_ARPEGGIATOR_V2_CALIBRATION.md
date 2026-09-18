# Stage 7 Arpeggiator V2 R1 calibration candidate

## Status and ownership

R1 is the exact numerical candidate approved for this documentation checkpoint and is review-pending as a contract. It is research data, not accepted V2 musical behavior, implemented runtime data, a caller-supplied configuration API, or final Stage 7 acceptance. The completed [V1 evaluation](STAGE7_ARPEGGIATOR_EVALUATION_RESULTS.md) remains locked and its Energy and Complexity sensitivity dispositions remain REVISE/open. [ADR-019](../DECISIONS.md) and the [genre-profile model](../GENRE_PROFILE_MODEL.md) own compatibility and V1 history; this record owns R1's exact tables, fingerprint, V1 change ledger, and research qualifications.

The proposed identities are `nightdrive.genre-profile.arpeggiator.v2` and `nightdrive.arpeggiator-policy.v2`. The supported historical pair remains policy V1 + profile-data V1; the two cross-version pairs are unsupported; policy V2 + profile-data V2 is the candidate pair with no runtime implementation. No fallback, implicit migration, `latest` alias, or V1 reinterpretation is permitted. V1 public requests, results, errors, plans, events, and locked evidence retain their original replay meaning. A distinct V2 public request/result/error contract is a later gate.

## Exact ordered R1 research representation

The following JSON array is the complete R1 candidate. Profile and slot order are significant. Within each `energy` and `complexity` array, rows are ordered `very-low`, `low`, `medium`, `high`, `very-high`; vector positions align with `candidates`. Octave candidates are numbers. These are profile-owned Energy weights and Complexity additions, with **no third base-weight array**.

```json
[
  {"profileId":"dark-synthwave","slots":[
    {"slot":"rate","candidates":["eighth","sixteenth"],"energy":[[5,1],[4,2],[3,5],[2,6],[1,7]],"complexity":[[0,0],[0,0],[0,0],[0,0],[0,0]]},
    {"slot":"octave-range","candidates":[1,2],"energy":[[2,5],[2,5],[2,5],[2,5],[2,5]],"complexity":[[6,0],[3,0],[0,0],[0,2],[0,4]]},
    {"slot":"direction","candidates":["down-up","down","up-down"],"energy":[[6,4,1],[6,4,1],[6,4,1],[6,4,1],[6,4,1]],"complexity":[[0,2,1],[0,1,1],[0,0,0],[1,0,4],[2,0,8]]},
    {"slot":"mask","candidates":["three-of-four","full"],"energy":[[9,2],[7,4],[4,5],[3,4],[1,3]],"complexity":[[0,0],[0,0],[0,0],[0,0],[0,0]]},
    {"slot":"gate","candidates":["short","medium"],"energy":[[4,7],[4,6],[4,4],[5,3],[6,1]],"complexity":[[0,0],[0,0],[0,0],[0,0],[0,0]]}
  ]},
  {"profileId":"classic-synthwave","slots":[
    {"slot":"rate","candidates":["eighth","sixteenth"],"energy":[[5,1],[4,1],[3,5],[2,5],[1,7]],"complexity":[[0,0],[0,0],[0,0],[0,0],[0,0]]},
    {"slot":"octave-range","candidates":[1,2],"energy":[[5,2],[4,3],[3,5],[2,6],[2,7]],"complexity":[[6,0],[0,0],[0,0],[0,0],[1,4]]},
    {"slot":"direction","candidates":["up","up-down","down-up"],"energy":[[6,3,1],[6,3,1],[6,3,1],[6,3,1],[6,3,1]],"complexity":[[2,1,0],[1,1,0],[0,1,0],[0,5,5],[2,6,9]]},
    {"slot":"mask","candidates":["three-of-four","full"],"energy":[[6,2],[5,2],[3,6],[2,7],[1,8]],"complexity":[[0,0],[0,0],[0,0],[0,0],[0,0]]},
    {"slot":"gate","candidates":["short","medium"],"energy":[[5,9],[5,7],[4,5],[5,6],[6,3]],"complexity":[[0,0],[0,0],[0,0],[0,0],[0,0]]}
  ]},
  {"profileId":"darkwave","slots":[
    {"slot":"rate","candidates":["quarter","eighth"],"energy":[[6,2],[5,3],[3,6],[2,7],[1,8]],"complexity":[[0,0],[0,0],[0,0],[0,0],[0,0]]},
    {"slot":"octave-range","candidates":[1,2],"energy":[[7,1],[7,1],[7,1],[7,1],[7,1]],"complexity":[[1,0],[1,1],[0,1],[0,2],[0,3]]},
    {"slot":"direction","candidates":["up","down","up-down"],"energy":[[7,5,1],[7,5,1],[7,5,1],[7,5,1],[7,5,1]],"complexity":[[7,0,1],[4,0,1],[0,0,1],[0,0,2],[0,0,3]]},
    {"slot":"mask","candidates":["one-of-four","alternating-on-rest","alternating-rest-on"],"energy":[[7,2,1],[6,3,2],[4,6,3],[3,7,4],[2,8,5]],"complexity":[[2,1,0],[1,1,0],[0,1,1],[0,1,2],[0,1,3]]},
    {"slot":"gate","candidates":["medium","long"],"energy":[[2,7],[3,6],[4,5],[6,3],[7,2]],"complexity":[[0,0],[0,0],[0,0],[0,0],[0,0]]}
  ]},
  {"profileId":"midtempo-cyberpunk","slots":[
    {"slot":"rate","candidates":["eighth","sixteenth"],"energy":[[8,2],[7,6],[4,4],[4,7],[2,5]],"complexity":[[0,0],[0,0],[0,0],[0,0],[0,0]]},
    {"slot":"octave-range","candidates":[1,2],"energy":[[4,4],[4,4],[4,4],[4,4],[4,4]],"complexity":[[2,0],[1,0],[0,0],[0,1],[0,5]]},
    {"slot":"direction","candidates":["down-up","up-down","down","up"],"energy":[[5,5,2,2],[5,5,2,2],[5,5,2,2],[5,5,2,2],[5,5,2,2]],"complexity":[[0,0,3,6],[1,0,1,3],[1,1,0,0],[4,4,0,1],[3,3,0,0]]},
    {"slot":"mask","candidates":["three-of-four","alternating-on-rest","alternating-rest-on"],"energy":[[3,5,4],[4,5,5],[5,5,5],[9,6,6],[8,5,5]],"complexity":[[2,1,0],[0,0,0],[0,1,1],[0,1,2],[0,1,3]]},
    {"slot":"gate","candidates":["short"],"energy":[[1],[1],[1],[1],[1]],"complexity":[[0],[0],[0],[0],[0]]}
  ]}
]
```

For reconstruction, parse the JSON block above and serialize the ordered array as UTF-8 `JSON.stringify(array)` with no whitespace or trailing newline. Preserve object-key order `profileId, slots` for each profile and `slot, candidates, energy, complexity` for each slot. For an individual profile, serialize that profile object alone by the same rule. This SHA-256 is an evaluation/research fingerprint, **not** a canonical persistence format.

| Research representation | SHA-256 |
|---|---|
| Complete ordered R1 array | `b6f7ee16f33cf649ae2c6f06e4b5eecf859409b1917e2bc641323857fc1956e8` |
| Dark Synthwave object | `907e2c748535a39b23f0ec26f8d77e5ff7b6a93b23eddacb8f348ee8486cb6b4` |
| Classic Synthwave object | `31933d15f86e8db447ca2c10c2bb931dd150ede063e7e85f20cdac8a08c11154` |
| Darkwave object | `66d87c2e2624bc19ca86e411fca8b3e05462c07b05b4e6644cccede2274f09af` |
| Midtempo Cyberpunk object | `65c975412e009ac58a058765c06ffd71490de0983a165b3a4c7d3e233943a4f5` |

## Construction and preserved boundaries

For profile `p`, slot `s`, Energy `e`, Complexity `c`, and candidate index `i`, `finalWeight[p,s,e,c,i] = energyWeights[p,s,e,i] + complexityAdditions[p,s,c,i]`. The 4 profiles × 5 slots × 5 Energy rows × 5 Complexity rows form exactly **500** nonempty ordered effective lists. All source entries are exact finite safe nonnegative integers; every vector is candidate-aligned. Every derived R1 weight is in **1..14** and every derived R1 list total is in **1..27**. Candidate membership, numeric octave types, subsets, and order equal V1 exactly. No interpolation, normalization, rescaling, sorting, or candidate removal occurs. Future validation must match the literal R1 structure and values, not merely these numeric bounds.

These R1 ranges are distinct from immutable V1's observed **1..10** final weights and **1..20** totals, and from the unchanged shared Stage 7C2 primitive bounds of **0..65,535** per weight and **1..65,535** per total. The shared primitive retains zero-weight semantics; V1 validation is not loosened. R1 happens to use only positive final weights. The unchanged selection path remains five ordered draws, including Midtempo's singleton gate: rate → octave-range → direction → mask → gate. Component-seed derivation, Mulberry32, modulo weighted selection with half-open intervals, gate lookup, density masks, the projector, Harmony pitch ownership, and `ArpEvent` remain unchanged. R1 adds no PRNG draw.

Direct comparison with the accepted V1 literal fixture establishes all **20 medium/medium effective lists** and all **40 individual medium rows** unchanged. With Complexity `medium`, Darkwave's five Energy levels across all five slots produce the same **25 effective lists** as V1. Given identical root-seed derivation, selector, and projector mechanics, each of these equal-list settings preserves the corresponding plan and events for **every** root seed. This guarantee does not extend to changed off-center settings.

## Complete V1 → R1 change ledger

The table records every changed Energy or Complexity row; other rows are identical to V1. Levels use the exact aliases `VL`, `L`, `M`, `H`, `VH`. Each vector retains candidate order from the dataset above.

| Profile | Slot | Axis | Level | V1 vector | R1 vector |
|---|---|---|---|---|---|
| Dark Synthwave | octave-range | Complexity | VL | `[2,0]` | `[6,0]` |
| Dark Synthwave | octave-range | Complexity | L | `[1,0]` | `[3,0]` |
| Dark Synthwave | octave-range | Complexity | H | `[0,1]` | `[0,2]` |
| Dark Synthwave | octave-range | Complexity | VH | `[0,2]` | `[0,4]` |
| Dark Synthwave | direction | Complexity | VL | `[0,1,0]` | `[0,2,1]` |
| Dark Synthwave | direction | Complexity | L | `[0,0,0]` | `[0,1,1]` |
| Dark Synthwave | direction | Complexity | H | `[1,0,1]` | `[1,0,4]` |
| Dark Synthwave | direction | Complexity | VH | `[2,0,2]` | `[2,0,8]` |
| Dark Synthwave | mask | Energy | VL | `[6,2]` | `[9,2]` |
| Dark Synthwave | mask | Energy | L | `[5,3]` | `[7,4]` |
| Dark Synthwave | mask | Energy | H | `[3,6]` | `[3,4]` |
| Dark Synthwave | mask | Energy | VH | `[2,7]` | `[1,3]` |
| Dark Synthwave | gate | Energy | VL | `[2,6]` | `[4,7]` |
| Dark Synthwave | gate | Energy | L | `[3,5]` | `[4,6]` |
| Dark Synthwave | gate | Energy | VH | `[6,2]` | `[6,1]` |
| Classic Synthwave | rate | Energy | L | `[4,2]` | `[4,1]` |
| Classic Synthwave | rate | Energy | H | `[2,6]` | `[2,5]` |
| Classic Synthwave | octave-range | Energy | VH | `[1,7]` | `[2,7]` |
| Classic Synthwave | octave-range | Complexity | VL | `[0,0]` | `[6,0]` |
| Classic Synthwave | octave-range | Complexity | VH | `[0,0]` | `[1,4]` |
| Classic Synthwave | direction | Complexity | VL | `[2,0,0]` | `[2,1,0]` |
| Classic Synthwave | direction | Complexity | L | `[1,0,0]` | `[1,1,0]` |
| Classic Synthwave | direction | Complexity | H | `[0,2,1]` | `[0,5,5]` |
| Classic Synthwave | direction | Complexity | VH | `[0,3,2]` | `[2,6,9]` |
| Classic Synthwave | mask | Energy | L | `[5,3]` | `[5,2]` |
| Classic Synthwave | gate | Energy | VL | `[2,6]` | `[5,9]` |
| Classic Synthwave | gate | Energy | L | `[3,5]` | `[5,7]` |
| Classic Synthwave | gate | Energy | H | `[5,4]` | `[5,6]` |
| Darkwave | octave-range | Complexity | L | `[0,0]` | `[1,1]` |
| Darkwave | direction | Complexity | VL | `[1,0,0]` | `[7,0,1]` |
| Darkwave | direction | Complexity | L | `[0,1,0]` | `[4,0,1]` |
| Midtempo Cyberpunk | rate | Energy | VL | `[5,2]` | `[8,2]` |
| Midtempo Cyberpunk | rate | Energy | L | `[4,3]` | `[7,6]` |
| Midtempo Cyberpunk | rate | Energy | H | `[3,5]` | `[4,7]` |
| Midtempo Cyberpunk | rate | Energy | VH | `[2,6]` | `[2,5]` |
| Midtempo Cyberpunk | octave-range | Complexity | VH | `[0,2]` | `[0,5]` |
| Midtempo Cyberpunk | direction | Complexity | VL | `[0,0,1,1]` | `[0,0,3,6]` |
| Midtempo Cyberpunk | direction | Complexity | L | `[0,0,1,0]` | `[1,0,1,3]` |
| Midtempo Cyberpunk | direction | Complexity | H | `[2,2,0,0]` | `[4,4,0,1]` |
| Midtempo Cyberpunk | mask | Energy | VL | `[2,5,4]` | `[3,5,4]` |
| Midtempo Cyberpunk | mask | Energy | L | `[3,5,4]` | `[4,5,5]` |
| Midtempo Cyberpunk | mask | Energy | H | `[7,4,5]` | `[9,6,6]` |
| Midtempo Cyberpunk | mask | Energy | VH | `[8,3,5]` | `[8,5,5]` |
| Midtempo Cyberpunk | mask | Complexity | L | `[1,1,0]` | `[0,0,0]` |

| Profile | Changed rows | Changed integers |
|---|---:|---:|
| Dark Synthwave | 15 | 21 |
| Classic Synthwave | 13 | 19 |
| Darkwave | 3 | 7 |
| Midtempo Cyberpunk | 13 | 23 |
| **Total** | **44** | **70** |

The other **156 of 200** source rows are unchanged. Dark Synthwave adjusts off-center octave/direction Complexity and mask/gate Energy. Classic Synthwave changes off-center rate, octave, direction, mask, and gate rows while retaining a compressed very-low to low Energy transition. Darkwave changes only three off-center Complexity rows and keeps the complete medium-Complexity Energy control. Midtempo Cyberpunk adjusts rate/mask Energy and octave/direction/mask Complexity to improve intent separation. These are joint-table research controls and do not establish that any individual edit independently caused a measured gain.

## Deterministic research evidence and limitations

The Dark Synthwave, Classic Synthwave, and Darkwave controls were recovered from exact prior research representations. Development used root seeds `0..1023`; the bounded Midtempo search evaluated **30,000 distinct tables**. Three complete finalists were frozen before one fresh validation on roots `1024..2047`; no retuning followed. R1 was chosen for balanced primary gains rather than the lowest aggregate collision total. Roots `0..2047` are now examined evidence and cannot be described as an untouched population for adaptive follow-up tuning. The comparisons use the four accepted golden Harmony contexts and Arpeggiator range `0..127`. Correlated deterministic comparisons across seeds and settings are not independent statistical trials. No candidate listening occurred, and no numerical musical-acceptance threshold exists.

Fresh-validation Midtempo collision counts below are each out of **1,024 roots**. The tuple is `(very-low vs medium, medium vs very-high, very-low vs very-high, all three)`; Energy comparisons fix Complexity at medium and Complexity comparisons fix Energy at medium.

| Midtempo comparison | V1 | R1 |
|---|---|---|
| Energy plan/event collisions | `(176,252,122,35)` | `(166,158,107,15)` |
| Complexity plan collisions | `(127,60,72,9)` | `(33,58,41,2)` |
| Complexity event collisions | `(129,73,81,13)` | `(39,66,49,4)` |
| Event collisions across 40 adjacent relationships | `9972/40960` | `4929/40960` |

Across the 40 fresh Midtempo adjacent **event** relationships, 28 improve, 3 tie, and **9 regress**. The complete nine regressions, each out of 1,024 roots, are:

| Axis | Fixed other level | Adjacent pair | V1 → R1 event collisions |
|---|---|---|---:|
| Energy | Complexity VL | L–M | 166 → 180 |
| Energy | Complexity L | L–M | 170 → 194 |
| Energy | Complexity H | L–M | 167 → 182 |
| Complexity | Energy L | VL–L | 40 → 46 |
| Complexity | Energy M | M–H | 53 → 61 |
| Complexity | Energy M | H–VH | 60 → 61 |
| Complexity | Energy H | VL–L | 55 → 56 |
| Complexity | Energy H | M–H | 59 → 71 |
| Complexity | Energy VH | H–VH | 76 → 80 |

These event regressions are distinct from plan regressions. R1 does **not** universally dominate V1. Midtempo root seed `0` still gives identical Energy medium and very-high output. R1 does not guarantee distinct or monotonic output for every intent change. Classic Synthwave retains compressed very-low to low Energy movement and nearly flat intermediate Complexity pitch-span behavior. Darkwave retains a small very-low to very-high Complexity **event** collision regression in fresh validation, `66/1024 → 70/1024`. Event count under Complexity is not a musical-complexity score. Broader Harmony/range generalization and perceptual benefit are unproven. Lower collision counts alone do not establish musical improvement or final Stage 7 acceptance.

## Later gates

Before implementation, literal V2 data validation must reproduce this exact candidate structure and fingerprint, independently construct and compare all 500 lists, and prove center and Darkwave Energy anchors. Tests must preserve V1 public replay and negative-path behavior, reject both incompatible version pairs, prove the fixed five-draw schedule and deterministic replay without extra PRNG consumption, and reproduce the relevant candidate diagnostics. A separately reviewed exact V2 public request/result/error boundary is required before runtime; V2 implementation and aggregate provenance remain separate.

Before musical acceptance, a separately designed matched V1/R1 evaluation must use the same Harmony contexts and matched roots while preserving the original locked V1 evidence. Version identity should be blinded and counterbalanced where feasible. It must assess individual usability and Energy/Complexity comparisons across all four profiles, include intermediate low–medium and medium–high relationships, explicitly cover the disclosed Midtempo and control-profile qualifications, and avoid cherry-picking roots to hide retained collisions. This record neither designs that experiment nor creates its artifacts. Stage 7 remains open and Stage 8 unauthorized.
