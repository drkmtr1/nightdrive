import { getChordPitchClasses } from "../music-domain/chord";
import type { HarmonyProgressionRealization } from "../music-domain/harmony";
import { pitchClassesForKey } from "../music-domain/key";
import {
  getMotifRhythmTemplateV1,
  MOTIF_PHRASE_ROLES_V1,
  MOTIF_PHRASE4_DISPLACEMENTS_V1,
  MOTIF_REGISTER_BANDS_V1,
  MOTIF_TENSION_MODES_V1,
  type MotifDurationTicksV1,
} from "../music-domain/motif-catalog";
import { createMotifEventV1, type MotifEventV1 } from "../music-domain/motif-event";
import { MOTIF_POLICY_VERSION_V1, type ResolvedMotifPlanV1 } from "../music-domain/motif-policy";
import { MOTIF_PROFILE_DATA_VERSION_V1 } from "../music-domain/motif-profile-configuration";
import { getScaleFormula } from "../music-domain/scale";

const PHRASE_LENGTH_TICKS = 7_680;
const SECTION_LENGTH_TICKS = 30_720;
const GRID_TICKS = 480;

const REGISTER_RANGES = Object.freeze({
  lower: Object.freeze({ minimum: 60, maximum: 72 }),
  middle: Object.freeze({ minimum: 66, maximum: 78 }),
  upper: Object.freeze({ minimum: 72, maximum: 84 }),
} as const);

type Direction = -1 | 0 | 1;
type Score = Readonly<{
  contourDeviation: number;
  directionChanges: number;
  idealDistance: number;
}>;
type TransitionState = Readonly<{
  pitch: number;
  pendingExceptionalDirection: Direction;
}>;
type EventSpec = Readonly<{
  phraseIndex: number;
  eventIndex: number;
  startTick: number;
  durationTicks: MotifDurationTicksV1;
  contourOffset: number;
  idealPitch: number;
  structural: boolean;
  candidates: readonly number[];
}>;
type Path = Readonly<{
  pitches: readonly number[];
  state: TransitionState;
  score: Score;
}>;
type PairedPath = Readonly<{
  phrase1Pitches: readonly number[];
  phrase3Pitches: readonly number[];
  phrase1State: TransitionState;
  phrase3State: TransitionState;
  phrase3FirstPitch: number;
  score: Score;
}>;

function invariant(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`Resolved Motif projection invariant failed: ${message}`);
}

export class MotifProjectionNoValidPathError extends Error {
  constructor() {
    super("Resolved Motif projection has no complete legal eight-bar path.");
    this.name = "MotifProjectionNoValidPathError";
  }
}

function direction(value: number): Direction {
  return value < 0 ? -1 : value > 0 ? 1 : 0;
}

function addScore(left: Score, right: Score): Score {
  return {
    contourDeviation: left.contourDeviation + right.contourDeviation,
    directionChanges: left.directionChanges + right.directionChanges,
    idealDistance: left.idealDistance + right.idealDistance,
  };
}

function compareNumbers(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left.length - right.length;
}

function compareScore(left: Score, right: Score): number {
  return (
    left.contourDeviation - right.contourDeviation ||
    left.directionChanges - right.directionChanges ||
    left.idealDistance - right.idealDistance
  );
}

function comparePaths(left: Path, right: Path): number {
  return compareScore(left.score, right.score) || compareNumbers(left.pitches, right.pitches);
}

function comparePairedPaths(left: PairedPath, right: PairedPath): number {
  return (
    compareScore(left.score, right.score) ||
    compareNumbers(left.phrase1Pitches, right.phrase1Pitches) ||
    compareNumbers(left.phrase3Pitches, right.phrase3Pitches)
  );
}

function scaleOrdinal(progression: HarmonyProgressionRealization, pitch: number): number {
  const formula = getScaleFormula(progression.key.scale);
  for (let degree = 0; degree < formula.length; degree += 1) {
    const chromaticOffset = pitch - progression.key.tonic - formula[degree];
    if (chromaticOffset % 12 === 0) return (chromaticOffset / 12) * 7 + degree;
  }
  throw new Error("Resolved Motif projection invariant failed: pitch is outside the Key scale");
}

function pitchAtScaleOrdinal(progression: HarmonyProgressionRealization, ordinal: number): number {
  const formula = getScaleFormula(progression.key.scale);
  const octave = Math.floor(ordinal / 7);
  const degree = ((ordinal % 7) + 7) % 7;
  return progression.key.tonic + octave * 12 + formula[degree];
}

