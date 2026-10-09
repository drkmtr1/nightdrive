# M2 Lead note atomic drag command

## Authority, lifecycle, and scope

**CANDIDATE.** This exact specification is eligible to authorize a separate bounded local implementation only after consequential independent exact-head review PASS and explicit Product Owner acceptance of that exact reviewed tuple under ADR-031. That acceptance does not accept a descendant or cumulative integration candidate. Protected integration remains at the recorded milestone/sub-milestone boundary. This SPECIFY task authorizes no implementation.

This is a bounded extension to the accepted M2 canonical editor revision contract, Lead start-tick command, Lead duration command, Lead deletion command, and ADR-027 through ADR-030. It specifies one existing Lead note's atomic canonical position change for the Stage 10 / AC-015 drag capability. AC-015 remains partial.

The selected operation changes only one note's MIDI pitch and absolute startTick in one versioned command and one child revision. It does not issue set-note-pitch v1 and set-note-start-tick v2 sequentially for one two-axis drag. Those existing commands retain their exact schemas, meanings, bytes, and independent use by their existing single-field surfaces.

This contract does not define browser pointer mechanics, drag thresholds, coordinate mapping, snapping/grid behavior, keyboard gesture behavior, selection policy, accessibility interaction, or visual design. Those are not needed to define or validate the canonical atomic transition. Any such UI behavior must remain within existing accepted authority or receive its own bounded decision before implementation. This specification does not authorize a browser drag control.

First Playable V1, Motif V1, CompleteSectionResultV1, editor root import, nightdrive.editor-revision.v1, its hash-input domain, retained-source and ancestry verification, immutable history, existing pitch-v1/start-tick-v2/duration-v3/delete-v4 commands, derived CompleteSectionPreview, original source-result identity, and audition invalidation remain unchanged. No snapping, regeneration, Motif-policy repair, neighbor movement, velocity change, resize, add/delete, other-role editing, persistence, authentication, database, API redesign, AI, dependency, Stage 8 qualification, AC-014 work, or AC-015 completion is authorized.

## Ownership and trusted boundary

composition continues to own canonical revision values, source/root/ancestry verification, exact serialization, and revision hashes. editor owns the v5 command transition and immutable history cursor behavior. The existing pinned-Node application boundary remains responsible for validating and applying commands. Browser state may propose the two replacement values and display the derived result; it does not authenticate or author canonical revisions.

The transition requires the retained, independently verified complete CompleteSectionResultV1, the verified selected parent and sufficient complete ancestry, the current selected parent identity, and one command. Recompute the source root projection and replay every parent/command transition under the existing verification contract. A self-consistent digest, shape-valid revision, CompleteSectionPreview, or caller claim of verification is not authority. Preserve source/section binding and all existing fail-closed behavior.

## Versioned command and compatibility

Keep nightdrive.editor-revision.v1, its exact field order, nightdrive.editor-revision-hash-input.v1, root import, and the current revision digest procedure unchanged. Add one separately versioned envelope, nightdrive.editor-note-command.v5, whose only command type in this slice is set-note-position.

The exact ordinary own-data command field order and shape are:

    {"schema":"nightdrive.editor-note-command.v5","type":"set-note-position","noteId":"note-<64 lowercase hex>","expectedPitch":60,"expectedStartTick":480,"pitch":62,"startTick":960}

The numeric values are illustrative. set-note-position means exactly the pair of absolute canonical fields pitch and startTick; it carries no delta, velocity, duration, event-array index, random command ID, timestamp, standalone command hash, or UI gesture metadata. noteId is the stable ID of one existing Lead note in the exact verified selected parent. expectedPitch and expectedStartTick are copied from that note in that parent. pitch and startTick are the absolute replacement values.

The revision-v1 child binds the exact selected parent identity, exact v5 command, and complete resulting four-role state. The existing revision hash input commits the nested v5 schema/payload and resulting state, while excluding the child's own revisionHash exactly as before. The exact revision schema, fixed-order canonical encoding, digest domain, source identity, and hash ownership do not change. Existing root and v1-v4 command/revision bytes and hashes remain unchanged. A reader that does not support v5 must reject it as UNSUPPORTED_EDITOR_COMMAND_SCHEMA; it must not reinterpret it as v1/v2, split it, or fall back.

