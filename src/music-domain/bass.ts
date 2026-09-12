import type { HarmonyProgressionRealization } from "./harmony";
import {
  createDurationTicks,
  createTick,
  isEventStartTick,
  SUBDIVISION_TICKS,
  V1_SECTION_LENGTH_TICKS,
  V1_TICKS_PER_BAR,
  type DurationTicks,
  type Tick,
} from "./musical-time";
import { createMidiPitch, createPitchClass, type MidiPitch, type PitchClass } from "./pitch";

const bassRangeBrand: unique symbol = Symbol("BassRange");

export type BassRange = Readonly<{
  minMidiPitch: MidiPitch;
  maxMidiPitch: MidiPitch;
  readonly [bassRangeBrand]: true;
}>;

export type BassEvent = Readonly<{
  pitch: MidiPitch;
  startTick: Tick;
  durationTicks: DurationTicks;
}>;

export const BASS_RHYTHM_IDS = Object.freeze({
  sustained: "sustained",
  quarterPulse: "quarter-pulse",
  eighthPulse: "eighth-pulse",
  sixteenthPulse: "sixteenth-pulse",
  offbeatEighth: "offbeat-eighth",
} as const);

export type BassRhythmId = (typeof BASS_RHYTHM_IDS)[keyof typeof BASS_RHYTHM_IDS];

export type BassGenerationParameters = Readonly<{
  rhythm: BassRhythmId;
}>;

export const BASS_ERROR_CODES = {
  invalidHarmonicContext: "INVALID_HARMONIC_CONTEXT",
  invalidBassRange: "INVALID_BASS_RANGE",
  noLegalRootPitch: "NO_LEGAL_ROOT_PITCH",
  invalidBassTiming: "INVALID_BASS_TIMING",
  invalidBassRhythm: "INVALID_BASS_RHYTHM",
} as const;

export type BassErrorCode = (typeof BASS_ERROR_CODES)[keyof typeof BASS_ERROR_CODES];

export class BassValueError extends RangeError {
  readonly code: BassErrorCode;
  readonly field: string;

  constructor(code: BassErrorCode, field: string, message: string) {
    super(message);
    this.name = "BassValueError";
    this.code = code;
    this.field = field;
  }
}

const BASS_V1_MIN_MIDI_PITCH = 36;
const BASS_V1_MAX_MIDI_PITCH = 60;

export const BASS_V1_REGISTER_ANCHOR: MidiPitch = createMidiPitch(43);

export const BASS_V1_RANGE: BassRange = Object.freeze({
  minMidiPitch: createMidiPitch(BASS_V1_MIN_MIDI_PITCH),
  maxMidiPitch: createMidiPitch(BASS_V1_MAX_MIDI_PITCH),
}) as BassRange;

function invalidHarmonicContext(field: string, message: string): never {
  throw new BassValueError(BASS_ERROR_CODES.invalidHarmonicContext, field, message);
}

function invalidBassTiming(field: string, message: string): never {
  throw new BassValueError(BASS_ERROR_CODES.invalidBassTiming, field, message);
}

function invalidBassRhythm(message: string): never {
  throw new BassValueError(BASS_ERROR_CODES.invalidBassRhythm, "parameters.rhythm", message);
}

function normalizeBassGenerationParameters(
  value: Readonly<Partial<BassGenerationParameters>> | undefined,
): BassGenerationParameters {
  if (value === undefined) {
    return Object.freeze({ rhythm: BASS_RHYTHM_IDS.sustained });
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return invalidBassRhythm("parameters must be an object with a supported rhythm.");
  }

  const input = value as Record<string, unknown>;
  const rhythm = Object.hasOwn(input, "rhythm") ? input.rhythm : BASS_RHYTHM_IDS.sustained;
  if (!Object.values(BASS_RHYTHM_IDS).includes(rhythm as BassRhythmId)) {
    return invalidBassRhythm("parameters.rhythm must be a supported Bass rhythm identifier.");
  }
  return Object.freeze({ rhythm: rhythm as BassRhythmId });
}

