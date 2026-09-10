# V1 Harmony policy contract (Stage 4A)

This document defines the documentation-only Stage 4A boundary. It authorizes no Harmony implementation. Canonical musical validity remains deterministic and uses the existing `Key`, `Scale`, `PitchClass`, `ChordQuality`, `Chord`, `ChordInversion`, `ChordVoicing`, and `nightdrive.prng.mulberry32.v1` contracts.

## Versioned template representation

`nightdrive.harmony-template.v1` identifies a template by `{id, version}` and contains ordered slots. Each slot has `degree` (zero-based scale degree), an allowed `qualities` list, `bars` (positive integer span), and optional `inversions` (subset of `0..2`). Profile weights, preference ordering, tension (`0..1`), movement (`static|stepwise|mixed`), cadence tendency, and explanation labels are profile metadata, not template identity. Templates contain no realized MIDI pitches.

An 8-bar plan has slots whose positive bar spans sum to 8. Stable IDs and explicit array order define identity; object-key or discovery order never does.

## Degree-to-Chord mapping

For a validated `Key`, obtain the scale's degree pitch class through the existing scale projection, then construct `Chord(root, quality)` using the slot's explicitly allowed quality. The six supported scales (major, natural minor, harmonic minor, melodic minor, Dorian, Phrygian) use their existing formulas without additional diatonic inference. A degree outside `0..6`, a quality not listed by the slot, or a quality/formula that cannot construct a Chord is an `UNSUPPORTED_TEMPLATE` validation failure; no substitution is permitted.

## Bounded initial profile data

The four V1 profiles use these shared triad-only templates unless a profile-specific ordering is shown:

| Template | Slots (degree/quality/bars) | Character |
|---|---|---|
| `i-vI-iv-v` | `0/major\|minor/2`, `5/major\|minor/2`, `3/major\|minor/2`, `4/major\|minor/2` | loop/cadence |
| `i-vII-vI-v` | `0/major\|minor/2`, `6/major\|minor/2`, `5/major\|minor/2`, `4/major\|minor/2` | descending tension |
| `i-iv-v-i` | `0/major\|minor/2`, `3/major\|minor/2`, `4/major\|minor/2`, `0/major\|minor/2` | tonic return |

Profile policy is bounded production guidance, not an objective genre definition:

| Profile | Templates/order | Scales | Tension | Movement | Inversions | Voicing/register | Cadence |
|---|---|---|---|---|---|---|---|
| Dark Synthwave | `i-vI-iv-v`, `i-vII-vI-v`, `i-iv-v-i` | natural minor, harmonic minor, Dorian | 0.55–0.85 | stepwise/mixed | all; final slot 0 preferred | each pitch 36–84; span ≤24 | strong return |
| Classic Synthwave | `i-vI-iv-v`, `i-iv-v-i` | major, natural minor, Dorian | 0.35–0.70 | mixed | all; first slot 0 preferred | each pitch 40–88; span ≤24 | clear tonic |
| Darkwave | `i-vII-vI-v`, `i-iv-v-i`, `i-vI-iv-v` | natural minor, Phrygian, Dorian | 0.60–0.90 | stepwise | 0/1/2; cadence 0 or 1 | each pitch 34–80; span ≤22 | modal/tonic |
| Midtempo Cyberpunk | `i-vII-vI-v`, `i-vI-iv-v`, `i-iv-v-i` | Phrygian, harmonic minor, natural minor | 0.50–0.85 | mixed | all; avoid repeated inversion when alternatives exist | each pitch 38–86; span ≤26 | unresolved or tonic |

Weights are represented by this explicit preference order for V1; no random choice is needed unless a later seeded variation request is authorized. Quality selection must remain explicit in a concrete template version; the `major|minor` shorthand above means the profile publishes one concrete variant per selected scale/degree context and rejects unsupported combinations rather than inferring quality.

## Inversion and voicing policy

All `ChordInversion` values `0..2` are candidates unless a template/profile restriction removes one. First-slot and cadence preferences are soft score terms; invalid candidates are removed as hard failures. A candidate must be a valid `ChordVoicing`, have each pitch in the profile register range, and satisfy the profile maximum span. Candidate enumeration is ascending by `(midiPitches[0], midiPitches[1], midiPitches[2])`, with octave search limited to the profile range. Chord and inversion remain separate values.

## Voice-leading and tie-breaks

For adjacent voicings `a` and `b`, V1 cost is the integer
`abs(bassΔ) + abs(middleΔ) + abs(topΔ)`.
No additional penalty is normative in V1. Select the minimum cost, then break ties by: (1) lower maximum pitch, (2) lower bass pitch, (3) lower middle pitch, (4) lower top pitch, (5) lower template slot order. This order is explicit and independent of runtime iteration.

Example: `[48,52,55] → [50,53,57]` costs `2+1+2=5`; `[48,52,55] → [48,55,60]` costs `0+3+5=8`, so the first wins. If `[48,52,55] → [50,53,57]` and `[49,53,58]` both cost 5, lower maximum pitch selects `[50,53,57]`.

## Seeded variation

Only profile-approved alternatives remaining after hard validation may be selected with the existing versioned PRNG and the full seed/profile/template/context/version lineage. Hard constraints are never bypassed. Bounded-choice helpers, streams, forks, and seed derivation remain separately deferred.

## Unsatisfiable behavior

Future execution returns a structured non-canonical result with one or more stable reasons: `NO_TEMPLATE`, `NO_CHORD`, `NO_INVERSION`, `NO_VOICING`, or `NO_PROGRESSION`. It must not widen range, change key/scale/quality, remove constraints, or substitute unsupported harmony. Soft-preference fallback is allowed only among hard-valid candidates and is recorded.

## Decision/provenance record

The future engine emits a machine-readable record containing `schema`, `engineVersion`, `profileId/version`, `templateId/version`, input key/scale, slot/degree/root, Chord identity, inversion index, selected voicing, voice-leading cost, candidate ordering/tie-break code, seed and PRNG version reference, warnings, and unsatisfiable reasons. This explains selection but is not canonical composition state and does not duplicate embedded primitive state unnecessarily.

## Worked examples and evidence

In C major, `i-iv-v-i` maps degrees `0,3,4,0` to roots `0,5,7,0`; a concrete major-quality variant may use inversions `0,1,1,0` and voicings `[48,52,55]`, `[53,57,60]`, `[55,59,62]`, `[48,52,55]`. In A natural minor, the same degree plan maps to roots `9,2,4,9` with minor/major qualities explicitly supplied by the published template variant.

For B diminished root `11`, members are `[11,2,5]`; voicing `[50,53,59]` projects `[2,5,11]` and therefore uses inversion `1`, preserving canonical member order. An impossible register requiring three distinct pitches inside a one-semitone range returns `NO_VOICING`. Future validation must cover every profile/template/scale combination, compatibility and inversion invariants, replay, tie-breaks, seeded fixtures, wrapped classes, property checks, and preliminary human musical-quality review; human review evaluates usefulness and style, not deterministic correctness.
