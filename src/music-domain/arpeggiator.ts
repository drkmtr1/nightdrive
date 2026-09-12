import { createChord, chordsEqual, type Chord } from "./chord";
import { createChordInversion, type ChordInversion } from "./chord-inversion";
import {
  createChordVoicing,
  isChordVoicingCompatibleWithChord,
  isChordVoicingCompatibleWithChordInversion,
  type ChordVoicing,
} from "./chord-voicing";
import {
  getHarmonyTemplate,
  isHarmonyProfileId,
  isHarmonyTemplateSupportedForProfile,
  realizeHarmonyTemplate,
  type HarmonyProgressionRealization,
  type HarmonyProfileId,
  type HarmonyTemplate,
} from "./harmony";
import { createKey, type Key } from "./key";
import { createMidiPitch, type MidiPitch } from "./pitch";
import { createScaleDegree, type ScaleDegree } from "./scale";

const arpRangeBrand: unique symbol = Symbol("ArpRange");

export type ArpRange = Readonly<{
  minMidiPitch: MidiPitch;
  maxMidiPitch: MidiPitch;
  readonly [arpRangeBrand]: true;
}>;

export type ArpSlotCandidates = Readonly<{
  slotIndex: number;
  pitches: readonly MidiPitch[];
}>;

export const ARP_ERROR_CODES = {
  invalidHarmonicContext: "INVALID_HARMONIC_CONTEXT",
  invalidArpRange: "INVALID_ARP_RANGE",
  noLegalArpPitch: "NO_LEGAL_ARP_PITCH",
} as const;

export type ArpErrorCode = (typeof ARP_ERROR_CODES)[keyof typeof ARP_ERROR_CODES];

export class ArpValueError extends RangeError {
  readonly code: ArpErrorCode;
  readonly field: string;

  constructor(code: ArpErrorCode, field: string, message: string) {
    super(message);
    this.name = "ArpValueError";
    this.code = code;
    this.field = field;
  }
}

function fail(code: ArpErrorCode, field: string, message: string): never {
  throw new ArpValueError(code, field, message);
}

function invalidHarmonicContext(field: string, message: string): never {
  return fail(ARP_ERROR_CODES.invalidHarmonicContext, field, message);
}

