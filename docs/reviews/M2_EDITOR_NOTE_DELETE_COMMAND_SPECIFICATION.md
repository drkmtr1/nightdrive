# M2 Lead note deletion command

## Authority, lifecycle, and scope

**CANDIDATE.** This exact specification becomes implementation authority only after consequential external exact-head review PASS, explicit Product Owner acceptance of the reviewed tuple, and protected integration. Before those conditions are satisfied, it is not implementation authority.

This is one bounded SPECIFY extension to the integrated [M2 canonical editor revision and Lead pitch command specification](M2_EDITOR_REVISION_CONTRACT_SPECIFICATION.md), [Lead start-tick command](M2_EDITOR_NOTE_START_TICK_COMMAND_SPECIFICATION.md), [Lead duration command](M2_EDITOR_NOTE_DURATION_COMMAND_SPECIFICATION.md), and ADR-027 through ADR-029. It defines deleting one existing Lead note as a producer-authored canonical editor revision. AC-015 remains partial.

The change does not alter generation, First Playable V1, Motif V1, `CompleteSectionResultV1`, root import, revision-v1 schema or hash domain, the pitch-v1/start-tick-v2/duration-v3 meanings or bytes, history navigation, preview schema, or audition behavior. It authorizes no add, edit of another role, velocity change, snapping, persistence, authentication, database, API behavior, AI, MIDI/export, dependency, formal Stage 8 qualification, AC-014 timing, or Stage 10 completion. Runtime and UI implementation are separate later tasks.

## Versioned command and identity

Add one command envelope, `nightdrive.editor-note-command.v4`, with the only supported type `delete-note`. Its exact ordinary own-data field order and shape are:

```json
{"schema":"nightdrive.editor-note-command.v4","type":"delete-note","noteId":"note-<64 lowercase hex>"}
```

`noteId` identifies one existing Lead note in the exact verified selected parent. The parent revision identity, checked by the existing editor-history boundary, binds the complete state against which the command is applied. The command therefore carries no duplicated pitch/time/duration/velocity snapshot, random command ID, timestamp, or standalone command hash. The child revision binds the exact parent identity, exact v4 command, and complete resulting state using the existing `nightdrive.editor-revision.v1` schema and `nightdrive.editor-revision-hash-input.v1` digest domain. The child's own digest is excluded from its hash input as before.

Older command schemas retain their existing payloads and meaning. A reader without v4 support rejects it as `UNSUPPORTED_EDITOR_COMMAND_SCHEMA`; it never reinterprets or falls back to an earlier command.

## Verified preconditions and exact transition

Deletion requires the retained independently verified `CompleteSectionResultV1`, immutable verified editor history and complete ancestry, the expected selected parent identity, and the command. Apply the accepted source/ancestry verification before the expected-parent and command checks. A self-consistent revision digest does not establish a source or ancestry.

After source, ancestry, and parent verification:

1. Validate the command descriptor-safely as an exact v4 own-data record in the field order above. Reject accessors, symbols, functions, `toJSON`, custom prototypes, missing/extra fields, and malformed values without executing caller behavior.
2. Require the exact schema/type pair and a canonical `note-` prefix followed by 64 lowercase hexadecimal digits.
3. Require note IDs to be unique across the verified parent, as already required by the canonical editor revision contract. Reject a duplicate ID as invalid revision/lineage rather than choosing an occurrence. Find the target by stable ID; if no role contains it, reject as not found. If it exists only on a non-Lead role, reject as not editable.
4. Create one detached complete child revision by removing exactly the target note from the Lead notes array. Preserve the order and exact values of every remaining note; preserve every non-Lead role, source, section, parent binding, and all other revision fields. Create no partial revision on failure.

The existing note ID was derived at root import from the original source-result identity, role, and original event occurrence ordinal. Keep every surviving ID byte-for-byte unchanged. The Lead note array after deletion is the order-preserving subsequence of its prior array with the target removed; array indices compact, but surviving IDs are never recomputed from their new positions. If the deleted note was the last Lead note, the resulting Lead notes array is empty. This follows the existing dense-array event validator, which states no minimum event count; do not add a nonempty-track rule.

Deletion cannot make another note's pitch or timing invalid. Do not sort or renumber notes, add a no-overlap/monophony restriction, move neighbors, repair values, regenerate, or apply Motif generator constraints. Preserve the existing event-value, section-span, and order invariants for every remaining event.

## Source identity and authoritative ancestry verification

