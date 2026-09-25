// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { getChordPitchClasses } from "../music-domain/chord";
import {
  getHarmonyTemplatesForProfile,
  HARMONY_PROFILE_IDS,
  type HarmonyProfileId,
  type HarmonyProgressionRealization,
  realizeHarmonyProgression,
} from "../music-domain/harmony";
import { createKey, pitchClassesForKey } from "../music-domain/key";
import { getMotifRhythmTemplateV1, MOTIF_PHRASE_ROLES_V1 } from "../music-domain/motif-catalog";
import { createMotifEventV1 } from "../music-domain/motif-event";
import { MOTIF_POLICY_VERSION_V1, type ResolvedMotifPlanV1 } from "../music-domain/motif-policy";
import { MOTIF_PROFILE_DATA_VERSION_V1 } from "../music-domain/motif-profile-configuration";
import { createPitchClass } from "../music-domain/pitch";
import { projectResolvedMotifPlanV1 } from "./motif-pitch-projector";

function progression(
  profile: HarmonyProfileId = HARMONY_PROFILE_IDS.darkSynthwave,
  templateIndex = 0,
) {
  const template = getHarmonyTemplatesForProfile(profile)[templateIndex];
  return realizeHarmonyProgression(
    profile,
    template,
    createKey(createPitchClass(0), template.scale),
  );
}

function plan(overrides: Partial<ResolvedMotifPlanV1> = {}): ResolvedMotifPlanV1 {
  const rhythmTemplate = overrides.rhythmTemplate ?? "sparse-4";
  return Object.freeze({
    policyVersion: MOTIF_POLICY_VERSION_V1,
    profileVersion: MOTIF_PROFILE_DATA_VERSION_V1,
    rhythmTemplate,
    registerBand: "middle",
    tensionMode: "chordal",
    phrase4Displacement: "none",
    contourOffsets: getMotifRhythmTemplateV1(rhythmTemplate).contourOffsets,
    phraseRoles: MOTIF_PHRASE_ROLES_V1,
    ...overrides,
  });
}

function intervals(values: readonly number[]): readonly number[] {
  return values.slice(1).map((pitch, index) => pitch - values[index]);
}

function scaleOrdinal(realization: HarmonyProgressionRealization, pitch: number): number {
  const scale = pitchClassesForKey(realization.key);
  return Array.from({ length: 128 }, (_, value) => value)
    .filter((value) => scale.includes(createPitchClass(value % 12)))
    .indexOf(pitch);
}

