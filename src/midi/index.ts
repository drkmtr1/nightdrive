import {
  PPQ,
  V1_SECTION_LENGTH_TICKS,
  createDurationTicks,
  createTempoFromMicrosecondsPerQuarter,
  createTick,
  type DurationTicks,
  type MicrosecondsPerQuarter,
  type Tick,
} from "../music-domain/musical-time";
import { createMidiPitch, type MidiPitch } from "../music-domain/pitch";

export const MIDI_IR_SCHEMA = "nightdrive.midi-ir.v1" as const;
export const MIDI_IR_PPQ = PPQ;
export const MIDI_IR_SECTION_END_TICK = V1_SECTION_LENGTH_TICKS;

export const MIDI_COMPONENT_IDS = Object.freeze({
  conductor: "conductor",
  chords: "chords",
  bass: "bass",
  arp: "arp",
  lead: "lead",
} as const);

export type MidiComponent = (typeof MIDI_COMPONENT_IDS)[keyof typeof MIDI_COMPONENT_IDS];
export type MusicalMidiComponent = Exclude<MidiComponent, "conductor">;

export const MIDI_CHANNEL_BY_COMPONENT = Object.freeze({
  chords: 0,
  bass: 1,
  arp: 2,
  lead: 3,
} as const);

export const MIDI_IR_ERROR_CODES = {
  invalidChannel: "INVALID_CHANNEL",
  invalidComponent: "INVALID_COMPONENT",
  invalidEvent: "INVALID_EVENT",
  invalidNoteLifecycle: "INVALID_NOTE_LIFECYCLE",
  invalidNoteOffVelocity: "INVALID_NOTE_OFF_VELOCITY",
  invalidNoteOnVelocity: "INVALID_NOTE_ON_VELOCITY",
  invalidPitch: "INVALID_PITCH",
  invalidPpq: "INVALID_PPQ",
  invalidSectionBoundary: "INVALID_SECTION_BOUNDARY",
  invalidShape: "INVALID_SHAPE",
  invalidTempo: "INVALID_TEMPO",
  invalidTick: "INVALID_TICK",
  invalidTrack: "INVALID_TRACK",
  unsupportedEventType: "UNSUPPORTED_EVENT_TYPE",
  unsupportedSchema: "UNSUPPORTED_SCHEMA",
} as const;

export type MidiIrErrorCode = (typeof MIDI_IR_ERROR_CODES)[keyof typeof MIDI_IR_ERROR_CODES];

export class MidiIrValidationError extends RangeError {
  readonly code: MidiIrErrorCode;
  readonly field: string;

  constructor(code: MidiIrErrorCode, field: string, message: string) {
    super(message);
    this.name = "MidiIrValidationError";
    this.code = code;
    this.field = field;
  }
}

type Brand<T, Name extends string> = T & { readonly [brand: string]: Name };
export type MidiChannel = Brand<number, "MidiChannel">;

export type MidiTrackNameEvent = Readonly<{
  readonly type: "track-name";
  readonly tick: Tick;
  readonly name: string;
}>;

export type MidiTimeSignatureEvent = Readonly<{
  readonly type: "time-signature";
  readonly tick: Tick;
  readonly numerator: 4;
  readonly denominator: 4;
}>;

export type MidiTempoEvent = Readonly<{
  readonly type: "tempo";
  readonly tick: Tick;
  readonly microsecondsPerQuarter: MicrosecondsPerQuarter;
}>;

export type MidiNoteOnEvent = Readonly<{
  readonly type: "note-on";
  readonly tick: Tick;
  readonly channel: MidiChannel;
  readonly pitch: MidiPitch;
  readonly velocity: number;
}>;

export type MidiNoteOffEvent = Readonly<{
  readonly type: "note-off";
  readonly tick: Tick;
  readonly channel: MidiChannel;
  readonly pitch: MidiPitch;
  readonly releaseVelocity: 0;
}>;

export type MidiEndOfTrackEvent = Readonly<{
  readonly type: "end-of-track";
  readonly tick: Tick;
}>;

export type MidiIrEvent =
  | MidiTrackNameEvent
  | MidiTimeSignatureEvent
  | MidiTempoEvent
  | MidiNoteOnEvent
  | MidiNoteOffEvent
  | MidiEndOfTrackEvent;

export type MidiSourceNote = Readonly<{
  readonly component: MusicalMidiComponent;
  readonly channel: MidiChannel;
  readonly startTick: Tick;
  readonly durationTicks: DurationTicks;
  readonly pitch: MidiPitch;
  readonly velocity: number;
}>;

export type MidiIrTrack = Readonly<{
  readonly component: MidiComponent;
  readonly channel?: MidiChannel;
  readonly events: readonly MidiIrEvent[];
}>;