function transition(previous: TransitionState, nextPitch: number): TransitionState | undefined {
  const interval = nextPitch - previous.pitch;
  const absoluteInterval = Math.abs(interval);
  if (absoluteInterval > 12) return undefined;
  if (
    previous.pendingExceptionalDirection !== 0 &&
    (absoluteInterval > 2 || direction(interval) !== -previous.pendingExceptionalDirection)
  ) {
    return undefined;
  }
  return {
    pitch: nextPitch,
    pendingExceptionalDirection: absoluteInterval >= 8 ? direction(interval) : 0,
  };
}

function eventScore(spec: EventSpec, pitch: number): Score {
  return {
    contourDeviation: 0,
    directionChanges: 0,
    idealDistance: Math.abs(pitch - spec.idealPitch),
  };
}

function intervalScore(
  progression: HarmonyProgressionRealization,
  previousSpec: EventSpec,
  previousPitch: number,
  spec: EventSpec,
  pitch: number,
): Score {
  if (previousSpec.phraseIndex !== spec.phraseIndex) {
    return { contourDeviation: 0, directionChanges: 0, idealDistance: 0 };
  }
  const expected = spec.contourOffset - previousSpec.contourOffset;
  const realized = scaleOrdinal(progression, pitch) - scaleOrdinal(progression, previousPitch);
  return {
    contourDeviation: Math.abs(realized - expected),
    directionChanges: direction(realized) === direction(expected) ? 0 : 1,
    idealDistance: 0,
  };
}

function respectsPassingResolution(
  progression: HarmonyProgressionRealization,
  plan: ResolvedMotifPlanV1,
  previousSpec: EventSpec,
  previousPitch: number,
  spec: EventSpec,
  pitch: number,
): boolean {
  if (
    plan.tensionMode !== "diatonic-passing" ||
    previousSpec.phraseIndex !== spec.phraseIndex ||
    previousSpec.structural ||
    !spec.structural
  ) {
    return true;
  }
  const expectedDirection = direction(spec.contourOffset - previousSpec.contourOffset);
  const realized = scaleOrdinal(progression, pitch) - scaleOrdinal(progression, previousPitch);
  return realized === expectedDirection;
}

function assertResolvedInputs(
  progression: HarmonyProgressionRealization,
  plan: ResolvedMotifPlanV1,
): void {
  invariant(plan.policyVersion === MOTIF_POLICY_VERSION_V1, "unsupported policy version");
  invariant(plan.profileVersion === MOTIF_PROFILE_DATA_VERSION_V1, "unsupported profile version");
  invariant(MOTIF_REGISTER_BANDS_V1.includes(plan.registerBand), "unsupported register band");
  invariant(MOTIF_TENSION_MODES_V1.includes(plan.tensionMode), "unsupported tension mode");
  invariant(
    MOTIF_PHRASE4_DISPLACEMENTS_V1.includes(plan.phrase4Displacement),
    "unsupported Phrase-4 displacement",
  );
  const template = getMotifRhythmTemplateV1(plan.rhythmTemplate);
  invariant(plan.contourOffsets === template.contourOffsets, "contour must be the catalog value");
  invariant(plan.phraseRoles === MOTIF_PHRASE_ROLES_V1, "phrase roles must be the catalog value");
  invariant(progression.slots.length === 4, "Harmony must contain four slots");
  for (const [index, slot] of progression.slots.entries()) {
    invariant(slot.index === index && slot.bars === 2, "Harmony slots must be four ordered pairs");
  }
}

