# M2 Lead-note velocity command

## Authority, lifecycle, and scope

**CANDIDATE.** This exact specification may authorize a separate bounded local IMPLEMENT task only after consequential independent exact-head review returns PASS and the Product Owner explicitly accepts the reviewed tuple under ADR-031. It does not authorize implementation, a descendant candidate, or protected integration by itself. AC-015 remains partial.

This is one canonical command extension to the accepted M2 editor revision contract and the Lead-note pitch-v1, start-tick-v2, duration-v3, delete-v4, atomic-position-v5, and add-v6 specifications. It defines an absolute velocity edit to one existing Lead note. The edit is producer-authored canonical editor state; it is not a generated Motif result and does not reinterpret generator policy. If accepted, this later additive decision narrows earlier exclusions of canonical velocity editing only for this single Lead-note command; it does not supersede the preview/audition deferral or any other existing M2 boundary.

The Product Owner decided that canonical velocity editing must not change audition behavior in this task. Canonical note velocity remains in the editor revision, but CompleteSectionPreview continues to omit velocity and BrowserAudition continues to ignore it. This is an intentional temporary product limitation: unchanged audition loudness does not mean canonical velocity is meaningless or may be discarded. Audible velocity is deferred to a separate bounded specification.

## Versioned command and transition

Keep the revision record as nightdrive.editor-revision.v1 and keep the existing revision hash-input schema, field order, and digest domain. Keep all accepted command-v1 through command-v6 schemas, bytes, behavior, and compatibility unchanged. Add the separately versioned envelope nightdrive.editor-note-command.v7 with the sole type set-note-velocity and these exact ordered own-data fields:

~~~json
{"schema":"nightdrive.editor-note-command.v7","type":"set-note-velocity","noteId":"note-<64 lowercase hex>","expectedVelocity":100,"velocity":88}
~~~

The numeric values are illustrative. noteId is the stable ID of one existing Lead note in the exact verified selected parent. expectedVelocity is that note’s current canonical velocity. velocity is the explicit absolute replacement, not a delta. There is no caller-selected role, command UUID, timestamp, random value, redundant expected note snapshot, separate command hash, or standalone revision identity. The separately supplied expected parent and verified history bind the command to the selected state.

After full verification of the retained source, complete immutable history and ancestry, and expected selected parent, apply the v7 command atomically. On success create exactly one detached child revision-v1. Change only the target Lead note’s velocity. Preserve its stable ID, pitch, startTick, durationTicks, array position and order, source binding, section, every other note, and every other role exactly. Do not generate, repair, clamp, rescale, reorder, or reinterpret Motif or generator policy.

The target note must exist in the verified selected parent and belong to Lead. A syntactically valid note ID found only on another role is not editable; an ID absent from every role is not found. No other note or role is editable through v7.

## Canonical value rules and rejection precedence

The existing canonical note invariant is a safe-integer velocity in the inclusive range 1..127. Root import and the v6 add-note command continue to initialize velocity to 100. This command changes only an existing Lead note’s canonical velocity and does not change those earlier policies.

Preserve the established authoritative error order:

1. Verify the retained CompleteSectionResultV1 and the complete source-rooted revision ancestry, including every command transition, full child state, and revision hash. A self-consistent digest or claimed verification alone is not authority.
2. Validate the expected-parent envelope and require its identity to equal the verified selected revision. Invalid or stale parent errors precede command errors, as in the existing history boundary.
3. Validate the command as a descriptor-safe exact ordinary own-data record with exactly the declared fields in the declared order. Reject accessors, symbols, functions, toJSON, custom prototypes, missing or extra properties, and malformed values without invoking caller code.
4. Require the exact v7 schema, then the exact set-note-velocity type. Validate noteId syntax as note- followed by 64 lowercase hexadecimal characters. Parse expectedVelocity and velocity as safe integers without coercion. expectedVelocity must itself be in 1..127; an invalid expected field is INVALID_EDITOR_COMMAND at command.expectedVelocity. A malformed or unsafe replacement is INVALID_EDITOR_COMMAND at command.velocity.
5. Resolve noteId in the verified selected parent. Report EDITOR_NOTE_NOT_FOUND at command.noteId when absent from every role; report EDITOR_NOTE_NOT_EDITABLE at command.noteId when present only outside Lead.
6. Compare expectedVelocity to the target’s current velocity. If unequal, report STALE_EDITOR_NOTE_VALUE at command.expectedVelocity. This stale-value failure precedes contextual range and no-op checks for a syntactically valid replacement.
7. Require replacement velocity in 1..127. Values outside the range report EDITOR_NOTE_VELOCITY_OUT_OF_RANGE at command.velocity. This is the new stable field-specific error for the new command; do not repurpose pitch, timing, or duration errors.
8. If replacement velocity equals the current velocity, report NO_OP_EDITOR_COMMAND at command.velocity. A no-op creates no revision or digest and does not change the selected history cursor or active redo path.

Thus malformed/non-safe-integer values fail before target lookup; target identity/editability is checked before stale comparison; stale expected velocity is checked before replacement range and no-op. No failure returns a revision, hash, preview, warning, or partial result, or mutates history. Safe user-facing messages remain separate from structured errors and must not expose raw exceptions.

