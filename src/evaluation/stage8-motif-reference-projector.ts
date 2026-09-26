/**
 * Evaluation-only independent semantic projector for Stage 8 Motif qualification.
 *
 * It accepts one frozen supplied-Harmony snapshot and one frozen resolved plan,
 * then realizes only ordered reference events. Production Motif code, canonical
 * serialization, capture, candidate vectors, and qualification claims remain
 * outside this boundary.
 */

import type { Stage8MotifReferencePlanV1 } from "./stage8-motif-reference-plan-resolution";
import type { Stage8MotifFrozenHarmonyV1 } from "./stage8-motif-source-bindings";

export type Stage8MotifReferenceEventV1 = Readonly<{
  pitch: number;
  startTick: number;
  durationTicks: 480 | 960;
}>;

export type Stage8MotifReferenceSupplementalHarmonyV1 = Readonly<{
  profile: "dark-synthwave";
  templateId: "degree-0344-harmonic-minor-v1";
  templateVersion: "v1";
  key: Readonly<{ tonic: 0; scale: "harmonic-minor" }>;
  slots: readonly Readonly<{
    index: number;
    degree: number;
    bars: 2;
    chord: Readonly<{ root: number; quality: "major-triad" | "minor-triad" }>;
    inversion: 0 | 1 | 2;
    voicing: Readonly<{ midiPitches: readonly [number, number, number] }>;
  }>[];
}>;

export type Stage8MotifReferenceProjectionInputV1 = Readonly<{
  harmony: Stage8MotifFrozenHarmonyV1 | Stage8MotifReferenceSupplementalHarmonyV1;
  plan: Stage8MotifReferencePlanV1;
}>;

type ScaleId = "major" | "natural-minor" | "phrygian" | "harmonic-minor";
type ChordQuality = "major-triad" | "minor-triad";
type RhythmTemplate = "sparse-4" | "steady-6" | "active-8";
type RegisterBand = "lower" | "middle" | "upper";
type TensionMode = "chordal" | "diatonic-passing";
type Phrase4Displacement = "none" | "earlier-480" | "later-480";

type HarmonyValue = Readonly<{
  profile: string;
  templateId: string;
  templateVersion: "v1";
  key: Readonly<{ tonic: number; scale: ScaleId }>;
  slots: readonly Readonly<{
    index: number;
    degree: number;
    bars: 2;
    chord: Readonly<{ root: number; quality: ChordQuality }>;
    inversion: 0 | 1 | 2;
    voicing: Readonly<{ midiPitches: readonly [number, number, number] }>;
  }>[];
}>;

type PlanValue = Readonly<{
  rhythmTemplate: RhythmTemplate;
  registerBand: RegisterBand;
  tensionMode: TensionMode;
  phrase4Displacement: Phrase4Displacement;
}>;

type RhythmDefinition = Readonly<{
  onsets: readonly number[];
  durations: readonly (480 | 960)[];
  contourOffsets: readonly number[];
  displacementOrdinal: number;
}>;

type EventDefinition = Readonly<{
  phraseIndex: number;
  eventIndex: number;
  startTick: number;
  durationTicks: 480 | 960;
  contourOffset: number;
  idealPitch: number;
  structural: boolean;
  candidates: readonly number[];
}>;

type PhraseDefinition = Readonly<{
  events: readonly EventDefinition[];
  tonic: number;
  scaleOffsets: readonly number[];
  tensionMode: TensionMode;
}>;

type Score = Readonly<{
  stepDeviation: number;
  directionChanges: number;
  idealDistance: number;
}>;

type PitchPath = Readonly<{
  pitches: readonly number[];
  score: Score;
}>;

const POLICY_VERSION = "nightdrive.motif-policy.v1";
const PROFILE_VERSION = "nightdrive.genre-profile.motif.v1";
const PHRASE_LENGTH_TICKS = 7_680;
const SECTION_END_TICK = 30_720;
const GRID_TICKS = 480;
const LEAD_RANGE: readonly [number, number] = [60, 84];

const SCALE_OFFSETS: Readonly<Record<ScaleId, readonly number[]>> = Object.freeze({
  "harmonic-minor": Object.freeze([0, 2, 3, 5, 7, 8, 11]),
  major: Object.freeze([0, 2, 4, 5, 7, 9, 11]),
  "natural-minor": Object.freeze([0, 2, 3, 5, 7, 8, 10]),
  phrygian: Object.freeze([0, 1, 3, 5, 7, 8, 10]),
});

const RHYTHMS: Readonly<Record<RhythmTemplate, RhythmDefinition>> = Object.freeze({
  "sparse-4": Object.freeze({
    onsets: Object.freeze([0, 4, 8, 12]),
    durations: Object.freeze([960, 960, 960, 960] as const),
    contourOffsets: Object.freeze([0, 1, 2, 0]),
    displacementOrdinal: 1,
  }),
  "steady-6": Object.freeze({
    onsets: Object.freeze([0, 2, 4, 7, 10, 14]),
    durations: Object.freeze([960, 480, 960, 480, 960, 960] as const),
    contourOffsets: Object.freeze([0, 1, 2, 1, 2, 0]),
    displacementOrdinal: 3,
  }),
  "active-8": Object.freeze({
    onsets: Object.freeze([0, 2, 4, 6, 8, 10, 12, 14]),
    durations: Object.freeze([480, 480, 480, 480, 480, 480, 480, 480] as const),
    contourOffsets: Object.freeze([0, 1, 2, 3, 2, 3, 1, 0]),
    displacementOrdinal: 3,
  }),
});

