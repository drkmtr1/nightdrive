import { describe, expect, it, vi } from "vitest";
import type { Stage8MotifReferencePlanV1 } from "./stage8-motif-reference-plan-resolution";
import {
  projectStage8MotifReferencePlanV1,
  type Stage8MotifReferenceEventV1,
  type Stage8MotifReferenceSupplementalHarmonyV1,
} from "./stage8-motif-reference-projector";
import { STAGE8_MOTIF_SOURCE_BINDINGS } from "./stage8-motif-source-bindings";

type TestHarmony = Readonly<{
  key: Readonly<{ tonic: number; scale: string }>;
  slots: readonly Readonly<{ chord: Readonly<{ root: number; quality: string }> }>[];
}>;

type FallbackPath = Readonly<{
  pitches: readonly number[];
  stepDeviation: number;
  directionChanges: number;
  idealDistance: number;
}>;

const PHRASE_TICKS = 7_680;
const PHRASE_ROLES = [
  "identity",
  "motif-form-repetition",
  "harmony-aware-transposition",
  "contour-preserving-response",
] as const;
const SCALE_OFFSETS = Object.freeze({
  "harmonic-minor": Object.freeze([0, 2, 3, 5, 7, 8, 11]),
  major: Object.freeze([0, 2, 4, 5, 7, 9, 11]),
  "natural-minor": Object.freeze([0, 2, 3, 5, 7, 8, 10]),
  phrygian: Object.freeze([0, 1, 3, 5, 7, 8, 10]),
});
const RHYTHMS = Object.freeze({
  "active-8": Object.freeze({
    onsets: Object.freeze([0, 2, 4, 6, 8, 10, 12, 14]),
    durations: Object.freeze([480, 480, 480, 480, 480, 480, 480, 480]),
    contour: Object.freeze([0, 1, 2, 3, 2, 3, 1, 0]),
    displacementOrdinal: 3,
  }),
  "sparse-4": Object.freeze({
    onsets: Object.freeze([0, 4, 8, 12]),
    durations: Object.freeze([960, 960, 960, 960]),
    contour: Object.freeze([0, 1, 2, 0]),
    displacementOrdinal: 1,
  }),
  "steady-6": Object.freeze({
    onsets: Object.freeze([0, 2, 4, 7, 10, 14]),
    durations: Object.freeze([960, 480, 960, 480, 960, 960]),
    contour: Object.freeze([0, 1, 2, 1, 2, 0]),
    displacementOrdinal: 3,
  }),
});
const BANDS = Object.freeze({
  lower: Object.freeze([60, 72]),
  middle: Object.freeze([66, 78]),
  upper: Object.freeze([72, 84]),
});

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const key of Reflect.ownKeys(value)) deepFreeze(Reflect.get(value, key));
  return Object.freeze(value);
}

function frozenClone<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

function event(
  pitch: number,
  startTick: number,
  durationTicks: 480 | 960,
): Stage8MotifReferenceEventV1 {
  return Object.freeze({ pitch, startTick, durationTicks });
}

function staticEvents(
  pitches: readonly number[],
  starts: readonly number[],
  durations: readonly (480 | 960)[],
): readonly Stage8MotifReferenceEventV1[] {
  if (pitches.length !== starts.length || pitches.length !== durations.length)
    throw new Error("Malformed static event fixture.");
  return Object.freeze(
    pitches.map((pitch, index) => {
      const start = starts[index];
      const duration = durations[index];
      if (start === undefined || duration === undefined) throw new Error("Missing static event.");
      return event(pitch, start, duration);
    }),
  );
}

const DARK_SYNTHWAVE_LOW_LOW_ZERO_PLAN = deepFreeze({
  policyVersion: "nightdrive.motif-policy.v1",
  profileVersion: "nightdrive.genre-profile.motif.v1",
  rhythmTemplate: "steady-6",
  registerBand: "upper",
  tensionMode: "chordal",
  phrase4Displacement: "none",
  contourOffsets: [0, 1, 2, 1, 2, 0],
  phraseRoles: [...PHRASE_ROLES],
} as const) satisfies Stage8MotifReferencePlanV1;

const CLASSIC_SYNTHWAVE_LOW_LOW_ZERO_PLAN = deepFreeze({
  policyVersion: "nightdrive.motif-policy.v1",
  profileVersion: "nightdrive.genre-profile.motif.v1",
  rhythmTemplate: "steady-6",
  registerBand: "upper",
  tensionMode: "chordal",
  phrase4Displacement: "none",
  contourOffsets: [0, 1, 2, 1, 2, 0],
  phraseRoles: [...PHRASE_ROLES],
} as const) satisfies Stage8MotifReferencePlanV1;

const DARKWAVE_HIGH_HIGH_ZERO_PLAN = deepFreeze({
  policyVersion: "nightdrive.motif-policy.v1",
  profileVersion: "nightdrive.genre-profile.motif.v1",
  rhythmTemplate: "active-8",
  registerBand: "lower",
  tensionMode: "chordal",
  phrase4Displacement: "later-480",
  contourOffsets: [0, 1, 2, 3, 2, 3, 1, 0],
  phraseRoles: [...PHRASE_ROLES],
} as const) satisfies Stage8MotifReferencePlanV1;

const CYBERPUNK_MEDIUM_MEDIUM_ZERO_PLAN = deepFreeze({
  policyVersion: "nightdrive.motif-policy.v1",
  profileVersion: "nightdrive.genre-profile.motif.v1",
  rhythmTemplate: "active-8",
  registerBand: "middle",
  tensionMode: "chordal",
  phrase4Displacement: "earlier-480",
  contourOffsets: [0, 1, 2, 3, 2, 3, 1, 0],
  phraseRoles: [...PHRASE_ROLES],
} as const) satisfies Stage8MotifReferencePlanV1;

