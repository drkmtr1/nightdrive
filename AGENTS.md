# Nightdrive operating contract

## Authority and scope

Read this file first, then `docs/DECISIONS.md`, `docs/SCOPE.md`, and the document governing the task. If documents conflict, stop implementation, reconcile conservatively, and record any architectural resolution in `docs/DECISIONS.md`.

Nightdrive helps producers create original, editable musical material. Stage 1, Stage 2A, Stage 3A, Stage 3B1, Stage 3B2a, Stage 3B2b1, Stage 3B2b2a, Stage 3B2b2b, Stage 3B2b2c, Stage 3B2b2d, Stage 3B2b2e, Stage 3B2b2f, Stage 3B2b2g, Stage 3B2c1, Stage 3B2c2, Stage 3B2b2h, Stage 3B2b2i, Stage 4A, Stage 4B1, Stage 4B2, Stage 4B3, Stage 4B4, Stage 5B1, Stage 5B2a, Stage 5B2b, Stage 5C1, Stage 5D1, Stage 6A1, Stage 6A2, the Stage 6 Bass straight-rhythm contract and implementation, and Stage 7A are merged. Stage 7B1 is the current bounded Arpeggiator candidate-foundation implementation/review slice. Later capability gates remain separately authorized. MIDI-004 is accepted only for the declared tested FL Studio environment. Do not provision Supabase, deploy to Vercel, install models, or implement note spelling, named intervals, extensions, harmony optimization, production parser workflows, later generation, audio, persistence, or AI features before their roadmap stages are explicitly authorized.

## Non-negotiable boundaries

- The producer remains the composer; do not present output as a finished autonomous song.
- Canonical notes, harmony, rhythm, musical time, and MIDI are produced by deterministic, typed logic—not an LLM.
- Validate AI output against a versioned schema before it can become input to deterministic tools. AI never directly mutates canonical persistence.
- Use explicit seeds and versioned inputs for any randomized generation; retain immutable lineage.
- Use 960 PPQ initially and standard MIDI as the first FL Studio interchange format.
- Locked components must remain byte-for-byte/canonical-value unchanged during unrelated regeneration.
- Prefer a modular monolith. Add infrastructure or dependencies only for a documented need.
- Version 1 is the 8-bar section workflow in `docs/SCOPE.md`; its non-goals are binding.

## Engineering rules

- Work on one bounded roadmap task at a time. Do not continue to the next task automatically.
- Before meaningful engineering work, read `PROJECT_STATE.md` when it exists; update it when project coordination state materially changes, replacing stale state rather than accumulating a log. Keep requirements, architecture, contracts, tests, and decisions in their authoritative documents, and use Git for detailed history.
- Trace behavior to requirement IDs and acceptance criteria. Update authoritative documentation with behavior changes.
- Use explicit units, UTC timestamps, stable ordering, typed interfaces, structured errors, and idempotency where relevant.
- Preserve user work and generation history. Never weaken tests to make a build pass.
- Never commit secrets or `.env` contents. Privileged Supabase credentials are server-only.
- Significant dependencies require purpose, license, health, security, bundle/runtime cost, operational cost, portability, and removal notes.
- New architectural decisions require an ADR with context, alternatives, consequences, and revisit conditions.

## Build vs. Buy / Dependency Evaluation Gate

Before implementing any new capability that could reasonably be provided by an established library, framework, protocol implementation, SDK, or standard tool, classify it as Nightdrive-specific domain logic, commodity/standardized functionality, or mixed. Keep Nightdrive-specific semantics owned by Nightdrive; use a mature dependency for commodity mechanisms when it provides meaningful value over a small local implementation. Evaluate candidate dependencies for capability fit, maintenance, license, TypeScript/runtime support, determinism, testability, size/transitives, security, API stability, pinning, canonical-boundary impact, and replaceability. External libraries may implement commodity mechanisms but must not define canonical musical semantics; use adapters where consequential. Do not replace accepted primitives without evidence preserving semantics. Record the classification, alternatives, selected approach, rationale, boundary impact, and dependencies in every implementation report. If no suitable library exists, document why custom code is appropriate. Stop for architecture review if adoption would change accepted architecture, canonical semantics, persisted formats, or public interfaces. Skip broad package research for trivial local logic.

## Delivery report

Every implementation task must report: task completed; files modified; implementation; tests and results; acceptance verification; UX/accessibility verification; architecture/docs changes; Supabase changes; deployment changes; branch; commit; push; assumptions; remaining risks; and the next smallest backlog task. Recommending a task does not authorize it.
