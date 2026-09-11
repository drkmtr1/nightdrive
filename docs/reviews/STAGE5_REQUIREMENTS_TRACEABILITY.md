# Stage 5 requirements traceability review

**Baseline:** `c1162ae1f9247d9ec0a1108e719970a88796c3bc`  
**Scope:** Read-only audit plus one narrow, non-architectural EOT-ordering clarification. No production MIDI code or dependency adoption.

## Traceability matrix

| Requirement / decision | Requirement statement | Authoritative source | Architecture responsibility | Planned module/layer | Validation obligation | Acceptance | Status | Gap / ambiguity |
|---|---|---|---|---|---|---|---|---|
| MUS-027 | Define a versioned Nightdrive-owned MIDI IR from validated canonical composition/timing and derived Harmony input; MIDI bytes are not canonical. | `REQUIREMENTS.md`; ADR-017 | Own semantic mapping and IR types; keep Harmony derived. | Future framework-independent `midi` domain/adapter boundary. | IR schema/type and validator tests; no third-party types. | AC-054 | Aligned, not implemented | Exact public type names and version serialization are intentionally deferred to implementation. |
| NFR-026 | Freeze Format 1/960, tracks/channels, ordering, lifecycle, failures, determinism, adapter, independent parser, and dependency gate. | `REQUIREMENTS.md`; `MIDI_MODEL.md`; ADR-017 | Domain owns policy; adapter owns commodity bytes. | `midi` mapper plus isolated SMF adapter. | Binary fixtures, byte repeatability, independent inspector/parser, malformed cases. | AC-054/055 | Aligned after EOT clarification | Production serializer and parser remain unimplemented. |
| AC-054 | Stage 5A contract evidence covers IR, canonical input, Format 1, 960 PPQ, channels, Note Off, EOT, ordering, failures, determinism, and adapter isolation. | `ACCEPTANCE_CRITERIA.md` | Contract review, not runtime implementation. | Docs and future `midi` module. | Documentation review and implementation test plan. | AC-054 | Accepted/merged | No production evidence is claimed. |
| AC-055 | Compare `midi-file` and `midi-writer-js`; adoption requires evidence preserving Nightdrive semantics. | `ACCEPTANCE_CRITERIA.md`; spike report | Dependency remains behind adapter and cannot define semantics. | Spike tooling, future adapter. | Candidate matrix, raw bytes, independent inspector, browser smoke. | AC-055 | Spike complete; adoption pending | Root manifest/lockfile and register update still belong to adoption task. |
| ADR-017 | Versioned Nightdrive MIDI boundary; Format 1/960; adapter and independent validation; no Stage 5B implementation. | `DECISIONS.md` | Preserve inward dependency direction and canonical ownership. | `midi` adapter boundary. | Cross-runtime and FL Studio evidence at implementation/release. | AC-054/055 | Accepted | None. |
| MIDI-001 | Canonical time is integer ticks at 960 PPQ. | `REQUIREMENTS.md`; ADR-006; `MUSICAL_TIME_MODEL.md` | Reuse validated tick primitives. | Existing musical-time domain. | Tick conversion and boundary tests. | AC-007/033 | Implemented prerequisite | None. |
| MIDI-002 | Export preserves pitch, start, duration, velocity, tempo, PPQ, and track identity. | `REQUIREMENTS.md` | Map canonical fields without lossy conversion. | Future mapper/adapter. | Independent semantic round-trip. | AC-008 | Planned | Production mapping not implemented. |
| MIDI-003 | Serialization has stable ordering and valid note lifecycle. | `REQUIREMENTS.md`; `MIDI_MODEL.md` | Nightdrive owns ordering and lifecycle. | IR mapper and adapter. | Same-tick, off-before-on, ascending-pitch, delta conversion, raw-byte tests. | AC-007 | Planned | EOT sentinel clarification applied below. |
| MIDI-004 | Exported fixtures import correctly into supported FL Studio. | `REQUIREMENTS.md`; ADR-007; `MIDI_MODEL.md` | Human compatibility gate after valid bytes exist. | Export artifact/manual protocol. | Controlled FL Studio import record. | AC-009 | Deferred | Requires implementation and declared FL Studio environment. |
| Unnumbered accepted constraint | MIDI is derived output; deterministic typed logic, not an LLM, owns raw MIDI semantics. | ADR-008; `AGENTS.md`; `ARCHITECTURE.md` | Prevent AI/provider authority and canonical-state leakage. | Domain and adapter boundaries. | Source-boundary and ownership review. | AC-017/054 | Aligned | None. |

## MUS-027 / NFR-026 / AC-054 / AC-055 / ADR-017

The five Stage 5A identifiers form a consistent chain. MUS-027 establishes ownership and input provenance; NFR-026 freezes deterministic file-boundary behavior; AC-054 is the documentation contract criterion; AC-055 is the dependency-spike gate; ADR-017 records the architecture and deferral boundary. The merged spike report supplies empirical evidence for AC-055 but does not authorize production adoption.