const REGISTER_BANDS: Readonly<Record<RegisterBand, readonly [number, number]>> = Object.freeze({
  lower: Object.freeze([60, 72] as const),
  middle: Object.freeze([66, 78] as const),
  upper: Object.freeze([72, 84] as const),
});

const PHRASE_ROLES = Object.freeze([
  "identity",
  "motif-form-repetition",
  "harmony-aware-transposition",
  "contour-preserving-response",
] as const);

/**
 * The qualification source binds four exact supplied-Harmony values. The only
 * extra reference context is the named Phrase-3 fallback fixture accepted in
 * docs/MOTIF_MODEL.md. Keeping the full values here prevents forged Harmony
 * shapes from becoming a reference input and keeps harmonic-minor scoped to
 * that one evaluation-only fixture.
 */
const ALLOWED_HARMONY_CONTEXTS = Object.freeze([
  {
    profile: "dark-synthwave",
    templateId: "degree-0654-natural-minor-v1",
    scale: "natural-minor",
    slots: Object.freeze([
      { degree: 0, root: 0, quality: "minor-triad", inversion: 0, midiPitches: [36, 39, 43] },
      { degree: 6, root: 10, quality: "major-triad", inversion: 1, midiPitches: [38, 41, 46] },
      { degree: 5, root: 8, quality: "major-triad", inversion: 1, midiPitches: [36, 39, 44] },
      { degree: 4, root: 7, quality: "major-triad", inversion: 2, midiPitches: [38, 43, 47] },
    ] as const),
  },
  {
    profile: "classic-synthwave",
    templateId: "degree-0344-major-v1",
    scale: "major",
    slots: Object.freeze([
      { degree: 0, root: 0, quality: "major-triad", inversion: 0, midiPitches: [48, 52, 55] },
      { degree: 3, root: 5, quality: "major-triad", inversion: 2, midiPitches: [48, 53, 57] },
      { degree: 4, root: 7, quality: "major-triad", inversion: 1, midiPitches: [47, 50, 55] },
      { degree: 0, root: 0, quality: "major-triad", inversion: 0, midiPitches: [48, 52, 55] },
    ] as const),
  },
  {
    profile: "darkwave",
    templateId: "degree-0654-natural-minor-v1",
    scale: "natural-minor",
    slots: Object.freeze([
      { degree: 0, root: 0, quality: "minor-triad", inversion: 0, midiPitches: [36, 39, 43] },
      { degree: 6, root: 10, quality: "major-triad", inversion: 0, midiPitches: [34, 38, 41] },
      { degree: 5, root: 8, quality: "major-triad", inversion: 1, midiPitches: [36, 39, 44] },
      { degree: 4, root: 7, quality: "major-triad", inversion: 1, midiPitches: [35, 38, 43] },
    ] as const),
  },
  {
    profile: "midtempo-cyberpunk",
    templateId: "degree-0654-phrygian-v1",
    scale: "phrygian",
    slots: Object.freeze([
      { degree: 0, root: 0, quality: "minor-triad", inversion: 1, midiPitches: [39, 43, 48] },
      { degree: 6, root: 10, quality: "major-triad", inversion: 1, midiPitches: [38, 41, 46] },
      { degree: 5, root: 8, quality: "major-triad", inversion: 2, midiPitches: [39, 44, 48] },
      { degree: 4, root: 7, quality: "minor-triad", inversion: 2, midiPitches: [38, 43, 46] },
    ] as const),
  },
  {
    profile: "dark-synthwave",
    templateId: "degree-0344-harmonic-minor-v1",
    scale: "harmonic-minor",
    slots: Object.freeze([
      { degree: 0, root: 0, quality: "minor-triad", inversion: 0, midiPitches: [48, 51, 55] },
      { degree: 3, root: 5, quality: "minor-triad", inversion: 0, midiPitches: [53, 56, 60] },
      { degree: 4, root: 7, quality: "major-triad", inversion: 0, midiPitches: [55, 59, 62] },
      { degree: 0, root: 0, quality: "minor-triad", inversion: 0, midiPitches: [48, 51, 55] },
    ] as const),
  },
] as const);

function fail(field: string): never {
  throw new RangeError(`${field} must match the accepted Stage 8 Motif reference contract.`);
}

function noValidPath(): never {
  throw new RangeError("NO_VALID_MOTIF: no complete legal Stage 8 Motif reference path exists.");
}

