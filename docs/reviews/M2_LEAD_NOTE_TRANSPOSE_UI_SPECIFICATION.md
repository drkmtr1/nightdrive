# M2 selected Lead-note transpose interaction

## Authority and lifecycle

**CANDIDATE — SPECIFY only.** Consequential external independent exact-head PASS and Product Owner acceptance of this exact tuple are required before a separate local implementation under ADR-031. This document implements nothing, grants no protected integration, and leaves AC-015 partial.

Stage 10 / AC-015 requires transpose. The Product Owner selects one existing selected Lead note and reuse of the existing v1 absolute pitch command: the browser supplies an explicit semitone delta and records only the resulting absolute pitch canonically. The [editor revision contract](M2_EDITOR_REVISION_CONTRACT_SPECIFICATION.md), retained-source/full-ancestry boundary, and existing selected-note editing conventions remain authoritative. ADR-039 owns this bounded interaction.

## Producer control and proposal

Use the existing selected Lead-note editor. Provide a visibly associated **Transpose (semitones)** field and an explicit keyboard-operable **Apply Transpose** form action. Use a text input for signed integer text; ordinary native form semantics must work without a pointer. A new selection or selected revision clears the delta draft to empty and clears transpose-specific feedback. Empty means no proposal, never an implicit zero or default. No automatic submission on keystroke or blur and no optimistic canonical mutation.

Accept exactly ASCII base-10 integer text matching `^-?[0-9]+$`; negative values lower pitch and positive unsigned values raise it. Reject blank, whitespace, a leading plus, fractions, exponent notation, malformed or unsafe integers. Preserve the exact application-visible draft on rejection. No trimming, rounding, clamp, snapping, scaling, scale/chord repair, or inferred delta. Zero, including a spelling that parses as negative zero, is a no-op: no dispatch or revision. The UI may disable Apply for empty/invalid/zero proposals, but the submit path must enforce these rules independently.

Without an eligible selected Lead note, follow the existing selected-note unavailable behavior. Never infer a target from an index, transport, neighboring note or pointer. Existing imported and added Lead notes are eligible through their stable IDs.

## Mapping and boundary

On explicit submission, capture the current complete application, selected revision identity and selected Lead note's stable ID and pitch. Validate in this local order: eligible context and existing in-flight guard; exact integer syntax; safe-integer delta; zero no-op; safe-integer sum; resulting pitch in inclusive `60..84`. Compute `replacementPitch = selectedPitch + delta` once from the captured canonical note. Out-of-range proposals reject entirely, including values that could be clamped to fit. No generator/Motif scale, structural-target, register-band or leap rules are imposed on manual edits.

For a valid changed proposal, send exactly one existing ordered command:

```json
{"schema":"nightdrive.editor-note-command.v1","type":"set-note-pitch","noteId":"note-<stable-id>","expectedPitch":60,"pitch":62}
```

Here the values illustrate delta `2`. The command contains the selected stable ID, captured canonical old pitch, and computed absolute replacement. The semitone delta is browser proposal data only: it is not stored in revision provenance, hashes or an additional command. Use the existing `setLeadPitchAction` delegating once to pinned-Node `editEditorApplicationPitchV1`, with the captured expected selected parent. Do not introduce a new canonical command, schema, serializer, hash domain, API, generator or authority boundary. Existing v1 canonical validation/error precedence remains unchanged; local validation is an affordance, never proof of canonical validity.

## Success, rejection, history and audition

Preserve existing duplicate-submit and stale-result ownership guards across generation, selection, revision and pending operations. Do not automatically retry. On success install only the returned complete `EditorApplicationV1`, retaining its selected revision identity, original `sourceResultHash`, stable note ID and exact immutable history. Clear the completed delta draft so a second activation cannot accidentally repeat it without new explicit input. One successful action creates one v1 child revision and one Undo step. Exact Undo/Redo restoration and edit-after-Undo redo truncation follow existing history semantics.

Change only the target pitch. Start, duration, velocity, array order, source/section and every other note/role remain unchanged. Derive preview only through the existing application boundary. Apply existing successful-edit audition invalidation; never automatically Play/resume. Preserve all prior v1-v7 commands and controls, including velocity-agnostic audition.

On local rejection make no Server Action call. On boundary rejection install no partial result and preserve the draft, complete application, history/redo path, preview and audition except existing safe error handling. Identify transpose/pitch bounds safely where possible; otherwise retain the generic editor diagnostic. Do not expose raw exceptions, internal details or stack traces.

## Required implementation evidence

- Positive delta text `2` and negative delta text `-2`: independently calculated old pitch 60 -> 62 and 64 -> 62, each one exact v1 payload and captured expected parent through existing delegation.
- Inclusive resulting bounds 60 and 84; reject 59 and 85, unsafe delta/sum, blanks, whitespace, plus-prefixed text, fractions and exponents without dispatch/state changes. Zero produces no operation.
- One selected existing note only, including an added stable-ID note; no mutation to timing/velocity/order/source or other notes/roles.
- Pending duplicate suppression, selection/revision/generation invalidation, stale success/failure protection and no retry.
- Safe local/boundary rejection with exact draft and application/history/preview preservation; success installs only returned application, clears draft and invalidates audition without autoplay.
- Exact one-step Undo/Redo identities; edit after Undo truncates redo; rejected/no-op proposals preserve redo.
- Visible associated label, keyboard submission, unavailable-target behavior and no new piano-roll gesture.

Use pinned Node 24.21.0 / npm 11.19.0 for the separate implementation's focused consumer/action/page and editor/application regressions, strict TypeScript, changed-file Biome, repository lint, docs, production build and diff checks under current policy. New canonical hash fixtures are unnecessary because this interaction creates no new encoding; retain existing v1 evidence. Local review does not replace cumulative external review/CI.

## Boundaries

No multi-note/whole-track transpose, other-role editing, scale-aware transpose, snap, velocity audibility, resize changes, add/delete changes, selection redesign, pointer shortcuts, persistence/auth/database/API/AI, dependencies, AC-014 timing, formal Stage 8 or AC-015 completion. Any change to scope or canonical retention of delta needs new consequential authority. Snap remains a separate unmet AC-015 obligation.
