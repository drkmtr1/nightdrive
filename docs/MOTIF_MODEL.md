# Stage 8 melody and motif model

## Status and authority

This document is the accepted normative Stage 8 V1 contract for deterministic lead-motif generation, integrated through PR #217 after consequential exact-head review. Bounded production implementation under this settled contract is eligible. Stage 8 does not modify the accepted First Playable Harmony+Bass+Arpeggiator result or its frozen evidence.

The V1 policy is an initial, versioned musical hypothesis for structured evaluation, not an objective description of any genre. Poor evaluation results require a separately versioned successor. They never authorize silent tuning of V1 values or historical replay.

## Ownership and identities

`music-domain` owns the closed motif values, validation, and event invariants. `generators` owns policy resolution and projection from one supplied, already realized Harmony progression. The operation does not generate or alter Harmony. An enclosing composition boundary may integrate the lead only in a later separately specified task.

The exact V1 identities are:

- request schema: `nightdrive.motif-generation-request.v1`;
- result schema: `nightdrive.motif-generation-result.v1`;
- generator: `nightdrive.generator.motif.v1`;
- policy: `nightdrive.motif-policy.v1`;
- profile data: `nightdrive.genre-profile.motif.v1`;
- contour catalog: `nightdrive.motif-contour.v1`;
- rhythm catalog: `nightdrive.motif-rhythm.v1`;
- seed derivation: `nightdrive.seed-derivation.component.v1` with component ID `motif`;
- PRNG: `nightdrive.prng.mulberry32.v1`;
- weighted choice: `nightdrive.weighted-choice.uint32-modulo.v1`.

Changing an identity, domain, ordered candidate list, weight, contour, rhythm template, decision schedule, projection rule, failure precedence, or canonical field requires a new compatible version. V1 records remain replayable.

## Supplied context and public operation

`generateMotifV1(request)` accepts one deeply immutable object with exactly these fields in order:

```ts
interface MotifGenerationRequestV1 {
  schema: "nightdrive.motif-generation-request.v1";
  generatorVersion: "nightdrive.generator.motif.v1";
  profile: {
    id: HarmonyProfileId;
    version: "nightdrive.genre-profile.motif.v1";
  };
  policyVersion: "nightdrive.motif-policy.v1";
  harmony: HarmonyProgressionRealization;
  intent: { energy: EnergyV1; complexity: ComplexityV1 };
  rootSeed: number;
}
```

The supplied Harmony must be a valid eight-bar, 4/4, 960-PPQ realization with exactly four ordered two-bar slots. Its profile must equal `profile.id`; its Key, Chords, slot bounds, and ordering remain authoritative. `rootSeed` is a canonical uint32. Extra fields, accessors, mutable or forged domain values, unsupported identities, incompatible profile context, or malformed Harmony fail before seed derivation.

The operation returns one deeply immutable result:

```ts
interface MotifGenerationResultV1 {
  schema: "nightdrive.motif-generation-result.v1";
  generatorVersion: "nightdrive.generator.motif.v1";
  plan: ResolvedMotifPlanV1;
  events: readonly MotifEventV1[];
  provenance: MotifProvenanceV1;
}

interface MotifEventV1 {
  pitch: number;
  startTick: number;
  durationTicks: 480 | 960;
}

interface ResolvedMotifPlanV1 {
  policyVersion: "nightdrive.motif-policy.v1";
  profileVersion: "nightdrive.genre-profile.motif.v1";
  rhythmTemplate: "sparse-4" | "steady-6" | "active-8";
  registerBand: "lower" | "middle" | "upper";
  tensionMode: "chordal" | "diatonic-passing";
  phrase4Displacement: "none" | "earlier-480" | "later-480";
  contourOffsets: readonly number[];
  phraseRoles: readonly [
    "identity",
    "motif-form-repetition",
    "harmony-aware-transposition",
    "contour-preserving-response",
  ];
}

interface MotifProvenanceV1 {
  profile: {
    id: HarmonyProfileId;
    version: "nightdrive.genre-profile.motif.v1";
  };
  policy: { version: "nightdrive.motif-policy.v1" };
  contour: { version: "nightdrive.motif-contour.v1" };
  rhythm: { version: "nightdrive.motif-rhythm.v1" };
  seedDerivation: { version: "nightdrive.seed-derivation.component.v1" };
  prng: { version: "nightdrive.prng.mulberry32.v1" };
  weightedChoice: { version: "nightdrive.weighted-choice.uint32-modulo.v1" };
  rootSeed: number;
  componentSeed: number;
  normalizedInputs: { intent: { energy: EnergyV1; complexity: ComplexityV1 } };
  harmony: MotifHarmonySnapshotV1;
  parent: null;
}
```

