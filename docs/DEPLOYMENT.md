# Deployment plan

## Stage 1 status

No Vercel project, Supabase project, environment, domain, or deployment is created in Stage 1.

## Target environments

| Environment | Purpose | Data/services | Promotion |
|---|---|---|---|
| Local | development and deterministic tests | local/test configuration; later Supabase local stack where justified | none |
| Preview | per-PR UX/integration review | isolated non-production backend/config; synthetic data | automatic after required build gates |
| Production | released Version 1 | production Supabase and managed secrets | explicit approved merge/release gate |

Vercel is the default web host; Supabase is the default Postgres/Auth provider. Separate credentials and databases are mandatory. Preview must never point at production data.

## Pipeline

Requirement/task → branch/PR → dependency install from lockfile → formatting/lint/type checks → unit/integration/API/schema/MIDI tests → Supabase migration/RLS tests when applicable → production build → E2E/accessibility/security checks → preview verification → review/merge → production migration compatibility gate → deploy → smoke/health/observability checks → rollback decision.

## Configuration and secrets

Document every variable by name/purpose/scope without values. Validate required configuration at startup/build boundary. Browser-exposed variables use an explicit public prefix and contain no secrets. Vercel/Supabase/provider credentials use environment controls and least privilege. `.env*` values stay untracked; only safe example names/placeholders may be committed later.

## Database changes

Use ordered migrations applied to preview first. Favor backward-compatible expand/migrate/contract changes. Back up and rehearse restore for destructive production changes. Application rollback must account for schema compatibility; never assume code rollback reverses data migration.

## Release and rollback

Tag/versioning policy will be set before first release. A release records commit, schema/generator/profile versions, migrations, evaluation evidence, and known issues. Roll back or disable a failing feature when health, data integrity, security, determinism, or core export gates fail. Verify liveness, auth, create/save, deterministic fixture, export, RLS, and telemetry after deploy.

## Domains and cost

Domain/DNS, regions, data residency, budget alerts, log provider, error tracking, AI provider, and retention are undecided implementation inputs—not implicit approvals.