function buildPhraseSpecs(
  progression: HarmonyProgressionRealization,
  plan: ResolvedMotifPlanV1,
): readonly (readonly EventSpec[])[] {
  const template = getMotifRhythmTemplateV1(plan.rhythmTemplate);
  const range = REGISTER_RANGES[plan.registerBand];
  const scalePitchClasses = pitchClassesForKey(progression.key);
  const midpoint = Math.trunc((range.minimum + range.maximum) / 2);
  const phrases: EventSpec[][] = [];

  for (let phraseIndex = 0; phraseIndex < 4; phraseIndex += 1) {
    const slot = progression.slots[phraseIndex];
    const chordPitchClasses = getChordPitchClasses(slot.chord);
    const chordPitches: number[] = [];
    const scalePitches: number[] = [];
    for (let pitch = range.minimum; pitch <= range.maximum; pitch += 1) {
      const pitchClass = pitch % 12;
      if (scalePitchClasses.includes(pitchClass as never)) {
        scalePitches.push(pitch);
        if (chordPitchClasses.includes(pitchClass as never)) chordPitches.push(pitch);
      }
    }
    invariant(chordPitches.length > 0, "selected register band has no legal chord anchor");
    const anchor = [...chordPitches].sort(
      (left, right) => Math.abs(left - midpoint) - Math.abs(right - midpoint) || left - right,
    )[0];
    const anchorOrdinal = scaleOrdinal(progression, anchor);
    const firstBar2Event = template.relativeOnsetGridIndices.findIndex((value) => value >= 8);
    invariant(firstBar2Event >= 0, "rhythm template has no event in bar 2");

    const specs = template.relativeOnsetGridIndices.map((gridIndex, eventIndex) => {
      const structural =
        eventIndex === 0 ||
        eventIndex === firstBar2Event ||
        eventIndex === template.relativeOnsetGridIndices.length - 1;
      let adjustedGridIndex = gridIndex;
      if (phraseIndex === 3 && eventIndex === template.displacementEventOrdinal) {
        if (plan.phrase4Displacement === "earlier-480") adjustedGridIndex -= 1;
        if (plan.phrase4Displacement === "later-480") adjustedGridIndex += 1;
      }
      const startTick = phraseIndex * PHRASE_LENGTH_TICKS + adjustedGridIndex * GRID_TICKS;
      const durationTicks = template.durationsTicks[eventIndex];
      const candidates = structural || plan.tensionMode === "chordal" ? chordPitches : scalePitches;
      return Object.freeze({
        phraseIndex,
        eventIndex,
        startTick,
        durationTicks,
        contourOffset: template.contourOffsets[eventIndex],
        idealPitch: pitchAtScaleOrdinal(
          progression,
          anchorOrdinal + template.contourOffsets[eventIndex],
        ),
        structural,
        candidates: Object.freeze([...candidates]),
      });
    });

    for (let index = 0; index < specs.length; index += 1) {
      const spec = specs[index];
      invariant(spec.startTick >= phraseIndex * PHRASE_LENGTH_TICKS, "event precedes its phrase");
      invariant(
        spec.startTick + spec.durationTicks <= (phraseIndex + 1) * PHRASE_LENGTH_TICKS,
        "event crosses its phrase",
      );
      if (index > 0) {
        invariant(
          specs[index - 1].startTick + specs[index - 1].durationTicks <= spec.startTick,
          "events overlap or are unordered",
        );
      }
    }
    phrases.push(specs);
  }
  return Object.freeze(phrases.map((phrase) => Object.freeze(phrase)));
}

function advancePath(
  progression: HarmonyProgressionRealization,
  plan: ResolvedMotifPlanV1,
  path: Path | undefined,
  previousSpec: EventSpec | undefined,
  spec: EventSpec,
  pitch: number,
): Path | undefined {
  const state =
    path === undefined
      ? { pitch, pendingExceptionalDirection: 0 as Direction }
      : transition(path.state, pitch);
  if (state === undefined) return undefined;
  if (
    path !== undefined &&
    previousSpec !== undefined &&
    !respectsPassingResolution(progression, plan, previousSpec, path.state.pitch, spec, pitch)
  ) {
    return undefined;
  }
  const score = addScore(
    path?.score ?? { contourDeviation: 0, directionChanges: 0, idealDistance: 0 },
    addScore(
      eventScore(spec, pitch),
      path === undefined || previousSpec === undefined
        ? { contourDeviation: 0, directionChanges: 0, idealDistance: 0 }
        : intervalScore(progression, previousSpec, path.state.pitch, spec, pitch),
    ),
  );
  return {
    pitches: Object.freeze([...(path?.pitches ?? []), pitch]),
    state,
    score,
  };
}

function keepBest(map: Map<string, Path>, key: string, candidate: Path): void {
  const current = map.get(key);
  if (current === undefined || comparePaths(candidate, current) < 0) map.set(key, candidate);
}

