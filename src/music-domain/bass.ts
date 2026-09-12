import { createChord, type Chord } from "./chord";
import { createChordInversion } from "./chord-inversion";
import {
  createChordVoicing,
  isChordVoicingCompatibleWithChord,
  isChordVoicingCompatibleWithChordInversion,
} from "./chord-voicing";
import {
  getHarmonyTemplate,
  isHarmonyProfileId,
  isHarmonyTemplateSupportedForProfile,
  type HarmonyProgressionRealization,
  type HarmonyProgressionSlot,
} from "./harmony";
import { createKey } from "./key";
import { createMidiPitch, createPitchClass, type MidiPitch, type PitchClass } from "./pitch";
import { createScaleDegree } from "./scale";
import {
  createDurationTicks,
  createTick,
  isEventStartTick,
  V1_SECTION_LENGTH_TICKS,
  V1_TICKS_PER_BAR,
  type DurationTicks,
  type Tick,
} from "./musical-time";

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

export const BASS_ERROR_CODES = {
  invalidHarmonicContext: "INVALID_HARMONIC_CONTEXT",
  invalidBassRange: "INVALID_BASS_RANGE",
  noLegalRootPitch: "NO_LEGAL_ROOT_PITCH",
  invalidBassTiming: "INVALID_BASS_TIMING",
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
  chord: Chord;
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

  const slot = value as Partial<HarmonyProgressionSlot>;
  if (slot.index !== index) {
    return invalidHarmonicContext(
      `progression.slots[${index}].index`,
      "progression slot indices must match their ordered position.",
    );
  }

  if (typeof slot.bars !== "number" || !Number.isSafeInteger(slot.bars) || slot.bars <= 0) {
    return invalidBassTiming(
      `progression.slots[${index}].bars`,
      "progression slot bars must be positive safe integers.",
    );
  }

  try {
    createScaleDegree(slot.degree as number);
    const chordValue = slot.chord;
    if (typeof chordValue !== "object" || chordValue === null || Array.isArray(chordValue)) {
      return invalidHarmonicContext(
        `progression.slots[${index}].chord`,
        "progression slot chord must be a canonical Chord.",
      );
    }
    const chord = createChord(chordValue.root, chordValue.quality);

    const inversion = createChordInversion(slot.inversion as number);
    const voicingValue = slot.voicing;
    if (typeof voicingValue !== "object" || voicingValue === null || Array.isArray(voicingValue)) {
      return invalidHarmonicContext(
        `progression.slots[${index}].voicing`,
        "progression slot voicing must be canonical.",
      );
    }
    const voicing = createChordVoicing(voicingValue.midiPitches);
    if (
      !isChordVoicingCompatibleWithChord(voicing, chord) ||
      !isChordVoicingCompatibleWithChordInversion(voicing, chord, inversion)
    ) {
      return invalidHarmonicContext(
        `progression.slots[${index}]`,
        "progression slot chord, inversion, and voicing must be compatible.",
      );
    }

    if (index === 0) {
      if (slot.adjacentCost !== null) {
        return invalidHarmonicContext(
          `progression.slots[${index}].adjacentCost`,
          "the first progression slot must not have an adjacent cost.",
        );
      }
    } else if (
      typeof slot.adjacentCost !== "number" ||
      !Number.isSafeInteger(slot.adjacentCost) ||
      slot.adjacentCost < 0
    ) {
      return invalidHarmonicContext(
        `progression.slots[${index}].adjacentCost`,
        "later progression slots must have a nonnegative adjacent cost.",
      );
    }

    const rationale = slot.rationale;
    if (
      typeof rationale !== "object" ||
      rationale === null ||
      Array.isArray(rationale) ||
      typeof rationale.preferenceRank !== "number" ||
      !Number.isSafeInteger(rationale.preferenceRank) ||
      rationale.preferenceRank < 0 ||
      typeof rationale.tieBreak !== "string" ||
      rationale.tieBreak.length === 0
    ) {
      return invalidHarmonicContext(
        `progression.slots[${index}].rationale`,
        "progression slot rationale must be canonical.",
      );
    }

    return Object.freeze({ chord, bars: slot.bars });
  } catch {
    return invalidHarmonicContext(
      `progression.slots[${index}]`,
      "progression slot values must be canonical music-domain values.",
    );
  }
}

