# M2 Lead-note drag interaction

## Authority and lifecycle

**CANDIDATE.** This exact interaction specification may authorize only a separate bounded local implementation after consequential independent exact-head review returns PASS and the Product Owner explicitly accepts that exact reviewed tuple under ADR-031. It does not accept a descendant or cumulative integration candidate. Protected integration remains at the recorded milestone or sub-milestone boundary. This SPECIFY task authorizes no browser, runtime, or UI implementation.

This candidate specifies the browser interaction for one existing Lead note, using the canonical v5 set-note-position command defined by ADR-032 and the [M2 Lead note atomic drag command](M2_EDITOR_NOTE_DRAG_COMMAND_SPECIFICATION.md). It is a bounded Stage 10 / Milestone 2 slice. AC-015 remains partial.

The Product Owner selected: a separate editable Lead piano roll while retaining the existing all-role timeline as read-only; free movement to integer ticks without beat/bar snapping; direct targeting of existing Lead notes; one atomic v5 command at pointer release; a 4 CSS-pixel drag activation threshold; cancellation that discards the proposal; a single Apply path with paired pitch and start-tick fields for keyboard editing; and preservation of the pointer-to-note grab offset.

## View and ownership

Add a distinct Lead-only piano-roll view beside or after the current four-role read-only timeline. Keep that existing timeline, its role rows, note labels, tick-derived geometry, and read-only behavior unchanged. The editable view projects only the selected verified revision's Lead notes across the existing eight-bar section.

The horizontal plot spans the existing section tick domain from 0 through the exclusive boundary at 30,720 ticks. Its eight bar boundaries are display guides only. The plotted Lead note positions and lengths derive from startTick and durationTicks. The vertical pitch rows represent integer MIDI pitches 60 through 84, with higher MIDI values above lower values. Display MIDI numbers; this specification creates no note-spelling convention. The plot adds no note creation, resize handles, or controls for another role.

Composition and the editor application boundary remain authoritative for verified canonical revisions, retained-source and ancestry validation, command application, hashes, history, and derived CompleteSectionPreview. The piano roll, selected note, and an in-progress drag proposal are browser presentation/input state only. They do not create, authenticate, serialize, or mutate canonical state. The existing generated result and sourceResultHash remain unchanged.

## Selection and pointer drag

A primary pointer press on an existing Lead note targets it by its stable noteId, never by array index. It selects that note for the existing Lead-note controls. Selection alone is noncanonical and creates no command, revision, history step, preview change, or audition invalidation. Pressing outside a note does not select, add, or move a note.

The drag uses the pointer movement from its initial press, preserving the grab offset: the note moves by the same horizontal and vertical pointer delta rather than jumping its start edge or pitch row to the pointer. Use CSS-pixel client-coordinate deltas and the plot geometry captured at pointer-down. If the usable plot width is W CSS pixels and one semitone row is H CSS pixels:

- deltaTicks is the nearest integer to deltaX * 30,720 / W;
- deltaPitch is the nearest integer to -deltaY / H;
- an exact half-integer displacement rounds away from zero.

The proposed absolute startTick is the selected note's original startTick plus deltaTicks; the proposed absolute pitch is its original pitch plus deltaPitch. A rightward movement increases startTick; an upward movement increases MIDI pitch. Time movement is not snapped to a beat, bar, or any other grid. Integer MIDI pitch remains semitone-based. These calculations produce proposals only; the existing canonical v5 validator remains authoritative.

A drag becomes active when the pointer's Euclidean movement from the press point reaches at least 4 CSS pixels. Before that threshold, release is a selection click and sends no command. After activation, the targeted note may be shown at the proposed position as transient, noncanonical feedback. The selected canonical revision, derived preview, and audition remain governed by the current accepted boundary until a command succeeds.

On pointer release after an active drag, if the selected parent/source identity is unchanged and at least one proposed field differs from its original value, send exactly one set-note-position v5 command through the existing pinned-Node application boundary. Include the stable noteId, expectedPitch and expectedStartTick from the captured verified parent, and both absolute proposed values. If one field is unchanged, carry it unchanged in that command. Never issue the pitch-v1 and start-tick-v2 commands sequentially for one drag. If both fields are unchanged, send no command and create no revision.

A click or drag that selects a note leaves it selected by noteId, including after a successful v5 move. If the selected source or parent revision changes while a drag is pending, cancel the gesture; do not submit stale values. An overlapping note remains an independent canonical note. Pointer hit-testing follows stable note array/render order: where displayed hit areas overlap, the topmost rendered note is the pointer target; the existing complete Lead-note selector remains an alternate way to select every note by its current displayed ordinal and note values.

