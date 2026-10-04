# M2 canonical editor revision and Lead pitch command

## Authority, lifecycle, and scope

**CANDIDATE.** This exact specification becomes accepted implementation authority only after consequential external exact-head review PASS, explicit Product Owner acceptance of the reviewed tuple, and protected integration. Before those conditions are satisfied, it is not implementation authority. No status-only mutation is needed to complete that lifecycle.

This SPECIFY task implements the Product Owner's D1-D4 decisions: one existing Lead note's absolute pitch; imported velocity 100; deterministic source/event/revision identity; immutable revision-history cursor navigation. Trace to FR-004/AC-015, the accepted M2 roadmap, MUSIC_DOMAIN_MODEL Events and invariants, COMPOSITION_ENGINE Reproducibility and lineage, and ADR-022/023/026. ADR-027 records the bounded ownership decision. This first slice partially advances AC-015; it does not claim the full editor acceptance criterion.

The original verified `CompleteSectionResultV1` remains separately retained and unchanged. First Playable V1, Motif V1, complete-section generation, their validators/bytes/hashes, all seed behavior, and existing unedited preview/transport remain unchanged. An edited revision is producer-authored state, not a generated Motif result. No add/delete/timing/resize/velocity command, Harmony editing, locks, regeneration, persistence, authentication, database, new API behavior, AI, MIDI/export, dependency, or browser canonical-authoring qualification is part of this contract. AC-014 and S8-QUAL-002/003 retain their current gates.

## Ownership and execution boundary

`composition` owns editor revision values, source/parent binding, import projection, aggregate validation, fixed-order canonical encoding, and revision hashes. `editor` owns the single command validation/transition and immutable history selection. Reuse music-domain pitch/time primitives and the existing digest adapter; no framework, process, browser clock, filesystem, or provider semantics enter those modules. Standard UTF-8/SHA-256 facilities stay behind the accepted adapter ownership boundary.

Trusted import, command acceptance, and revision verification initially execute in pinned Node 24.21.0/npm 11.19.0 through a later small application adapter. Browser code may propose a command, display validated projections, and select already validated history entries; it does not originate or authenticate canonical revisions. This specification defines domain operations, not a server action, HTTP endpoint, session service, or persistence mechanism. A later bounded adapter must preserve these semantics.

Build-vs-Buy: revision, lineage, identity, and musical-command semantics are Nightdrive-specific. UTF-8/SHA-256 are commodity mechanisms already available through the accepted adapter. No new dependency, generic canonicalizer, event-sourcing framework, or state-management framework is justified.

## Exact identities and values

New schema identities are:

- revision: `nightdrive.editor-revision.v1`;
- revision hash input: `nightdrive.editor-revision-hash-input.v1`;
- note ID input: `nightdrive.editor-note-id-input.v1`;
- command: `nightdrive.editor-note-command.v1`;
- command type: `set-note-pitch`.

These literals are independent of historical generation schemas. A revision's identity is the pair `(schema, revisionHash)`. `revisionHash` and source `resultHash` are 64 lowercase hexadecimal SHA-256 characters. They identify deterministic content with its recorded lineage, not an execution instance, user, timestamp, or persistence row. No random IDs, clocks, new seed, or execution counters enter canonical state.

The returned/final serialized revision has exactly this field order:

```text
schema, source, section, tracks, parent, command, revisionHash
```

`source` has exactly `schema, resultHash`, where schema is `nightdrive.complete-section-result.v1` and the hash is the independently reverified full source result's accepted result hash. Its existing engine/generator/policy identities remain bound by that exact source result and are not copied as editable fields. Retaining the source is mandatory; its hash alone cannot substitute for inspectable source material during verification.

`section` has exactly `ppq, barCount, timeSignature, tempo, endTick`. Nested field orders are `numerator, denominator` and `microsecondsPerQuarter`. Values are copied from the verified source with fixed `ppq=960`, `barCount=8`, meter 4/4, `endTick=30720`, and the source's strictly validated positive integer tempo. These are canonical editor section values; the original section encoding is not rewritten.