const HARMONIC_MINOR_FALLBACK_HARMONY = deepFreeze({
  profile: "dark-synthwave",
  templateId: "degree-0344-harmonic-minor-v1",
  templateVersion: "v1",
  key: { tonic: 0, scale: "harmonic-minor" },
  slots: [
    {
      index: 0,
      degree: 0,
      bars: 2,
      chord: { root: 0, quality: "minor-triad" },
      inversion: 0,
      voicing: { midiPitches: [48, 51, 55] },
    },
    {
      index: 1,
      degree: 3,
      bars: 2,
      chord: { root: 5, quality: "minor-triad" },
      inversion: 0,
      voicing: { midiPitches: [53, 56, 60] },
    },
    {
      index: 2,
      degree: 4,
      bars: 2,
      chord: { root: 7, quality: "major-triad" },
      inversion: 0,
      voicing: { midiPitches: [55, 59, 62] },
    },
    {
      index: 3,
      degree: 0,
      bars: 2,
      chord: { root: 0, quality: "minor-triad" },
      inversion: 0,
      voicing: { midiPitches: [48, 51, 55] },
    },
  ],
} as const) satisfies Stage8MotifReferenceSupplementalHarmonyV1;

const HARMONIC_MINOR_FALLBACK_PLAN = deepFreeze({
  policyVersion: "nightdrive.motif-policy.v1",
  profileVersion: "nightdrive.genre-profile.motif.v1",
  rhythmTemplate: "sparse-4",
  registerBand: "middle",
  tensionMode: "diatonic-passing",
  phrase4Displacement: "none",
  contourOffsets: [0, 1, 2, 0],
  phraseRoles: [...PHRASE_ROLES],
} as const) satisfies Stage8MotifReferencePlanV1;

const STEADY_STARTS = [
  0, 960, 1920, 3360, 4800, 6720, 7680, 8640, 9600, 11040, 12480, 14400, 15360, 16320, 17280, 18720,
  20160, 22080, 23040, 24000, 24960, 26400, 27840, 29760,
] as const;
const STEADY_DURATIONS = [
  960, 480, 960, 480, 960, 960, 960, 480, 960, 480, 960, 960, 960, 480, 960, 480, 960, 960, 960,
  480, 960, 480, 960, 960,
] as const;
const ACTIVE_EARLIER_STARTS = [
  0, 960, 1920, 2880, 3840, 4800, 5760, 6720, 7680, 8640, 9600, 10560, 11520, 12480, 13440, 14400,
  15360, 16320, 17280, 18240, 19200, 20160, 21120, 22080, 23040, 24000, 24960, 25440, 26880, 27840,
  28800, 29760,
] as const;
const ACTIVE_LATER_STARTS = [
  0, 960, 1920, 2880, 3840, 4800, 5760, 6720, 7680, 8640, 9600, 10560, 11520, 12480, 13440, 14400,
  15360, 16320, 17280, 18240, 19200, 20160, 21120, 22080, 23040, 24000, 24960, 26400, 26880, 27840,
  28800, 29760,
] as const;
const ACTIVE_DURATIONS = Array.from({ length: 32 }, () => 480 as const);
const SPARSE_STARTS = [
  0, 1920, 3840, 5760, 7680, 9600, 11520, 13440, 15360, 17280, 19200, 21120, 23040, 24960, 26880,
  28800,
] as const;
const SPARSE_DURATIONS = Array.from({ length: 16 }, () => 960 as const);

/* Independently derived from MOTIF_MODEL.md, never from projector output. */
const EXPECTED_DARK_SYNTHWAVE_LOW_LOW_ZERO = staticEvents(
  [75, 79, 79, 75, 79, 75, 74, 77, 77, 74, 77, 74, 80, 84, 84, 80, 84, 80, 79, 79, 79, 79, 79, 74],
  STEADY_STARTS,
  STEADY_DURATIONS,
);
const EXPECTED_CLASSIC_SYNTHWAVE_LOW_LOW_ZERO = staticEvents(
  [72, 76, 76, 72, 76, 72, 77, 81, 84, 81, 84, 81, 79, 83, 83, 79, 83, 79, 72, 76, 79, 76, 79, 76],
  STEADY_STARTS,
  STEADY_DURATIONS,
);
const EXPECTED_DARKWAVE_HIGH_HIGH_ZERO = staticEvents(
  [
    63, 67, 67, 67, 63, 67, 63, 63, 62, 65, 65, 65, 62, 65, 62, 62, 68, 72, 72, 72, 68, 72, 68, 68,
    67, 67, 67, 67, 67, 67, 62, 62,
  ],
  ACTIVE_LATER_STARTS,
  ACTIVE_DURATIONS,
);
const EXPECTED_CYBERPUNK_MEDIUM_MEDIUM_ZERO = staticEvents(
  [
    72, 72, 75, 75, 72, 75, 72, 72, 77, 77, 77, 77, 77, 77, 70, 70, 72, 72, 75, 75, 72, 75, 72, 72,
    67, 70, 70, 70, 67, 70, 67, 67,
  ],
  ACTIVE_EARLIER_STARTS,
  ACTIVE_DURATIONS,
);
const EXPECTED_HARMONIC_MINOR_FALLBACK = staticEvents(
  [72, 74, 75, 72, 68, 71, 72, 68, 71, 72, 74, 71, 72, 74, 75, 72],
  SPARSE_STARTS,
  SPARSE_DURATIONS,
);
const ALTERNATE_DARK_SYNTHWAVE_EXACT_PATH = staticEvents(
  [75, 75, 79, 75, 79, 75, 74, 77, 77, 74, 77, 74, 80, 80, 84, 80, 84, 80, 79, 79, 79, 79, 79, 74],
  STEADY_STARTS,
  STEADY_DURATIONS,
);
const FALLBACK_LEGAL_WITNESS = staticEvents(
  [72, 71, 72, 72, 72, 71, 72, 72, 71, 68, 71, 71, 72, 71, 72, 72],
  SPARSE_STARTS,
  SPARSE_DURATIONS,
);

