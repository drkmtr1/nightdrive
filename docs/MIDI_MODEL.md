# MIDI model and FL Studio interchange

## Authority

Canonical composition events use 960 PPQ integer ticks. MIDI is a derived export, not the editing/database authority. Version 1 targets Standard MIDI File compatibility before any proprietary FL Studio format.

## Mapping

- File header declares division 960 ticks per quarter note.
- Initial export uses Type 1 for a tempo/conductor track plus named musical tracks; component files may be Type 0 or 1 under one documented export version.
- At tick 0, conductor metadata includes tempo and 4/4 time signature.
- `NoteEvent.pitch` maps to MIDI key 0–127; velocity maps to 1–127 for note-on. Velocity 0 note-on is not emitted as canonical note start.
- Start tick maps to note-on; `start + duration` maps to note-off (explicit status policy selected in Stage 5 and fixture-stable).
- Track names are sanitized, bounded, stable, and role-identifying: Chords, Bass, Arp, Lead.
- Channels avoid percussion channel 10 by default and are explicit in the manifest. Instrument/program selection is not promised.

## Deterministic event ordering

At equal absolute ticks: termination events precede starts for the same pitch/channel; metadata ordering is stable; then events sort by defined kind, channel, pitch, stable source ID. Delta times are derived only after total ordering. End-of-track follows the final event deterministically.

## Validation

Before export validate PPQ, tempo/meter, section length, integer ranges, positive durations, matching note lifecycle, track names/identity, channel policy, stable ordering, parseability by an independent reader, and round-trip equality of required fields. Reject invalid output; never label a partial file successful.

## Package contract

Planned package: `Nightdrive_<safe-project>_<section>.zip` containing `chords.mid`, `bass.mid`, `arp.mid`, `lead.mid`, optionally `all-tracks.mid`, `composition.json`, `production_notes.txt`, and `README.txt`. A manifest inside canonical JSON records export version, hashes, files, PPQ, tempo/meter, generator/profile versions, seed/lineage references, and compatibility notes. This package is not implemented in Stage 1.

## FL Studio verification

For declared supported FL Studio version(s): import into a blank project, confirm 960-PPQ interpretation or documented conversion, tempo, 8-bar length, start alignment, pitches/durations/velocities, track separation/names, loop boundary, and no stuck/missing notes. Record application/build/OS/import options and screenshots or exported comparison data. Manual synth assignment is expected.

## Limitations

No `.flp`, VST state, automation, audio, mixing/mastering, proprietary articulations, MPE, tempo map, or meter changes in Version 1. Running status bytes and other byte-level optimizations must not undermine deterministic readability.