`tracks` is an array of exactly four records in `harmony, bass, arpeggiator, lead` order. Each record has exactly `role, notes`. Each note has exactly `id, pitch, startTick, durationTicks, velocity`. Role is track-owned; provenance is revision-owned through source, parent and command, avoiding redundant per-note provenance copies. A note's original source occurrence is recoverable through the deterministic ID import rule. Editing never changes that ID.

At root, `parent=null` and `command=null`. A child has parent exactly `{ schema: "nightdrive.editor-revision.v1", revisionHash: <verified parent hash> }`, with fields in that order, and the exact accepted command. Source and section equal the parent's canonical values. All values are detached, recursively frozen ordinary data; no returned mutable reference aliases caller state. Original source and parent are never modified or frozen in place.

## Root import and stable note IDs

Import accepts the full existing complete-section result, not `CompleteSectionPreview`. Run the accepted complete-section verifier first; use its detached validated output. Propagate its structured errors unchanged. Do not regenerate components or manufacture missing source values.

Project source notes without changing pitch/ticks:

1. Harmony: visit its four accepted slots in index order. Accumulate slot start from `bars * 3840`; emit one note per selected voicing pitch in its accepted ascending order, each with the slot duration.
2. Bass: visit the accepted canonical event array in its existing order.
3. Arpeggiator: visit the accepted canonical event array in its existing order.
4. Lead: visit the accepted canonical `lead.events` array in its existing order. The Motif plan remains in the retained source, not as editable revision state.

For each role independently, original occurrence ordinal is zero-based array position in this exact projection. Do not resort by edited pitch, object discovery, ID, or UI position. Notes always retain the import order in all revisions; no note insertion/deletion is authorized. Equal-time Harmony pitches are already ordered by the accepted voicing projection. This provides deterministic ordering even after a pitch edit.

For source `S`, role `R`, ordinal `N`, note-ID hash input is compact fixed-order JSON:

```json
{"schema":"nightdrive.editor-note-id-input.v1","source":{"schema":"nightdrive.complete-section-result.v1","resultHash":"<S>"},"role":"<R>","ordinal":0}
```

The illustrated ordinal `0` is replaced by `N`; angle-bracket strings above are explanatory metavariables, never literal accepted values. ID is `note-` plus lowercase SHA-256 of the exact UTF-8 bytes. This full-width digest is not truncated. The ID includes neither editable pitch nor timing/velocity, so an edit retains identity. Require unique IDs across the revision; a detected duplicate/collision rejects import rather than substituting another ID.

Initialize every imported note in all four roles with velocity exactly 100. This is the explicit M2 import policy, not a claim about generator expression. All four-role root values must equal this recomputed projection from the verified source; arbitrary valid notes with a forged source hash are rejected.

## Event validity and intentional manual Lead state

Use accepted numeric domains without coercion: safe-integer pitch `0..127`, start tick `0..30719`, positive safe-integer duration, safe-integer end `startTick+durationTicks <=30720`, and integer velocity `1..127`. Preserve the accepted canonical-zero conventions of the reused primitives and byte encoding; no ambient numeric formatting is permitted.

Lead additionally has the existing global inclusive hard range `60..84` from MOTIF_MODEL Pitch vocabulary, targets, range, and leaps. The narrower resolved `lower/middle/upper` register band is a generator-selected policy and does not constrain manual edits. Manual Lead pitch need not belong to the source scale/chord, satisfy structural targeting, preserve contour, obey generator leap/recovery/phrase policy, or regenerate a Motif plan. The original valid generation remains inspectable separately. This intentional manual-state distinction does not relax Motif V1's own validator.

Other roles and every note's timing, duration and velocity remain exact root-import values. The first command cannot change overlap, section coverage, voice counts, Harmony voicings, Bass/Arpeggiator ranges, tempo, or source musical context. No hidden repair, snapping, clamping, nearest-tone lookup, transpose-to-fit, or generator call is allowed.

## Single command and transition

The command has exactly these ordered own-data fields:

```json
{"schema":"nightdrive.editor-note-command.v1","type":"set-note-pitch","noteId":"note-<64 lowercase hex>","expectedPitch":60,"pitch":61}
```

