# M2 Lead note-add UI interaction

## Authority and lifecycle

**CANDIDATE.** This SPECIFY candidate may authorize only a separate bounded local UI implementation after consequential independent exact-head review returns PASS and the Product Owner explicitly accepts that exact reviewed tuple under ADR-031. It does not accept a descendant or cumulative integration candidate. Protected integration remains at the recorded milestone/sub-milestone boundary. This task changes documentation and coordination state only; it authorizes no runtime or UI implementation.

This is the browser interaction for the accepted canonical v6 Lead add-note command. It complements ADR-034 and [M2 Lead note-add command](M2_EDITOR_NOTE_ADD_COMMAND_SPECIFICATION.md), which define the command and canonical transition but deliberately leave value collection and UI interaction open. Stage 10 / AC-015 includes note addition and keyboard-accessible editing. AC-015 remains partial.

The Product Owner selected a visibly labeled three-field form—Pitch, Start Tick, Duration Ticks—with one Add Note action. It submits explicit absolute values together in one v6 command. The existing Lead piano roll remains available for inspection and editing of existing notes; this form is the only note-creation interaction in this bounded slice.

## Form and ownership

Provide a distinct “Add Lead note” form alongside the existing Lead editing surface. It is available for the current verified editor application and does not require an existing note to be selected. The form has exactly these producer inputs:

- **Pitch** — absolute MIDI pitch;
- **Start Tick** — absolute canonical start tick;
- **Duration Ticks** — absolute canonical duration.

Each control has a visible associated label, is keyboard operable, and begins empty. Do not prepopulate values from the current selection, neighboring notes, the generated result, Motif/profile state, piano-roll pointer coordinates, grid, playhead, transport, or any preference. These values remain browser proposals until the existing application Server Action passes them to the pinned-Node application boundary for validation and application. Server-action arguments remain untrusted; the Node boundary re-verifies source and ancestry. The browser does not create or authenticate a revision, derive an ID, or calculate a canonical hash.

The form uses the repository's existing labeled whole-number input and safe-error conventions. Require an explicit nonempty string of ASCII base-10 digits (0–9) for every field, parse it as a number, and require a safe integer; reject blanks, signs, whitespace, fractions, exponent notation, unsafe values, or unparseable input without coercive defaults. Validate in command field order:

1. Pitch must be MIDI 60 through 84 inclusive.
2. Start Tick must be in [0, 30720).
3. Duration Ticks must be a positive safe integer and the note must end at or before tick 30720; equivalently, duration must be no greater than 30720 minus startTick.

Map a rejection to the relevant field when possible. Section-end rejection is associated with Duration Ticks. Do not add UI overlap or monophony rejection; the accepted v6 overlap behavior remains unchanged and the canonical boundary owns it. Keep the entered values visible on rejection. Display only the existing safe validation/error feedback; never render raw exception text, stack traces, paths, or internal diagnostics.

Do not require pointer interaction to create a note. Clicking or pressing on empty piano-roll space remains non-creating and sends no command. Do not infer any field from pointer coordinates. Do not add click-to-create, double-click, drag-to-create, duration handles, grid placement, snapping, quantization, cloning, automatic duration, selection-derived values, or a separate creation gesture.

## Atomic submission

The Add Note button is a form submit control with the accessible name “Add Note.” Keyboard form submission and button activation use the same handler and produce one operation. Disable or guard repeat submission while the operation is pending so one in-flight activation cannot issue duplicate commands. Do not retry automatically.

After local validation, capture the current application's selected verified revision identity and construct exactly this ordered v6 payload from the three explicit values:

~~~json
{"schema":"nightdrive.editor-note-command.v6","type":"add-note","pitch":64,"startTick":960,"durationTicks":480}
~~~

The values are illustrative. Submit the command exactly once through the existing application Server Action pattern, using a thin corresponding action adapter if needed. That action delegates once to editEditorApplicationAddNoteV1(currentApplication, expectedSelectedRevision, command) at the existing pinned-Node boundary. Do not import the Node-only adapter into client code, add an HTTP/API route, or transform the command. The boundary remains responsible for retained-source/full-ancestry verification, v6 validation, deterministic note identity and insertion, canonical revision/hash creation, history, and derived preview. Do not call separate pitch, start-tick, duration, or position commands for creation.

While pending, show existing pending feedback but do not optimistically add a note, preview event, revision, or history entry. A local field error or rejected boundary call leaves the current application, selected revision, preview, sourceResultHash, undo/redo history and audition unchanged. Preserve all three entered values after rejection. If an asynchronous completion is stale under the existing editor-operation guard, it must not replace newer application state.

## Accepted result

Install only the complete EditorApplicationV1 returned by the Node boundary. A successful Add Note action creates exactly one canonical child revision and one Undo step, with v6's existing redo-suffix behavior. Use the returned selected revision identity and derived CompleteSectionPreview; retain the original sourceResultHash. The newly added Lead note appears in the existing Lead piano roll and existing note-selection/editing mechanisms. Do not redesign selection or add an automatic selection rule.

Apply the existing audition invalidation behavior for the accepted revision change. Do not automatically start or resume playback. Undo and Redo retain their existing exact immutable revision semantics; Add Note does not define a separate history or preview path. Successful form values remain visible as ordinary producer-entered form state; any later addition still requires a separate explicit Add Note activation.

Keep the existing four-role timeline and Lead piano roll behavior unchanged except that a successful returned preview/revision contains the new note. Preserve existing v1-v5 commands, their controls and semantics, editor revision V1/hash ownership, stable IDs, source identity, overlap policy, and audition behavior.

## Required implementation evidence

A separate bounded implementation candidate must demonstrate:

- the form has exactly the three visibly labeled controls and one Add Note action, starts without hidden/default values, and works by keyboard without pointer use;
- each valid submit constructs the exact ordered v6 command from entered absolute values and invokes one Server Action with the selected verified parent; the action delegates once to the existing Node boundary without changing the command;
- empty, malformed, fractional, unsafe, out-of-range pitch/start, nonpositive duration, and section-end overflow inputs produce field-appropriate safe feedback, preserve entered values, and create no note, revision, history entry, preview change, or audition invalidation;
- clicking or pressing empty piano-roll space creates nothing and does not infer values;
- pending duplicate submits are ignored and no automatic retry occurs;
- boundary rejection, including stale/forged application data, retains the complete prior application/history/preview and exposes no raw exception;
- success installs only the returned application, preserves sourceResultHash, uses the returned selected revision, adds one Undo step, makes the new note available through existing selection/editing, and performs existing audition invalidation without autoplay or resume;
- Undo and Redo restore the exact revisions and preview values under existing v6 behavior;
- the existing piano-roll, drag, pitch, start-tick, duration and delete controls remain behaviorally unchanged; no add gesture is added to the piano roll.

## Scope and gates

This specification covers only the producer UI for one Lead note-add action. It does not authorize piano-roll placement, drag-to-create, resize, velocity editing, transpose, snap, multi-note creation, other-role editing, selection redesign, broad piano-roll redesign, persistence, API redesign, dependencies, AC-014, or Stage 8 work. It does not change ROADMAP.md or ACCEPTANCE_CRITERIA.md. AC-015 remains partial.

A future UI implementation requires this exact candidate's consequential independent exact-head review PASS and explicit Product Owner acceptance before implementation. This SPECIFY task requires documentation validation, focused authority-consistency scans, and git diff --check; it claims no runtime validation, UI implementation, AC-015 completion, AC-014 timing, formal Stage 8 qualification, supported-platform qualification, musical acceptance, or release readiness.
