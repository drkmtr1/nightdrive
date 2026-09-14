import { describe, expect, it, vi } from "vitest";
import {
  ARP_DIRECTION_IDS,
  ARP_ERROR_CODES,
  ARP_RATE_IDS,
  type ArpTraversalParametersV1,
  ArpValueError,
  createArpRange,
  deriveArpSlotCandidates,
  generateArpEvents,
} from "./arpeggiator";
import { createChordInversion } from "./chord-inversion";
import { createChordVoicing } from "./chord-voicing";
import {
  enumerateChordVoicingCandidates,
  getHarmonyTemplate,
  HARMONY_PROFILE_IDS,
  type HarmonyProgressionRealization,
  realizeHarmonyProgression,
} from "./harmony";
import * as musicDomain from "./index";
import { createKey } from "./key";
import {
  createDurationTicks,
  SUBDIVISION_TICKS,
  V1_SECTION_LENGTH_TICKS,
  V1_TICKS_PER_BAR,
} from "./musical-time";
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
    expect(Object.hasOwn(musicDomain, "generateArpEvents")).toBe(true);
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

describe("Stage 7B2 simple canonical event projection", () => {
  it("emits the exact frozen event shape on the fixed eighth grid through the section end", () => {
    const progression = validProgression();
    const range = createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 });
    const candidates = deriveArpSlotCandidates(progression, range);
    const events = generateArpEvents(progression, range);

    expect(events).toHaveLength(64);
    expect(events[0]).toEqual({
      pitch: candidates[0].pitches[0],
      startTick: 0,
      durationTicks: SUBDIVISION_TICKS.eighth,
    });
    expect(Object.keys(events[0])).toEqual(["pitch", "startTick", "durationTicks"]);
    expect(events.map((event) => event.startTick)).toEqual(
      Array.from({ length: 64 }, (_, index) => index * SUBDIVISION_TICKS.eighth),
    );
    expect(events.at(-1)).toEqual({
      pitch: candidates.at(-1)?.pitches[15 % (candidates.at(-1)?.pitches.length ?? 1)],
      startTick: 30_240,
      durationTicks: SUBDIVISION_TICKS.eighth,
    });
    expect((events.at(-1)?.startTick ?? 0) + (events.at(-1)?.durationTicks ?? 0)).toBe(
      V1_SECTION_LENGTH_TICKS,
    );
    expect(events.every((event) => event.durationTicks === 480 && Object.isFrozen(event))).toBe(
      true,
    );
    expect(Object.isFrozen(events)).toBe(true);
  });

  it("cycles upward for exact one-, two-, and three-candidate sets", () => {
    const progression = validProgression();
    const firstSlotEnd = progression.slots[0].bars * V1_TICKS_PER_BAR;

    for (const count of [1, 2, 3]) {
      const range = findRangeForFirstSlotCount(progression, count);
      const candidates = deriveArpSlotCandidates(progression, range)[0].pitches;
      const events = generateArpEvents(progression, range).filter(
        (event) => event.startTick < firstSlotEnd,
      );

      expect(candidates).toHaveLength(count);
      expect(events.slice(0, 7).map((event) => event.pitch)).toEqual(
        Array.from({ length: 7 }, (_, index) => candidates[index % candidates.length]),
      );
      expect(events[0]).not.toBe(events[1]);
    }
  });

  it("resets traversal and preserves exact candidate, slot, and section boundaries", () => {
    const progression = validProgression();
    const range = createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 });
    const candidates = deriveArpSlotCandidates(progression, range);
    const events = generateArpEvents(progression, range);
    let slotStart = 0;

    expect(progression.slots.map((slot) => slot.bars)).toEqual([2, 2, 2, 2]);
    expect(
      progression.slots.map((slot) => {
        const boundary = [slotStart, slotStart + slot.bars * V1_TICKS_PER_BAR];
        slotStart = boundary[1];
        return boundary;
      }),
    ).toEqual([
      [0, 7_680],
      [7_680, 15_360],
      [15_360, 23_040],
      [23_040, 30_720],
    ]);
    slotStart = 0;
    for (const [index, slot] of progression.slots.entries()) {
      const slotEnd = slotStart + slot.bars * V1_TICKS_PER_BAR;
      const slotEvents = events.filter(
        (event) => event.startTick >= slotStart && event.startTick < slotEnd,
      );

      expect(slotEvents).toHaveLength((slot.bars * V1_TICKS_PER_BAR) / 480);
      expect(slotEvents[0].startTick).toBe(slotStart);
      expect(slotEvents[0].pitch).toBe(candidates[index].pitches[0]);
      expect(slotEvents.map((event) => event.pitch)).toEqual(
        slotEvents.map(
          (_, eventIndex) =>
            candidates[index].pitches[eventIndex % candidates[index].pitches.length],
        ),
      );
      expect(
        slotEvents.every(
          (event) =>
            candidates[index].pitches.includes(event.pitch) &&
            event.startTick >= slotStart &&
            event.startTick < slotEnd &&
            event.startTick + event.durationTicks <= slotEnd &&
            event.startTick + event.durationTicks <= V1_SECTION_LENGTH_TICKS,
        ),
      ).toBe(true);
      slotStart = slotEnd;
    }

    expect(slotStart).toBe(V1_SECTION_LENGTH_TICKS);
    expect(events.every((event) => event.startTick < V1_SECTION_LENGTH_TICKS)).toBe(true);
  });

  it("preserves Stage 7B1 whole-operation range failure semantics", () => {
    const progression = validProgression();
    const { range, emptySlotIndex } = findRangeWithLaterEmptySlot(progression);

    expectArpError(
      () => generateArpEvents(progression, range),
      ARP_ERROR_CODES.noLegalArpPitch,
      `progression.slots[${emptySlotIndex}].voicing.midiPitches`,
    );
  });

  it("is replay-stable, input-safe, and isolated from ambient randomness", () => {
    const progression = validProgression();
    const range = createArpRange({ minMidiPitch: 40, maxMidiPitch: 88 });
    const before = JSON.stringify({ progression, range });
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is prohibited");
    });

    try {
      const first = generateArpEvents(progression, range);
      const second = generateArpEvents(progression, range);
      expect(second).toEqual(first);
      expect(JSON.stringify({ progression, range })).toBe(before);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});

