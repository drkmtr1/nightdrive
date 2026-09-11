# MIDI model and FL Studio interchange

## Authority

Canonical composition events use 960 PPQ integer ticks. MIDI is a derived export, not the editing/database authority. Version 1 targets Standard MIDI File compatibility before any proprietary FL Studio format. Stage 5A freezes the boundary and validation contract only; it does not implement a writer, parser, browser download, or dependency.

## Stage 5A boundary contract

The mapper accepts only a validated, versioned canonical composition revision and its explicit timing/tempo metadata. Harmony realization is derived input: it may supply validated chord/voicing events, but it never becomes canonical composition state. The Nightdrive-owned intermediate representation (IR) is independent of third-party types and contains absolute section-relative integer `tick`, closed component/track identity, MIDI `channel` where applicable, and typed event data. Note spans are expanded deterministically into paired `note-on` and `note-off` IR events before serialization; the canonical source remains start plus positive duration.

The V1 IR is bounded to the existing one-section workflow. Valid ticks are `0..30720`; note starts are `<30720` and note ends are `<=30720`. Note pitches are `0..127`; note-on velocities are `1..127`; note-off velocity is fixed at `0`. Meta events are typed tempo, 4/4 time-signature, and track-name records. No new musical lanes, policy, spelling, or instrument assignment is introduced by this boundary.

The Standard MIDI File target is format 1 with division 960. Track 0 is the conductor track. Existing component identities map to fixed track and channel order: `Chords`→channel 0, `Bass`→channel 1, `Arp`→channel 2, and `Lead`→channel 3; absent components are omitted rather than invented. These are MIDI's zero-based channels and avoid channel 10. The conductor emits its fixed track name, 4/4 time signature, then tempo, all at tick 0. Program changes and instrument selection are outside this contract.

The planned flow is canonical composition/timing → Nightdrive IR → isolated SMF adapter → binary `.mid` → browser/server delivery. Delivery and download behavior are later implementation work and do not alter the IR.

## Mapping

- File header declares division 960 ticks per quarter note.
- Initial export uses Type 1 for a tempo/conductor track plus named musical tracks; component files may be Type 0 or 1 under one documented export version.
- At tick 0, conductor metadata includes tempo and 4/4 time signature.
- `NoteEvent.pitch` maps to MIDI key 0–127; velocity maps to 1–127 for note-on. Velocity 0 note-on is not emitted as canonical note start.
- Start tick maps to note-on; `start + duration` maps to note-off (explicit status policy selected in Stage 5 and fixture-stable).
- Track names are sanitized, bounded, stable, and role-identifying: Chords, Bass, Arp, Lead.
- Channels avoid percussion channel 10 by default and are explicit in the manifest. Instrument/program selection is not promised.

## Deterministic event ordering

At equal absolute ticks, the total order is `(tick, track order, event class, pitch, source order)`: conductor/component track order is fixed; meta events precede note-offs, which precede note-ons; within a class, pitch is ascending and source order is the stable canonical order. Thus same-pitch termination precedes a new start, and simultaneous chord notes are ordered by ascending pitch. Delta times are derived only after total ordering. Each track emits exactly one deterministic end-of-track event.

## Determinism and failures

Semantic determinism means equal validated canonical input yields the same ordered Nightdrive IR. Binary determinism additionally requires byte-identical Standard MIDI output; serializer defaults may not define this contract. A future adapter exposes a narrow `serializeStandardMidiV1` boundary returning bytes while keeping all canonical mapping and ordering in Nightdrive-owned code. It reports structured failures for unsupported versions/events and invalid tick, pitch, velocity, channel, tempo, or lifecycle data; partial files are never successful. Parsing is a test/reference concern for this milestone, using an independent reader rather than the writer as its sole oracle.

## Validation

Before export validate PPQ, tempo/meter, section length, integer ranges, positive durations, matching note lifecycle, track names/identity, channel policy, stable ordering, parseability by an independent reader, and round-trip equality of required fields. Reject invalid output; never label a partial file successful.

## Package contract

Planned package: `Nightdrive_<safe-project>_<section>.zip` containing `chords.mid`, `bass.mid`, `arp.mid`, `lead.mid`, optionally `all-tracks.mid`, `composition.json`, `production_notes.txt`, and `README.txt`. A manifest inside canonical JSON records export version, hashes, files, PPQ, tempo/meter, generator/profile versions, seed/lineage references, and compatibility notes. This package is not implemented in Stage 1.

## FL Studio verification

For declared supported FL Studio version(s): import into a blank project, confirm 960-PPQ interpretation or documented conversion, tempo, 8-bar length, start alignment, pitches/durations/velocities, track separation/names, loop boundary, and no stuck/missing notes. Record application/build/OS/import options and screenshots or exported comparison data. Manual synth assignment is expected.

## Stage 5A dependency spike

The later bounded spike compares `midi-file` and `midi-writer-js` against the fixed IR/adapter boundary: format-1 and division-960 support, exact event ordering and note-off behavior, browser and Node support, TypeScript/runtime fit, independent parseability, malformed-input behavior, determinism, license/health/security, size/transitives, and replaceability. No candidate is selected here. Adoption requires evidence that a candidate preserves Nightdrive semantics behind the adapter; otherwise a minimal local encoder requires a new architecture review. This is a definition of evidence, not an installation or implementation authorization.

## Limitations

No `.flp`, VST state, automation, audio, mixing/mastering, proprietary articulations, MPE, tempo map, or meter changes in Version 1. Running status bytes and other byte-level optimizations must not undermine deterministic readability.
