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
**Status:** Accepted; the Stage 3B2c1 contract definition and Stage 3B2c2 deterministic PRNG primitive are merged. Musical-policy helpers, streams/forks, and generator-specific seed integration remain separately gated.

**Context:** Future randomized music generation requires reproducible, versioned randomness across supported JavaScript runtimes.
**Decision:** Use an in-repository Mulberry32 uint32 transition identified as `nightdrive.prng.mulberry32.v1`. Accept only canonical uint32 seeds (`0..4,294,967,295`), including zero, with no coercion. Keep the PRNG independent of musical policy, ambient randomness, and security-sensitive randomness.
**Alternatives:** ambient/`Math.random()` randomness; another deterministic PRNG; dependency-backed PRNG.

**Rationale:** Mulberry32 is small enough for auditable in-repository implementation, uses explicit integer arithmetic with portable JavaScript semantics, and is adequate for bounded deterministic generation decisions without claiming cryptographic security. Versioning prevents silent sequence drift.

**Consequences:** Future replay records retain seed and selected PRNG/generator/profile/schema versions with normalized inputs. Bounded-choice helpers and independent stream/fork mechanics require later contracts; transient state and derived random values are not canonical composition state.
**Revisit:** Reconsider only if implementation or cross-runtime evidence demonstrates that the frozen algorithm cannot satisfy the deterministic replay contract.

## ADR-011 — Browser audition is a derived preview

**Date:** 2026-09-09
**Status:** CANDIDATE — bounded Milestone 1 decision. This exact decision becomes Accepted only after consequential independent exact-head review PASS, explicit Product Owner acceptance of the reviewed tuple, and protected integration. Until then, the previously integrated Provisional decision remains binding; this candidate is not implementation authority.

**Context:** Users need immediate feedback but browsers and devices do not reproduce production synths or clocks exactly.
**Decision:** Upon that acceptance and integration, native Web Audio is the accepted mechanism for bounded Milestone 1 internal foreground audition. AudioContext time owns audition scheduling; ticks remain canonical and audio seconds are derived. The [Milestone 1 transport specification](reviews/M1_BROWSER_AUDITION_TRANSPORT_SPECIFICATION.md) governs exact Play/Stop/Loop, voice and role-isolation behavior. Preserve ADR-026: canonical generation and verification remain at the pinned Node boundary, and the browser consumes only the existing derived preview. This decision does not establish broad browser/mobile/background qualification or production sound design.
**Alternatives:** rendered server audio; embedded production synth; no preview.
**Rationale:** Low-latency preview supports composition without pretending to be final sound design.
**Consequences:** Resume policies, latency/drift, tab suspension, mobile limits, and accessibility require testing.
**Revisit:** Milestone 1 formative measurements or later Stage 9 qualification measurements fail the applicable synchronization/timing requirements. Preserve the specification's real-browser measurement gate; do not infer broad qualification from internal audition.

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
**Status:** Accepted for the Stage 5A boundary and dependency-spike definition; Stage 5B1 IR, Stage 5B2a isolated serializer-adapter implementation, Stage 5B2b independent parser/reference evidence, Stage 5C1 controlled FL Studio interoperability acceptance, and Stage 5D1 browser-delivery adapter are merged. Production parser/round-trip, broader FL Studio compatibility, and later delivery remain separately gated.

**Context:** Standard MIDI is the planned FL Studio interchange, but canonical composition/timing must remain independent of file-format and provider behavior.
**Decision:** Define a Nightdrive-owned, versioned MIDI intermediate representation over validated 960-PPQ integer composition events. Map it to Standard MIDI File Format 1 only, with division 960, conductor track 0, fixed component tracks/channels, explicit `0x8n` Note Off messages with release velocity 0, deterministic event ordering, and exactly one End-of-Track at tick 30720 on every track. Require independent parsing and binary fixtures for later implementation validation; parsing is test/reference-only in Stage 5A.
**Alternatives:** Let a writer library define canonical event semantics; emit format 0 only; couple canonical state directly to a third-party MIDI object model; defer all boundary decisions to implementation.
**Rationale:** Ownership of the IR preserves deterministic musical semantics while allowing commodity serialization to be evaluated and replaced without changing canonical state.
**Consequences:** Semantic and byte-level determinism are separate acceptance claims. The completed dependency spike selected `midi-file` `1.2.4` only behind the Stage 5B2a adapter; Nightdrive retains ownership of the IR, mapping, ordering, and validation. Stage 5B2b supplies independent test/reference and round-trip evidence without a production parser; FL Studio import evidence is accepted only for the declared tested environment, while broader FL Studio compatibility, production parsing, and later delivery remain separately gated human/implementation compatibility work.
**Revisit:** Reconsider only if the implementation/dependency spike or cross-runtime/FL Studio evidence demonstrates that the frozen IR, format-1 boundary, or adapter cannot satisfy deterministic interchange without an explicitly reviewed contract change.

## ADR-018 — Component-isolated deterministic generator policy

**Date:** 2026-09-14
**Status:** Accepted for the Stage 7C documentation-only architectural boundary. Stage 7C1 mask, Stage 7C2 weighted-choice, and Stage 7C3 component-seed derivation contracts are accepted and merged; Stage 7C3 was merged through PR #75 at approved head `81b3c878daed262e18a50a2a539235c7bbc7e772` with merge commit `ec90258658a789d186f297cbc7041983bbbbea8a`. Runtime implementation remains separately gated.

**Context:** Seeded component policy must be replayable without coupling Arpeggiator output to random decisions made by Harmony, Bass, motif, or later generators. Random event projection would obscure musical ownership, while one mutable composition-wide stream would make a component's output depend on unrelated consumption order.
**Decision:** Separate deterministic policy resolution from canonical event projection. Derive one uint32 seed for each stable named musical component from the canonical root seed through a versioned, pure component-seed contract; do not share one mutable composition-wide PRNG stream or create per-parameter seed trees in V1. The Arpeggiator policy uses one `nightdrive.prng.mulberry32.v1` stream and a versioned decision-slot order to resolve bounded structured choices before event projection. Harmony remains authoritative for progression and selected voicing. Root seed and replay-relevant versions remain aggregate generation provenance; component seeds, PRNG state, random outputs, temporary candidate/weight calculations, and policy-resolution intermediates are derived state and do not enter `ArpEvent`.
**Alternatives:** One mutable PRNG stream for the complete composition; direct random note/event projection; independent seed derivation for every parameter; persisted seed/provenance fields on component events; dependency-backed seed derivation.
**Rationale:** Stable component isolation prevents unrelated generators from perturbing Arpeggiator replay, preserves deterministic musical ownership, and keeps the event boundary small. The derivation mechanism is replay infrastructure, so its exact behavior must be Nightdrive-owned, versioned, auditable, and proven with cross-runtime vectors before implementation.
**Consequences:** Stage 7C3 accepts the identifier `nightdrive.seed-derivation.component.v1` and an exact dependency-free MurmurHash3 x86_32 derivation over a domain-separated canonical byte layout, with normative cross-runtime vectors in the Arpeggiator model. Runtime implementation remains separately gated. Arpeggiator policy order and profile data receive independent versions; changing any replay-relevant boundary requires a new appropriate version. No new dependency is warranted for this small non-cryptographic mechanism.
**Revisit:** Reconsider component isolation only if deterministic integration evidence shows it cannot preserve replay or locked-component independence; reconsider the derivation algorithm only if exact-vector or cross-runtime evidence reveals ambiguity or mismatch, using an appropriate new version rather than silently changing accepted behavior.

## ADR-019 — Explicit Stage 7 Arpeggiator successor compatibility