const SOURCE_CASES = [
  [0, DARK_SYNTHWAVE_LOW_LOW_ZERO_PLAN, EXPECTED_DARK_SYNTHWAVE_LOW_LOW_ZERO],
  [1, CLASSIC_SYNTHWAVE_LOW_LOW_ZERO_PLAN, EXPECTED_CLASSIC_SYNTHWAVE_LOW_LOW_ZERO],
  [2, DARKWAVE_HIGH_HIGH_ZERO_PLAN, EXPECTED_DARKWAVE_HIGH_HIGH_ZERO],
  [3, CYBERPUNK_MEDIUM_MEDIUM_ZERO_PLAN, EXPECTED_CYBERPUNK_MEDIUM_MEDIUM_ZERO],
] as const;

function sourceAt(index: number) {
  const source = STAGE8_MOTIF_SOURCE_BINDINGS[index];
  if (source === undefined) throw new Error(`Missing source ${index}.`);
  return source;
}

function direction(value: number): -1 | 0 | 1 {
  return value < 0 ? -1 : value > 0 ? 1 : 0;
}

function exceptionalLeap(value: number): boolean {
  return Math.abs(value) >= 8 && Math.abs(value) <= 12;
}

function chordTone(pitch: number, root: number, quality: string): boolean {
  const relative = (((pitch - root) % 12) + 12) % 12;
  return (quality === "major-triad" ? [0, 4, 7] : [0, 3, 7]).includes(relative);
}

function scaleOrdinal(pitch: number, tonic: number, offsets: readonly number[]): number {
  const quotient = Math.floor((pitch - tonic) / 12);
  const degree = offsets.indexOf(pitch - tonic - 12 * quotient);
  if (degree < 0) throw new Error(`${pitch} is not a scale tone.`);
  return quotient * 7 + degree;
}

function intervals(pitches: readonly number[]): readonly number[] {
  return pitches.slice(1).map((pitch, index) => pitch - (pitches[index] ?? pitch));
}

function assertProjectionConforms(
  harmony: TestHarmony,
  plan: Stage8MotifReferencePlanV1,
  events: readonly Stage8MotifReferenceEventV1[],
): void {
  const rhythm = RHYTHMS[plan.rhythmTemplate];
  const band = BANDS[plan.registerBand];
  const scale = SCALE_OFFSETS[harmony.key.scale as keyof typeof SCALE_OFFSETS];
  if (rhythm === undefined || band === undefined || scale === undefined)
    throw new Error("Bad fixture.");
  const structural = new Set([
    0,
    rhythm.onsets.findIndex((onset) => onset >= 8),
    rhythm.onsets.length - 1,
  ]);
  const count = rhythm.onsets.length;
  expect(events).toHaveLength(count * 4);

  for (const [index, current] of events.entries()) {
    const phraseIndex = Math.floor(index / count);
    const eventIndex = index % count;
    const onset = rhythm.onsets[eventIndex];
    const duration = rhythm.durations[eventIndex];
    if (onset === undefined || duration === undefined) throw new Error("Incomplete rhythm.");
    const displacement =
      phraseIndex === 3 && eventIndex === rhythm.displacementOrdinal
        ? plan.phrase4Displacement === "earlier-480"
          ? -480
          : plan.phrase4Displacement === "later-480"
            ? 480
            : 0
        : 0;
    expect(Reflect.ownKeys(current)).toEqual(["pitch", "startTick", "durationTicks"]);
    expect(Object.isFrozen(current)).toBe(true);
    expect(current.pitch).toBeGreaterThanOrEqual(60);
    expect(current.pitch).toBeLessThanOrEqual(84);
    expect(current.startTick).toBe(phraseIndex * PHRASE_TICKS + onset * 480 + displacement);
    expect(current.durationTicks).toBe(duration);
    expect(scaleOrdinal(current.pitch, harmony.key.tonic, scale)).toEqual(expect.any(Number));
    const previous = events[index - 1];
    const beforePrevious = events[index - 2];
    if (previous !== undefined) {
      expect(current.startTick).toBeGreaterThanOrEqual(previous.startTick + previous.durationTicks);
      const delta = current.pitch - previous.pitch;
      expect(Math.abs(delta)).toBeLessThanOrEqual(12);
      if (beforePrevious !== undefined && exceptionalLeap(previous.pitch - beforePrevious.pitch)) {
        expect(Math.abs(delta)).toBeLessThanOrEqual(2);
        expect(direction(delta)).toBe(-direction(previous.pitch - beforePrevious.pitch));
      }
    }
  }
  const last = events.at(-1);
  const beforeLast = events.at(-2);
  if (last === undefined || beforeLast === undefined) throw new Error("Missing terminal events.");
  expect(exceptionalLeap(last.pitch - beforeLast.pitch)).toBe(false);

  for (let phraseIndex = 0; phraseIndex < 4; phraseIndex += 1) {
    const slot = harmony.slots[phraseIndex];
    if (slot === undefined) throw new Error("Missing slot.");
    const phrase = events.slice(phraseIndex * count, (phraseIndex + 1) * count);
    for (const [eventIndex, current] of phrase.entries()) {
      const prior = phrase[eventIndex - 1];
      expect(current.pitch).toBeGreaterThanOrEqual(band[0]);
      expect(current.pitch).toBeLessThanOrEqual(band[1]);
      if (plan.tensionMode === "chordal" || structural.has(eventIndex))
        expect(chordTone(current.pitch, slot.chord.root, slot.chord.quality)).toBe(true);
      if (
        plan.tensionMode === "diatonic-passing" &&
        structural.has(eventIndex) &&
        prior !== undefined &&
        !structural.has(eventIndex - 1)
      ) {
        const offset = rhythm.contour[eventIndex];
        const priorOffset = rhythm.contour[eventIndex - 1];
        if (offset === undefined || priorOffset === undefined)
          throw new Error("Incomplete contour.");
        expect(
          scaleOrdinal(current.pitch, harmony.key.tonic, scale) -
            scaleOrdinal(prior.pitch, harmony.key.tonic, scale),
        ).toBe(direction(offset - priorOffset));
      }
    }
  }
}

