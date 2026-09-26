// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { createChord, getChordPitchClasses } from "../music-domain/chord";
import { CHORD_QUALITIES } from "../music-domain/chord-quality";
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
import { getScaleFormula } from "../music-domain/scale";
import {
  MotifProjectionNoValidPathError,
  projectResolvedMotifPlanV1,
} from "./motif-pitch-projector";

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

type OraclePath = {
  pitches: number[];
  score: [number, number, number];
  pendingDirection: number;
  phrase1Intervals: number[];
  phrase3Intervals: number[];
  phrase1First: number;
  phrase3First?: number;
};

function compareNumberArrays(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left.length - right.length;
}

function compareOraclePaths(left: OraclePath, right: OraclePath): number {
  return (
    compareNumberArrays(left.score, right.score) || compareNumberArrays(left.pitches, right.pitches)
  );
}

function exhaustiveSparseOracle(
  harmony: HarmonyProgressionRealization,
  selectedPlan: ResolvedMotifPlanV1,
) {
  const template = getMotifRhythmTemplateV1("sparse-4");
  const [minimum, maximum] =
    selectedPlan.registerBand === "lower"
      ? [60, 72]
      : selectedPlan.registerBand === "middle"
        ? [66, 78]
        : [72, 84];
  const scalePitchClasses = pitchClassesForKey(harmony.key);
  const formula = getScaleFormula(harmony.key.scale);
  const ordinal = (pitch: number) => {
    for (let degree = 0; degree < formula.length; degree += 1) {
      const offset = pitch - harmony.key.tonic - formula[degree];
      if (offset % 12 === 0) return (offset / 12) * 7 + degree;
    }
    throw new Error("oracle received a non-scale pitch");
  };
  const pitchAtOrdinal = (value: number) => {
    const octave = Math.floor(value / 7);
    const degree = ((value % 7) + 7) % 7;
    return harmony.key.tonic + octave * 12 + formula[degree];
  };
  const specs = harmony.slots.flatMap((slot, phraseIndex) => {
    const chordPitchClasses = getChordPitchClasses(slot.chord);
    const scalePitches = Array.from(
      { length: maximum - minimum + 1 },
      (_, index) => minimum + index,
    ).filter((pitch) => scalePitchClasses.includes(createPitchClass(pitch % 12)));
    const chordPitches = scalePitches.filter((pitch) =>
      chordPitchClasses.includes(createPitchClass(pitch % 12)),
    );
    const midpoint = Math.trunc((minimum + maximum) / 2);
    const anchor = [...chordPitches].sort(
      (left, right) => Math.abs(left - midpoint) - Math.abs(right - midpoint) || left - right,
    )[0];
    const anchorOrdinal = ordinal(anchor);
    return template.contourOffsets.map((contourOffset, eventIndex) => {
      const structural = eventIndex === 0 || eventIndex === 2 || eventIndex === 3;
      return {
        phraseIndex,
        eventIndex,
        structural,
        contourOffset,
        idealPitch: pitchAtOrdinal(anchorOrdinal + contourOffset),
        candidates:
          structural || selectedPlan.tensionMode === "chordal" ? chordPitches : scalePitches,
      };
    });
  });

  let paths = new Map<string, OraclePath>();
  for (const [specIndex, spec] of specs.entries()) {
    const next = new Map<string, OraclePath>();
    for (const pitch of spec.candidates) {
      const predecessors: (OraclePath | undefined)[] =
        specIndex === 0 ? [undefined] : [...paths.values()];
      for (const previous of predecessors) {
        const previousPitch = previous?.pitches.at(-1);
        const semitoneInterval = previousPitch === undefined ? 0 : pitch - previousPitch;
        if (Math.abs(semitoneInterval) > 12) continue;
        if (
          previous !== undefined &&
          previous.pendingDirection !== 0 &&
          (Math.abs(semitoneInterval) > 2 ||
            Math.sign(semitoneInterval) !== -previous.pendingDirection)
        ) {
          continue;
        }
        const previousSpec = specs[specIndex - 1];
        if (
          previous !== undefined &&
          selectedPlan.tensionMode === "diatonic-passing" &&
          previousSpec.phraseIndex === spec.phraseIndex &&
          !previousSpec.structural &&
          spec.structural &&
          ordinal(pitch) - ordinal(previousPitch as number) !==
            Math.sign(spec.contourOffset - previousSpec.contourOffset)
        ) {
          continue;
        }
        const samePhrase = previous !== undefined && previousSpec.phraseIndex === spec.phraseIndex;
        const expectedInterval = samePhrase ? spec.contourOffset - previousSpec.contourOffset : 0;
        const realizedInterval = samePhrase ? ordinal(pitch) - ordinal(previousPitch as number) : 0;
        const phrase1Intervals = [...(previous?.phrase1Intervals ?? [])];
        const phrase3Intervals = [...(previous?.phrase3Intervals ?? [])];
        if (samePhrase && spec.phraseIndex === 0) phrase1Intervals.push(semitoneInterval);
        if (samePhrase && spec.phraseIndex === 2) phrase3Intervals.push(semitoneInterval);
        const candidate: OraclePath = {
          pitches: [...(previous?.pitches ?? []), pitch],
          score: [
            (previous?.score[0] ?? 0) + Math.abs(realizedInterval - expectedInterval),
            (previous?.score[1] ?? 0) +
              (samePhrase && Math.sign(realizedInterval) !== Math.sign(expectedInterval) ? 1 : 0),
            (previous?.score[2] ?? 0) + Math.abs(pitch - spec.idealPitch),
          ],
          pendingDirection: Math.abs(semitoneInterval) >= 8 ? Math.sign(semitoneInterval) : 0,
          phrase1Intervals,
          phrase3Intervals,
          phrase1First: previous?.phrase1First ?? pitch,
          phrase3First:
            previous?.phrase3First ??
            (spec.phraseIndex === 2 && spec.eventIndex === 0 ? pitch : undefined),
        };
        const key = [
          pitch,
          candidate.pendingDirection,
          candidate.phrase1Intervals.join(","),
          candidate.phrase3Intervals.join(","),
          candidate.phrase1First,
          candidate.phrase3First ?? "",
        ].join("|");
        const current = next.get(key);
        if (current === undefined || compareOraclePaths(candidate, current) < 0)
          next.set(key, candidate);
      }
    }
    paths = next;
  }
  const complete = [...paths.values()].filter((path) => path.pendingDirection === 0);
  const exact = complete.filter(
    (path) => compareNumberArrays(path.phrase1Intervals, path.phrase3Intervals) === 0,
  );
  const selectedSet = exact.length > 0 ? exact : complete;
  selectedSet.sort(compareOraclePaths);
  return {
    selectedPitches: selectedSet[0]?.pitches,
    usedExact: exact.length > 0,
    exactTranspositions: new Set(
      exact.map((path) => (path.phrase3First as number) - path.phrase1First),
    ),
  };
}

