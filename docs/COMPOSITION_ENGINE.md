# Composition engine design

## Shared generator contract

Every generator receives a validated frozen context, target component, current/locked components and hashes, engine/generator/profile/schema versions, bounded parameters, and explicit seed. It returns canonical events, decisions/provenance, warnings, result hash, and structured errors. No ambient time, global random source, network, AI, database, locale, or unordered iteration may affect output.

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

Stage 6 V1 defines a generic root-aligned baseline: it receives a validated Harmony progression, emits one immutable domain-level bass event per chord slot, uses the slot Chord root, derives slot-aligned integer start/duration ticks from the existing bar spans, and selects the first legal root pitch nearest MIDI `43`, then each later root pitch nearest the previously emitted Bass pitch, choosing the lower pitch on ties within the approved `36..60` range. The required seed is retained in shared provenance but does not alter V1 musical output. Passing, approach, pedal, slash/inversion, syncopation, rest, cross-slot-tie, and profile-specific behavior are not active in this baseline. The six named archetypes—Driving 8ths, Driving 16ths, Midtempo Stomp, Pedal Tone, Octave Pulse, and Syncopated Darkwave—and their eventual parameters remain separately authorized future slices; they must not be inferred from this contract.

## Arpeggiator

Parameters: subdivision, direction (`up`, `down`, `upDown`, `alternate`, `seededRandom`, profile pattern), range, gate, octave span, density, seed. Active chord/voicing is the pitch source unless a documented profile transform permits scale tones. Ordering, octave wrap, rests, and random choices are deterministic.

## Melody/motif engine

Represent motif identity as a base interval/rhythm contour plus transformations. Build phrases using repetition, transposition, rhythmic displacement/augmentation where supported, call/response, chord targets, passing/tension notes, resolution, register/range, and leap/recovery constraints. Candidate scoring and tie breaking are deterministic and explainable; no arbitrary LLM note stream.

## Reproducibility and lineage

Specify and version the PRNG/seed encoding, parameter normalization, generator ordering, candidate sorting, and canonical serializer. A variation creates a child run/revision. Manual edits create a new revision with command provenance. History is not overwritten.

## Explanation records

Generators emit machine-readable decision codes and references (for example, selected template, voice-leading cost, archetype, target-tone position). AI or deterministic text may explain those records but cannot rewrite them.
