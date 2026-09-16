# Stage 7 Arpeggiator golden-case source records

## Authority and purpose

This document is the authoritative Stage 7 human-evaluation source-selection checkpoint. It freezes evaluation input context only: no Arpeggiator plan or event fixture, MIDI artifact, audio render, listening result, rating, aggregate provenance record, or evaluation matrix is created here.

Each record supplies enough accepted canonical input to reconstruct one exact `HarmonyProgressionRealization` and the fixed portion of a later `generateArpEventsWithPolicyV1` request without a further musical choice. Energy, Complexity, and additional root seeds remain separately authorized evaluation variables.

## Selection controls

The accepted Harmony profile template arrays are deterministic preference order. This evaluation baseline selects the first accepted template for each profile. It introduces no Harmony policy and no listening or output inspection influenced any selection.

Every case uses tonic `PitchClass 0` with the selected template's canonical scale. This is an evaluation control that removes tonic transposition as a comparison variable; it does not claim that tonic `0` is genre-preferred.

Every case uses inclusive `ArpRange` `0..127`, the complete canonical `MidiPitch` domain. This is an evaluation control, not a recommended product range: it avoids a narrower human-selected range and allows accepted Stage 7C octave expansion to be observed subject only to canonical MIDI bounds.

Every case uses primary `rootSeed` `0`, a valid canonical uint32. It is selected before listening, is reproducible and non-cherry-picked, and does not imply musical representativeness. Later seed-variation evaluation remains separately gated.

The `chorus`, `verse`, and `build` terms are evaluation/context metadata only. They do not choose or alter Harmony, Stage 7 policy, or a canonical section-to-Harmony mapping. The template-selection rule alone selects Harmony.

## Fixed source context

All records fix these replay-relevant identities:

- Profile data: `nightdrive.genre-profile.arpeggiator.v1`
- Arpeggiator policy: `nightdrive.arpeggiator-policy.v1`
- Component-seed derivation: `nightdrive.seed-derivation.component.v1`
- PRNG: `nightdrive.prng.mulberry32.v1`

| Golden-case ID | Profile | Evaluation role | Harmony template/version | Tonic | Scale | Inclusive Arp range | Primary root seed |
|---|---|---|---|---:|---|---|---:|
| `dark-synthwave-chorus-001` | Dark Synthwave (`dark-synthwave`) | chorus | `degree-0654-natural-minor-v1` / `v1` | `0` | natural minor | `0..127` | `0` |
| `classic-synthwave-chorus-001` | Classic Synthwave (`classic-synthwave`) | chorus | `degree-0344-major-v1` / `v1` | `0` | major | `0..127` | `0` |
| `darkwave-verse-001` | Darkwave (`darkwave`) | verse | `degree-0654-natural-minor-v1` / `v1` | `0` | natural minor | `0..127` | `0` |
| `cyberpunk-build-001` | Midtempo Cyberpunk (`midtempo-cyberpunk`) | build | `degree-0654-phrygian-v1` / `v1` | `0` | Phrygian | `0..127` | `0` |

## Deterministic reconstruction

For each record, a future deterministic preparation task reconstructs Harmony from the fixed profile, exact canonical template, and `createKey(PitchClass 0, template.scale)`, then uses the fixed `ArpRange` and `rootSeed` in the later complete Stage 7C request. The accepted Harmony runtime validates profile/template compatibility and matching Key/template scale, and deterministically realizes the ordered progression and selected voicings.

| Golden-case ID | Profile accepts template | Key at tonic `0` and selected scale | Exact Harmony realization reconstructable | Fixed Stage 7C request portion reconstructable |
|---|---|---|---|---|
| `dark-synthwave-chorus-001` | yes | yes | yes | yes |
| `classic-synthwave-chorus-001` | yes | yes | yes | yes |
| `darkwave-verse-001` | yes | yes | yes | yes |
| `cyberpunk-build-001` | yes | yes | yes | yes |

Expected structural invariants are limited to accepted behavior: an eight-bar canonical Harmony realization; preserved profile/template identity; canonical Key context; valid inclusive Arp range; valid uint32 root seed; deterministic Stage 7C plan/events for an identical complete future request; and no generation semantics from the evaluation role metadata.

## Later evaluation variables

The following values are intentionally not part of the golden-case identity and are not assigned here:

- normalized `Energy`;
- normalized `Complexity`;
- additional root seeds; and
- any derived component seed, resolved plan, events, fixture hash, MIDI artifact, audio render, rating, or evaluation result.

This prevents later preparation from silently swapping Harmony context while varying Energy, Complexity, or seeds.

## Sources

- [Evaluation plan](../EVALUATION_PLAN.md) names the four cases and owns the broader evaluation protocol.
- [Harmony model](../HARMONY_MODEL.md) owns template identity, canonical scales, deterministic per-profile preference order, and eight-bar realization semantics.
- [Arpeggiator model](../ARPEGGIATOR_MODEL.md) owns `ArpRange`, canonical uint32 root-seed validity, replay-relevant Stage 7C version identities, and the public generation boundary.
- [Genre profile model](../GENRE_PROFILE_MODEL.md) owns the accepted Stage 7C profile-data identity and stable profile IDs.

## Deferred preparation boundary

These records do not authorize fixture generation or listening. After this checkpoint is accepted, the next separately gated preparation task is the audition-artifact architecture decision. It must determine the authorized route from deterministic Stage 7 output to reviewable audition material before any fixture matrix, MIDI/audio artifact, or human listening is performed.
