import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  ARP_DIRECTION_IDS,
  ARP_RATE_IDS,
  createArpRange,
  generateArpEvents,
  type ArpRateId,
} from "./arpeggiator";
import { ARP_DENSITY_MASK_CATALOG_V1 } from "./arpeggiator-density-mask";
import type { ResolvedArpPlanV1 } from "./arpeggiator-policy-resolver";
import { projectResolvedArpPlanV1 } from "./arpeggiator-resolved-plan-projector";
import { createChordVoicing } from "./chord-voicing";
import {
  getHarmonyTemplate,
  HARMONY_PROFILE_IDS,
  type HarmonyProgressionRealization,
  realizeHarmonyProgression,
} from "./harmony";
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

function resolvedPlan(overrides: Partial<ResolvedArpPlanV1> = {}): ResolvedArpPlanV1 {
  return Object.freeze({
    rate: ARP_RATE_IDS.eighth,
    direction: ARP_DIRECTION_IDS.up,
    gateTicks: SUBDIVISION_TICKS.eighth,
    octaveRange: 1,
    maskId: "full",
    ...overrides,
  });
}

function progressionWithHighFirstVoicing(
  progression: HarmonyProgressionRealization,
): HarmonyProgressionRealization {
  return {
    ...progression,
    slots: Object.freeze(
      progression.slots.map((slot, index) =>
        index === 0
          ? Object.freeze({
              ...slot,
              voicing: createChordVoicing(
                slot.voicing.midiPitches.map((pitch) => createMidiPitch(pitch + 60)),
              ),
            })
          : slot,
      ),
    ),
  };
}

function expandedCandidates(
  progression: HarmonyProgressionRealization,
  slotIndex: number,
  octaveRange: ResolvedArpPlanV1["octaveRange"],
  range = createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 }),
): readonly number[] {
  return [
    ...new Set(
      progression.slots[slotIndex].voicing.midiPitches.flatMap((pitch) =>
        Array.from({ length: octaveRange }, (_, octave) => pitch + octave * 12).filter(
          (candidate) =>
            candidate <= 127 && candidate >= range.minMidiPitch && candidate <= range.maxMidiPitch,
        ),
      ),
    ),
  ].sort((left, right) => left - right);
}

function eventsInSlot(
  events: ReturnType<typeof projectResolvedArpPlanV1>,
  slotIndex: number,
  progression: HarmonyProgressionRealization,
) {
  const start = progression.slots
    .slice(0, slotIndex)
    .reduce((ticks, slot) => ticks + slot.bars * V1_TICKS_PER_BAR, 0);
  const end = start + progression.slots[slotIndex].bars * V1_TICKS_PER_BAR;
  return events.filter((event) => event.startTick >= start && event.startTick < end);
}

