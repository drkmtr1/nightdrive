# Nightdrive operating contract

## Authority and scope

Read this file first, then `docs/DECISIONS.md`, `docs/SCOPE.md`, and the document governing the task. If documents conflict, stop implementation, reconcile conservatively, and record any architectural resolution in `docs/DECISIONS.md`.

Nightdrive helps producers create original, editable musical material. Stage 1, Stage 2A, Stage 3A, Stage 3B1, Stage 3B2a, Stage 3B2b1, Stage 3B2b2a, Stage 3B2b2b, Stage 3B2b2c, Stage 3B2b2d, Stage 3B2b2e, Stage 3B2b2f, Stage 3B2b2g, Stage 3B2c1, Stage 3B2c2, Stage 3B2b2h, Stage 3B2b2i, Stage 4A, Stage 4B1, Stage 4B2, Stage 4B3, Stage 4B4, Stage 5B1, Stage 5B2a, Stage 5B2b, Stage 5C1, Stage 5D1, Stage 6A1, Stage 6A2, the Stage 6 Bass straight-rhythm contract and implementation, Stage 7A, Stage 7B1, Stage 7B2, Stage 7B3, Stage 7B4, the Stage 7C documentation checkpoint, Stage 7C1, Stage 7C2, Stage 7C3, Stage 7C-P1, Stage 7C4, Stage 7C5, Stage 7C6, Stage 7C7a1, Stage 7C7a2, Stage 7C7a3, Stage 7C7a4, Stage 7C7a5, Stage 7C7a6, Stage 7C7a7, Stage 7C7a8, and the enclosing Stage 7C integration/error-precedence operation are accepted and merged. Stage 7C7a5 is accepted and merged through PR #90 at approved head `d2b18ca3156d358693e1d00456cde1558afcca51` with merge commit `e87e270745b6fe219df8b0cd76f47f47ded03400`. Stage 7C7a6 is accepted and merged through PR #92 at approved head `a7193128e9d8febcee6cca306a0f07fc1c6cc41a` with merge commit `e4ae8e8675a83e69752362565f94b73907ded10a`; it implements only the internal immutable genre-profile Arpeggiator configuration runtime. Stage 7C7a7 policy resolution is accepted and merged through PR #94 at approved head `133c7f6fecc2a78ea4278fb7b44921a2484a0c13` with merge commit `afbe3493841ef38a62eb961368a2f1147f008725`. Stage 7C7a8 resolved-plan projection is accepted and merged through PR #96 at approved head `43d251c4c95d39f60320ad90bd80522c514d721c` with merge commit `a14b6e100d00464e314309b45813943e6f81b83a`. The enclosing Stage 7C operation is accepted and merged through PR #98 at approved head `d4373c60cb3242058df4bc1c898ccb2d465f0741` with merge commit `6f5e1d26e9f48a678f5c995538fdb218d29fd39d`; it supplies the public `generateArpEventsWithPolicyV1` boundary and exact Stage 7C5 preflight/error behavior. Aggregate provenance, structured human evaluation, and later Arpeggiator capability gates remain separately authorized. MIDI-004 is accepted only for the declared tested FL Studio environment. Do not provision Supabase, deploy to Vercel, install models, or implement note spelling, named intervals, extensions, harmony optimization, production parser workflows, later generation, audio, persistence, or AI features before their roadmap stages are explicitly authorized.

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
- Use the [Engineering Review Playbook](docs/ENGINEERING_REVIEW_PLAYBOOK.md) for read-only review procedures when justified by risk/change or explicitly authorized; reviews inspect and report only, and corrective implementation requires separate authorization. This playbook does not supersede AGENTS.md or accepted repository requirements, decisions, architecture, contracts, testing strategy, or milestone authorization.
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
