const pitchClassBrand: unique symbol = Symbol("PitchClass");
const midiPitchBrand: unique symbol = Symbol("MidiPitch");

export type PitchClass = number & { readonly [pitchClassBrand]: true };
export type MidiPitch = number & { readonly [midiPitchBrand]: true };

export const PITCH_ERROR_CODES = {
  notFinite: "NOT_FINITE",
  notInteger: "NOT_INTEGER",
  outOfRange: "OUT_OF_RANGE",
  unsafeInteger: "UNSAFE_INTEGER",
} as const;

export type PitchErrorCode = (typeof PITCH_ERROR_CODES)[keyof typeof PITCH_ERROR_CODES];

export class PitchValueError extends RangeError {
  readonly code: PitchErrorCode;
  readonly field: string;

  constructor(code: PitchErrorCode, field: string, message: string) {
    super(message);
    this.name = "PitchValueError";
    this.code = code;
    this.field = field;
  }
}

function requireIntegerInRange(
  value: number,
  minimum: number,
  maximum: number,
  field: string,
): void {
  if (!Number.isFinite(value)) {
    throw new PitchValueError(PITCH_ERROR_CODES.notFinite, field, `${field} must be finite.`);
  }
  if (!Number.isInteger(value)) {
    throw new PitchValueError(PITCH_ERROR_CODES.notInteger, field, `${field} must be an integer.`);
  }
  if (!Number.isSafeInteger(value)) {
    throw new PitchValueError(
      PITCH_ERROR_CODES.unsafeInteger,
      field,
      `${field} must be a safe integer.`,
    );
  }
  if (value < minimum || value > maximum) {
    throw new PitchValueError(
      PITCH_ERROR_CODES.outOfRange,
      field,
      `${field} must be between ${minimum} and ${maximum}.`,
    );
  }
}

export function createPitchClass(value: number): PitchClass {
  requireIntegerInRange(value, 0, 11, "pitchClass");
  return value as PitchClass;
}

export function pitchClassesEqual(left: PitchClass, right: PitchClass): boolean {
  return createPitchClass(left) === createPitchClass(right);
}

export function comparePitchClasses(left: PitchClass, right: PitchClass): -1 | 0 | 1 {
  const validatedLeft = createPitchClass(left);
  const validatedRight = createPitchClass(right);
  return validatedLeft < validatedRight ? -1 : validatedLeft > validatedRight ? 1 : 0;
}

export function createMidiPitch(value: number): MidiPitch {
  requireIntegerInRange(value, 0, 127, "midiPitch");
  return value as MidiPitch;
}

export function midiPitchesEqual(left: MidiPitch, right: MidiPitch): boolean {
  return createMidiPitch(left) === createMidiPitch(right);
}

export function compareMidiPitches(left: MidiPitch, right: MidiPitch): -1 | 0 | 1 {
  const validatedLeft = createMidiPitch(left);
  const validatedRight = createMidiPitch(right);
  return validatedLeft < validatedRight ? -1 : validatedLeft > validatedRight ? 1 : 0;
}

export function pitchClassOf(midiPitch: MidiPitch): PitchClass {
  return createPitchClass(createMidiPitch(midiPitch) % 12);
}

export function serializePitchClass(pitchClass: PitchClass): string {
  return JSON.stringify({
    schema: "nightdrive.pitch-class.v1",
    semitoneClass: createPitchClass(pitchClass),
  });
}

export function serializeMidiPitch(midiPitch: MidiPitch): string {
  return JSON.stringify({
    schema: "nightdrive.midi-pitch.v1",
    midiNoteNumber: createMidiPitch(midiPitch),
  });
}
