# Stage 5 requirements traceability review

**Baseline:** `c1162ae1f9247d9ec0a1108e719970a88796c3bc`  
**Scope:** Requirements traceability review plus the accepted Stage 5B2a isolated serializer adapter, Stage 5B2b independent parser/reference evidence, and Stage 5C1 interoperability fixture/protocol preparation. None adds canonical MIDI state or later workflow behavior.

**Identifier audit:** `MIDI-001` through `MIDI-004` are accepted identifiers in the MIDI requirements table (`docs/REQUIREMENTS.md`, rows 33–36) and are referenced by accepted criteria; they are retained below.

## Traceability matrix

| Requirement / decision | Requirement statement | Authoritative source | Architecture responsibility | Planned module/layer | Validation obligation | Acceptance | Status | Gap / ambiguity |
|---|---|---|---|---|---|---|---|---|
| MUS-027 | Define a versioned Nightdrive-owned MIDI IR from validated canonical composition/timing and derived Harmony input; MIDI bytes are not canonical. | `REQUIREMENTS.md`; ADR-017 | Own semantic mapping and IR types; keep Harmony derived. | Stage 5B1 `midi` IR boundary, Stage 5B2a adapter, Stage 5B2b test reference, and Stage 5C1 fixture. | IR schema/type, validator, adapter, independent reference tests, and fixture regeneration; no third-party types cross the public boundary. | AC-054 | Implemented in Stage 5B1; adapter and B2b evidence merged; C1 fixture bounded | Production parser and versioned package mechanics remain deferred. |
| NFR-026 | Freeze Format 1/960, tracks/channels, ordering, lifecycle, failures, determinism, adapter, independent parser, and dependency gate. | `REQUIREMENTS.md`; `MIDI_MODEL.md`; ADR-017 | Domain owns policy; adapter owns commodity bytes. | `midi` mapper, isolated SMF adapter, test-only reference reader, and C1 fixture. | Binary fixtures, byte repeatability, independent semantic parser, malformed cases, and fixture hash. | AC-054/055 | Aligned; B2a/B2b merged and C1 preparation bounded | Production parser and FL Studio compatibility remain deferred. |
| AC-054 | Stage 5A contract evidence covers IR, canonical input, Format 1, 960 PPQ, channels, Note Off, EOT, ordering, failures, determinism, and adapter isolation. | `ACCEPTANCE_CRITERIA.md` | Contract review, not runtime implementation. | Docs, `midi` IR, isolated adapter, test-only reference, and C1 fixture. | Documentation review plus bounded implementation, independent-reference, and fixture evidence. | AC-054 | Accepted/merged | FL Studio evidence remains deferred. |
| AC-055 | Compare `midi-file` and `midi-writer-js`; adoption requires evidence preserving Nightdrive semantics. | `ACCEPTANCE_CRITERIA.md`; spike report | Dependency remains behind adapter and cannot define semantics. | Spike tooling, isolated B2a adapter, and B2b test reference. | Candidate matrix, raw bytes, independent parser, malformed cases, browser smoke. | AC-055 | Spike complete; `midi-file` 1.2.4 adopted only for B2a | Browser delivery remains deferred. |
| ADR-017 | Versioned Nightdrive MIDI boundary; Format 1/960; isolated adapter and independent validation; no dependency-defined canonical semantics. | `DECISIONS.md` | Preserve inward dependency direction and canonical ownership. | `midi` IR and B2a adapter boundary. | IR validation now; byte-level adapter evidence; cross-runtime and FL Studio evidence at implementation/release. | AC-054/055 | Accepted | None. |
| MIDI-001 | Canonical time is integer ticks at 960 PPQ. | `REQUIREMENTS.md`; ADR-006; `MUSICAL_TIME_MODEL.md` | Reuse validated tick primitives. | Existing musical-time domain. | Tick conversion and boundary tests. | AC-007/033 | Implemented prerequisite | None. |
| MIDI-002 | Export preserves pitch, start, duration, velocity, tempo, PPQ, and track identity. | `REQUIREMENTS.md` | Map canonical fields without lossy conversion. | Stage 5B1 source-note IR, Stage 5B2a adapter, B2b reference, and C1 fixture. | IR, byte-level adapter, independent semantic round-trip, and fixture tests. | AC-008 | Exercised by B2a/B2b/C1 evidence | Exact numeric velocity preservation was not directly verifiable in FL Studio; broader compatibility remains untested. |
| MIDI-003 | Serialization has stable ordering and valid note lifecycle. | `REQUIREMENTS.md`; `MIDI_MODEL.md` | Nightdrive owns ordering and lifecycle. | IR mapper, adapter, and independent reference. | Same-tick, off-before-on, ascending-pitch, delta conversion, raw-byte, and parsed-event tests. | AC-007 | Exercised by B2a/B2b evidence | EOT sentinel clarification applied below. |
| MIDI-004 | Exported fixtures import correctly into supported FL Studio. | `REQUIREMENTS.md`; ADR-007; `MIDI_MODEL.md` | Human compatibility gate after valid bytes exist. | Export artifact/manual protocol. | Controlled FL Studio import record. | AC-009 | Satisfied for FL Studio Producer Edition 2025 `26.1.6.5639` using the recorded settings; not universal. | Exact numeric velocity preservation was not directly verifiable; broader versions/DAWs remain untested. |
| Unnumbered accepted constraint | MIDI is derived output; deterministic typed logic, not an LLM, owns raw MIDI semantics. | ADR-008; `AGENTS.md`; `ARCHITECTURE.md` | Prevent AI/provider authority and canonical-state leakage. | Domain and adapter boundaries. | Source-boundary and ownership review. | AC-017/054 | Aligned | None. |