**Date:** 2026-09-17
**Status:** Accepted
**Checkpoint:** Successor compatibility documentation accepted and merged through PR #109 (merge commit `590075f45a4d5e03480b1d8c3a076d1119cb03e9`); the exact R1 dataset is accepted for dataset-only use as `nightdrive.genre-profile.arpeggiator.v2` at fingerprint `b6f7ee16f33cf649ae2c6f06e4b5eecf859409b1917e2bc641323857fc1956e8`. Its numerical source of truth and research qualifications remain in [the calibration record](reviews/STAGE7_ARPEGGIATOR_V2_CALIBRATION.md).

**Context:** The exploratory Stage 7 baseline found all 28 individual fixtures usable and no runtime defect, but Energy and especially Complexity control remain REVISE/open. Exact output collisions impair intent differentiation. A 256-seed diagnostic and bounded in-memory data-only investigation showed that the existing five-slot selection algorithm can materially improve separation; neither a new selection algorithm nor changed projection is justified by that evidence. The public V1 contract nevertheless accepts only the exact `nightdrive.arpeggiator-policy.v1` and `nightdrive.genre-profile.arpeggiator.v1` pair. Silently accepting new profile data under policy V1 would change its frozen compatibility meaning.
**Decision:** Reserve a new immutable profile-data identity, `nightdrive.genre-profile.arpeggiator.v2`, paired only with a new policy/compatibility identity, `nightdrive.arpeggiator-policy.v2`. The new policy identity records explicit compatibility and lineage, not a behavioral change to the five-slot selection algorithm. Preserve the complete V1 pair and public V1 operation unchanged. The first successor keeps the same candidate subsets and declaration orders, shared domains, five ordered draws, component-seed derivation, Mulberry32, weighted-choice arithmetic, gate lookup, density-mask catalog, projector, Harmony ownership, and `ArpEvent`; only profile-owned base weights and Energy/Complexity vectors may change. A distinct, separately contracted public V2 boundary must route the exact V2 pair; neither pair has fallback or implicit migration.
**Alternatives:** Mutate V1 tables or broaden policy V1 compatibility; use new policy selection/projector semantics; defer version identity until implementation.
**Rationale:** Explicit new identities allow evidence-based recalibration without reinterpreting historical V1 generations or attributing a new algorithm to what is only a compatibility change.
**Consequences:** V1 requests, plans, events, and evaluation artifacts remain replayable under their original identities. V2 has an accepted frozen calibration dataset and exact public validation/error contract, but still needs reproducible deterministic diagnostics, deterministic fixtures, version-routing implementation, and comparative human evidence. Internal algorithmic machinery may be reused, but compatibility must remain explicit; the additional versioning and test burden is accepted for replay safety. Aggregate provenance remains owned by the enclosing generator.
**Non-decisions:** This ADR freezes no V2 weights, does not authorize V2 implementation or human evaluation, does not change candidate subsets/order or domains, add slots or musical dimensions, change PRNG/selector/projector behavior, or authorize Stage 8.
**Revisit:** Reconsider selection semantics only if separately reviewed calibration and comparative evidence shows the unchanged algorithm cannot provide useful intent control; any later subset/order change requires its own contract decision.

## ADR-020 — Stage 7 V2 public request extras and operation-local version support

**Date:** 2026-09-17
**Status:** Accepted; the complete V2 public contract is accepted and merged through PR #111 at approved head `f505dc7c14dc83b50c800986d883f7fe5d5da704` with merge commit `b3a42464ea44450bb017a1c65dd316d0d069c191`.

**Context:** [ADR-019](DECISIONS.md) requires a separate V2 operation and exact V2 profile/policy pair without changing V1 replay. Its boundary did not settle whether additional request properties are rejected or how a version accepted by V1 fails at the V2 operation. Those choices change externally observable validation and error precedence.
**Decision:** The V2 operation validates and consumes only documented fields of the top-level request and its `intent`, `profile`, `policy`, `seedDerivation`, and `prng` wrappers. Additional properties on those six objects are ignored: they neither reject the request nor influence generation, routing, error precedence, internal choices, or the exact result. They cannot replace missing required fields. This does not set a recursive unknown-property policy for Harmony, range, internal configuration, HTTP, AI, or persistence. Separately, the V2 operation individually supports only `nightdrive.genre-profile.arpeggiator.v2` at `profile.version` and `nightdrive.arpeggiator-policy.v2` at `policy.version`. It checks profile support before policy support. A V1 identity is unsupported at the corresponding V2 field even though V1 accepts it. The compatible-pair check follows both support checks; with exactly one supported identity at each field and that pair declared compatible, no caller-supplied initial V2 pair reaches `INCOMPATIBLE_ARP_PROFILE_POLICY`. Retain that code and stage for the meaning “both versions individually supported, pair undeclared.” Seed derivation V1 and Mulberry32 V1 remain the required separate version identities.
**Alternatives:** Reject extras with a new unknown-property error and precedence stage; consume extras as policy overrides; treat V1 identities as supported by V2 and reject mixed pairs at compatibility; dispatch automatically between operations.
**Rationale:** The approved behavior keeps the public request minimal, makes operation-local support explicit, and prevents a V2 call from reinterpreting or migrating a V1 request. It leaves canonical Harmony/range and versioned configuration validation with their existing owners.
**Consequences:** Later V2 tests must prove extra-property invariance, missing-field failures, the four V1/V2 version combinations and exact first failures, and V1 replay isolation. The full request/result/error contract is owned by the [Arpeggiator model](ARPEGGIATOR_MODEL.md) and is accepted and merged through PR #111. This ADR does not authorize runtime implementation or change ADR-019 or the V1 operation.
**Revisit:** A future explicit public-boundary/versioning decision may change extra-property or operation-local support policy; it must version any replay-relevant or error-precedence change and preserve historical V1 meaning.

## ADR-021 — Retain profile-data ownership for the Stage 7 intent comparison

**Date:** 2026-09-19
**Status:** Accepted; SPECIFY investigation accepted and merged through PR #133 at approved head `a6bd1622cb18fe49cbf217895cc02584168b2d1b` with merge commit `728fb4915a6f5d076d1f897680209977524e37af`. This does not authorize tuning, protocol execution, listening, or implementation.

**Context and evidence:** At base `ad627ad436df80ed711069f310ef4d3674888075`, public V2 runtime is accepted through PR #131. The [locked baseline results](reviews/STAGE7_ARPEGGIATOR_EVALUATION_RESULTS.md), [R1 evidence](reviews/STAGE7_ARPEGGIATOR_V2_CALIBRATION.md), accepted diagnostic `src/evaluation/stage7-r1-diagnostics.test.ts`, and current profile/shared configuration, resolver, and public generator provide the evidence below. Numerical results are retained accepted evidence, not a newly executed search or listening study. Historical runtime-unimplemented wording in earlier checkpoints does not override Git or the current coordination snapshot.

**Decision:** Retain Option A: profile-owned immutable data under unchanged selection semantics, reaffirming ADR-019. Existing evidence makes useful intent control through that representation plausible; it does not prove musical adequacy. The immediate candidate is the already accepted, implemented, unchanged R1/V2 dataset, not another tuning round. The next separately authorized task is matched V1/R1 comparison design under the existing evaluation contracts. Option B is not justified by the available evidence. No new musical meaning, policy algorithm, candidate, weight, version string, or acceptance score is introduced.

### Intent meaning and current ownership

