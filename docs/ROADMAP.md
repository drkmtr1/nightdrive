# Capability-gated roadmap

This roadmap has no calendar promises. Each stage requires explicit authorization, satisfies its exit evidence, and stops before the next stage. A future-capable schema does not authorize future behavior.

## Stage 1 — Documentation and architecture

**Objective:** Freeze Version 1 and establish authoritative product/engineering contracts.
**Capabilities:** Requirements, acceptance, UX/flows, architecture, domain/time/MIDI/generation/profile/recipe models, data/API/AI/security/observability/deployment/testing/evaluation plans, ADRs/risks/rules.
**Dependencies:** Repository and remote inspection; approved brief.
**Non-goals:** Production scaffold, dependencies, Supabase, Vercel, application features.
**Tests/evidence:** Required-file inventory; Markdown/link/Mermaid review; ID/traceability/scope/contradiction audit; clean diff and Git evidence.
**Exit:** All Stage 1 exit criteria in the project brief pass; provisional decisions and assumptions remain clearly labeled.

## Stage 2 — Application foundation

**Objective:** Create the smallest deployable-quality local shell and engineering gates.
**Capabilities:** Strict TypeScript/Next.js decision validation, design tokens/layout shell/empty states, schema/test/lint/type/build tooling, dependency register, CI foundation.
**Dependencies:** Stage 1 audit and explicit authorization.
**Non-goals:** Music generation, persistence, AI, deployment provisioning.
**Tests:** Toolchain, route smoke, component accessibility baseline, production build, CI.
**Exit:** Supported versions/dependencies are documented; local shell and required checks pass.

## Stage 3 — Music theory and time core

**Objective:** Implement framework-independent canonical primitives and serialization.
**Capabilities:** Pitch/interval/scale/key/chord/time types, 960 PPQ arithmetic, canonical schema/hash, fixed PRNG contract.
**Dependencies:** Stage 2 foundation.
**Non-goals:** Progression/pattern generation or UI piano roll.
**Tests:** Unit/property/canonical/cross-runtime fixtures for all supported scales and time bounds.
**Exit:** MUS-001/MIDI-001/NFR-001 foundations pass and APIs are stable enough for generators.

## Stage 4 — Harmony engine

**Objective:** Generate valid progressions and voice-led chord tracks.
**Capabilities:** Initial profile harmony templates, chord construction, inversions, voicing/range/voice-leading, decision records.
**Dependencies:** Stage 3; reviewed initial profile data.
**Non-goals:** Bass/arp/melody, AI selection.
**Tests:** Golden harmony, property/invariant, unsatisfiable constraints, deterministic replay, preliminary human review.
**Exit:** AC-002/003/004 harmony evidence passes for every initial profile.

## Stage 5 — MIDI engine and export

**Objective:** Produce independently valid, deterministic standard MIDI from canonical events.
**Capabilities:** SMF writer/reader validation, conductor/component tracks, stable ordering, initial download.
**Dependencies:** Stage 3; harmony fixtures.
**Non-goals:** Complete production package or `.flp`.
**Tests:** Binary fixtures, independent parser, round trip, malformed cases, FL Studio import spike.
**Exit:** AC-007/008 and an initial AC-009 compatibility record pass.

## Stage 6 — Bass engine

**Objective:** Generate harmonically grounded bass using the bounded archetypes.
**Capabilities:** Six planned archetypes, density/syncopation/movement/root/octave/aggression parameters, provenance.
**Dependencies:** Stages 3–4.
**Non-goals:** Audio synthesis or arbitrary style library.
**Tests:** Harmonic-context, range/grid, archetype, deterministic/golden and musical review.
**Exit:** AC-010 and relevant AC-004/013 evidence pass across profiles.

## Stage 7 — Arpeggiator

**Objective:** Generate profile-appropriate arpeggios from harmony.
**Capabilities:** Rate/direction/range/gate/octave/density and seeded patterns.
**Dependencies:** Stages 3–4.
**Non-goals:** Free-running audio arp or VST automation.
**Tests:** Active-chord derivation, boundary/gate/range, all directions, replay/golden review.
**Exit:** AC-011/004/013 pass.

## Stage 8 — Melody and motif engine

**Objective:** Produce coherent, inspectable lead motifs and variations.
**Capabilities:** Motif identity, phrase/repetition/call-response, target/passing/tension/resolution notes, range/leap constraints.
**Dependencies:** Stages 3–4; profile evaluation baseline.
**Non-goals:** LLM notes, vocal melody, full-song development.
**Tests:** Transformation/constraint/property fixtures, deterministic replay, structured human review.
**Exit:** AC-012/004/013 and agreed human-review disposition pass.

## Stage 9 — Browser audition

**Objective:** Synchronously preview canonical tracks with simple role voices.
**Capabilities:** Play/stop/loop/playhead, mute/solo, user-initiated audio, scheduler/degraded states.
**Dependencies:** Stages 3–8; ADR-011 timing spike.
**Non-goals:** Production synthesis, rendering, mixing/mastering.
**Tests:** Clock/scheduling/drift, tempo/loop, tab suspension, device/browser, accessibility and latency.
**Exit:** AC-014 passes within a measured documented tolerance.

## Stage 10 — Lightweight piano roll

**Objective:** Let users make bounded corrections without recreating a DAW.
**Capabilities:** Select/add/delete/drag/resize/velocity/transpose/snap, undo/redo, keyboard-accessible alternative.
**Dependencies:** Canonical domain/time and audition.
**Non-goals:** Automation lanes, advanced articulation, mobile-first editing.
**Tests:** Command/undo exactness, invalid edits, rendering/performance, keyboard/screen-reader/responsive.
**Exit:** AC-015 and relevant accessibility evidence pass.

