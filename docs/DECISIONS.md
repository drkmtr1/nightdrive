# Architectural decisions

Statuses: **Accepted**, **Provisional**, **Superseded**, **Rejected**. Provisional decisions must be validated before their implementation stage.

## ADR-001 — Documentation before implementation

**Date:** 2026-09-09
**Status:** Accepted

**Context:** The repository began empty and the product spans music theory, MIDI, UX, persistence, AI, and subjective evaluation risks.
**Decision:** Complete and review the Stage 1 contracts before application scaffolding.
**Alternatives:** Scaffold first; build a proof of concept.
**Rationale:** Early code would harden unreviewed boundaries and invite scope drift.
**Consequences:** Stage 1 intentionally contains no runtime app, dependencies, Supabase resources, or deployment.
**Revisit:** Stage 1 exit audit passes and Stage 2 is explicitly authorized.

## ADR-002 — Modular monolith

**Date:** 2026-09-09
**Status:** Accepted

**Context:** Version 1 has several domains but no demonstrated independent scaling need.
**Decision:** Use one repository/deployable web application with enforceable internal module boundaries.
**Alternatives:** Microservices; serverless functions per feature; desktop app.
**Rationale:** It minimizes operations while preserving separation through ports and domain modules.
**Consequences:** No queue/worker/service split until measurements justify it.
**Revisit:** Sustained latency, isolation, ownership, or deployment constraints exceed the monolith.

## ADR-003 — Next.js and TypeScript application direction

**Date:** 2026-09-09
**Status:** Accepted — validated 2026-09-09

**Context:** The product needs a desktop-first interactive web UI, typed shared schemas, server routes, and Vercel compatibility.
**Decision:** Use Next.js `16.3.4` Active LTS with React/React DOM `19.3.0`, strict TypeScript `7.0.2`, Node.js `24.21.0` LTS, and npm `11.19.0`. Use App Router and the default Node.js server runtime. Keep future deterministic domain modules framework-independent and place Next.js only at the web adapter boundary. Pin direct dependencies exactly and commit npm's lockfile.
**Alternatives:** Vite SPA plus API; Remix; native desktop.
**Rationale:** The Stage 2A evidence in [Framework validation](FRAMEWORK_VALIDATION.md) confirms semantic desktop UI, strict shared contracts, explicit server/client boundaries, browser APIs behind client adapters, route testability, production builds, and native Vercel compatibility. A single root application avoids a premature workspace while dependency direction preserves a future extraction path. Biome was selected because Next.js's scaffold supports it and the otherwise-compatible ESLint 9 line was deprecated while ESLint 10 remained outside plugin peer ranges.
**Consequences:** Server Components remain the default; browser-only audio/editor adapters must use explicit client boundaries. Framework imports are prohibited from future domain modules. Node/npm and direct dependency updates require CI, compatibility, security, and dependency-register review. Bundle/runtime boundaries stay measurable.
**Revisit:** A future cross-runtime determinism, Web Audio, MIDI, accessibility, hosting, or maintainability spike demonstrates a material limitation, or the selected LTS/runtime line approaches end of support.

## ADR-004 — Supabase for persistence/authentication

**Date:** 2026-09-09
**Status:** Provisional

**Context:** Version 1 requires accounts, relational ownership, immutable lineage, and RLS.
**Decision:** Use Supabase PostgreSQL/Auth by default behind repository/auth boundaries; do not provision before Stage 12 authorization.
**Alternatives:** Vercel Marketplace Postgres + separate auth; self-hosted Postgres; local-only.
**Rationale:** PostgreSQL constraints and RLS suit ownership and lineage while reducing platform setup.
**Consequences:** RLS and vendor behavior need dedicated tests; provider-specific code stays at adapters.
**Revisit:** Auth/data-residency/cost/local-development requirements are not met.

## ADR-005 — Vercel hosting

**Date:** 2026-09-09
**Status:** Provisional

**Context:** A web workstation needs preview and production deployments.
**Decision:** Use Vercel as default host, with separate local/preview/production environments; provision only in an authorized deployment task.
**Alternatives:** Cloudflare; container host; Supabase-only frontend.
**Rationale:** It aligns with the planned framework and preview workflow.
**Consequences:** Function/runtime limits and cost must be measured.
**Revisit:** Audio timing, function duration, region, cost, or portability fails requirements.

## ADR-006 — 960 PPQ integer musical time

**Date:** 2026-09-09
**Status:** Accepted