function exactFrozenRecord(
  value: unknown,
  expectedKeys: readonly string[],
  field: string,
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    !Object.isFrozen(value)
  ) {
    return fail(field);
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== expectedKeys.length) return fail(field);
  for (const [index, key] of expectedKeys.entries()) {
    if (keys[index] !== key) return fail(field);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      !Object.hasOwn(descriptor, "value") ||
      descriptor.enumerable !== true ||
      descriptor.configurable !== false ||
      descriptor.writable !== false
    ) {
      return fail(`${field}.${key}`);
    }
  }
  return value as Record<string, unknown>;
}

function exactFrozenArray(value: unknown, length: number, field: string): unknown[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    !Object.isFrozen(value) ||
    value.length !== length
  ) {
    return fail(field);
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== length + 1 || keys[length] !== "length") return fail(field);
  for (let index = 0; index < length; index += 1) {
    if (keys[index] !== String(index)) return fail(field);
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      !Object.hasOwn(descriptor, "value") ||
      descriptor.enumerable !== true ||
      descriptor.configurable !== false ||
      descriptor.writable !== false
    ) {
      return fail(`${field}[${index}]`);
    }
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    lengthDescriptor === undefined ||
    !Object.hasOwn(lengthDescriptor, "value") ||
    lengthDescriptor.enumerable !== false ||
    lengthDescriptor.configurable !== false ||
    lengthDescriptor.writable !== false
  ) {
    return fail(`${field}.length`);
  }
  return value;
}

function exactMember<T extends string>(value: unknown, members: readonly T[], field: string): T {
  if (typeof value !== "string" || !members.includes(value as T)) return fail(field);
  return value as T;
}

function exactInteger(value: unknown, minimum: number, maximum: number, field: string): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    return fail(field);
  }
  return value;
}

function isChordTone(pitch: number, root: number, quality: ChordQuality): boolean {
  const offsets = quality === "major-triad" ? [0, 4, 7] : [0, 3, 7];
  const quotient = Math.floor((pitch - root) / 12);
  const offset = pitch - root - 12 * quotient;
  return offsets.includes(offset);
}

function matchesAllowedHarmonyContext(harmony: HarmonyValue): boolean {
  return ALLOWED_HARMONY_CONTEXTS.some((expected) => {
    if (
      expected.profile !== harmony.profile ||
      expected.templateId !== harmony.templateId ||
      expected.scale !== harmony.key.scale ||
      harmony.key.tonic !== 0 ||
      expected.slots.length !== harmony.slots.length
    ) {
      return false;
    }
    return expected.slots.every((expectedSlot, index) => {
      const actual = harmony.slots[index];
      if (actual === undefined) return false;
      return (
        actual.index === index &&
        actual.degree === expectedSlot.degree &&
        actual.chord.root === expectedSlot.root &&
        actual.chord.quality === expectedSlot.quality &&
        actual.inversion === expectedSlot.inversion &&
        actual.voicing.midiPitches[0] === expectedSlot.midiPitches[0] &&
        actual.voicing.midiPitches[1] === expectedSlot.midiPitches[1] &&
        actual.voicing.midiPitches[2] === expectedSlot.midiPitches[2]
      );
    });
  });
}

function assertHarmony(value: unknown): HarmonyValue {
  const harmony = exactFrozenRecord(
    value,
    ["profile", "templateId", "templateVersion", "key", "slots"],
    "harmony",
  );
  const profile = exactMember(
    harmony.profile,
    ["dark-synthwave", "classic-synthwave", "darkwave", "midtempo-cyberpunk"],
    "harmony.profile",
  );
  if (typeof harmony.templateId !== "string" || harmony.templateId.length === 0)
    fail("harmony.templateId");
  if (harmony.templateVersion !== "v1") fail("harmony.templateVersion");

  const key = exactFrozenRecord(harmony.key, ["tonic", "scale"], "harmony.key");
  const tonic = exactInteger(key.tonic, 0, 11, "harmony.key.tonic");
  const scale = exactMember(
    key.scale,
    ["major", "natural-minor", "phrygian", "harmonic-minor"],
    "harmony.key.scale",
  );

  const slotValues = exactFrozenArray(harmony.slots, 4, "harmony.slots");
  const slots = slotValues.map((slotValue, slotIndex) => {
    const slot = exactFrozenRecord(
      slotValue,
      ["index", "degree", "bars", "chord", "inversion", "voicing"],
      `harmony.slots[${slotIndex}]`,
    );
    const index = exactInteger(
      slot.index,
      slotIndex,
      slotIndex,
      `harmony.slots[${slotIndex}].index`,
    );
    const degree = exactInteger(slot.degree, 0, 6, `harmony.slots[${slotIndex}].degree`);
    if (slot.bars !== 2) fail(`harmony.slots[${slotIndex}].bars`);

    const chord = exactFrozenRecord(
      slot.chord,
      ["root", "quality"],
      `harmony.slots[${slotIndex}].chord`,
    );
    const root = exactInteger(chord.root, 0, 11, `harmony.slots[${slotIndex}].chord.root`);
    const quality = exactMember(
      chord.quality,
      ["major-triad", "minor-triad"],
      `harmony.slots[${slotIndex}].chord.quality`,
    );
    const inversion = exactInteger(slot.inversion, 0, 2, `harmony.slots[${slotIndex}].inversion`) as
      | 0
      | 1
      | 2;

    const voicing = exactFrozenRecord(
      slot.voicing,
      ["midiPitches"],
      `harmony.slots[${slotIndex}].voicing`,
    );
    const midiValues = exactFrozenArray(
      voicing.midiPitches,
      3,
      `harmony.slots[${slotIndex}].voicing.midiPitches`,
    );
    const midiPitches = midiValues.map((pitch, pitchIndex) =>
      exactInteger(pitch, 0, 127, `harmony.slots[${slotIndex}].voicing.midiPitches[${pitchIndex}]`),
    );
    if (
      midiPitches[0] === undefined ||
      midiPitches[1] === undefined ||
      midiPitches[2] === undefined ||
      midiPitches[0] >= midiPitches[1] ||
      midiPitches[1] >= midiPitches[2] ||
      midiPitches.some((pitch) => !isChordTone(pitch, root, quality))
    ) {
      fail(`harmony.slots[${slotIndex}].voicing.midiPitches`);
    }

    return {
      index,
      degree,
      bars: 2 as const,
      chord: { root, quality },
      inversion,
      voicing: { midiPitches: [midiPitches[0], midiPitches[1], midiPitches[2]] as const },
    };
  });

  const parsed: HarmonyValue = {
    profile,
    templateId: harmony.templateId,
    templateVersion: "v1",
    key: { tonic, scale },
    slots,
  };
  if (!matchesAllowedHarmonyContext(parsed)) fail("harmony.context");
  return parsed;
}

