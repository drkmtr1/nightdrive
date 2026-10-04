# M2 Lead note start-tick command

## Authority and scope

**CANDIDATE.** This exact specification becomes implementation authority only after consequential external exact-head review PASS, explicit Product Owner acceptance of the reviewed tuple, and protected integration. Before those conditions are satisfied, it is not implementation authority.

This is one bounded SPECIFY extension to the integrated [M2 canonical editor revision and Lead pitch command](M2_EDITOR_REVISION_CONTRACT_SPECIFICATION.md) and [ADR-027](../DECISIONS.md#adr-027--m2-canonical-editor-revisions-and-one-note-pitch-commands). The Product Owner selected moving one existing Lead note in time. The command changes only that note's absolute `startTick`. It is a producer-authored canonical editor revision, not a new Motif result or a regenerated source result.

The existing editor V1 root import, `set-note-pitch` command, revision/history behavior, First Playable V1, Motif V1, CompleteSectionResultV1, derived CompleteSectionPreview V1, generation, seeds, preview/audition, and source/result hashes remain unchanged. This candidate does not authorize implementation, browser controls, audio/transport changes, note add/delete, duration edits, velocity edits, snapping UI, Harmony/other-role editing, persistence, auth, database, API behavior, AI, dependencies, MIDI/export, or qualification work. AC-015 remains partial; AC-014 and S8-QUAL-002/003 retain their existing gates.

## Versioned command and identity

Keep the existing `nightdrive.editor-revision.v1` record and `nightdrive.editor-revision-hash-input.v1` domain. Keep `nightdrive.editor-note-command.v1` exactly as accepted for `set-note-pitch`. Add one separately versioned command schema, `nightdrive.editor-note-command.v2`, whose only supported type in this slice is `set-note-start-tick`.

The command is an exact ordinary own-data record with this field order and shape:

```json
{"schema":"nightdrive.editor-note-command.v2","type":"set-note-start-tick","noteId":"note-<64 lowercase hex>","expectedStartTick":480,"startTick":960}
```

The tick numbers are illustrative. `startTick` is an absolute integer tick, not a delta or wall-clock time. `expectedStartTick` is the target note's current tick in the verified selected parent. A command occurrence is identified by its exact versioned schema/payload together with the exact parent revision identity in its resulting child; there is no random operation ID, timestamp, command hash, or separate branch identity.

The child remains `nightdrive.editor-revision.v1` with the existing exact field order `schema, source, section, tracks, parent, command, revisionHash`. Its parent binds the exact selected `{schema, revisionHash}`. Its source and section equal the verified parent. Its command field contains the exact v2 command above. The existing revision-v1 hash-input wrapper and SHA-256 procedure remain unchanged and include the exact nested v2 command and resulting state while excluding the child's own `revisionHash`. No hash is recursive. Existing root and v1 pitch-command revision bytes/hashes must remain byte-for-byte unchanged. A validator that does not support command v2 rejects it as an unsupported command schema; it must not reinterpret it as v1 or fall back.

## Command preconditions and transition

The operation requires the retained, independently reverified full `CompleteSectionResultV1`, the immutable verified editor history/complete ancestry, an explicit expected parent, and the command. It must use the same authoritative verification boundary as the existing editor operation: recompute the root projection from the verified source, verify every recorded command transition and full revision state/hash, reject unverified caller-asserted history, then compare the expected parent with the currently selected revision identity. A self-consistent hash alone is not authority.

After the existing source, ancestry, and expected-parent checks:

1. Validate the command descriptor-safely as an exact v2 own-data record in the declared order. Reject accessors, symbols, functions, `toJSON`, custom prototypes, unknown/missing fields, coercion, and malformed values without executing caller behavior.
2. Require the recognized schema/type pair (`nightdrive.editor-note-command.v2`, `set-note-start-tick`), canonical `note-` plus 64 lowercase hexadecimal `noteId`, and safe-integer `expectedStartTick` and `startTick` values.
3. Find exactly one matching stable ID on the Lead track. An unknown ID rejects as not found; an ID in another role rejects as not editable.
4. Require `expectedStartTick` to equal that note's current selected-parent `startTick`; otherwise reject as stale.
5. Require the replacement tick to be an integer in `[0, 30720)`, and require `startTick + the unchanged durationTicks <= 30720`. Do not coerce, clamp, wrap, or repair.
6. Preserve the canonical Lead note array's original imported occurrence order. The replacement must remain nondecreasing relative to its immediate neighbors: if present, the preceding note's `startTick <= replacement startTick`, and the replacement `startTick <=` the following note's `startTick`. Equal start ticks are allowed. Do not sort or reidentify notes after edits.
7. If the replacement equals the existing tick, reject as `NO_OP_EDITOR_COMMAND`; create no revision, digest, history entry, or redo-path change.

On success, construct a detached full child revision by copying the parent and changing only the selected Lead note's `startTick`. Preserve its `id`, pitch, duration, velocity, every other Lead note, all other roles, source, section, and note-array order exactly. Bind the parent and exact v2 command, derive the existing revision-v1 hash, recursively freeze the returned ordinary data, and return no mutable aliases. There is no generation call, seed/PRNG use, snapping, or partial result.

The tick and neighbor rules follow the existing canonical boundary: `CompleteSectionResultV1` validates each event's integer tick/duration, nondecreasing event starts, and section-contained end (`src/composition/complete-section.ts`, `copyEvents`). It does not enforce a no-overlap/monophony rule. This command adds no stricter overlap rule: overlapping Lead spans remain permitted when all existing per-event, order, and section checks pass. Manual onset edits may diverge from the source Motif's selected rhythm template, relative phrase onsets, and generated phrase policy; they do not call or claim validity under the Motif generator. A move may cross bar/phrase boundaries within the section if all command invariants pass. No beat/grid quantization is inferred; every valid integer tick is exact.

## History, preview, and deterministic replay

Use the existing immutable in-memory revision sequence and cursor. A successful start-tick command appends one child and selects it. Undo/redo navigates existing revision identities/hashes exactly, creates no command/revision/digest, and does not mutate old revisions. After undo, a successful edit creates a child of the currently selected revision and clears only the active redo suffix. A stale, invalid, out-of-section, order-breaking, or no-op command leaves the selected revision and redo path unchanged.

Derive the same existing `CompleteSectionPreview` from the selected verified revision, copying each note's pitch/start/duration exactly. The preview remains noncanonical; `sourceResultHash` remains the original generation result hash. Carry the selected revision identity separately as already specified. Do not change the preview schema or transport. Selecting a different revision continues to use the existing playback invalidation behavior; no playback is scheduled or restarted by this command.

Given the same verified source, full parent history, selected parent identity, and exact command, the transition returns byte-equivalent child canonical JSON and the same revision hash. Different parent/command lineage remains distinguishable even when resulting musical values happen to match. No time, locale, browser state, random value, object-discovery order, or execution counter enters identity.

## Rejection semantics

Preserve the existing editor error boundary and its source/ancestry/expected-parent precedence. After those checks, validate command structure and supported schema/type, target identity/editability, stale expected start, proposed timing bounds, canonical neighbor order, then no-op. Existing codes remain unchanged. Use:

- `INVALID_EDITOR_COMMAND` at `command` or its first malformed field;
- `UNSUPPORTED_EDITOR_COMMAND_SCHEMA` at `command.schema`;
- `UNSUPPORTED_EDITOR_COMMAND_TYPE` at `command.type`;
- `EDITOR_NOTE_NOT_FOUND` at `command.noteId`;
- `EDITOR_NOTE_NOT_EDITABLE` at `command.noteId`;
- `STALE_EDITOR_NOTE_VALUE` at `command.expectedStartTick`;
- `EDITOR_NOTE_START_OUT_OF_RANGE` at `command.startTick` for a valid integer that is outside `[0,30720)` or makes the unchanged note exceed the section end;
- `EDITOR_NOTE_START_ORDER_INVALID` at `command.startTick` when the immediate-neighbor ordering rule fails;
- `NO_OP_EDITOR_COMMAND` at `command.startTick`.

Malformed non-integer or unsafe tick fields are `INVALID_EDITOR_COMMAND` at their exact field, before contextual bounds. No failure returns a revision/hash, partial tracks, warning, preview, or modified history. Safe producer-facing diagnostics remain distinct from the structured error and never expose raw exception details.

## Ownership and implementation boundary

`composition` continues to own revision values, source/root/ancestry verification, exact command embedding, schema-directed serialization, and revision hashes. `editor` owns the v2 command transition and existing immutable history selection. The existing pinned-Node application adapter is the later validation boundary. Browser UI may propose a command and render the accepted derived preview, but it never creates or authenticates canonical revision state. Use the existing UTF-8/SHA-256 adapter; no dependency or general command framework is justified.

No module implementation, UI, test, requirement, acceptance-criteria, roadmap, preview, or transport change is included in this SPECIFY task. The current pitch command is the only implemented editor command until this specification itself receives the lifecycle above and a separate eligible IMPLEMENT task is selected.

## Required implementation evidence

Before implementation review, add independent literal fixtures for a verified root and a v2 start-tick child: exact command JSON; exact canonical child JSON/UTF-8 bytes; exact revision hash input/hash independently recomputed with standard test-side SHA-256; and exact equality of the unchanged source, parent, all non-target note fields, note identity/order, and all other tracks. Do not obtain expected canonical/semantic output from the production editor serializer or transition.

Focused tests must prove successful movement by exact integer ticks; stable ID; unchanged pitch/duration/velocity and every unrelated canonical value; section start/end boundaries; ordered-neighbor lower/equal/upper boundaries; rejected ordering inversions; allowed overlap under the existing validator; exact error precedence; stale parent and stale old tick; unknown/non-Lead IDs; malformed/forged command records; no-op; complete source/ancestry verification against forged but self-consistent roots/children; no partial results or history change; deterministic replay; full immutability; undo/redo identity restoration; edit-after-undo redo truncation; unchanged v1 root/pitch byte/hash vectors; and preview projection from the selected revision with unchanged source hash. Runtime and UI implementation evidence belongs to later eligible implementation work, not this specification candidate.

Run the focused editor and related complete-section regressions, strict TypeScript, changed-file Biome/lint, repository lint, docs validation, production build, and `git diff --check` for a later implementation candidate under the then-current pinned Node/npm gate. This SPECIFY candidate itself runs documentation validation and diff checks only; it does not claim runtime validation or AC-015 completion.