function compareFallbackPaths(left: FallbackPath, right: FallbackPath): number {
  for (const field of ["stepDeviation", "directionChanges", "idealDistance"] as const) {
    const difference = left[field] - right[field];
    if (difference !== 0) return difference;
  }
  for (const [index, pitch] of left.pitches.entries()) {
    const difference = pitch - (right.pitches[index] ?? pitch);
    if (difference !== 0) return difference;
  }
  return 0;
}

/** A test-only derivation of the accepted E-empty fixture's ordinary winner. */
function independentlySelectHarmonicMinorFallback(): FallbackPath | undefined {
  const scale = [0, 2, 3, 5, 7, 8, 11] as const;
  const chords = [
    [67, 72, 75],
    [68, 72, 77],
    [67, 71, 74],
    [67, 72, 75],
  ] as const;
  const ideals = [72, 74, 75, 72, 72, 74, 75, 72, 71, 72, 74, 71, 72, 74, 75, 72] as const;
  const allScale = [67, 68, 71, 72, 74, 75, 77] as const;
  let states = new Map<string, FallbackPath>();
  states.set("start", { pitches: [], stepDeviation: 0, directionChanges: 0, idealDistance: 0 });
  for (let position = 0; position < 16; position += 1) {
    const phraseIndex = Math.floor(position / 4);
    const eventIndex = position % 4;
    const allowed = eventIndex === 1 ? allScale : chords[phraseIndex];
    const ideal = ideals[position];
    if (allowed === undefined || ideal === undefined)
      throw new Error("Incomplete fallback literal.");
    const nextStates = new Map<string, FallbackPath>();
    for (const path of states.values()) {
      const previous = path.pitches.at(-1);
      const beforePrevious = path.pitches.at(-2);
      for (const pitch of allowed) {
        if (previous !== undefined) {
          const delta = pitch - previous;
          if (Math.abs(delta) > 12) continue;
          if (
            beforePrevious !== undefined &&
            exceptionalLeap(previous - beforePrevious) &&
            (Math.abs(delta) > 2 || direction(delta) !== -direction(previous - beforePrevious))
          ) {
            continue;
          }
          if (
            eventIndex === 2 &&
            scaleOrdinal(pitch, 0, scale) - scaleOrdinal(previous, 0, scale) !== 1
          )
            continue;
        }
        const samePhrase = position > 0 && Math.floor((position - 1) / 4) === phraseIndex;
        const actual =
          previous === undefined || !samePhrase
            ? undefined
            : scaleOrdinal(pitch, 0, scale) - scaleOrdinal(previous, 0, scale);
        const expected = samePhrase ? ([0, 1, 1, -2][eventIndex] ?? 0) : undefined;
        const candidate: FallbackPath = {
          pitches: [...path.pitches, pitch],
          stepDeviation:
            path.stepDeviation + (actual === undefined ? 0 : Math.abs(actual - (expected ?? 0))),
          directionChanges:
            path.directionChanges +
            (actual === undefined || direction(actual) === direction(expected ?? 0) ? 0 : 1),
          idealDistance: path.idealDistance + Math.abs(pitch - ideal),
        };
        const key =
          candidate.pitches.length === 1
            ? `first:${pitch}`
            : `${candidate.pitches.at(-2)}:${candidate.pitches.at(-1)}`;
        const incumbent = nextStates.get(key);
        if (incumbent === undefined || compareFallbackPaths(candidate, incumbent) < 0)
          nextStates.set(key, candidate);
      }
    }
    states = nextStates;
  }
  let selected: FallbackPath | undefined;
  for (const candidate of states.values()) {
    const terminal = (candidate.pitches.at(-1) ?? 0) - (candidate.pitches.at(-2) ?? 0);
    if (exceptionalLeap(terminal)) continue;
    if (selected === undefined || compareFallbackPaths(candidate, selected) < 0)
      selected = candidate;
  }
  return selected;
}

/**
 * Independently exhausts the documented Phrase-1/Phrase-3 exact candidates
 * and factorizes compatible Phrase-2/Phrase-4 minima for the dark-synthwave
 * source-0 / steady-6 / upper / chordal / none fixture. It deliberately uses
 * only literals transcribed from MOTIF_MODEL.md.
 */