function validateHarmonyContext(value: unknown): ValidatedHarmonyContext {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return invalidHarmonicContext("progression", "progression must be an object.");
  }

  const input = value as Partial<HarmonyProgressionRealization>;
  if (!isHarmonyProfileId(input.profile)) {
    return invalidHarmonicContext("progression.profile", "progression profile is not canonical.");
  }
  if (typeof input.templateId !== "string" || input.templateId.trim() === "") {
    return invalidHarmonicContext(
      "progression.templateId",
      "progression template identity must be canonical.",
    );
  }
  if (input.templateVersion !== "v1") {
    return invalidHarmonicContext(
      "progression.templateVersion",
      "progression template version is unsupported.",
    );
  }

  try {
    const template = getHarmonyTemplate(input.templateId);
    if (!isHarmonyTemplateSupportedForProfile(input.profile, template)) {
      return invalidHarmonicContext(
        "progression.templateId",
        "progression template is not supported for its profile.",
      );
    }
    if (typeof input.key !== "object" || input.key === null || Array.isArray(input.key)) {
      return invalidHarmonicContext("progression.key", "progression key must be canonical.");
    }
    const key = createKey(input.key.tonic, input.key.scale);
    if (key.scale !== template.scale) {
      return invalidHarmonicContext(
        "progression.key.scale",
        "progression key scale must match its template.",
      );
    }
  } catch {
    return invalidHarmonicContext(
      "progression",
      "progression metadata must be canonical Harmony values.",
    );
  }

  if (!Array.isArray(input.slots) || input.slots.length === 0) {
    return invalidHarmonicContext(
      "progression.slots",
      "progression must contain at least one ordered slot.",
    );
  }

  const slots = input.slots.map((slot, index) => validateHarmonySlot(slot, index));
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

function createBassEventTiming(
  startTickValue: number,
  bars: number,
  index: number,
): Readonly<{ startTick: Tick; durationTicks: DurationTicks }> {
  const durationValue = bars * V1_TICKS_PER_BAR;
  if (!Number.isSafeInteger(startTickValue) || !Number.isSafeInteger(durationValue)) {
    return invalidBassTiming(
      `progression.slots[${index}]`,
      "Bass event timing must remain within safe integer bounds.",
    );
  }

  try {
    const startTick = createTick(startTickValue);
    const durationTicks = createDurationTicks(durationValue);
    if (!isEventStartTick(startTick) || startTickValue + durationValue > V1_SECTION_LENGTH_TICKS) {
      return invalidBassTiming(
        `progression.slots[${index}]`,
        "Bass event timing must remain inside the eight-bar section.",
      );
    }
    return Object.freeze({ startTick, durationTicks });
  } catch {
    return invalidBassTiming(
      `progression.slots[${index}]`,
      "Bass event timing must be positive and inside the eight-bar section.",
    );
  }
}

export function generateBassEvents(
  progression: HarmonyProgressionRealization,
  range: BassRange = BASS_V1_RANGE,
): readonly BassEvent[] {
  const validatedRange = validatedRangeValue(range);
  const context = validateHarmonyContext(progression);
  const events: BassEvent[] = [];
  let startTick = 0;
  let previousBassPitch: MidiPitch | undefined;

  for (const [index, slot] of context.slots.entries()) {
    const timing = createBassEventTiming(startTick, slot.bars, index);
    let pitch: MidiPitch;
    try {
      pitch =
        previousBassPitch === undefined
          ? resolveFirstBassPitch(slot.chord.root, validatedRange)
          : resolveSubsequentBassPitch(slot.chord.root, previousBassPitch, validatedRange);
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
    events.push(
      Object.freeze({
        pitch,
        startTick: timing.startTick,
        durationTicks: timing.durationTicks,
      }),
    );
    previousBassPitch = pitch;
    startTick += timing.durationTicks;
  }

  return Object.freeze(events);
}