describe("Stage 8 Motif V1 pitch projection", () => {
  it("selects exact Phrase-1 interval preservation when a complete legal path exists", () => {
    const events = projectResolvedMotifPlanV1(progression(), plan());
    const pitches = events.map((event) => event.pitch);

    expect(pitches).toEqual([72, 75, 75, 72, 70, 74, 77, 74, 72, 75, 75, 72, 74, 74, 74, 67]);
    expect(intervals(pitches.slice(0, 4))).toEqual(intervals(pitches.slice(8, 12)));
  });

  it("uses ordinary deterministic projection only when exact Phrase-3 preservation is impossible", () => {
    const selectedPlan = plan({ tensionMode: "diatonic-passing" });
    const first = projectResolvedMotifPlanV1(
      progression(HARMONY_PROFILE_IDS.darkSynthwave, 1),
      selectedPlan,
    );
    const second = projectResolvedMotifPlanV1(
      progression(HARMONY_PROFILE_IDS.darkSynthwave, 1),
      selectedPlan,
    );
    const pitches = first.map((event) => event.pitch);

    expect(pitches).toEqual([72, 74, 75, 72, 68, 71, 72, 68, 71, 72, 74, 71, 72, 74, 75, 72]);
    expect(intervals(pitches.slice(0, 4))).not.toEqual(intervals(pitches.slice(8, 12)));
    expect(second).toEqual(first);
  });

  it.each([
    ["sparse-4", "earlier-480"],
    ["steady-6", "later-480"],
    ["active-8", "none"],
  ] as const)(
    "preserves the %s catalog and applies only the resolved Phrase-4 %s displacement",
    (rhythmTemplate, phrase4Displacement) => {
      const template = getMotifRhythmTemplateV1(rhythmTemplate);
      const events = projectResolvedMotifPlanV1(
        progression(),
        plan({ rhythmTemplate, phrase4Displacement }),
      );
      const expectedStarts = Array.from({ length: 4 }, (_, phraseIndex) =>
        template.relativeOnsetGridIndices.map((gridIndex, eventIndex) => {
          const displacement =
            phraseIndex === 3 && eventIndex === template.displacementEventOrdinal
              ? phrase4Displacement === "earlier-480"
                ? -480
                : phrase4Displacement === "later-480"
                  ? 480
                  : 0
              : 0;
          return phraseIndex * 7_680 + gridIndex * 480 + displacement;
        }),
      ).flat();

      expect(events.map((event) => event.startTick)).toEqual(expectedStarts);
      expect(events.map((event) => event.durationTicks)).toEqual(
        Array.from({ length: 4 }, () => template.durationsTicks).flat(),
      );
      expect(events.every(Object.isFrozen)).toBe(true);
      expect(Object.isFrozen(events)).toBe(true);
    },
  );

  it.each([
    [HARMONY_PROFILE_IDS.darkSynthwave, 1, "sparse-4", "middle", "diatonic-passing"],
    [HARMONY_PROFILE_IDS.classicSynthwave, 0, "steady-6", "lower", "chordal"],
    [HARMONY_PROFILE_IDS.darkwave, 1, "active-8", "upper", "diatonic-passing"],
  ] as const)(
    "enforces vocabulary, targets, band, contour resolution, and leap recovery for %s fixture",
    (profile, templateIndex, rhythmTemplate, registerBand, tensionMode) => {
      const harmony = progression(profile, templateIndex);
      const selectedPlan = plan({ rhythmTemplate, registerBand, tensionMode });
      const template = getMotifRhythmTemplateV1(rhythmTemplate);
      const events = projectResolvedMotifPlanV1(harmony, selectedPlan);
      const eventCount = template.contourOffsets.length;
      const scale = pitchClassesForKey(harmony.key);
      const range =
        registerBand === "lower" ? [60, 72] : registerBand === "middle" ? [66, 78] : [72, 84];

      for (const [index, event] of events.entries()) {
        const phraseIndex = Math.floor(index / eventCount);
        const eventIndex = index % eventCount;
        const firstBar2 = template.relativeOnsetGridIndices.findIndex((value) => value >= 8);
        const structural =
          eventIndex === 0 || eventIndex === firstBar2 || eventIndex === eventCount - 1;
        const pitchClass = createPitchClass(event.pitch % 12);
        expect(scale).toContain(pitchClass);
        expect(event.pitch).toBeGreaterThanOrEqual(range[0]);
        expect(event.pitch).toBeLessThanOrEqual(range[1]);
        if (structural || tensionMode === "chordal") {
          expect(getChordPitchClasses(harmony.slots[phraseIndex].chord)).toContain(pitchClass);
        }
        if (eventIndex > 0 && structural && tensionMode === "diatonic-passing") {
          const previousIndex = eventIndex - 1;
          const previousStructural =
            previousIndex === 0 || previousIndex === firstBar2 || previousIndex === eventCount - 1;
          if (!previousStructural) {
            const expectedDirection = Math.sign(
              template.contourOffsets[eventIndex] - template.contourOffsets[previousIndex],
            );
            expect(
              scaleOrdinal(harmony, event.pitch) - scaleOrdinal(harmony, events[index - 1].pitch),
            ).toBe(expectedDirection);
          }
        }
      }

      for (let index = 1; index < events.length; index += 1) {
        const leap = events[index].pitch - events[index - 1].pitch;
        expect(Math.abs(leap)).toBeLessThanOrEqual(12);
        if (Math.abs(leap) >= 8) {
          expect(index + 1).toBeLessThan(events.length);
          const recovery = events[index + 1].pitch - events[index].pitch;
          expect(Math.abs(recovery)).toBeLessThanOrEqual(2);
          expect(Math.sign(recovery)).toBe(-Math.sign(leap));
        }
      }
    },
  );

  it("is ambient-randomness isolated and rejects forged resolved-plan identities", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness must not be used");
    });
    try {
      expect(projectResolvedMotifPlanV1(progression(), plan())).toHaveLength(16);
    } finally {
      random.mockRestore();
    }

    expect(() =>
      projectResolvedMotifPlanV1(
        progression(),
        Object.freeze({ ...plan(), contourOffsets: Object.freeze([0, 1, 2, 0]) }),
      ),
    ).toThrow(/contour must be the catalog value/);
    expect(() =>
      projectResolvedMotifPlanV1(
        progression(),
        Object.freeze({
          ...plan(),
          phraseRoles: Object.freeze([
            ...MOTIF_PHRASE_ROLES_V1,
          ]) as ResolvedMotifPlanV1["phraseRoles"],
        }),
      ),
    ).toThrow(/phrase roles must be the catalog value/);
  });
});

describe("MotifEventV1", () => {
  it("constructs frozen canonical event values and rejects noncatalog durations", () => {
    const event = createMotifEventV1({ pitch: 72, startTick: 0, durationTicks: 480 });
    expect(event).toEqual({ pitch: 72, startTick: 0, durationTicks: 480 });
    expect(Object.isFrozen(event)).toBe(true);
    expect(() => createMotifEventV1({ pitch: 72, startTick: 0, durationTicks: 720 })).toThrow(
      /480 or 960/,
    );
  });
});
