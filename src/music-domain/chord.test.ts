import { describe, expect, it } from "vitest";
import { CHORD_QUALITIES, createChordQuality, getChordQualityFormula } from "./chord-quality";
import { chordsEqual, createChord, getChordPitchClasses, serializeChord } from "./chord";
import { createPitchClass, type PitchClass } from "./pitch";

const qualities = Object.values(CHORD_QUALITIES);
const chords = Array.from({ length: 12 }, (_, root) =>
  qualities.map((quality) => createChord(createPitchClass(root), createChordQuality(quality))),
).flat();

describe("Chord", () => {
  it.each([
    [0, "major-triad", [0, 4, 7]],
    [9, "minor-triad", [9, 0, 4]],
    [11, "diminished-triad", [11, 2, 5]],
  ] as const)("derives the canonical membership for root %i %s", (root, quality, expected) => {
    const chord = createChord(createPitchClass(root), createChordQuality(quality));
    expect(getChordPitchClasses(chord)).toEqual(expected);
  });

  it("constructs every canonical chord as an immutable two-field identity", () => {
    for (const chord of chords) {
      expect(Object.isFrozen(chord)).toBe(true);
      expect(Reflect.set(chord, "root", createPitchClass(0))).toBe(false);
      expect(Reflect.set(chord, "quality", qualities[0])).toBe(false);
      expect(chord).toEqual(createChord(chord.root, chord.quality));
    }
  });

  it("derives and freezes all 36 memberships modulo 12", () => {
    for (const chord of chords) {
      const members = getChordPitchClasses(chord);
      const expected = getChordQualityFormula(chord.quality).map((offset) =>
        createPitchClass((chord.root + offset) % 12),
      );
      expect(members).toEqual(expected);
      expect(Object.isFrozen(members)).toBe(true);
      expect(Reflect.set(members, 0, createPitchClass(0))).toBe(false);
      expect(getChordPitchClasses(chord)).toEqual(expected);
    }
  });

  it("rejects forged or invalid runtime values", () => {
    for (const root of [
      -1,
      12,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(() => createChord(root as PitchClass, createChordQuality(qualities[0]))).toThrow();
    }
    expect(() => createChord(createPitchClass(0), "major" as never)).toThrow();
    const valid = chords[0];
    expect(() =>
      chordsEqual({ root: 12 as never, quality: qualities[0] as never }, valid),
    ).toThrow();
    expect(() => serializeChord({ root: 12 as never, quality: qualities[0] as never })).toThrow();
  });

  it("checks all ordered equality pairs by canonical identity", () => {
    for (const left of chords) {
      for (const right of chords) {
        expect(chordsEqual(left, right)).toBe(
          left.root === right.root && left.quality === right.quality,
        );
      }
    }
  });

  it("serializes every chord with a fixed minimal schema", () => {
    for (const chord of chords) {
      const serialized = serializeChord(chord);
      expect(serializeChord(chord)).toBe(serialized);
      const parsed = JSON.parse(serialized) as Record<string, unknown>;
      expect(Object.keys(parsed)).toEqual(["schema", "rootSemitoneClass", "quality"]);
      expect(parsed).toEqual({
        schema: "nightdrive.chord.v1",
        rootSemitoneClass: chord.root,
        quality: chord.quality,
      });
      expect(parsed).not.toHaveProperty("members");
      expect(parsed).not.toHaveProperty("extensions");
      expect(parsed).not.toHaveProperty("inversion");
      expect(parsed).not.toHaveProperty("voicing");
      expect(parsed).not.toHaveProperty("spelling");
    }
  });
});
