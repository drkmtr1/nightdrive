# Nightdrive Project State

## Current Phase

The Stage 7 golden-case source-selection checkpoint is accepted and merged through PR #100. The audition-artifact architecture contract is accepted and merged through PR #101. The evaluation-only Harmony + Arp to `MidiIr` assembler is accepted and merged through PR #102 at approved head `d993519bf862b481f1166021d09143933b4a7fd7` with merge commit `6fbd554456bdd46e50d8be9f6acea0dd3d30cec3`. The Stage 7 baseline evaluation protocol is locally defined and review-pending.

## Current Milestone

Stage 7A and Stage 7B1–B4 are accepted and merged. The Stage 7C documentation-only checkpoint and Stage 7C1–C6 contracts, including prerequisite Stage 7C-P1, are accepted and merged. Stage 7C7a1–C7a6 provide the accepted component-seed, weighted-choice, immutable density-mask catalog, Energy/Complexity, shared-policy, and genre-profile runtime prerequisites. Stage 7C7a7 policy resolution is accepted and merged through PR #94 at approved head `133c7f6fecc2a78ea4278fb7b44921a2484a0c13` with merge commit `afbe3493841ef38a62eb961368a2f1147f008725`. Stage 7C7a8 resolved-plan projection is accepted and merged through PR #96 at approved head `43d251c4c95d39f60320ad90bd80522c514d721c` with merge commit `a14b6e100d00464e314309b45813943e6f81b83a`. The public `generateArpEventsWithPolicyV1` boundary, exact Stage 7C5 preflight/errors, component-seed handoff, resolver/projector orchestration, no-partial-result behavior, and frozen result are accepted and merged through PR #98 without aggregate provenance.

## Recent Accepted Work

Stage 6A2 Bass V1 event generation is merged through PR #51 at `14191127ac861562332309cb30ea93961c9cda05`.

The straight-rhythm contract is merged through PR #52 at `fddc268e30bd365a9b6c04f3bc85fd2c4396f02e`.

The project-state maintenance workflow is merged through PR #53 at `45f831c6ea5fdc549a0176a2b3ed43b7f20ab842`.

The bounded Bass straight-rhythm production implementation is merged through PR #56 at `4cb0444d10cdd500bea1947680012e64087ad71b`.

## Repository State

Git refs are authoritative for the current `HEAD` and local/remote synchronization. This snapshot records coordination state and stable accepted PR/merge references; it does not predict or store the commit SHA that will contain its own current update.

## Current Gate

Stage 7C7a1–C7a8, the enclosing `generateArpEventsWithPolicyV1` operation, four golden-case source records, audition-artifact contract, and evaluation-only MIDI IR assembler are accepted and merged. The baseline evaluation protocol is review-pending. No fixtures, serialization, or listening have occurred. Exact FL Keys/3xOsc state and Stage 7 import/routing remain a listening-setup reproducibility gate; artifact generation and aggregate provenance/integration remain later gates.

## Unresolved Risks

MIA-003 cross-platform line-ending/formatting policy remains deferred, non-blocking technical debt. MIA-004 is resolved/closed by PR #98, whose accepted evidence supplies the exact public Stage 7C structured-error codes/fields, mixed-invalid precedence, configuration translation, request-field ownership, and no-partial-result assertions. The previously reported Harmony timeout was resolved by MIA-001's test-only profile decomposition and five consecutive parallel-suite passes.

## Relevant Deferred Work

Structured human profile-fit evaluation remains unperformed. The fixed source context, audition-artifact contract, and assembler are accepted; the [baseline evaluation protocol](docs/reviews/STAGE7_ARPEGGIATOR_EVALUATION_PROTOCOL.md) is review-pending. Exact instrument-state capture, serialization/artifact generation, and listening remain separately gated. Aggregate provenance and later capabilities remain deferred. See [roadmap](docs/ROADMAP.md).

## Next Eligible Task

Review the Stage 7 baseline evaluation protocol. If accepted, separately authorize the bounded FL Studio listening-setup reproducibility checkpoint before fixture serialization/artifact generation and human listening.

## Maintenance

This file is a volatile coordination snapshot, not a requirements, architecture, contract, test, decision, roadmap, or history document. Replace stale state when coordination changes; keep permanent truth in authoritative documents and use Git for detailed history.
