import { describe, expect, it } from "vitest";
import {
  BASS_ERROR_CODES,
  BASS_V1_RANGE,
  BASS_V1_REGISTER_ANCHOR,
  BassValueError,
  createBassRange,
  generateBassEvents,
  getBassPitchCandidates,
  resolveFirstBassPitch,
  resolveSubsequentBassPitch,
} from "./bass";
import {
  getHarmonyTemplate,
  HARMONY_PROFILE_IDS,
  realizeHarmonyProgression,
  type HarmonyProgressionRealization,
} from "./harmony";
import * as musicDomain from "./index";
import { createKey } from "./key";
import { createMidiPitch, createPitchClass, pitchClassOf } from "./pitch";

function validProgression(): HarmonyProgressionRealization {
  return realizeHarmonyProgression(
    HARMONY_PROFILE_IDS.darkSynthwave,
    getHarmonyTemplate("degree-0654-natural-minor-v1"),
    createKey(createPitchClass(0), "natural-minor"),
  );
}

function progressionWithRoots(
  progression: HarmonyProgressionRealization,
  roots: readonly (number | undefined)[],
): HarmonyProgressionRealization {
  return {
    ...progression,
    slots: Object.freeze(
      progression.slots.map((slot, index) => {
        const root = roots[index];
        if (root === undefined) return slot;
        return Object.freeze({
          ...slot,
          chord: Object.freeze({ ...slot.chord, root: createPitchClass(root) }),
        });
      }),
    ),
  };
}

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

  it("keeps canonical public resolution deterministic across repeated calls", () => {
    // The generic selector is private by design; public callers provide roots and ranges,
    // so canonical candidate derivation remains the only supported input surface.
    for (let root = 0; root < 12; root += 1) {
      const canonicalRoot = createPitchClass(root);
      const first = resolveFirstBassPitch(canonicalRoot);
      const previous = createMidiPitch(43);
      expect(resolveFirstBassPitch(canonicalRoot)).toBe(first);
      expect(resolveSubsequentBassPitch(canonicalRoot, previous)).toBe(
        resolveSubsequentBassPitch(canonicalRoot, previous),
      );
    }
  });

  it("does not expose the low-level generic selector through the public barrel", () => {
    expect(Object.hasOwn(musicDomain, "selectNearestBassPitch")).toBe(false);
  });

  it("returns the same result for repeated calls", () => {
    const root = createPitchClass(11);
    const previous = createMidiPitch(48);
    expect(resolveFirstBassPitch(root)).toBe(resolveFirstBassPitch(root));
    expect(resolveSubsequentBassPitch(root, previous)).toBe(
      resolveSubsequentBassPitch(root, previous),
    );
  });
});

