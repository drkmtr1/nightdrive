import { describe, expect, it } from "vitest";
import {
  CHORD_QUALITIES,
  chordQualitiesEqual,
  ChordQualityValueError,
  createChordQuality,
  getChordQualityFormula,
  serializeChordQuality,
} from "./index";

const expected = {
  "major-triad": [0, 4, 7],
  "minor-triad": [0, 3, 7],
  "diminished-triad": [0, 3, 6],
} as const;
const qualities = Object.values(CHORD_QUALITIES);

describe("canonical chord-quality primitive", () => {
  it.each(qualities)("constructs the exact %s formula", (quality) => {
    const value = createChordQuality(quality);
    const formula = getChordQualityFormula(value);
    expect(formula).toEqual(expected[quality]);
    expect(formula).toHaveLength(3);
    expect(formula[0]).toBe(0);
    expect(formula.every(Number.isInteger)).toBe(true);
    expect(formula.every((offset) => offset >= 0 && offset <= 11)).toBe(true);
    expect(new Set(formula).size).toBe(3);
    expect(formula[0] < formula[1] && formula[1] < formula[2]).toBe(true);
    expect(Object.isFrozen(formula)).toBe(true);
  });

  it("rejects non-canonical identities at runtime", () => {
    for (const value of [
      "",
      "MAJOR-TRIAD",
      "major",
      "minor",
      "dim",
      "maj",
      "min",
      "augmented-triad",
      null,
      undefined,
      1,
      {},
    ]) {
      expect(() => createChordQuality(value)).toThrowError(ChordQualityValueError);
    }
  });

  it("keeps formulas immutable and serialization stable", () => {
    const quality = createChordQuality("major-triad");
    const formula = getChordQualityFormula(quality);
    expect(Reflect.set(formula, 0, 9)).toBe(false);
    expect(getChordQualityFormula(quality)).toEqual([0, 4, 7]);
    expect(serializeChordQuality(quality)).toBe(
      '{"schema":"nightdrive.chord-quality.v1","quality":"major-triad","semitones":[0,4,7]}',
    );
    expect(serializeChordQuality(quality)).toBe(serializeChordQuality(quality));
  });

  it("compares every quality deterministically", () => {
    for (const quality of qualities) {
      const value = createChordQuality(quality);
      for (const other of qualities) {
        expect(chordQualitiesEqual(value, createChordQuality(other))).toBe(quality === other);
      }
    }
  });

  it.each(qualities)("serializes %s with only canonical fields", (quality) => {
    const parsed = JSON.parse(serializeChordQuality(createChordQuality(quality))) as Record<
      string,
      unknown
    >;
    expect(parsed).toEqual({
      schema: "nightdrive.chord-quality.v1",
      quality,
      semitones: expected[quality],
    });
    expect(parsed).not.toHaveProperty("root");
    expect(parsed).not.toHaveProperty("inversion");
    expect(parsed).not.toHaveProperty("voicing");
    expect(parsed).not.toHaveProperty("spelling");
    expect(parsed).not.toHaveProperty("extension");
    expect(parsed).not.toHaveProperty("displayName");
  });
});