export type MidiIr = Readonly<{
  readonly schema: typeof MIDI_IR_SCHEMA;
  readonly ppq: typeof MIDI_IR_PPQ;
  readonly sectionEndTick: typeof MIDI_IR_SECTION_END_TICK;
  readonly tracks: readonly MidiIrTrack[];
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(code: MidiIrErrorCode, field: string, message: string): never {
  throw new MidiIrValidationError(code, field, message);
}

function requireSafeInteger(
  value: unknown,
  code: MidiIrErrorCode,
  field: string,
  message: string,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(code, field, message);
  if (!Number.isInteger(value) || !Number.isSafeInteger(value)) fail(code, field, message);
  return value;
}

function validateTick(value: unknown, field: string): Tick {
  const tick = requireSafeInteger(
    value,
    MIDI_IR_ERROR_CODES.invalidTick,
    field,
    `${field} must be a safe integer tick.`,
  );
  if (tick < 0 || tick > MIDI_IR_SECTION_END_TICK) {
    fail(
      MIDI_IR_ERROR_CODES.invalidTick,
      field,
      `${field} must be between 0 and ${MIDI_IR_SECTION_END_TICK}.`,
    );
  }
  return createTick(tick);
}

function validateComponent(value: unknown, field: string): MidiComponent {
  if (
    value !== MIDI_COMPONENT_IDS.conductor &&
    value !== MIDI_COMPONENT_IDS.chords &&
    value !== MIDI_COMPONENT_IDS.bass &&
    value !== MIDI_COMPONENT_IDS.arp &&
    value !== MIDI_COMPONENT_IDS.lead
  ) {
    fail(MIDI_IR_ERROR_CODES.invalidComponent, field, `${field} is not a V1 MIDI component.`);
  }
  return value;
}

function validateMusicalComponent(value: unknown, field: string): MusicalMidiComponent {
  const component = validateComponent(value, field);
  if (component === MIDI_COMPONENT_IDS.conductor) {
    fail(MIDI_IR_ERROR_CODES.invalidComponent, field, `${field} cannot be conductor for a note.`);
  }
  return component;
}

function validateChannel(value: unknown, field: string): MidiChannel {
  const channel = requireSafeInteger(
    value,
    MIDI_IR_ERROR_CODES.invalidChannel,
    field,
    `${field} must be an integer MIDI channel.`,
  );
  if (channel < 0 || channel > 15) {
    fail(MIDI_IR_ERROR_CODES.invalidChannel, field, `${field} must be between 0 and 15.`);
  }
  return channel as MidiChannel;
}

function expectedChannel(component: MusicalMidiComponent): MidiChannel {
  return MIDI_CHANNEL_BY_COMPONENT[component] as MidiChannel;
}

function validateComponentChannel(
  component: MusicalMidiComponent,
  value: unknown,
  field: string,
): MidiChannel {
  const channel = validateChannel(value, field);
  if (channel !== expectedChannel(component)) {
    fail(
      MIDI_IR_ERROR_CODES.invalidChannel,
      field,
      `${field} does not match the fixed channel for ${component}.`,
    );
  }
  return channel;
}

function validatePitch(value: unknown, field: string): MidiPitch {
  if (typeof value !== "number") {
    fail(MIDI_IR_ERROR_CODES.invalidPitch, field, `${field} must be a MIDI pitch.`);
  }
  try {
    return createMidiPitch(value);
  } catch {
    fail(MIDI_IR_ERROR_CODES.invalidPitch, field, `${field} must be between 0 and 127.`);
  }
}

function validateNoteOnVelocity(value: unknown, field: string): number {
  const velocity = requireSafeInteger(
    value,
    MIDI_IR_ERROR_CODES.invalidNoteOnVelocity,
    field,
    `${field} must be an integer from 1 through 127.`,
  );
  if (velocity < 1 || velocity > 127) {
    fail(
      MIDI_IR_ERROR_CODES.invalidNoteOnVelocity,
      field,
      `${field} must be an integer from 1 through 127.`,
    );
  }
  return velocity;
}

function validateName(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    fail(MIDI_IR_ERROR_CODES.invalidEvent, field, `${field} must be a non-empty string.`);
  }
  return value;
}

function validateTempo(value: unknown, field: string): MicrosecondsPerQuarter {
  if (typeof value !== "number") {
    fail(MIDI_IR_ERROR_CODES.invalidTempo, field, `${field} must be a positive safe integer.`);
  }
  try {
    return createTempoFromMicrosecondsPerQuarter(value).microsecondsPerQuarter;
  } catch {
    fail(MIDI_IR_ERROR_CODES.invalidTempo, field, `${field} must be a positive safe integer.`);
  }
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value))
    fail(MIDI_IR_ERROR_CODES.invalidShape, field, `${field} must be an object.`);
  return value;
}

