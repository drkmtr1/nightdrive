import { describe, expect, it } from "vitest";
import {
  createPitchClass,
  createScaleDegree,
  createScaleType,
  getScaleFormula,
  pitchClassAtScaleDegree,
  pitchClassesForScale,
  SCALE_TYPES,
  scaleContainsPitchClass,
  serializeScale,
  ScaleValueError,
} from "./index";

const expected = {
  major: [0, 2, 4, 5, 7, 9, 11],
  "natural-minor": [0, 2, 3, 5, 7, 8, 10],
  "harmonic-minor": [0, 2, 3, 5, 7, 8, 11],
  "melodic-minor": [0, 2, 3, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
} as const;
const types = Object.values(SCALE_TYPES);

describe("scale formula foundations", () => {
  it.each(types)("returns the exact %s formula", (scaleType) => {
    expect(getScaleFormula(scaleType)).toEqual(expected[scaleType]);
    expect(getScaleFormula(scaleType)).toHaveLength(7);
  });

  it("rejects unknown scale identities and protects formula immutability", () => {
    expect(() => createScaleType("mixolydian")).toThrowError(ScaleValueError);
    const formula = getScaleFormula("major");
    expect(Object.isFrozen(formula)).toBe(true);
    expect(serializeScale("major")).toBe(
      '{"schema":"nightdrive.scale.v1","scale":"major","semitones":[0,2,4,5,7,9,11]}',
    );
    expect(serializeScale("major")).toBe(serializeScale("major"));
  });

  it("derives all 72 tonic/scale contexts and exact membership", () => {
    for (const scaleType of types) {
      for (let tonic = 0; tonic < 12; tonic += 1) {
        const tonicClass = createPitchClass(tonic);
        const members = pitchClassesForScale(tonicClass, scaleType);
        expect(new Set(members).size).toBe(7);
        expect(members[0]).toBe(tonic);
        for (let degree = 0; degree < 7; degree += 1) {
          expect(pitchClassAtScaleDegree(tonicClass, scaleType, createScaleDegree(degree))).toBe(
            members[degree],
          );
        }
        for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
          expect(scaleContainsPitchClass(tonicClass, scaleType, createPitchClass(pitchClass))).toBe(
            members.includes(createPitchClass(pitchClass)),
          );
        }
      }
    }
  });

  it.each([
    -1,
    7,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
    -(Number.MAX_SAFE_INTEGER + 1),
  ])("rejects invalid scale degree %s", (degree) => {
    expect(() => createScaleDegree(degree)).toThrowError(ScaleValueError);
  });
});
