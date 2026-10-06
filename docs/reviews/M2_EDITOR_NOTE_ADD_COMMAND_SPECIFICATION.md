# M2 Lead note-add command

## Authority and lifecycle

**CANDIDATE.** This bounded SPECIFY candidate defines one Lead-note add command for Stage 10 / AC-015. It may authorize a separate local IMPLEMENT task only after consequential independent exact-head review returns PASS and the Product Owner explicitly accepts the exact reviewed tuple under ADR-031. It does not authorize implementation, a descendant candidate, or protected integration by itself. AC-015 remains partial.

The Product Owner selected: Lead-only scope; canonical velocity exactly 100; an added-note identity derived deterministically from the exact verified parent identity plus exact add command under a separately versioned identity domain; and insertion after every existing Lead note with the same startTick. The Product Owner also requires explicit absolute pitch, startTick, and durationTicks in the command, with no defaults or implicit derivation.

This contract is additive to ADR-027 through ADR-033 and the accepted M2 editor revision, pitch, start-tick, duration, deletion, atomic-position, and browser-drag specifications. It preserves First Playable V1, Motif V1, CompleteSectionResultV1, editor revision V1, its hash domain, retained-source/full-ancestry verification, all v1-v5 command bytes and semantics, immutable history, derived preview, original source identity, and existing audition invalidation.

## Command and resulting note

Define one exact versioned command envelope, nightdrive.editor-note-command.v6, with type add-note and these ordered own-data fields:

~~~json
{"schema":"nightdrive.editor-note-command.v6","type":"add-note","pitch":64,"startTick":960,"durationTicks":480}
~~~

The numbers are illustrative. pitch, startTick, and durationTicks are all required absolute canonical values. The command has no role field because this command type is Lead-only; no velocity field because its result velocity is fixed at 100; no noteId because the stable ID is derived; no expected-old fields because the exact verified parent identity binds the insertion state; and no index, timestamp, random value, command UUID, delta, default, or standalone command hash.

The resulting note has exactly the existing editor-note-v1 fields in their existing order: id, pitch, startTick, durationTicks, velocity. Its role is Lead. pitch, startTick, and durationTicks equal the command values exactly; velocity is 100. The Lead role, velocity policy, and field semantics are fixed parts of v6. A future change to any of those semantics requires separately versioned authority and must not reinterpret v6.

## Added-note identity

Do not extend or reinterpret source-occurrence IDs. Imported note IDs continue to use nightdrive.editor-note-id-input.v1 and the verified source result, role, and original source occurrence ordinal exactly as before.

For an added note, define the separate identity input schema nightdrive.editor-added-note-id-input.v1. Its compact fixed-order JSON is:

~~~json
{"schema":"nightdrive.editor-added-note-id-input.v1","parent":{"schema":"nightdrive.editor-revision.v1","revisionHash":"<parent-hash>"},"command":{"schema":"nightdrive.editor-note-command.v6","type":"add-note","pitch":64,"startTick":960,"durationTicks":480}}
~~~

The illustrative hash is a metavariable, not a literal. parent is the exact verified selected parent identity; command is the complete exact canonical v6 payload. Derive id as note- followed by the full lowercase SHA-256 digest of these exact UTF-8 bytes, using the existing deterministic digest facility. Use no truncation, array index, source occurrence ordinal, wall clock, random input, browser state, execution counter, or regenerated ID.

The same verified parent identity and same exact command produce the same added-note ID. A different parent identity is included in the digest input, so the equivalent payload is bound to a different parent-derived identity. Verify global note-ID uniqueness before accepting the child. If the derived ID already exists, fail closed with EDITOR_NOTE_ID_COLLISION at command; never choose a replacement ID, salt, counter, or alternate derivation. Existing source-note IDs and all surviving added-note IDs remain byte-for-byte unchanged through unrelated edits, insertion, deletion, and history navigation. Undo restores the exact stored prior value; it does not regenerate an ID.

## Validation and deterministic insertion

The operation requires the retained verified CompleteSectionResultV1, sufficient verified editor ancestry, the expected selected parent identity, and the v6 command. Browser code may propose explicit values but cannot authenticate or construct canonical revision state.

Apply the established source/revision authority first: verify the retained source; recompute the editor root projection; replay and verify every parent/command transition and full resulting state/hash; then validate the expected parent envelope and require it to match the selected verified revision. A self-consistent caller-supplied digest alone is not authority.

Validate the command as an exact descriptor-safe ordinary own-data record. Reject accessors, symbols, functions, toJSON, custom prototypes, missing/extra/reordered fields, and malformed values without executing caller behavior. Then require the exact v6 schema/type pair. Validate safe-integer numeric fields in command field order, without coercion and using the existing canonical-zero behavior.

Contextual value validation follows command field order:

1. pitch must be an integer MIDI value in 0..127; otherwise reject as INVALID_EDITOR_COMMAND at command.pitch. Then enforce the existing inclusive Lead hard range 60..84; otherwise reject as EDITOR_LEAD_PITCH_OUT_OF_RANGE at command.pitch.
2. startTick must be in [0, 30720); otherwise reject as EDITOR_NOTE_START_OUT_OF_RANGE at command.startTick.
3. durationTicks must be positive; otherwise reject as EDITOR_NOTE_DURATION_OUT_OF_RANGE at command.durationTicks.
4. The note end must be at or before tick 30720. After validating startTick, enforce durationTicks <= 30720 - startTick so the boundary check remains exact in safe-integer arithmetic; otherwise reject as EDITOR_NOTE_DURATION_OUT_OF_RANGE at command.durationTicks.

Derive the ID only after the command has passed value validation. Reject a collision with any note ID in the globally unique verified parent as EDITOR_NOTE_ID_COLLISION at command. No validation failure creates or exposes a child, mutates history, or changes the redo path.

On success, copy the complete verified parent and insert exactly one new note into its Lead note array at the first position whose existing startTick is greater than the new startTick. This places the new note after all existing notes with the same startTick while preserving every pre-existing note's relative order. It maintains the accepted nondecreasing Lead start ordering without sorting or reidentifying existing notes. The derived ID is independent of this insertion position.

Preserve all other Lead notes, all four role records and non-Lead notes, source, section, and every existing canonical value exactly. Do not add an overlap or monophony restriction; overlapping note spans remain permitted under existing event rules. Do not move neighbors, clamp, snap, repair, regenerate, or apply Motif generator-policy constraints. Addition is not a no-op because it creates one new note.

## Revision, history, preview, and compatibility

Create one child editor-revision-v1 from the exact verified selected parent. Bind the exact parent identity, exact v6 command, and complete resulting four-role state. Keep composition as owner of canonical validation, serialization, source/ancestry verification, and hashes; keep the editor/history module as owner of the add transition and immutable cursor navigation. Keep the existing revision-hash input schema, field order, and hash domain; its input commits the complete resulting state and command while excluding revisionHash itself.

On successful application, append/select the single child revision and truncate only the active redo suffix, as for other accepted edits. On rejection, leave the selected revision, immutable revision sequence, cursor, and redo path unchanged. Undo/redo navigate exact stored revisions and identities; they create no inverse command or revision. Applying the same command again from the same parent after undo deterministically recreates the same child and ID. A command from another parent has a parent-bound identity.

Derive the existing noncanonical CompleteSectionPreview from the selected verified revision. Include the added Lead event's exact pitch/start/duration in that projection; do not add an editor ID, velocity, or revision identity to the preview schema. Keep the original sourceResultHash bound to the retained generated result and expose the selected editor revision identity separately. Use existing audition invalidation for a selected revision change; do not automatically resume or alter transport.

Older command readers reject v6 as unsupported; they must not reinterpret or fall back to another command. Preserve v1-v5 schemas, bytes, meanings, error precedence, root IDs, revision hashes, and replay behavior. Do not bump the editor revision schema or change the revision hash domain.

## Implementation evidence required

A separate implementation candidate must include:

- exact command schema/field order and descriptor-safe malformed-input rejection;
- literal independent fixtures for the v6 command, added-note ID input, added-note ID, full child revision canonical JSON/UTF-8 bytes, revision-hash input, and resulting revision hash;
- test-side standard SHA-256 recomputation independent of production digest/serializer/transition helpers;
- exact equality evidence for unchanged source, parent binding, all other roles, all existing notes and IDs, and pre-existing Lead-note relative order;
- insertion fixtures before earlier starts, between starts, after the last start, and after all equal-start notes; verify no sort or renumbering;
- explicit velocity-100 result, Lead-only scope, and global note-ID uniqueness/collision fail-closed behavior;
- accepted value boundaries and invalid MIDI pitch, Lead range, start range, zero/negative/unsafe duration, and section-end overflow cases;
- accepted overlap behavior with an overlapping added note;
- validation/error precedence for source, ancestry, parent, exact command shape/schema/type, each numeric field, range/end, and ID collision;
- deterministic replay for identical parent+command; a different parent produces its own parent-bound ID;
- no-partial-result/history evidence, including unchanged redo path on rejection and redo truncation only after success;
- exact undo/redo identity/hash restoration and stable ID preservation;
- derived preview, original sourceResultHash, source immutability, and existing audition invalidation behavior;
- v1-v5 compatibility regressions and older-reader v6 unsupported behavior;
- no defaults, caller-selected velocity, random/timestamp/array-index identity, implicit UI value derivation, hidden repair, generation call, added dependency, or new public/API/persistence capability.

This candidate defines the canonical command only. It does not define how a future user interface gathers these explicit absolute values; any UI may convert an authorized interaction into the command values but requires its own bounded interaction authority before implementation. No add UI, accessibility interaction, pointer behavior, selection behavior, or visual design is authorized here.

## Scope and gates

Allowed specification scope: this document, its ADR in docs/DECISIONS.md, and the mechanical coordination snapshot in PROJECT_STATE.md. No runtime, UI, tests, dependency, workflow, or architecture implementation changes.

This SPECIFY candidate requires docs validation, focused authority-consistency scans, and git diff --check. It claims no runtime validation, implementation correctness, AC-015 completion, AC-014 timing, formal Stage 8 qualification, supported-platform qualification, musical acceptance, or release readiness.