function independentlySelectDarkSynthwaveExactPath(): FallbackPath | undefined {
  const scale = [0, 2, 3, 5, 7, 8, 10] as const;
  const contour = [0, 1, 2, 1, 2, 0] as const;
  const phraseCandidates = [
    [72, 75, 79, 84],
    [74, 77, 82],
    [72, 75, 80, 84],
    [74, 79],
  ] as const;
  const phraseIdeals = [
    [79, 80, 82, 80, 82, 79],
    [77, 79, 80, 79, 80, 77],
    [80, 82, 84, 82, 84, 80],
    [79, 80, 82, 80, 82, 79],
  ] as const;

  function transitionAllows(
    previousPrevious: number | undefined,
    previous: number | undefined,
    current: number,
  ): boolean {
    if (previous === undefined) return true;
    const delta = current - previous;
    if (Math.abs(delta) > 12) return false;
    if (
      previousPrevious !== undefined &&
      exceptionalLeap(previous - previousPrevious) &&
      (Math.abs(delta) > 2 || direction(delta) !== -direction(previous - previousPrevious))
    ) {
      return false;
    }
    return true;
  }

  function enumeratePhrase(
    candidates: readonly number[],
    ideals: readonly number[],
    requireNonExceptionalTerminal: boolean,
  ): readonly FallbackPath[] {
    const paths: FallbackPath[] = [];
    const visit = (eventIndex: number, path: FallbackPath): void => {
      if (eventIndex === contour.length) {
        const terminal = (path.pitches.at(-1) ?? 0) - (path.pitches.at(-2) ?? 0);
        if (!requireNonExceptionalTerminal || !exceptionalLeap(terminal)) paths.push(path);
        return;
      }
      const ideal = ideals[eventIndex];
      const expected = eventIndex === 0 ? undefined : contour[eventIndex] - contour[eventIndex - 1];
      if (ideal === undefined || (eventIndex > 0 && expected === undefined))
        throw new Error("Incomplete exact-path literal.");
      for (const pitch of candidates) {
        const previous = path.pitches.at(-1);
        const previousPrevious = path.pitches.at(-2);
        if (!transitionAllows(previousPrevious, previous, pitch)) continue;
        const actual =
          previous === undefined
            ? undefined
            : scaleOrdinal(pitch, 0, scale) - scaleOrdinal(previous, 0, scale);
        visit(eventIndex + 1, {
          pitches: [...path.pitches, pitch],
          stepDeviation:
            path.stepDeviation + (actual === undefined ? 0 : Math.abs(actual - (expected ?? 0))),
          directionChanges:
            path.directionChanges +
            (actual === undefined || direction(actual) === direction(expected ?? 0) ? 0 : 1),
          idealDistance: path.idealDistance + Math.abs(pitch - ideal),
        });
      }
    };
    visit(0, { pitches: [], stepDeviation: 0, directionChanges: 0, idealDistance: 0 });
    return paths;
  }

  function boundaryAllows(left: FallbackPath, right: FallbackPath): boolean {
    const leftPenultimate = left.pitches.at(-2);
    const leftLast = left.pitches.at(-1);
    const rightFirst = right.pitches[0];
    const rightSecond = right.pitches[1];
    if (
      leftPenultimate === undefined ||
      leftLast === undefined ||
      rightFirst === undefined ||
      rightSecond === undefined
    ) {
      throw new Error("Incomplete exact-path boundary.");
    }
    return (
      transitionAllows(leftPenultimate, leftLast, rightFirst) &&
      transitionAllows(leftLast, rightFirst, rightSecond)
    );
  }

  function combine(...paths: readonly FallbackPath[]): FallbackPath {
    return {
      pitches: paths.flatMap((path) => path.pitches),
      stepDeviation: paths.reduce((total, path) => total + path.stepDeviation, 0),
      directionChanges: paths.reduce((total, path) => total + path.directionChanges, 0),
      idealDistance: paths.reduce((total, path) => total + path.idealDistance, 0),
    };
  }

  const phraseOneCandidates = phraseCandidates[0];
  const phraseTwoCandidates = phraseCandidates[1];
  const phraseThreeCandidates = phraseCandidates[2];
  const phraseFourCandidates = phraseCandidates[3];
  const phraseOneIdeals = phraseIdeals[0];
  const phraseTwoIdeals = phraseIdeals[1];
  const phraseThreeIdeals = phraseIdeals[2];
  const phraseFourIdeals = phraseIdeals[3];
  if (
    phraseOneCandidates === undefined ||
    phraseTwoCandidates === undefined ||
    phraseThreeCandidates === undefined ||
    phraseFourCandidates === undefined ||
    phraseOneIdeals === undefined ||
    phraseTwoIdeals === undefined ||
    phraseThreeIdeals === undefined ||
    phraseFourIdeals === undefined
  ) {
    throw new Error("Incomplete exact-path fixture.");
  }
  const phraseOnePaths = enumeratePhrase(phraseOneCandidates, phraseOneIdeals, false);
  const phraseTwoPaths = enumeratePhrase(phraseTwoCandidates, phraseTwoIdeals, false);
  const phraseThreeByPitches = new Map(
    enumeratePhrase(phraseThreeCandidates, phraseThreeIdeals, false).map((path) => [
      path.pitches.join(","),
      path,
    ]),
  );
  const phraseFourPaths = enumeratePhrase(phraseFourCandidates, phraseFourIdeals, true);
  let selected: FallbackPath | undefined;

  for (const phraseOne of phraseOnePaths) {
    const firstPhraseOnePitch = phraseOne.pitches[0];
    if (firstPhraseOnePitch === undefined) throw new Error("Incomplete Phrase 1.");
    for (const phraseThreeFirstPitch of phraseThreeCandidates) {
      const shift = phraseThreeFirstPitch - firstPhraseOnePitch;
      const phraseThree = phraseThreeByPitches.get(
        phraseOne.pitches.map((pitch) => pitch + shift).join(","),
      );
      if (phraseThree === undefined) continue;
      let bestPhraseTwo: FallbackPath | undefined;
      for (const phraseTwo of phraseTwoPaths) {
        if (!boundaryAllows(phraseOne, phraseTwo) || !boundaryAllows(phraseTwo, phraseThree))
          continue;
        if (bestPhraseTwo === undefined || compareFallbackPaths(phraseTwo, bestPhraseTwo) < 0)
          bestPhraseTwo = phraseTwo;
      }
      if (bestPhraseTwo === undefined) continue;
      let bestPhraseFour: FallbackPath | undefined;
      for (const phraseFour of phraseFourPaths) {
        if (!boundaryAllows(phraseThree, phraseFour)) continue;
        if (bestPhraseFour === undefined || compareFallbackPaths(phraseFour, bestPhraseFour) < 0)
          bestPhraseFour = phraseFour;
      }
      if (bestPhraseFour === undefined) continue;
      const candidate = combine(phraseOne, bestPhraseTwo, phraseThree, bestPhraseFour);
      if (selected === undefined || compareFallbackPaths(candidate, selected) < 0)
        selected = candidate;
    }
  }
  return selected;
}

