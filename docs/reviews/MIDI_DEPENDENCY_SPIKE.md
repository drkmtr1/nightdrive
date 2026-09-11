# Stage 5 MIDI dependency spike

## Scope and fixture

This experimental spike evaluates `midi-file` `1.2.4` and `midi-writer-js` `3.2.1` against the accepted Stage 5A contract. The Nightdrive-owned fixture is defined independently in `spikes/midi-dependency/run-spike.mjs`: format 1, two tracks, 960 PPQ, 4/4 at 120 BPM, conductor metadata, a `Chords` track on an explicit channel, simultaneous C-major notes, a same-pitch termination/restart at tick 960, and note ends at tick 30720. The script emits no production API and is not imported by `src`.

The standards-level inspector in the script independently checks `MThd`/`MTrk`, header fields, event status bytes, VLQs, absolute event ticks, and End-of-Track placement. It is independent because it does not call either candidate's parser or object model.

## Evidence matrix

| Criterion | `midi-file` 1.2.4 | `midi-writer-js` 3.2.1 | Evidence |
|---|---|---|---|
| Format 1 | PASS | PASS | Independent header inspection reports format 1 for both. |
| Division 960 | PASS | PASS | Independent header inspection reports division 960 for both. |
| Conductor track 0 and metadata | PASS WITH ADAPTER WORK | FAIL | `midi-file` preserves track-name, time-signature, and tempo events; writer output omitted tempo and its conductor EOT was not at 30720. |
| Explicit `0x8n` Note Off, velocity 0 | PASS | PASS WITH ADAPTER WORK | `midi-file` emits `80 3c 00`; writer emits `80` status but rewrites velocities and channels through its event builder, requiring byte-level adapter verification. |
| EOT exactly at 30720 on every track | PASS | FAIL | `midi-file` inspector reports one EOT at 30720 on both tracks; writer reports no conductor EOT and component EOT at 91200. |
| Required equal-tick ordering | PASS WITH ADAPTER WORK | FAIL | `midi-file` accepts preordered delta events; writer reorders/builds events and does not preserve the fixture's required lifecycle. |
| Same-pitch restart | PASS | FAIL | `midi-file` emits note-off before note-on at tick 960; writer output has altered timing/velocity and cannot satisfy the fixture as supplied. |
| Simultaneous ascending chord notes | PASS | PASS WITH ADAPTER WORK | Both can emit ascending pitches, but writer's high-level API does not preserve Nightdrive velocity/channel semantics without custom control. |
| Repeated byte determinism | PASS | PASS | Identical inputs produced byte-identical output in repeated runs. |
| Runtime Node/browser viability | PASS WITH ADAPTER WORK | PASS WITH ADAPTER WORK | Both expose browser/Node-capable distributions; adapter and bundling checks remain required. |
| Independent parsing | PASS WITH ADAPTER WORK | PASS WITH ADAPTER WORK | The spike inspector validates structural bytes; candidate parsers were not used as sole oracle. |
| Malformed/unsupported behavior | PASS WITH ADAPTER WORK | PASS WITH ADAPTER WORK | Writers accept several malformed values; Nightdrive validation must remain authoritative at the adapter boundary. |
| Adapter isolation | PASS | PASS | Both can be invoked from the spike without exposing types to `src/music-domain`; no production import was added. |

## Candidate details

`midi-file` is MIT-licensed, has no runtime dependencies in the evaluated install, and reports an unpacked package size of 47,239 bytes. Its API accepts explicit low-level events and an option disabling running status and Note-On-velocity-zero note-offs. The spike therefore demonstrates the required byte representation and terminal ticks with a small adapter.

`midi-writer-js` is MIT-licensed, depends on `@tonaljs/midi` (which brings `@tonaljs/pitch-note`), and reports an unpacked package size of 334,300 bytes. Its high-level writer produced deterministic bytes and a format-1 header, but the fixture exposed incompatible event construction: conductor tempo was absent, note velocities/channels were rewritten, and automatic timing placed component EOT at tick 91200. Correcting these would require substantial custom rewriting around the library rather than a small adapter.

Both packages have built-in TypeScript declarations and browser/Node distributions. Publication metadata was obtained from npm during the spike; no independent security advisory was found in the local install. The normal npm audit endpoint was not consulted successfully for the repository because it is environment-dependent; this spike does not claim a production security approval.

## Recommendation

**Recommend `midi-file` for a future, separately authorized adapter implementation, subject to repeating the dependency/security review at adoption time.** It satisfies every hard contract invariant directly or with small deterministic event preparation. `midi-writer-js` is rejected for this boundary because satisfying explicit Note Off, fixed lifecycle ordering, and EOT-at-30720 would require substantial custom rewriting and it currently violates the fixture's conductor/timing/channel/velocity expectations. No package is added to the production manifest by this spike.

## Files and execution

- Experimental code: `spikes/midi-dependency/run-spike.mjs`
- Experimental manifest/lockfile: `spikes/midi-dependency/package.json`, `package-lock.json`
- Captured output: `spikes/midi-dependency/spike-output.json`
- The spike branch does not modify `src`, the root package manifest/lockfile, or production barrels.
