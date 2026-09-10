# Testing strategy

## Test layers

- Unit: theory/time primitives, constraints, seeded PRNG, generator decisions, editor commands, MIDI ordering/encoding, schema parsing.
- Property/invariant: pitch/range/tick bounds, positive durations, deterministic equality, transposition relationships, no locked mutation.
- Integration: full component pipelines, persistence transactions, migrations, export round trip, preview scheduling adapters.
- API/contract: auth, schema, idempotency, conflict, limits, typed errors, provider failure.
- Supabase/RLS: local/CI database with owner, other user, anonymous, and service-specific cases.
- E2E: first-time create/audition/edit/lock/vary/save/reopen/export workflows and failure recovery.
- Accessibility/responsive: automated axe-like checks plus keyboard, focus, screen reader, zoom, contrast, motion/audio and viewport matrix.
- Security: authorization, injection, size/depth, rate/timeout, secret/build scan, dependency review.
- AI evaluation: schema/adversarial/grounding/usefulness/cost/latency regression using frozen inputs and mocked provider for CI.
- FL Studio: retained export fixtures plus structured manual import protocol on supported version(s).

## Stage 2A baseline

The implemented foundation uses Biome `2.5.12` for formatting/linting, TypeScript `7.0.2` with `strict`, and Vitest `5.0.0` with Testing Library, jsdom, and axe-core. Current automated coverage verifies the semantic empty state, absence of misleading feature controls, baseline axe violations, and the liveness route contract. Color contrast is reviewed against committed tokens because jsdom cannot compute reliable rendered contrast. A production-server HTTP smoke check verifies `/`, `/api/health/live`, a missing route, and security headers.

Required Stage 2A commands are `npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run docs:check`, and `npm run build`. `npm run validate` composes all checks after installation. The runtime CI workflow runs them with the `.nvmrc` Node version while the original documentation workflow remains independent.

## Fixtures

Version controlled: theory tables, seed/generator/profile versions, canonical JSON snapshots, malformed boundary cases, MIDI goldens/round trips, editor command histories, RLS identities, API contracts, and the golden music cases in [Evaluation](EVALUATION_PLAN.md). Binary fixtures must have source/license/provenance and a text manifest.

Mock network/provider/storage clocks at boundaries; do not mock deterministic domain code in integration tests. Use a seeded project factory and fixed UTC clock. Human musical ratings are preserved as evaluation evidence, not converted into unit-test truth.

## CI gates

A release-candidate build requires clean install/lockfile integrity, format/lint/type checks, all unit/property/integration/API/schema/MIDI tests, migration and RLS tests, production build, E2E critical path, automated accessibility, security/secret/dependency gates, deterministic cross-runtime fixtures, and required evaluation/manual evidence. Tests cannot be deleted, weakened, or skipped merely to pass; a quarantine requires owner, reason, risk, expiry, and non-release status if release-blocking.

## Coverage philosophy

Prioritize behavioral/invariant and branch-risk coverage over a single percentage. Before implementation, each stage specifies exact thresholds for its modules and mutation/property testing where valuable. Generated code, trivial adapters, and UI presentation may have different targets, but P0 acceptance paths need direct evidence.

## Environments

Fast deterministic checks run on every change. Database/browser suites run in CI with isolated data. Preview smoke tests run after deployment. Production gets non-destructive smoke checks. FL Studio verification remains a controlled human gate until automatable evidence is credible.