/** Scores a static legal E candidate with the documented ordinary objective. */
function scoreDarkSynthwaveExactPath(events: readonly Stage8MotifReferenceEventV1[]): FallbackPath {
  const scale = [0, 2, 3, 5, 7, 8, 10] as const;
  const contour = [0, 1, 2, 1, 2, 0] as const;
  const ideals = [
    79, 80, 82, 80, 82, 79, 77, 79, 80, 79, 80, 77, 80, 82, 84, 82, 84, 80, 79, 80, 82, 80, 82, 79,
  ] as const;
  if (events.length !== 24) throw new Error("Expected the exact steady-6 section.");
  let stepDeviation = 0;
  let directionChanges = 0;
  let idealDistance = 0;
  const pitches = events.map((current) => current.pitch);
  for (const [index, pitch] of pitches.entries()) {
    const ideal = ideals[index];
    if (ideal === undefined) throw new Error("Incomplete exact-path ideals.");
    idealDistance += Math.abs(pitch - ideal);
    const eventIndex = index % contour.length;
    if (eventIndex === 0) continue;
    const previous = pitches[index - 1];
    const expected = contour[eventIndex] - contour[eventIndex - 1];
    if (previous === undefined || expected === undefined)
      throw new Error("Incomplete exact-path contour.");
    const actual = scaleOrdinal(pitch, 0, scale) - scaleOrdinal(previous, 0, scale);
    stepDeviation += Math.abs(actual - expected);
    if (direction(actual) !== direction(expected)) directionChanges += 1;
  }
  return { pitches, stepDeviation, directionChanges, idealDistance };
}

