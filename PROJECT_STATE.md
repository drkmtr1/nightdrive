# Nightdrive Project State

## Current Phase

Stage 7C5 Arpeggiator structured-error taxonomy and precedence contract definition.

## Current Milestone

Stage 7A and Stage 7B1–B4 are accepted and merged. The Stage 7C documentation-only checkpoint and Stage 7C1–C3 contracts are accepted and merged. Stage 7C-P1 is accepted and merged through PR #79. Stage 7C4 is accepted and merged through PR #80 at approved head `2fb30286e9856e67b2ada775f187218a15303f95` with merge commit `4a1c8789e80087b66140740d71ec6663c3c8c6d0`. Stage 7C5 is the current documentation-only contract under review; Stage 7C runtime remains unauthorized and unstarted.

## Recent Accepted Work

Stage 6A2 Bass V1 event generation is merged through PR #51 at `14191127ac861562332309cb30ea93961c9cda05`.

The straight-rhythm contract is merged through PR #52 at `fddc268e30bd365a9b6c04f3bc85fd2c4396f02e`.

The project-state maintenance workflow is merged through PR #53 at `45f831c6ea5fdc549a0176a2b3ed43b7f20ab842`.

The bounded Bass straight-rhythm production implementation is merged through PR #56 at `4cb0444d10cdd500bea1947680012e64087ad71b`.

## Repository State

Git refs are authoritative for the current `HEAD` and local/remote synchronization. This snapshot records coordination state and stable accepted PR/merge references; it does not predict or store the commit SHA that will contain its own current update.

## Current Gate

Stage 7C4 resolved exact profile candidate order, raw integer weights, energy/complexity mappings, and integer gate candidates. Stage 7C5 now freezes structured-error codes, fields, ownership, and mixed-invalid precedence for review. Runtime implementation and every later Arpeggiator milestone remain separately gated and unstarted.

## Unresolved Risks

MIA-003 cross-platform line-ending/formatting policy and MIA-004 stronger exact Arpeggiator structured-error assertions remain deferred, non-blocking technical debt. The previously reported Harmony timeout was resolved by MIA-001's test-only profile decomposition and five consecutive parallel-suite passes.

## Relevant Deferred Work

Stage 7C runtime octave expansion, density/rest masks, seeded policy resolution, runtime use of concrete profile policy, compound and expressive Bass rhythms, and later application capabilities remain separately gated. See [Arpeggiator model](docs/ARPEGGIATOR_MODEL.md), [Bass model](docs/BASS_MODEL.md), and [roadmap](docs/ROADMAP.md).

## Next Eligible Task

Review and publish the Stage 7C5 documentation contract. Do not begin Stage 7C runtime automatically.

## Maintenance

This file is a volatile coordination snapshot, not a requirements, architecture, contract, test, decision, roadmap, or history document. Replace stale state when coordination changes; keep permanent truth in authoritative documents and use Git for detailed history.