function assertPlan(value: unknown): PlanValue {
  const plan = exactFrozenRecord(
    value,
    [
      "policyVersion",
      "profileVersion",
      "rhythmTemplate",
      "registerBand",
      "tensionMode",
      "phrase4Displacement",
      "contourOffsets",
      "phraseRoles",
    ],
    "plan",
  );
  if (plan.policyVersion !== POLICY_VERSION) fail("plan.policyVersion");
  if (plan.profileVersion !== PROFILE_VERSION) fail("plan.profileVersion");
  const rhythmTemplate = exactMember(
    plan.rhythmTemplate,
    ["sparse-4", "steady-6", "active-8"],
    "plan.rhythmTemplate",
  );
  const registerBand = exactMember(
    plan.registerBand,
    ["lower", "middle", "upper"],
    "plan.registerBand",
  );
  const tensionMode = exactMember(
    plan.tensionMode,
    ["chordal", "diatonic-passing"],
    "plan.tensionMode",
  );
  const phrase4Displacement = exactMember(
    plan.phrase4Displacement,
    ["none", "earlier-480", "later-480"],
    "plan.phrase4Displacement",
  );
  const rhythm = RHYTHMS[rhythmTemplate];
  const contourOffsets = exactFrozenArray(
    plan.contourOffsets,
    rhythm.contourOffsets.length,
    "plan.contourOffsets",
  );
  for (const [index, offset] of rhythm.contourOffsets.entries()) {
    if (contourOffsets[index] !== offset) fail(`plan.contourOffsets[${index}]`);
  }
  const phraseRoles = exactFrozenArray(plan.phraseRoles, PHRASE_ROLES.length, "plan.phraseRoles");
  for (const [index, role] of PHRASE_ROLES.entries()) {
    if (phraseRoles[index] !== role) fail(`plan.phraseRoles[${index}]`);
  }
  return { rhythmTemplate, registerBand, tensionMode, phrase4Displacement };
}

function assertSupportedHarmonyPlan(harmony: HarmonyValue, plan: PlanValue): void {
  if (harmony.key.scale !== "harmonic-minor") return;
  if (
    plan.rhythmTemplate !== "sparse-4" ||
    plan.registerBand !== "middle" ||
    plan.tensionMode !== "diatonic-passing" ||
    plan.phrase4Displacement !== "none"
  ) {
    fail("plan.supplementalFixture");
  }
}

function ordinalForPitch(
  pitch: number,
  tonic: number,
  offsets: readonly number[],
): number | undefined {
  const quotient = Math.floor((pitch - tonic) / 12);
  const semitoneOffset = pitch - tonic - 12 * quotient;
  const degree = offsets.indexOf(semitoneOffset);
  return degree < 0 ? undefined : 7 * quotient + degree;
}

function liftOrdinal(ordinal: number, tonic: number, offsets: readonly number[]): number {
  const quotient = Math.floor(ordinal / 7);
  const degree = ordinal - 7 * quotient;
  const offset = offsets[degree];
  if (offset === undefined) return fail("ordered scale ordinal");
  return tonic + 12 * quotient + offset;
}

function scaleOrdinal(pitch: number, phrase: PhraseDefinition): number {
  const ordinal = ordinalForPitch(pitch, phrase.tonic, phrase.scaleOffsets);
  if (ordinal === undefined) return fail("current-Key scale pitch");
  return ordinal;
}

function sign(value: number): -1 | 0 | 1 {
  return value < 0 ? -1 : value > 0 ? 1 : 0;
}

