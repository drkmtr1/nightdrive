# Nightdrive operating contract

## Authority and scope

Read this file first, then `docs/DECISIONS.md`, `docs/SCOPE.md`, and the document governing the task. If documents conflict, stop implementation, reconcile conservatively, and record any architectural resolution in `docs/DECISIONS.md`.

Nightdrive helps producers create original, editable musical material. The current authorized capability gate is **Stage 1: documentation and architecture only**. Do not scaffold the production app, provision Supabase, deploy to Vercel, install dependencies or models, or implement application features until a later bounded task explicitly authorizes the relevant roadmap stage.

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
- Trace behavior to requirement IDs and acceptance criteria. Update authoritative documentation with behavior changes.
- Use explicit units, UTC timestamps, stable ordering, typed interfaces, structured errors, and idempotency where relevant.
- Preserve user work and generation history. Never weaken tests to make a build pass.
- Never commit secrets or `.env` contents. Privileged Supabase credentials are server-only.
- Significant dependencies require purpose, license, health, security, bundle/runtime cost, operational cost, portability, and removal notes.
- New architectural decisions require an ADR with context, alternatives, consequences, and revisit conditions.

## Delivery report

Every implementation task must report: task completed; files modified; implementation; tests and results; acceptance verification; UX/accessibility verification; architecture/docs changes; Supabase changes; deployment changes; branch; commit; push; assumptions; remaining risks; and the next smallest backlog task. Recommending a task does not authorize it.