## Revision identity, history, and deterministic replay

The exact v7 command is nested in the existing revision-v1 child and included in its existing fixed-order revision-hash input. The child hash continues to commit the exact source binding, selected parent identity, command, and complete resulting four-role state while excluding its own revisionHash. Do not bump the revision schema, change the hash domain, or add a velocity-specific digest.

A successful command appends and selects exactly one child revision and therefore creates exactly one Undo step. Undo and redo navigate the already verified immutable revisions and restore their exact prior or next identities and hashes; navigation creates no command, revision, digest, or inverse edit. A successful new edit from an undone revision truncates only the active redo suffix. A rejected, stale, malformed, out-of-range, or no-op command preserves the selected revision and redo path.

Given the same retained verified source, complete ancestry, selected parent identity, and exact v7 command, the operation must produce byte-identical child revision data and the same revision hash. Do not use wall clock, locale, randomness, browser state, discovery order, a counter, PRNG, or generation call.

## Derived preview and audition behavior

Derive the existing noncanonical CompleteSectionPreview from the selected verified revision using its existing projection. That preview schema contains pitch and timing geometry, not velocity. Since v7 changes velocity only, the derived preview’s canonical field values and sourceResultHash remain unchanged; the selected editor revision identity changes separately to the new child identity. Do not add velocity or revision identity to CompleteSectionPreview and do not replace sourceResultHash with the editor revision hash.

Preserve the existing audition invalidation behavior when the selected revision changes: invalidate/stop active playback as already specified, and do not automatically restart. An explicit later Play continues to use the existing velocity-agnostic preview and gain mapping, so loudness is unchanged by this v7 command. Do not change BrowserAudition scheduling, note gain, role normalization, master volume, mute/solo behavior, or any audition mapping.

A future, separately authorized SPECIFY task must decide whether velocity enters the preview schema; the exact velocity-to-gain mapping; its interaction with role gain/normalization and master volume; clipping/headroom behavior; and browser audition validation/evidence. This candidate selects none of those semantics.

## Ownership, compatibility, and implementation evidence

Composition remains the owner of canonical revision values, exact serialization, retained-source and full-ancestry verification, and revision hashes. The editor transition/history boundary owns v7 validation and the one-note transition. A later bounded implementation may expose v7 through the existing pinned-Node application boundary. Browser data cannot authenticate or construct canonical revisions. This canonical command specification does not define a producer UI, controls, value-entry interaction, accessibility interaction, or visual design; any UI exposure requires its own bounded task and authority. Reuse existing deterministic digest and validation facilities; add no dependency or generalized command framework.

Readers that do not support v7 must reject it as UNSUPPORTED_EDITOR_COMMAND_SCHEMA and must not reinterpret or fall back to another command. Keep all v1-v6 command bytes, meanings, rejection behavior, and compatibility fixtures unchanged. The revision-v1 schema, source/root import, all existing note IDs, v6 velocity-100 creation policy, immutable history, preview schema, and current audition behavior remain unchanged.

A later implementation candidate must include:

- An independent literal v7 command and child-revision fixture with exact canonical JSON/UTF-8 bytes, exact revision-hash input, and resulting digest recomputed by a test-side standard SHA-256 path rather than production transition, serializer, or digest helpers.
- Equality evidence proving only the target Lead velocity changes and that note ID, pitch, startTick, durationTicks, array order, source, section, every other note, and every non-Lead role are unchanged.
- Accepted boundary cases at velocities 1 and 127; rejection of 0, 128, negative, fractional, unsafe, nonnumeric, and malformed descriptor inputs; invalid expectedVelocity; stale expected-value rejection; unknown/non-Lead IDs; exact field-order/extra-field rejection; and the stated mixed-failure precedence.
- No-op rejection with no revision, hash, selection, or redo-path change; no-partial-result evidence; complete immutability; deterministic replay; source/full-ancestry verification; exact undo/redo identity/hash restoration; and redo truncation only after successful application from an undone revision.
- Regression evidence that the root import and v6 add still use velocity 100; v1-v6 fixtures, hashes, and semantics remain unchanged; unsupported readers fail closed on v7; and no generator, Motif-policy, seed, PRNG, retry, fallback, or dependency path is introduced.
- Preview evidence showing the same CompleteSectionPreview values and original sourceResultHash before and after a velocity-only edit, with the selected revision identity advancing independently. Verify current audition mapping remains velocity-agnostic and unchanged; do not claim audible-velocity behavior or timing qualification.

This candidate specifies canonical command behavior only. It does not authorize runtime or UI implementation in the same task, audible velocity, preview changes, resize, transpose, snap, add/delete changes, other-role editing, persistence, AC-014 timing work, Stage 8 qualification, or AC-015 completion. AC-015 remains partial.

## Validation and gates

This is a documentation-only SPECIFY candidate. Validate documentation and links with the repository documentation check, focused authority-consistency scans, and git diff --check. Runtime, UI, browser-audition, and production-build results are not claimed. A later implementation requires its own bounded task, validation, and applicable independent review. This specification remains a candidate until consequential independent exact-head review PASS and explicit Product Owner acceptance of the exact reviewed tuple.
