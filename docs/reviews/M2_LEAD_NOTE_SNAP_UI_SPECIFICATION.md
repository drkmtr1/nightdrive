# M2 selected Lead-note Snap Start interaction

## Authority and lifecycle

**CANDIDATE — SPECIFY only.** Consequential external independent exact-head review PASS and explicit Product Owner acceptance of this exact tuple are required before a separate local implementation under ADR-031. No runtime/UI behavior, protected integration, AC-015 completion or qualification is established by this candidate.

Stage 10 / [AC-015](../ACCEPTANCE_CRITERIA.md#acceptance-criteria) identifies snap as an editing capability. The Product Owner selects an explicit **Snap Start** action for one selected existing Lead note, a fixed 240-tick sixteenth-note grid at 960 PPQ, and nearest-grid ties toward the later point. This narrows earlier exclusions only for this explicit action if its authority lifecycle is satisfied; accepted free-drag, resize, creation and other interactions remain unsnapped. [ADR-040](../DECISIONS.md#adr-040--m2-selected-lead-note-snap-start-interaction) owns this interaction. The [v2 start-tick contract](M2_EDITOR_NOTE_START_TICK_COMMAND_SPECIFICATION.md) and [editor revision/source/ancestry contract](M2_EDITOR_REVISION_CONTRACT_SPECIFICATION.md) remain canonical authority.

## Control and target

Place one visibly named **Snap Start** native button on the existing selected Lead-note editing surface. Use `type="button"` so it cannot accidentally submit another editor form. Ordinary focus and Enter/Space activation provide the keyboard path; no pointer is required and no new shortcut is introduced. Follow existing selected-note unavailable/pending behavior: no eligible selected Lead note or an in-flight editor operation permits no dispatch. Imported and added notes are eligible through their existing stable IDs. No track-wide or multiple-note operation.

Read the current selected canonical note from the application's selected revision, capture its stable ID, exact current start tick, and selected parent identity. The browser's displayed application remains untrusted at the authoritative Node boundary; a self-consistent browser hash is never verified ancestry. No user-entered snap target or grid preference exists. Do not infer a target from array position, pointer, playhead, generation policy, neighbor or stale preview.

## Exact arithmetic and local ordering

For captured start tick `t`, the nearest nonnegative multiple of 240 is:

```text
q = floor(t / 240)
r = t - q * 240
snappedStartTick = (q + (r >= 120 ? 1 : 0)) * 240
```

For the accepted safe integer domain `0 <= t < 30720`, this is exactly equivalent to `floor((t + 120) / 240) * 240`. All operands are small exact integers; no epsilon, floating tolerance, tempo conversion or cumulative rounding is used. Remainder 120 selects the later point. The grid origin is tick 0. Positive section-edge results may equal 30720; they are not silently changed to an earlier point.

Local processing order:

1. Require the existing current application/selected Lead-note context and in-flight guard; capture the selected note and expected parent together.
2. Require the captured start to be a safe integer in `[0,30720)` in the accepted 960 PPQ/eight-bar context. Missing/malformed local context fails closed with safe feedback and no dispatch; this check does not authenticate canonical state.
3. Compute the exact snapped tick above and require a safe-integer result. Do not clamp, wrap or select an alternative.
4. If the computed tick equals the captured tick, return without any Server Action, command, revision, digest, history/redo change or playback invalidation. A visibly disabled on-grid button is permitted if the handler independently preserves this no-op guard.
5. Otherwise submit exactly one existing v2 command through the existing boundary. Canonical source/ancestry, parent, target, stale-value, containment and ordering checks remain Node-owned. The browser must not treat the computed point as accepted state, hide an invalid outcome by choosing a different point, or weaken existing errors.

## Command, delegation and authoritative rejection

Construct the unchanged ordered v2 payload; example for tick 120 snapped to 240:

```json
{"schema":"nightdrive.editor-note-command.v2","type":"set-note-start-tick","noteId":"note-<stable-id>","expectedStartTick":120,"startTick":240}
```

Pass the captured current application, expected selected parent identity and command once through `setLeadStartTickAction` to pinned-Node `editEditorApplicationStartTickV1`. Reuse existing functions; no new Server Action, API route, command, version, canonical grid metadata, serializer or hash domain. Canonical provenance retains the absolute v2 transition and parent, not a new snap-command identity. No generation, seed/PRNG draw or Motif-policy repair.

The existing Node operation first independently re-verifies retained source/full ancestry and expected parent, then preserves v2 precedence: exact descriptor-safe command/schema/type and tick values; stable target identity/editability; expected old tick; section start/end containment; immediate-neighbor nondecreasing Lead start order; canonical no-op. This specification changes neither error codes nor precedence. A self-consistent forged history still rejects.

Require `0 <= snappedStartTick < 30720` and `snappedStartTick + unchanged durationTicks <= 30720`. Require preceding note start <= snapped start <= following note start where neighbors exist; equal starts and existing valid overlaps remain permitted. Reject a computed point that violates either constraint, even if another grid point would be valid. Never move neighbors, reorder notes, adjust duration, change identity, repair coverage, clamp or fall back.

## Success, history, errors and audition

Use existing pending duplicate protection and session/editor ownership invalidation for selection, revision or generation changes. A stale successful or rejected invocation cannot install state or feedback into a newer context. No automatic retry. No optimistic revision, note movement or preview mutation.

On success install only the complete returned `EditorApplicationV1` and its selected revision identity. One Snap Start creates one v2 child revision and one Undo step. Stable ID, pitch, duration, velocity, array order, source/section, every unrelated note and other roles remain unchanged. Preserve original `sourceResultHash`; derive preview only through the existing application boundary. Exact Undo/Redo identities and edit-after-Undo redo truncation follow existing history. Successful revision selection invalidates audition under existing policy, without automatic Play/resume.

On any rejection, install no result, partial note, hash or history. Preserve the prior complete application, selected revision, selection, Undo/Redo path, preview and audition except existing safe error feedback. Where a recognized existing start-range or start-order rejection can be identified safely, explain that Snap Start cannot fit the section or preserve note ordering; otherwise use the existing safe editor-operation diagnostic. Never expose raw exceptions, stack traces or private details. Already-on-grid actions and locally invalid context make no boundary call; rejected boundary calls are not retried.

## Required separate implementation evidence

- Independent arithmetic fixtures: 0 -> 0; 119 -> 0; 120 -> 240; 121 -> 240; 239 -> 240; 240 -> 240; 359 -> 240; 360 -> 480; 361 -> 480; 30719 -> 30720. Verify both sides of ties and exact on-grid no-op. Expected values must be literal/test-side arithmetic, not production helper outputs.
- Imported and added stable note targeting; exact captured expected parent/old tick and one unchanged v2 payload. Repeated pending activation dispatches once; stale success/failure after context change is ignored.
- Already-on-grid: no action dispatch, canonical revision/history/redo change, or audition invalidation. Locally missing/malformed context fails closed without a command.
- Section edge: computed 30720 rejects; a snapped start whose unchanged duration crosses end rejects; a note ending exactly at 30720 may pass existing constraints. No fallback to an earlier grid point. Immediate-neighbor inversions reject; equal starts and valid overlaps are allowed. Preserve all unrelated canonical values and source identity.
- Rejection keeps the application/history/preview/audition and uses safe feedback; no partial result or automatic retry. Success installs only returned application and invalidates audition without autoplay. Exact one-step Undo/Redo identity restoration; new edit after Undo clears redo; rejection/no-op preserves redo.
- Visible native button, keyboard activation, appropriate disabled states; existing free-drag, resize, transpose, add/delete and velocity interactions unchanged and unsnapped.

Reuse unchanged v2 canonical/hash/ancestry evidence and focused existing editor/history/application/action regressions; do not manufacture a new canonical encoding fixture. For the separate IMPLEMENT run pinned Node 24.21.0/npm 11.19.0 focused consumer/action/page and relevant editor/preview regressions, strict TypeScript, changed-file Biome, repository lint, docs, production build and diff checks under current policy. Local PASS remains a checkpoint; final cumulative integration needs its own external exact-head review against live remote base and required protected CI.

## Scope and limitations

No grid toggle or preferences, swing/triplets, pointer snapping, resize/create snapping, timing/duration quantization, pitch snapping, multi-note or other-role changes, new canonical semantics, audible velocity, persistence/auth/database/API/AI, dependencies, AC-014 timing or Stage 8 qualification. AC-015 remains partial; this one capability does not establish full milestone acceptance. Changes to action/role/grid/tie/rejection/ownership or provenance semantics require separate consequential authority.