describe("Stage 8 Motif reference projector", () => {
  it("matches independently derived source fixtures, including cache-null regression coverage", () => {
    for (const [sourceIndex, plan, expected] of SOURCE_CASES) {
      const source = sourceAt(sourceIndex);
      const result = projectStage8MotifReferencePlanV1(source.harmony, plan);
      expect(result).toEqual(expected);
      assertProjectionConforms(source.harmony, plan, result);
      const count = RHYTHMS[plan.rhythmTemplate]?.onsets.length;
      if (count === undefined) throw new Error("Missing rhythm.");
      expect(intervals(result.slice(count * 2, count * 3).map((current) => current.pitch))).toEqual(
        intervals(result.slice(0, count).map((current) => current.pitch)),
      );
    }
  });

  it("proves the named harmonic-minor fixture has E empty and a legal ordinary winner", () => {
    /* P1 passing requires B→C or D→Eb (+1); P3 requires Ab→B (+3) or C→D (+2). */
    const phraseOneRequiredIntervals = [72 - 71, 75 - 74] as const;
    const phraseThreeRequiredIntervals = [71 - 68, 74 - 72] as const;
    expect(phraseOneRequiredIntervals).toEqual([1, 1]);
    expect(phraseThreeRequiredIntervals).toEqual([3, 2]);
    expect(
      phraseOneRequiredIntervals.some((value) => phraseThreeRequiredIntervals.includes(value)),
    ).toBe(false);
    assertProjectionConforms(
      HARMONIC_MINOR_FALLBACK_HARMONY,
      HARMONIC_MINOR_FALLBACK_PLAN,
      FALLBACK_LEGAL_WITNESS,
    );
    expect(independentlySelectHarmonicMinorFallback()?.pitches).toEqual(
      EXPECTED_HARMONIC_MINOR_FALLBACK.map((current) => current.pitch),
    );
    const result = projectStage8MotifReferencePlanV1(
      HARMONIC_MINOR_FALLBACK_HARMONY,
      HARMONIC_MINOR_FALLBACK_PLAN,
    );
    expect(result).toEqual(EXPECTED_HARMONIC_MINOR_FALLBACK);
    assertProjectionConforms(HARMONIC_MINOR_FALLBACK_HARMONY, HARMONIC_MINOR_FALLBACK_PLAN, result);
    expect(intervals(result.slice(8, 12).map((current) => current.pitch))).not.toEqual(
      intervals(result.slice(0, 4).map((current) => current.pitch)),
    );
  });

  it("exhaustively selects the documented Phrase-3 exact subset before the ordinary objective", () => {
    const source = sourceAt(0);
    const selected = independentlySelectDarkSynthwaveExactPath();
    if (selected === undefined) throw new Error("Expected a complete exact-preservation path.");
    const result = projectStage8MotifReferencePlanV1(
      source.harmony,
      DARK_SYNTHWAVE_LOW_LOW_ZERO_PLAN,
    );
    const expectedPitches = EXPECTED_DARK_SYNTHWAVE_LOW_LOW_ZERO.map((current) => current.pitch);
    const alternatePitches = ALTERNATE_DARK_SYNTHWAVE_EXACT_PATH.map((current) => current.pitch);
    const count = RHYTHMS["steady-6"].onsets.length;

    assertProjectionConforms(source.harmony, DARK_SYNTHWAVE_LOW_LOW_ZERO_PLAN, result);
    assertProjectionConforms(
      source.harmony,
      DARK_SYNTHWAVE_LOW_LOW_ZERO_PLAN,
      ALTERNATE_DARK_SYNTHWAVE_EXACT_PATH,
    );
    expect(selected.pitches).toEqual(expectedPitches);
    expect(result.map((current) => current.pitch)).toEqual(selected.pitches);
    expect(selected).toMatchObject({ stepDeviation: 17, directionChanges: 7, idealDistance: 56 });
    expect(alternatePitches.slice(count * 2, count * 3)).toEqual(
      alternatePitches.slice(0, count).map((pitch) => pitch + 5),
    );
    expect(expectedPitches.slice(count * 2, count * 3)).toEqual(
      expectedPitches.slice(0, count).map((pitch) => pitch + 5),
    );
    expect(scoreDarkSynthwaveExactPath(EXPECTED_DARK_SYNTHWAVE_LOW_LOW_ZERO)).toEqual(selected);
    const alternateScore = scoreDarkSynthwaveExactPath(ALTERNATE_DARK_SYNTHWAVE_EXACT_PATH);
    expect(alternateScore).toMatchObject({
      stepDeviation: 17,
      directionChanges: 7,
      idealDistance: 60,
    });
    expect(compareFallbackPaths(selected, alternateScore)).toBeLessThan(0);
  });

  it("returns detached deeply frozen results without input mutation or ambient randomness", () => {
    const source = sourceAt(0);
    const harmonyBefore = JSON.stringify(source.harmony);
    const planBefore = JSON.stringify(DARK_SYNTHWAVE_LOW_LOW_ZERO_PLAN);
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness must not be used");
    });
    try {
      const first = projectStage8MotifReferencePlanV1(
        source.harmony,
        DARK_SYNTHWAVE_LOW_LOW_ZERO_PLAN,
      );
      const second = projectStage8MotifReferencePlanV1(
        source.harmony,
        DARK_SYNTHWAVE_LOW_LOW_ZERO_PLAN,
      );
      expect(first).toEqual(EXPECTED_DARK_SYNTHWAVE_LOW_LOW_ZERO);
      expect(first).not.toBe(second);
      expect(first[0]).not.toBe(second[0]);
      expect(Object.isFrozen(first)).toBe(true);
      const firstEvent = first[0];
      if (firstEvent === undefined) throw new Error("Missing event.");
      expect(Object.isFrozen(firstEvent)).toBe(true);
      expect(Reflect.set(first, "0", event(60, 0, 960))).toBe(false);
      expect(Reflect.set(firstEvent, "pitch", 60)).toBe(false);
    } finally {
      random.mockRestore();
    }
    expect(JSON.stringify(source.harmony)).toBe(harmonyBefore);
    expect(JSON.stringify(DARK_SYNTHWAVE_LOW_LOW_ZERO_PLAN)).toBe(planBefore);
  });

  it("accepts value-identical frozen clones and rejects forged or malformed Harmony", () => {
    const source = sourceAt(0);
    const plan = frozenClone(DARK_SYNTHWAVE_LOW_LOW_ZERO_PLAN);
    expect(projectStage8MotifReferencePlanV1(frozenClone(source.harmony), plan)).toEqual(
      EXPECTED_DARK_SYNTHWAVE_LOW_LOW_ZERO,
    );
    expect(() => projectStage8MotifReferencePlanV1(structuredClone(source.harmony), plan)).toThrow(
      RangeError,
    );
    const reordered = deepFreeze({
      templateId: source.harmony.templateId,
      profile: source.harmony.profile,
      templateVersion: source.harmony.templateVersion,
      key: source.harmony.key,
      slots: source.harmony.slots,
    });
    expect(() => projectStage8MotifReferencePlanV1(reordered, plan)).toThrow(/harmony/);
    const forged = structuredClone(source.harmony) as unknown as {
      slots: { chord: { root: number; quality: string }; voicing: { midiPitches: number[] } }[];
    };
    const slot = forged.slots[0];
    if (slot === undefined) throw new Error("Missing source slot.");
    slot.chord = { root: 1, quality: "major-triad" };
    slot.voicing = { midiPitches: [37, 41, 44] };
    expect(() => projectStage8MotifReferencePlanV1(deepFreeze(forged), plan)).toThrow(
      /harmony.context/,
    );
    for (const altered of [
      deepFreeze({ ...structuredClone(source.harmony), profile: "classic-synthwave" }),
      deepFreeze({
        ...structuredClone(source.harmony),
        templateId: "degree-9999-natural-minor-v1",
      }),
      deepFreeze({ ...structuredClone(source.harmony), key: { tonic: 1, scale: "natural-minor" } }),
      deepFreeze({
        ...structuredClone(source.harmony),
        key: { tonic: 0, scale: "harmonic-minor" },
      }),
      deepFreeze({
        ...structuredClone(source.harmony),
        slots: structuredClone(source.harmony.slots).map((current, index) =>
          index === 0 ? { ...current, degree: 1 } : current,
        ),
      }),
      deepFreeze({
        ...structuredClone(source.harmony),
        slots: structuredClone(source.harmony.slots).map((current, index) =>
          index === 0 ? { ...current, inversion: 1 } : current,
        ),
      }),
      deepFreeze({
        ...structuredClone(source.harmony),
        slots: structuredClone(source.harmony.slots).map((current, index) =>
          index === 0 ? { ...current, voicing: { midiPitches: [48, 51, 55] } } : current,
        ),
      }),
      deepFreeze({ ...structuredClone(source.harmony), extra: true }),
    ]) {
      expect(() => projectStage8MotifReferencePlanV1(altered, plan)).toThrow(RangeError);
    }
    const primitiveMalformed: readonly [unknown, RegExp][] = [
      [
        deepFreeze({
          ...structuredClone(source.harmony),
          key: { tonic: "0", scale: source.harmony.key.scale },
        }),
        /harmony\.key\.tonic/,
      ],
      [
        deepFreeze({
          ...structuredClone(source.harmony),
          key: { tonic: 0.5, scale: source.harmony.key.scale },
        }),
        /harmony\.key\.tonic/,
      ],
      [
        deepFreeze({
          ...structuredClone(source.harmony),
          key: { tonic: Number.NaN, scale: source.harmony.key.scale },
        }),
        /harmony\.key\.tonic/,
      ],
      [
        deepFreeze({
          ...structuredClone(source.harmony),
          slots: structuredClone(source.harmony.slots).map((current, index) =>
            index === 0 ? { ...current, bars: 1 } : current,
          ),
        }),
        /harmony\.slots\[0\]\.bars/,
      ],
      [
        deepFreeze({
          ...structuredClone(source.harmony),
          slots: structuredClone(source.harmony.slots).map((current, index) =>
            index === 0
              ? { ...current, chord: { ...current.chord, quality: "dominant-seventh" } }
              : current,
          ),
        }),
        /harmony\.slots\[0\]\.chord\.quality/,
      ],
      [
        deepFreeze({
          ...structuredClone(source.harmony),
          slots: structuredClone(source.harmony.slots).map((current, index) =>
            index === 0 ? { ...current, voicing: { midiPitches: [36, 43, 39] } } : current,
          ),
        }),
        /harmony\.slots\[0\]\.voicing\.midiPitches/,
      ],
    ];
    for (const [malformed, field] of primitiveMalformed) {
      expect(() => projectStage8MotifReferencePlanV1(malformed, plan)).toThrow(field);
    }
    const nullPrototype = Object.assign(Object.create(null), structuredClone(source.harmony));
    expect(() => projectStage8MotifReferencePlanV1(deepFreeze(nullPrototype), plan)).toThrow(
      RangeError,
    );
    const accessor = structuredClone(source.harmony) as Record<string, unknown>;
    const profile = accessor.profile;
    delete accessor.profile;
    Object.defineProperty(accessor, "profile", { enumerable: true, get: () => profile });
    expect(() => projectStage8MotifReferencePlanV1(deepFreeze(accessor), plan)).toThrow(RangeError);
    const sparseSlots = new Array(4);
    sparseSlots[0] = structuredClone(source.harmony.slots[0]);
    sparseSlots[2] = structuredClone(source.harmony.slots[2]);
    sparseSlots[3] = structuredClone(source.harmony.slots[3]);
    expect(() =>
      projectStage8MotifReferencePlanV1(
        deepFreeze({ ...structuredClone(source.harmony), slots: sparseSlots }),
        plan,
      ),
    ).toThrow(RangeError);
  });

  it("allows harmonic-minor only with its exact companion plan", () => {
    const invalidCompanions: readonly unknown[] = [
      deepFreeze({
        ...HARMONIC_MINOR_FALLBACK_PLAN,
        rhythmTemplate: "steady-6",
        contourOffsets: [0, 1, 2, 1, 2, 0],
      }),
      deepFreeze({ ...HARMONIC_MINOR_FALLBACK_PLAN, registerBand: "lower" }),
      deepFreeze({ ...HARMONIC_MINOR_FALLBACK_PLAN, tensionMode: "chordal" }),
      deepFreeze({ ...HARMONIC_MINOR_FALLBACK_PLAN, phrase4Displacement: "earlier-480" }),
      deepFreeze({ ...HARMONIC_MINOR_FALLBACK_PLAN, phrase4Displacement: "later-480" }),
    ];
    for (const plan of invalidCompanions) {
      expect(() =>
        projectStage8MotifReferencePlanV1(HARMONIC_MINOR_FALLBACK_HARMONY, plan),
      ).toThrow(/plan.supplementalFixture/);
    }
    for (const malformed of [
      deepFreeze({ ...HARMONIC_MINOR_FALLBACK_PLAN, policyVersion: "other" }),
      deepFreeze({ ...HARMONIC_MINOR_FALLBACK_PLAN, profileVersion: "other" }),
      deepFreeze({ ...HARMONIC_MINOR_FALLBACK_PLAN, contourOffsets: [0, 2, 1, 0] }),
      deepFreeze({
        ...HARMONIC_MINOR_FALLBACK_PLAN,
        phraseRoles: [
          "identity",
          "other",
          "harmony-aware-transposition",
          "contour-preserving-response",
        ],
      }),
      deepFreeze({ ...HARMONIC_MINOR_FALLBACK_PLAN, extra: true }),
    ]) {
      expect(() =>
        projectStage8MotifReferencePlanV1(HARMONIC_MINOR_FALLBACK_HARMONY, malformed),
      ).toThrow(RangeError);
    }
  });
});