function exceptionalInterval(delta: number): boolean {
  const distance = Math.abs(delta);
  return distance >= 8 && distance <= 12;
}

function transitionAllowed(
  phrase: PhraseDefinition,
  previousPrevious: number | undefined,
  previous: number | undefined,
  current: number,
  previousEvent: EventDefinition | undefined,
  currentEvent: EventDefinition | undefined,
): boolean {
  if (previous === undefined) return true;
  const currentDelta = current - previous;
  if (Math.abs(currentDelta) > 12) return false;
  if (previousPrevious !== undefined) {
    const previousDelta = previous - previousPrevious;
    if (
      exceptionalInterval(previousDelta) &&
      (Math.abs(currentDelta) > 2 || sign(currentDelta) !== -sign(previousDelta))
    ) {
      return false;
    }
  }
  if (
    phrase.tensionMode === "diatonic-passing" &&
    currentEvent !== undefined &&
    previousEvent !== undefined &&
    currentEvent.phraseIndex === previousEvent.phraseIndex &&
    currentEvent.structural &&
    !previousEvent.structural
  ) {
    const requiredDirection = sign(currentEvent.contourOffset - previousEvent.contourOffset);
    if (requiredDirection === 0) return false;
    if (scaleOrdinal(current, phrase) - scaleOrdinal(previous, phrase) !== requiredDirection)
      return false;
  }
  return true;
}

function emptyScore(): Score {
  return { stepDeviation: 0, directionChanges: 0, idealDistance: 0 };
}

function extendScore(
  score: Score,
  phrase: PhraseDefinition,
  previous: number | undefined,
  previousEvent: EventDefinition | undefined,
  current: number,
  currentEvent: EventDefinition,
): Score {
  let stepDeviation = score.stepDeviation;
  let directionChanges = score.directionChanges;
  if (
    previous !== undefined &&
    previousEvent !== undefined &&
    previousEvent.phraseIndex === currentEvent.phraseIndex
  ) {
    const actualInterval = scaleOrdinal(current, phrase) - scaleOrdinal(previous, phrase);
    const expectedInterval = currentEvent.contourOffset - previousEvent.contourOffset;
    stepDeviation += Math.abs(actualInterval - expectedInterval);
    if (sign(actualInterval) !== sign(expectedInterval)) directionChanges += 1;
  }
  return {
    stepDeviation,
    directionChanges,
    idealDistance: score.idealDistance + Math.abs(current - currentEvent.idealPitch),
  };
}

function combineScores(...scores: readonly Score[]): Score {
  return scores.reduce(
    (total, score) => ({
      stepDeviation: total.stepDeviation + score.stepDeviation,
      directionChanges: total.directionChanges + score.directionChanges,
      idealDistance: total.idealDistance + score.idealDistance,
    }),
    emptyScore(),
  );
}

function compareScores(left: Score, right: Score): number {
  if (left.stepDeviation !== right.stepDeviation) return left.stepDeviation - right.stepDeviation;
  if (left.directionChanges !== right.directionChanges)
    return left.directionChanges - right.directionChanges;
  return left.idealDistance - right.idealDistance;
}

function comparePitchSequences(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < left.length; index += 1) {
    const difference = left[index] - right[index];
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
}

function comparePaths(left: PitchPath, right: PitchPath): number {
  const scoreDifference = compareScores(left.score, right.score);
  return scoreDifference === 0
    ? comparePitchSequences(left.pitches, right.pitches)
    : scoreDifference;
}

function terminalIntervalAllowed(path: PitchPath): boolean {
  const last = path.pitches[path.pitches.length - 1];
  const penultimate = path.pitches[path.pitches.length - 2];
  if (last === undefined || penultimate === undefined) return false;
  return !exceptionalInterval(last - penultimate);
}

function structuralIndices(rhythm: RhythmDefinition): ReadonlySet<number> {
  const firstInBarTwo = rhythm.onsets.findIndex((onset) => onset >= 8);
  const finalIndex = rhythm.onsets.length - 1;
  if (firstInBarTwo < 1 || finalIndex < firstInBarTwo) return fail("rhythm structural positions");
  return new Set([0, firstInBarTwo, finalIndex]);
}

function displacementTicks(displacement: Phrase4Displacement): number {
  if (displacement === "none") return 0;
  return displacement === "earlier-480" ? -GRID_TICKS : GRID_TICKS;
}