describe("Bass V1 Harmony-slot event generation", () => {
  it("emits one frozen slot-aligned event per Harmony slot", () => {
    const progression = validProgression();
    const before = JSON.stringify(progression);
    const events = generateBassEvents(progression);

    expect(events).toHaveLength(progression.slots.length);
    expect(Object.isFrozen(events)).toBe(true);
    expect(events.every((event) => Object.isFrozen(event))).toBe(true);
    expect(Object.keys(events[0])).toEqual(["pitch", "startTick", "durationTicks"]);
    expect(events.map(({ startTick, durationTicks }) => [startTick, durationTicks])).toEqual([
      [0, 7_680],
      [7_680, 7_680],
      [15_360, 7_680],
      [23_040, 7_680],
    ]);
    expect(events.every((event) => event.durationTicks > 0)).toBe(true);
    expect(events.every((event) => event.startTick + event.durationTicks <= 30_720)).toBe(true);
    expect(JSON.stringify(progression)).toBe(before);
  });

  it("uses the Stage 6A1 anchor, continuity, and root-membership policy", () => {
    const progression = validProgression();
    const events = generateBassEvents(progression);

    expect(events.map((event) => event.pitch)).toEqual([48, 46, 44, 43]);
    expect(
      events.every(
        (event, index) => pitchClassOf(event.pitch) === progression.slots[index].chord.root,
      ),
    ).toBe(true);
    expect(generateBassEvents(progression)).toEqual(events);
  });

  it("consumes only ordered slot bars and chord roots from validated Harmony output", () => {
    const progression = validProgression();
    const bassProjection = {
      slots: progression.slots.map((slot) => ({
        bars: slot.bars,
        chord: { root: slot.chord.root },
      })),
    };

    expect(generateBassEvents(bassProjection as never)).toEqual(generateBassEvents(progression));
  });

  it("keeps a B-to-C transition near the prior register", () => {
    const progression = progressionWithRoots(validProgression(), [11, 0]);
    const events = generateBassEvents(progression);

    expect(events.slice(0, 2).map((event) => event.pitch)).toEqual([47, 48]);
  });

  it("permits repeated roots and preserves nearest continuity in either direction", () => {
    const progression = progressionWithRoots(validProgression(), [0, 0, 7, 8]);
    const events = generateBassEvents(progression);

    expect(events.map((event) => event.pitch)).toEqual([48, 48, 43, 44]);
  });

  it("applies the lower-pitch continuity tie through event generation", () => {
    const progression = progressionWithRoots(validProgression(), [6, 0]);
    const events = generateBassEvents(progression);

    expect(events.slice(0, 2).map((event) => event.pitch)).toEqual([42, 36]);
  });

  it("mirrors arbitrary positive slot bar spans to the section boundary", () => {
    const progression = validProgression();
    const variableBars = {
      ...progression,
      slots: Object.freeze(
        progression.slots.map((slot, index) =>
          Object.freeze({ ...slot, bars: [1, 2, 3, 2][index] }),
        ),
      ),
    } as HarmonyProgressionRealization;
    const events = generateBassEvents(variableBars);

    expect(events.map(({ startTick, durationTicks }) => [startTick, durationTicks])).toEqual([
      [0, 3_840],
      [3_840, 7_680],
      [11_520, 11_520],
      [23_040, 7_680],
    ]);
    expect(events[3].startTick + events[3].durationTicks).toBe(30_720);
  });

  it("rejects malformed harmonic context and timing", () => {
    const progression = validProgression();
    expectBassError(
      () => generateBassEvents(null as never),
      BASS_ERROR_CODES.invalidHarmonicContext,
      "progression",
    );
    expectBassError(
      () => generateBassEvents({ ...progression, slots: [] } as never),
      BASS_ERROR_CODES.invalidHarmonicContext,
      "progression.slots",
    );
    expectBassError(
      () =>
        generateBassEvents({
          ...progression,
          slots: [
            { ...progression.slots[0], chord: { root: "0", quality: "major-triad" } },
            ...progression.slots.slice(1),
          ],
        } as never),
      BASS_ERROR_CODES.invalidHarmonicContext,
      "progression.slots[0].chord.root",
    );
    for (const bars of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expectBassError(
        () =>
          generateBassEvents({
            ...progression,
            slots: [{ ...progression.slots[0], bars }, ...progression.slots.slice(1)],
          } as never),
        BASS_ERROR_CODES.invalidBassTiming,
        "progression.slots[0].bars",
      );
    }
    expectBassError(
      () =>
        generateBassEvents({
          ...progression,
          slots: progression.slots.map((slot) => ({ ...slot, bars: 1 })),
        } as never),
      BASS_ERROR_CODES.invalidBassTiming,
      "progression.slots",
    );
  });

  it("propagates no-legal-root failure for a range without the slot root", () => {
    expectBassError(
      () =>
        generateBassEvents(
          validProgression(),
          createBassRange({ minMidiPitch: 37, maxMidiPitch: 37 }),
        ),
      BASS_ERROR_CODES.noLegalRootPitch,
      "progression.slots[0].chord.root",
    );
  });
});
