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

## ADR-014 — Versioned deterministic PRNG contract

**Date:** 2026-09-09
**Status:** Accepted for the Stage 3B2c1 contract-definition milestone; implementation remains separately gated.

**Context:** Future randomized music generation requires reproducible, versioned randomness across supported JavaScript runtimes.
**Decision:** Use an in-repository Mulberry32 uint32 transition identified as `nightdrive.prng.mulberry32.v1`. Accept only canonical uint32 seeds (`0..4,294,967,295`), including zero, with no coercion. Keep the PRNG independent of musical policy, ambient randomness, and security-sensitive randomness.
**Alternatives:** ambient/`Math.random()` randomness; another deterministic PRNG; dependency-backed PRNG.

**Rationale:** Mulberry32 is small enough for auditable in-repository implementation, uses explicit integer arithmetic with portable JavaScript semantics, and is adequate for bounded deterministic generation decisions without claiming cryptographic security. Versioning prevents silent sequence drift.

**Consequences:** Future replay records retain seed and selected PRNG/generator/profile/schema versions with normalized inputs. Bounded-choice helpers and independent stream/fork mechanics require later contracts; transient state and derived random values are not canonical composition state.
**Revisit:** Reconsider only if implementation or cross-runtime evidence demonstrates that the frozen algorithm cannot satisfy the deterministic replay contract.

## ADR-011 — Browser audition is a derived preview

**Date:** 2026-09-09
**Status:** Provisional

**Context:** Users need immediate feedback but browsers and devices do not reproduce production synths or clocks exactly.
**Decision:** Use a lightweight Web Audio scheduling adapter with simple role voices; ticks remain canonical and audio seconds are derived. Select exact library/native approach at Stage 9 after a timing spike.
**Alternatives:** rendered server audio; embedded production synth; no preview.
**Rationale:** Low-latency preview supports composition without pretending to be final sound design.
**Consequences:** Resume policies, latency/drift, tab suspension, mobile limits, and accessibility require testing.
**Revisit:** Stage 9 measurements fail synchronization/timing requirements.

## ADR-015 — Triad-only ChordVoicing boundary

**Date:** 2026-09-10
**Status:** Accepted for the Stage 3B2b2h contract-definition milestone; implementation remains separately gated.

**Context:** Stage 4 harmony needs a deterministic realized voicing boundary without conflating voicing with Chord identity or inversion metadata.
**Decision:** Define V1 `ChordVoicing` as exactly three unique validated `MidiPitch` values in strictly ascending absolute order, one per canonical triad member. Keep Chord and ChordInversion external; validate membership and lowest-member inversion compatibility through separate deterministic checks. Reserve `nightdrive.chord-voicing.v1` for the ordered pitch sequence only.
**Alternatives:** Allow arbitrary voice counts or doubling; embed Chord/inversion context in the voicing value; defer all voicing semantics until Stage 4.
**Rationale:** The triad-only representation is the smallest deterministic contract needed before harmony while leaving register, spacing, voice-leading, and future cardinality to policy or separately reviewed contracts.
**Consequences:** Wider chord cardinality, doubling, and realized compatibility algorithms require explicit future review; no voicing implementation is authorized by this milestone.
**Revisit:** Reconsider only when an explicitly authorized extension or harmony contract demonstrates a need for additional canonical voicing state.

## ADR-012 — Constant 4/4, single 8-bar section for Version 1

**Date:** 2026-09-09
**Status:** Accepted

**Context:** Flexible arrangements, meters, and tempo maps would multiply engine/editor/export complexity.
**Decision:** The initial implemented path is one 8-bar 4/4 section at constant tempo while data contracts retain explicit meter/tempo fields.
**Alternatives:** arbitrary section length/meter/tempo map from launch.
**Rationale:** It aligns every component around the north-star task.
**Consequences:** Other meters, tempo automation, and full songs are deferred.
**Revisit:** After Version 1 evidence and a separately approved scope change.

## ADR-013 — Zero-based positions and a unique terminal boundary

**Date:** 2026-09-09
**Status:** Accepted