function buildPhraseDefinitions(
  harmony: HarmonyValue,
  plan: PlanValue,
): readonly PhraseDefinition[] {
  const rhythm = RHYTHMS[plan.rhythmTemplate];
  const band = REGISTER_BANDS[plan.registerBand];
  const scaleOffsets = SCALE_OFFSETS[harmony.key.scale];
  const scalePitches: number[] = [];
  for (let pitch = band[0]; pitch <= band[1]; pitch += 1) {
    if (ordinalForPitch(pitch, harmony.key.tonic, scaleOffsets) !== undefined)
      scalePitches.push(pitch);
  }
  if (scalePitches.length === 0) return noValidPath();

  const structures = structuralIndices(rhythm);
  return harmony.slots.map((slot, phraseIndex) => {
    const chordPitches = scalePitches.filter((pitch) =>
      isChordTone(pitch, slot.chord.root, slot.chord.quality),
    );
    if (chordPitches.length === 0) return noValidPath();
    const midpoint = (band[0] + band[1]) / 2;
    const anchor = chordPitches.reduce((best, pitch) => {
      if (Math.abs(pitch - midpoint) < Math.abs(best - midpoint)) return pitch;
      return pitch < best ? pitch : best;
    });
    const anchorOrdinal = ordinalForPitch(anchor, harmony.key.tonic, scaleOffsets);
    if (anchorOrdinal === undefined) return fail("phrase anchor");
    const phraseStart = phraseIndex * PHRASE_LENGTH_TICKS;
    let previousStart: number | undefined;
    let previousEnd: number | undefined;
    const events = rhythm.onsets.map((onset, eventIndex) => {
      const duration = rhythm.durations[eventIndex];
      const contourOffset = rhythm.contourOffsets[eventIndex];
      if (duration === undefined || contourOffset === undefined) return fail("rhythm literal");
      const structural = structures.has(eventIndex);
      const appliesDisplacement =
        phraseIndex === 3 &&
        eventIndex === rhythm.displacementOrdinal &&
        plan.phrase4Displacement !== "none";
      if (appliesDisplacement && structural) return fail("phrase4 displacement ordinal");
      const startTick =
        phraseStart +
        onset * GRID_TICKS +
        (appliesDisplacement ? displacementTicks(plan.phrase4Displacement) : 0);
      if (
        startTick < phraseStart ||
        startTick + duration > phraseStart + PHRASE_LENGTH_TICKS ||
        (previousStart !== undefined && startTick <= previousStart) ||
        (previousEnd !== undefined && startTick < previousEnd)
      ) {
        return fail("phrase timing");
      }
      previousStart = startTick;
      previousEnd = startTick + duration;
      const candidates = plan.tensionMode === "chordal" || structural ? chordPitches : scalePitches;
      if (candidates.length === 0) return noValidPath();
      return {
        phraseIndex,
        eventIndex,
        startTick,
        durationTicks: duration,
        contourOffset,
        idealPitch: liftOrdinal(anchorOrdinal + contourOffset, harmony.key.tonic, scaleOffsets),
        structural,
        candidates,
      };
    });
    return { events, tonic: harmony.key.tonic, scaleOffsets, tensionMode: plan.tensionMode };
  });
}

function chooseBest(states: Map<string, PitchPath>, key: string, candidate: PitchPath): void {
  const current = states.get(key);
  if (current === undefined || comparePaths(candidate, current) < 0) states.set(key, candidate);
}

function appendPath(
  path: PitchPath,
  phrase: PhraseDefinition,
  event: EventDefinition,
  previousPrevious: number | undefined,
  previous: number | undefined,
  previousEvent: EventDefinition | undefined,
  pitch: number,
): PitchPath | undefined {
  if (!transitionAllowed(phrase, previousPrevious, previous, pitch, previousEvent, event))
    return undefined;
  return {
    pitches: [...path.pitches, pitch],
    score: extendScore(path.score, phrase, previous, previousEvent, pitch, event),
  };
}

function findBestOrdinaryPath(phrases: readonly PhraseDefinition[]): PitchPath | undefined {
  const events = phrases.flatMap((phrase) => phrase.events);
  let states = new Map<string, PitchPath>();
  states.set("start", { pitches: [], score: emptyScore() });
  for (let eventPosition = 0; eventPosition < events.length; eventPosition += 1) {
    const event = events[eventPosition];
    const phrase = phrases[event.phraseIndex];
    const previousEvent = eventPosition === 0 ? undefined : events[eventPosition - 1];
    const nextStates = new Map<string, PitchPath>();
    for (const path of states.values()) {
      const previous = path.pitches[path.pitches.length - 1];
      const previousPrevious = path.pitches[path.pitches.length - 2];
      for (const pitch of event.candidates) {
        const next = appendPath(
          path,
          phrase,
          event,
          previousPrevious,
          previous,
          previousEvent,
          pitch,
        );
        if (next === undefined) continue;
        const key =
          next.pitches.length === 1
            ? `first:${pitch}`
            : `${next.pitches[next.pitches.length - 2]}:${next.pitches[next.pitches.length - 1]}`;
        chooseBest(nextStates, key, next);
      }
    }
    states = nextStates;
    if (states.size === 0) return undefined;
  }
  let best: PitchPath | undefined;
  for (const path of states.values()) {
    if (!terminalIntervalAllowed(path)) continue;
    if (best === undefined || comparePaths(path, best) < 0) best = path;
  }
  return best;
}

