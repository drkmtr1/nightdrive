import { describe, expect, it, vi } from "vitest";
import {
  ARP_ERROR_CODES,
  ArpValueError,
  createArpRange,
  deriveArpSlotCandidates,
} from "./arpeggiator";
import { createChordInversion } from "./chord-inversion";
import { createChordVoicing } from "./chord-voicing";
import {
  enumerateChordVoicingCandidates,
  getHarmonyTemplate,
  HARMONY_PROFILE_IDS,
  realizeHarmonyProgression,
  type HarmonyProgressionRealization,
} from "./harmony";
import * as musicDomain from "./index";
import { createKey } from "./key";
import { createMidiPitch, createPitchClass } from "./pitch";

function validProgression(): HarmonyProgressionRealization {
  return realizeHarmonyProgression(
    HARMONY_PROFILE_IDS.classicSynthwave,
    getHarmonyTemplate("degree-0344-major-v1"),
    createKey(createPitchClass(0), "major"),
  );
}

function progressionWithFirstVoicing(
  progression: HarmonyProgressionRealization,
  inversion: number,
  pitches: readonly number[],
): HarmonyProgressionRealization {
  return {
    ...progression,
    slots: Object.freeze(
      progression.slots.map((slot, index) =>
        index === 0
          ? Object.freeze({
              ...slot,
              inversion: createChordInversion(inversion),
              voicing: createChordVoicing(pitches.map(createMidiPitch)),
            })
          : slot,
      ),
    ),
  };
}

function expectArpError(
  operation: () => unknown,
  code: ArpValueError["code"],
  field: string,
): void {
  try {
    operation();
    throw new Error("Expected an ArpValueError.");
  } catch (error) {
    expect(error).toBeInstanceOf(ArpValueError);
    expect(error).toMatchObject({ code, field });
  }
}

function findRangeForFirstSlotCount(
  progression: HarmonyProgressionRealization,
  count: number,
): ReturnType<typeof createArpRange> {
  for (let minimum = 0; minimum <= 127; minimum += 1) {
    for (let maximum = minimum; maximum <= 127; maximum += 1) {
      const retained = progression.slots.map((slot) =>
        slot.voicing.midiPitches.filter((pitch) => pitch >= minimum && pitch <= maximum),
      );
      if (retained[0].length === count && retained.every((pitches) => pitches.length > 0)) {
        return createArpRange({ minMidiPitch: minimum, maxMidiPitch: maximum });
      }
    }
  }
  throw new Error(`No valid range retains ${count} first-slot pitches.`);
}

function findRangeWithLaterEmptySlot(progression: HarmonyProgressionRealization): {
  readonly range: ReturnType<typeof createArpRange>;
  readonly emptySlotIndex: number;
} {
  for (let minimum = 0; minimum <= 127; minimum += 1) {
    for (let maximum = minimum; maximum <= 127; maximum += 1) {
      const retained = progression.slots.map((slot) =>
        slot.voicing.midiPitches.filter((pitch) => pitch >= minimum && pitch <= maximum),
      );
      const emptySlotIndex = retained.findIndex(
        (pitches, index) => index > 0 && pitches.length === 0,
      );
      if (retained[0].length > 0 && emptySlotIndex > 0) {
        return {
          range: createArpRange({ minMidiPitch: minimum, maxMidiPitch: maximum }),
          emptySlotIndex,
        };
      }
    }
  }
  throw new Error("No valid range retains the first slot while emptying a later slot.");
}