## Atomic transition semantics

After retained-source, ancestry, and selected-parent verification, validate the command as one exact descriptor-safe ordinary own-data record in the declared field order. Reject malformed prototypes, accessors, symbols, functions, toJSON, missing or extra fields, reordered fields, coercion, and malformed values without executing caller behavior.

The stable ID must identify exactly one note on the Lead track. Unknown IDs are not found; IDs on other roles are not editable. Both expected values must match that note in the verified selected parent. They bind the operation to the exact selected state and prevent a stale pitch or start value from being overwritten.

Before constructing any child, validate both replacement values and all final-state constraints:

- expectedPitch and pitch are safe-integer MIDI values in 0..127; the replacement Lead pitch must also satisfy the existing inclusive hard range 60..84.
- expectedStartTick and startTick are safe integers. The replacement startTick must be in [0, 30720).
- The target keeps its current positive duration. Its resulting end must remain at or before tick 30720, equivalently startTick <= 30720 - unchangedDurationTicks.
- The replacement start must preserve the existing nondecreasing Lead order in the unchanged array position: it is greater than or equal to the immediate preceding note's start, if any, and less than or equal to the immediate following note's start, if any. Equal starts remain valid.
- Preserve the existing overlap policy. Do not introduce a no-overlap or monophony rule.
- Preserve the original Lead array order. Do not sort, move, or reidentify neighboring notes.
- Do not apply Motif scale, structural-target, phrase, rhythm-template, leap/recovery, register-band, or other generator-policy validation to intentional manual edits.

Validate the complete proposed pair together against the selected parent. The operation either accepts both replacement fields and creates exactly one full child revision, or rejects without creating or exposing any partial revision/state. No intermediate revision changing only pitch or only time is permitted. No automatic neighbor adjustment, snapping, clamping, rounding, regeneration, repair, retry, or fallback occurs.

If both replacement values equal the selected note's current values, reject the entire command as NO_OP_EDITOR_COMMAND; create no revision, hash, history entry, or redo-path change. If exactly one replacement equals its current value and the other changes, the command is valid if all checks pass: the unchanged field is carried explicitly, and the transition still produces one child revision. It is never translated into or followed by a second command.

On success, copy the complete selected parent revision and change only the target Lead note's pitch and startTick. Preserve the stable note ID, duration, velocity, array position/order, all other notes, every other role, source, and section exactly. Bind the selected parent and exact v5 command, compute the existing revision-v1 hash, and return the existing detached immutable revision value. Do not modify the retained generated result.

## Exact validation and rejection precedence

Preserve the existing source/ancestry and expected-parent boundary. Validation order for this command is:

1. Verify the retained complete source, recomputed root projection, all ancestry transitions, full expected states, and hashes. Propagate existing source/lineage errors.
2. Validate and match the explicit expected selected-parent identity.
3. Validate exact command record structure/property order, supported schema/type, stable-ID syntax, and primitive integer domains in declared field order. Pitch values must be safe integers in 0..127; tick values must be safe integers. Structural failures precede target/staleness checks.
4. Resolve the target stable ID and require it to be on Lead.
5. Compare expectedPitch to the selected note's current pitch; on mismatch reject first as STALE_EDITOR_NOTE_VALUE at command.expectedPitch.
6. Compare expectedStartTick to its current start; on mismatch reject as STALE_EDITOR_NOTE_VALUE at command.expectedStartTick. If both expected values are stale, the pitch mismatch wins because it appears first in the command field order.
7. Check replacement Lead pitch 60..84; reject as EDITOR_LEAD_PITCH_OUT_OF_RANGE at command.pitch.
8. Check replacement start section bounds and unchanged-duration containment; reject as EDITOR_NOTE_START_OUT_OF_RANGE at command.startTick.
9. Check inclusive immediate-neighbor ordering; reject as EDITOR_NOTE_START_ORDER_INVALID at command.startTick.
10. If and only if both replacement values equal the old values, reject as NO_OP_EDITOR_COMMAND at command.

