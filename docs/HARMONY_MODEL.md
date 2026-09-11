# V1 Harmony policy contract (Stage 4A)

This document originated as the documentation-only Stage 4A Harmony policy boundary; Stage 4A itself authorized no implementation. Separately reviewed Stage 4B1, Stage 4B2, and Stage 4B3 slices now implement bounded portions of this contract, while remaining future Harmony behavior remains separately gated. Canonical musical validity remains deterministic and uses the existing `Key`, `Scale`, `PitchClass`, `ChordQuality`, `Chord`, `ChordInversion`, `ChordVoicing`, and `nightdrive.prng.mulberry32.v1` contracts.

## Versioned template representation

`nightdrive.harmony-template.v1` identifies a template by `{id, version}` and contains ordered slots. Each executable slot has `degree` (zero-based scale degree), exactly one explicit `quality: ChordQuality` from the V1 vocabulary, `bars` (positive integer span), and an optional `inversions` restriction (subset of `0..2`). Profile weights, preference ordering, tension (`0..1`), movement (`static|stepwise|mixed`), cadence tendency, and explanation labels are profile metadata, not template identity. Templates contain no realized MIDI pitches.

An 8-bar plan has slots whose positive bar spans sum to 8. Stable IDs and explicit array order define identity; object-key or discovery order never does.

## Degree-to-Chord mapping

Execution validates the template/version and requested Key/Scale context, projects each explicit degree through the existing Scale/Key contract, reads that slot's single explicit `ChordQuality`, and constructs the existing `Chord(root, quality)`. The six supported scales (major, natural minor, harmonic minor, melodic minor, Dorian, Phrygian) use their existing formulas without additional inference. A degree outside `0..6`, a scale outside the template context, a missing/invalid slot quality, or a quality/formula that cannot construct a Chord is an `UNSUPPORTED_TEMPLATE` validation failure; no quality-list selection, stacking-thirds rule, display label, mode convention, genre heuristic, substitution, or coercion is permitted.

## Bounded initial profile data

The conceptual progression families are identified by the stable opaque IDs `degree-0344`, `degree-0654`, and `degree-0340`. Their character sequences, including numeric characters, are not normative encodings of ordered scale degrees: implementations must compare IDs exactly for lookup/version identity and must never parse them to derive or validate slots. The explicit ordered slot array below is the sole normative source for degree sequence and quality. IDs remain stable unless changed by a separately versioned contract or migration. Every slot below has one exact quality, so no implementation infers quality.

| Variant ID/version | Scale | Ordered slots `(degree, quality, bars)` |
|---|---|---|
| `degree-0344-major-v1` | major | `(0,major-triad,2),(3,major-triad,2),(4,major-triad,2),(0,major-triad,2)` |
| `degree-0344-natural-minor-v1` | natural minor | `(0,minor-triad,2),(3,minor-triad,2),(4,major-triad,2),(0,minor-triad,2)` |
| `degree-0344-harmonic-minor-v1` | harmonic minor | `(0,minor-triad,2),(3,minor-triad,2),(4,major-triad,2),(0,minor-triad,2)` |
| `degree-0344-melodic-minor-v1` | melodic minor | `(0,minor-triad,2),(3,major-triad,2),(4,major-triad,2),(0,minor-triad,2)` |
| `degree-0344-dorian-v1` | Dorian | `(0,minor-triad,2),(3,major-triad,2),(4,minor-triad,2),(0,minor-triad,2)` |
| `degree-0344-phrygian-v1` | Phrygian | `(0,minor-triad,2),(3,major-triad,2),(4,minor-triad,2),(0,minor-triad,2)` |
| `degree-0654-major-v1` | major | `(0,major-triad,2),(6,diminished-triad,2),(5,major-triad,2),(4,major-triad,2)` |
| `degree-0654-natural-minor-v1` | natural minor | `(0,minor-triad,2),(6,major-triad,2),(5,major-triad,2),(4,major-triad,2)` |
| `degree-0654-harmonic-minor-v1` | harmonic minor | `(0,minor-triad,2),(6,major-triad,2),(5,major-triad,2),(4,major-triad,2)` |
| `degree-0654-melodic-minor-v1` | melodic minor | `(0,minor-triad,2),(6,major-triad,2),(5,major-triad,2),(4,major-triad,2)` |
| `degree-0654-dorian-v1` | Dorian | `(0,minor-triad,2),(6,major-triad,2),(5,major-triad,2),(4,minor-triad,2)` |
| `degree-0654-phrygian-v1` | Phrygian | `(0,minor-triad,2),(6,major-triad,2),(5,major-triad,2),(4,minor-triad,2)` |
| `degree-0340-major-v1` | major | `(0,major-triad,2),(3,major-triad,2),(4,major-triad,2),(0,major-triad,2)` |
| `degree-0340-natural-minor-v1` | natural minor | `(0,minor-triad,2),(3,minor-triad,2),(4,major-triad,2),(0,minor-triad,2)` |
| `degree-0340-harmonic-minor-v1` | harmonic minor | `(0,minor-triad,2),(3,minor-triad,2),(4,major-triad,2),(0,minor-triad,2)` |
| `degree-0340-melodic-minor-v1` | melodic minor | `(0,minor-triad,2),(3,major-triad,2),(4,major-triad,2),(0,minor-triad,2)` |
| `degree-0340-dorian-v1` | Dorian | `(0,minor-triad,2),(3,major-triad,2),(4,minor-triad,2),(0,minor-triad,2)` |
| `degree-0340-phrygian-v1` | Phrygian | `(0,minor-triad,2),(3,major-triad,2),(4,minor-triad,2),(0,minor-triad,2)` |