## MUS-027 / NFR-026 / AC-054 / AC-055 / ADR-017

The five Stage 5A identifiers form a consistent chain. MUS-027 establishes ownership and input provenance; NFR-026 freezes deterministic file-boundary behavior; AC-054 is the documentation contract criterion; AC-055 is the dependency-spike gate; ADR-017 records the architecture and deferral boundary. The merged spike report supplied the evidence for AC-055, and Stage 5B2a subsequently adopted `midi-file` `1.2.4` only behind the isolated adapter.

## Timing / EOT traceability

ADR-006 and `MUSICAL_TIME_MODEL.md` establish 960 PPQ, integer ticks, and the inclusive terminal boundary `30720`; event starts remain `<30720` and ends may equal it. `MIDI_MODEL.md` now explicitly states that ordinary meta-event priority excludes End-of-Track: EOT is a terminal sentinel serialized after all other events, including tick-30720 note-offs, exactly once per track at tick `30720`. This is the smallest clarification needed to remove the former same-tick ambiguity.

## MIDI input boundary

Stage 5B may accept only a validated, versioned canonical composition revision with explicit timing/tempo metadata. Existing Harmony realization is derived input and may provide validated chord/voicing material; it is not persisted or rewritten as MIDI authority. Stage 5B must not invent bass, arp, lead, drums, or other future lanes merely to populate tracks. The minimum legitimate implementation fixture is the bounded Stage 5A two-track 8-bar fixture (conductor plus one existing component), not a claim that the full composition engine exists.

## Ownership boundary

Nightdrive owns the IR, semantic validation, absolute ticks, ordering, track/channel policy, note lifecycle, and deterministic mapping. `midi-file` may own only commodity SMF byte encoding behind an adapter. No document grants third-party defaults authority over canonical semantics; the spike explicitly records where candidate behavior requires adapter control.

## Dependency decision traceability

The merged spike recommended `midi-file` `1.2.4` and rejected `midi-writer-js` for this boundary; Stage 5B2a accepted that recommendation behind `src/midi/adapter`, with no third-party types crossing the public boundary. Any future dependency adoption must update the root `package.json`, root `package-lock.json`, `docs/DEPENDENCIES.md`, license/health/security/audit evidence, and any required ADR/status text, then rerun clean install and all gates. This B2b task adds no dependency.

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
| FL Studio | Controlled manual import acceptance recorded for the declared environment; broader compatibility remains separate. |

Stage 5B1 has focused production IR/validator tests, Stage 5B2a adds focused byte-level serializer evidence, Stage 5B2b adds independent parser/reference, semantic round-trip, malformed-file, and golden-fixture evidence, and Stage 5C1 adds committed fixture regeneration/hash plus the recorded clean manual import for the declared FL Studio environment. Exact numeric velocity preservation remains not directly verifiable; broader compatibility is untested.

## Failure semantics

The accepted documents define structured rejection categories (unsupported version, invalid timing/range/lifecycle, unsupported event, and serializer failure) without requiring a large taxonomy. Exact error codes/fields remain an implementation-task detail and should be frozen with the first IR validator. No conflict exists with existing Harmony failure vocabulary because MIDI failures are a separate adapter boundary.

## Scope verification

Stage 5B does not imply `.flp` generation, direct FL Studio control, ZIP packaging, browser download UI, instrument/program assignment, audio/stems, full-song composition, deferred lanes, persistence, or backend work. Later Stage 5B behavior remains separately gated in `ROADMAP.md`.

## Gaps / conflicts / ambiguities

- The EOT ordering ambiguity was genuine and is clarified in `MIDI_MODEL.md`, `TESTING_STRATEGY.md`, and AC-054.
- The first production task still needs exact IR type names, validator error fields, and the mapper/adaptor call signature; these are implementation details, not contradictions in the accepted architecture.
- FL Studio acceptance is satisfied only for the declared Producer Edition 2025 `26.1.6.5639` environment; broader version/device acceptance remains unproven.

No unresolved architecture conflict was found.

## Gate conclusion

**C1 HUMAN INTEROPERABILITY EVIDENCE RECORDED.** The merged Stage 5B2a serializer adapter and Stage 5B2b independent reference evidence are supplemented by a clean FL Studio Producer Edition 2025 `26.1.6.5639` import record satisfying MIDI-004 for that environment; production parser, browser delivery, and broader compatibility remain separately gated.

## Smallest recommended Stage 5C task

The next smallest task is a separately authorized broader compatibility evaluation if required; no production parser, browser delivery, or broader MIDI workflow is included here.