`MotifHarmonySnapshotV1` is the immutable projection `{ profile, templateId, templateVersion, key, slots }` in that exact order. It uses the supplied realization's exact values and the same nested Key, Chord, ChordInversion, ChordVoicing, slot field order, and array order already accepted for the First Playable Harmony component, but it has no First Playable component-schema wrapper or hash. It is sufficient to reconstruct and verify the exact Harmony input without claiming that Stage 8 changes the First Playable schema.

The plan and events are canonical component values. Explanations, labels, audition state, MIDI bytes, timestamps, mutable PRNG state, discarded candidates, and floating-point scores are not canonical. The schema-directed serializer emits the displayed result field order and each nested contract's declared order as compact UTF-8 JSON without BOM, whitespace, or terminal newline. It uses safe-integer minimal base-10 numbers and rejects implicit omission or unsupported JavaScript values. `contourOffsets` is exactly the selected catalog tuple and cannot be caller supplied. Equal validated request values, versions, and root seed must produce byte-equivalent result JSON.

## Fixed section and phrase structure

The section is exactly four two-bar phrases at ticks `[0,7680)`, `[7680,15360)`, `[15360,23040)`, and `[23040,30720)`. Each phrase uses the corresponding two-bar Harmony slot. Phrase roles are exactly:

1. `identity`;
2. `motif-form-repetition`;
3. `harmony-aware-transposition`;
4. `contour-preserving-response`.

Phrase 1 establishes the selected rhythm template, fixed contour identity, and realized pitches. Phrase 2 repeats the exact motif form against its own Harmony. Phrase 3 re-anchors the same contour to its own Harmony and must preserve Phrase 1's realized semitone-interval sequence exactly whenever any complete legal eight-bar path can do so; only when no such complete path exists does Phrase 3 use ordinary deterministic projection. Phrase 4 retains the same signed diatonic interval directions and magnitudes, re-anchors them to its own Harmony, and applies only its resolved optional displacement. Response does not mean inversion, retrograde, augmentation, diminution, chromatic transformation, or another hidden transformation.

For `motif-form-repetition`, these properties are invariant and equal to Phrase 1: rhythm-template ID, relative onsets, duration sequence, signed diatonic contour offsets and interval magnitudes, event count, event order, and absence of displacement. Projection may change only the phrase anchor and resulting MIDI pitches needed to satisfy Phrase 2 Harmony, the current Key vocabulary, selected register band, chord targets, leap limit, and exceptional-leap recovery. It may not add, remove, reorder, retime, lengthen, shorten, or substitute contour data.

## Fixed rhythm and contour catalogs

The base onset grid is exactly 480 ticks. The ordered rhythm catalog is:

| ID | Relative onsets in 480-tick grid indices | Durations in ticks | Contour offsets in diatonic scale steps | Displacement event ordinal |
|---|---|---|---|---|
| `sparse-4` | `[0,4,8,12]` | `[960,960,960,960]` | `[0,1,2,0]` | `1` |
| `steady-6` | `[0,2,4,7,10,14]` | `[960,480,960,480,960,960]` | `[0,1,2,1,2,0]` | `3` |
| `active-8` | `[0,2,4,6,8,10,12,14]` | `[480,480,480,480,480,480,480,480]` | `[0,1,2,3,2,3,1,0]` | `3` |

