import { createChord, getChordPitchClasses, type Chord } from "./chord";
import { createChordInversion, type ChordInversion } from "./chord-inversion";
import { createMidiPitch, pitchClassOf, type MidiPitch } from "./pitch";

const chordVoicingBrand: unique symbol = Symbol("ChordVoicing");

export type ChordVoicing = Readonly<{
  midiPitches: readonly MidiPitch[];
  readonly [chordVoicingBrand]: true;
}>;

export const CHORD_VOICING_ERROR_CODES = {
  invalidShape: "INVALID_SHAPE",
  invalidPitch: "INVALID_PITCH",
  notAscending: "NOT_ASCENDING",
} as const;

export type ChordVoicingErrorCode =
  (typeof CHORD_VOICING_ERROR_CODES)[keyof typeof CHORD_VOICING_ERROR_CODES];

export class ChordVoicingValueError extends RangeError {
  readonly code: ChordVoicingErrorCode;
  readonly field: string;

  constructor(code: ChordVoicingErrorCode, field: string, message: string) {
    super(message);
    this.name = "ChordVoicingValueError";
    this.code = code;
    this.field = field;
  }
}

function validatePitches(value: unknown): readonly MidiPitch[] {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new ChordVoicingValueError(
      CHORD_VOICING_ERROR_CODES.invalidShape,
      "midiPitches",
      "midiPitches must be an array of exactly three MIDI pitches.",
    );
  }
  const pitches: MidiPitch[] = [];
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      throw new ChordVoicingValueError(
        CHORD_VOICING_ERROR_CODES.invalidShape,
        `midiPitches[${index}]`,
        "midiPitches must not be sparse.",
      );
    }
    try {
      pitches.push(createMidiPitch(value[index] as number));
    } catch (error) {
      if (error instanceof ChordVoicingValueError) throw error;
      throw new ChordVoicingValueError(
        CHORD_VOICING_ERROR_CODES.invalidPitch,
        `midiPitches[${index}]`,
        "midiPitches must contain valid MIDI pitches.",
      );
    }
  }
  if (!(pitches[0] < pitches[1] && pitches[1] < pitches[2])) {
    throw new ChordVoicingValueError(
      CHORD_VOICING_ERROR_CODES.notAscending,
      "midiPitches",
      "midiPitches must be strictly ascending.",
    );
  }
  return Object.freeze(pitches);
}

export function createChordVoicing(value: unknown): ChordVoicing {
  const midiPitches = validatePitches(value);
  return Object.freeze({ midiPitches }) as ChordVoicing;
}

function validatedVoicing(value: ChordVoicing): ChordVoicing {
  return createChordVoicing(value.midiPitches);
}

export function chordVoicingsEqual(left: ChordVoicing, right: ChordVoicing): boolean {
  const validatedLeft = validatedVoicing(left);
  const validatedRight = validatedVoicing(right);
  return validatedLeft.midiPitches.every(
    (pitch, index) => pitch === validatedRight.midiPitches[index],
  );
}

export function serializeChordVoicing(voicing: ChordVoicing): string {
  const validated = validatedVoicing(voicing);
  return JSON.stringify({
    schema: "nightdrive.chord-voicing.v1",
    midiPitches: validated.midiPitches,
  });
}

export function isChordVoicingCompatibleWithChord(voicing: ChordVoicing, chord: Chord): boolean {
  const validatedVoicingValue = validatedVoicing(voicing);
  const validatedChord = createChord(chord.root, chord.quality);
  const members = getChordPitchClasses(validatedChord);
  const projected = validatedVoicingValue.midiPitches.map(pitchClassOf);
  return members.every((member) => projected.filter((pitch) => pitch === member).length === 1);
}

export function isChordVoicingCompatibleWithChordInversion(
  voicing: ChordVoicing,
  chord: Chord,
  inversion: ChordInversion,
): boolean {
  const validatedVoicingValue = validatedVoicing(voicing);
  const validatedChord = createChord(chord.root, chord.quality);
  const validatedInversion = createChordInversion(inversion);
  if (!isChordVoicingCompatibleWithChord(validatedVoicingValue, validatedChord)) return false;
  const members = getChordPitchClasses(validatedChord);
  return pitchClassOf(validatedVoicingValue.midiPitches[0]) === members[validatedInversion];
}
