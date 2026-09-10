# Coding-agent rules

## Before changing anything

Read `AGENTS.md`, decisions, scope, requirements, acceptance criteria, and relevant domain contract. Inspect the full relevant tree, Git state/branch/remotes, existing code/tests/dependencies, Supabase/Vercel configuration, and contradictory documentation. Preserve valid user work.

## Scope and authority

- Work only on the explicitly assigned bounded task and authorized roadmap stage.
- Do not scaffold ahead, provision services, deploy, install large models, or begin the next backlog item without authorization.
- Ask only when a decision materially changes scope/risk and cannot be conservatively resolved.
- Never invent requirements, mark provisional decisions accepted, or imply documentation equals implementation.

## Implementation discipline

- Trace code/tests to stable requirement and acceptance IDs.
- Keep canonical music deterministic, typed, versioned, seeded, and independent of LLM output.
- Preserve immutable history/lineage and locked-component invariants.
- Use explicit units and integer ticks; avoid floating-point time as canonical state.
- Validate at every trust boundary. Keep privileged access server-side.
- Prefer small reversible modules and dependency injection at provider/framework boundaries.
- Justify dependencies and avoid speculative infrastructure.
- Add/adjust tests with behavior; never delete or relax a legitimate test merely to get green.

## Repository and safety

Never commit tokens, secrets, `.env` values, personal data, generated build output, or unlicensed fixtures. Do not overwrite unrelated changes or use destructive Git commands without explicit authorization. Use migrations for schema changes and include rollback/compatibility thinking. Surface human-only gates.

## Completion

Run relevant validation, inspect the diff, verify acceptance and non-goals, update authoritative docs, and use the report in [Development workflow](DEVELOPMENT_WORKFLOW.md). Stop after the bounded task.