function validateRoot(root: unknown): PitchClass {
  try {
    return createPitchClass(root as number);
  } catch {
    return invalidHarmonicContext("root", "root must be a canonical PitchClass.");
  }
}

function validateRange(value: unknown): BassRange {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new BassValueError(
      BASS_ERROR_CODES.invalidBassRange,
      "range",
      "range must be an object with inclusive MIDI-pitch bounds.",
    );
  }

  const input = value as Record<string, unknown>;
  let minimum: MidiPitch;
  let maximum: MidiPitch;
  try {
    minimum = createMidiPitch(input.minMidiPitch as number);
    maximum = createMidiPitch(input.maxMidiPitch as number);
  } catch {
    throw new BassValueError(
      BASS_ERROR_CODES.invalidBassRange,
      "range",
      "range bounds must be canonical MIDI pitches.",
    );
  }

  if (minimum > maximum) {
    throw new BassValueError(
      BASS_ERROR_CODES.invalidBassRange,
      "range",
      "range.minMidiPitch must not exceed range.maxMidiPitch.",
    );
  }

  return Object.freeze({ minMidiPitch: minimum, maxMidiPitch: maximum }) as BassRange;
}

export function createBassRange(
  value: { readonly minMidiPitch: number; readonly maxMidiPitch: number } = {
    minMidiPitch: BASS_V1_MIN_MIDI_PITCH,
    maxMidiPitch: BASS_V1_MAX_MIDI_PITCH,
  },
): BassRange {
  return validateRange(value);
}

function validatedRange(value: BassRange): BassRange {
  return validateRange(value);
}

export function getBassPitchCandidates(
  root: PitchClass,
  range: BassRange = BASS_V1_RANGE,
): readonly MidiPitch[] {
  const validatedRoot = validateRoot(root);
  const validatedRange = validatedRangeValue(range);
  const candidates: MidiPitch[] = [];
  for (
    let pitch = validatedRange.minMidiPitch as number;
    pitch <= validatedRange.maxMidiPitch;
    pitch += 1
  ) {
    if (pitch % 12 === validatedRoot) candidates.push(createMidiPitch(pitch));
  }

  if (candidates.length === 0) {
    throw new BassValueError(
      BASS_ERROR_CODES.noLegalRootPitch,
      "root",
      "no legal Bass MIDI pitch exists for the chord root in the range.",
    );
  }

  return Object.freeze(candidates);
}

function validatedRangeValue(value: BassRange): BassRange {
  try {
    return validatedRange(value);
  } catch (error) {
    if (error instanceof BassValueError) throw error;
    throw new BassValueError(
      BASS_ERROR_CODES.invalidBassRange,
      "range",
      "range must contain valid inclusive MIDI-pitch bounds.",
    );
  }
}

function selectNearestBassPitch(
  candidates: readonly MidiPitch[],
  targetMidiPitch: MidiPitch,
): MidiPitch {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new BassValueError(
      BASS_ERROR_CODES.noLegalRootPitch,
      "candidates",
      "at least one legal Bass pitch candidate is required.",
    );
  }

  let target: MidiPitch;
  try {
    target = createMidiPitch(targetMidiPitch);
  } catch {
    return invalidHarmonicContext("targetMidiPitch", "targetMidiPitch must be a MIDI pitch.");
  }

  const validatedCandidates: MidiPitch[] = [];
  for (let index = 0; index < candidates.length; index += 1) {
    if (!Object.hasOwn(candidates, index)) {
      return invalidHarmonicContext(
        `candidates[${index}]`,
        "candidates must not contain sparse entries.",
      );
    }
    try {
      validatedCandidates.push(createMidiPitch(candidates[index]));
    } catch {
      return invalidHarmonicContext(
        `candidates[${index}]`,
        "candidates must contain canonical MIDI pitches.",
      );
    }
  }

  let selected = validatedCandidates[0];
  let selectedDistance = Math.abs(selected - target);
  for (const candidate of validatedCandidates.slice(1)) {
    const distance = Math.abs(candidate - target);
    if (distance < selectedDistance || (distance === selectedDistance && candidate < selected)) {
      selected = candidate;
      selectedDistance = distance;
    }
  }
  return selected;
}

