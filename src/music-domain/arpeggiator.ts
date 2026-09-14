import { type Chord, chordsEqual, createChord } from "./chord";
import { type ChordInversion, createChordInversion } from "./chord-inversion";
import {
  type ChordVoicing,
  createChordVoicing,
  isChordVoicingCompatibleWithChord,
  isChordVoicingCompatibleWithChordInversion,
} from "./chord-voicing";
import {
  getHarmonyTemplate,
  type HarmonyProfileId,
  type HarmonyProgressionRealization,
  type HarmonyTemplate,
  isHarmonyProfileId,
  isHarmonyTemplateSupportedForProfile,
  realizeHarmonyTemplate,
} from "./harmony";
import { createKey, type Key } from "./key";
import {
  createTick,
  type DurationTicks,
  SUBDIVISION_TICKS,
  type Tick,
  V1_SECTION_LENGTH_TICKS,
  V1_TICKS_PER_BAR,
} from "./musical-time";
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

export type ArpEvent = Readonly<{
  pitch: MidiPitch;
  startTick: Tick;
  durationTicks: DurationTicks;
}>;

export const ARP_RATE_IDS = Object.freeze({
  quarter: "quarter",
  eighth: "eighth",
  sixteenth: "sixteenth",
} as const);

export type ArpRateId = (typeof ARP_RATE_IDS)[keyof typeof ARP_RATE_IDS];

export const ARP_DIRECTION_IDS = Object.freeze({
  up: "up",
  down: "down",
  upDown: "up-down",
  downUp: "down-up",
} as const);

export type ArpDirectionId = (typeof ARP_DIRECTION_IDS)[keyof typeof ARP_DIRECTION_IDS];

export type ArpTraversalParametersV1 = Readonly<{
  rate: ArpRateId;
  direction: ArpDirectionId;
  gateTicks?: DurationTicks;
}>;

type NormalizedArpTraversalParametersV1 = Readonly<{
  rate: ArpRateId;
  direction: ArpDirectionId;
  gateTicks: DurationTicks;
}>;

export const ARP_ERROR_CODES = {
  invalidHarmonicContext: "INVALID_HARMONIC_CONTEXT",
  invalidArpRange: "INVALID_ARP_RANGE",
  noLegalArpPitch: "NO_LEGAL_ARP_PITCH",
  invalidArpRate: "INVALID_ARP_RATE",
  invalidArpDirection: "INVALID_ARP_DIRECTION",
  invalidArpGate: "INVALID_ARP_GATE",
  invalidArpTiming: "INVALID_ARP_TIMING",
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

function normalizeArpTraversalParameters(
  value: ArpTraversalParametersV1 | undefined,
): NormalizedArpTraversalParametersV1 {
  if (value === undefined) {
    return Object.freeze({
      rate: ARP_RATE_IDS.eighth,
      direction: ARP_DIRECTION_IDS.up,
      gateTicks: SUBDIVISION_TICKS.eighth,
    });
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(
      ARP_ERROR_CODES.invalidArpRate,
      "parameters.rate",
      "parameters must be an object containing a supported rate and direction.",
    );
  }

  const input = value as Record<string, unknown>;
  if (!Object.values(ARP_RATE_IDS).includes(input.rate as ArpRateId)) {
    return fail(
      ARP_ERROR_CODES.invalidArpRate,
      "parameters.rate",
      "parameters.rate must be a supported Arp rate identifier.",
    );
  }
  if (!Object.values(ARP_DIRECTION_IDS).includes(input.direction as ArpDirectionId)) {
    return fail(
      ARP_ERROR_CODES.invalidArpDirection,
      "parameters.direction",
      "parameters.direction must be a supported Arp direction identifier.",
    );
  }

  const selectedRate = input.rate as ArpRateId;
  const selectedRateTicks = rateTicks(selectedRate);
  const gateTicksValue = input.gateTicks;
  if (
    gateTicksValue !== undefined &&
    (typeof gateTicksValue !== "number" ||
      !Number.isFinite(gateTicksValue) ||
      !Number.isSafeInteger(gateTicksValue) ||
      gateTicksValue < 1 ||
      gateTicksValue > selectedRateTicks)
  ) {
    return fail(
      ARP_ERROR_CODES.invalidArpGate,
      "parameters.gateTicks",
      "parameters.gateTicks must be a finite safe integer from 1 through the selected rate ticks.",
    );
  }

  return Object.freeze({
    rate: selectedRate,
    direction: input.direction as ArpDirectionId,
    gateTicks: (gateTicksValue ?? selectedRateTicks) as DurationTicks,
  });
}

function rateTicks(rate: ArpRateId): DurationTicks {
  if (rate === ARP_RATE_IDS.quarter) return SUBDIVISION_TICKS.quarter;
  if (rate === ARP_RATE_IDS.sixteenth) return SUBDIVISION_TICKS.sixteenth;
  return SUBDIVISION_TICKS.eighth;
}

function createDirectionCycle(
  candidateCount: number,
  direction: ArpDirectionId,
): readonly number[] {
  if (candidateCount === 1) return Object.freeze([0]);

  const ascending = Array.from({ length: candidateCount }, (_, index) => index);
  const descending = [...ascending].reverse();
  if (direction === ARP_DIRECTION_IDS.up) return Object.freeze(ascending);
  if (direction === ARP_DIRECTION_IDS.down) return Object.freeze(descending);
  if (direction === ARP_DIRECTION_IDS.upDown) {
    return Object.freeze([...ascending, ...ascending.slice(1, -1).reverse()]);
  }
  return Object.freeze([...descending, ...ascending.slice(1, -1)]);
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

export function generateArpEvents(
  progression: HarmonyProgressionRealization,
  range: ArpRange,
  parameters?: ArpTraversalParametersV1,
): readonly ArpEvent[] {
  const candidatesBySlot = deriveArpSlotCandidates(progression, range);
  const normalizedParameters = normalizeArpTraversalParameters(parameters);
  const selectedRateTicks = rateTicks(normalizedParameters.rate);
  const events: ArpEvent[] = [];
  let slotStartTick = 0;

  for (const candidates of candidatesBySlot) {
    const slotDurationTicks = progression.slots[candidates.slotIndex].bars * V1_TICKS_PER_BAR;
    if (slotDurationTicks % selectedRateTicks !== 0) {
      throw new Error("Validated Stage 7B3 slot duration must be divisible by the selected rate.");
    }
    const slotEndTick = slotStartTick + slotDurationTicks;
    const directionCycle = createDirectionCycle(
      candidates.pitches.length,
      normalizedParameters.direction,
    );

    for (
      let eventStartTick = slotStartTick, slotEventIndex = 0;
      eventStartTick < slotEndTick;
      eventStartTick += selectedRateTicks, slotEventIndex += 1
    ) {
      const candidateIndex = directionCycle[slotEventIndex % directionCycle.length];
      events.push(
        Object.freeze({
          pitch: candidates.pitches[candidateIndex],
          startTick: createTick(eventStartTick),
          durationTicks: normalizedParameters.gateTicks,
        }),
      );
    }

    slotStartTick = slotEndTick;
  }

  if (slotStartTick !== V1_SECTION_LENGTH_TICKS) {
    throw new Error("Stage 7B3 projection must end at the canonical section boundary.");
  }

  return Object.freeze(events);
}
