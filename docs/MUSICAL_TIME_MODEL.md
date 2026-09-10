# Musical time model

## Canonical representation

`PPQ = 960`. Positions and durations are integer ticks. In Version 1, meter is 4/4 and tempo is constant within the 8-bar section, but both are explicit metadata.

- `Tick`: nonnegative safe integer.
- `DurationTicks`: positive safe integer.
- `MusicalPosition`: `{ bar: zeroBasedInt, beat: zeroBasedInt, tickWithinBeat: int }` at a specified meter/PPQ.
- `TimeSignature`: `{ numerator: 4, denominator: 4 }` for the initial path.
- `Tempo`: microseconds per quarter note canonically for MIDI conversion, with validated display BPM derived/accepted under an explicit rounding policy.

For 4/4 at 960 PPQ: one quarter-note beat = 960 ticks; one bar = 3,840 ticks; eight bars = 30,720 ticks. Store absolute section-relative tick plus derive display bar/beat; do not store contradictory dual authorities.

Stage 3A implements these values in `src/music-domain`. Numeric constructors reject non-finite, fractional, unsafe, negative, and nonpositive values as applicable with stable `MusicalTimeError` codes and fields; they never coerce or clamp. Internal `bar` and `beat` indices are zero-based. User interfaces may later project them as one-based labels but must not persist those labels as canonical positions.

The bounded converter accepts every absolute tick in `[0, 30720]`. Ticks `0..30719` map to ordinary positions with bars `0..7`, beats `0..3`, and within-beat ticks `0..959`. Tick `30720` maps uniquely to `{ bar: 8, beat: 0, tickWithinBeat: 0 }`. That terminal value is a valid conversion/event-end boundary and is not a valid event start. Other aliases at bar 8 are rejected.

`TimeSignature` validates positive safe-integer numerators and power-of-two denominators whose beat resolves to an integer tick count at 960 PPQ. This low-level value does not authorize non-4/4 Version 1 compositions; all Stage 3A section operations remain fixed to the accepted 4/4 context. `Tempo` stores a positive safe-integer microseconds-per-quarter value. BPM input uses `round(60,000,000 / BPM)` to the nearest integer microsecond, with positive half values rounding upward; no product BPM range is invented. BPM and seconds are derived values.

## Arithmetic and ordering

Use integer/rational arithmetic for subdivisions. A subdivision is supported only when its tick length resolves exactly or a documented deterministic quantization policy applies. Reject overflow, negative starts, nonpositive duration, and end beyond section. Same-tick events use a stable total order defined by the MIDI model.

Stage 3A fixtures define straight whole through thirty-second values as `3840, 1920, 960, 480, 240, 120`; dotted values as `5760, 2880, 1440, 720, 360, 180`; and triplet units as exactly two-thirds of the corresponding straight value: `2560, 1280, 640, 320, 160, 80`. No quantization policy is needed for these fixtures.

Duration addition rejects safe-integer overflow. Duration subtraction and position differences must remain strictly positive because `DurationTicks` cannot represent zero. Position addition may land on the terminal section boundary but not beyond it. Event validation requires a start before tick `30720`, positive duration, and an end no later than tick `30720`.

## Tempo-to-seconds conversion

Browser preview derives seconds from ticks and tempo. Canonical data never adopts the Web Audio clock. Scheduler drift, output latency, suspension, or tempo display rounding cannot alter ticks.

Stage 3A supplies only the pure tick-to-seconds calculation. It does not implement a clock, scheduler, transport, audio graph, or browser adapter.

## Deterministic primitive serialization

Each Stage 3A primitive serializer constructs a fixed-order JSON object with an explicit schema identifier and unit-bearing field names where needed: `nightdrive.tick.v1`, `nightdrive.duration-ticks.v1`, `nightdrive.musical-position.v1`, `nightdrive.tempo.v1`, and `nightdrive.time-signature.v1`. Inputs are revalidated before serialization. Because values are finite safe integers and keys are constructed in fixed order, equivalent values produce identical strings independent of locale and timezone. Parsing, composition canonicalization, byte hashing, and migrations are not part of Stage 3A.

## Version 1 boundary and future evolution

No pickup bars, meter changes, tempo maps, swing templates, negative lead-in, or free microtiming in the initial path. Explicit meter/tempo types and section-relative ticks leave room for later maps through a versioned ADR/migration.

## Invariants

- Equal PPQ/meter/tempo/ticks produce equal positions and derived durations.
- Every event fits `[0, sectionLengthTicks]` with positive duration.
- Conversion/rounding is centralized and fixture-tested.
- JSON and MIDI serialization record PPQ and time signature explicitly.