Pointer cancellation, loss of pointer capture, view teardown, or source/parent replacement before release cancels an active gesture. Discard the transient proposal and retain the current canonical revision, history, and preview. The selected target may remain selected if it still exists. Cancellation sends no command and creates no revision. There is no automatic retry or regeneration.

If v5 rejects the complete proposed pair for pitch range, section containment, ordering, stale-parent/value, or another existing contract rule, discard the transient proposal, retain the canonical parent and history, and use the existing safe diagnostic path. Do not clamp, round beyond the specified nearest-integer coordinate mapping, snap, move neighbors, repair, reorder, retry, or expose a partial revision. The existing v5 validation and rejection precedence remain unchanged.

## Keyboard-accessible atomic alternative

Keep the existing Lead-note selector and separate pitch-v1 and start-tick-v2 controls unchanged and independently usable. Add one grouped keyboard alternative for atomic position changes: an existing-note selector choice followed by a labeled MIDI pitch field, a labeled absolute start-tick field, and one Apply position action. Native selection, input, focus, and form submission must work by keyboard; no custom arrow-key movement, shortcut, or keyboard-drag model is introduced.

Apply reads the selected note and expected old pitch/startTick from the current verified parent. It carries both absolute replacements in exactly one v5 command, including an unchanged field when only the other field changes. When neither differs, do not dispatch a command or create a revision. The application boundary validates the entire pair atomically; an invalid or stale value leaves the selected revision and both canonical fields unchanged and reports through existing safe diagnostics. Use associated visible labels and the existing status/error presentation. Keep MIDI values and tick units explicit. This keyboard path changes no command, canonical history, preview, or audition semantics.

## Canonical history, preview, and audition

A successful drag or paired Apply creates at most the one child revision specified by ADR-032. It preserves the target stable ID, duration, velocity, array position/order, all other notes, every other role, source identity, and section. It uses the existing retained-source and full-ancestry verification, v1 revision/hash ownership, deterministic replay, and immutable history.

Undo and redo continue to navigate exact existing revisions. A canceled, invalid, stale, or no-op gesture creates no command or revision and does not alter the redo path. After a successful revision change, derive the existing noncanonical preview from the verified selected revision, retain the original sourceResultHash, and apply the already-accepted audition invalidation behavior. Do not change preview schema, audio scheduling, sound, transport, or automatic-resume behavior.

## Required implementation evidence and separate gates

A later bounded IMPLEMENT candidate must provide focused evidence that:

- the four-role timeline is unchanged and read-only while the separate eight-bar Lead view projects pitch, start, and duration from the selected verified preview;
- note targeting uses stable IDs, selection alone has no canonical effect, overlapping notes remain individually reachable through the existing selector, and pointer-to-note offset is preserved;
- horizontal and vertical coordinate calculations use CSS-pixel deltas, the documented plot dimensions, nearest integer mapping and half-away-from-zero ties, with no beat/bar snapping;
- movement below 4 CSS pixels is selection-only, movement at the threshold starts a drag, and only pointer release submits;
- each changed completed drag dispatches exactly one v5 command with both expected old values and both absolute replacements; one-axis changes carry the unchanged field; unchanged pairs dispatch nothing;
- pointer cancellation, capture loss, teardown, source/parent replacement, and rejected validation leave canonical state/history unchanged and remove transient proposal feedback;
- an accepted change selects one verified revision and uses the existing preview/sourceResultHash/audition invalidation path; no partial state or automatic playback restart occurs;
- the paired keyboard fields and one Apply action are labeled and operable with ordinary keyboard controls and submit one v5 command, while existing v1/v2 single-field paths remain unchanged;
- range, section-end, ordering, and stale values are delegated to existing v5 validation without repair or neighbor movement;
- no add, resize, velocity, transpose, snap, another-role edit, persistence, API, dependency, AI, Stage 8, or AC-014 behavior is added.

The independent review of the later implementation must inspect actual UI behavior and tests against this candidate and ADR-032. This SPECIFY candidate requires documentation validation, focused authority-consistency scans, and git diff --check. No runtime validation is claimed. AC-015 remains partial; no Stage 10 exit, AC-014 timing result, formal Stage 8 qualification, broader device support, musical acceptance, or release claim is created.