Offsets are the immutable motif identity relative to a phrase anchor, not literal MIDI pitches. Their adjacent signed differences define contour direction and magnitude. No contour consumes a separate random output.

The `earlier-480` and `later-480` displacement choices apply only to Phrase 4's zero-based displacement event ordinal declared by its rhythm template. That event is nonstructural. Structural-target onsets and every other onset remain fixed. The chosen displacement subtracts or adds exactly 480 ticks from that one onset; `none` changes none. The three accepted template/ordinal pairs keep the displaced event inside the phrase, preserve strict event order and non-overlap in both directions, and retain every duration. No candidate filtering, repair, retry, or fallback occurs.

## Pitch vocabulary, targets, range, and leaps

The global inclusive lead range is MIDI `60..84`. Register bands are inclusive:

- `lower`: `60..72`;
- `middle`: `66..78`;
- `upper`: `72..84`.

All sounded pitches are current-Key scale tones. Structural events are the first sounded event, first sounded event in bar 2, and final sounded event of each phrase; each must be a member of that phrase's Harmony Chord. In `chordal` mode every event must be a chord tone. In `diatonic-passing` mode nonstructural events may be other current-Key scale tones, and the last nonstructural event before each structural target must approach that target by one diatonic scale step in the contour's required direction. Chromatic notes are forbidden.

The phrase anchor is the legal chord tone in the selected register band nearest the band's integer midpoint; ties choose the lower MIDI pitch. The ideal pitch at each event is obtained by applying its contour offset in the current Key's ordered diatonic scale to that anchor, preserving octave placement.

Adjacent sounded notes normally differ by at most 7 semitones. An exceptional leap may be 8 through 12 semitones only when the next sounded note exists, moves in the opposite direction, and is at most 2 semitones from the exceptional-leap destination. Exceptional leaps may cross phrase boundaries; the final section interval cannot be exceptional because no recovery note follows. Repeated pitches have direction zero and cannot satisfy opposite-direction recovery.

Projection considers all complete eight-bar paths over legal candidate pitches. It rejects candidates that violate vocabulary, structural targets, mode, band, phrase bounds, event ordering, durations, the 12-semitone absolute maximum, or recovery, including leap/recovery obligations that cross phrase boundaries.

Let Phrase 1's realized MIDI pitches be `p1[0..n-1]` and define its realized semitone-interval sequence as `d1[i] = p1[i] - p1[i-1]` for `i = 1..n-1`. Let `L` be the set of complete legal eight-bar paths. Let `E` be the subset of `L` whose Phrase-3 pitches `p3` satisfy `p3[i] - p3[i-1] = d1[i]` at every `i = 1..n-1`. This equality requires one constant chromatic transposition of the complete Phrase-1 pitch sequence; it is not approximate contour similarity.

If `E` is nonempty, projection must select only from `E`. If `E` is empty, projection selects from `L`. Within the selected set, including when multiple exact-preservation transpositions exist, it chooses the unique lexicographic minimum of the unchanged ordinary objective:

1. total absolute diatonic-step deviation from the accepted contour intervals;
2. count of intervals whose signed direction differs from the accepted contour;
3. total absolute MIDI-pitch distance from each ideal pitch;
4. the complete ordered MIDI-pitch sequence, compared numerically.

The existence test and selection operate over complete paths, so Phrase-3 preservation never bypasses its Harmony, Key vocabulary, structural targets, selected register band, tension mode, timing, leap/recovery, or neighboring-phrase constraints. This is the only permitted pitch adjustment. It makes Harmony and hard constraints authoritative while preserving exact Phrase-3 transposition whenever legal and otherwise preserving motif identity as closely as the ordinary objective permits. No random retry, alternate contour, nearest-profile lookup, repair after selection, or partial result exists. No legal complete path returns `NO_VALID_MOTIF`.

## Deterministic profile resolution

Resolve exactly four slots from one component-isolated Motif PRNG stream in this order:

1. rhythm template;
2. register band;
3. tension mode;
4. Phrase-4 displacement.

Each slot consumes exactly one chained uint32 output, including a one-candidate effective list. Derive the component seed once with component ID `motif`. Harmony, Bass, and Arpeggiator random consumption cannot affect it. There is no fifth draw, retry, fallback, sorting, normalization, interpolation, rescaling, or ambient randomness.

For profile `p`, slot `s`, energy `e`, and complexity `c`:

```text
candidateOrder = candidates[p, s]
finalWeights = energyWeights[p, s, e] + complexityAdditions[p, s, c]
```

Addition is exact left-to-right element-wise integer addition in declared candidate order. The exact profile tables are normative in [Genre profile model](GENRE_PROFILE_MODEL.md#stage-8-v1-motif-profile-policy).

The canonical plan records, in order: `policyVersion`, `profileVersion`, `rhythmTemplate`, `registerBand`, `tensionMode`, `phrase4Displacement`, `contourOffsets`, and the four ordered phrase roles. It never records PRNG outputs or mutable state.

## Failure contract and precedence

`MotifValueError extends RangeError` owns stable `code` and `field`; messages are noncontractual. Public codes are:

- `INVALID_MOTIF_REQUEST` / `request`;
- `UNSUPPORTED_MOTIF_SCHEMA` / `schema`;
- `UNSUPPORTED_MOTIF_GENERATOR_VERSION` / `generatorVersion`;
- `UNSUPPORTED_MOTIF_PROFILE_VERSION` / `profile.version`;
- `UNSUPPORTED_MOTIF_POLICY_VERSION` / `policyVersion`;
- `INVALID_MOTIF_PROFILE` / `profile.id`;
- `INVALID_MOTIF_HARMONY` / `harmony`;
- `INCOMPATIBLE_MOTIF_PROFILE_CONTEXT` / `profile.id`;
- `INVALID_MOTIF_INTENT` / `intent`;
- `INVALID_MOTIF_ROOT_SEED` / `rootSeed`;
- `INVALID_MOTIF_POLICY_CONFIGURATION` / `profile.version`;
- `NO_VALID_MOTIF` / `harmony`.

Preflight uses that order and stops on the first failure. Seed derivation and PRNG work occur only after complete request, Harmony, compatibility, intent, seed, and exact policy-configuration validation. Internal impossible failures remain internal errors. Every failure returns no plan, events, provenance, canonical bytes, or partial result.

## Provenance and isolation

Provenance records, in order, the exact profile, policy, contour, rhythm, seed-derivation and PRNG identities; root seed; derived Motif component seed; normalized Energy and Complexity; supplied Harmony identity sufficient to bind the exact realization; and `parent: null` for V1 root generation. It does not claim persistence or Stage 11 variation lineage.

Existing First Playable, Harmony, Bass, Arpeggiator, Stage 7 aggregate, and frozen evidence values remain byte-for-byte unchanged. Motif generation reads supplied Harmony and creates only Motif values. It never modifies another component, invokes another component generator, consumes their seeds, or changes their hashes.

## Evaluation and versioning

Machine acceptance proves exact catalogs/tables, four-draw scheduling, replay, component isolation, canonical bytes, phrase-form invariants, Harmony targeting, legal projection, range/leap/recovery, errors, and section bounds. Structured musical evaluation separately assesses whether the accepted V1 hypotheses produce useful identity, repetition, development, target/tension behavior, profile tendency, and coherent lead material. Evaluation must use V1 unchanged. A weakness is recorded against V1 and may motivate a new policy/profile/contour version; it does not permit in-place tuning.

## Explicit exclusions

V1 excludes inversion, retrograde, augmentation, diminution, chromatic transformation, arbitrary caller contours, additional rhythms or draws, velocity/accent, articulation, swing/humanization, microtiming, vocal melody, full-song development, MIDI integration, browser audition/audio, UI, persistence, locking/variation graphs, AI note generation, dependencies, and First Playable rebaselining.