export function createMidiIrEvent(value: unknown): MidiIrEvent {
  const input = requireRecord(value, "event");
  const type = input.type;
  const tick = validateTick(input.tick, "event.tick");

  switch (type) {
    case "track-name":
      return Object.freeze({ type, tick, name: validateName(input.name, "event.name") });
    case "time-signature":
      if (input.numerator !== 4 || input.denominator !== 4) {
        fail(
          MIDI_IR_ERROR_CODES.invalidEvent,
          "event.timeSignature",
          "V1 time signature must be 4/4.",
        );
      }
      return Object.freeze({ type, tick, numerator: 4 as const, denominator: 4 as const });
    case "tempo":
      return Object.freeze({
        type,
        tick,
        microsecondsPerQuarter: validateTempo(
          input.microsecondsPerQuarter,
          "event.microsecondsPerQuarter",
        ),
      });
    case "note-on": {
      if (tick >= MIDI_IR_SECTION_END_TICK) {
        fail(
          MIDI_IR_ERROR_CODES.invalidNoteLifecycle,
          "event.tick",
          "note-on events must start before the section end.",
        );
      }
      const channel = validateChannel(input.channel, "event.channel");
      return Object.freeze({
        type,
        tick,
        channel,
        pitch: validatePitch(input.pitch, "event.pitch"),
        velocity: validateNoteOnVelocity(input.velocity, "event.velocity"),
      });
    }
    case "note-off": {
      const channel = validateChannel(input.channel, "event.channel");
      if (input.releaseVelocity !== 0) {
        fail(
          MIDI_IR_ERROR_CODES.invalidNoteOffVelocity,
          "event.releaseVelocity",
          "V1 Note Off release velocity must be 0.",
        );
      }
      return Object.freeze({
        type,
        tick,
        channel,
        pitch: validatePitch(input.pitch, "event.pitch"),
        releaseVelocity: 0 as const,
      });
    }
    case "end-of-track":
      if (tick !== MIDI_IR_SECTION_END_TICK) {
        fail(
          MIDI_IR_ERROR_CODES.invalidSectionBoundary,
          "event.tick",
          `End-of-Track must occur at ${MIDI_IR_SECTION_END_TICK}.`,
        );
      }
      return Object.freeze({ type, tick });
    default:
      fail(
        MIDI_IR_ERROR_CODES.unsupportedEventType,
        "event.type",
        "event.type is not supported by the V1 IR.",
      );
  }
}

export function createMidiSourceNote(value: unknown): MidiSourceNote {
  const input = requireRecord(value, "note");
  const component = validateMusicalComponent(input.component, "note.component");
  const channel =
    input.channel === undefined
      ? expectedChannel(component)
      : validateComponentChannel(component, input.channel, "note.channel");
  const startTick = validateTick(input.startTick, "note.startTick");
  if (startTick >= MIDI_IR_SECTION_END_TICK) {
    fail(
      MIDI_IR_ERROR_CODES.invalidNoteLifecycle,
      "note.startTick",
      "note.startTick must be before the section end.",
    );
  }
  const durationTicksValue = requireSafeInteger(
    input.durationTicks,
    MIDI_IR_ERROR_CODES.invalidNoteLifecycle,
    "note.durationTicks",
    "note.durationTicks must be a positive safe integer.",
  );
  if (durationTicksValue < 1) {
    fail(
      MIDI_IR_ERROR_CODES.invalidNoteLifecycle,
      "note.durationTicks",
      "note.durationTicks must be positive.",
    );
  }
  const endTickValue = startTick + durationTicksValue;
  if (!Number.isSafeInteger(endTickValue) || endTickValue > MIDI_IR_SECTION_END_TICK) {
    fail(
      MIDI_IR_ERROR_CODES.invalidNoteLifecycle,
      "note",
      "note must end at or before the section boundary.",
    );
  }
  return Object.freeze({
    component,
    channel,
    startTick,
    durationTicks: createDurationTicks(durationTicksValue),
    pitch: validatePitch(input.pitch, "note.pitch"),
    velocity: validateNoteOnVelocity(input.velocity, "note.velocity"),
  });
}

export function expandMidiSourceNote(value: unknown): readonly [MidiNoteOnEvent, MidiNoteOffEvent] {
  const note = createMidiSourceNote(value);
  const endTick = createTick(note.startTick + note.durationTicks);
  return Object.freeze([
    Object.freeze({
      type: "note-on" as const,
      tick: note.startTick,
      channel: note.channel,
      pitch: note.pitch,
      velocity: note.velocity,
    }),
    Object.freeze({
      type: "note-off" as const,
      tick: endTick,
      channel: note.channel,
      pitch: note.pitch,
      releaseVelocity: 0 as const,
    }),
  ]);
}