**Context:** Exhaustive absolute-tick conversion must include the 8-bar section end, while event starts must remain strictly inside the section and UI labels will eventually be one-based.
**Decision:** Canonical `MusicalPosition` indices are zero-based. Ordinary positions cover bars 0–7, beats 0–3, and ticks 0–959. Absolute tick 30,720 has exactly one structured representation, `{ bar: 8, beat: 0, tickWithinBeat: 0 }`; it is valid only as the conversion/event-end boundary. UI one-based labels are projections. Individual Stage 3A time primitives serialize through fixed-key-order versioned JSON forms, while composition canonicalization and hashing remain deferred.
**Alternatives:** Exclude the terminal tick from conversion; alias it to the final tick; permit normalized overflow tuples; use one-based domain indices; implement the full composition canonicalizer now.
**Rationale:** The unique boundary makes `[0, sectionLengthTicks]` round trips total without allowing zero-length or out-of-section events, and separates canonical state from presentation without expanding Stage 3A.
**Consequences:** Event-start validation is stricter than position conversion. Callers must deliberately distinguish terminal positions, and later composition schemas must embed or reference the established primitive forms without silently changing their meaning.
**Revisit:** A separately authorized meter/section-map design requires pickup bars, multiple sections, or a different boundary representation with a migration plan.

## ADR-016 — Versioned deterministic Harmony policy contract

**Date:** 2026-09-10
**Status:** Accepted for the Stage 4A documentation-only contract milestone; implementation remains separately gated.

**Context:** Stage 4 requires reproducible progression, inversion, voicing, and voice-leading choices across four bounded V1 profiles without putting policy into canonical primitives.
**Decision:** Define `nightdrive.harmony-template.v1` as ordered degree/quality/bar-span slots with explicit profile metadata, deterministic candidate scoring/tie-breaks, hard unsatisfiable reasons, and machine-readable provenance. Use only existing triad, inversion, voicing, key, scale, and PRNG contracts.
**Alternatives:** Leave templates to implementation; encode realized MIDI in templates; permit ambient/random or AI-selected harmony.
**Rationale:** A versioned, policy-only contract makes implementation auditable while preserving primitive boundaries and replay.
**Consequences:** Profile data and voice-leading behavior require deterministic fixtures and human musical review; bounded helpers and implementation remain deferred.
**Revisit:** Reconsider only if implementation or cross-profile evidence demonstrates that the frozen representation or tie-break contract cannot support deterministic V1 harmony.

## ADR-017 — Versioned Nightdrive MIDI boundary

**Date:** 2026-09-10
**Status:** Accepted for the Stage 5A boundary and dependency-spike definition; Stage 5B1 IR, Stage 5B2a isolated serializer-adapter implementation, and Stage 5B2b independent parser/reference evidence are merged, while Stage 5C1 interoperability preparation and production parser/round-trip, FL Studio acceptance, and delivery remain separately gated.

**Context:** Standard MIDI is the planned FL Studio interchange, but canonical composition/timing must remain independent of file-format and provider behavior.
**Decision:** Define a Nightdrive-owned, versioned MIDI intermediate representation over validated 960-PPQ integer composition events. Map it to Standard MIDI File Format 1 only, with division 960, conductor track 0, fixed component tracks/channels, explicit `0x8n` Note Off messages with release velocity 0, deterministic event ordering, and exactly one End-of-Track at tick 30720 on every track. Require independent parsing and binary fixtures for later implementation validation; parsing is test/reference-only in Stage 5A.
**Alternatives:** Let a writer library define canonical event semantics; emit format 0 only; couple canonical state directly to a third-party MIDI object model; defer all boundary decisions to implementation.
**Rationale:** Ownership of the IR preserves deterministic musical semantics while allowing commodity serialization to be evaluated and replaced without changing canonical state.
**Consequences:** Semantic and byte-level determinism are separate acceptance claims. The completed dependency spike selected `midi-file` `1.2.4` only behind the Stage 5B2a adapter; Nightdrive retains ownership of the IR, mapping, ordering, and validation. Stage 5B2b supplies independent test/reference and round-trip evidence without a production parser; FL Studio import, production parsing, and delivery remain separately gated human/implementation compatibility work.
**Revisit:** Reconsider only if the implementation/dependency spike or cross-runtime/FL Studio evidence demonstrates that the frozen IR, format-1 boundary, or adapter cannot satisfy deterministic interchange without an explicitly reviewed contract change.
