import { describe, expect, it } from "vitest";
import {
  BASS_ERROR_CODES,
  BASS_V1_RANGE,
  BASS_V1_REGISTER_ANCHOR,
  BassValueError,
  createBassRange,
  getBassPitchCandidates,
  resolveFirstBassPitch,
  resolveSubsequentBassPitch,
  selectNearestBassPitch,
} from "./bass";
import { createMidiPitch, createPitchClass, pitchClassOf } from "./pitch";

function expectBassError(
  operation: () => unknown,
  code: BassValueError["code"],
  field: string,
): void {
  try {
    operation();
    throw new Error("Expected a BassValueError.");
  } catch (error) {
    expect(error).toBeInstanceOf(BassValueError);
    expect(error).toMatchObject({ code, field });
  }
}

describe("Bass V1 range", () => {
  it("exposes the frozen inclusive default range", () => {
    expect(BASS_V1_RANGE).toEqual({ minMidiPitch: 36, maxMidiPitch: 60 });
    expect(Object.isFrozen(BASS_V1_RANGE)).toBe(true);
    expect(createBassRange()).toEqual(BASS_V1_RANGE);
    expect(createBassRange({ minMidiPitch: 36, maxMidiPitch: 60 })).toEqual(BASS_V1_RANGE);
  });

  it.each([
    { minMidiPitch: 60, maxMidiPitch: 36 },
    { minMidiPitch: -1, maxMidiPitch: 60 },
    { minMidiPitch: 36, maxMidiPitch: 128 },
    { minMidiPitch: 36.5, maxMidiPitch: 60 },
  ])("rejects invalid range %#", (range) => {
    expectBassError(() => createBassRange(range), BASS_ERROR_CODES.invalidBassRange, "range");
  });
});

describe("Bass V1 root-pitch candidates", () => {
  it("derives frozen candidates for every chromatic root inside the inclusive range", () => {
    for (let root = 0; root < 12; root += 1) {
      const candidates = getBassPitchCandidates(createPitchClass(root));
      expect(Object.isFrozen(candidates)).toBe(true);
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.every((pitch) => pitchClassOf(pitch) === root)).toBe(true);
      expect(candidates.every((pitch) => pitch >= 36 && pitch <= 60)).toBe(true);
    }
  });

  it("includes legal lower and upper range boundaries", () => {
    expect(getBassPitchCandidates(createPitchClass(0))).toEqual([36, 48, 60]);
    expect(getBassPitchCandidates(createPitchClass(11))).toEqual([47, 59]);
  });

  it("rejects malformed root input and reports when a custom range has no legal root", () => {
    expectBassError(
      () => getBassPitchCandidates("0" as never),
      BASS_ERROR_CODES.invalidHarmonicContext,
      "root",
    );
    expectBassError(
      () =>
        getBassPitchCandidates(
          createPitchClass(1),
          createBassRange({ minMidiPitch: 36, maxMidiPitch: 36 }),
        ),
      BASS_ERROR_CODES.noLegalRootPitch,
      "root",
    );
  });
});

describe("Bass V1 deterministic root-pitch resolution", () => {
  it("uses the fixed first-event register anchor", () => {
    expect(BASS_V1_REGISTER_ANCHOR).toBe(43);
    expect(resolveFirstBassPitch(createPitchClass(0))).toBe(48);
    expect(resolveFirstBassPitch(createPitchClass(7))).toBe(43);
  });

  it("chooses the lower pitch for an equal-distance first-event tie", () => {
    expect(getBassPitchCandidates(createPitchClass(1))).toEqual([37, 49]);
    expect(resolveFirstBassPitch(createPitchClass(1))).toBe(37);
  });

  it("continues from the previous Bass pitch in either direction", () => {
    const root = createPitchClass(0);
    expect(resolveSubsequentBassPitch(root, createMidiPitch(40))).toBe(36);
    expect(resolveSubsequentBassPitch(root, createMidiPitch(55))).toBe(60);
    expect(resolveSubsequentBassPitch(root, createMidiPitch(50))).toBe(48);
  });

  it("keeps a B-root to C-root transition near the previous register", () => {
    const b = resolveFirstBassPitch(createPitchClass(11));
    expect(b).toBe(47);
    expect(resolveSubsequentBassPitch(createPitchClass(0), b)).toBe(48);
  });

  it("permits repeated roots to retain the same pitch", () => {
    expect(resolveSubsequentBassPitch(createPitchClass(0), createMidiPitch(48))).toBe(48);
  });

  it("uses the lower pitch for an equal-distance continuity tie", () => {
    expect(resolveSubsequentBassPitch(createPitchClass(1), createMidiPitch(43))).toBe(37);
  });

  it("is independent of candidate enumeration order", () => {
    const candidates = getBassPitchCandidates(createPitchClass(0));
    const target = createMidiPitch(43);
    expect(selectNearestBassPitch(candidates, target)).toBe(48);
    expect(selectNearestBassPitch([...candidates].reverse(), target)).toBe(48);
    expect(selectNearestBassPitch([48, 36, 60].map(createMidiPitch), target)).toBe(48);
    expect(selectNearestBassPitch([48, 36].map(createMidiPitch), createMidiPitch(42))).toBe(36);
  });

  it("returns the same result for repeated calls", () => {
    const root = createPitchClass(11);
    const previous = createMidiPitch(48);
    expect(resolveFirstBassPitch(root)).toBe(resolveFirstBassPitch(root));
    expect(resolveSubsequentBassPitch(root, previous)).toBe(
      resolveSubsequentBassPitch(root, previous),
    );
  });

  it("rejects an empty candidate set", () => {
    expectBassError(
      () => selectNearestBassPitch([], createMidiPitch(43)),
      BASS_ERROR_CODES.noLegalRootPitch,
      "candidates",
    );
  });
});