function projectSpecs(
  progression: HarmonyProgressionRealization,
  plan: ResolvedMotifPlanV1,
  specs: readonly EventSpec[],
  initial?: Path,
  previousSpec?: EventSpec,
): readonly Path[] {
  let paths = initial === undefined ? new Map<string, Path>() : new Map([["initial", initial]]);
  for (const [specIndex, spec] of specs.entries()) {
    const next = new Map<string, Path>();
    if (initial === undefined && specIndex === 0) {
      for (const pitch of spec.candidates) {
        const candidate = advancePath(progression, plan, undefined, undefined, spec, pitch);
        if (candidate !== undefined) keepBest(next, `${candidate.state.pitch}:0`, candidate);
      }
    } else {
      if (paths.size === 0) break;
      for (const path of paths.values()) {
        for (const pitch of spec.candidates) {
          const candidate = advancePath(progression, plan, path, previousSpec, spec, pitch);
          if (candidate !== undefined) {
            keepBest(
              next,
              `${candidate.state.pitch}:${candidate.state.pendingExceptionalDirection}`,
              candidate,
            );
          }
        }
      }
    }
    paths = next;
    previousSpec = spec;
  }
  return [...paths.values()];
}

function ordinaryPaths(
  progression: HarmonyProgressionRealization,
  plan: ResolvedMotifPlanV1,
  phrases: readonly (readonly EventSpec[])[],
): readonly Path[] {
  return projectSpecs(progression, plan, phrases.flat()).filter(
    (path) => path.state.pendingExceptionalDirection === 0,
  );
}

function keepBestPair(map: Map<string, PairedPath>, key: string, candidate: PairedPath): void {
  const current = map.get(key);
  if (current === undefined || comparePairedPaths(candidate, current) < 0) map.set(key, candidate);
}

function exactPhrasePairs(
  progression: HarmonyProgressionRealization,
  plan: ResolvedMotifPlanV1,
  phrase1: readonly EventSpec[],
  phrase3: readonly EventSpec[],
): readonly PairedPath[] {
  const results: PairedPath[] = [];
  for (let transposition = -24; transposition <= 24; transposition += 1) {
    let paths = new Map<string, PairedPath>();
    for (let index = 0; index < phrase1.length; index += 1) {
      const next = new Map<string, PairedPath>();
      const leftSpec = phrase1[index];
      const rightSpec = phrase3[index];
      for (const leftPitch of leftSpec.candidates) {
        const rightPitch = leftPitch + transposition;
        if (!rightSpec.candidates.includes(rightPitch)) continue;
        if (index === 0) {
          const candidate: PairedPath = {
            phrase1Pitches: Object.freeze([leftPitch]),
            phrase3Pitches: Object.freeze([rightPitch]),
            phrase1State: { pitch: leftPitch, pendingExceptionalDirection: 0 },
            phrase3State: { pitch: rightPitch, pendingExceptionalDirection: 0 },
            phrase3FirstPitch: rightPitch,
            score: addScore(eventScore(leftSpec, leftPitch), eventScore(rightSpec, rightPitch)),
          };
          keepBestPair(next, `${leftPitch}:0:${rightPitch}:${rightPitch}:0`, candidate);
          continue;
        }
        for (const path of paths.values()) {
          const leftState = transition(path.phrase1State, leftPitch);
          const rightState = transition(path.phrase3State, rightPitch);
          if (leftState === undefined || rightState === undefined) continue;
          if (
            !respectsPassingResolution(
              progression,
              plan,
              phrase1[index - 1],
              path.phrase1State.pitch,
              leftSpec,
              leftPitch,
            ) ||
            !respectsPassingResolution(
              progression,
              plan,
              phrase3[index - 1],
              path.phrase3State.pitch,
              rightSpec,
              rightPitch,
            )
          ) {
            continue;
          }
          const candidate: PairedPath = {
            phrase1Pitches: Object.freeze([...path.phrase1Pitches, leftPitch]),
            phrase3Pitches: Object.freeze([...path.phrase3Pitches, rightPitch]),
            phrase1State: leftState,
            phrase3State: rightState,
            phrase3FirstPitch: path.phrase3FirstPitch,
            score: addScore(
              path.score,
              addScore(
                addScore(
                  eventScore(leftSpec, leftPitch),
                  intervalScore(
                    progression,
                    phrase1[index - 1],
                    path.phrase1State.pitch,
                    leftSpec,
                    leftPitch,
                  ),
                ),
                addScore(
                  eventScore(rightSpec, rightPitch),
                  intervalScore(
                    progression,
                    phrase3[index - 1],
                    path.phrase3State.pitch,
                    rightSpec,
                    rightPitch,
                  ),
                ),
              ),
            ),
          };
          keepBestPair(
            next,
            `${leftState.pitch}:${leftState.pendingExceptionalDirection}:${path.phrase3FirstPitch}:${rightState.pitch}:${rightState.pendingExceptionalDirection}`,
            candidate,
          );
        }
      }
      paths = next;
    }
    results.push(...paths.values());
  }
  return results;
}

