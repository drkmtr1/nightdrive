# MIDI model and FL Studio interchange

## Authority

Canonical composition events use 960 PPQ integer ticks. MIDI is a derived export, not the editing/database authority. Version 1 targets Standard MIDI File compatibility before any proprietary FL Studio format. Stage 5A freezes the boundary and validation contract; Stage 5B1 implements the Nightdrive-owned IR and strict validators; Stage 5B2a implements an isolated deterministic Standard MIDI File Format 1 adapter over that IR using the approved `midi-file` dependency; Stage 5B2b provides test-only independent parser/reference and semantic round-trip evidence. Production parsing, browser download, and later export workflows remain separately gated.

## Stage 5A boundary contract

The mapper accepts only a validated, versioned canonical composition revision and its explicit timing/tempo metadata. Harmony realization is derived input: it may supply validated chord/voicing events, but it never becomes canonical composition state. The Nightdrive-owned intermediate representation (IR) is independent of third-party types and contains absolute section-relative integer `tick`, closed component/track identity, MIDI `channel` where applicable, and typed event data. Note spans are expanded deterministically into paired `note-on` and `note-off` IR events before serialization; the canonical source remains start plus positive duration.

The V1 IR is bounded to the existing one-section workflow. Valid ticks are `0..30720`; note starts are `<30720` and note ends are `<=30720`. Note pitches are `0..127`; note-on velocities are `1..127`; note-off velocity is fixed at `0`. Meta events are typed tempo, 4/4 time-signature, and track-name records. No new musical lanes, policy, spelling, or instrument assignment is introduced by this boundary.

The Standard MIDI File target is format 1 with division 960. Track 0 is the conductor track. Existing component identities map to fixed track and channel order: `Chords`→channel 0, `Bass`→channel 1, `Arp`→channel 2, and `Lead`→channel 3; absent components are omitted rather than invented. These are MIDI's zero-based channels and avoid channel 10. The conductor emits its fixed track name, 4/4 time signature, then tempo, all at tick 0. Program changes and instrument selection are outside this contract.

The planned flow is canonical composition/timing → Nightdrive IR → isolated SMF adapter → binary `.mid` → browser/server delivery. Delivery and download behavior are later implementation work and do not alter the IR.

## Mapping

- File header declares division 960 ticks per quarter note.
- The V1 serializer emits Standard MIDI File Format 1 only, with conductor track 0 followed by the fixed component-track order. Separate component-file packaging and any Format 0 export are deferred questions and cannot weaken this serializer contract.
- At tick 0, conductor metadata includes tempo and 4/4 time signature.
- `NoteEvent.pitch` maps to MIDI key 0–127; velocity maps to 1–127 for note-on. Velocity 0 note-on is not emitted as canonical note start.
- Start tick maps to a Note On channel message. `start + duration` maps to an explicit MIDI Note Off channel message (`0x8n`) with release velocity `0`; a Note On with velocity `0` is never emitted as Nightdrive's V1 canonical termination representation, regardless of library defaults.
- Track names are sanitized, bounded, stable, and role-identifying: Chords, Bass, Arp, Lead.
- Channels avoid percussion channel 10 by default and are explicit in the manifest. Instrument/program selection is not promised.

## Deterministic event ordering

At equal absolute ticks, the total order is `(tick, track order, event class, pitch, source order)`: conductor/component track order is fixed; ordinary meta events precede note-offs, which precede note-ons; within a class, pitch is ascending and source order is the stable canonical order. End-of-Track is a terminal sentinel, excluded from that ordinary meta priority: after all other events (including tick-30720 note-offs), each track emits exactly one End-of-Track at absolute tick `30720`. Thus same-pitch termination precedes a new start, and simultaneous chord notes are ordered by ascending pitch. Delta times are derived only after total ordering. No emitted event may occur after tick `30720`.

## Determinism and failures

Semantic determinism means equal validated canonical input yields the same ordered Nightdrive IR. Binary determinism additionally requires byte-identical Standard MIDI output; serializer defaults may not define this contract. Stage 5B2a's isolated `src/midi/adapter` entry point exposes a narrow `serializeStandardMidiV1` boundary returning environment-neutral bytes while keeping all canonical mapping and ordering in Nightdrive-owned code and using `midi-file` only for commodity SMF encoding. It revalidates the IR and reports validation failures before writing; partial files are never successful. Stage 5B2b adds a test-only independent reader, exact golden bytes/hashes, semantic round-trip assertions, and malformed-file rejection; it does not add a production parser or change the serializer.

## Validation

Before export validate PPQ, tempo/meter, section length, integer ranges, positive durations, note starts `<30720`, note ends `<=30720`, matching note lifecycle, explicit Note Off status/velocity, track names/identity, channel policy, stable ordering, exactly one terminal End-of-Track at `30720` per track, parseability by an independent reader, and round-trip equality of required fields. Reject invalid output; never label a partial file successful.

## Package contract

Planned package: `Nightdrive_<safe-project>_<section>.zip` containing `chords.mid`, `bass.mid`, `arp.mid`, `lead.mid`, optionally `all-tracks.mid`, `composition.json`, `production_notes.txt`, and `README.txt`. A manifest inside canonical JSON records export version, hashes, files, PPQ, tempo/meter, generator/profile versions, seed/lineage references, and compatibility notes. This package is not implemented in Stage 1.

## FL Studio verification

For declared supported FL Studio version(s): import into a blank project, confirm 960-PPQ interpretation or documented conversion, tempo, 8-bar length, start alignment, pitches/durations/velocities, track separation/names, loop boundary, and no stuck/missing notes. Record application/build/OS/import options and screenshots or exported comparison data. Manual synth assignment is expected.

## Stage 5A dependency spike

The completed Stage 5A dependency spike compared `midi-file` and `midi-writer-js` against the fixed IR/adapter boundary. `midi-file` `1.2.4` is adopted only behind the Stage 5B2a adapter because the evidence showed the required Format 1/960 support, explicit event controls, deterministic output, and no runtime transitive dependencies; `midi-writer-js` remains rejected for this boundary. Stage 5B2b's independent parser/reference is test-only and uses no additional dependency. A future production parser, round-trip API, or browser-delivery task must retain the Nightdrive-owned semantics and may require a separately reviewed dependency decision.

## Stage 5B2b independent parser/reference verification

The Stage 5B2b evidence is test-only and independent of the `midi-file` writer and any third-party reader. A strict bounded reader checks the Format 1/960 header, chunk boundaries, explicit channel statuses, malformed VLQs, exactly one terminal End-of-Track at tick `30720`, and rejection of events after that sentinel. Six fixed fixtures cover conductor plus one Chords note, multiple component tracks, simultaneous ascending chord notes, same-tick Note Off before Note On, a note ending exactly at tick `30720`, and absent optional components. Tests compare exact serialized bytes and SHA-256 hashes, then round-trip track identity, tempo/meter, channels, pitches, velocities, absolute starts/ends, durations, explicit Note Off velocity `0`, and terminal placement. No production parser, browser delivery, FL Studio import, or serializer change is included.

## Limitations

No `.flp`, VST state, automation, audio, mixing/mastering, proprietary articulations, MPE, tempo map, or meter changes in Version 1. Running status bytes and other byte-level optimizations must not undermine deterministic readability.