Use existing INVALID_EDITOR_COMMAND, UNSUPPORTED_EDITOR_COMMAND_SCHEMA, UNSUPPORTED_EDITOR_COMMAND_TYPE, EDITOR_NOTE_NOT_FOUND, EDITOR_NOTE_NOT_EDITABLE, STALE_EDITOR_NOTE_VALUE, EDITOR_LEAD_PITCH_OUT_OF_RANGE, EDITOR_NOTE_START_OUT_OF_RANGE, EDITOR_NOTE_START_ORDER_INVALID, and NO_OP_EDITOR_COMMAND codes and their existing safe diagnostic boundary. Malformed safe-integer/domain values use INVALID_EDITOR_COMMAND at their exact command field. No error returns a child, hash, preview, warning, partial state, or changed history. Rejected commands preserve selected revision and redo path.

This order makes conflicts deterministic: structural errors precede lookup; lookup precedes stale comparisons; stale pitch precedes stale start; contextual pitch precedes timing; section containment precedes neighbor order; no-op is checked only after both proposed values are otherwise valid. Tests for mixed-invalid inputs must lock down these cases.

## History, preview, replay, and audition

Use the existing immutable verified in-memory revision sequence and cursor. One successful v5 command appends exactly one child and advances the cursor by one. One Undo selects the exact parent revision identity/hash; one Redo selects the exact child identity/hash. Navigation creates no command or revision and mutates no stored revision. After Undo, a successful new command creates a child of the selected revision and truncates only the active redo suffix. Failure/no-op leaves history and redo unchanged.

Given identical retained source, complete ancestry, selected parent identity, and exact v5 command, applying and independently replaying it yields byte-identical canonical child data and the same revision hash. Source, parent, command, and full result remain covered by the existing canonical digest. No time, locale, randomness, browser state, pointer coordinates, object discovery order, or execution counter enters canonical identity.

Derive the existing noncanonical CompleteSectionPreview from the selected verified revision, projecting its pitch and tick values exactly and retaining the original generated sourceResultHash; keep selected editor revision identity separate. Use existing audition invalidation when the selected revision changes. Do not change preview schema, existing audition gain behavior, or transport, and do not automatically resume playback.

## Required implementation evidence and separate gates

A later IMPLEMENT candidate must prove the v5 transition independently at the composition/editor boundary: literal exact command bytes; exact child canonical JSON and UTF-8 bytes; exact existing revision-hash input and digest recomputed through the standard test-side SHA-256 path; and full equality evidence that only the selected note's pitch/start changed. Expected semantic/canonical values must not be obtained from the production transition or serializer.

Focused tests must cover:

- two-axis transition creates exactly one child/revision and one Undo/Redo step, with no intermediate one-axis revision;
- a pitch-only or start-only change carried through v5 leaves the other field unchanged and still creates one revision;
- both replacement fields unchanged reject as one command-level no-op, with no history or redo mutation;
- both expected-old values match; each independent stale case; both stale values with pitch error precedence;
- malformed records, unsupported v5 schema/type, unsafe/fractional/non-number values, unknown ID, non-Lead ID, and source/ancestry forgery rejection;
- pitch values 60 and 84 accepted where other checks pass, and 59/85 rejected;
- start at 0 and the last legal in-section tick, section-end containment, immediate previous/next neighbor boundaries (including equality), order failures, and accepted overlaps;
- mixed-invalid cases locking down the exact precedence above;
- stable ID, unchanged duration/velocity/array index/order, unrelated Lead notes, all other roles, source, and section;
- deterministic replay, complete immutability, no partial result, undo/redo identity restoration, edit-after-undo redo truncation, and rejected-command redo preservation;
- canonical preview derived from the selected revision with the original source-result hash and existing playback invalidation;
- all prior pitch-v1, start-tick-v2, duration-v3, and delete-v4 fixtures/bytes/hashes remain unchanged.

A later browser drag implementation must translate one completed gesture to exactly one v5 command and must not dispatch v1/v2 sequentially for that gesture. It must receive a separate task boundary and must not invent pointer, snapping, keyboard, accessibility, selection, or visual behavior not already authorized. No UI acceptance is claimed by this SPECIFY.

This candidate requires documentation validation, focused contract-consistency scans, and git diff --check. Later runtime work requires the applicable editor/complete-section regressions, strict TypeScript, changed-file and repository Biome/lint, documentation validation, production build, and the then-current pinned-runtime CI. AC-015 remains partial; AC-014, formal Stage 8 qualification, supported-platform claims, musical acceptance, and release gates are unchanged.