# Musical time model

## Canonical representation

`PPQ = 960`. Positions and durations are integer ticks. In Version 1, meter is 4/4 and tempo is constant within the 8-bar section, but both are explicit metadata.

- `Tick`: nonnegative safe integer.
- `DurationTicks`: positive safe integer.
- `MusicalPosition`: `{ bar: zeroBasedInt, beat: zeroBasedInt, tickWithinBeat: int }` at a specified meter/PPQ.
- `TimeSignature`: `{ numerator: 4, denominator: 4 }` for the initial path.
- `Tempo`: microseconds per quarter note canonically for MIDI conversion, with validated display BPM derived/accepted under an explicit rounding policy.

For 4/4 at 960 PPQ: one quarter-note beat = 960 ticks; one bar = 3,840 ticks; eight bars = 30,720 ticks. Store absolute section-relative tick plus derive display bar/beat; do not store contradictory dual authorities.

## Arithmetic and ordering

Use integer/rational arithmetic for subdivisions. A subdivision is supported only when its tick length resolves exactly or a documented deterministic quantization policy applies. Reject overflow, negative starts, nonpositive duration, and end beyond section. Same-tick events use a stable total order defined by the MIDI model.

## Tempo-to-seconds conversion

Browser preview derives seconds from ticks and tempo. Canonical data never adopts the Web Audio clock. Scheduler drift, output latency, suspension, or tempo display rounding cannot alter ticks.

## Version 1 boundary and future evolution

No pickup bars, meter changes, tempo maps, swing templates, negative lead-in, or free microtiming in the initial path. Explicit meter/tempo types and section-relative ticks leave room for later maps through a versioned ADR/migration.

## Invariants

- Equal PPQ/meter/tempo/ticks produce equal positions and derived durations.
- Every event fits `[0, sectionLengthTicks]` with positive duration.
- Conversion/rounding is centralized and fixture-tested.
- JSON and MIDI serialization record PPQ and time signature explicitly.