The [composition engine](COMPOSITION_ENGINE.md#normalized-composition-intent-energy-and-complexity) owns Energy as intended musical intensity/activity and Complexity as intended structural/musical intricacy and policy variety, explicitly not note count. Both are independent ordinal five-level inputs; all 25 pairs remain valid. Their meanings do not impose numerical spacing or per-seed monotonicity. The [baseline protocol](reviews/STAGE7_ARPEGGIATOR_EVALUATION_PROTOCOL.md) asks for increasing perceived activity/intensity and increasing coherent intricacy/variation, respectively. These accepted tendency semantics are sufficient to choose a conservative ownership direction; they are not a total ordering of directions, masks, pitch spans, or musical quality.

The following matrix describes varying input influence in the literal tables, not a requirement that every input change select a different output. DS = Dark Synthwave, CS = Classic Synthwave, DW = Darkwave, MC = Midtempo Cyberpunk. Fixed Energy rows still contribute weights where Energy itself has no varying influence.

| Slot | Energy influence | Complexity influence, V1 -> R1 | Bounds and interaction |
|---|---|---|---|
| rate | All four profiles | None -> none | Two rates per profile; DW quarter/eighth, others eighth/sixteenth. |
| octave-range | CS only | DS/DW/MC -> all four | Only 1 or 2; R1 CS now has both axes influencing this slot. Range filtering can reduce audible register differences. |
| direction | None | All four -> all four | Profile-specific three/four traversal choices, not an accepted scalar intricacy scale. |
| mask | All four | DW/MC -> DW/MC | DS/CS three-of-four/full; DW one-of-four/two alternating phases; MC three-of-four/two alternating phases. Both axes influence DW/MC. |
| gate | DS/CS/DW; MC fixed | None -> none | DS/CS short/medium, DW medium/long, MC short only. Resolved duration also depends on selected rate. |

For each candidate, `w_i(e,c) = E_i(e) + C_i(c)`. Raw mixed differences are zero: `w_i(e2,c2) - w_i(e2,c1) - w_i(e1,c2) + w_i(e1,c1) = 0`. Thus data alone cannot express arbitrary conditional Energy-by-Complexity rules. Nevertheless selection depends on the complete vector and total: additions may reinforce or dilute tendencies, and masks can trade density against phase. Orthogonal inputs do not promise independent audible effects. These are consequences of accepted arithmetic, not a new metric or requirement.

The selector uses `u % sum(w)` and cumulative intervals. Changing totals can remap the same draw non-monotonically: for accepted DS rate vectors, supplied uint32 `17` selects sixteenth from very-low `[5,1]` (`17 % 6 = 5`) but eighth from medium `[3,5]` (`17 % 8 = 1`). This arithmetic example is not an observed root-seed fixture. It explains why rising weight tendencies do not guarantee a rising outcome for every seed. Zero collisions or universal monotonicity would be new requirements.

### Energy diagnosis

All 28 individual baseline fixtures were usable without identified timing, traversal, register, masking, repetition, or general-usability defects; seed relatedness passed. Energy was counterintuitive in DS, CS, and MC, but clearly positive in DW. The inspected path's 500 lists, five draws, projection, and baseline MIDI conformed. The evidence therefore points to calibration and sampled policy outcomes rather than a demonstrated implementation defect.

DS seed-zero endpoint equality and 119/256 medium/very-high collisions, CS seed-zero inversion and 91/256 medium/very-high collisions, and MC seed-zero very-low/medium equality and 32/256 very-low/medium collisions limit directional control in those panels. They do not isolate a single causal weight or prove inadequate domains. DW offers slower rates and sparser masks, with Energy acting on rate/mask/gate rather than register. That is a plausible explanation for its positive control, not causal proof: profile contexts and combined choices differ. R1 preserves every DW Energy list at medium Complexity, so this control is not sacrificed to claim a new gain.

Energy can already change rate, density and articulation within bounded domains. Coupling with Complexity is confined to the shared slots in the matrix; fixed-context weighted collisions are expected. No evidence establishes a need for additional Energy ownership or wider domains before comparing unchanged R1. The relative perceptual contribution of speed, density, register and gate remains a human question.

### Complexity diagnosis

All four baseline Complexity panels were counterintuitive. V1 CS changes direction only; its very-low/medium, medium/very-high, very-low/very-high and all-three collisions were 119/256, 101/256, 96/256 and 49/256. DS changes octave/direction and has 78/256 endpoint collisions; DW changes octave/direction/mask with 63/256 very-low/medium collisions. MC combines those same three dimensions and had an inverted seed-zero human ranking. These observations make Complexity the priority, but do not demonstrate that additive data cannot express the accepted tendency.

R1 activates CS octave Complexity through data alone and changes off-center octave/direction tables without new slots. It can alter traversal and register tendencies; DW/MC can also change rhythmic phase. It cannot add within-section evolving patterns, new rhythmic vocabulary, arbitrary conditional rules, or independently ordered complexity dimensions. None is currently an accepted requirement. Direction choice, octave span, phase variety and note count are different observations; treating their sum or any one as a musical-complexity score would invent semantics. Finite domains, constant plans and additive interactions are real limits, but no accepted requirement or comparative R1 listening evidence shows that those limits prevent useful coherent intricacy.

### What R1 establishes and leaves open

The accepted diagnostic reproduces MC roots `1024..2047`: Energy plan/event collision tuples `(176,252,122,35) -> (166,158,107,15)`; Complexity plan tuples `(127,60,72,9) -> (33,58,41,2)` and event tuples `(129,73,81,13) -> (39,66,49,4)`. Tuple order is very-low/medium, medium/very-high, very-low/very-high, all-three; the other axis is medium. MC adjacent event collisions fall from `9972/40960` to `4929/40960`, covering both axes, five fixed opposite-axis levels and four neighboring pairs over 1,024 roots. Of these 40 relationships, 28 improve, 3 tie and 9 regress. These are broad MC gains, not an all-profile dominance result.

R1 preserves all 40 individual medium rows, all 20 medium/medium lists and all 25 DW medium-Complexity Energy lists. Equal lists with unchanged seed/selector/projector mechanics preserve those outputs for every root. Candidate subsets/order, slots, five draws, PRNG, selector and projection are unchanged. This is constructive evidence that data can improve separation, including Complexity, without changing the representation.

Remaining qualifications are mandatory: MC root zero still has equal medium/very-high Energy output; CS retains compressed very-low/low Energy and nearly flat intermediate Complexity pitch span; DW endpoint Complexity event collisions regress from 66/1024 to 70/1024. Five historical V1 MC plan distinctions collapse after accepted masking/projection; changing projection to force distinctness is not justified. Baseline medium/medium diversity was DS 43/43, CS 45/45, DW 60/60 and MC 46/44 plans/events, which also refutes universal seed uniqueness. R1 has no comparative human benefit evidence. Previously examined roots `0..2047` are not untouched holdouts; search/finalist/no-retuning chronology remains unreproduced and R1-REV-001 remains PARTIALLY CLOSED.

### Alternatives and version consequences

**A — retained direction:** Freeze existing slots, domains, per-profile candidate subsets/order, five-draw schedule, additive construction, selector, PRNG, seed derivation, gate mappings, masks and projector. A separately authorized future data revision could change only its own explicit Energy-weight/Complexity-addition literals within accepted numeric constraints; it cannot mutate V1 or accepted V2/R1. R1 already supplies the immediate comparison candidate, so no successor identity is needed now. Any later changed dataset requires a new immutable profile-data identity and explicitly contracted compatible policy identity following ADR-019; V2's exact compatibility must not be broadened silently. No final strings or future public boundary are assigned here.

**B — not selected:** Disjoint/primary slot ownership is already partly expressible with constant rows; adopting it universally has no demonstrated advantage. Arbitrary conditional influence, new domains/dimensions or changed draw coupling would be semantic changes. Existing evidence does not establish that any is necessary, so there is no justified smallest concrete semantic patch. If later accepted evidence demonstrates an intended behavior that the representation cannot express, separately specify a new policy-semantics identity and compatible immutable profile data. Draw/seed/PRNG and result/event changes are not automatic consequences; each needs explicit justification. Preserve old replay. An added slot could affect schedule/plan contracts; it is not authorized merely to lower collision counts. No third architecture is warranted.

### Evidence before comparison and questions for humans

The existing [testing strategy](TESTING_STRATEGY.md#stage-7-successor-compatibility-and-accepted-r1-dataset--future-gates) and calibration record continue to own validation. A comparison packet must bind exact source/version/hash identities and supply literal data/500-list checks, compatibility isolation, replay/five-draw evidence, preserved anchors, and reproducible plan/event collision results with denominators, context/range, root sets and all local regressions. For pairwise collision counts use `sum_r 1[output(settingA,r) == output(settingB,r)]`, keeping five-field plan equality separate from ordered three-field event equality. Retain seed-diversity and projection-collapse explanations. Existing accepted evidence may be referenced; no new search, metric threshold or claim of fresh holdout validation is implied.

Machine acceptance remains exact contract conformance and faithful reproduction, not a mandated percentage improvement. Distinctness is not an ordinal musical score. Report any directional observations separately with their meaning and formula; do not promote note count, pitch span or entropy to an accepted Complexity measure. The reviewed evidence supports proceeding to comparison design, not claiming the control problem solved.

Before listening, separately freeze the matched V1/R1 protocol and authorize its artifacts/execution: same Harmony contexts and matched roots, fixed audition setup, preserved locked V1 evidence, blinded/counterbalanced version identity where feasible, all four profiles, intermediate low/medium and medium/high relationships, and explicit coverage of disclosed regressions without root cherry-picking. Root selection, session details and acceptance disposition belong to that task; none is frozen here.

Human comparison must answer whether R1 improves perceived Energy activity/intensity and coherent Complexity intricacy/variation while preserving usability and recognizable seed-related behavior; whether retained collisions, inversions and intermediate plateaus matter to the producer; and whether apparent differences are useful rather than merely audible. Preserve individual explanations, opposite-axis context and the cross-profile Harmony confound. No population claim or final Stage 7 acceptance follows from deterministic gains or a single reviewer.

**Consequences:** Retain existing deterministic ownership and replay contracts. This specification resolves the A/B engineering direction at the available evidence level without claiming musical sufficiency. The next task is a separately authorized matched-comparison SPECIFY task; listening, tuning, aggregate provenance and Stage 8 remain gated. No Product Owner redefinition of intent is needed to retain the accepted tendency semantics. A demand for guaranteed per-seed monotonicity, a new intricacy dimension, or a prescribed density/variety tradeoff would require an explicit Product Owner decision and renewed architecture assessment.

**Revisit:** Apply ADR-019's existing condition: separately reviewed calibration and comparative evidence must show that unchanged semantics cannot provide useful intent control before selecting B. Identify the particular unexpressible intended behavior and its accepted meaning; a residual collision or failed sample alone is insufficient. No dependency, implementation, tuning, new listening or historical-search reconstruction is part of this checkpoint.

## ADR-022 — Stage 7 supplied-Harmony aggregate and Node acceptance boundary

**Date:** 2026-09-19
**Status:** Product Owner ownership/environment decisions and exact aggregate specification accepted and merged through PR #143; canonical foundation accepted and merged through PR #144. Runtime implementation remains separately authorized.

**Context:** AC-004 requires canonical aggregate bytes and replay provenance beyond the accepted transient Arpeggiator `{ plan, events }` result. Existing architecture assigns aggregates to `composition` and orchestration to `generators`; Harmony's runtime realization also contains explicitly non-canonical explanatory metadata. The earlier specification stopped rather than selecting Harmony generation ownership or browser acceptance scope without authority.
**Decision:** The Product Owner selects supplied validated, already selected Harmony context plus generated Arpeggiator. The enclosing operation must not invoke, rerun or own Harmony generation. Retain only the minimal Harmony identity/state required for replay, compatibility and hashes, using existing primitive semantics rather than making the entire realization canonical. Initial Stage 7 AC-004 acceptance is bounded to the repository's supported pinned Node runtime. Canonical types, values, bytes and hash semantics remain environment-neutral; commodity UTF-8/SHA-256 facilities may sit behind a deterministic adapter. Before any future browser environment originates trusted canonical results, it must independently match accepted Node serialization/hash golden vectors. Browser audition/playback grants no canonical-generation authority.
**Alternatives:** Generate Harmony and dependent components together; serialize all realization metadata; require browser generation/equality for current Stage 7 exit. These were not selected. A future Harmony-generating operation or browser-originating canonical boundary requires separate authorization.
**Rationale:** Preserve upstream Harmony authority and the bounded Stage 7 gap without pulling in a broader composition generator or browser implementation. Explicit environment qualification avoids both a premature browser blocker and an unsupported cross-runtime claim.
**Consequences:** The exact accepted request/result, canonical encoding, hashes, root lineage and error contract lives only in [Composition engine](COMPOSITION_ENGINE.md#stage-7-aggregate-generation-contract), with evidence in [Testing strategy](TESTING_STRATEGY.md#stage-7-aggregate-ac-004-evidence-contract). V1/V2 musical behavior and public domain results remain unchanged. No runtime, persistence, Stage 11 variation, additional listening or Stage 8 is authorized. PR #142's bounded R1 acceptance exception remains effective; AC-004 is not satisfied by this specification alone.
**Revisit:** Separately authorized non-root lineage, broader component generation, schema evolution, or browser canonical generation requires review of the affected representation/version and evidence boundaries without reinterpreting historical records.

## ADR-023 — First Playable canonical Harmony+Bass+Arpeggiator composition boundary

**Date:** 2026-09-21

**Status:** Product Owner architecture decision accepted; runtime implementation remains separately authorized.

**Context:** The accepted Stage 7 aggregate is intentionally limited to supplied selected Harmony plus generated Arpeggiator. It neither realizes Harmony nor contains Bass. The Product Owner's First Playable assessment established that the smallest next deterministic musical integration is one local eight-bar Harmony, Bass, and Arpeggiator section, but the assessment did not make the broader result canonicality decision.

**Decision:** The First Playable boundary is a new, separately versioned canonical Harmony+Bass+Arpeggiator composition result. `composition` owns its value, projections, validation, canonical serialization, and hashes; `generators` owns one coordinator that validates its request, realizes Harmony exactly once, derives Bass and the accepted public V2 Arpeggiator result from that same realization, and constructs the value. The coordinator is a direct module consumed later by an application adapter, not a music-domain barrel API or an application/UI service. Existing Harmony, Bass, and Arpeggiator algorithms remain their own owners. Browser preview and audio are derived, noncanonical consumers.

**Alternatives:** Extend or reinterpret `generateStage7ArpeggiatorAggregateV1`; use a noncanonical H+B+A envelope; make audio/browser state canonical; create a new integration layer. These are not selected.

**Rationale:** A versioned whole-section record is necessary for deterministic replay, future derived preview/MIDI consumers, and durable component identity without turning the bounded Stage 7 aggregate into a general composition generator. Reusing the established composition/generator split preserves dependency direction and avoids duplicated musical semantics.

**Consequences:** The exact First Playable request/result, serialization, hash, replay, failure, and test contract lives in [Composition engine](COMPOSITION_ENGINE.md#first-playable-canonical-composition-contract). It reuses the Stage 7 UTF-8/SHA-256 adapter and projection conventions where their inputs are identical, but has distinct schema identities and does not change Stage 7 bytes, hashes, result validation, replay, or AC-004 acceptance. A separate pinned-Node evidence gate qualifies the new canonical result before it can claim byte/hash evidence; browser canonical generation remains unauthorized. No runtime, UI, audio, persistence, Stage 8, Stage 9, or dependency adoption is authorized by this ADR.

**Revisit:** New components, non-root lineage, editing/locking, persistence, raw brief/UI normalization, browser-originating canonical results, or a schema/version evolution require separately authorized contract review.

## ADR-024 — First Playable evidence byte identity and cross-platform custody

**Date:** 2026-09-22
**Status:** Product Owner policy decision accepted and published/merged through PR #185. Corrective implementation and evidence acceptance remain separate gates.

**Context:** The accepted First Playable source manifest records raw bytes from a Windows capture checkout, including CRLF bytes for tracked files whose Git blobs contain LF. The candidate reference inventory also includes a Windows ARM64 installed binary. Requiring a Linux checkout or installation to match those host-specific bytes conflates portable source identity, evidence of what executed, and artifact custody. The First Playable oracle remains a candidate; Stage 7 acceptance is unaffected.

**Decision:** For First Playable evidence, identify each tracked repository source/tool file by its repository-relative path and exact raw Git blob bytes at an explicitly recorded immutable commit. Record the blob byte length and SHA-256 in ordinal path order; a Git object ID is separate and cannot replace that SHA-256. Never substitute a moving branch, current `HEAD`, or current checkout for the recorded commit. Retain the clean reviewed-commit and capture requirements. Record capture-host and verification-host working-tree bytes as separate execution/environment evidence when applicable; they need not be equal across platforms and cannot silently replace portable blob identity. An apparent checkout transformation must be explained and verified against the recorded Git source and applicable checkout behavior; arbitrary or unexplained differences fail custody. Do not rewrite a checkout to satisfy an older inventory expectation. Git identity alone does not prove which files actually executed.

Generated evidence artifacts, including source records, manifests, oracle files, and recomputation reports, retain exact raw-byte custody even when committed to Git. Their existing UTF-8, BOM, line-ending, terminal-newline, and no-repair requirements still apply. Platform-specific installed packages, binaries, runtime executables, and similar tools instead require applicable package/runtime/platform identity and actual-tool evidence for each claimed environment. A required missing or mismatched tool makes that environment's evidence incomplete; a Windows ARM64 executable is not required or reported as verified on Linux. The pinned Node/npm and locked-dependency requirements remain. Canonical First Playable values, ordering, serialization, UTF-8 bytes and lengths, component hashes, `resultHash`, final bytes, and zero-tolerance Windows/Linux comparisons are unchanged and are separate from provenance claims.

**Alternatives:** Treat capture-host checkout bytes as a portable tracked-file identity; normalize the Linux checkout to match Windows CRLF; use a moving ref or Git object ID in place of raw-blob SHA-256; waive artifact custody when artifacts are committed; or skip all installed-tool verification on another platform. None is selected.

**Rationale:** Immutable Git blobs provide a portable identity for tracked sources without pretending that platform checkout bytes are equal. Separate execution and toolchain records preserve what actually ran. Exact artifact custody and canonical-output equality continue to detect changed evidence or results without repairing a failed hash.

**Consequences:** Historical CRLF-based source-manifest entries remain preserved evidence of the Windows capture; they are not relabeled as Git-blob hashes. The accepted/frozen source manifest needs a reviewed inventory correction and explicit Product Owner re-acceptance/re-freeze before it can satisfy this revised contract. The twelve source records, their musical values, and the candidate oracle's twelve canonical vector contents are preserved. The candidate reference manifest must align its tracked-file identity and separate platform-installed tooling; the oracle must update its manifest bindings and therefore its envelope/file identity. Renew independent byte-length/digest recomputation, inspect a fresh exact-head candidate, and keep publication, oracle acceptance/freeze, and pinned Windows/Linux qualification separate. A changed manifest or oracle envelope digest does not by itself change component hashes or canonical `resultHash` values. Preserve earlier evidence through the existing Git lifecycle; do not automatically rebaseline or overwrite it. This decision neither resolves repository-wide MIA-003 nor revises Stage 7 acceptance, production algorithms, or browser/playback/UI/Stage 8/9 authority. The detailed verification method remains in [Testing strategy](TESTING_STRATEGY.md#first-playable-independent-reference-vector-method).

**Revisit:** Reconsider only with separately reviewed evidence that this First Playable provenance model fails to identify committed sources, actual execution inputs, platform tools, or exact artifacts; any change to canonical output or broader repository formatting policy requires its own authorization.

## ADR-025 — Stage 8 deterministic Motif ownership and V1 policy boundary

**Date:** 2026-09-25

**Status:** Accepted and integrated through PR #217 after consequential exact-head review. Bounded runtime implementation under the settled contract is eligible.

**Context:** First Playable Harmony+Bass+Arpeggiator representation/replay qualification is complete. Stage 8 is the Product Owner-selected next milestone, but lead generation requires explicit motif identity, phrase development, Harmony interaction, deterministic policy, canonical representation, and evaluation boundaries. Literal MIDI repetition conflicts with phrase-local chord targets when Harmony changes.

**Decision:** Define one shared deterministic V1 Motif algorithm with immutable profile-owned candidate orders and weights. It consumes supplied four-slot Harmony, one component-isolated `motif` seed, and exactly four PRNG outputs for rhythm, register, tension, and Phrase-4 displacement. Motif identity is fixed rhythm form plus signed diatonic contour. Phrase 2 is `motif-form-repetition`: form is exact while concrete pitches re-anchor to authoritative Harmony. Phrase 3 is harmony-aware transposition. Phrase 4 retains contour direction and magnitude and gains response character only from its Harmony anchor and optional displacement. Canonical plan/events and provenance use separately versioned Motif identities. The exact contract and data live in [Stage 8 melody and motif model](MOTIF_MODEL.md) and [Genre profile model](GENRE_PROFILE_MODEL.md#stage-8-v1-motif-profile-policy).

**Alternatives:** Literal pitch repetition; per-profile algorithms; a fifth contour-selection draw; caller-authored contours; inversion/retrograde/augmentation/diminution; chromatic transformation; LLM-authored notes; immediate First Playable schema extension. None is selected.

**Rationale:** The selected boundary preserves Harmony authority, deterministic replay, component-seed isolation, inspectable motif identity, and the accepted four-draw policy while allowing phrase-local chord targets across changing Harmony. Shared mechanics plus versioned profile data keep subjective hypotheses reviewable and replaceable without rewriting history.

**Consequences:** Stage 8 V1 uses the accepted fixed contours, rhythms, ranges, leap/recovery constants, phrase roles, catalogs, candidate orders, and weights exactly as written. Evaluation assesses V1 unchanged; weaknesses motivate a new version. Bounded faithful production implementation may proceed through the settled-contract dedicated-reviewer path. No dependency, First Playable mutation, browser/audio/UI work, Stage 9 work, persistence, or frozen-evidence change is authorized by this ADR.

**Revisit:** Revisit only with structured musical or deterministic evidence identifying a V1 weakness. Preserve V1 replay and specify a new compatible policy/profile/contour identity before changing accepted behavior.

## ADR-026 — Product-first milestones and complete-section audition path

**Date:** 2026-09-30

**Status:** Binding at protected integration after consequential external exact-head PASS and explicit Product Owner acceptance of this exact tuple.

**Context:** The accepted deterministic engine already supports Harmony, Bass, Arpeggiator, and Motif V1, while the producer-facing application remains limited. The Product Owner selected a shorter product-value sequence and explicitly separated internal development confidence from formal release qualification. This decision records the exact Product Owner direction without changing the accepted First Playable or Motif contracts.

**Decision:** Use the seven product milestones and the separate Release Qualification gate in the [roadmap](ROADMAP.md): Audible complete section; Inspect and edit; Locks and useful variations; Save and return; Practical FL Studio handoff; Bounded AI intent; Producer Coach and synth guidance. Milestone 1 is next. The product-value test is what new producer capability each milestone delivers; internal engineering and evidence tasks are not separate product milestones.

Milestone 1 specifies a separately versioned complete-section H+B+A+Lead result/coordinator. One validated request establishes one authoritative Harmony realization, passed unchanged to Harmony-dependent Bass, Arpeggiator, and Motif generation. Preserve component-isolated seed derivation/replay, existing First Playable V1 behavior/API, and Motif V1 behavior. Do not cast or mutate the First Playable result or redesign component algorithms. Canonical generation initially runs in pinned Node `24.21.0`; a small application adapter exposes validated immutable output to the browser, which previews derived events. This milestone requires no persistence, auth, database, or newly invented authenticated project-generation API. ADR-011 is completed only to the bounded extent needed for safe Play/Stop/Loop preview; use a small Web Audio implementation unless a later Build-vs-Buy check establishes a concrete library advantage.

Development confidence permits internal Node-based development and formative audition when the changed boundary has its accepted contract, appropriate implementation/replay/negative/regression evidence, validation, review, and protected CI. Release Qualification remains mandatory, without reduced criteria, for formal deterministic qualification, supported-platform claims, external beta, release, and formal product-quality claims. S8-QUAL-002/003 remain OPEN and keep their existing definitions/closure criteria; they block those qualification and release claims, not this internal development. S8-QUAL-003 remains downstream of S8-QUAL-002. S8-QUAL-001's existing reviewed closure basis is recorded in [the replacement finding record](reviews/STAGE8_MOTIF_QUALIFICATION_FINDING_REPLACEMENTS.md); that closure is effective only upon protected integration of this exact reviewed and accepted authority tuple. No new reference algorithm, fixture, capture, or coverage work is authorized.

Formative internal listening may precede formal Stage 8 qualification. It is not structured acceptance, supported-platform evidence, or permission for silent V1 tuning. Meaningful weaknesses require a separately versioned successor under accepted authority. Formal structured musical disposition remains required before external beta/release and before claiming Stage 8 musical acceptance.

For the Milestone 1 audition surface, use the bounded functional visual direction in [UX design](UX_DESIGN.md): near-black/charcoal, legible controls, restrained cyan/violet, clear role identity, compact transport, obvious generation/playback state, role isolation, useful empty/loading/error/degraded-audio states, keyboard access, minimal motion, and no competing cyberpunk decoration. This is not final visual-brand or design-system acceptance. The comprehensive visual-reference gate returns before substantial brand refinement or broader UI styling, not before the bounded Milestone 1 surface.

This decision supersedes only the future product ordering and eligibility effects in ADR-025 and prior roadmap/status summaries. It does not change Stage 8 Motif semantics, the closure criteria of S8-QUAL-002/003, any acceptance criterion, Version 1 scope, formal qualification/release requirements, existing security authority, or prior evidence.

**Alternatives:** Keep all product work behind complete Stage 8 qualification; start with broad visual design, persistence, or AI; merge the new Lead into the First Playable V1 schema; or let the browser originate canonical generation. The Product Owner-selected sequence avoids those alternatives while preserving deterministic ownership and release-quality gates.

**Rationale:** The seven milestones prioritize visible producer value while leaving accepted deterministic boundaries and formal claims evidence-governed. A new complete result avoids changing replay identity for First Playable V1 or Motif V1, and one Harmony realization prevents cross-role divergence.

**Consequences:** The product sequence and S8-QUAL-001 closure record take effect together at protected integration under the lifecycle above. This SPECIFY candidate adds no product implementation. The first implementation task is the smallest contract-conformant complete-section result, before browser styling. S8-QUAL-002/003 and the remaining named release evidence return at their qualification gates or earlier only if product work demonstrates a material risk. No new dependency, persistence, auth, AI, deployment, or visual-reference generation is authorized for Milestone 1.

**Revisit:** Revisit ordering only with concrete product evidence or a material technical risk; preserve all historical component behavior and evidence when specifying any successor.

## ADR-027 — M2 canonical editor revisions and one-note pitch commands

**Date:** 2026-10-04

**Status:** CANDIDATE. This exact decision becomes accepted implementation authority only after consequential external exact-head review PASS, explicit Product Owner acceptance of the reviewed tuple, and protected integration. Before those conditions are satisfied, it is not implementation authority; no status-only mutation is required.

**Context:** M2 read-only four-role inspection is integrated. AC-015 requires exact canonical editor revision restoration, and manual edits require command provenance. Existing CompleteSectionPreview is derived/noncanonical; generated complete-section results cannot be modified or revalidated as if a manual edit were generated Motif output. The Product Owner selected D1-D4: Lead-only absolute pitch editing, canonical imported velocity 100, deterministic source/event/parent/command identity, and immutable history cursor navigation.

**Decision:** Introduce a separately versioned editor revision under composition ownership; editor owns command transitions and validated-history selection. Initially verify/import/edit canonical state in pinned Node, preserving ADR-022/023/026 and the existing browser preview boundary. Retain the verified original complete-section result separately. Root import projects all four roles with stable deterministic note IDs and velocity 100. A child binds source, exact parent identity, the one `set-note-pitch` command with expected old value, and complete resulting state. Preserve the global hard Lead range 60..84; intentional manual pitch edits do not claim generated Motif scale/target/register-band/leap/phrase validity. Undo/redo selects existing immutable canonical revisions; it creates no inverse-command revision. A new edit after undo clears the active redo path without mutating prior revision values.

The exact schema, encoding/hash domains, import/command validation, lineage, undo/redo, preview identity, and required evidence are owned by [M2 editor contract](reviews/M2_EDITOR_REVISION_CONTRACT_SPECIFICATION.md). Browser selection/proposal remains application state; it does not create trusted canonical revisions. Original generation schemas, seeds, bytes/hashes, and existing audition gain behavior remain unchanged.

**Alternatives:** Mutate a derived preview or generated result; introduce browser canonical authoring; omit velocity or use implicit import defaults; use random application revision IDs; separate content/lineage digests; create inverse-command revisions on undo. The Product Owner's selected bounded decisions determine the chosen direction. The contract adds no persistence, branch-management UI, framework, dependency, HTTP/API behavior, general editor, or regeneration capability.

**Consequences:** The first eligible implementation after acceptance/integration is the bounded canonical root-import and Lead pitch-command boundary with independent byte/hash and immutable-history evidence; a later application/UI slice exposes correction and audition. Editing runtime and UI remain unauthorized by this SPECIFY execution. Formal AC-015 completion, AC-014 timing and S8-QUAL-002/003 remain separate gates. `composition` and `editor` stay framework-independent; commodity digest facilities remain behind the existing adapter.

**Revisit:** Additional command types/roles, velocity expression, source/schema migration, browser canonical authoring, lineage semantics, locks/regeneration, or persistence require separately bounded authority and compatibility evidence. Preserve historical source/editor identities; never reinterpret existing revisions.

## ADR-028 — M2 Lead note start-tick command

**Date:** 2026-10-04

**Status:** CANDIDATE. This exact decision becomes accepted implementation authority only after consequential external exact-head review PASS, explicit Product Owner acceptance of the reviewed tuple, and protected integration. Before those conditions are satisfied, it is not implementation authority.

**Context:** ADR-027 and the M2 editor contract are integrated for one Lead-only `set-note-pitch` command with immutable revision history. The Product Owner selected a separate bounded SPECIFY task for moving one existing Lead note in time. `CompleteSectionResultV1` requires ordered event starts and section-contained note spans; the editor contract preserves imported note order and stable source-occurrence IDs. Manual edits remain producer-authored editor state rather than regenerated Motif output.

**Decision:** Define one additive `set-note-start-tick` command in the separately versioned `nightdrive.editor-note-command.v2` envelope. It identifies one existing Lead note by stable ID, includes its expected current `startTick`, and carries an absolute replacement `startTick`. It changes only that note's start tick. Keep `nightdrive.editor-note-command.v1`, `set-note-pitch`, the `nightdrive.editor-revision.v1` record shape, existing revision hash-input domain, source binding, root import, and historical bytes unchanged. A v1 editor revision may bind either accepted versioned command; the revision hash commits the exact nested command schema and payload.

Preserve canonical import order and the existing nondecreasing Lead start-tick ordering required by the complete-section result boundary. The moved note must remain within `[0, 30720)`, its unchanged positive duration must still end by tick `30720`, and its start must remain between its immediate predecessor and successor start ticks (inclusive). Do not reorder events. Do not add a no-overlap rule: the accepted complete-section boundary validates per-note section containment and ordered starts, and permits overlapping spans. Manual timing edits need not preserve Motif-generated onset templates, phrase-relative rhythm, or generator policy. No implicit grid snap, clamp, timing delta, multi-field edit, or preview-schema change is added.

The existing composition/editor ownership remains: composition owns exact revision validation, canonical encoding, source/ancestry verification and hashes; editor owns the new command transition and existing immutable history cursor. A later pinned-Node application boundary may accept the validated command; browser code may propose it but does not authenticate canonical state. This SPECIFY candidate does not authorize runtime implementation, UI controls, audio changes, persistence, or other editing operations.

**Alternatives:** Extend the v1 command schema in place; bump or migrate the editor revision schema; use a relative tick delta; sort events after edits; reject all overlap; apply Motif phrase/grid restrictions; update `CompleteSectionPreview` with editor identity. The selected nested v2 envelope isolates the new payload while preserving prior v1 command and revision bytes; an absolute target plus expected-old tick is idempotently verifiable against its parent; stable import order preserves existing event identity and projection contracts.

**Consequences:** A future implementation must verify the retained source and complete ancestry before accepting or serializing any revision; verify the expected parent and expected old tick; validate exact command shape, section end, and neighbor start order; change only one Lead `startTick`; and recompute the existing revision-v1 hash over the resulting state and exact v2 command. Undo/redo continues to navigate exact existing revision identities; successful edits after undo truncate only the active redo suffix, while rejected/no-op commands do not alter history. Derive the same existing noncanonical `CompleteSectionPreview` from the selected revision; its `sourceResultHash` remains the original source result hash. AC-015 remains partial, and AC-014, Stage 8 qualification, and release gates do not change.

**Revisit:** Additional event/role commands, snapping, timing automation, note insertion/deletion, overlap policy beyond existing validators, schema migration, persistence, browser canonical authorship, or broader history/branch behavior require separate authority and compatibility evidence.

## ADR-029 — M2 Lead note duration command

**Date:** 2026-10-04

**Status:** CANDIDATE. This exact decision becomes implementation authority only after consequential external exact-head review PASS, explicit Product Owner acceptance of the reviewed tuple, and protected integration. Before those conditions are satisfied, it is not implementation authority.

**Context:** ADR-027 establishes canonical editor revisions and a Lead-only pitch command; ADR-028 adds one Lead-only absolute start-tick command. The Product Owner selected a separate bounded SPECIFY task for changing the absolute duration of one existing Lead note. Existing canonical note rules require positive safe-integer duration and a section-contained end; they preserve event order and do not prohibit overlapping spans.

**Decision:** Define one additive `set-note-duration` command in `nightdrive.editor-note-command.v3`. It targets one stable existing Lead note ID, carries the expected current `durationTicks`, and carries an absolute replacement `durationTicks`. It changes only that duration. Require a positive canonical safe integer and require the resulting note end not to exceed tick 30720. Preserve the target's start tick, identity, velocity, all other note values, every other role, and array order. Do not introduce snapping, neighbor movement, overlap restrictions, repair, regeneration, or Motif-policy validation.

Keep the pitch-v1 and start-tick-v2 command meanings and bytes, `nightdrive.editor-revision.v1`, its hash-input domain, source binding, root import, and existing immutable history semantics unchanged. A revision-v1 child may bind any accepted versioned command; its digest commits the exact nested command and complete resulting state while excluding its own digest. Continue requiring the retained verified source and complete ancestry for canonical verification, serialization, and child creation. Undo/redo navigates exact existing revisions; only a successfully accepted edit from an undone state truncates the active redo suffix. Derive the existing noncanonical preview from the selected revision, retain the original `sourceResultHash`, and use existing audition invalidation behavior.

The exact command envelope, validation, error ordering, deterministic replay, test evidence, and module ownership are specified in [the M2 Lead note duration command specification](reviews/M2_EDITOR_NOTE_DURATION_COMMAND_SPECIFICATION.md). Composition continues to own canonical serialization, source/ancestry validation, and hashes; editor owns the transition/history; the pinned-Node application boundary remains the runtime acceptance boundary; browser data remains a proposal and derived preview. AC-015 remains partial.

**Alternatives:** Extend v1/v2 payloads in place; bump the revision schema/hash domain; use a duration delta; sort notes; add a no-overlap rule; or apply Motif duration policy to manual edits. A v3 command envelope preserves prior command compatibility while reusing the existing revision identity; the expected-old value and absolute replacement bind the edit deterministically to its parent.

**Consequences:** This candidate is SPECIFY-only and does not authorize runtime or UI implementation. After the specification receives its required exact-head review, Product Owner acceptance, and protected integration, a separate bounded implementation task may be selected. No add/delete, velocity editing, snapping, persistence, API, dependency, Stage 8 qualification, AC-014 work, or AC-015 completion is authorized here.

**Revisit:** Any different command set, role, field, overlap rule, snapping, Motif-policy constraint, revision/version/hash change, persistence, browser canonical authorship, or history/branch model requires separate authority and compatibility evidence.

## ADR-030 — M2 one existing Lead note deletion command

**Date:** 2026-10-04

**Status:** CANDIDATE. This exact decision becomes implementation authority only after consequential external exact-head review PASS, explicit Product Owner acceptance of the reviewed tuple, and protected integration. Before those conditions are satisfied, it is not implementation authority.

**Context:** Stage 10 and AC-015 authorize bounded note deletion with exact undo/redo of canonical editor revisions. ADR-027 through ADR-029 establish a verified four-role editor revision, deterministic source-occurrence note IDs, Lead-only single-note commands, immutable history navigation, and a noncanonical preview. No note-deletion command or rule for preserving source-occurrence identity after deletion is defined. Existing validators permit a dense empty event array; no minimum Lead-note count is an accepted invariant.

**Decision:** Specify one additive `delete-note` command in `nightdrive.editor-note-command.v4`. It targets one existing Lead note by its stable source-occurrence ID in the exact verified selected parent. The verified parent identity and complete retained-source ancestry bind the note's exact current value, so the command carries no duplicate expected note fields. The transition removes only that note, preserves the order and canonical values of every remaining note and all other roles, and leaves the Lead track empty when its final note is deleted. The revision schema, hash-input domain, source/root projection, and pitch-v1, start-tick-v2, and duration-v3 command meanings and bytes remain unchanged.

Keep source-occurrence IDs stable: a remaining note retains the ID derived from the original source result, role, and original occurrence ordinal; deletion never renumbers IDs. Authoritative revision verification must establish the root against the retained source and replay every parent/command transition. It must not mistake a note's current array index after deletion for its original source ordinal. A hash-consistent caller-supplied revision alone remains insufficient authority.

Composition continues to own exact revision validation, canonical encoding, retained-source/ancestry verification, and hashes. Editor owns the delete transition and immutable history cursor. Undo/redo selects exact existing revisions; successful deletion from an undone revision truncates only the active redo path, while failed deletion leaves history unchanged. Derive the existing noncanonical `CompleteSectionPreview` from the selected revision, keep the original source result/hash binding, and use existing audition invalidation. The exact command, validation, deterministic replay, identity-preservation evidence, error behavior, and implementation boundary are specified in [the M2 Lead note deletion command specification](reviews/M2_EDITOR_NOTE_DELETE_COMMAND_SPECIFICATION.md).

**Alternatives:** Add a tombstone or deletion ledger to the revision schema; renumber remaining notes; prohibit deleting the final Lead note; bind a duplicate expected-note snapshot into the command; or permit browser code to construct trusted revisions. The selected transition reuses the existing exact parent and ancestry proof, stable source IDs, full resulting revision state, and immutable cursor history without changing the revision format. Existing canonical event-array validation permits an empty track, so this contract adds no minimum-count restriction.

**Consequences:** This SPECIFY candidate authorizes no runtime or UI implementation, note addition, other-role deletion, velocity editing, snapping, persistence, API, dependency, Stage 8 qualification, AC-014 work, or AC-015 completion. After consequential independent review, exact-tuple Product Owner acceptance, and protected integration, a separate bounded implementation task may be selected. AC-015 remains partial.

**Revisit:** Note addition or replacement, deletion on other roles, multi-note operations, non-source note identity, tombstone/history persistence, role minimums, snapping, broader event editing, and schema or hash changes require separate authority and compatibility evidence.

## ADR-032 — Atomic Lead note position command

**Date:** 2026-10-04

**Status:** CANDIDATE. This exact decision may authorize a separate bounded local implementation only after consequential independent exact-head review PASS and explicit Product Owner acceptance of that exact reviewed tuple under ADR-031. It does not accept a descendant or cumulative integration candidate. Protected integration remains at the recorded milestone/sub-milestone boundary. This SPECIFY task authorizes no runtime or UI implementation.

**Context:** ADR-027 through ADR-030 define the verified canonical editor revision and separate Lead-only pitch-v1, start-tick-v2, duration-v3, and delete-v4 commands. A producer drag that changes both pitch and time cannot be represented by applying pitch-v1 and start-tick-v2 sequentially without creating an intermediate canonical revision and two history steps. The Product Owner selected one atomic revision and one Undo/Redo step for a single Lead-note drag.

**Decision:** Add one versioned nightdrive.editor-note-command.v5 command type, set-note-position, targeting one existing Lead note by stable ID. It carries both expected current values (expectedPitch, expectedStartTick) from the verified selected parent and both absolute replacements (pitch, startTick). Validate the full final state atomically, then produce one child nightdrive.editor-revision.v1 revision. Keep existing v1-v4 command schemas, meanings and historical bytes unchanged; retain the revision-v1 schema, canonical hash domain, retained-source and full-ancestry verification, immutable history, original generated source identity, derived preview boundary and audition invalidation.

A command with exactly one unchanged replacement field is valid if the other changes and every invariant passes. A command with both replacements unchanged is one command-level no-op and creates no revision. The exact command schema, final-state invariants, error precedence, replay, history and implementation evidence are defined in [M2 Lead note atomic drag command](reviews/M2_EDITOR_NOTE_DRAG_COMMAND_SPECIFICATION.md).

composition remains the owner of canonical revision state, source/ancestry validation, canonical serialization and hashes. editor owns the command transition and history cursor. The existing pinned-Node boundary remains the validation/application boundary; browser values remain proposals and derived views. This ADR does not define pointer mapping, drag threshold, snapping, keyboard gesture behavior, accessibility interaction, selection policy, or visual design.

**Alternatives:** Apply the existing pitch and start-tick commands in sequence; change v1/v2 command payloads in place; bump the revision schema/hash domain; create an intermediate noncanonical two-axis edit followed by a second canonical command. Sequential commands violate the selected one-revision/one-history-step behavior; in-place mutation breaks compatibility; a revision/hash migration is unnecessary because revision-v1 already binds an exact nested versioned command and complete result.

**Consequences:** Only one existing Lead note's absolute pitch and startTick may change per accepted v5 command. Existing Lead pitch 60..84, section containment, nondecreasing start order, accepted overlap policy, stable ID, unchanged duration/velocity/order/source/other state, and full ancestry verification remain in force. No snapping, repair, Motif-policy reinterpretation, neighbor movement, resize, add/delete, other-role editing, persistence, API, dependency, AC-014 or Stage 8 work is introduced. AC-015 remains partial. A separate eligible IMPLEMENT task is required after this specification receives its exact-head review and Product Owner acceptance.

**Revisit:** Any change to atomicity, accepted fields, Lead-only scope, expected-old checks, overlap/order/section constraints, command/revision/hash versioning, history semantics, or browser gesture policy requires a separate bounded specification and applicable review.

## ADR-033 — M2 Lead-note drag interaction

**Date:** 2026-10-05

**Status:** CANDIDATE. This exact interaction decision may authorize a separate bounded local implementation only after consequential independent exact-head review PASS and explicit Product Owner acceptance of that exact reviewed tuple under ADR-031. It does not accept a descendant or cumulative integration candidate. Protected integration remains at the recorded milestone or sub-milestone boundary. This SPECIFY task authorizes no browser/runtime implementation.

**Context:** ADR-032 and the accepted M2 Lead note atomic drag command define one verified v5 set-note-position command for one Lead note and leave its browser interaction unspecified. Stage 10 / AC-015 requires bounded drag editing and a keyboard-accessible alternative. The current eight-bar four-role timeline is read-only, and the existing Lead controls independently edit pitch and start tick. The Product Owner selected a separate Lead piano roll, free integer-tick movement without beat/bar snapping, direct existing-note targeting, one command on pointer release, a 4 CSS-pixel activation threshold, cancellation without a revision, a paired keyboard pitch/start action, and preservation of the pointer-to-note grab offset.

**Decision:** Specify one bounded desktop-first Lead-note drag interaction in [M2 Lead-note drag interaction](reviews/M2_LEAD_NOTE_DRAG_UI_SPECIFICATION.md). Retain the current four-role timeline unchanged and read-only; add a distinct eight-bar Lead-only piano-roll projection. Directly target an existing note by its stable ID. A pointer gesture becomes a drag at 4 CSS pixels, preserves the grab offset, maps horizontal and vertical pointer deltas to nearest integer ticks and semitone pitches without beat/bar snapping, and sends one absolute set-note-position v5 command only on release. Cancellation discards the proposal and creates no command or revision. A keyboard-accessible alternative selects an existing note, edits labeled pitch and absolute start-tick fields together, and applies once through v5. Existing pitch-v1 and start-tick-v2 controls remain unchanged.

Composition and the existing pinned-Node application boundary retain canonical authority. Pointer selection and proposal state are noncanonical. Successful v5 application, full retained-source/ancestry verification, revision hashing, undo/redo, derived preview, source identity, and audition invalidation retain their existing contracts. Do not add add-note, resize, velocity, transpose, snapping, other-role editing, persistence, API, dependency, AI, formal Stage 8 qualification, AC-014, or AC-015 completion.

**Alternatives:** Make the current four-role timeline editable; use pointer position as an absolute note anchor; snap to beat/bar boundaries; commit on pointer-down or every pointer-move; issue pitch-v1 and start-tick-v2 separately; or omit the paired keyboard path. A distinct Lead piano roll keeps inspection and editing roles clear. Preserving the grabbed offset and committing one v5 command on release honor the selected gesture-level atomicity. Free integer ticks avoid an unaccepted rhythm grid, while the paired native fields provide exact keyboard entry without custom drag keys.

**Consequences:** This is browser-interaction authority only after the stated review and acceptance lifecycle; it does not implement or accept a usable UI. It defines no general visual-brand direction, touch/mobile qualification, add/resize/velocity/transpose/snap capability, note-spelling convention, keyboard shortcuts, persistence, Stage 8 qualification, AC-014, or AC-015 completion. AC-015 remains partial. A separate eligible bounded IMPLEMENT task is required after this exact specification is accepted.

**Revisit:** Any change to target role, separate-view boundary, pointer activation threshold, grab-offset behavior, coordinate mapping or rounding, snapping, command timing/atomicity, cancellation, keyboard alternative, validation boundary, revision/history semantics, preview/audition ownership, or scope requires separate authority and applicable review.
