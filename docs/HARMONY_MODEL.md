# V1 Harmony policy contract (Stage 4A)

This document defines the documentation-only Stage 4A boundary. It authorizes no Harmony implementation. Canonical musical validity remains deterministic and uses the existing `Key`, `Scale`, `PitchClass`, `ChordQuality`, `Chord`, `ChordInversion`, `ChordVoicing`, and `nightdrive.prng.mulberry32.v1` contracts.

## Versioned template representation

`nightdrive.harmony-template.v1` identifies a template by `{id, version}` and contains ordered slots. Each executable slot has `degree` (zero-based scale degree), exactly one explicit `quality: ChordQuality` from the V1 vocabulary, `bars` (positive integer span), and an optional `inversions` restriction (subset of `0..2`). Profile weights, preference ordering, tension (`0..1`), movement (`static|stepwise|mixed`), cadence tendency, and explanation labels are profile metadata, not template identity. Templates contain no realized MIDI pitches.

An 8-bar plan has slots whose positive bar spans sum to 8. Stable IDs and explicit array order define identity; object-key or discovery order never does.

## Degree-to-Chord mapping

Execution validates the template/version and requested Key/Scale context, projects each explicit degree through the existing Scale/Key contract, reads that slot's single explicit `ChordQuality`, and constructs the existing `Chord(root, quality)`. The six supported scales (major, natural minor, harmonic minor, melodic minor, Dorian, Phrygian) use their existing formulas without additional inference. A degree outside `0..6`, a scale outside the template context, a missing/invalid slot quality, or a quality/formula that cannot construct a Chord is an `UNSUPPORTED_TEMPLATE` validation failure; no quality-list selection, stacking-thirds rule, display label, mode convention, genre heuristic, substitution, or coercion is permitted.

## Bounded initial profile data

The conceptual progression families are `degree-0344`, `degree-0654`, and `degree-0340`; executable templates are neutral, scale-specific variants. Every slot below has one exact quality, so no implementation infers quality.

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
| 2 | 3 | 0 | `minor-triad` | `[0,3,7]` | 1 | `[51,55,60]` | `[3,7,0]` |
| 3 | 4 | 4 | `major-triad` | `[4,8,11]` | 1 | `[56,59,64]` | `[8,11,4]` |
| 4 | 0 | 9 | `minor-triad` | `[9,0,4]` | 0 | `[45,48,52]` | `[9,0,4]` |

Each row has exactly the listed canonical members once; its lowest projected class is the member selected by the listed inversion, so both Chord membership and ChordInversion compatibility hold.

For B diminished root `11`, members are `[11,2,5]`; voicing `[50,53,59]` projects `[2,5,11]` and therefore uses inversion `1`, preserving canonical member order. An impossible register requiring three distinct pitches inside a one-semitone range returns `NO_VOICING`. Future validation must cover every profile/template/scale combination, compatibility and inversion invariants, replay, tie-breaks, seeded fixtures, wrapped classes, property checks, and preliminary human musical-quality review; human review evaluates usefulness and style, not deterministic correctness.