export function resolveFirstBassPitch(
  root: PitchClass,
  range: BassRange = BASS_V1_RANGE,
): MidiPitch {
  return selectNearestBassPitch(getBassPitchCandidates(root, range), BASS_V1_REGISTER_ANCHOR);
}

export function resolveSubsequentBassPitch(
  root: PitchClass,
  previousBassPitch: MidiPitch,
  range: BassRange = BASS_V1_RANGE,
): MidiPitch {
  let validatedPrevious: MidiPitch;
  try {
    validatedPrevious = createMidiPitch(previousBassPitch);
  } catch {
    return invalidHarmonicContext(
      "previousBassPitch",
      "previousBassPitch must be a canonical MIDI pitch.",
    );
  }
  return selectNearestBassPitch(getBassPitchCandidates(root, range), validatedPrevious);
}

type ValidatedBassSlot = Readonly<{
  root: PitchClass;
  bars: number;
}>;

type ValidatedHarmonyContext = Readonly<{
  slots: readonly ValidatedBassSlot[];
}>;

function validateHarmonySlot(value: unknown, index: number): ValidatedBassSlot {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return invalidHarmonicContext(
      `progression.slots[${index}]`,
      "progression slots must be objects.",
    );
  }

  const slot = value as Record<string, unknown>;

  if (typeof slot.bars !== "number" || !Number.isSafeInteger(slot.bars) || slot.bars <= 0) {
    return invalidBassTiming(
      `progression.slots[${index}].bars`,
      "progression slot bars must be positive safe integers.",
    );
  }

  const chord = slot.chord;
  if (typeof chord !== "object" || chord === null || Array.isArray(chord)) {
    return invalidHarmonicContext(
      `progression.slots[${index}].chord`,
      "progression slot chord must expose a canonical root.",
    );
  }

  let root: PitchClass;
  try {
    root = createPitchClass((chord as Record<string, unknown>).root as number);
  } catch {
    return invalidHarmonicContext(
      `progression.slots[${index}].chord.root`,
      "progression slot chord root must be a canonical PitchClass.",
    );
  }

  return Object.freeze({ root, bars: slot.bars });
}

function validateHarmonyContext(value: unknown): ValidatedHarmonyContext {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return invalidHarmonicContext("progression", "progression must be an object.");
  }

  const input = value as Record<string, unknown>;

  if (!Array.isArray(input.slots) || input.slots.length === 0) {
    return invalidHarmonicContext(
      "progression.slots",
      "progression must contain at least one ordered slot.",
    );
  }

  const slots: ValidatedBassSlot[] = [];
  for (let index = 0; index < input.slots.length; index += 1) {
    if (!Object.hasOwn(input.slots, index)) {
      return invalidHarmonicContext(
        `progression.slots[${index}]`,
        "progression slots must not contain sparse entries.",
      );
    }
    slots.push(validateHarmonySlot(input.slots[index], index));
  }
  const totalBars = slots.reduce((sum, slot) => {
    const next = sum + slot.bars;
    if (!Number.isSafeInteger(next)) {
      return invalidBassTiming("progression.slots", "progression bar span exceeds safe timing.");
    }
    return next;
  }, 0);
  if (totalBars !== 8) {
    return invalidBassTiming(
      "progression.slots",
      "progression slot bars must total exactly eight bars.",
    );
  }

  return Object.freeze({ slots: Object.freeze(slots) });
}

