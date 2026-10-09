# M2 Lead-note right-edge resize interaction

## Authority and lifecycle

**CANDIDATE.** Requires consequential independent exact-head PASS and explicit Product Owner acceptance of the exact tuple for local implementation under ADR-031. This SPECIFY task authorizes no implementation, publication, or AC-015 completion. The accepted remaining-M2 correction loop does not replace this gate.

Authority: Stage 10, AC-015, ADR-027/029/031/033, the accepted [duration command](M2_EDITOR_NOTE_DURATION_COMMAND_SPECIFICATION.md) and [drag interaction](M2_LEAD_NOTE_DRAG_UI_SPECIFICATION.md). Product Owner decisions select a right-edge-only handle, existing v3 duration/keyboard form, and reuse of the 4 CSS-pixel threshold, grab-offset, integer mapping, no-snap/no-clamp, proposal-only, release-once and cancellation conventions.

## Bounded producer behavior

Add a distinct right-edge resize handle to each existing Lead note in the existing Lead piano roll. Preserve the read-only four-role timeline and existing note-body v5 drag. Primary pointer-down on the handle selects/targets that note by stable noteId and owns a resize gesture; it must not also initiate a body drag. Selection alone remains noncanonical. Empty space and non-primary presses do not resize or create notes. Existing selection mechanisms remain available for overlapping notes.

The handle has an accessible name identifying the Lead note and its resize purpose. The existing visibly labeled Duration Ticks field and explicit Apply duration action remain the ordinary keyboard-operable alternative; do not invent keyboard-drag shortcuts. Preserve existing focus behavior and controls. No left-edge resizing is introduced.

## Exact proposal mapping

Capture the verified selected parent/source identities, note ID, original startTick/durationTicks, pointer client coordinates and positive finite usable plot width W in CSS pixels at pointer-down. Invalid geometry cancels without dispatch. Preserve the grab offset: use displacement from the press, never jump the note end to the pointer's absolute coordinate.

Compute deltaTicks as nearest integer to deltaX * 30720 / W, with exact half-integer ties away from zero. Proposed absolute durationTicks is original durationTicks + deltaTicks. Rightward movement lengthens; leftward movement shortens. Ignore vertical displacement for note geometry; pitch and startTick remain unchanged. Reuse the accepted Euclidean 4 CSS-pixel activation threshold: below threshold release is selection-only; at or above threshold activates resizing. Once activated it remains active until completion/cancellation.

Bar/beat guides remain display-only. No snap, quantization, rounding to a musical grid, implicit minimum-duration repair, clamp to section end, neighbor movement, sorting or regeneration. Integer-tick rounding above is coordinate mapping only. Non-finite/unsafe proposals fail closed without dispatch. Display transient duration/end feedback; invalid spans must not become canonical or be displayed as accepted state.

## Completion, cancellation and history

On active pointer release, if captured parent/source/target remain current and the proposal differs, submit at most one existing v3 set-note-duration command with stable noteId, expectedDurationTicks from the captured parent, and absolute durationTicks. Use the existing Server Action/pinned-Node duration operation and expected-parent binding; never serialize/authenticate canonical state in the browser. Delegate safe-integer, positivity, containment and stale-value validation/error precedence to the existing v3 contract. A safe-integer but out-of-section/nonpositive proposal may be rejected by that boundary; no repair occurs. Same-duration release sends no command. Pending-operation duplicate protection remains unchanged; do not retry automatically.

Pointer cancel, capture loss, Escape, unmount, parent/source replacement, selection change, and an intervening editor operation cancel the transient gesture and dispatch nothing. Release after cancellation cannot commit. Remove transient feedback and preserve the original canonical state/history. Canonical rejection likewise installs no partial result, preserves application/preview/history and uses existing safe duration-specific or generic diagnostics without raw exceptions.

On success install only the returned verified EditorApplicationV1. Change only duration through v3; preserve stable note ID, pitch, startTick, velocity, order, unrelated notes/roles and original sourceResultHash. One release creates one child revision and one Undo step. Exact Undo/Redo and redo truncation after successful edit remain unchanged. Use existing accepted edit-triggered audition invalidation; no autoplay/resume. Preserve permitted overlapping spans; no new monophony restriction.

## Required implementation evidence

- Distinct right-edge targeting sends no v5 position command; body drag remains unchanged; no left-edge/empty-space creation behavior.
- Independent CSS-pixel fixtures cover positive/negative displacement, preserved offset, integer/half-away ties, nonzero startTick and captured width; vertical displacement changes no musical field.
- Below/exactly/above 4-pixel activation; unchanged release dispatches nothing; active changed release dispatches exactly one v3 with captured expected duration/parent.
- Positive, section-ending and invalid zero/negative/out-of-section/unsafe proposals preserve existing v3 rejection semantics, no clamp/repair/neighbor movement and no partial revision.
- Cancellation, capture loss, Escape, unmount, selection/parent replacement, pending-operation and stale callback scenarios cannot commit a proposal.
- Success/Undo/Redo preserve source identity, exact canonical state/hash and one-step history; failure preserves history/preview and safe diagnostics; existing audition invalidation occurs only as already specified.
- Named handle and existing keyboard Duration Ticks/Apply path are accessible; existing body drag, velocity/add/delete/pitch/start controls and read-only timeline remain compatible.

Use existing focused fake/application/UI evidence, pinned Node 24.21.0/npm 11.19.0 and relevant regression checks, strict TypeScript, changed-file Biome, lint, docs, production build and diff checks for the later implementation. No new dependency or generalized gesture framework. This specification requires docs validation, authority/scope inspection and git diff --check only.

## Preserved boundaries

No new canonical command/schema/hash semantics, retained-source/ancestry ownership, revision-v1 change, audible velocity, add/delete changes, transpose, snap, other-role edit, persistence, API, AI, AC-014 timing or Stage 8 qualification. AC-015 remains partial. Implementation is a separately selected bounded task after consequential review and exact-tuple acceptance; cumulative integration remains separately reviewed against live main.
