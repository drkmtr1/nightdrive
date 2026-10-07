# M2 Lead-note velocity UI interaction

## Authority and lifecycle

**CANDIDATE.** This SPECIFY candidate defines only the producer interaction for the accepted canonical Lead-note velocity v7 command. A separate UI implementation is eligible only after consequential independent exact-head review returns PASS and the Product Owner accepts that exact reviewed tuple. This candidate itself authorizes no runtime or UI implementation, publication, protected integration, AC-015 completion, or audible-velocity behavior. Keep the implementation local under ADR-031 unless a separately established integration boundary requires otherwise.

The canonical operation is defined by [ADR-036](../DECISIONS.md#adr-036--m2-canonical-lead-note-velocity-command) and [the M2 Lead-note velocity command specification](M2_EDITOR_NOTE_VELOCITY_COMMAND_SPECIFICATION.md). Its runtime implementation and existing pinned-Node application operation are independently reviewed as a local ADR-031 checkpoint at base `ead1f6df43f0a8a260fa56ba868eff3ec4976e80`, head `93623233b59b1751d3c03c3c69163b7205f0f8c2`, tree `24d1dd0b4dc0386ed0dcb9c424dc78b97f6fa42e`; that checkpoint is not protected-integrated. Stage 10 / [AC-015](../ACCEPTANCE_CRITERIA.md#acceptance-criteria) includes velocity editing and exact undo/redo, and AC-015 remains partial.

The Product Owner selected a labeled integer Velocity field with an explicit Apply Velocity action and an inline limitation notice. This interaction edits one existing selected Lead note through the accepted v7 command. It does not change canonical command semantics or introduce another authority boundary.

## Selected-note control

Add one control to the existing selected Lead-note editor surface:

- A visibly associated **Velocity** label and native numeric integer input with required value, minimum `1`, maximum `127`, and step `1`.
- One keyboard-operable **Apply Velocity** form action using ordinary native form submission.
- The field is initialized from the selected note's current canonical velocity. Whenever selection changes through the existing note selector or piano-roll selection, replace the field value with the newly selected note's current canonical velocity, as the existing pitch, start-tick, and duration fields do. After a successful returned application or Undo/Redo revision change, reflect the current canonical velocity of the still-selected note.
- If there is no eligible selected Lead note, follow the existing selected-note controls' unavailable/disabled behavior; do not invent a target or replacement value.
- Show this concise informational notice next to the control: **“Velocity is saved in the editor revision, but it does not change preview loudness yet.”** Equivalent wording may be used only if it clearly preserves both facts. It is informational, not an error or warning state.

The displayed value is a producer-editable local draft initialized from canonical state. Typing changes only this draft. It does not change the application, revision, preview, history, or audition. Do not submit on keystroke or blur. Do not use a slider, drag gesture, relative delta, hidden/default replacement, optimistic canonical mutation, or any form of continuous control.

## Apply behavior and canonical boundary

On explicit form submission, validate the draft as an integer in `1..127` without clamping, rounding, scaling, or coercive fallback. Use the same whole-number input and safe-error conventions as the existing selected-note editor: require a nonempty ASCII base-10 digit string, parse it as a number, and require a safe integer. Reject blanks, signs, whitespace, fractions, exponent notation, unsafe values, or unparseable input without a coercive default. Native `min`, `max`, and `step` constraints provide form affordances; the submit path must also fail closed for empty, malformed, fractional, unsafe, or out-of-range values. Preserve the exact draft string that has reached application-controlled state on rejection. For the required native `type=number` control, browser-native sanitization of syntactically invalid text before the original text reaches React/application-controlled state (for example, `+5` becoming an empty value) is permitted; preserving pre-sanitized text is not required. A sanitized invalid draft must still fail closed: a locally invalid draft makes no Server Action call, and no rejected submission may change the canonical revision, history, or `EditorApplicationV1`. Do not add raw-keystroke capture or replace the native numeric input to recover browser-discarded text.

If the parsed replacement equals the selected note's current canonical velocity, do not dispatch a command or create a revision. The UI may disable Apply Velocity for an invalid draft or a same-value draft; when enabled, the explicit action remains the only way to submit an edit. Selection changes refresh the field from the newly selected canonical note and clear velocity-specific stale feedback without issuing an operation.

For a valid changed value, capture the active application's selected revision identity and the selected Lead note's stable ID and current canonical velocity. Construct and submit exactly one command with this ordered payload:

~~~json
{"schema":"nightdrive.editor-note-command.v7","type":"set-note-velocity","noteId":"note-<stable-id>","expectedVelocity":100,"velocity":88}
~~~

The values are illustrative. `noteId` and `expectedVelocity` come from the selected note in the selected verified parent; `velocity` is the explicit absolute producer replacement. Do not send a role selector, ID/index, timestamp, random value, delta, or redundant note snapshot. Supply the captured selected revision identity as the expected parent through the existing Server Action pattern. The Server Action must carry the v7 command unchanged and delegate once to the existing pinned-Node `editEditorApplicationVelocityV1` operation, which remains responsible for source/history verification and canonical application. Add only the thin typed Server Action adapter needed to reach that existing operation; do not add an API route, import Node-only code into the client, or create another validator, history, or preview path.

While the operation is pending, prevent duplicate submissions using the existing editor in-flight behavior. Do not retry automatically. Install no optimistic revision or note data. On success, install only the complete `EditorApplicationV1` returned by the Node boundary, use its returned selected revision identity, and synchronize the field from that returned revision if the same note remains selected. One successful Apply Velocity creates exactly one canonical child revision and one Undo step under the accepted v7 and immutable-history semantics.

## Rejection, history, preview, and audition

A local validation failure makes no Server Action call. A canonical-boundary rejection installs no result and creates no partial revision or history change. Preserve the entire prior application, selected revision, undo/redo path, preview, `sourceResultHash`, and audition/transport state, except for safe error feedback already permitted by the existing editor error handling. Preserve the exact application-visible Velocity draft after rejection; the browser may sanitize invalid numeric text before application state receives it, and pre-sanitized text need not be restored. No raw-keystroke capture is added. Identify Velocity in local validation feedback; map a recognized velocity-specific boundary rejection to safe field-relevant feedback when available. Otherwise use the existing safe editor-operation diagnostic. Never display raw exceptions, stack traces, internal error objects, paths, or private diagnostics.

The canonical v7 transition changes only the selected note's canonical velocity, preserves its stable identity and all other state, and advances the selected revision identity. The existing derived `CompleteSectionPreview` omits velocity, so its values and original `sourceResultHash` remain unchanged for this velocity-only edit. Do not add velocity or editor revision identity to the preview. A successful selected-revision change uses existing edit-triggered audition invalidation; it does not automatically Play or resume. An explicit later Play continues to use the unchanged velocity-agnostic preview and gain mapping.

Undo and Redo continue to navigate exact existing immutable revisions and hashes. When they change the selected revision, the Velocity field reflects the selected note's canonical value in that revision. They create no velocity-specific command or history mechanism. Rejected, stale, or no-op submission preserves the active redo path.

## Required implementation evidence

A separate bounded UI implementation candidate must demonstrate:

- The selected Lead-note surface exposes one visibly labeled, keyboard-operable numeric Velocity input with the `1..127` integer domain, one Apply Velocity action, and the informational notice. No velocity control appears for another role or in another editing surface.
- The field initializes from the selected note and follows selection changes through both existing selection paths and returned/Undo/Redo applications.
- Typing and blur do not dispatch a command or mutate the application. Applying a same-value proposal dispatches nothing and changes no revision/history state.
- Empty, malformed, fractional, unsafe, and out-of-range drafts are rejected without a command; preserve the exact draft that reached application-controlled state and provide safe, Velocity-specific feedback. A browser-sanitized invalid value remains fail-closed; restoring text discarded before application state or adding raw-keystroke capture is not required.
- When native `type=number` sanitizes invalid text before application state receives it (for example, `+5` becoming empty), focused evidence verifies the sanitized application-visible value is rejected without a Server Action call, revision/history change, or `EditorApplicationV1` mutation; the test does not require recovery of the pre-sanitized text.
- A valid changed submission captures the selected parent and constructs the exact ordered v7 command from the stable selected note ID, expected canonical velocity, and explicit absolute replacement. The Server Action delegates exactly once to `editEditorApplicationVelocityV1` without transforming the command.
- Duplicate pending submission is guarded; no automatic retry occurs.
- Canonical rejection preserves the complete application, revision cursor/path, preview, original sourceResultHash, and audition state, keeps the draft, and exposes no raw internal exception. Where a known structured v7 rejection is available, its public-safe message identifies Velocity.
- Success installs only the returned application, selects its returned revision identity, creates one Undo step, updates the selected field, preserves the original sourceResultHash and velocity-agnostic preview, and uses existing audition invalidation without autoplay/resume.
- Undo/Redo restore the exact canonical velocity of the selected revision. Existing v1-v6 controls and behaviors remain unchanged.
- The notice clearly says velocity is retained in canonical editor revision state while current preview loudness is unchanged. It is not presented as an error, warning, or discarded value.

## Scope and validation gate

This specification covers only producer UI for applying one absolute velocity edit to one existing Lead note through the accepted v7 command and existing pinned-Node application boundary. It does not authorize audible velocity, gain mapping, `CompleteSectionPreview` velocity fields, BrowserAudition or role-normalization changes, master-volume or headroom policy, velocity lanes/handles, multi-note or other-role editing, resize, transpose, snap, persistence, AC-014 timing work, Stage 8 qualification, or AC-015 completion. It does not alter the canonical v7 command or v1-v6 compatibility. AC-015 remains partial.

This documentation-only SPECIFY candidate requires `npm run docs:check`, focused consistency scans across ADR-036, the canonical v7 command specification, this UI specification, Stage 10, and AC-015, plus `git diff --check`. Runtime, UI, browser-audition, and production-build results are not claimed. A separate UI implementation requires this exact candidate's consequential independent exact-head review PASS and explicit Product Owner acceptance before implementation.
