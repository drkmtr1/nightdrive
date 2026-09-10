# Observability plan

## Goals

Answer: Is the service healthy? Which bounded operation failed? Can a generation/export be reproduced? Are AI cost/validation or MIDI compatibility regressing? Observability must not become a shadow copy of compositions or secrets.

## Structured fields

Every server operation: UTC timestamp, environment, service/version/commit, severity, event name, request ID, user pseudonymous/internal ID where necessary, route, status, latency, and error code.

Generation events add generation ID, project ID (internal), target component, engine/generator/profile/schema versions, seed, input/result hashes, duration, status, and invariant failure category. AI events add provider/model identifier, prompt/schema version, latency, input/output token counts, estimated cost, refusal/timeout/schema/domain-validation outcome. Export events add export/revision IDs, format version, PPQ, track/event counts, validation/import-fixture result, duration, and failure category.

## Signals and alerts

- Availability, 5xx/error-code rate, p50/p95/p99 latency, readiness.
- Generation success/determinism-invariant failures and duration.
- AI timeout, refusal, schema/domain validation, tokens and cost.
- Save conflict and RLS/authorization denial anomalies.
- MIDI validation/export failure and FL Studio fixture regression.
- Client error tracking with release/source-map controls and privacy filtering.

Alert only on actionable sustained conditions with environment/runbook links. Preview noise must not page production responders.

## Never log

Secrets, access/refresh tokens, cookies, authorization headers, database passwords/URLs containing credentials, provider keys, full prompts/responses by default, complete canonical compositions, downloaded MIDI bytes, email or personal identifiers unless a documented security need exists, or arbitrary stack/context fields without redaction.

## Health checks and correlation

Liveness confirms the process responds. Readiness checks only dependencies necessary to serve safely and exposes categories, not details. Client-visible `requestId`, `generationId`, and `exportId` connect support reports to logs/traces. Metrics use bounded-cardinality labels; IDs belong in logs/traces, not metric labels.

## Retention and access

Set environment-specific retention before launch, restrict access by role, audit access to sensitive operational data, and test redaction. Evaluation history is durable product evidence with dataset/build/version linkage; it is not ephemeral telemetry.
