# Architecture

## Stage 1 status

This is a target architecture, not an implemented system. Technology selections are provisional or accepted only as recorded in [Decisions](DECISIONS.md).

## System shape

Use a TypeScript modular monolith: one web application/deployment with explicit internal domains and server boundaries. Supabase provides PostgreSQL and authentication when persistence enters scope; Vercel is the default web host. Deterministic music logic remains framework-independent and runnable in browser/server/tests where equivalent behavior can be guaranteed.

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
