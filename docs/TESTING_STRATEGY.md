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

## Stage 3B2b2d Chord aggregate contract definition

This documentation-only gate reviews minimal root-plus-quality identity, derived modulo-12 membership, deferred extensions, equality identity, serializer boundary, forbidden state, and Chord/Inversion/Voicing/Harmony separation. It must not be treated as production implementation evidence.

## Stage 3B2b2c ChordQuality primitive

Tests cover the closed three-ID vocabulary, runtime rejection of malformed and forged identities, exact formula invariants, frozen returned formulas, every ordered equality pair, exact fixed-order serialization fixtures, and exclusion of root, inversion, voicing, spelling, extension, display, and per-instance version fields.

## Stage 3B2b2e Chord primitive

The suite exhaustively constructs all 36 root/quality identities, verifies immutable two-field state and modulo-12 membership derivation, rejects forged runtime values, checks all 1,296 ordered equality pairs, and validates repeated exact minimal serialization with forbidden-field checks.

## Stage 3B2b2f ChordInversion contract definition

This documentation-only gate reviews the exact `0..2` member-index domain, canonical formula-order mapping, separation from Chord identity and voicing, reserved serializer shape, runtime-validation expectations, and explicit review requirement before wider chord cardinality. It provides no implementation evidence.

## Stage 3B2c1 Deterministic PRNG contract definition

This documentation-only gate reviews the versioned Mulberry32 selection and exact transition, uint32 seed/state/output boundaries, replay and lineage inputs, no-ambient-randomness and security boundaries, deferred stream/fork mechanics, and future known-answer, malformed-input, long-sequence, independent-instance, cross-runtime, and lineage/version-reference fixtures. It provides no implementation evidence; standalone PRNG serialization is deferred to the enclosing lineage/composition schema.

## Stage 3B2b2g ChordInversion primitive

The implementation tests exactly three valid indices (`0..2`), reject malformed and forged runtime values, cover all 9 ordered equality pairs, and assert exact `nightdrive.chord-inversion.v1` fixtures for `0`, `1`, and `2`. They verify repeated byte-stable serialization, forbidden-field absence, and no coercion or wrapping. No Chord, voicing, harmony, MIDI realization, or wider-cardinality behavior is included.

Mock network/provider/storage clocks at boundaries; do not mock deterministic domain code in integration tests. Use a seeded project factory and fixed UTC clock. Human musical ratings are preserved as evaluation evidence, not converted into unit-test truth.

## CI gates

A release-candidate build requires clean install/lockfile integrity, format/lint/type checks, all unit/property/integration/API/schema/MIDI tests, migration and RLS tests, production build, E2E critical path, automated accessibility, security/secret/dependency gates, deterministic cross-runtime fixtures, and required evaluation/manual evidence. Tests cannot be deleted, weakened, or skipped merely to pass; a quarantine requires owner, reason, risk, expiry, and non-release status if release-blocking.

## Coverage philosophy

Prioritize behavioral/invariant and branch-risk coverage over a single percentage. Before implementation, each stage specifies exact thresholds for its modules and mutation/property testing where valuable. Generated code, trivial adapters, and UI presentation may have different targets, but P0 acceptance paths need direct evidence.

## Environments

Fast deterministic checks run on every change. Database/browser suites run in CI with isolated data. Preview smoke tests run after deployment. Production gets non-destructive smoke checks. FL Studio verification remains a controlled human gate until automatable evidence is credible.