function createBassEvent(
  pitch: MidiPitch,
  startTickValue: number,
  durationValue: number,
  slotEndTick: number,
  index: number,
): BassEvent {
  if (!Number.isSafeInteger(startTickValue) || !Number.isSafeInteger(durationValue)) {
    return invalidBassTiming(
      `progression.slots[${index}]`,
      "Bass event timing must remain within safe integer bounds.",
    );
  }

  try {
    const startTick = createTick(startTickValue);
    const durationTicks = createDurationTicks(durationValue);
    if (
      !isEventStartTick(startTick) ||
      startTickValue + durationValue > slotEndTick ||
      startTickValue + durationValue > V1_SECTION_LENGTH_TICKS
    ) {
      return invalidBassTiming(
        `progression.slots[${index}]`,
        "Bass event timing must remain inside the eight-bar section.",
      );
    }
    return Object.freeze({ pitch, startTick, durationTicks });
  } catch {
    return invalidBassTiming(
      `progression.slots[${index}]`,
      "Bass event timing must be positive and inside the eight-bar section.",
    );
  }
}

function rhythmTiming(
  rhythm: BassRhythmId,
  slotStartTick: number,
  slotBars: number,
): readonly Readonly<{ startTick: number; durationTicks: number }>[] {
  const slotDuration = slotBars * V1_TICKS_PER_BAR;
  if (rhythm === BASS_RHYTHM_IDS.sustained) {
    return [{ startTick: slotStartTick, durationTicks: slotDuration }];
  }

  const durationTicks =
    rhythm === BASS_RHYTHM_IDS.quarterPulse
      ? SUBDIVISION_TICKS.quarter
      : rhythm === BASS_RHYTHM_IDS.sixteenthPulse
        ? SUBDIVISION_TICKS.sixteenth
        : SUBDIVISION_TICKS.eighth;
  const timing: Array<{ startTick: number; durationTicks: number }> = [];

  for (let bar = 0; bar < slotBars; bar += 1) {
    const barStart = slotStartTick + bar * V1_TICKS_PER_BAR;
    const firstOffset = rhythm === BASS_RHYTHM_IDS.offbeatEighth ? durationTicks : 0;
    const step =
      rhythm === BASS_RHYTHM_IDS.offbeatEighth ? SUBDIVISION_TICKS.quarter : durationTicks;
    for (let offset = firstOffset; offset < V1_TICKS_PER_BAR; offset += step) {
      timing.push({ startTick: barStart + offset, durationTicks });
    }
  }

  return timing;
}

export function generateBassEvents(
  progression: HarmonyProgressionRealization,
  range: BassRange = BASS_V1_RANGE,
  parameters: Readonly<Partial<BassGenerationParameters>> = {},
): readonly BassEvent[] {
  const validatedRange = validatedRangeValue(range);
  const context = validateHarmonyContext(progression);
  const normalizedParameters = normalizeBassGenerationParameters(parameters);
  const events: BassEvent[] = [];
  let startTick = 0;
  let previousBassPitch: MidiPitch | undefined;

  for (const [index, slot] of context.slots.entries()) {
    const slotDuration = slot.bars * V1_TICKS_PER_BAR;
    const slotEndTick = startTick + slotDuration;
    let pitch: MidiPitch;
    try {
      pitch =
        previousBassPitch === undefined
          ? resolveFirstBassPitch(slot.root, validatedRange)
          : resolveSubsequentBassPitch(slot.root, previousBassPitch, validatedRange);
    } catch (error) {
      if (error instanceof BassValueError && error.code === BASS_ERROR_CODES.noLegalRootPitch) {
        throw new BassValueError(
          error.code,
          `progression.slots[${index}].chord.root`,
          error.message,
        );
      }
      throw error;
    }
    for (const timing of rhythmTiming(normalizedParameters.rhythm, startTick, slot.bars)) {
      events.push(
        createBassEvent(pitch, timing.startTick, timing.durationTicks, slotEndTick, index),
      );
    }
    previousBassPitch = pitch;
    startTick = slotEndTick;
  }

  return Object.freeze(events);
}
