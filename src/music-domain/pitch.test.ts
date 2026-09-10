import { describe, expect, it } from "vitest";
import {
  PITCH_ERROR_CODES,
  PitchValueError,
  compareMidiPitches,
  comparePitchClasses,
  createMidiPitch,
  createPitchClass,
  midiPitchesEqual,
  pitchClassOf,
  pitchClassesEqual,
  serializeMidiPitch,
  serializePitchClass,
} from "./pitch";

function expectPitchError(
  operation: () => unknown,
  code: PitchValueError["code"],
  field: string,
): void {
  try {
    operation();
    throw new Error("Expected a PitchValueError.");
  } catch (error) {
    expect(error).toBeInstanceOf(PitchValueError);
    expect(error).toMatchObject({ code, field });
  }
}

describe("PitchClass", () => {
  it("constructs and serializes exactly all twelve chromatic identities", () => {
    const values = Array.from({ length: 12 }, (_, value) => createPitchClass(value));

    expect(values).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    for (const pitchClass of values) {
      const expected = `{"schema":"nightdrive.pitch-class.v1","semitoneClass":${pitchClass}}`;
      expect(serializePitchClass(pitchClass)).toBe(expected);
      expect(serializePitchClass(pitchClass)).toBe(expected);
    }
  });

  it("provides validated equality and chromatic numeric ordering", () => {
    const zero = createPitchClass(0);
    const one = createPitchClass(1);
    expect(pitchClassesEqual(zero, createPitchClass(0))).toBe(true);
    expect(pitchClassesEqual(zero, one)).toBe(false);
    expect(comparePitchClasses(zero, one)).toBe(-1);
    expect(comparePitchClasses(one, one)).toBe(0);
    expect(comparePitchClasses(one, zero)).toBe(1);
  });

  it.each([-1, 12])("rejects out-of-range value %s without normalization", (value) => {
    expectPitchError(() => createPitchClass(value), PITCH_ERROR_CODES.outOfRange, "pitchClass");
  });

  it("rejects fractional and unsafe values", () => {
    expectPitchError(() => createPitchClass(1.5), PITCH_ERROR_CODES.notInteger, "pitchClass");
    expectPitchError(
      () => createPitchClass(Number.MAX_SAFE_INTEGER + 1),
      PITCH_ERROR_CODES.unsafeInteger,
      "pitchClass",
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects non-finite value %s",
    (value) => {
      expectPitchError(() => createPitchClass(value), PITCH_ERROR_CODES.notFinite, "pitchClass");
    },
  );
});

describe("MidiPitch", () => {
  it("constructs all 128 values and extracts their exact pitch classes", () => {
    const values = Array.from({ length: 128 }, (_, value) => createMidiPitch(value));

    expect(values).toHaveLength(128);
    for (const midiPitch of values) {
      expect(midiPitch).toBeGreaterThanOrEqual(0);
      expect(midiPitch).toBeLessThanOrEqual(127);
      expect(pitchClassOf(midiPitch)).toBe(midiPitch % 12);

      const expected = `{"schema":"nightdrive.midi-pitch.v1","midiNoteNumber":${midiPitch}}`;
      expect(serializeMidiPitch(midiPitch)).toBe(expected);
      expect(serializeMidiPitch(midiPitch)).toBe(expected);
    }
  });

  it.each([
    [0, 0],
    [11, 11],
    [12, 0],
    [60, 0],
    [127, 7],
  ])("maps MIDI %i to pitch class %i", (midiValue, pitchClass) => {
    expect(pitchClassOf(createMidiPitch(midiValue))).toBe(pitchClass);
  });

  it("provides validated equality and absolute numeric ordering", () => {
    const sixty = createMidiPitch(60);
    const sixtyOne = createMidiPitch(61);
    expect(midiPitchesEqual(sixty, createMidiPitch(60))).toBe(true);
    expect(midiPitchesEqual(sixty, sixtyOne)).toBe(false);
    expect(compareMidiPitches(sixty, sixtyOne)).toBe(-1);
    expect(compareMidiPitches(sixtyOne, sixtyOne)).toBe(0);
    expect(compareMidiPitches(sixtyOne, sixty)).toBe(1);
  });

  it.each([-1, 128])("rejects out-of-range value %s", (value) => {
    expectPitchError(() => createMidiPitch(value), PITCH_ERROR_CODES.outOfRange, "midiPitch");
  });

  it("rejects fractional and unsafe values", () => {
    expectPitchError(() => createMidiPitch(60.5), PITCH_ERROR_CODES.notInteger, "midiPitch");
    expectPitchError(
      () => createMidiPitch(Number.MAX_SAFE_INTEGER + 1),
      PITCH_ERROR_CODES.unsafeInteger,
      "midiPitch",
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects non-finite value %s",
    (value) => {
      expectPitchError(() => createMidiPitch(value), PITCH_ERROR_CODES.notFinite, "midiPitch");
    },
  );
});