function invalidArpRange(field: string, message: string): never {
  return fail(ARP_ERROR_CODES.invalidArpRange, field, message);
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return invalidHarmonicContext(field, `${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

export function createArpRange(value: unknown): ArpRange {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return invalidArpRange("range", "range must be an object with MIDI pitch bounds.");
  }
  const input = value as Record<string, unknown>;
  let minimum: MidiPitch;
  let maximum: MidiPitch;
  try {
    minimum = createMidiPitch(input.minMidiPitch as number);
  } catch {
    return invalidArpRange(
      "range.minMidiPitch",
      "range.minMidiPitch must be a canonical MidiPitch.",
    );
  }
  try {
    maximum = createMidiPitch(input.maxMidiPitch as number);
  } catch {
    return invalidArpRange(
      "range.maxMidiPitch",
      "range.maxMidiPitch must be a canonical MidiPitch.",
    );
  }
  if (minimum > maximum) {
    return invalidArpRange("range", "range.minMidiPitch must not exceed range.maxMidiPitch.");
  }
  return Object.freeze({ minMidiPitch: minimum, maxMidiPitch: maximum }) as ArpRange;
}

type ValidatedArpSlot = Readonly<{
  slotIndex: number;
  voicing: ChordVoicing;
}>;

function validateProgressionIdentity(value: Record<string, unknown>): Readonly<{
  profile: HarmonyProfileId;
  template: HarmonyTemplate;
  key: Key;
}> {
  if (!isHarmonyProfileId(value.profile)) {
    return invalidHarmonicContext("progression.profile", "progression profile must be canonical.");
  }
  if (typeof value.templateId !== "string") {
    return invalidHarmonicContext(
      "progression.templateId",
      "progression templateId must identify a canonical Harmony template.",
    );
  }

  let template: HarmonyTemplate;
  try {
    template = getHarmonyTemplate(value.templateId);
  } catch {
    return invalidHarmonicContext(
      "progression.templateId",
      "progression templateId must identify a canonical Harmony template.",
    );
  }
  if (
    value.templateVersion !== template.version ||
    !isHarmonyTemplateSupportedForProfile(value.profile, template)
  ) {
    return invalidHarmonicContext(
      "progression.templateVersion",
      "progression template identity must be supported for its profile.",
    );
  }

  const keyInput = requireRecord(value.key, "progression.key");
  let key: Key;
  try {
    key = createKey(keyInput.tonic as never, keyInput.scale as never);
  } catch {
    return invalidHarmonicContext("progression.key", "progression key must be canonical.");
  }
  if (key.scale !== template.scale) {
    return invalidHarmonicContext(
      "progression.key.scale",
      "progression key scale must match its Harmony template.",
    );
  }
  return Object.freeze({ profile: value.profile, template, key });
}

function validateProgressionSlot(
  value: unknown,
  index: number,
  template: HarmonyTemplate,
  expectedChord: Chord,
): ValidatedArpSlot {
  const slot = requireRecord(value, `progression.slots[${index}]`);
  if (slot.index !== index) {
    return invalidHarmonicContext(
      `progression.slots[${index}].index`,
      "progression slot index must match its ordered position.",
    );
  }

  let degree: ScaleDegree;
  try {
    degree = createScaleDegree(slot.degree as number);
  } catch {
    return invalidHarmonicContext(
      `progression.slots[${index}].degree`,
      "progression slot degree must be canonical.",
    );
  }
  if (degree !== template.slots[index].degree || slot.bars !== template.slots[index].bars) {
    return invalidHarmonicContext(
      `progression.slots[${index}]`,
      "progression slot structure must match its canonical Harmony template.",
    );
  }

  const chordInput = requireRecord(slot.chord, `progression.slots[${index}].chord`);
  let chord: Chord;
  try {
    chord = createChord(chordInput.root as never, chordInput.quality as never);
  } catch {
    return invalidHarmonicContext(
      `progression.slots[${index}].chord`,
      "progression slot chord must be canonical.",
    );
  }
  if (!chordsEqual(chord, expectedChord)) {
    return invalidHarmonicContext(
      `progression.slots[${index}].chord`,
      "progression slot chord must match its Harmony template and key.",
    );
  }

  let inversion: ChordInversion;
  try {
    inversion = createChordInversion(slot.inversion as number);
  } catch {
    return invalidHarmonicContext(
      `progression.slots[${index}].inversion`,
      "progression slot inversion must be canonical.",
    );
  }

  const voicingInput = requireRecord(slot.voicing, `progression.slots[${index}].voicing`);
  let voicing: ChordVoicing;
  try {
    voicing = createChordVoicing(voicingInput.midiPitches);
  } catch {
    return invalidHarmonicContext(
      `progression.slots[${index}].voicing`,
      "progression slot voicing must be canonical.",
    );
  }
  if (
    !isChordVoicingCompatibleWithChord(voicing, chord) ||
    !isChordVoicingCompatibleWithChordInversion(voicing, chord, inversion)
  ) {
    return invalidHarmonicContext(
      `progression.slots[${index}].voicing`,
      "progression slot voicing must be compatible with its Chord and inversion.",
    );
  }

  return Object.freeze({ slotIndex: index, voicing });
}

function validateHarmonyProgression(value: unknown): readonly ValidatedArpSlot[] {
  const progression = requireRecord(value, "progression");
  const identity = validateProgressionIdentity(progression);
  if (
    !Array.isArray(progression.slots) ||
    progression.slots.length !== identity.template.slots.length
  ) {
    return invalidHarmonicContext(
      "progression.slots",
      "progression slots must match the canonical Harmony template length.",
    );
  }

  const expectedChords = realizeHarmonyTemplate(identity.template, identity.key);
  const slots: ValidatedArpSlot[] = [];
  for (let index = 0; index < progression.slots.length; index += 1) {
    if (!Object.hasOwn(progression.slots, index)) {
      return invalidHarmonicContext(
        `progression.slots[${index}]`,
        "progression slots must not contain sparse entries.",
      );
    }
    slots.push(
      validateProgressionSlot(
        progression.slots[index],
        index,
        identity.template,
        expectedChords[index],
      ),
    );
  }
  return Object.freeze(slots);
}

export function deriveArpSlotCandidates(
  progression: HarmonyProgressionRealization,
  range: ArpRange,
): readonly ArpSlotCandidates[] {
  const validatedRange = createArpRange(range);
  const slots = validateHarmonyProgression(progression);
  const result: ArpSlotCandidates[] = [];

  for (const slot of slots) {
    const pitches = Object.freeze(
      slot.voicing.midiPitches.filter(
        (pitch) => pitch >= validatedRange.minMidiPitch && pitch <= validatedRange.maxMidiPitch,
      ),
    );
    if (pitches.length === 0) {
      return fail(
        ARP_ERROR_CODES.noLegalArpPitch,
        `progression.slots[${slot.slotIndex}].voicing.midiPitches`,
        "progression slot has no selected-voicing pitch inside the Arp range.",
      );
    }
    result.push(Object.freeze({ slotIndex: slot.slotIndex, pitches }));
  }

  return Object.freeze(result);
}