describe("Stage 7B1 Arp range", () => {
  it("creates a frozen inclusive MIDI range and exports the bounded API", () => {
    const range = createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 });
    expect(range).toEqual({ minMidiPitch: 0, maxMidiPitch: 127 });
    expect(Object.isFrozen(range)).toBe(true);
    expect(Object.hasOwn(musicDomain, "createArpRange")).toBe(true);
    expect(Object.hasOwn(musicDomain, "deriveArpSlotCandidates")).toBe(true);
    expect(Object.hasOwn(musicDomain, "generateArpEvents")).toBe(false);
  });

  it("rejects reversed, malformed, and forged bounds with stable fields", () => {
    expectArpError(
      () => createArpRange({ minMidiPitch: 80, maxMidiPitch: 40 }),
      ARP_ERROR_CODES.invalidArpRange,
      "range",
    );
    for (const minimum of ["40", null, undefined, {}, -1, 1.5, Number.POSITIVE_INFINITY]) {
      expectArpError(
        () => createArpRange({ minMidiPitch: minimum, maxMidiPitch: 80 }),
        ARP_ERROR_CODES.invalidArpRange,
        "range.minMidiPitch",
      );
    }
    for (const maximum of ["80", null, undefined, {}, 128, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expectArpError(
        () => createArpRange({ minMidiPitch: 40, maxMidiPitch: maximum }),
        ARP_ERROR_CODES.invalidArpRange,
        "range.maxMidiPitch",
      );
    }
    for (const value of [null, undefined, [], "range", 48]) {
      expectArpError(() => createArpRange(value), ARP_ERROR_CODES.invalidArpRange, "range");
    }
  });
});