Profile policy is bounded production guidance, not an objective genre definition:

| Profile | Concrete template IDs in preference order | Scales | Tension | Movement | Inversions | Voicing/register | Cadence |
|---|---|---|---|---|---|---|---|
| Dark Synthwave | `degree-0654-natural-minor-v1`, `degree-0344-harmonic-minor-v1`, `degree-0340-dorian-v1` | natural minor, harmonic minor, Dorian | 0.55–0.85 | stepwise/mixed | all; final slot 0 preferred | each pitch 36–84; span ≤24 | strong return |
| Classic Synthwave | `degree-0344-major-v1`, `degree-0340-major-v1`, `degree-0344-natural-minor-v1`, `degree-0340-dorian-v1` | major, natural minor, Dorian | 0.35–0.70 | mixed | all; first slot 0 preferred | each pitch 40–88; span ≤24 | clear tonic |
| Darkwave | `degree-0654-natural-minor-v1`, `degree-0340-phrygian-v1`, `degree-0344-dorian-v1` | natural minor, Phrygian, Dorian | 0.60–0.90 | stepwise | 0/1/2; cadence 0 or 1 | each pitch 34–80; span ≤22 | modal/tonic |
| Midtempo Cyberpunk | `degree-0654-phrygian-v1`, `degree-0344-harmonic-minor-v1`, `degree-0340-natural-minor-v1` | Phrygian, harmonic minor, natural minor | 0.50–0.85 | mixed | all; avoid repeated inversion when alternatives exist | each pitch 38–86; span ≤26 | unresolved or tonic |

The listed order is the deterministic preference order and serves as the V1 relative weight. No random choice is needed unless a later seeded variation request is authorized.

## Inversion and voicing policy

All `ChordInversion` values `0..2` are candidates unless a template/profile restriction removes one. First-slot and cadence preferences are soft score terms; invalid candidates are removed as hard failures. A candidate must be a valid `ChordVoicing`, have each pitch in the profile register range, and satisfy the profile maximum span. Candidate enumeration is ascending by `(midiPitches[0], midiPitches[1], midiPitches[2])`, with octave search limited to the profile range. Chord and inversion remain separate values.

## Voice-leading and tie-breaks

For adjacent voicings `a` and `b`, V1 cost is the integer
`abs(bassΔ) + abs(middleΔ) + abs(topΔ)`.
No additional penalty is normative in V1. Select the minimum cost, then break ties by: (1) lower maximum pitch, (2) lower bass pitch, (3) lower middle pitch, (4) lower top pitch, (5) lower template slot order. This order is explicit and independent of runtime iteration.

For this adjacent single-slot selection, lower template slot order is inapplicable. Because `ChordVoicing` is strictly ascending, top pitch equals maximum pitch; the lower-top comparison is therefore redundant and requires no separate fixture.

Example: `[48,52,55] → [50,53,57]` costs `2+1+2=5`; `[48,52,55] → [48,55,60]` costs `0+3+5=8`, so the first wins. For the same target C-major Chord with the same unrestricted inversion and register/span constraints, `[48,55,64]` costs `0+3+9=12` and `[52,55,60]` costs `4+3+5=12`; both are valid three-member voicings, and lower maximum pitch selects `[52,55,60]` (60 < 64).

## Seeded variation

Only profile-approved alternatives remaining after hard validation may be selected with the existing versioned PRNG and the full seed/profile/template/context/version lineage. Hard constraints are never bypassed. Bounded-choice helpers, streams, forks, and seed derivation remain separately deferred.

## Unsatisfiable behavior

Future execution returns a structured non-canonical result with one or more stable reasons: `NO_TEMPLATE`, `NO_CHORD`, `NO_INVERSION`, `NO_VOICING`, or `NO_PROGRESSION`. It must not widen range, change key/scale/quality, remove constraints, or substitute unsupported harmony. Soft-preference fallback is allowed only among hard-valid candidates and is recorded.

## Decision/provenance record

The future engine emits a machine-readable record containing `schema`, `engineVersion`, `profileId/version`, `templateId/version`, input key/scale, slot/degree/root, Chord identity, inversion index, selected voicing, voice-leading cost, candidate ordering/tie-break code, seed and PRNG version reference, warnings, and unsatisfiable reasons. This explains selection but is not canonical composition state and does not duplicate embedded primitive state unnecessarily.

