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

## Stage 3A musical-time core

The Stage 3A unit suite exhaustively round-trips every absolute tick from `0` through the inclusive conversion boundary `30720`. It separately verifies zero-based position examples, the unique terminal position, valid event-start versus event-end semantics, exact straight/dotted/triplet tick fixtures, positive-duration arithmetic, overflow, ordering, tempo rounding and derived seconds, time-signature validation, stable error codes/fields, and exact serialized strings. Invalid cases cover negative, zero where prohibited, fractional, non-finite, unsafe-integer, aliased-position, and out-of-section inputs.

A source-boundary test requires every production import in `src/music-domain` to be relative, preventing accidental Next.js, React, DOM, Node-only, provider, or third-party coupling. The full existing `npm run validate` gate remains unchanged and runs the new suite in both local and CI environments. No dependency or lockfile change is required.

## Stage 3B1 pitch identity

The Stage 3B1 suite exhaustively constructs and serializes all 12 pitch classes and all 128 MIDI pitches. For each MIDI value it verifies the exact `midiPitch % 12` extraction invariant, including fixtures `0→0`, `11→11`, `12→0`, `60→0`, and `127→7`. Boundary, fraction, non-finite, and unsafe-integer failures assert stable `PitchValueError` codes and fields. Equality and numeric ordering are tested without introducing note names, spelling, octave labels, or normalization arithmetic.

The music-domain dependency-boundary test now recognizes static imports, dynamic imports, re-exports, and side-effect-only imports before enforcing relative specifiers. This remains a deliberately small source guard rather than a general parser. The complete repository gate and dependency graph remain unchanged.

## Stage 3B2a chromatic interval

The Stage 3B2a suite covers signed and compound semitone values (`-19` through `19` fixtures), zero, strict numeric failures, equality, comparison, negation, addition/subtraction, safe-integer overflow, repeated fixed-order serialization, and the algebraic invariants for representative values. It exhaustively tests all `128 × 128 = 16,384` ordered MIDI-pitch pairs for exact `to - from` distance and antisymmetry. No pitch-class directional-distance API or MIDI transposition is introduced.

## Fixtures

Version controlled: theory tables, seed/generator/profile versions, canonical JSON snapshots, malformed boundary cases, MIDI goldens/round trips, editor command histories, RLS identities, API contracts, and the golden music cases in [Evaluation](EVALUATION_PLAN.md). Binary fixtures must have source/license/provenance and a text manifest.

## Stage 3B2b1 scale formula foundations

Tests cover each of the six exact formulas and their seven-offset invariants, immutable formula results, invalid scale identifiers and degrees, deterministic fixed-order serialization, and exhaustive projection behavior for all 72 tonic/scale combinations. Each context checks all seven ordered members and all twelve pitch-class membership outcomes.

## Stage 3B2b2a Key primitive

Tests exhaust all 72 tonic/scale Keys, verify immutable two-field construction, delegated seven-member projection, all seven degree lookups, all twelve membership outcomes, equivalent/different-key equality, forged runtime input rejection, and repeated fixed-order `nightdrive.key.v1` serialization without derived or spelling data.

## Stage 3B2b2b ChordQuality contract definition

This documentation-only gate reviews the exact three-quality table, formulas, profile rationale, quality/chord/voicing boundary, and seventh-as-extension decision. It must not be treated as production implementation or implementation test evidence.

Mock network/provider/storage clocks at boundaries; do not mock deterministic domain code in integration tests. Use a seeded project factory and fixed UTC clock. Human musical ratings are preserved as evaluation evidence, not converted into unit-test truth.

## CI gates

A release-candidate build requires clean install/lockfile integrity, format/lint/type checks, all unit/property/integration/API/schema/MIDI tests, migration and RLS tests, production build, E2E critical path, automated accessibility, security/secret/dependency gates, deterministic cross-runtime fixtures, and required evaluation/manual evidence. Tests cannot be deleted, weakened, or skipped merely to pass; a quarantine requires owner, reason, risk, expiry, and non-release status if release-blocking.

## Coverage philosophy

Prioritize behavioral/invariant and branch-risk coverage over a single percentage. Before implementation, each stage specifies exact thresholds for its modules and mutation/property testing where valuable. Generated code, trivial adapters, and UI presentation may have different targets, but P0 acceptance paths need direct evidence.

## Environments

Fast deterministic checks run on every change. Database/browser suites run in CI with isolated data. Preview smoke tests run after deployment. Production gets non-destructive smoke checks. FL Studio verification remains a controlled human gate until automatable evidence is credible.
