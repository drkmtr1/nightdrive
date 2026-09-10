# Risk register

Scale: likelihood/severity **Low, Medium, High**. Owners are roles until assigned.

| ID | Category | Description | L | S | Mitigation | Monitoring | Owner |
|---|---|---|---|---|---|---|---|
| R-001 | Product | Output is valid but producers do not find it useful. | H | H | Narrow workflow/profiles; human rubric; iterative golden cases. | usefulness ratings, completion/retention evidence | Product |
| R-002 | Musical quality | Rule systems sound repetitive or generic. | H | H | Versioned profiles, seeded variation, motif/voice-leading constraints, human review. | per-profile rubric and issue taxonomy | Music engine |
| R-003 | Theory | Edge cases create invalid harmony/voicing. | M | H | Typed primitives, invariant/property tests, reviewed fixtures. | invariant failures/regressions | Music engine |
| R-004 | Scope | Full-song, DAW control, or many genres dilute Version 1. | H | H | Frozen scope, ADR gate, sequential roadmap. | backlog/scope audit | Product |
| R-005 | UX | Workstation becomes too complex for first-time users. | M | H | Defaults, progressive disclosure, usability testing, clear recovery. | critical errors/task completion | Design |
| R-006 | Accessibility | Custom piano roll/transport excludes keyboard or screen-reader users. | M | H | Semantic parallel controls, keyboard model, manual AT testing. | accessibility gate/issues | Design/Frontend |
| R-007 | Browser timing | Preview drifts/jitters or suspends. | H | M | Look-ahead scheduling, tick authority, drift tests, degraded state. | scheduling error/device matrix | Frontend |
| R-008 | MIDI | Export imports incorrectly in FL Studio. | M | H | Standard MIDI spec, round trip, stable fixtures, manual import matrix. | export failures/import results | MIDI |
| R-009 | Determinism | Browser/server/runtime produce different output. | M | H | Fixed PRNG/version, integer math where possible, canonical serializer, cross-runtime tests. | hash mismatches | Architecture |
| R-010 | AI | Hallucinated advice or prompt injection affects state. | M | H | No canonical notes/tools, schemas, allowlists, grounding, separate confirmation. | schema/adversarial eval | AI/Security |
| R-011 | Security | RLS or API authorization leaks projects. | M | H | Defense in depth, negative tests, least privilege. | denial anomalies/security tests | Security/Data |
| R-012 | Privacy | Prompts/logs expose composition or identity unnecessarily. | M | H | Minimize/redact, retention/access controls, provider review. | log audits/provider settings | Security |
| R-013 | Dependency | Music/editor/audio package becomes unmaintained, insecure, or large. | M | M | dependency record, adapter, lockfile, bundle/license/vulnerability gates. | alerts/size/health review | Engineering |
| R-014 | Supabase | Vendor/RLS/local-stack behavior complicates persistence. | M | M | repository boundary, migration/RLS CI, exportable Postgres schema. | query/errors/cost | Data |
| R-015 | Vercel | Limits/cost/regions conflict with workloads. | M | M | measure previews/functions, portable adapters, budgets. | latency/cost/limits | Operations |
| R-016 | Evaluation | Subjective metrics are mistaken for objective proof. | H | H | separate deterministic/human evidence; preserve disagreement/context. | report language/reviewer spread | Evaluation |
| R-017 | Operational | Weak telemetry makes reproduction/support difficult. | M | H | IDs, versions, hashes, structured events, runbooks. | missing-field audits/MTTR | Operations |
| R-018 | Data evolution | Schema/profile changes make history unreproducible. | M | H | immutable versions, schema migration fixtures, retain inputs/hashes. | replay tests | Architecture/Data |
| R-019 | Copyright | Users request direct imitation of protected compositions. | M | H | product policy, original bounded profiles, refusal/UX guidance; no reference ingestion V1. | abuse reports/eval prompts | Product/Security |
| R-020 | Performance | Dense editor/generation is slow on typical hardware. | M | M | event limits, profiling, virtualization only if measured, performance budgets. | percentiles/device tests | Engineering |
| R-021 | Toolchain | Fast framework/compiler/tool releases drift out of peer support or security maintenance. | M | H | LTS runtime/framework, exact direct pins, lockfile, dependency register, clean-install/CI/build gates; reject peer overrides. | update/audit alerts, install warnings, quarterly support review | Engineering/Security |
| R-022 | Musical time | Boundary aliases, fractional values, or runtime arithmetic drift corrupt canonical timing across generators and export. | M | H | Branded constructors, safe-integer checks, one terminal boundary representation, exact subdivision fixtures, exhaustive bounded round trips, and fixed-order primitive serialization. | musical-time invariant and cross-runtime fixture failures | Music engine/Architecture |
| R-023 | Pitch identity | Enharmonic names or inconsistent octave labels leak into canonical pitch identity and cause cross-system mismatch. | M | H | Store only semitone class 0–11 and MIDI note number 0–127; keep spelling/octave labels as later projections; exhaustively test finite domains and serializers. | pitch-domain invariant and interchange fixture failures | Music engine/Architecture |
| R-024 | Interval semantics | Direction, compound distance, or safe-integer arithmetic is accidentally collapsed into pitch-class or named-interval semantics. | M | H | Use signed safe-integer semitones, preserve compound values, reject overflow, avoid pitch-class distance/transposition APIs, and exhaustively verify ordered MIDI-pitch pairs. | interval algebra and MIDI-pair invariant failures | Music engine/Architecture |
| R-025 | Scale formula/projection drift | Formula offsets, degree indexing, or tonic wrapping drift from the closed V1 contract, or spelling/key semantics leak into the numeric primitive. | M | H | Immutable closed formulas, strict degree validation, exhaustive 72-context and 12-membership tests, and explicit spelling/key deferral. | scale invariant and serialization fixture failures | Music engine/Architecture |
| R-026 | Key identity drift | Key construction could duplicate scale formulas, accept forged components, or leak display/key-signature semantics into canonical identity. | M | H | Store only validated tonic plus canonical scale, delegate all projections to scale operations, freeze values, and test all 72 keys plus forged inputs and serializer fields. | key invariant and serialization fixture failures | Music engine/Architecture |

Review the register at each milestone entry/exit and when scope, provider, dependency, data model, or production environment changes.
