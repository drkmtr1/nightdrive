import { describe, expect, it } from "vitest";
import {
  MUSICAL_TIME_ERROR_CODES,
  MusicalTimeError,
  PPQ,
  SUBDIVISION_TICKS,
  V1_SECTION_LENGTH_TICKS,
  addDurationToPosition,
  addDurations,
  comparePositions,
  createDurationTicks,
  createMusicalPosition,
  createTempoFromBpm,
  createTempoFromMicrosecondsPerQuarter,
  createTick,
  createTimeSignature,
  durationBetween,
  isEventStartPosition,
  positionToTick,
  serializeDurationTicks,
  serializeMusicalPosition,
  serializeTempo,
  serializeTick,
  serializeTimeSignature,
  subtractDurations,
  tempoToBpm,
  tickToPosition,
  ticksToSeconds,
  validateEventRange,
} from "./musical-time";

function expectError(
  operation: () => unknown,
  code: MusicalTimeError["code"],
  field: string,
): void {
  try {
    operation();
    throw new Error("Expected a MusicalTimeError.");
  } catch (error) {
    expect(error).toBeInstanceOf(MusicalTimeError);
    expect(error).toMatchObject({ code, field });
  }
}

describe("canonical musical time", () => {
  it("uses the accepted 960 PPQ and 8-bar boundary", () => {
    expect(PPQ).toBe(960);
    expect(V1_SECTION_LENGTH_TICKS).toBe(30_720);
  });

  it("defines exact straight, dotted, and triplet subdivisions", () => {
    expect(SUBDIVISION_TICKS).toEqual({
      whole: 3_840,
      half: 1_920,
      quarter: 960,
      eighth: 480,
      sixteenth: 240,
      thirtySecond: 120,
      dottedWhole: 5_760,
      dottedHalf: 2_880,
      dottedQuarter: 1_440,
      dottedEighth: 720,
      dottedSixteenth: 360,
      dottedThirtySecond: 180,
      wholeTriplet: 2_560,
      halfTriplet: 1_280,
      quarterTriplet: 640,
      eighthTriplet: 320,
      sixteenthTriplet: 160,
      thirtySecondTriplet: 80,
    });
  });

  it("round-trips every V1 tick including the exclusive end boundary", () => {
    for (let value = 0; value <= V1_SECTION_LENGTH_TICKS; value += 1) {
      const tick = createTick(value);
      expect(positionToTick(tickToPosition(tick))).toBe(tick);
    }
  });

  it("uses zero-based internal positions and a unique terminal boundary", () => {
    expect(tickToPosition(createTick(0))).toEqual({
      bar: 0,
      beat: 0,
      tickWithinBeat: 0,
    });
    expect(tickToPosition(createTick(4_800))).toEqual({
      bar: 1,
      beat: 1,
      tickWithinBeat: 0,
    });
    expect(tickToPosition(createTick(30_720))).toEqual({
      bar: 8,
      beat: 0,
      tickWithinBeat: 0,
    });
  });

  it("normalizes exact beat and bar boundaries without aliases", () => {
    expect(tickToPosition(createTick(960))).toEqual({
      bar: 0,
      beat: 1,
      tickWithinBeat: 0,
    });
    expect(tickToPosition(createTick(3_840))).toEqual({
      bar: 1,
      beat: 0,
      tickWithinBeat: 0,
    });
  });

  it("rejects aliases and out-of-section positions", () => {
    expectError(
      () => createMusicalPosition({ bar: 0, beat: 4, tickWithinBeat: 0 }),
      MUSICAL_TIME_ERROR_CODES.invalidPosition,
      "position",
    );
    expectError(
      () => createMusicalPosition({ bar: 8, beat: 0, tickWithinBeat: 1 }),
      MUSICAL_TIME_ERROR_CODES.invalidPosition,
      "position",
    );
    expectError(
      () => tickToPosition(createTick(30_721)),
      MUSICAL_TIME_ERROR_CODES.outOfRange,
      "tick",
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects non-finite tick %s",
    (value) => {
      expectError(() => createTick(value), MUSICAL_TIME_ERROR_CODES.notFinite, "tick");
    },
  );

  it("rejects fractional, unsafe, and negative ticks", () => {
    expectError(() => createTick(0.5), MUSICAL_TIME_ERROR_CODES.notInteger, "tick");
    expectError(
      () => createTick(Number.MAX_SAFE_INTEGER + 1),
      MUSICAL_TIME_ERROR_CODES.unsafeInteger,
      "tick",
    );
    expectError(() => createTick(-1), MUSICAL_TIME_ERROR_CODES.outOfRange, "tick");
  });

  it("requires positive integral durations", () => {
    expectError(() => createDurationTicks(0), MUSICAL_TIME_ERROR_CODES.outOfRange, "durationTicks");
    expectError(
      () => createDurationTicks(1.25),
      MUSICAL_TIME_ERROR_CODES.notInteger,
      "durationTicks",
    );
  });

  it("adds, subtracts, and measures positive durations", () => {
    expect(addDurations(createDurationTicks(240), createDurationTicks(480))).toBe(720);
    expect(subtractDurations(createDurationTicks(720), createDurationTicks(240))).toBe(480);
    expect(
      durationBetween(
        createMusicalPosition({ bar: 0, beat: 3, tickWithinBeat: 0 }),
        createMusicalPosition({ bar: 1, beat: 0, tickWithinBeat: 0 }),
      ),
    ).toBe(960);
  });

  it("rejects zero/negative duration subtraction and arithmetic overflow", () => {
    expectError(
      () => subtractDurations(createDurationTicks(240), createDurationTicks(240)),
      MUSICAL_TIME_ERROR_CODES.outOfRange,
      "durationTicks",
    );
    expectError(
      () => addDurations(createDurationTicks(Number.MAX_SAFE_INTEGER), createDurationTicks(1)),
      MUSICAL_TIME_ERROR_CODES.arithmeticOverflow,
      "durationTicks",
    );
  });

  it("adds a duration to a position and compares positions", () => {
    const start = createMusicalPosition({
      bar: 0,
      beat: 3,
      tickWithinBeat: 720,
    });
    const end = addDurationToPosition(start, createDurationTicks(240));
    expect(end).toEqual({ bar: 1, beat: 0, tickWithinBeat: 0 });
    expect(comparePositions(start, end)).toBe(-1);
    expect(comparePositions(end, end)).toBe(0);
    expect(comparePositions(end, start)).toBe(1);
  });

  it("separates valid event starts from the valid section-end boundary", () => {
    const finalStart = tickToPosition(createTick(30_719));
    const sectionEnd = tickToPosition(createTick(30_720));
    expect(isEventStartPosition(finalStart)).toBe(true);
    expect(isEventStartPosition(sectionEnd)).toBe(false);
    expect(validateEventRange(finalStart, createDurationTicks(1))).toEqual({
      startTick: 30_719,
      endTick: 30_720,
    });
    expectError(
      () => validateEventRange(sectionEnd, createDurationTicks(1)),
      MUSICAL_TIME_ERROR_CODES.invalidEventRange,
      "event.startTick",
    );
    expectError(
      () => validateEventRange(finalStart, createDurationTicks(2)),
      MUSICAL_TIME_ERROR_CODES.invalidEventRange,
      "event",
    );
  });

  it("validates general signatures but only when their beat resolves at 960 PPQ", () => {
    expect(createTimeSignature(3, 8)).toEqual({ numerator: 3, denominator: 8 });
    expectError(
      () => createTimeSignature(4, 3),
      MUSICAL_TIME_ERROR_CODES.unsupportedTimeSignature,
      "timeSignature.denominator",
    );
    expectError(
      () => createTimeSignature(0, 4),
      MUSICAL_TIME_ERROR_CODES.outOfRange,
      "timeSignature.numerator",
    );
    expectError(
      () => createTimeSignature(4.5, 4),
      MUSICAL_TIME_ERROR_CODES.notInteger,
      "timeSignature.numerator",
    );
  });

  it("uses integer microseconds per quarter as canonical tempo", () => {
    expect(createTempoFromBpm(120)).toEqual({
      microsecondsPerQuarter: 500_000,
    });
    expect(createTempoFromBpm(123)).toEqual({
      microsecondsPerQuarter: 487_805,
    });
    expect(tempoToBpm(createTempoFromMicrosecondsPerQuarter(500_000))).toBe(120);
    expect(ticksToSeconds(createTick(1_920), createTempoFromBpm(120))).toBe(1);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects non-finite tempo %s",
    (value) => {
      expectError(() => createTempoFromBpm(value), MUSICAL_TIME_ERROR_CODES.notFinite, "tempo.bpm");
    },
  );

  it("rejects nonpositive tempo without imposing a product BPM range", () => {
    expectError(() => createTempoFromBpm(0), MUSICAL_TIME_ERROR_CODES.outOfRange, "tempo.bpm");
    expectError(() => createTempoFromBpm(-120), MUSICAL_TIME_ERROR_CODES.outOfRange, "tempo.bpm");
    expectError(
      () => createTempoFromMicrosecondsPerQuarter(0),
      MUSICAL_TIME_ERROR_CODES.outOfRange,
      "tempo.microsecondsPerQuarter",
    );
  });

  it("serializes primitives with stable schemas, field order, and units", () => {
    const position = createMusicalPosition({
      bar: 1,
      beat: 2,
      tickWithinBeat: 320,
    });
    const tempo = createTempoFromBpm(120);
    const signature = createTimeSignature(4, 4);

    expect(serializeTick(createTick(320))).toBe('{"schema":"nightdrive.tick.v1","ticks":320}');
    expect(serializeDurationTicks(createDurationTicks(640))).toBe(
      '{"schema":"nightdrive.duration-ticks.v1","ticks":640}',
    );
    expect(serializeMusicalPosition(position)).toBe(
      '{"schema":"nightdrive.musical-position.v1","bar":1,"beat":2,"tickWithinBeat":320}',
    );
    expect(serializeTempo(tempo)).toBe(
      '{"schema":"nightdrive.tempo.v1","microsecondsPerQuarter":500000}',
    );
    expect(serializeTimeSignature(signature)).toBe(
      '{"schema":"nightdrive.time-signature.v1","numerator":4,"denominator":4}',
    );

    const equivalentPosition = createMusicalPosition({
      tickWithinBeat: 320,
      beat: 2,
      bar: 1,
    });
    expect(serializeMusicalPosition(equivalentPosition)).toBe(serializeMusicalPosition(position));
  });
});