function enumeratePhrasePaths(phrase: PhraseDefinition): readonly PitchPath[] {
  const paths: PitchPath[] = [];
  const visit = (eventIndex: number, path: PitchPath): void => {
    if (eventIndex === phrase.events.length) {
      paths.push(path);
      return;
    }
    const event = phrase.events[eventIndex];
    const previous = path.pitches[path.pitches.length - 1];
    const previousPrevious = path.pitches[path.pitches.length - 2];
    const previousEvent = eventIndex === 0 ? undefined : phrase.events[eventIndex - 1];
    for (const pitch of event.candidates) {
      const next = appendPath(
        path,
        phrase,
        event,
        previousPrevious,
        previous,
        previousEvent,
        pitch,
      );
      if (next !== undefined) visit(eventIndex + 1, next);
    }
  };
  visit(0, { pitches: [], score: emptyScore() });
  return paths;
}

function validateFixedPhrasePath(
  phrase: PhraseDefinition,
  pitches: readonly number[],
): PitchPath | undefined {
  if (pitches.length !== phrase.events.length) return undefined;
  let path: PitchPath = { pitches: [], score: emptyScore() };
  for (const [eventIndex, event] of phrase.events.entries()) {
    const pitch = pitches[eventIndex];
    if (pitch === undefined || !event.candidates.includes(pitch)) return undefined;
    const previous = path.pitches[path.pitches.length - 1];
    const previousPrevious = path.pitches[path.pitches.length - 2];
    const previousEvent = eventIndex === 0 ? undefined : phrase.events[eventIndex - 1];
    const next = appendPath(path, phrase, event, previousPrevious, previous, previousEvent, pitch);
    if (next === undefined) return undefined;
    path = next;
  }
  return path;
}

function findBestMiddlePhrase(
  phrase: PhraseDefinition,
  prefix: readonly [number, number],
  suffix: readonly [number, number],
): PitchPath | undefined {
  type State = Readonly<{ path: PitchPath; previousPrevious: number; previous: number }>;
  let states = new Map<string, State>();
  states.set(`prefix:${prefix[0]}:${prefix[1]}`, {
    path: { pitches: [], score: emptyScore() },
    previousPrevious: prefix[0],
    previous: prefix[1],
  });
  for (const [eventIndex, event] of phrase.events.entries()) {
    const nextStates = new Map<string, State>();
    const previousEvent = eventIndex === 0 ? undefined : phrase.events[eventIndex - 1];
    for (const state of states.values()) {
      for (const pitch of event.candidates) {
        const nextPath = appendPath(
          state.path,
          phrase,
          event,
          state.previousPrevious,
          state.previous,
          previousEvent,
          pitch,
        );
        if (nextPath === undefined) continue;
        const nextState = {
          path: nextPath,
          previousPrevious: state.previous,
          previous: pitch,
        };
        const key = `${nextState.previousPrevious}:${nextState.previous}`;
        const current = nextStates.get(key);
        if (current === undefined || comparePaths(nextState.path, current.path) < 0)
          nextStates.set(key, nextState);
      }
    }
    states = nextStates;
    if (states.size === 0) return undefined;
  }
  let best: PitchPath | undefined;
  for (const state of states.values()) {
    if (
      !transitionAllowed(
        phrase,
        state.previousPrevious,
        state.previous,
        suffix[0],
        undefined,
        undefined,
      ) ||
      !transitionAllowed(phrase, state.previous, suffix[0], suffix[1], undefined, undefined)
    ) {
      continue;
    }
    if (best === undefined || comparePaths(state.path, best) < 0) best = state.path;
  }
  return best;
}

function findBestFinalPhrase(
  phrase: PhraseDefinition,
  prefix: readonly [number, number],
): PitchPath | undefined {
  type State = Readonly<{ path: PitchPath; previousPrevious: number; previous: number }>;
  let states = new Map<string, State>();
  states.set(`prefix:${prefix[0]}:${prefix[1]}`, {
    path: { pitches: [], score: emptyScore() },
    previousPrevious: prefix[0],
    previous: prefix[1],
  });
  for (const [eventIndex, event] of phrase.events.entries()) {
    const nextStates = new Map<string, State>();
    const previousEvent = eventIndex === 0 ? undefined : phrase.events[eventIndex - 1];
    for (const state of states.values()) {
      for (const pitch of event.candidates) {
        const nextPath = appendPath(
          state.path,
          phrase,
          event,
          state.previousPrevious,
          state.previous,
          previousEvent,
          pitch,
        );
        if (nextPath === undefined) continue;
        const nextState = {
          path: nextPath,
          previousPrevious: state.previous,
          previous: pitch,
        };
        const key = `${nextState.previousPrevious}:${nextState.previous}`;
        const current = nextStates.get(key);
        if (current === undefined || comparePaths(nextState.path, current.path) < 0)
          nextStates.set(key, nextState);
      }
    }
    states = nextStates;
    if (states.size === 0) return undefined;
  }
  let best: PitchPath | undefined;
  for (const state of states.values()) {
    if (!terminalIntervalAllowed(state.path)) continue;
    if (best === undefined || comparePaths(state.path, best) < 0) best = state.path;
  }
  return best;
}