## Worked examples and evidence

In C major, `degree-0340-major-v1` maps degrees `0,3,4,0` to roots `0,5,7,0`, with qualities `major-triad, major-triad, major-triad, major-triad`. The complete A-natural-minor fixture for `degree-0340-natural-minor-v1` is:

| Slot | Degree | Root | Quality | Canonical members | Inversion | Voicing | Projected classes |
|---|---:|---:|---|---|---:|---|---|
| 1 | 0 | 9 | `minor-triad` | `[9,0,4]` | 0 | `[45,48,52]` | `[9,0,4]` |
| 2 | 3 | 2 | `minor-triad` | `[2,5,9]` | 1 | `[53,57,62]` | `[5,9,2]` |
| 3 | 4 | 4 | `major-triad` | `[4,8,11]` | 1 | `[56,59,64]` | `[8,11,4]` |
| 4 | 0 | 9 | `minor-triad` | `[9,0,4]` | 0 | `[45,48,52]` | `[9,0,4]` |

Each row has exactly the listed canonical members once; its lowest projected class is the member selected by the listed inversion, so both Chord membership and ChordInversion compatibility hold.

For B diminished root `11`, members are `[11,2,5]`; voicing `[50,53,59]` projects `[2,5,11]` and therefore uses inversion `1`, preserving canonical member order. An impossible register requiring three distinct pitches inside a one-semitone range returns `NO_VOICING`. Future validation must cover every profile/template/scale combination, compatibility and inversion invariants, replay, tie-breaks, seeded fixtures, wrapped classes, property checks, and preliminary human musical-quality review; human review evaluates usefulness and style, not deterministic correctness.

## Stage 4B4 progression realization contract

Stage 4B4 realizes one validated profile/template/Key context as an ordered, sequential progression. It validates the template and scale context, realizes each explicit slot into its existing `Chord`, obtains that slot's hard-valid candidates from Stage 4B2, and selects one candidate without regenerating or relaxing constraints. The process is greedy and adjacent: slot 1 establishes an anchor, and each later slot uses the previous selected voicing with the Stage 4B3 cost and selection rules. It is not lookahead, dynamic programming, global optimization, or progression-wide scoring.

For the first slot, there is no previous voicing. After hard validation, the deterministic anchor is selected by the applicable profile soft-preference rank, then the lexicographically lowest `(midiPitches[0], midiPitches[1], midiPitches[2])` tuple. Classic Synthwave's first-slot root-position preference ranks inversion `0` first; profiles without a first-slot preference use equal ranks. Template inversion restrictions remain hard and are applied before this choice.

For each later slot, hard-valid candidates are selected by lowest adjacent voice-leading cost first. Profile soft preferences are considered only after equal cost and before the Stage 4B3 pitch tie-break tuple; they never override hard constraints or a lower cost. The V1 preference ranks are: Dark Synthwave final-slot inversion `0` preferred; Classic Synthwave has no later-slot preference; Darkwave final/cadence inversion `0`, then `1`, preferred over `2`; Midtempo Cyberpunk prefers a non-repeated inversion when one exists at equal cost, otherwise retains the repeated inversion. Remaining ties use lower maximum pitch, bass, middle, then top; lower template-slot order is inapplicable within one slot.

Template-level inversion restrictions intersect with profile-allowed inversions before candidate enumeration. Chord, ChordInversion, ChordVoicing, membership, register, span, and compatibility validation remain delegated to the existing primitives and Stage 4B2 runtime. A slot's `bars` value is copied unchanged into the ordered realization; no raw MIDI events or canonical timing are created.

The minimum result is an immutable non-canonical ordered record containing the validated profile/template identity, Key context, and one entry per template slot with its degree, `bars`, Chord identity, selected inversion, selected ChordVoicing, adjacent voice-leading cost (absent for the first slot), and deterministic preference/tie-break rationale. Chords, inversions, voicings, and timing remain separate values; derived membership is not duplicated.

Specific failures propagate unchanged: malformed or unsupported templates use `NO_TEMPLATE`, invalid Chord realization uses `NO_CHORD`, an empty permitted inversion set uses `NO_INVERSION`, and an empty hard-valid voicing set uses `NO_VOICING`. `NO_PROGRESSION` is reserved for an aggregate-level inability to produce the ordered result after those slot-level validations; it must not replace a more specific failure or relax constraints.

Determinism requires fixed slot order, fixed profile preference ranks, explicit tuple tie-breaks, immutable output, and no ambient time, randomness, locale-sensitive ordering, or object/discovery order. Deterministic tests can prove validation, ordering, candidate compatibility, costs, preference ranks, repeatability, and failure propagation. Human musical review is still required for usefulness, style, cadence feel, and profile fit; it does not redefine deterministic correctness.
