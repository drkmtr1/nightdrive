# Architecture

## Implementation status

Stage 2A implements the Next.js web adapter shell and engineering gates. The framework-independent domain now includes musical time, pitch, interval, scale, Key, ChordQuality, Chord, ChordInversion, ChordVoicing, and the versioned PRNG. Bounded Harmony runtime includes the immutable template catalog, profile-constrained hard-valid voicing candidate enumeration, adjacent voice-leading cost, and deterministic candidate selection. Stage 5B1/B2a/B2b provide the owned MIDI IR, isolated serializer, and independent reference evidence; Stage 5C1 provides the controlled fixture/interoperability record; Stage 5D1 provides a browser-only adapter for already-produced MIDI bytes; Stage 6A1/A2 provide the deterministic root-aligned Bass baseline, and Stage 6 straight-rhythm implementation is merged. Full progression generation/optimization, seeded Harmony variation, broader MIDI compatibility, package/export UX, compound and expressive Bass rhythm expansion, arp, melody, AI generation, and persistence remain target architecture and are not implemented. Technology status remains authoritative in [Decisions](DECISIONS.md).

## System shape

Use a TypeScript modular monolith: one Next.js `16.3.4` App Router application with explicit internal domains and server boundaries. The root application is intentionally not a monorepo. A workspace becomes justified only when a real independently consumed package or tooling boundary cannot be enforced in the root project. Supabase provides PostgreSQL and authentication when persistence enters scope; Vercel is the default web host. Deterministic music logic remains framework-independent and runnable in browser/server/tests where equivalent behavior can be guaranteed.

```mermaid
flowchart LR
  U[Producer] --> W[Next.js workstation UI]
  W --> C[Client transport/editor]
  W --> S[Server API boundary]
  C --> M[Deterministic music core]
  S --> M
  S --> A[AI intent/explanation adapter]
  A --> V[Schema validator]
  V --> M
  S --> D[(Supabase Postgres + Auth/RLS)]
  M --> X[MIDI serializer]
  W --> P[Browser preview engine]
  M --> P
  X --> W
```

## Modules

- `music-domain`: immutable typed theory and musical-time primitives.
- `composition`: project/section/track/pattern aggregates and invariants.
- `generators`: harmony, bass, arp, motif engines with versioned inputs and seeds.
- `midi`: canonical-to-SMF conversion, deterministic ordering, validation.
- `preview`: scheduling adapter and simple role-specific voices; canonical state is never derived from audio timing.
- `editor`: commands, validation, undo/redo, and revision creation.
- `persistence`: repositories, transactions, ownership, schema migration.
- `ai`: provider-neutral intent/explanation ports, prompts, schemas, policy, telemetry.
- `recipes`: synth profiles/recipes and deterministic validation.
- `web`: UI composition and API adapters.

Dependencies point inward: web/persistence/AI/MIDI adapters depend on domain contracts; domain logic does not depend on Next.js, Supabase, Vercel, Web Audio, or an AI provider.

Commodity mechanisms may use evaluated third-party libraries behind adapters, but canonical Nightdrive musical semantics remain defined by the framework-independent domain contracts.

Stage 7A defines the documentation-only [Arpeggiator foundation](ARPEGGIATOR_MODEL.md). The future Arpeggiator consumes validated Harmony progression slots and their selected `ChordVoicing`, owns only component-specific pitch traversal and `ArpEvent` projection, and reuses canonical musical-time primitives. Harmony retains Chord, inversion, voicing, slot-order, and bar-span ownership; MIDI, aggregate provenance, browser/audio, persistence, and AI remain downstream or enclosing boundaries. No Arpeggiator runtime exists in Stage 7A.

Stage 5A defined the MIDI boundary. Stage 5B1 provides a framework-independent Nightdrive-owned intermediate representation and strict validators for validated canonical composition/timing inputs. Stage 5B2a passes that validated IR through an isolated Standard MIDI adapter using `midi-file` only for commodity byte encoding; the public boundary remains Nightdrive-owned and third-party MIDI types do not cross it. Stage 5B2b adds a test-only independent validation/reference reader and semantic round-trip evidence; it is not canonical state or a production parser. Stage 5C1 prepares a committed serializer-generated interoperability fixture and manual FL Studio protocol; it does not automate FL Studio or claim compatibility.

### Implemented boundaries

- `src/app`: Next.js routes, semantic layout, state pages, global tokens/styles, and HTTP adapters only.
- `src/app/api/health/live`: deterministic, non-cacheable process liveness without dependency or secret disclosure.
- `src/music-domain`: plain TypeScript canonical musical-time, pitch-identity, signed chromatic-interval, scale-formula, and Key values and operations. Production files accept only relative imports; a test covers static, dynamic, re-export, and side-effect-only forms to enforce the absence of framework, platform, and package dependencies.
- Root tool configuration: exact runtime/dependency policy, strict TypeScript, Biome, Vitest/jsdom/axe-core, and CI.
- No named/diatonic interval, note spelling, key/chord theory, composition, generator, full MIDI export workflow, audio, persistence, AI, or provider module is created prematurely; the accepted bounded MIDI IR/serializer/browser-delivery slices remain the only MIDI implementation slices.

Framework-independent modules live outside `src/app`, expose plain TypeScript APIs, and contain no `next/*`, React, DOM, Node-only, database, or provider imports unless the module is explicitly an adapter. The Stage 3A dependency-boundary test enforces this rule for `src/music-domain` production files.

## Canonical flow

1. Validate and normalize a brief.
2. Resolve explicit versions and seed.
3. Generate immutable canonical domain output.
4. Validate aggregate invariants and compute a canonical hash.
5. Persist the generation record/result transactionally when authenticated.
6. Derive preview scheduling and MIDI independently from canonical state.
7. Treat AI output only as a proposed, validated parameter command or explanation.

## Client versus server

Pure deterministic generation may run client-side for low latency only if cross-runtime reproducibility is proven. Authorization, persistence, cost-bearing AI, audit logging, and privileged operations run server-side. The server revalidates all client-produced canonical payloads; client validation is usability, not security.

## Reliability boundaries

- Generation calls are idempotent by user + operation key + normalized request hash.
- Persist generation record and canonical result in one transaction.
- Failed AI calls cannot corrupt or block deterministic editing/export.
- Preview clock drift never updates canonical ticks.
- Export validates a frozen composition revision, not mutable UI state.
- Schema and generator versions are explicit; migrations never silently reinterpret history.

## Browser audition expectations

The Stage 9 spike must measure foreground desktop scheduling against canonical tick-derived target times. Initial targets are no more than 20 ms p95 note-start error, 25 ms loop-boundary discontinuity, and 10 ms accumulated relative track drift across an 8-bar preview on the declared supported browser/device matrix. These are preview-quality targets, not production-audio guarantees, and may be revised only with recorded measurements. Tab suspension, audio-device changes, CPU pressure, timer throttling, resume gestures, and mobile browser policies must produce an explicit paused/degraded state rather than advancing canonical time incorrectly.

## Deferred scaling

No queue or worker is justified for current Version 1 latency assumptions. Introduce an asynchronous boundary only when measured timeouts, concurrency, or provider behavior require it; preserve API/job contracts so such a change is possible.