describe("Stage 7C7a8 resolved-plan projection", () => {
  it.each([1, 2, 3] as const)(
    "expands octave range %i upward only in canonical ascending order",
    (octaveRange) => {
      const progression = validProgression();
      const range = createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 });
      const events = projectResolvedArpPlanV1(progression, range, resolvedPlan({ octaveRange }));
      const candidates = expandedCandidates(progression, 0, octaveRange, range);

      expect(
        eventsInSlot(events, 0, progression)
          .slice(0, candidates.length)
          .map((event) => event.pitch),
      ).toEqual(candidates);
      expect(candidates.every((pitch) => pitch >= 0 && pitch <= 127)).toBe(true);
      expect(
        candidates.every((pitch) =>
          progression.slots[0].voicing.midiPitches.some(
            (source) => pitch === source || pitch === source + 12 || pitch === source + 24,
          ),
        ),
      ).toBe(true);
    },
  );

  it("applies inclusive range bounds without wrapping or clamping", () => {
    const progression = validProgression();
    const allExpanded = progression.slots.flatMap((_, slotIndex) =>
      expandedCandidates(progression, slotIndex, 3),
    );
    const minimum = Math.min(...progression.slots.map((slot) => slot.voicing.midiPitches[0]));
    const maximum = Math.max(...allExpanded);
    const range = createArpRange({ minMidiPitch: minimum, maxMidiPitch: maximum });
    const events = projectResolvedArpPlanV1(progression, range, resolvedPlan({ octaveRange: 3 }));

    expect(events.some((event) => event.pitch === minimum)).toBe(true);
    expect(events.some((event) => event.pitch === maximum)).toBe(true);
    expect(events.every((event) => event.pitch >= minimum && event.pitch <= maximum)).toBe(true);
    expect(events.every((event) => event.pitch <= 127)).toBe(true);

    const restrictedRange = createArpRange({ minMidiPitch: 50, maxMidiPitch: 80 });
    const restricted = projectResolvedArpPlanV1(
      progression,
      restrictedRange,
      resolvedPlan({ octaveRange: 3 }),
    );
    expect(restricted.every((event) => event.pitch >= 50 && event.pitch <= 80)).toBe(true);
    expect(restricted.some((event) => event.pitch === 48)).toBe(false);
  });

  it("excludes upward expansions above the canonical MIDI upper bound", () => {
    const progression = progressionWithHighFirstVoicing(validProgression());
    const events = projectResolvedArpPlanV1(
      progression,
      createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 }),
      resolvedPlan({ octaveRange: 3 }),
    );
    const expected = expandedCandidates(progression, 0, 3);

    expect(expected).toEqual([108, 112, 115, 120, 124, 127]);
    expect(
      eventsInSlot(events, 0, progression)
        .slice(0, expected.length)
        .map((event) => event.pitch),
    ).toEqual(expected);
    expect(eventsInSlot(events, 0, progression).every((event) => event.pitch <= 127)).toBe(true);
  });

  it("deduplicates before traversal and preserves the canonical selected voicing", () => {
    const progression = validProgression();
    const progressionBefore = structuredClone(progression);
    const candidates = expandedCandidates(progression, 0, 3);
    const events = projectResolvedArpPlanV1(
      progression,
      createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 }),
      resolvedPlan({ octaveRange: 3 }),
    );

    expect(new Set(candidates).size).toBe(candidates.length);
    expect(
      eventsInSlot(events, 0, progression)
        .slice(0, candidates.length)
        .map((event) => event.pitch),
    ).toEqual(candidates);
    expect(
      progression.slots.every(
        (slot) => new Set(slot.voicing.midiPitches.map((pitch) => pitch % 12)).size === 3,
      ),
    ).toBe(true);
    expect(progression).toEqual(progressionBefore);
  });

  it.each([
    [ARP_DIRECTION_IDS.up, (values: readonly number[]) => values],
    [ARP_DIRECTION_IDS.down, (values: readonly number[]) => [...values].reverse()],
    [
      ARP_DIRECTION_IDS.upDown,
      (values: readonly number[]) => [...values, ...values.slice(1, -1).reverse()],
    ],
    [
      ARP_DIRECTION_IDS.downUp,
      (values: readonly number[]) => [...values].reverse().concat(values.slice(1, -1)),
    ],
  ] as const)(
    "uses the exact %s cycle without duplicate turning endpoints",
    (direction, cycleFor) => {
      const progression = validProgression();
      const candidates = expandedCandidates(progression, 0, 2);
      const cycle = cycleFor(candidates);
      const events = projectResolvedArpPlanV1(
        progression,
        createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 }),
        resolvedPlan({ direction, octaveRange: 2 }),
      );
      const firstSlot = eventsInSlot(events, 0, progression);
      const expected = Array.from(
        { length: firstSlot.length },
        (_, index) => cycle[index % cycle.length],
      );

      expect(firstSlot.map((event) => event.pitch)).toEqual(expected);
    },
  );

  it.each([
    [ARP_DIRECTION_IDS.up, "lowest"],
    [ARP_DIRECTION_IDS.down, "highest"],
    [ARP_DIRECTION_IDS.upDown, "lowest"],
    [ARP_DIRECTION_IDS.downUp, "highest"],
  ] as const)("resets %s traversal at every Harmony slot", (direction, endpoint) => {
    const progression = validProgression();
    const events = projectResolvedArpPlanV1(
      progression,
      createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 }),
      resolvedPlan({ direction, octaveRange: 2 }),
    );

    for (const [slotIndex] of progression.slots.entries()) {
      const candidates = expandedCandidates(progression, slotIndex, 2);
      expect(eventsInSlot(events, slotIndex, progression)[0].pitch).toBe(
        endpoint === "lowest" ? candidates[0] : candidates.at(-1),
      );
    }
  });

  it.each([
    ["full", [0, 1, 2, 3, 4, 5, 6, 7]],
    ["three-of-four", [0, 1, 3, 4, 5, 7]],
    ["alternating-on-rest", [0, 2, 4, 6]],
    ["alternating-rest-on", [1, 3, 5, 7]],
    ["one-of-four", [0, 4]],
  ] as const)("repeats and resets the %s mask while rests consume traversal", (maskId, onSteps) => {
    const progression = validProgression();
    const candidates = expandedCandidates(progression, 0, 2);
    const events = projectResolvedArpPlanV1(
      progression,
      createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 }),
      resolvedPlan({ octaveRange: 2, maskId }),
    );
    const firstSlot = eventsInSlot(events, 0, progression);

    expect(firstSlot.slice(0, onSteps.length).map((event) => event.startTick)).toEqual(
      onSteps.map((step) => step * SUBDIVISION_TICKS.eighth),
    );
    expect(firstSlot.slice(0, onSteps.length).map((event) => event.pitch)).toEqual(
      onSteps.map((step) => candidates[step % candidates.length]),
    );
    const secondSlotStart = progression.slots[0].bars * V1_TICKS_PER_BAR;
    const secondSlotFirstStepIsOn = ARP_DENSITY_MASK_CATALOG_V1[maskId][0] === "on";
    expect(events.some((event) => event.startTick === secondSlotStart)).toBe(
      secondSlotFirstStepIsOn,
    );
  });

  it.each([
    [ARP_RATE_IDS.quarter, SUBDIVISION_TICKS.quarter, createDurationTicks(480)],
    [ARP_RATE_IDS.eighth, SUBDIVISION_TICKS.eighth, createDurationTicks(240)],
    [ARP_RATE_IDS.sixteenth, SUBDIVISION_TICKS.sixteenth, createDurationTicks(120)],
  ] as const)(
    "uses exact %s starts with resolved gate-only duration",
    (rate, rateTicks, gateTicks) => {
      const progression = validProgression();
      const events = projectResolvedArpPlanV1(
        progression,
        createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 }),
        resolvedPlan({ rate, gateTicks, maskId: "three-of-four" }),
      );

      expect(events.every((event) => event.startTick % rateTicks === 0)).toBe(true);
      expect(events.every((event) => event.durationTicks === gateTicks)).toBe(true);
      expect(
        events.every((event) => event.startTick + event.durationTicks <= V1_SECTION_LENGTH_TICKS),
      ).toBe(true);
      expect(events).toHaveLength((V1_SECTION_LENGTH_TICKS / rateTicks / 4) * 3);

      let slotStartTick = 0;
      for (const slot of progression.slots) {
        const slotEndTick = slotStartTick + slot.bars * V1_TICKS_PER_BAR;
        expect(
          events
            .filter((event) => event.startTick >= slotStartTick && event.startTick < slotEndTick)
            .every((event) => event.startTick + event.durationTicks <= slotEndTick),
        ).toBe(true);
        slotStartTick = slotEndTick;
      }
    },
  );

  it("keeps starts and traversal unchanged when only the resolved gate changes", () => {
    const progression = validProgression();
    const range = createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 });
    const short = projectResolvedArpPlanV1(
      progression,
      range,
      resolvedPlan({ direction: "down-up", octaveRange: 2, gateTicks: createDurationTicks(1) }),
    );
    const full = projectResolvedArpPlanV1(
      progression,
      range,
      resolvedPlan({
        direction: "down-up",
        octaveRange: 2,
        gateTicks: SUBDIVISION_TICKS.eighth,
      }),
    );

    expect(short.map(({ pitch, startTick }) => ({ pitch, startTick }))).toEqual(
      full.map(({ pitch, startTick }) => ({ pitch, startTick })),
    );
  });

  it.each([
    [ARP_RATE_IDS.quarter, ARP_DIRECTION_IDS.down, createDurationTicks(480)],
    [ARP_RATE_IDS.eighth, ARP_DIRECTION_IDS.upDown, createDurationTicks(240)],
    [ARP_RATE_IDS.sixteenth, ARP_DIRECTION_IDS.downUp, createDurationTicks(120)],
  ] as const)("matches Stage 7B canonical values for %s %s", (rate, direction, gateTicks) => {
    const progression = validProgression();
    const range = createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 });

    expect(
      projectResolvedArpPlanV1(
        progression,
        range,
        resolvedPlan({ rate, direction, gateTicks, octaveRange: 1, maskId: "full" }),
      ),
    ).toEqual(generateArpEvents(progression, range, { rate, direction, gateTicks }));
  });

  it("returns frozen deterministic output without mutating inputs or ambient state", () => {
    const progression = validProgression();
    const range = createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 });
    const plan = resolvedPlan({ octaveRange: 3, maskId: "alternating-on-rest" });
    const before = structuredClone({ progression, range, plan });
    const masksBefore = structuredClone(ARP_DENSITY_MASK_CATALOG_V1);
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is prohibited");
    });
    try {
      const first = projectResolvedArpPlanV1(progression, range, plan);
      const second = projectResolvedArpPlanV1(progression, range, plan);

      expect(first).toEqual(second);
      expect(Object.isFrozen(first)).toBe(true);
      expect(first.every(Object.isFrozen)).toBe(true);
      expect({ progression, range, plan }).toEqual(before);
      expect(ARP_DENSITY_MASK_CATALOG_V1).toEqual(masksBefore);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });

  it("keeps the projector private and free of policy, seed, public-error, and provenance work", async () => {
    const publicDomain = await import("./index");
    expect(publicDomain).not.toHaveProperty("projectResolvedArpPlanV1");

    const publicIndex = readFileSync("src/music-domain/index.ts", "utf8");
    const source = readFileSync("src/music-domain/arpeggiator-resolved-plan-projector.ts", "utf8");
    expect(publicIndex).not.toContain("arpeggiator-resolved-plan-projector");
    for (const forbidden of [
      "Math.random",
      "prng",
      "component-seed",
      "weighted-choice",
      "arpeggiator-profile-configuration",
      "ArpValueError",
      "generateArpEventsWithPolicyV1",
      "rootSeed",
      "provenance",
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });

  it("uses only unstructured internal assertions for impossible resolved-plan states", () => {
    let error: unknown;
    try {
      projectResolvedArpPlanV1(
        validProgression(),
        createArpRange({ minMidiPitch: 0, maxMidiPitch: 127 }),
        resolvedPlan({ rate: "half" as ArpRateId }),
      );
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toHaveProperty("code");
    expect(error).not.toHaveProperty("field");
  });
});
