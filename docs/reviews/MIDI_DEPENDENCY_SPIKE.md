# Stage 5 MIDI dependency spike

## Scope and fixture

This experimental spike evaluates `midi-file` `1.2.4` and `midi-writer-js` `3.2.1` against the accepted Stage 5A contract. The Nightdrive-owned fixture is defined independently in `spikes/midi-dependency/run-spike.mjs`: format 1, two tracks, 960 PPQ, 4/4 at 120 BPM, conductor metadata, a `Chords` track on an explicit channel, simultaneous C-major notes, a same-pitch termination/restart at tick 960, and note ends at tick 30720. The script emits no production API and is not imported by `src`.

The standards-level inspector in the script independently checks `MThd`/`MTrk`, header fields, event status bytes, VLQs, absolute event ticks, and End-of-Track placement. It is independent because it does not call either candidate's parser or object model.

## Evidence matrix

| Criterion | `midi-file` 1.2.4 | `midi-writer-js` 3.2.1 | Evidence |
|---|---|---|---|
| Format 1 | PASS | PASS | Independent header inspection reports format 1 for both. |
| Division 960 | PASS | PASS | Independent header inspection reports division 960 for both. |
| Conductor track 0 and metadata | PASS WITH ADAPTER WORK | PASS WITH ADAPTER WORK | Both preserve track name, 4/4, and 120 BPM metadata; writer's conductor EOT remains at tick 0. |
| Explicit `0x8n` Note Off, velocity 0 | PASS | FAIL | `midi-file` emits `80 3c 00`; writer emits `80` status but its documented NoteEvent path sets Note Off velocity from the note velocity, never release velocity 0. |
| EOT exactly at 30720 on every track | PASS | FAIL | `midi-file` inspector reports one EOT at 30720 on both tracks; writer reports conductor EOT at 0. |
| Required equal-tick ordering | PASS WITH ADAPTER WORK | PASS WITH ADAPTER WORK | Both produce off-before-on at tick 960 in the corrected attempt; Nightdrive must still provide ordering explicitly. |
| Same-pitch restart | PASS | PASS | Both show note-off before note-on at tick 960 after documented API correction. |
| Simultaneous ascending chord notes | PASS | PASS | Both emit 60, 64, 67 in ascending order. |
| Repeated byte determinism | PASS | PASS | Identical inputs produced byte-identical output in repeated runs. |
| Runtime Node/browser viability | PASS WITH ADAPTER WORK | PASS WITH ADAPTER WORK | Both expose browser/Node-capable distributions; adapter and bundling checks remain required. |
| Independent parsing | PASS WITH ADAPTER WORK | PASS WITH ADAPTER WORK | The spike inspector validates structural bytes; candidate parsers were not used as sole oracle. |
| Malformed/unsupported behavior | PASS WITH ADAPTER WORK | PASS WITH ADAPTER WORK | Writers accept several malformed values; Nightdrive validation must remain authoritative at the adapter boundary. |
| Velocity fidelity 1..127 | PASS | FAIL | Low-level `midi-file` accepts exact byte velocities; writer documents 1–100 and scales/rounds to 1–127, so arbitrary Nightdrive values are not exact. |
| Adapter isolation | PASS | PASS | Both can be invoked from the spike without exposing types to `src/music-domain`; no production import was added. |

## Candidate details

`midi-file` is MIT-licensed, has no runtime dependencies in the evaluated install, and reports an unpacked package size of 47,239 bytes. Its API accepts explicit low-level events and an option disabling running status and Note-On-velocity-zero note-offs. The spike therefore demonstrates the required byte representation and terminal ticks with a small adapter.

`midi-writer-js` is MIT-licensed, depends on `@tonaljs/midi` (which brings `@tonaljs/pitch-note`), and reports an unpacked package size of 334,300 bytes. Rebuilt with documented `Track.setTimeSignature`, `Track.setTempo`, `NoteEvent.startTick`, 1-based channels, and 1–100 velocities, it produced deterministic Format 1 bytes with correct metadata, note ordering, explicit `0x80` statuses, and component EOT at 30720. However, automatic conductor EOT remains at tick 0 and Note Off release velocity follows the note velocity (90/100), not Nightdrive's required 0. These are hard-contract failures; fixing them would require substantial custom event/track rewriting.

The documented velocity conversion is `round(input / 100 * 127)`, clamped to the 1–100 API range. Representative values 71 and 79 became 90 and 100; values above 100 are clamped. Therefore arbitrary Nightdrive velocities 1–127 cannot be represented exactly through the public API. This is not corruption, but it is incompatible with the canonical adapter contract unless Nightdrive performs its own low-level encoding.

Both packages have built-in TypeScript declarations and browser/Node distributions. A disposable `esbuild --platform=browser --format=esm` smoke check bundled `midi-file` to 20,895 bytes and `midi-writer-js` to 40,147 bytes; both bundles resolved without Node-only runtime errors. Publication metadata was obtained from npm during the spike; the isolated install audit reported 0 vulnerabilities. This is not a production security approval.

## Recommendation

**Recommend `midi-file` for a future, separately authorized adapter implementation, subject to repeating the dependency/security review at adoption time.** It satisfies every hard contract invariant directly or with small deterministic event preparation. `midi-writer-js` is rejected for this boundary because satisfying explicit release velocity 0 and EOT-at-30720 on every track would require substantial custom rewriting; its documented velocity model also cannot preserve arbitrary Nightdrive velocities. No package is added to the production manifest by this spike.

## Files and execution

- Experimental code: `spikes/midi-dependency/run-spike.mjs`
- Experimental manifest/lockfile: `spikes/midi-dependency/package.json`, `package-lock.json`
- Captured output: `spikes/midi-dependency/spike-output.json`
- The spike branch does not modify `src`, the root package manifest/lockfile, or production barrels.
