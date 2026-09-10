import { describe, expect, it } from "vitest";
import {
  createKey,
  createPitchClass,
  createScaleDegree,
  createScaleType,
  keyContainsPitchClass,
  keysEqual,
  pitchClassAtKeyDegree,
  pitchClassesForKey,
  pitchClassesForScale,
  scaleContainsPitchClass,
  serializeKey,
  SCALE_TYPES,
  ScaleValueError,
} from "./index";

const scaleTypes = Object.values(SCALE_TYPES);

describe("canonical key primitive", () => {
  it.each([
    [0, "major", [0, 2, 4, 5, 7, 9, 11]],
    [9, "natural-minor", [9, 11, 0, 2, 4, 5, 7]],
    [0, "harmonic-minor", [0, 2, 3, 5, 7, 8, 11]],
    [2, "dorian", [2, 4, 5, 7, 9, 11, 0]],
    [4, "phrygian", [4, 5, 7, 9, 11, 0, 2]],
  ])("matches the numeric golden fixture %s/%s", (tonic, scale, expected) => {
    const key = createKey(createPitchClass(tonic), createScaleType(scale));
    expect(key.tonic).toBe(tonic);
    expect(key.scale).toBe(scale);
    expect(pitchClassesForKey(key)).toEqual(expected);
  });

  it("constructs every canonical key and delegates projection, degree, membership, equality, and serialization", () => {
    for (const scale of scaleTypes) {
      for (let tonic = 0; tonic < 12; tonic += 1) {
        const key = createKey(createPitchClass(tonic), scale);
        expect(key.tonic).toBe(tonic);
        expect(key.scale).toBe(scale);
        expect(Object.isFrozen(key)).toBe(true);
        expect(Reflect.set(key, "tonic", 11)).toBe(false);
        expect(Reflect.set(key, "scale", "dorian")).toBe(false);
        expect(key.tonic).toBe(tonic);
        expect(key.scale).toBe(scale);
        expect(pitchClassesForKey(key)).toEqual(pitchClassesForScale(key.tonic, key.scale));
        for (let degree = 0; degree < 7; degree += 1) {
          expect(pitchClassAtKeyDegree(key, createScaleDegree(degree))).toBe(
            pitchClassesForScale(key.tonic, key.scale)[degree],
          );
        }
        for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
          const pc = createPitchClass(pitchClass);
          expect(keyContainsPitchClass(key, pc)).toBe(
            scaleContainsPitchClass(key.tonic, key.scale, pc),
          );
        }
        expect(keysEqual(key, createKey(createPitchClass(tonic), scale))).toBe(true);
        expect(serializeKey(key)).toBe(serializeKey(key));
      }
    }
  });

  it("distinguishes tonic and scale identity without spelling semantics", () => {
    const cMajor = createKey(createPitchClass(0), "major");
    expect(keysEqual(cMajor, createKey(createPitchClass(0), "major"))).toBe(true);
    expect(keysEqual(cMajor, createKey(createPitchClass(1), "major"))).toBe(false);
    expect(keysEqual(cMajor, createKey(createPitchClass(0), "dorian"))).toBe(false);
    expect(keysEqual(cMajor, createKey(createPitchClass(0), "natural-minor"))).toBe(false);
  });

  it("serializes only the canonical key fields in fixed order", () => {
    const key = createKey(createPitchClass(9), "natural-minor");
    expect(serializeKey(key)).toBe(
      '{"schema":"nightdrive.key.v1","tonicSemitoneClass":9,"scale":"natural-minor"}',
    );
  });

  it("revalidates forged runtime components", () => {
    expect(() => createKey(12 as ReturnType<typeof createPitchClass>, "major")).toThrow();
    expect(() =>
      createKey(0 as ReturnType<typeof createPitchClass>, "mixolydian" as never),
    ).toThrow(ScaleValueError);
    expect(() => serializeKey({ tonic: 12 as never, scale: "major" as never })).toThrow();
  });
});