function validateTrackEvent(
  event: MidiIrEvent,
  component: MidiComponent,
  field: string,
): MidiIrEvent {
  if (event.type === "note-on" || event.type === "note-off") {
    if (component === MIDI_COMPONENT_IDS.conductor) {
      fail(
        MIDI_IR_ERROR_CODES.invalidTrack,
        field,
        "The conductor track cannot contain note events.",
      );
    }
    const expected = expectedChannel(component);
    if (event.channel !== expected) {
      fail(
        MIDI_IR_ERROR_CODES.invalidChannel,
        `${field}.channel`,
        `note channel does not match the fixed channel for ${component}.`,
      );
    }
  }
  return event;
}

export function createMidiIrTrack(value: unknown): MidiIrTrack {
  const input = requireRecord(value, "track");
  const component = validateComponent(input.component, "track.component");
  if (!Array.isArray(input.events) || input.events.length === 0) {
    fail(MIDI_IR_ERROR_CODES.invalidShape, "track.events", "track.events must be non-empty.");
  }
  const events = input.events.map((event, index) =>
    validateTrackEvent(createMidiIrEvent(event), component, `track.events[${index}]`),
  );
  if (component === MIDI_COMPONENT_IDS.conductor && input.channel !== undefined) {
    fail(
      MIDI_IR_ERROR_CODES.invalidChannel,
      "track.channel",
      "The conductor track does not have a MIDI channel.",
    );
  }
  const endOfTrackIndices: number[] = [];
  events.forEach((event, index) => {
    if (event.type === "end-of-track") endOfTrackIndices.push(index);
  });
  if (endOfTrackIndices.length !== 1 || endOfTrackIndices[0] !== events.length - 1) {
    fail(
      MIDI_IR_ERROR_CODES.invalidTrack,
      "track.events",
      "each track must end with exactly one End-of-Track event.",
    );
  }
  const channel =
    component === MIDI_COMPONENT_IDS.conductor
      ? undefined
      : validateComponentChannel(
          component,
          input.channel === undefined ? expectedChannel(component) : input.channel,
          "track.channel",
        );
  return Object.freeze({
    component,
    ...(channel === undefined ? {} : { channel }),
    events: Object.freeze(events),
  });
}

export function createMidiIr(value: unknown): MidiIr {
  const input = requireRecord(value, "midiIr");
  if (input.schema !== MIDI_IR_SCHEMA) {
    fail(MIDI_IR_ERROR_CODES.unsupportedSchema, "midiIr.schema", "Unsupported V1 MIDI IR schema.");
  }
  if (input.ppq !== MIDI_IR_PPQ) {
    fail(MIDI_IR_ERROR_CODES.invalidPpq, "midiIr.ppq", "V1 MIDI IR requires exactly 960 PPQ.");
  }
  if (input.sectionEndTick !== MIDI_IR_SECTION_END_TICK) {
    fail(
      MIDI_IR_ERROR_CODES.invalidSectionBoundary,
      "midiIr.sectionEndTick",
      `V1 MIDI IR requires section end tick ${MIDI_IR_SECTION_END_TICK}.`,
    );
  }
  if (!Array.isArray(input.tracks) || input.tracks.length === 0) {
    fail(MIDI_IR_ERROR_CODES.invalidShape, "midiIr.tracks", "midiIr.tracks must be non-empty.");
  }
  const tracks = input.tracks.map((track) => createMidiIrTrack(track));
  if (tracks[0].component !== MIDI_COMPONENT_IDS.conductor) {
    fail(MIDI_IR_ERROR_CODES.invalidTrack, "midiIr.tracks[0]", "track 0 must be conductor.");
  }
  const seen = new Set<MidiComponent>();
  let previousOrder = -1;
  const order: readonly MidiComponent[] = ["conductor", "chords", "bass", "arp", "lead"];
  for (const [index, track] of tracks.entries()) {
    if (seen.has(track.component)) {
      fail(
        MIDI_IR_ERROR_CODES.invalidTrack,
        `midiIr.tracks[${index}]`,
        "duplicate track component.",
      );
    }
    seen.add(track.component);
    const currentOrder = order.indexOf(track.component);
    if (currentOrder <= previousOrder) {
      fail(
        MIDI_IR_ERROR_CODES.invalidTrack,
        `midiIr.tracks[${index}]`,
        "tracks must use the accepted conductor/component order.",
      );
    }
    previousOrder = currentOrder;
  }
  return Object.freeze({
    schema: MIDI_IR_SCHEMA,
    ppq: MIDI_IR_PPQ,
    sectionEndTick: MIDI_IR_SECTION_END_TICK,
    tracks: Object.freeze(tracks),
  });
}

export const validateMidiIr = createMidiIr;
export const createMidiEvent = createMidiIrEvent;
export const createMidiTrack = createMidiIrTrack;
export const createMidiNote = createMidiSourceNote;
export const expandMidiNote = expandMidiSourceNote;
