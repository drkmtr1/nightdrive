# Version 1 scope

## Frozen north-star workflow

Version 1 helps a producer create one coherent 8-bar synthwave/darkwave-family section that can be understood, auditioned, edited, varied, locked by component, persisted, and exported as standard MIDI for FL Studio.

## In scope

- A composition brief: genre profile, mood descriptors, BPM, key selection/manual key, scale, section type, energy, and complexity.
- Intentionally narrow profiles: Dark Synthwave, Classic Synthwave, Darkwave, and Midtempo Cyberpunk.
- Major, Natural Minor, Harmonic Minor, Melodic Minor, Dorian, and Phrygian.
- Deterministic harmony/voicing, bass, arpeggio, and motif generation.
- Chord, bass, arp, and lead tracks for one 8-bar section in an initial constant tempo/time-signature path.
- Lightweight synchronized browser audition.
- Limited piano roll: select, add, delete, drag, resize, velocity, transpose, snap, undo, redo.
- Independent component locking, regeneration, variations, and immutable lineage.
- Explainable musical decisions and production/synth recommendations grounded in structured state.
- Structured recipes for Phase Plant, GForce Prophet-5, and justified FL Studio stock instruments.
- Authenticated project persistence, generation history, and export history.
- Standard multi-track MIDI export and FL Studio interoperability verification.
- Desktop-first responsive, keyboard-operable, accessible interface.

## Explicit non-goals

- Direct FL Studio GUI control, `.flp` generation, automatic VST loading, or parameter manipulation.
- Audio/reference uploads, YouTube ingestion, reference analysis, separation, stems, transcription, mixing, mastering, or audio-to-MIDI.
- Autonomous full songs, multi-section arrangement, collaboration/community, marketplaces, or mobile-first detailed editing.
- Large music-generation models or direct imitation of copyrighted works.
- Microservices, queues, vector databases, orchestration frameworks, or ML infrastructure without a later documented requirement.

## Constraints and assumptions

- Standard MIDI is sufficient for the initial DAW handoff; FL Studio may require import guidance and manual instrument assignment.
- Version 1 begins with 4/4 and a constant tempo per section. Other meters and tempo maps require a later decision.
- Browser audio is an approximate composition preview, not production rendering.
- Mood is translated to bounded parameters and is not a claim of objective emotional truth.
- Structured human review is required for musical usefulness.

## Scope control

A change to an in-scope or non-goal boundary requires a dated ADR, updated requirements/acceptance criteria, risk review, and roadmap impact. A future-compatible data shape does not authorize a future feature.