Pitch numbers are illustrative; actual replacement must be in `60..84`. A command occurrence is identified by its exact schema/payload and the exact parent revision identity in the resulting child. No extra operation UUID or redundant command hash is stored.

The domain operation receives the retained full source result, a verified parent revision with its root/command ancestry available, an explicit expected parent `{schema, revisionHash}`, and one command. The expected parent must equal the currently selected verified revision identity. The application must reject a result that no longer owns the current selection; no stale asynchronous result can replace newer generation/history selection.

Find exactly one target ID in Lead. Reject unknown or non-Lead target. `expectedPitch` must equal that note's current pitch. The replacement is an absolute pitch, not a delta. A replacement equal to the current pitch rejects as `NO_OP_EDITOR_COMMAND`; it creates no revision/history entry and does not clear redo. On success copy the complete parent, replace only that one pitch, bind exact parent/source/command, and calculate the new revision hash. No PRNG output, seed derivation, component generation, retry, fallback, or partial result exists.

Independent child verification must have the verified source and ancestry: recompute the root projection, verify each parent/command transition, and compare the full expected child state and hash. A shape-valid revision with a self-consistent digest is not sufficient evidence of source or lineage validity. Each parent link uses the same source and strictly reduces ancestry toward a root; reject missing ancestors, repeated identities/cycles, or mismatched source. Implementations may reuse already verified immutable ancestors within one trusted history; an arbitrary caller's claimed verification is not authority.

## Rejection semantics

Editor-owned failures use `EditorValueError` with stable `code` and exact `field`; safe UI prose is separate. Validation order is:

1. Existing source verification, whose failures propagate unchanged.
2. Revision/ancestry verification: unsupported revision schema first, then exact structure, source binding, event validity/identity, parent/command transition and hash.
3. Expected-current-parent envelope and identity match.
4. Command exact structure, supported schema, supported type, canonical target-ID syntax, numeric fields.
5. Lead target existence, expected old pitch match, global Lead range, then no-op rejection.

Codes/fields are: `UNSUPPORTED_EDITOR_REVISION_SCHEMA` / `revision.schema`; `INVALID_EDITOR_REVISION` / `revision` or the first invalid canonical path; `INVALID_EDITOR_SOURCE_BINDING` / `revision.source`; `INVALID_EDITOR_LINEAGE` / `revision.parent`; `EDITOR_REVISION_HASH_MISMATCH` / `revision.revisionHash`; `INVALID_EDITOR_PARENT` / `expectedParent`; `STALE_EDITOR_PARENT` / `expectedParent.revisionHash`; `INVALID_EDITOR_COMMAND` / `command` or its first malformed field path; `UNSUPPORTED_EDITOR_COMMAND_SCHEMA` / `command.schema`; `UNSUPPORTED_EDITOR_COMMAND_TYPE` / `command.type`; `EDITOR_NOTE_NOT_FOUND` / `command.noteId`; `EDITOR_NOTE_NOT_EDITABLE` / `command.noteId`; `STALE_EDITOR_NOTE_VALUE` / `command.expectedPitch`; `EDITOR_LEAD_PITCH_OUT_OF_RANGE` / `command.pitch`; `NO_OP_EDITOR_COMMAND` / `command.pitch`.

Canonical paths use dot fields and zero-based `[index]` arrays. Within exact-shape/value verification use the canonical traversal order specified above. A syntactically valid command with an existing target in another role uses NOT_EDITABLE, not NOT_FOUND. Structural numeric failures precede contextual range checks. For revision roots/children, parent/command nullability must agree before traversing a child envelope.

Reject unknown/missing fields, symbols, functions, accessors, custom prototypes, `toJSON` hooks, malformed arrays/identities and unsupported versions without executing caller code or silently omitting properties. Snapshot descriptors/own data before asynchronous verification/digest work. Canonical records require the declared own-property order; do not JSON-round-trip untrusted input. Rejections yield no revision, hash, partial tracks, history movement or source mutation. Boundary failures of the existing digest adapter reject without converting evidence unavailability into success.

## Canonical bytes and digest domains

