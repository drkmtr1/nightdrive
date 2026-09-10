# API contracts

## Conventions

Target prefix: `/api/v1`. JSON uses camelCase externally and versioned schemas. Authenticated endpoints require a Supabase session; the server verifies ownership independently. Errors use `{ error: { code, message, requestId, fieldErrors?, retryable } }`. UTC timestamps use RFC 3339. Mutations that may retry accept `Idempotency-Key` and reject key reuse with a different request hash.

Default limits are design placeholders requiring load/security evidence: JSON body 256 KiB, 15 s deterministic request timeout, 30 s AI timeout, and per-user rate limits. `429` supplies retry guidance; clients use bounded exponential backoff only for retryable failures. Never retry validation, authorization, or conflict errors automatically.

## Endpoints

| Method/path | Purpose | Auth | Request → response | Idempotency/errors |
|---|---|---|---|---|
| `POST /projects` | Create project + brief | user | `CreateProjectRequest` → `Project` (201) | key required; 400/401/422 |
| `GET /projects` | List own projects | user | cursor/limit → `ProjectPage` | 400/401 |
| `GET /projects/{id}` | Read owned aggregate metadata/current revision | owner | path → `ProjectDetail` | 401/404 (no ownership leak) |
| `PATCH /projects/{id}` | Rename/update brief | owner | `ProjectPatch` + expected version → `Project` | key; 409 optimistic conflict |
| `DELETE /projects/{id}` | Delete confirmed owned project | owner | confirmation token/version → 204 | key; 409/422 |
| `POST /projects/{id}/generations` | Generate full/selected component deterministically | owner | `GenerationRequest` → `GenerationRun` + revision (201) | key required; 409 locks/version; 422 constraints |
| `GET /projects/{id}/generations` | Inspect lineage/history | owner | cursor → page | 401/404 |
| `POST /projects/{id}/revisions` | Save validated editor commands/new revision | owner | base revision + command batch → revision | key; 409 stale base |
| `POST /projects/{id}/intent` | Convert natural language to bounded parameter proposal | owner | text + current state ref → `IntentProposal` | key; rate limit; 422 schema; 503 provider |
| `POST /projects/{id}/coach` | Explain/coach from frozen state | owner | revision + focus → observations/advice | rate limit; no mutation |
| `POST /projects/{id}/exports` | Validate/freeze and create MIDI package | owner | revision + export options → export metadata/download capability | key; 422 MIDI; 503 storage |
| `GET /exports/{id}` | Read own export status/manifest | owner | path → `Export` | 401/404/410 expired |
| `GET /profiles/genres` | List published profile versions | none for published data | filters → page | cacheable; 400 |
| `GET /profiles/synths` | List published synth profiles | none for published data | filters → page | cacheable; 400 |
| `GET /health/live` | Process liveness | none, minimal | none → status | no dependency detail |
| `GET /health/ready` | Deployment readiness | protected/monitor | none → dependency status category | no secrets |

## Core schema sketches

`GenerationRequest` includes `baseRevisionId`, `target` (`all|chords|bass|arp|lead`), full normalized configuration, locked component hashes, `seed`, generator versions, genre profile version, and expected project version. The response includes IDs, status, parent run, canonical result hash, warnings, and links—not provider internals.

`IntentProposal` contains `schemaVersion`, interpreted tags, a list of allowed parameter patches with old/new values and rationale, warnings, and `requiresConfirmation`. Applying it is a separate deterministic generation or edit request.

`EditorCommandBatch` is a bounded discriminated union (`addNote`, `deleteNote`, `moveNote`, `resizeNote`, `setVelocity`, `transpose`) against stable event IDs. The server replays and validates commands against the base revision.

## Client/server split

Transport scheduling, provisional editing validation, and potentially deterministic previews may execute locally. Persistence, ownership, export authorization, AI/provider access, download signing, and audit events remain server-side. If canonical generation is client-side, the server recomputes or validates it before persistence.
