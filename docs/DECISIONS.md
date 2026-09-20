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