Use the accepted compact fixed-order JSON conventions: UTF-8, no BOM, whitespace or terminal newline, ordinary JSON string escaping, decimal canonical integers, exact explicit nulls, no optional omission or implicit defaults. Do not use generic key sorting; construct only the declared validated projection. All arrays use the orders above.

Revision hash input is exactly a fixed-order wrapper with fields `schema, revision`; wrapper schema is `nightdrive.editor-revision-hash-input.v1`. Nested `revision` contains exactly the final revision's first six fields, through `command`, excluding `revisionHash`. Hash is lowercase SHA-256 of that wrapper's UTF-8 bytes. Final serialization appends `revisionHash` last to the six-field revision, without the hash-input wrapper. The two schema literals domain-separate editor revision content from note IDs and all existing generation hashes. No separate track/content digest is added in this slice.

Source, exact parent identity, command and resulting state therefore all affect child identity. Same musical notes reached through different parents/commands may have different revision hashes; that truthfully preserves lineage. Identical validated source/import policy yields identical root bytes/hash; identical parent and command yields identical child bytes/hash. Repeated execution is not a distinct canonical revision. An independently recomputed hash binds content but does not establish authorization or replace full verification.

## Undo/redo and application projection

History starts with the verified imported root. Store/select existing immutable verified revisions in one active in-memory sequence plus cursor. Undo selects the preceding entry; redo selects the following entry. They return/select those exact canonical revision values and identities, without new commands, digests, revisions or recomputation. Undo at root and redo at tip are unavailable and do not change selection. No inverse edit, new seed, silent regeneration or current-state mutation is permitted.

A valid new edit after undo is parented to the selected entry. Clear the active redo suffix only after successful verification of the new child, then append/select it. Do not overwrite, mutate or relabel any former revision; immutable values remain valid, even when no longer on the active redo path. No requirement for durable retention across reload is introduced. Rejected/no-op/stale commands leave selection and redo path intact. New generation starts a separate history rooted in its separately verified new source; old history is not falsely reparented to that source.

Derive the existing `CompleteSectionPreview` geometry/transport data from the selected verified revision's section/tracks, copying `pitch/startTick/durationTicks` exactly. `sourceResultHash` continues to mean the original generation source hash; never put `revisionHash` in that field. The application carries selected `{schema, revisionHash}` separately as editor selection identity so two edited states sharing one source remain distinguishable. Selection/note IDs/velocity may be exposed as separate derived editor view data when a later UI task is eligible, not by silently altering CompleteSectionPreview V1.

Velocity 100 and stored velocity are not mapped to oscillator gains in this first slice. Existing placeholder voice/envelope/role-bus/master gain behavior remains accepted and unchanged. Revision/generation selection changes invalidate and stop existing playback through the accepted session boundary; editing must not silently swap scheduled notes or automatically play. Explicit Play auditions the currently selected validated projection.

## Implementation evidence and separate gates

Before implementation acceptance, require independent literal root/child canonical JSON and UTF-8 bytes, note-ID inputs/digests, revision hash inputs/digests with test-side standard SHA-256; semantic fixtures must originate in accepted independent complete-section/reference evidence, not the production editor serializer. Verify exact four-role import, velocity 100, original source preservation, stable IDs on edit, Lead-only one-pitch delta, bounds 60/84 and rejection 59/85, intentional chromatic/manual-policy edits, unrelated canonical-value equality, complete deep immutability and deterministic replay.

Cover descriptor-safe malicious data without hook execution, source/hash forgery, wrong source/schema, missing/cyclic/mismatched ancestry, stale parent and old pitch, unknown/non-Lead IDs, malformed payloads, no-op, exact error precedence, and no partial result/history changes. Cover exact root-child undo/redo identity restoration, edit-after-undo redo invalidation, rejected-edit redo preservation, generation replacement, unchanged gain behavior, selected-revision-derived preview, and playback invalidation at its later application boundary.

Use focused tests then applicable full pinned CI/build under current policy. Neither editor development evidence nor this specification closes AC-015 as a whole, AC-014 timing, formal Stage 8 qualification, supported-platform claims, musical acceptance or release gates. Freeze this SPECIFY candidate for consequential external exact-head review and explicit Product Owner exact-tuple acceptance; do not implement or publish unreviewed authority.