## Timing / EOT traceability

ADR-006 and `MUSICAL_TIME_MODEL.md` establish 960 PPQ, integer ticks, and the inclusive terminal boundary `30720`; event starts remain `<30720` and ends may equal it. `MIDI_MODEL.md` now explicitly states that ordinary meta-event priority excludes End-of-Track: EOT is a terminal sentinel serialized after all other events, including tick-30720 note-offs, exactly once per track at tick `30720`. This is the smallest clarification needed to remove the former same-tick ambiguity.

## MIDI input boundary

Stage 5B may accept only a validated, versioned canonical composition revision with explicit timing/tempo metadata. Existing Harmony realization is derived input and may provide validated chord/voicing material; it is not persisted or rewritten as MIDI authority. Stage 5B must not invent bass, arp, lead, drums, or other future lanes merely to populate tracks. The minimum legitimate implementation fixture is the bounded Stage 5A two-track 8-bar fixture (conductor plus one existing component), not a claim that the full composition engine exists.

## Ownership boundary

Nightdrive owns the IR, semantic validation, absolute ticks, ordering, track/channel policy, note lifecycle, and deterministic mapping. `midi-file` may own only commodity SMF byte encoding behind an adapter. No document grants third-party defaults authority over canonical semantics; the spike explicitly records where candidate behavior requires adapter control.

## Dependency decision traceability

The merged spike recommends `midi-file` `1.2.4` and rejects `midi-writer-js` for this boundary. This is evidence, not adoption. A future adoption task must update the root `package.json`, root `package-lock.json`, `docs/DEPENDENCIES.md`, license/health/security/audit evidence, and any required ADR/status text, then rerun clean install and all gates. This audit installed nothing in the root graph.

## Test traceability

| Hard invariant | Planned evidence |
|---|---|
| IR validation and canonical input | Unit tests for owned IR constructors/validators and version rejection. |
| Ordering and absolute→delta conversion | Deterministic ordering tests, VLQ/delta tests, object-order independence. |
| Lifecycle and explicit Note Off | Paired note expansion, `0x8n` status, release velocity 0, no Note-On velocity-0 termination. |
| Velocity, pitch, channel | Boundary and representative-value tests; fixed component/channel policy. |
| Format/PPQ/conductor/tracks | Header, Format 1, division 960, conductor metadata, track order/name/channel fixtures. |
| EOT and section boundary | Every track exactly one EOT at 30720; no event after boundary; tick-30720 note-offs precede sentinel. |
| Deterministic bytes | Repeated serialization byte equality and fixed binary fixtures. |
| Independent verification | Standards-level inspector or independent parser, never the writer's own reader alone. |
| Failures | Unsupported schema/version, invalid tick/channel/pitch/velocity/tempo/lifecycle/event, and serializer-failure tests. |
| Runtime portability | Node and browser-target adapter/bundle smoke checks. |
| FL Studio | Later controlled manual import acceptance, separate from CI. |

The current repository has no Stage 5 production tests; the spike tests are experimental and remain isolated.

## Failure semantics

The accepted documents define structured rejection categories (unsupported version, invalid timing/range/lifecycle, unsupported event, and serializer failure) without requiring a large taxonomy. Exact error codes/fields remain an implementation-task detail and should be frozen with the first IR validator. No conflict exists with existing Harmony failure vocabulary because MIDI failures are a separate adapter boundary.

## Scope verification

Stage 5B does not imply `.flp` generation, direct FL Studio control, ZIP packaging, browser download UI, instrument/program assignment, audio/stems, full-song composition, deferred lanes, persistence, or backend work. Stage 5B remains separately gated in `ROADMAP.md`.

## Gaps / conflicts / ambiguities

- The EOT ordering ambiguity was genuine and is clarified in `MIDI_MODEL.md`, `TESTING_STRATEGY.md`, and AC-054.
- The first production task still needs exact IR type names, validator error fields, and the mapper/adaptor call signature; these are implementation details, not contradictions in the accepted architecture.
- FL Studio version/device acceptance remains a human gate and cannot be satisfied by this audit.

No unresolved architecture conflict was found.

## Gate conclusion

**READY WITH DOC CORRECTION.** The correction is narrow and non-architectural; once this review is accepted, the repository is sufficiently aligned for a bounded Stage 5B prerequisite. The full serializer/export task is not authorized by this review.

## Smallest recommended Stage 5B task

Implement only the Nightdrive-owned MIDI IR types and strict validators for the existing 8-bar fixture, with no SMF writer, parser, browser delivery, or dependency adoption. A subsequent bounded task can implement the isolated `midi-file` adapter after those validators and their tests are reviewed.
