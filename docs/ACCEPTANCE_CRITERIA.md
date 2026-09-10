# Version 1 acceptance criteria

Each criterion maps to requirements in [REQUIREMENTS.md](REQUIREMENTS.md). Evidence must identify build/commit, fixture or test, environment, and result.

| ID | Requirements | Acceptance criterion |
|---|---|---|
| AC-001 | FR-001, UX-001, UX-002 | Given a first-time user and valid defaults, when they complete the main flow, then they can create and reach export preflight for an 8-bar section without external instructions; invalid fields are specific and retained. |
| AC-002 | FR-002, MUS-001 | Given a supported brief, generation returns distinct chord, bass, arp, and lead canonical tracks whose events validate against typed domain schemas. |
| AC-003 | MUS-001, MUS-005 | Golden harmony cases contain valid chord membership, pitch ranges, spacing, inversion, and configured voice-leading bounds; an unsatisfiable configuration returns a structured error. |
| AC-004 | FR-006, NFR-001 | Given identical canonical inputs, generator/engine/profile versions, and seed, repeated runs produce byte-equivalent normalized canonical JSON across supported environments. |
| AC-005 | FR-005 | Given locked chords, arp, and lead, when bass is regenerated, those three components' canonical hashes remain unchanged. |
| AC-006 | FR-006, NFR-002 | A variation stores parent ID, seed, versions, parameters, author/time, and result hash; creating it does not overwrite the parent. |
| AC-007 | MIDI-001, MIDI-003 | MIDI fixtures declare 960 PPQ, valid tempo/time-signature metadata, positive durations, matching note termination, and stable same-tick ordering. |
| AC-008 | MIDI-002 | Round-trip comparison preserves each exported event's pitch, start tick, duration tick, velocity, tempo, PPQ, channel policy, and track name. |
| AC-009 | FR-008, FR-013, MIDI-004 | The export package contains expected component MIDI, canonical JSON, notes, and README; supported FL Studio imports align to 8 bars with correct tempo and track identity. |
| AC-010 | MUS-002 | Bass golden cases receive progression context; strong-beat notes meet the selected root/chord-tone policy and permitted exceptions are explicit in parameters/provenance. |
| AC-011 | MUS-003 | Each arp event is derived from active harmony and satisfies configured rate, range, direction, gate, density, and seed behavior. |
| AC-012 | MUS-004 | Motif fixtures expose motif identity and transformations; configured chord targets, range, leap, repetition, phrase, and resolution constraints are testable. |
| AC-013 | MUS-006 | All generated events start at or after tick 0, have positive duration, and end at or before the section boundary. |
| AC-014 | FR-003, UX-003, A11Y-004 | Transport play/stop/loop and mute/solo stay synchronized within the documented preview tolerance; playback is user-initiated and failures degrade safely. |
| AC-015 | FR-004, UX-003 | Add/delete/drag/resize/velocity/transpose/snap each produce valid state, and undo/redo restores exact prior/next canonical editor revisions. |
| AC-016 | FR-007 | Save/reopen returns the same latest authorized composition state and history; offline/conflict paths preserve unsaved work. |
| AC-017 | AI-001, AI-002, AI-003, SEC-003 | Malformed, out-of-range, injected, or extra-field model outputs fail closed at schema/tool boundaries and cannot mutate canonical state; raw-note output is rejected. |
| AC-018 | FR-009, FR-011, AI-004 | Coach/explanation responses reference computed observations and label subjective advice; reviewers can trace each claim to current structured state. |
| AC-019 | FR-010, AI-002 | A supported intent phrase maps only to allowed, schema-valid parameter changes; the user can inspect scope before deterministic application. |
| AC-020 | FR-007, SEC-001, SEC-004 | Ownership tests prove users can CRUD their rows, cannot discover/access another user's rows, and deletion targets only confirmed owned resources with expected cascades. |
| AC-021 | FR-012 | Supported synth recipes validate against the profile vocabulary, identify assumptions, and never invent an unsupported control as a factual parameter. |
| AC-022 | SEC-001, SEC-002, SEC-003, SEC-004 | Automated RLS/API negative tests deny anonymous/cross-user/privileged-client access, secrets are absent from artifacts, and destructive/malformed requests fail safely. |
| AC-023 | SEC-005 | Cost-bearing endpoints enforce documented identity, request size, concurrency, rate, and timeout budgets with retry-safe errors. |
| AC-024 | AI-005, NFR-004 | Correlated logs contain request/generation IDs, versions, seed, latency, validation outcome and allowed cost metadata while redaction tests exclude secrets/tokens/unnecessary content. |
| AC-025 | UX-002 | Empty, loading, invalid, generation failure, save conflict, offline, and export failure states each provide a clear next action and retain recoverable work. |
| AC-026 | UX-004 | Defined desktop widths support full authoring; defined small-screen widths support inspection/audition/basic configuration without clipped critical actions. |
| AC-027 | A11Y-001, A11Y-002, A11Y-003, A11Y-004 | Automated WCAG checks plus manual keyboard, focus, zoom, contrast, semantics, screen-reader, target-size, motion, and audio checks pass the release checklist. |
| AC-028 | NFR-003 | Representative deterministic generation meets the release performance budget established and approved in Stage 17, with regression thresholds stored in CI. |
| AC-029 | NFR-005 | Required CI jobs and human evaluation gates in `TESTING_STRATEGY.md` pass on the release commit; no skipped release-blocking test is unexplained. |
| AC-030 | NFR-006 | A fixture from each supported prior canonical schema version migrates deterministically or produces an explicit supported-version error without data loss. |
| AC-031 | NFR-007 | Given a clean checkout and the selected Node/npm policy, `npm ci` and every required validation command complete successfully using the committed lockfile; direct versions and dependencies match the authoritative register. |
| AC-032 | UX-005 | The rendered foundation shell has one clear application identity and heading hierarchy, semantic landmarks, visible keyboard focus, responsive reflow, no baseline automated accessibility violations, working error/not-found recovery, and no control or copy that implies composition features exist. |

## Release interpretation

Automated musical validity is necessary but does not prove quality. Version 1 additionally requires structured human review of representative golden cases and the FL Studio import workflow. A criterion may be “not yet implemented” until its roadmap stage is authorized; documentation alone does not satisfy product behavior.
