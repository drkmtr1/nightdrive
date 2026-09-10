import { describe, expect, it } from "vitest";
import {
  INTERVAL_ERROR_CODES,
  IntervalValueError,
  addIntervals,
  compareIntervals,
  createInterval,
  intervalBetweenMidiPitches,
  intervalsEqual,
  negateInterval,
  serializeInterval,
  subtractIntervals,
} from "./interval";
import { createMidiPitch } from "./pitch";

function expectIntervalError(
  operation: () => unknown,
  code: IntervalValueError["code"],
  field: string,
): void {
  try {
    operation();
    throw new Error("Expected an IntervalValueError.");
  } catch (error) {
    expect(error).toBeInstanceOf(IntervalValueError);
    expect(error).toMatchObject({ code, field });
  }
}

describe("Interval", () => {
  it("preserves signed and compound semitone values", () => {
    for (const value of [-19, -12, -7, -1, 0, 1, 7, 12, 19]) {
      const interval = createInterval(value);
      expect(interval).toBe(value);
      expect(serializeInterval(interval)).toBe(
        `{"schema":"nightdrive.interval.v1","semitones":${value}}`,
      );
    }
  });

  it("rejects non-finite, fractional, and unsafe values", () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expectIntervalError(
        () => createInterval(value),
        INTERVAL_ERROR_CODES.notFinite,
        "interval.semitones",
      );
    }
    expectIntervalError(
      () => createInterval(1.5),
      INTERVAL_ERROR_CODES.notInteger,
      "interval.semitones",
    );
    expectIntervalError(
      () => createInterval(Number.MAX_SAFE_INTEGER + 1),
      INTERVAL_ERROR_CODES.unsafeInteger,
      "interval.semitones",
    );
    expectIntervalError(
      () => createInterval(Number.MIN_SAFE_INTEGER - 1),
      INTERVAL_ERROR_CODES.unsafeInteger,
      "interval.semitones",
    );
  });

  it("provides equality, comparison, negation, addition, and subtraction", () => {
    const negativeSeven = createInterval(-7);
    const zero = createInterval(0);
    const seven = createInterval(7);

    expect(intervalsEqual(negativeSeven, createInterval(-7))).toBe(true);
    expect(intervalsEqual(negativeSeven, seven)).toBe(false);
    expect(compareIntervals(negativeSeven, zero)).toBe(-1);
    expect(compareIntervals(zero, zero)).toBe(0);
    expect(compareIntervals(seven, zero)).toBe(1);
    expect(negateInterval(negativeSeven)).toBe(7);
    expect(addIntervals(negativeSeven, seven)).toBe(0);
    expect(subtractIntervals(seven, negativeSeven)).toBe(14);
  });

  it("rejects safe-integer arithmetic overflow", () => {
    expectIntervalError(
      () => addIntervals(createInterval(Number.MAX_SAFE_INTEGER), createInterval(1)),
      INTERVAL_ERROR_CODES.arithmeticOverflow,
      "interval.semitones",
    );
    expectIntervalError(
      () => subtractIntervals(createInterval(Number.MIN_SAFE_INTEGER), createInterval(1)),
      INTERVAL_ERROR_CODES.arithmeticOverflow,
      "interval.semitones",
    );
  });

  it("satisfies signed interval algebra for representative safe values", () => {
    for (const value of [-19, -12, -7, -1, 0, 1, 7, 12, 19]) {
      const interval = createInterval(value);
      expect(negateInterval(negateInterval(interval))).toBe(interval);
      expect(addIntervals(interval, createInterval(0))).toBe(interval);
      expect(subtractIntervals(interval, interval)).toBe(0);
      expect(addIntervals(interval, negateInterval(interval))).toBe(0);
      expect(compareIntervals(interval, interval)).toBe(0);
    }
  });

  it("serializes repeatedly with the same signed schema", () => {
    const interval = createInterval(-12);
    const serialized = serializeInterval(interval);
    expect(serialized).toBe('{"schema":"nightdrive.interval.v1","semitones":-12}');
    expect(serializeInterval(interval)).toBe(serialized);
  });
});

describe("intervalBetweenMidiPitches", () => {
  it("computes directed absolute MIDI distance without transposition", () => {
    expect(intervalBetweenMidiPitches(createMidiPitch(60), createMidiPitch(67))).toBe(7);
    expect(intervalBetweenMidiPitches(createMidiPitch(67), createMidiPitch(60))).toBe(-7);
    expect(intervalBetweenMidiPitches(createMidiPitch(60), createMidiPitch(60))).toBe(0);
    expect(intervalBetweenMidiPitches(createMidiPitch(0), createMidiPitch(127))).toBe(127);
    expect(intervalBetweenMidiPitches(createMidiPitch(127), createMidiPitch(0))).toBe(-127);
  });

  it("exhaustively satisfies the MIDI pair relationship", () => {
    for (let from = 0; from <= 127; from += 1) {
      for (let to = 0; to <= 127; to += 1) {
        const directed = intervalBetweenMidiPitches(createMidiPitch(from), createMidiPitch(to));
        const reverse = intervalBetweenMidiPitches(createMidiPitch(to), createMidiPitch(from));
        expect(directed).toBe(to - from);
        expect(directed === -reverse).toBe(true);
      }
    }
  });
});