Canonical root import still derives IDs from the verified source and original role/occurrence ordinal and rejects a duplicate/colliding ID under the existing contract. Authoritative verification still recomputes that exact root, then verifies each child as the exact transition from its verified parent and command, including the complete resulting state and digest; child verification must preserve the unique-ID invariant.

For revisions after a deletion, current array index is no longer the original source ordinal. Shape validation may check the canonical ID syntax and uniqueness, but it must not reject a stable surviving ID merely because the current index shifted. Root equality against the retained source and full transition replay establish which IDs were introduced at root and which remain after each deletion. A forged root, forged child, self-consistent digest, claimed source hash, or serialized value without verified retained source and ancestry cannot become canonical authority. Canonical serialization and child creation continue to require the retained verified source and sufficient verified ancestry.

No tombstone, separate deletion registry, revision migration, extra revision field, new note identity derivation, or weaker standalone hash-verification path is introduced. Existing root, pitch, start-tick, and duration revision bytes/hashes remain unchanged.

## History, preview, and deterministic replay

Use the existing immutable in-memory revision sequence and cursor. A successful delete appends and selects one child. Undo/redo restores exact existing revision identities and hashes; navigation creates no inverse command/revision and mutates no stored revision. A successful delete from an undone revision truncates only the active redo suffix; a rejected delete preserves the selected revision and redo path. Previously created revision values and identities remain unchanged.

Derive the existing noncanonical `CompleteSectionPreview` from the selected verified revision, projecting the surviving note values in their unchanged order. A fully deleted Lead projects to an empty Lead preview track. The original `sourceResultHash` continues to identify the retained generated result; it is not replaced with an editor revision hash. Keep selected revision identity separate as already specified. Selecting the new revision uses the existing audition invalidation behavior; do not automatically restart playback.

Given identical retained verified source, complete ancestry, selected parent identity, and exact v4 command, the operation produces byte-identical revision state and the same revision hash. No clock, locale, browser state, random value, object-discovery order, or execution counter enters identity. No generator, seed, PRNG, retry, or fallback is used.

## Rejection semantics

Preserve the existing source, ancestry, and expected-parent error precedence. Then validate exact command shape/schema/type and the target ID. Use existing `INVALID_EDITOR_COMMAND`, `UNSUPPORTED_EDITOR_COMMAND_SCHEMA`, `UNSUPPORTED_EDITOR_COMMAND_TYPE`, `EDITOR_NOTE_NOT_FOUND`, and `EDITOR_NOTE_NOT_EDITABLE` errors at the owning command field. An ID already deleted in the selected parent is not found; a valid ID belonging to a non-Lead role is not editable. The command has no replacement value and cannot be a no-op once its required existing Lead target is found.

Malformed values fail before target lookup. No failure returns a revision, digest, tracks, preview, warning, or partial result, or changes history. Safe producer-facing diagnostics remain distinct from structured errors and never expose raw exceptions.

## Ownership and implementation boundary

Composition continues to own canonical revision values, exact serialization, root/source/ancestry verification, and revision hashes. Editor owns the delete transition and immutable history selection. The existing pinned-Node application boundary accepts only a validated result. Browser code may propose the stable target ID and render derived preview data; it cannot create or authenticate canonical revisions. Reuse existing digest facilities; no dependency, generalized command framework, HTTP endpoint, or persistence is introduced.

## Required implementation evidence

A later implementation candidate must include an independent literal root and delete-child fixture: exact v4 command JSON; exact child canonical JSON/UTF-8 bytes; exact revision-hash input and digest independently recomputed with a test-side standard SHA-256 path; and byte/value equality evidence that the source and parent binding, note order/identity/value of all surviving notes, all non-Lead tracks, and other unchanged fields are preserved. Expected child values must not come from production transition or serialization helpers.

Focused tests must cover deleting the first, middle, and final Lead notes; preserving source-ordinal IDs after array-index compaction; rejecting duplicate IDs; allowing an empty Lead track; unchanged other fields/roles and array order; allowed overlapping remaining spans; unknown and non-Lead IDs; stale parent; malformed/forged command records; source/ancestry rejection of self-consistent forged revisions; serialization and child creation requiring authoritative source/ancestry; error precedence; no partial result or history mutation; deterministic replay; complete immutability; undo/redo identity restoration; redo truncation after a successful delete from an undone revision; preservation of prior pitch-v1/start-tick-v2/duration-v3 fixtures and hashes; selected-revision preview projection with original source hash; and existing playback invalidation. UI deletion controls and accessibility evidence belong to a later bounded application task. This specification does not claim runtime validation, AC-015 completion, AC-014, or Stage 8 qualification.