function replayFromState(
  progression: HarmonyProgressionRealization,
  plan: ResolvedMotifPlanV1,
  initial: TransitionState,
  specs: readonly EventSpec[],
  pitches: readonly number[],
): TransitionState | undefined {
  let state = initial;
  let previousSpec: EventSpec | undefined;
  for (let index = 0; index < specs.length; index += 1) {
    const next = transition(state, pitches[index]);
    if (next === undefined) return undefined;
    if (
      previousSpec !== undefined &&
      !respectsPassingResolution(
        progression,
        plan,
        previousSpec,
        state.pitch,
        specs[index],
        pitches[index],
      )
    ) {
      return undefined;
    }
    state = next;
    previousSpec = specs[index];
  }
  return state;
}

function exactPaths(
  progression: HarmonyProgressionRealization,
  plan: ResolvedMotifPlanV1,
  phrases: readonly (readonly EventSpec[])[],
): readonly Path[] {
  const complete: Path[] = [];
  for (const pair of exactPhrasePairs(progression, plan, phrases[0], phrases[2])) {
    const phrase1Path: Path = {
      pitches: pair.phrase1Pitches,
      state: pair.phrase1State,
      score: { contourDeviation: 0, directionChanges: 0, idealDistance: 0 },
    };
    const phrase2Paths = projectSpecs(
      progression,
      plan,
      phrases[1],
      phrase1Path,
      phrases[0].at(-1),
    );
    for (const phrase2 of phrase2Paths) {
      const replayedPhrase3 = replayFromState(
        progression,
        plan,
        phrase2.state,
        phrases[2],
        pair.phrase3Pitches,
      );
      if (
        replayedPhrase3 === undefined ||
        replayedPhrase3.pitch !== pair.phrase3State.pitch ||
        replayedPhrase3.pendingExceptionalDirection !==
          pair.phrase3State.pendingExceptionalDirection
      ) {
        continue;
      }
      const prefix: Path = {
        pitches: Object.freeze([
          ...pair.phrase1Pitches,
          ...phrase2.pitches.slice(pair.phrase1Pitches.length),
          ...pair.phrase3Pitches,
        ]),
        state: pair.phrase3State,
        score: addScore(pair.score, phrase2.score),
      };
      const phrase4Paths = projectSpecs(progression, plan, phrases[3], prefix, phrases[2].at(-1));
      complete.push(...phrase4Paths.filter((path) => path.state.pendingExceptionalDirection === 0));
    }
  }
  return complete;
}

function selectBest(paths: readonly Path[]): Path | undefined {
  let selected: Path | undefined;
  for (const path of paths) {
    if (selected === undefined || comparePaths(path, selected) < 0) selected = path;
  }
  return selected;
}

export function projectResolvedMotifPlanV1(
  progression: HarmonyProgressionRealization,
  plan: ResolvedMotifPlanV1,
): readonly MotifEventV1[] {
  assertResolvedInputs(progression, plan);
  const phrases = buildPhraseSpecs(progression, plan);
  const exact = exactPaths(progression, plan, phrases);
  const selected = selectBest(exact.length > 0 ? exact : ordinaryPaths(progression, plan, phrases));
  if (selected === undefined) throw new MotifProjectionNoValidPathError();

  const specs = phrases.flat();
  invariant(
    selected.pitches.length === specs.length,
    `selected path length ${selected.pitches.length} differs from ${specs.length} events`,
  );
  const events = specs.map((spec, index) =>
    createMotifEventV1({
      pitch: selected.pitches[index],
      startTick: spec.startTick,
      durationTicks: spec.durationTicks,
    }),
  );
  invariant(
    events.every((event) => event.startTick + event.durationTicks <= SECTION_LENGTH_TICKS),
    "event crosses the section boundary",
  );
  return Object.freeze(events);
}