describe("Stage 8 Motif V1 pitch projection", () => {
  it("selects exact Phrase-1 interval preservation when a complete legal path exists", () => {
    const harmony = progression();
    const selectedPlan = plan();
    const oracle = exhaustiveSparseOracle(harmony, selectedPlan);
    const events = projectResolvedMotifPlanV1(harmony, selectedPlan);
    const pitches = events.map((event) => event.pitch);

    expect(pitches).toEqual([72, 75, 75, 72, 70, 74, 77, 74, 72, 75, 75, 72, 74, 74, 74, 67]);
    expect(oracle.usedExact).toBe(true);
    expect(oracle.exactTranspositions.size).toBeGreaterThan(1);
    expect(pitches).toEqual(oracle.selectedPitches);
    expect(intervals(pitches.slice(0, 4))).toEqual(intervals(pitches.slice(8, 12)));
  });

  it("uses ordinary deterministic projection only when exact Phrase-3 preservation is impossible", () => {
    const selectedPlan = plan({ tensionMode: "diatonic-passing" });
    const harmony = progression(HARMONY_PROFILE_IDS.darkSynthwave, 1);
    const oracle = exhaustiveSparseOracle(harmony, selectedPlan);
    const first = projectResolvedMotifPlanV1(harmony, selectedPlan);
    const second = projectResolvedMotifPlanV1(harmony, selectedPlan);
    const pitches = first.map((event) => event.pitch);

    expect(pitches).toEqual([72, 74, 75, 72, 68, 71, 72, 68, 71, 72, 74, 71, 72, 74, 75, 72]);
    expect(oracle.usedExact).toBe(false);
    expect(pitches).toEqual(oracle.selectedPitches);
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

  it("fails closed without partial events when a valid four-slot input has no legal path", () => {
    const base = progression();
    const left = createChord(createPitchClass(2), CHORD_QUALITIES.majorTriad);
    const right = createChord(createPitchClass(6), CHORD_QUALITIES.majorTriad);
    const noPathHarmony = Object.freeze({
      ...base,
      slots: Object.freeze(
        base.slots.map((slot, index) =>
          Object.freeze({ ...slot, chord: index % 2 === 0 ? left : right }),
        ),
      ),
    });
    let result: unknown;

    expect(() => {
      result = projectResolvedMotifPlanV1(
        noPathHarmony,
        plan({ registerBand: "lower", tensionMode: "diatonic-passing" }),
      );
    }).toThrow(MotifProjectionNoValidPathError);
    expect(result).toBeUndefined();
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
