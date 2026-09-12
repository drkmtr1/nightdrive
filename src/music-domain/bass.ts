import { createMidiPitch, createPitchClass, type MidiPitch, type PitchClass } from "./pitch";

const bassRangeBrand: unique symbol = Symbol("BassRange");

export type BassRange = Readonly<{
  minMidiPitch: MidiPitch;
  maxMidiPitch: MidiPitch;
  readonly [bassRangeBrand]: true;
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

export function selectNearestBassPitch(
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