**Context:** Editing, deterministic generation, MIDI, and future Reference Rebuild exchange need a shared exact grid.
**Decision:** Store canonical positions/durations as nonnegative integer ticks at 960 PPQ with explicit meter/tempo metadata.
**Alternatives:** 480 PPQ; floating beats; seconds.
**Rationale:** 960 supports common subdivisions and precise editing while remaining practical for MIDI.
**Consequences:** Conversion/rational rounding and event ordering are specified and tested; browser seconds remain derived.
**Revisit:** Demonstrated interchange or tuplets/microtiming cannot be represented acceptably.

## ADR-007 — Standard MIDI before proprietary FL Studio formats

**Date:** 2026-09-09
**Status:** Accepted

**Context:** FL Studio is the destination but `.flp` is proprietary and would couple composition to DAW internals.
**Decision:** Export standard multi-track/component MIDI plus metadata and instructions first.
**Alternatives:** `.flp`; plugin/bridge; clipboard protocol.
**Rationale:** MIDI is portable, inspectable, testable, and keeps the producer in control.
**Consequences:** Instrument assignment and some production detail remain manual.
**Revisit:** Version 1 evidence shows MIDI cannot support the workflow or a stable official integration emerges.

## ADR-008 — Deterministic canonical music engine

**Date:** 2026-09-09
**Status:** Accepted

**Context:** Raw model-generated notes are difficult to constrain, reproduce, explain, and test.
**Decision:** Typed deterministic engines own theory, notes, rhythm, voicing, patterns, and serialization.
**Alternatives:** LLM note generation; large generative music model.
**Rationale:** Determinism enables validity, editing, lineage, and repeatable evaluation.
**Consequences:** Explicit musical rules/profiles must be designed and evaluated.
**Revisit:** Never for canonical authority without a new scope/quality/safety decision and migration plan.

## ADR-009 — Schema-validated AI boundary

**Date:** 2026-09-09
**Status:** Accepted

**Context:** Natural-language intent and explanations are useful but model output is untrusted.
**Decision:** AI proposes allowlisted versioned parameter commands or explanations; schema/domain validation and user/system authorization precede any deterministic action. No direct database mutation.
**Alternatives:** Chat-first agent with tools; no AI.
**Rationale:** Preserves assistance while keeping canonical state safe and inspectable.
**Consequences:** Deterministic workflows must remain functional during AI failures.
**Revisit:** Allowed schemas/capabilities evolve through threat review and evaluation.

## ADR-010 — Explicit seeded generation and immutable lineage

**Date:** 2026-09-09
**Status:** Accepted

**Context:** Variations and random pattern choices must be reproducible and non-destructive.
**Decision:** Record seed, generator/engine/profile/schema versions, normalized input, parent, and hashes for every run; completed history is immutable.
**Alternatives:** ambient randomness; latest-value overwrite.
**Rationale:** Enables debugging, comparison, recovery, and trust.
**Consequences:** PRNG algorithm/version and canonical serialization become public contracts.
**Revisit:** Storage pressure may change retention representation, never silent provenance.

## ADR-011 — Browser audition is a derived preview

**Date:** 2026-09-09
**Status:** Provisional

**Context:** Users need immediate feedback but browsers and devices do not reproduce production synths or clocks exactly.
**Decision:** Use a lightweight Web Audio scheduling adapter with simple role voices; ticks remain canonical and audio seconds are derived. Select exact library/native approach at Stage 9 after a timing spike.
**Alternatives:** rendered server audio; embedded production synth; no preview.
**Rationale:** Low-latency preview supports composition without pretending to be final sound design.
**Consequences:** Resume policies, latency/drift, tab suspension, mobile limits, and accessibility require testing.
**Revisit:** Stage 9 measurements fail synchronization/timing requirements.

## ADR-012 — Constant 4/4, single 8-bar section for Version 1

**Date:** 2026-09-09
**Status:** Accepted

**Context:** Flexible arrangements, meters, and tempo maps would multiply engine/editor/export complexity.
**Decision:** The initial implemented path is one 8-bar 4/4 section at constant tempo while data contracts retain explicit meter/tempo fields.
**Alternatives:** arbitrary section length/meter/tempo map from launch.
**Rationale:** It aligns every component around the north-star task.
**Consequences:** Other meters, tempo automation, and full songs are deferred.
**Revisit:** After Version 1 evidence and a separately approved scope change.
