# Stage 7 Arpeggiator audition-artifact contract

## Authority and status

This document freezes the approved documentation-only architecture for preparing Stage 7 Arpeggiator human-evaluation audition artifacts. The contract is review-pending: no assembler, MIDI fixture, audio render, evaluation matrix, listening result, browser preview, or aggregate provenance implementation exists because of this checkpoint.

The fixed case inputs remain authoritative in [Stage 7 Arpeggiator golden-case source records](STAGE7_ARPEGGIATOR_GOLDEN_CASES.md). Energy, Complexity, and any additional root seeds remain separately authorized evaluation variables.

## Evaluation route

The evaluation path is:

```text
authoritative golden-case source record
+ later-authorized Energy / Complexity / seed variables
  -> accepted deterministic Harmony realization
  -> accepted generateArpEventsWithPolicyV1 result
  -> evaluation-only Harmony + Arp to Nightdrive MIDI IR assembler
  -> existing Nightdrive MIDI IR validation
  -> existing serializeStandardMidiV1
  -> derived Standard MIDI File Format 1 artifact
  -> manual audition in FL Studio
```

The assembler is noncanonical derived evaluation/preparation tooling. It is not canonical composition state, a music-domain generator, a public Stage 7 API, another MIDI IR or serializer, Stage 9 Web Audio, aggregate provenance, or persistence state.

## MIDI artifact contract

Each artifact contains exactly three tracks in the existing fixed order:

1. **Conductor** — component `conductor`, track 0, 960 PPQ, 4/4 at tick 0, tempo `500000` microseconds per quarter (120 BPM) at tick 0, and one terminal End-of-Track at tick `30720`.
2. **Chords** — component `chords`, existing fixed channel `0`, track name `Chords`, and one source note for each of the three accepted selected-voicing pitches in each Harmony slot.
3. **Arp** — component `arp`, existing fixed channel `2`, track name `Arp`, and one source note for each accepted `ArpEvent`.

Bass and Lead are absent. The existing MIDI contract permits omitted component tracks, so the assembler must not create empty Bass or Lead tracks.

The artifact contains no program-change events, instrument assignments, synth or plugin identities, effect settings, proprietary FL Studio state, or automatic production choices.

### Harmony mapping

For each ordered Harmony slot, the assembler:

1. determines the slot start tick by accumulating preceding canonical slot spans from tick `0`;
2. computes duration as exact `slot.bars * 3840` ticks;
3. reads exactly `slot.voicing.midiPitches`;
4. creates one `chords` source note for each of the three selected pitches; and
5. assigns every note the same slot start, slot duration, fixed channel `0`, and note-on velocity `100`.

The assembler does not regenerate Harmony, select an inversion or voicing, reorder pitches for musical reasons, add doubling or notes, transpose octaves, change duration, articulate, or embellish.

### Arpeggiator mapping

For each `ArpEvent`, the assembler creates exactly one `arp` source note with:

- `pitch` equal to `ArpEvent.pitch`;
- `startTick` equal to `ArpEvent.startTick`;
- `durationTicks` equal to `ArpEvent.durationTicks`;
- fixed channel `2`; and
- note-on velocity `100`.

It performs no quantization, post-processing, accent generation, expressive transformation, or note insertion.

### Ordering and serialization

The assembler does not own another ordering algorithm. It uses the existing source-note validation/expansion boundary, constructs events only in the already-defined MIDI IR order, and passes the complete IR through existing validation. The accepted MIDI contract remains the sole owner of component-track order, pitch order, Note Off before Note On at an equal tick, explicit Note Off release velocity `0`, and the single terminal End-of-Track at tick `30720`. The assembler then calls the existing `serializeStandardMidiV1`; Standard MIDI writing is not reimplemented.

## Evaluation controls

Every initial Stage 7 artifact fixes:

- tempo to 120 BPM, represented exactly as `500000` microseconds per quarter;
- meter to 4/4;
- section length to eight bars ending at tick `30720`;
- Chords note-on velocity to `100`; and
- Arp note-on velocity to `100`.

These are evaluation transport controls that remove tempo and dynamic variation from the initial baseline. Tempo 120 is not a genre-preference claim, and velocity 100 is not an Arpeggiator expressive policy. They were selected before listening; no listening or output inspection influenced them.

## Canonical ownership

Canonical authoritative truth remains:

```text
golden source context
+ explicit Energy / Complexity
+ root seed and versions
  -> deterministic Harmony realization
  -> generateArpEventsWithPolicyV1
  -> plan + ArpEvent[]
```

The MIDI IR and bytes are derived observation surfaces only. MIDI bytes, MIDI IR, evaluation velocity and tempo, instrument choice, and FL Studio state must not enter `ArpEvent`, `ResolvedArpPlanV1`, or the Stage 7 result types. The assembler introduces no canonical aggregate ID, history schema, persisted provenance, or product-state hash. Later evaluation records may retain artifact hashes and build SHAs as evidence without redefining canonical provenance.

## Implementation boundary

The later bounded implementation belongs in an evaluation-specific `src/evaluation/` module, not `src/music-domain`, `src/app`, or a production route. It is a pure noncanonical mapping callable only by separately authorized evaluation tooling and focused tests; it is not exported through `src/music-domain/index.ts` or a broad application API.

The dependency direction is one way:

```text
src/music-domain Stage 7 outputs
  -> evaluation assembler
  -> existing src/midi IR API
  -> existing src/midi/adapter serializer
```

No MIDI or evaluation dependency flows back into `src/music-domain`. The implementation must reuse the existing `MidiIr` schema/constants, fixed component/channel identities, source-note validation and expansion, `createMidiIr`/`validateMidiIr`, and `serializeStandardMidiV1`. It adds no MIDI dependency, schema, serializer, program-change behavior, browser UI, or file-delivery API.

## Human audition and deferred controls

The derived `.mid` artifact is intended for manual audition in FL Studio. This contract does not automate FL Studio, create `.flp` files, assign instruments, or expand the Stage 5 compatibility claim beyond its declared tested environment.

A later listening-protocol checkpoint must separately freeze:

- exact Chords instrument and timbre;
- exact Arp instrument and timbre;
- mixer levels;
- effects policy;
- FL Studio import settings;
- presentation order and blinding;
- the Energy/Complexity evaluation matrix; and
- any additional root seeds.

Fixture generation and listening remain unauthorized until their required preparation checkpoints are accepted.

## Stage 9 boundary

[ADR-011](../DECISIONS.md#adr-011--browser-audition-is-a-derived-preview) remains unchanged. Browser/Web Audio scheduling, preview voices, playback UI, and timing-spike work remain Stage 9 concerns and are not prerequisites for Stage 7 evaluation.

## Existing contract references

- [MIDI model](../MIDI_MODEL.md) owns the Nightdrive MIDI IR, fixed components/channels, ordering, validation, Format 1 mapping, terminal boundary, and existing serializer boundary.
- [Architecture](../ARCHITECTURE.md) owns the one-way dependency rule and keeps MIDI/evaluation adapters outside the music domain.
- [Evaluation plan](../EVALUATION_PLAN.md) owns the human-review purpose, rubric, and later listening protocol.
- [ADR-007](../DECISIONS.md#adr-007--standard-midi-before-proprietary-fl-studio-formats), [ADR-011](../DECISIONS.md#adr-011--browser-audition-is-a-derived-preview), and [ADR-017](../DECISIONS.md#adr-017--versioned-nightdrive-midi-boundary) remain authoritative and unchanged.

## Next gate

After this checkpoint is accepted, the next separately authorized task is the smallest evaluation-only Harmony + Arp to `MidiIr` assembler implementation with focused deterministic tests. That implementation must precede evaluation-matrix definition, MIDI artifact generation, and human listening.
