# Nightdrive Project State

## Current Phase

Stages 1–7 deterministic foundations and the First Playable Harmony+Bass+Arpeggiator boundary are accepted and complete. The Stage 8 Motif V1 contract, implementation foundations, independent reference chain, and reviewed 24-row coverage report are integrated. Formal Stage 8 qualification and musical acceptance are distinct from product development.

The Product Owner-directed product-first roadmap authority is binding. Milestone 1's functional Audible complete section objective is integrated and verified through formative normal-desktop-Chrome audition. Milestone 2 — Inspect and edit — is selected for the next bounded product-development work. Stage 9/AC-014 exit is not claimed; quantitative AC-014 timing evidence remains OPEN. The authority preserves the accepted deterministic engine, First Playable V1, Motif V1, and formal release-evidence criteria.

## Current Milestone

Milestone 2's read-only eight-bar timeline is integrated: all four roles, MIDI pitch, accessible note labels, and exact tick-derived position/duration are inspectable without changing canonical state. The canonical Lead pitch-command/history runtime is integrated through PR #286 and its Node application boundary through PR #288. The bounded browser editor for one existing Lead note's absolute pitch correction and immutable undo/redo is integrated through PR #289. The Lead absolute start-tick command implementation, including canonical revision/history validation, the pinned-Node application boundary, derived preview, and browser control with undo/redo, is integrated through PR #292. The bounded absolute Lead duration command specified by ADR-029 is implemented through PR #295, including the v3 command, verified revision transition, derived preview, and producer duration control. The timeline preview remains derived and noncanonical. These are partial Milestone 2 capabilities and do not claim AC-015 completion.

Milestone 1's complete-section coordinator, verified Node adapter, derived four-role preview, browser Generate consumer, and audition transport are integrated. The Product Owner reports formative normal-desktop-Chrome observations: all four roles play together; Solo Lead plays Lead alone; Stop returns transport to stopped; Loop continues playback and Loop Off stops at the following section boundary; switching tabs stops playback without automatic resume; explicit Play works after returning; and Chrome reports no audition errors. These observations satisfy Milestone 1's functional producer objective. They do not establish quantitative AC-014 timing: the proposed <=20 ms foreground synchronization and ten-cycle no-drift evidence remain OPEN because no verified measurement path maps captured Chrome/system output to the scheduled AudioContext clock.

## Current Gate

The Engineering Health Baseline retains its historical REVISE assessment; the integrated Product Owner risk treatment makes that historical label non-blocking to ordinary in-scope application work. `ND-QA-003` remains OPEN / ACCEPTABLE / DEFERRED without a security-control result or closure. `ND-QA-004` and `ND-QA-005` remain OPEN / SHOULD FIX SOON. They do not independently block this unrelated product task.

S8-QUAL-001 is RESOLVED under the reviewed independent reference-chain and 24-row coverage evidence recorded in the accepted finding definitions. S8-QUAL-002 and S8-QUAL-003 remain OPEN with unchanged definitions and closure criteria. They remain required for formal Stage 8 deterministic qualification, supported-platform Motif claims, external beta, and release, but do not block authorized internal pinned-Node development or formative audition. S8-QUAL-003 remains downstream of S8-QUAL-002. AC-014's quantitative real-browser timing evidence remains OPEN; the observed functional audition does not claim the documented timing tolerance or ten-cycle drift result.

Do not treat product-development validation or formative listening as candidate capture, evidence freeze, production/reference comparison, supported-platform qualification, formal musical disposition, or Stage 8 closure. Preserve all versions, seeds, Harmony inputs, and canonical outputs; make no unsupported-platform or formal-qualification claim.

## Repository State

Git refs establish current repository state. This snapshot is coordination only and does not predict the commit that may contain its own update. The product-first authority is integrated. No candidate-review or publication bookkeeping is the current product gate.

## Preserved Decisions and Deferred Work

- First Playable V1 and Motif V1 contracts and outputs remain unchanged; all other existing deterministic contracts and release requirements remain in force.
- Product milestones are: (1) Audible complete section, (2) Inspect and edit, (3) Locks and useful variations, (4) Save and return, (5) Practical FL Studio handoff, (6) Bounded AI intent, and (7) Producer Coach and synth guidance.
- The accepted functional Milestone 1 visual direction is not a final brand/design system. The comprehensive visual-reference gate returns before substantial visual-brand refinement or broader UI styling.
- No persistence, authentication, database, AI, Coach, synth recipes, full FL Studio package, or broad browser/device matrix is part of Milestone 1.
- MIA-003 remains ACCEPTABLE / DEFERRED. The S8 historical original finding terms remain NOT VERIFIED / unrecoverable; the forward-looking replacement definitions remain authoritative.
- Deferred ND-QA-003 remediation, ND-QA-004/005, and S8-QUAL-002/003 qualification work remain deferred unless a concrete affected-boundary issue or their named release gate makes them applicable.

## Next Eligible Task

Milestone 2 — Inspect and edit — remains selected. Its read-only timeline, canonical Node editor-application boundary, bounded browser `set-note-pitch` command, absolute Lead `set-note-start-tick` command, and absolute Lead `set-note-duration` command with immutable undo/redo are integrated through PRs #289, #292, and #295. ADR-027, ADR-028, and ADR-029 and their integrated specifications remain binding. The next bounded task is the SPECIFY candidate for deleting one existing Lead note under ADR-030 and [the M2 Lead note deletion command specification](docs/reviews/M2_EDITOR_NOTE_DELETE_COMMAND_SPECIFICATION.md). It awaits consequential independent exact-head review and Product Owner acceptance of the exact reviewed tuple. No deletion implementation or UI is authorized until those gates and protected integration are complete, followed by separate task selection. AC-015 remains partial; the other add/delete/drag/resize/velocity/transpose/snap obligations remain unsatisfied. Do not add persistence, authentication, database, public API behavior, AI, dependencies, formal Stage 8 qualification, or AC-014 timing infrastructure. AC-014 quantitative timing and S8-QUAL-002/003 remain OPEN with unchanged gates.

## Maintenance

This is a volatile coordination snapshot, not a requirements, architecture, contract, test, decision, roadmap, or history document. Replace stale state when coordination changes; keep permanent truth in authoritative documents and use Git for detailed history.