describe("Stage 7B1 selected-voicing candidate derivation", () => {
  it("returns one frozen ordered candidate result per Harmony slot", () => {
    const progression = validProgression();
    const result = deriveArpSlotCandidates(
      progression,
      createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 }),
    );

    expect(result).toHaveLength(progression.slots.length);
    expect(result.map((slot) => slot.slotIndex)).toEqual([0, 1, 2, 3]);
    expect(result.map((slot) => slot.pitches)).toEqual(
      progression.slots.map((slot) => slot.voicing.midiPitches),
    );
    expect(Object.isFrozen(result)).toBe(true);
    expect(result.every((slot) => Object.isFrozen(slot) && Object.isFrozen(slot.pitches))).toBe(
      true,
    );
  });

  it("includes both range boundaries and retains exact one, two, or three pitches", () => {
    const progression = validProgression();
    const [low, middle, high] = progression.slots[0].voicing.midiPitches;

    expect(
      deriveArpSlotCandidates(
        progression,
        createArpRange({ minMidiPitch: low, maxMidiPitch: 127 }),
      )[0].pitches,
    ).toContain(low);
    expect(
      deriveArpSlotCandidates(
        progression,
        createArpRange({ minMidiPitch: 0, maxMidiPitch: high }),
      )[0].pitches,
    ).toContain(high);

    for (const count of [1, 2, 3]) {
      const range = findRangeForFirstSlotCount(progression, count);
      const pitches = deriveArpSlotCandidates(progression, range)[0].pitches;
      expect(pitches).toHaveLength(count);
      expect(pitches).toEqual(
        progression.slots[0].voicing.midiPitches.filter(
          (pitch) => pitch >= range.minMidiPitch && pitch <= range.maxMidiPitch,
        ),
      );
    }
    expect([low, middle, high]).toEqual([...progression.slots[0].voicing.midiPitches]);
  });

  it("uses changed and inverted Harmony voicings exactly without revoicing", () => {
    const progression = validProgression();
    const alternatives = enumerateChordVoicingCandidates(
      progression.slots[0].chord,
      progression.profile,
    );
    const inverted = alternatives.find(
      (candidate) =>
        candidate.inversion !== progression.slots[0].inversion &&
        candidate.voicing.midiPitches.some(
          (pitch, index) => pitch !== progression.slots[0].voicing.midiPitches[index],
        ),
    );
    expect(inverted).toBeDefined();
    const changed = progressionWithFirstVoicing(
      progression,
      inverted?.inversion ?? 1,
      inverted?.voicing.midiPitches ?? [],
    );

    const original = deriveArpSlotCandidates(
      progression,
      createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 }),
    );
    const result = deriveArpSlotCandidates(
      changed,
      createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 }),
    );
    expect(result[0].pitches).toEqual(inverted?.voicing.midiPitches);
    expect(result[0].pitches).not.toEqual(original[0].pitches);
  });

  it("never introduces octave equivalents, clamps, or widens the range", () => {
    const progression = validProgression();
    const range = findRangeForFirstSlotCount(progression, 1);
    const result = deriveArpSlotCandidates(progression, range);

    for (const [index, slot] of result.entries()) {
      const source = progression.slots[index].voicing.midiPitches;
      expect(slot.pitches.every((pitch) => source.includes(pitch))).toBe(true);
      expect(
        slot.pitches.every((pitch) => pitch >= range.minMidiPitch && pitch <= range.maxMidiPitch),
      ).toBe(true);
      for (const pitch of slot.pitches) {
        expect(slot.pitches).not.toContain(pitch + 12);
        expect(slot.pitches).not.toContain(pitch - 12);
      }
    }
  });

  it("fails the whole operation when any slot has no legal pitch", () => {
    const progression = validProgression();
    const { range, emptySlotIndex } = findRangeWithLaterEmptySlot(progression);
    expectArpError(
      () => deriveArpSlotCandidates(progression, range),
      ARP_ERROR_CODES.noLegalArpPitch,
      `progression.slots[${emptySlotIndex}].voicing.midiPitches`,
    );
  });

  it("rejects malformed progression identities and ordered slot structure", () => {
    const progression = validProgression();
    const sparseSlots: unknown[] = [];
    sparseSlots.length = progression.slots.length;
    const malformed = [
      null,
      {},
      { ...progression, profile: "unknown" },
      { ...progression, templateId: "unknown" },
      { ...progression, templateVersion: "v2" },
      { ...progression, key: null },
      { ...progression, slots: [] },
      { ...progression, slots: sparseSlots },
      {
        ...progression,
        slots: progression.slots.map((slot, index) => ({ ...slot, index: index + 1 })),
      },
      {
        ...progression,
        slots: progression.slots.map((slot, index) =>
          index === 0 ? { ...slot, bars: slot.bars + 1 } : slot,
        ),
      },
      {
        ...progression,
        slots: progression.slots.map((slot, index) =>
          index === 0 ? { ...slot, degree: 8 } : slot,
        ),
      },
      {
        ...progression,
        slots: progression.slots.map((slot, index) =>
          index === 0 ? { ...slot, chord: { ...slot.chord, root: "0" } } : slot,
        ),
      },
      {
        ...progression,
        slots: progression.slots.map((slot, index) =>
          index === 0 ? { ...slot, inversion: 3 } : slot,
        ),
      },
    ];

    for (const value of malformed) {
      expect(() =>
        deriveArpSlotCandidates(
          value as HarmonyProgressionRealization,
          createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 }),
        ),
      ).toThrow(ArpValueError);
    }
  });

  it("rejects malformed and incompatible selected voicings", () => {
    const progression = validProgression();
    const malformed = {
      ...progression,
      slots: progression.slots.map((slot, index) =>
        index === 0 ? { ...slot, voicing: { midiPitches: [48, 48, 55] } } : slot,
      ),
    } as HarmonyProgressionRealization;
    expectArpError(
      () =>
        deriveArpSlotCandidates(malformed, createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 })),
      ARP_ERROR_CODES.invalidHarmonicContext,
      "progression.slots[0].voicing",
    );

    const incompatible = progressionWithFirstVoicing(progression, 0, [48, 51, 55]);
    expectArpError(
      () =>
        deriveArpSlotCandidates(
          incompatible,
          createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 }),
        ),
      ARP_ERROR_CODES.invalidHarmonicContext,
      "progression.slots[0].voicing",
    );
  });

  it("is deterministic, mutation-safe, and independent of ambient randomness", () => {
    const progression = validProgression();
    const range = createArpRange({ minMidiPitch: 40, maxMidiPitch: 88 });
    const before = JSON.stringify({ progression, range });
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is prohibited");
    });

    try {
      const first = deriveArpSlotCandidates(progression, range);
      const second = deriveArpSlotCandidates(progression, range);
      expect(second).toEqual(first);
      expect(JSON.stringify({ progression, range })).toBe(before);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});