describe("Stage 7B3 rate and direction expansion", () => {
  const fullRange = () => createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 });
  const runtimeParameters = (value: unknown): ArpTraversalParametersV1 =>
    value as ArpTraversalParametersV1;

  it.each([
    [ARP_RATE_IDS.quarter, SUBDIVISION_TICKS.quarter, 32],
    [ARP_RATE_IDS.eighth, SUBDIVISION_TICKS.eighth, 64],
    [ARP_RATE_IDS.sixteenth, SUBDIVISION_TICKS.sixteenth, 128],
  ] as const)(
    "projects the %s rate at %i ticks for %i exact section events",
    (rate, expectedTicks, expectedCount) => {
      const progression = validProgression();
      const events = generateArpEvents(progression, fullRange(), {
        rate,
        direction: ARP_DIRECTION_IDS.up,
      });
      let slotStartTick = 0;

      expect(events).toHaveLength(expectedCount);
      expect(events.map((event) => event.startTick)).toEqual(
        Array.from({ length: expectedCount }, (_, index) => index * expectedTicks),
      );
      expect(events.every((event) => event.durationTicks === expectedTicks)).toBe(true);
      expect((events.at(-1)?.startTick ?? 0) + (events.at(-1)?.durationTicks ?? 0)).toBe(
        V1_SECTION_LENGTH_TICKS,
      );

      for (const slot of progression.slots) {
        const slotEndTick = slotStartTick + slot.bars * V1_TICKS_PER_BAR;
        expect(
          events
            .filter((event) => event.startTick >= slotStartTick && event.startTick < slotEndTick)
            .every((event) => event.startTick + event.durationTicks <= slotEndTick),
        ).toBe(true);
        slotStartTick = slotEndTick;
      }
      expect(slotStartTick).toBe(V1_SECTION_LENGTH_TICKS);
      expect(events.every((event) => event.startTick < V1_SECTION_LENGTH_TICKS)).toBe(true);
    },
  );

  it.each([
    [ARP_DIRECTION_IDS.up, 1, [0]],
    [ARP_DIRECTION_IDS.down, 1, [0]],
    [ARP_DIRECTION_IDS.upDown, 1, [0]],
    [ARP_DIRECTION_IDS.downUp, 1, [0]],
    [ARP_DIRECTION_IDS.up, 2, [0, 1]],
    [ARP_DIRECTION_IDS.down, 2, [1, 0]],
    [ARP_DIRECTION_IDS.upDown, 2, [0, 1]],
    [ARP_DIRECTION_IDS.downUp, 2, [1, 0]],
    [ARP_DIRECTION_IDS.up, 3, [0, 1, 2]],
    [ARP_DIRECTION_IDS.down, 3, [2, 1, 0]],
    [ARP_DIRECTION_IDS.upDown, 3, [0, 1, 2, 1]],
    [ARP_DIRECTION_IDS.downUp, 3, [2, 1, 0, 1]],
  ] as const)(
    "repeats the exact %s cycle for %i retained candidates",
    (direction, count, cycle) => {
      const progression = validProgression();
      const range = findRangeForFirstSlotCount(progression, count);
      const candidates = deriveArpSlotCandidates(progression, range)[0].pitches;
      const firstSlotEnd = progression.slots[0].bars * V1_TICKS_PER_BAR;
      const events = generateArpEvents(progression, range, {
        rate: ARP_RATE_IDS.eighth,
        direction,
      }).filter((event) => event.startTick < firstSlotEnd);
      const prefixLength = cycle.length * 2 + 1;

      expect(candidates).toHaveLength(count);
      expect(events.slice(0, prefixLength).map((event) => event.pitch)).toEqual(
        Array.from({ length: prefixLength }, (_, index) => candidates[cycle[index % cycle.length]]),
      );
    },
  );

  it.each([
    [ARP_DIRECTION_IDS.up, "lowest"],
    [ARP_DIRECTION_IDS.down, "highest"],
    [ARP_DIRECTION_IDS.upDown, "lowest"],
    [ARP_DIRECTION_IDS.downUp, "highest"],
  ] as const)("resets %s traversal at every Harmony slot", (direction, endpoint) => {
    const progression = validProgression();
    const range = fullRange();
    const candidates = deriveArpSlotCandidates(progression, range);
    const events = generateArpEvents(progression, range, {
      rate: ARP_RATE_IDS.eighth,
      direction,
    });
    let slotStartTick = 0;

    for (const [index, slot] of progression.slots.entries()) {
      const firstEvent = events.find((event) => event.startTick === slotStartTick);
      const expectedPitch =
        endpoint === "lowest" ? candidates[index].pitches[0] : candidates[index].pitches.at(-1);
      expect(firstEvent?.pitch).toBe(expectedPitch);
      slotStartTick += slot.bars * V1_TICKS_PER_BAR;
    }
  });

  it("preserves the exact Stage 7B2 two-argument compatibility output", () => {
    const progression = validProgression();
    const range = fullRange();

    expect(generateArpEvents(progression, range)).toEqual(
      generateArpEvents(progression, range, {
        rate: ARP_RATE_IDS.eighth,
        direction: ARP_DIRECTION_IDS.up,
      }),
    );
  });

  it("rejects malformed or incomplete rates with the exact structured field", () => {
    const progression = validProgression();
    const range = fullRange();
    const invalidRates = ["half", "EIGHTH", 480, null, undefined];

    for (const rate of invalidRates) {
      expectArpError(
        () =>
          generateArpEvents(
            progression,
            range,
            runtimeParameters({ rate, direction: ARP_DIRECTION_IDS.up }),
          ),
        ARP_ERROR_CODES.invalidArpRate,
        "parameters.rate",
      );
    }
    expectArpError(
      () =>
        generateArpEvents(
          progression,
          range,
          runtimeParameters({ direction: ARP_DIRECTION_IDS.up }),
        ),
      ARP_ERROR_CODES.invalidArpRate,
      "parameters.rate",
    );
    for (const parameters of [null, 480, "eighth", []]) {
      expectArpError(
        () => generateArpEvents(progression, range, runtimeParameters(parameters)),
        ARP_ERROR_CODES.invalidArpRate,
        "parameters.rate",
      );
    }
  });

  it("rejects malformed or incomplete directions with the exact structured field", () => {
    const progression = validProgression();
    const range = fullRange();
    const invalidDirections = ["alternate", "UP", 1, null, undefined];

    for (const direction of invalidDirections) {
      expectArpError(
        () =>
          generateArpEvents(
            progression,
            range,
            runtimeParameters({ rate: ARP_RATE_IDS.eighth, direction }),
          ),
        ARP_ERROR_CODES.invalidArpDirection,
        "parameters.direction",
      );
    }
    expectArpError(
      () => generateArpEvents(progression, range, runtimeParameters({ rate: ARP_RATE_IDS.eighth })),
      ARP_ERROR_CODES.invalidArpDirection,
      "parameters.direction",
    );
  });

  it("enforces the normative mixed-invalid validation precedence", () => {
    const progression = validProgression();
    const invalidParameters = runtimeParameters({ rate: "half", direction: "alternate" });

    expectArpError(
      () =>
        generateArpEvents(
          null as unknown as HarmonyProgressionRealization,
          { minMidiPitch: -1, maxMidiPitch: 127 } as ReturnType<typeof createArpRange>,
          invalidParameters,
        ),
      ARP_ERROR_CODES.invalidArpRange,
      "range.minMidiPitch",
    );

    const incompatible = progressionWithFirstVoicing(progression, 0, [48, 51, 55]);
    expectArpError(
      () =>
        generateArpEvents(
          incompatible,
          createArpRange({ minMidiPitch: 0, maxMidiPitch: 0 }),
          invalidParameters,
        ),
      ARP_ERROR_CODES.invalidHarmonicContext,
      "progression.slots[0].voicing",
    );

    const { range, emptySlotIndex } = findRangeWithLaterEmptySlot(progression);
    expectArpError(
      () => generateArpEvents(progression, range, invalidParameters),
      ARP_ERROR_CODES.noLegalArpPitch,
      `progression.slots[${emptySlotIndex}].voicing.midiPitches`,
    );

    expectArpError(
      () => generateArpEvents(progression, fullRange(), invalidParameters),
      ARP_ERROR_CODES.invalidArpRate,
      "parameters.rate",
    );
  });

  it("is immutable, input-safe, replay-stable, and independent of ambient randomness", () => {
    const progression = validProgression();
    const range = createArpRange({ minMidiPitch: 40, maxMidiPitch: 88 });
    const parameters: ArpTraversalParametersV1 = {
      rate: ARP_RATE_IDS.sixteenth,
      direction: ARP_DIRECTION_IDS.downUp,
    };
    const before = JSON.stringify({ progression, range, parameters });
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is prohibited");
    });

    try {
      const first = generateArpEvents(progression, range, parameters);
      const second = generateArpEvents(progression, range, parameters);
      expect(second).toEqual(first);
      expect(Object.isFrozen(first)).toBe(true);
      expect(first.every(Object.isFrozen)).toBe(true);
      expect(JSON.stringify({ progression, range, parameters })).toBe(before);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});

