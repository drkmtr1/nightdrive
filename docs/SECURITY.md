# Security design

## Assets and trust boundaries

Protect accounts, user compositions, generation history, exports, provider credentials, Supabase/Vercel configuration, and operational telemetry. The browser, all user text, AI output, request headers, and future imported data are untrusted. Server code, RLS, schema validators, and reviewed migrations form enforcement boundaries.

## Controls

- Authentication: Supabase Auth with secure cookie/session integration and documented recovery/session-revocation behavior.
- Authorization: server ownership checks plus RLS defense in depth; return not-found for inaccessible objects.
- Least privilege: separate local/preview/production credentials; service role only in server-only code and only where user-scoped access cannot work.
- Secrets: managed environment variables, never Git/client bundles/logs; rotate after suspected disclosure.
- Validation: strict schemas, bounded strings/arrays/numbers/depth, normalized IDs, content-type/size checks, output validation.
- Browser: CSP, safe rendering/no unsanitized HTML, CSRF protection appropriate to session transport, secure headers, dependency/SRI strategy where relevant.
- API: idempotency, optimistic concurrency, rate/concurrency limits, timeouts, generic external errors, request IDs.
- Database: RLS, constrained FKs/checks, transactional mutations, migration review, backup/restore testing.
- Supply chain: lockfile, pinned supported runtimes, automated vulnerability/license review, minimal packages, protected branch and CI permissions.
- Privacy/logging: collect minimum data, documented retention/deletion, redact content/secrets/tokens, restrict operational access.

## Abuse cases

| Threat | Mitigation and verification |
|---|---|
| Guess another project/export ID | RLS + server ownership; cross-user negative tests |
| Inject prompt/tool/SQL instructions | treat text as data; allowlisted schema; no model tools/database writes; adversarial fixtures |
| Submit huge/deep composition | body/event/depth/range limits; early rejection; resource tests |
| Exhaust AI cost | authenticated quotas, rate/concurrency limit, timeout, per-request token cap, monitoring |
| Forge locked hashes/base revision | server loads authoritative base and compares; 409 on mismatch |
| Tamper with generated client payload | server domain validation/recomputation and hash/version checks |
| Export malicious filenames/content | server-generated safe names, no path input, escaped text manifest, content disposition |
| Leak secrets in build/log | secret scanning, server-only import checks, redaction tests, build artifact inspection |
| Dependency compromise | provenance/lockfile, review, vulnerability alerts, limited CI token permissions |

## AI-specific security

See [AI design](AI_SYSTEM_DESIGN.md). Model responses are untrusted input. Prompts never include secrets. AI provider terms, data retention, regional processing, and training controls must be reviewed before selection.

## Incident readiness

Define severity, owner, containment, credential rotation, affected-user assessment, evidence preservation, communication, recovery, and retrospective before production. Security events must be correlated without storing prohibited payloads.
