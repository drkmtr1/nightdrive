# Project overview

## Problem

Electronic-music producers can move from a mood to a DAW quickly only when harmony, rhythm, motif, arrangement role, and sound-design choices cohere. General chat tools offer ideas but often hide musical structure, produce irreproducible notes, or stop short of editable interchange.

Nightdrive is a lightweight composition workstation that converts a structured brief into original musical building blocks a producer can understand, audition, edit, vary, and export to FL Studio.

## Version 1 outcome

A producer defines genre, mood, BPM, key/scale (or asks for a bounded recommendation), section type, energy, and complexity. Nightdrive creates an 8-bar section with chord progression/voicings, bass, arpeggio, and lead motif; explains the decisions; permits lightweight note edits and component locking; auditions the result; preserves versions; and exports standard MIDI.

Success means the material is technically valid, reproducible, editable, musically useful as a starting point, and transferable to FL Studio. It does not mean autonomous full-song production.

## Principles

1. The user remains composer and producer.
2. The UI behaves as a workstation, not a themed chatbot.
3. Musical structures remain inspectable, editable, and explainable.
4. Deterministic logic owns canonical music; AI interprets bounded intent.
5. Equal inputs, versions, configuration, and seed reproduce equal canonical output.
6. Standard MIDI precedes proprietary integration.
7. Complexity is exposed only when it advances the task.
8. Dependencies and architecture must earn their cost.
9. Scope evolves only through documented decisions.

## Audiences

- Primary: desktop FL Studio producers working in supported electronic genres.
- Secondary: less-experienced producers seeking theory and production guidance.
- Mobile: inspection, listening, and basic configuration only; detailed editing is desktop-led.

## Relationship to Reference Rebuild

Nightdrive creates new original material from intent. Reference Rebuild analyzes existing audio. Their Version 1 implementations stay separate. Future interoperability may exchange a structured reference profile, but that is deferred. Both may use explicit bars/beats/ticks, standard MIDI, and an initial 960 PPQ convention.

See [Scope](SCOPE.md), [User flows](USER_FLOWS.md), and [Architecture](ARCHITECTURE.md).
