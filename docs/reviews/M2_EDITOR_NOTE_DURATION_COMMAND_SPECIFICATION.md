# M2 Lead note duration command

## Authority, lifecycle, and scope

**CANDIDATE.** This exact specification becomes implementation authority only after consequential external exact-head review PASS, explicit Product Owner acceptance of the reviewed tuple, and protected integration. Before those conditions are satisfied, it is not implementation authority.

This is one bounded SPECIFY extension to the integrated [M2 canonical editor revision and Lead pitch command](M2_EDITOR_REVISION_CONTRACT_SPECIFICATION.md), the accepted [Lead start-tick command](M2_EDITOR_NOTE_START_TICK_COMMAND_SPECIFICATION.md), and [ADR-027/ADR-028](../DECISIONS.md#adr-027--m2-canonical-editor-revisions-and-one-note-pitch-commands). It defines one existing Lead note's absolute duration edit. It is a producer-authored canonical editor revision, not a new generated result or regenerated source result.

The existing editor revision, root import, `set-note-pitch` v1 command, `set-note-start-tick` v2 command, source and ancestry verification, immutable history, derived preview, and audition invalidation behavior remain unchanged. AC-015 remains partial. This candidate authorizes no implementation, UI control, transport change, note add/delete, velocity edit, snapping, persistence, authentication, database, public API behavior, AI, dependency, MIDI/export, formal Stage 8 qualification, or AC-014 work.

## Versioned command and identity

Keep the canonical revision record as `nightdrive.editor-revision.v1` and keep its existing `nightdrive.editor-revision-hash-input.v1` digest domain and field order unchanged. Keep `nightdrive.editor-note-command.v1` and `nightdrive.editor-note-command.v2` byte-for-byte compatible with their accepted pitch and start-tick meanings. Add one separately versioned envelope, `nightdrive.editor-note-command.v3`, whose only supported type in this slice is `set-note-duration`.

The command is an exact ordinary own-data record in this field order:

```json
{"schema":"nightdrive.editor-note-command.v3","type":"set-note-duration","noteId":"note-<64 lowercase hex>","expectedDurationTicks":960,"durationTicks":1440}
```

The integer values are illustrative. `noteId` is the stable existing ID of one Lead note. `expectedDurationTicks` is that note's current duration in the verified selected parent. `durationTicks` is the absolute replacement duration, not a delta. The command occurrence is identified by its exact versioned schema/payload and its exact parent revision identity in the resulting child; no random ID, timestamp, command hash, or separate branch identity is introduced.

The child remains `nightdrive.editor-revision.v1`, with existing exact field order `schema, source, section, tracks, parent, command, revisionHash`. Its source and section match the verified parent; `parent` binds the exact selected `{schema, revisionHash}`; and `command` contains the exact v3 record. The existing revision-v1 hash input includes the exact nested command and complete resulting state while excluding the child's own `revisionHash`. No recursive hash is added. Root, pitch-v1, and start-tick-v2 revision bytes and hashes remain unchanged. A reader that does not support command v3 rejects it as `UNSUPPORTED_EDITOR_COMMAND_SCHEMA`; it must not reinterpret or fall back to another command version.

## Preconditions and exact state transition

The operation requires the retained, independently reverified complete `CompleteSectionResultV1`, immutable verified editor history and complete ancestry, an explicit expected parent, and the command. Use the existing authoritative boundary: recompute the root projection from the retained source, verify each command transition and complete state/hash, reject caller-asserted but unverified ancestry, then compare the expected parent to the selected revision identity. A self-consistent digest alone is not authority.

After source, ancestry, and expected-parent verification:

1. Validate the command descriptor-safely as an exact v3 own-data record in the declared field order. Reject accessors, symbols, functions, `toJSON`, custom prototypes, missing/extra fields, coercion, and malformed values without executing caller behavior.
2. Require the exact schema/type pair (`nightdrive.editor-note-command.v3`, `set-note-duration`), canonical `note-` plus 64 lowercase hexadecimal `noteId`, a positive safe-integer `expectedDurationTicks`, and a safe-integer `durationTicks` replacement. Replacement positivity is checked with the contextual section bound below.
3. Find exactly one matching stable ID on the Lead track. Reject an unknown ID as not found and a note in another role as not editable.
4. Require `expectedDurationTicks` to equal the target note's current duration in the verified selected parent; otherwise reject as stale.
5. Require the replacement `durationTicks` to be positive and to fit the existing section: `durationTicks <= 30720 - startTick`. This subtraction form avoids unsafe intermediate addition. Equivalently, the resulting `startTick + durationTicks` must not exceed the accepted section boundary at tick 30720. Do not coerce, clamp, wrap, or repair.
6. If the replacement equals the current duration, reject as `NO_OP_EDITOR_COMMAND`; create no revision, digest, history entry, or redo-path change.

On success, create a detached complete child revision from the verified parent. Change only the target Lead note's `durationTicks`; preserve its stable ID, pitch, `startTick`, velocity, all other notes, every other role, source, section, and array order exactly. Bind the exact parent and command, calculate the existing revision-v1 hash, recursively freeze returned ordinary data, and expose no mutable aliases. No generation call, seed/PRNG use, retry, fallback, or partial result exists.

The positive safe-integer and section-contained-span rules are the existing canonical event invariants. Preserve the existing Lead start order and event-array order; duration changes do not reorder notes or change event starts. Do not introduce a no-overlap/monophony rule: the accepted complete-section boundary requires valid event values, nondecreasing starts, and section-contained ends, but permits overlapping spans. A manual duration edit is intentional editor state and need not retain a Motif generator's rhythm template, policy-selected duration, phrase development, or other generated-policy invariants. Do not reinterpret or modify Motif V1.

## History, preview, and deterministic replay

Use the existing immutable in-memory revision sequence and cursor. A successful duration command appends and selects one child. Undo/redo navigates already verified revision identities and hashes exactly; navigation creates no command, revision, digest, or inverse edit and never mutates stored revisions. After undo, a successful duration edit creates a child from the currently selected revision and clears only the active redo suffix. Rejected, stale, malformed, out-of-section, or no-op commands preserve the selected revision and redo path.

Derive the existing noncanonical `CompleteSectionPreview` from the selected verified revision, copying pitch, start, and duration values exactly. `sourceResultHash` continues to identify the original generated result; it does not become a revision hash. Carry selected revision identity separately as already specified. Do not change the preview schema, audition gain behavior, or transport. Selecting a different revision continues to use the existing audition invalidation behavior: stop/invalidate playback as already specified; do not automatically restart it.

Given identical retained verified source, complete ancestry, selected parent identity, and exact command, the transition returns byte-identical canonical state and the same revision hash. No clock, locale, browser state, random value, object discovery order, or execution counter enters identity. The new command is additive; existing pitch-v1 and start-tick-v2 inputs and outputs retain their accepted compatibility and hashes.

## Rejection semantics

Preserve the existing source/ancestry/expected-parent precedence. After those checks, validate exact command shape and supported schema/type, target identity/editability, stale expected value, replacement duration and section bound, then no-op. Existing codes remain unchanged. Use:

- `INVALID_EDITOR_COMMAND` at `command` or the first malformed field;
- `UNSUPPORTED_EDITOR_COMMAND_SCHEMA` at `command.schema`;
- `UNSUPPORTED_EDITOR_COMMAND_TYPE` at `command.type`;
- `EDITOR_NOTE_NOT_FOUND` at `command.noteId`;
- `EDITOR_NOTE_NOT_EDITABLE` at `command.noteId`;
- `STALE_EDITOR_NOTE_VALUE` at `command.expectedDurationTicks`;
- `EDITOR_NOTE_DURATION_OUT_OF_RANGE` at `command.durationTicks` for a non-positive safe integer or a positive duration that exceeds the remaining section span;
- `NO_OP_EDITOR_COMMAND` at `command.durationTicks`.

Unsafe, fractional, nonnumeric, non-data, or otherwise malformed duration values are `INVALID_EDITOR_COMMAND` at the exact field before contextual range checking. A stale expected duration is reported before validating whether the replacement fits. No failure returns a revision, digest, tracks, preview, warning, or partial result, or mutates history. Safe producer-facing diagnostics remain separate from structured errors and never expose raw exception details.

## Ownership and implementation boundary

`composition` continues to own canonical revision values, exact serialization, source/root/ancestry verification, and revision digests. `editor` owns this command transition and immutable history selection. The existing pinned-Node application boundary remains responsible for accepting the validated result. Browser code may propose a command and render derived preview data but cannot create or authenticate canonical revisions. Reuse existing digest facilities; this SPECIFY creates no dependency or generalized command framework.

## Required implementation evidence

A later implementation candidate must include independent literal fixtures for the verified root and duration child: exact v3 command JSON; exact canonical child JSON/UTF-8 bytes; exact revision-hash input and digest recomputed through a test-side standard SHA-256 path; and equality evidence for unchanged source/parent, note identity/order, pitch, start, velocity, all unrelated notes, and other roles. Expected state/bytes must not be obtained from production transition or serialization helpers.

Focused tests must cover positive absolute edits, expected-old stale rejection, exact no-op behavior, positive/safe-integer and start-plus-duration section boundaries, invalid/malformed/forged command records, missing and non-Lead IDs, full source/ancestry verification against forged self-consistent history, rejection precedence, no partial result, complete immutability, deterministic replay, undo/redo identity restoration, redo truncation after a successful edit from an undone revision, unchanged pitch-v1 and start-tick-v2 fixtures/hashes, unchanged array order and start ticks, allowed overlap, projection of the selected duration into the existing preview with original `sourceResultHash`, and existing playback invalidation. Runtime, application, and UI behavior belongs to a later separately eligible implementation task.

This SPECIFY candidate runs documentation validation and `git diff --check` only. A later implementation candidate runs the relevant focused editor and complete-section regressions, strict TypeScript, changed-file and repository lint/Biome, docs validation, production build, and the then-required pinned-runtime CI. This candidate does not claim runtime validation, AC-015 completion, AC-014, or Stage 8 qualification.