describe("Stage 7B4 integer gate control", () => {
  const fullRange = () => createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 });
  const runtimeParameters = (value: unknown): ArpTraversalParametersV1 =>
    value as ArpTraversalParametersV1;

  it("preserves the two-argument default and treats omitted or undefined gate as full-step", () => {
    const progression = validProgression();
    const range = fullRange();
    const defaultEvents = generateArpEvents(progression, range);
    const omittedGateEvents = generateArpEvents(progression, range, {
      rate: ARP_RATE_IDS.eighth,
      direction: ARP_DIRECTION_IDS.up,
    });
    const undefinedGateEvents = generateArpEvents(progression, range, {
      rate: ARP_RATE_IDS.eighth,
      direction: ARP_DIRECTION_IDS.up,
      gateTicks: undefined,
    });

    expect(defaultEvents).toEqual(omittedGateEvents);
    expect(undefinedGateEvents).toEqual(omittedGateEvents);
    expect(defaultEvents.every((event) => event.durationTicks === SUBDIVISION_TICKS.eighth)).toBe(
      true,
    );
  });

  it.each([
    [ARP_RATE_IDS.quarter, SUBDIVISION_TICKS.quarter],
    [ARP_RATE_IDS.eighth, SUBDIVISION_TICKS.eighth],
    [ARP_RATE_IDS.sixteenth, SUBDIVISION_TICKS.sixteenth],
  ] as const)("makes an explicit full-step %s gate equal to omission", (rate, ticks) => {
    const progression = validProgression();
    const range = fullRange();

    expect(
      generateArpEvents(progression, range, {
        rate,
        direction: ARP_DIRECTION_IDS.downUp,
        gateTicks: ticks,
      }),
    ).toEqual(
      generateArpEvents(progression, range, {
        rate,
        direction: ARP_DIRECTION_IDS.downUp,
      }),
    );
  });

  it.each([
    [ARP_RATE_IDS.quarter, 480],
    [ARP_RATE_IDS.eighth, 240],
    [ARP_RATE_IDS.sixteenth, 120],
  ] as const)("changes only duration for a shortened %s gate", (rate, gateTicks) => {
    const progression = validProgression();
    const range = fullRange();
    const parameters = {
      rate,
      direction: ARP_DIRECTION_IDS.upDown,
    } as const;
    const fullStep = generateArpEvents(progression, range, parameters);
    const shortened = generateArpEvents(progression, range, {
      ...parameters,
      gateTicks: createDurationTicks(gateTicks),
    });

    expect(shortened).toHaveLength(fullStep.length);
    expect(shortened.map(({ pitch, startTick }) => ({ pitch, startTick }))).toEqual(
      fullStep.map(({ pitch, startTick }) => ({ pitch, startTick })),
    );
    expect(shortened.every((event) => event.durationTicks === gateTicks)).toBe(true);
    expect(
      shortened.every(
        (event) =>
          event.startTick + event.durationTicks <= event.startTick + SUBDIVISION_TICKS[rate] &&
          event.startTick + event.durationTicks <= V1_SECTION_LENGTH_TICKS,
      ),
    ).toBe(true);
    let slotStartTick = 0;
    for (const slot of progression.slots) {
      const slotEndTick = slotStartTick + slot.bars * V1_TICKS_PER_BAR;
      expect(
        shortened
          .filter((event) => event.startTick >= slotStartTick && event.startTick < slotEndTick)
          .every((event) => event.startTick + event.durationTicks <= slotEndTick),
      ).toBe(true);
      slotStartTick = slotEndTick;
    }
    expect(
      (shortened.at(-1)?.startTick ?? 0) + (shortened.at(-1)?.durationTicks ?? 0),
    ).toBeLessThan(V1_SECTION_LENGTH_TICKS);
    expect((fullStep.at(-1)?.startTick ?? 0) + (fullStep.at(-1)?.durationTicks ?? 0)).toBe(
      V1_SECTION_LENGTH_TICKS,
    );
  });

  it.each([
    [ARP_RATE_IDS.quarter, SUBDIVISION_TICKS.quarter],
    [ARP_RATE_IDS.eighth, SUBDIVISION_TICKS.eighth],
    [ARP_RATE_IDS.sixteenth, SUBDIVISION_TICKS.sixteenth],
  ] as const)("accepts both inclusive %s gate boundaries", (rate, rateTicks) => {
    const progression = validProgression();
    const range = fullRange();

    for (const gateTicks of [createDurationTicks(1), rateTicks]) {
      const events = generateArpEvents(progression, range, {
        rate,
        direction: ARP_DIRECTION_IDS.down,
        gateTicks,
      });
      expect(events.every((event) => event.durationTicks === gateTicks)).toBe(true);
    }
  });

  it.each([
    0,
    -1,
    481,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
    "240",
    true,
    null,
    {},
    [],
  ])("rejects malformed gate value %s with the exact structured error", (gateTicks) => {
    expectArpError(
      () =>
        generateArpEvents(
          validProgression(),
          fullRange(),
          runtimeParameters({
            rate: ARP_RATE_IDS.eighth,
            direction: ARP_DIRECTION_IDS.up,
            gateTicks,
          }),
        ),
      ARP_ERROR_CODES.invalidArpGate,
      "parameters.gateTicks",
    );
  });

  it("preserves every earlier validation layer before gate validation", () => {
    const progression = validProgression();
    const invalidGate = runtimeParameters({
      rate: ARP_RATE_IDS.eighth,
      direction: ARP_DIRECTION_IDS.up,
      gateTicks: 0,
    });

    expectArpError(
      () =>
        generateArpEvents(
          progression,
          { minMidiPitch: -1, maxMidiPitch: 127 } as ReturnType<typeof createArpRange>,
          invalidGate,
        ),
      ARP_ERROR_CODES.invalidArpRange,
      "range.minMidiPitch",
    );

    expectArpError(
      () =>
        generateArpEvents(
          progressionWithFirstVoicing(progression, 0, [48, 51, 55]),
          fullRange(),
          invalidGate,
        ),
      ARP_ERROR_CODES.invalidHarmonicContext,
      "progression.slots[0].voicing",
    );

    const { range, emptySlotIndex } = findRangeWithLaterEmptySlot(progression);
    expectArpError(
      () => generateArpEvents(progression, range, invalidGate),
      ARP_ERROR_CODES.noLegalArpPitch,
      `progression.slots[${emptySlotIndex}].voicing.midiPitches`,
    );

    expectArpError(
      () =>
        generateArpEvents(
          progression,
          fullRange(),
          runtimeParameters({ rate: "half", direction: ARP_DIRECTION_IDS.up, gateTicks: 0 }),
        ),
      ARP_ERROR_CODES.invalidArpRate,
      "parameters.rate",
    );

    expectArpError(
      () =>
        generateArpEvents(
          progression,
          fullRange(),
          runtimeParameters({ rate: ARP_RATE_IDS.eighth, direction: "alternate", gateTicks: 0 }),
        ),
      ARP_ERROR_CODES.invalidArpDirection,
      "parameters.direction",
    );

    expectArpError(
      () => generateArpEvents(progression, fullRange(), invalidGate),
      ARP_ERROR_CODES.invalidArpGate,
      "parameters.gateTicks",
    );
  });

  it("is immutable, input-safe, replay-stable, and independent of ambient randomness", () => {
    const progression = validProgression();
    const range = createArpRange({ minMidiPitch: 40, maxMidiPitch: 88 });
    const parameters: ArpTraversalParametersV1 = {
      rate: ARP_RATE_IDS.sixteenth,
      direction: ARP_DIRECTION_IDS.downUp,
      gateTicks: createDurationTicks(120),
    };
    const before = JSON.stringify({ progression, range, parameters });
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is prohibited");
    });

    try {
      const first = generateArpEvents(progression, range, parameters);
      const second = generateArpEvents(progression, range, parameters);
      expect(second).toEqual(first);
      expect(Object.isFrozen(first)).toBe(true);
      expect(first.every(Object.isFrozen)).toBe(true);
      expect(JSON.stringify({ progression, range, parameters })).toBe(before);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});