function findBestExactPhraseThreePath(phrases: readonly PhraseDefinition[]): PitchPath | undefined {
  const phraseOne = phrases[0];
  const phraseTwo = phrases[1];
  const phraseThree = phrases[2];
  const phraseFour = phrases[3];
  if (
    phraseOne === undefined ||
    phraseTwo === undefined ||
    phraseThree === undefined ||
    phraseFour === undefined
  ) {
    return fail("phrase count");
  }
  const middleCache = new Map<string, PitchPath | null>();
  const finalCache = new Map<string, PitchPath | null>();
  let best: PitchPath | undefined;
  for (const phraseOnePath of enumeratePhrasePaths(phraseOne)) {
    const firstPitch = phraseOnePath.pitches[0];
    const penultimateOne = phraseOnePath.pitches[phraseOnePath.pitches.length - 2];
    const finalOne = phraseOnePath.pitches[phraseOnePath.pitches.length - 1];
    if (firstPitch === undefined || penultimateOne === undefined || finalOne === undefined)
      continue;
    const shifts = new Set(
      phraseThree.events[0].candidates.map((candidate) => candidate - firstPitch),
    );
    for (const shift of shifts) {
      const phraseThreePath = validateFixedPhrasePath(
        phraseThree,
        phraseOnePath.pitches.map((pitch) => pitch + shift),
      );
      if (phraseThreePath === undefined) continue;
      const firstThree = phraseThreePath.pitches[0];
      const secondThree = phraseThreePath.pitches[1];
      const penultimateThree = phraseThreePath.pitches[phraseThreePath.pitches.length - 2];
      const finalThree = phraseThreePath.pitches[phraseThreePath.pitches.length - 1];
      if (
        firstThree === undefined ||
        secondThree === undefined ||
        penultimateThree === undefined ||
        finalThree === undefined
      ) {
        continue;
      }
      const middleKey = `${penultimateOne}:${finalOne}:${firstThree}:${secondThree}`;
      let phraseTwoPath = middleCache.get(middleKey);
      if (phraseTwoPath === undefined) {
        const found = findBestMiddlePhrase(
          phraseTwo,
          [penultimateOne, finalOne],
          [firstThree, secondThree],
        );
        phraseTwoPath = found ?? null;
        middleCache.set(middleKey, phraseTwoPath);
      }
      if (phraseTwoPath === null) continue;
      const finalKey = `${penultimateThree}:${finalThree}`;
      let phraseFourPath = finalCache.get(finalKey);
      if (phraseFourPath === undefined) {
        const found = findBestFinalPhrase(phraseFour, [penultimateThree, finalThree]);
        phraseFourPath = found ?? null;
        finalCache.set(finalKey, phraseFourPath);
      }
      if (phraseFourPath === null) continue;
      const candidate: PitchPath = {
        pitches: [
          ...phraseOnePath.pitches,
          ...phraseTwoPath.pitches,
          ...phraseThreePath.pitches,
          ...phraseFourPath.pitches,
        ],
        score: combineScores(
          phraseOnePath.score,
          phraseTwoPath.score,
          phraseThreePath.score,
          phraseFourPath.score,
        ),
      };
      if (best === undefined || comparePaths(candidate, best) < 0) best = candidate;
    }
  }
  return best;
}

function materializeEvents(
  phrases: readonly PhraseDefinition[],
  pitches: readonly number[],
): readonly Stage8MotifReferenceEventV1[] {
  const events = phrases.flatMap((phrase) => phrase.events);
  if (events.length !== pitches.length) return fail("reference event count");
  const materialized = events.map((event, index) => {
    const pitch = pitches[index];
    if (pitch === undefined) return fail(`reference events[${index}].pitch`);
    return Object.freeze({
      pitch,
      startTick: event.startTick,
      durationTicks: event.durationTicks,
    });
  });
  for (const [index, event] of materialized.entries()) {
    const previous = materialized[index - 1];
    if (
      event.pitch < LEAD_RANGE[0] ||
      event.pitch > LEAD_RANGE[1] ||
      event.startTick < 0 ||
      event.startTick + event.durationTicks > SECTION_END_TICK ||
      (previous !== undefined &&
        (event.startTick <= previous.startTick ||
          event.startTick < previous.startTick + previous.durationTicks))
    ) {
      return fail(`reference events[${index}]`);
    }
  }
  return Object.freeze(materialized);
}

/**
 * Projects one strictly frozen supplied-Harmony snapshot and resolved reference
 * plan into detached, deeply frozen ordered reference events.
 *
 * The complete-path search first selects the exact Phrase-3 preservation subset
 * whenever it exists. It otherwise applies the unchanged ordinary lexicographic
 * objective as the contract's explicit E-empty branch. Neither route has a
 * retry, repair, or partial result.
 */
export function projectStage8MotifReferencePlanV1(
  harmonyValue: unknown,
  planValue: unknown,
): readonly Stage8MotifReferenceEventV1[] {
  const harmony = assertHarmony(harmonyValue);
  const plan = assertPlan(planValue);
  assertSupportedHarmonyPlan(harmony, plan);
  const phrases = buildPhraseDefinitions(harmony, plan);
  const selected = findBestExactPhraseThreePath(phrases) ?? findBestOrdinaryPath(phrases);
  if (selected === undefined) return noValidPath();
  return materializeEvents(phrases, selected.pitches);
}