## Stage 11 — Locking and variations

**Objective:** Make independent, non-destructive iteration trustworthy.
**Capabilities:** Track locks/hashes, targeted generation, compare/retain parent/child, manual-edit lineage.
**Dependencies:** All four generators and revision model.
**Non-goals:** Branch merging/collaboration.
**Tests:** Lock hash invariants, stale/conflict/error recovery, lineage/replay.
**Exit:** AC-005/006 pass for every target component.

## Stage 12 — Supabase persistence

**Objective:** Persist owned projects, revisions, runs, profiles, recipes, and export records securely.
**Capabilities:** Auth, migrations, repository layer, RLS, save/open/delete/history, optimistic concurrency.
**Dependencies:** ADR-004 validation and Stages 2–11 data contracts.
**Non-goals:** AI and public collaboration.
**Tests:** Migration, constraints, transaction/idempotency, RLS cross-user, deletion/retention, E2E.
**Exit:** AC-016/020/022 persistence evidence passes with no service-role client exposure.

## Stage 13 — AI intent layer

**Objective:** Translate natural language into inspectable bounded parameter proposals.
**Capabilities:** Provider adapter, prompt/schema versions, proposal review/confirm, safe failure, usage/cost telemetry.
**Dependencies:** Deterministic transformations; security/privacy/provider review.
**Non-goals:** Raw note generation, direct mutations, autonomous agent.
**Tests:** Schema/domain, injection/adversarial, grounding, timeout/refusal/cost/rate limit, regression dataset.
**Exit:** AC-017/019/023/024 pass and deterministic flows work without AI.

## Stage 14 — Producer Coach

**Objective:** Offer actionable, evidence-linked advice from structured state.
**Capabilities:** Computed density/range/tension/role/motif/overlap/contrast observations and labeled suggestions.
**Dependencies:** Mature canonical state, AI boundary, evaluation protocol.
**Non-goals:** Claims of objective taste or automatic unconfirmed edits.
**Tests:** Observation correctness, reference grounding, subjective-label, usefulness/safety human review.
**Exit:** AC-018 passes with acceptable evaluation disposition.

## Stage 15 — Synth recipe system

**Objective:** Provide validated structured recipes for supported synths.
**Capabilities:** Profile/version store, recipe validator, role-specific structured recipes and narratives, generic fallback.
**Dependencies:** Verified synth documentation/licensing and coach/AI grounding.
**Non-goals:** Loading/controlling VSTs or exhaustive synth catalog.
**Tests:** Vocabulary/range/capability schema, human reproduction and role-fit review.
**Exit:** AC-021 passes for declared instrument versions.

## Stage 16 — Complete FL Studio MIDI package

**Objective:** Deliver a polished portable handoff.
**Capabilities:** Component and combined MIDI, canonical JSON manifest, production notes, instructions, safe ZIP naming/download/history.
**Dependencies:** MIDI, persistence, explanations/recipes as available.
**Non-goals:** `.flp`, VST state, automatic DAW actions.
**Tests:** Manifest/hash/ZIP security, content, retry/expiry, FL Studio import matrix.
**Exit:** Full AC-009 and FR-013 evidence passes.

## Stage 17 — Evaluation maturity

**Objective:** Establish credible release thresholds and regression history.
**Capabilities:** Versioned golden dataset, automated result reports, structured producer review, performance budgets.
**Dependencies:** Complete workflow and representative outputs.
**Non-goals:** Pretending subjective scores are objective quality.
**Tests:** Dataset integrity, evaluator reproducibility, all deterministic and human protocols.
**Exit:** All profiles covered; thresholds/disagreements/issues documented; AC-028 supported by evidence.

## Stage 18 — Security hardening

**Objective:** Validate production threat controls and operational readiness.
**Capabilities:** Abuse/rate limits, headers/CSP, secret/dependency controls, privacy/retention, incident/restore runbooks, security telemetry.
**Dependencies:** Full architecture and target providers.
**Non-goals:** New product features.
**Tests:** Threat-model cases, auth/RLS, injection, resource abuse, build artifact/secrets, backup/restore, dependency review.
**Exit:** SEC requirements and AC-022/023/024 pass; high-severity findings resolved.

## Stage 19 — UX and accessibility verification

**Objective:** Verify the complete workflow for first-time and assistive-technology users.
**Capabilities:** Refined hierarchy/copy/states/responsiveness/keyboard/AT support based on evidence.
**Dependencies:** Feature-complete workflow.
**Non-goals:** Scope expansion or mobile DAW parity.
**Tests:** Moderated primary-flow usability, keyboard, screen readers, zoom/reflow, contrast, touch targets, reduced motion, device matrix.
**Exit:** AC-001/025/026/027 and UX/A11Y requirements pass or have approved non-release-blocking disposition.

## Stage 20 — Version 1 production release

**Objective:** Release and verify the bounded Version 1 safely.
**Capabilities:** Production configuration/migration/deploy, release record, monitoring, support/runbooks, rollback.
**Dependencies:** All prior release gates, explicit deployment authorization, provider accounts/configuration.
**Non-goals:** Any deferred feature.
**Tests:** Full CI/evaluation/security/UX gates, production smoke, FL Studio artifact check, observability and rollback readiness.
**Exit:** AC-029/030 and all P0 requirements have linked evidence; production is healthy and release is documented.

## Deferred future milestones

Multi-section composition, full-song arrangement, energy curves, advanced production guidance, Reference Rebuild interoperability, additional meters/tempo maps, and deeper official FL Studio integration require new bounded objectives and ADRs.
