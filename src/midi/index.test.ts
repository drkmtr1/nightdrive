// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MIDI_CHANNEL_BY_COMPONENT,
  MIDI_COMPONENT_IDS,
  MIDI_IR_ERROR_CODES,
  MIDI_IR_PPQ,
  MIDI_IR_SCHEMA,
  MIDI_IR_SECTION_END_TICK,
  MidiIrValidationError,
  createMidiIr,
  createMidiIrEvent,
  createMidiIrTrack,
  createMidiSourceNote,
  expandMidiSourceNote,
} from "./index";

const endOfTrack = { type: "end-of-track", tick: MIDI_IR_SECTION_END_TICK } as const;

function conductorTrack() {
  return {
    component: MIDI_COMPONENT_IDS.conductor,
    events: [
      { type: "track-name", tick: 0, name: "Conductor" },
      { type: "time-signature", tick: 0, numerator: 4, denominator: 4 },
      { type: "tempo", tick: 0, microsecondsPerQuarter: 500_000 },
      endOfTrack,
    ],
  };
}

function chordsTrack() {
  return {
    component: MIDI_COMPONENT_IDS.chords,
    channel: MIDI_CHANNEL_BY_COMPONENT.chords,
    events: [
      { type: "track-name", tick: 0, name: "Chords" },
      { type: "note-on", tick: 0, channel: 0, pitch: 60, velocity: 100 },
      { type: "note-off", tick: 960, channel: 0, pitch: 60, releaseVelocity: 0 },
      endOfTrack,
    ],
  };
}

function validIr() {
  return {
    schema: MIDI_IR_SCHEMA,
    ppq: MIDI_IR_PPQ,
    sectionEndTick: MIDI_IR_SECTION_END_TICK,
    tracks: [conductorTrack(), chordsTrack()],
  };
}

function expectMidiError(operation: () => unknown, code: string, field: string): void {
  try {
    operation();
    throw new Error("Expected a MidiIrValidationError.");
  } catch (error) {
    expect(error).toBeInstanceOf(MidiIrValidationError);
    expect(error).toMatchObject({ code, field });
  }
}

describe("Nightdrive MIDI IR", () => {
  it("accepts the V1 schema, 960 PPQ, conductor, and chords fixture", () => {
    const ir = createMidiIr(validIr());
    expect(ir.schema).toBe("nightdrive.midi-ir.v1");
    expect(ir.ppq).toBe(960);
    expect(ir.tracks.map((track) => track.component)).toEqual(["conductor", "chords"]);
  });

  it("rejects unsupported schema, PPQ, and section boundary", () => {
    expectMidiError(
      () => createMidiIr({ ...validIr(), schema: "nightdrive.midi-ir.v2" }),
      MIDI_IR_ERROR_CODES.unsupportedSchema,
      "midiIr.schema",
    );
    expectMidiError(
      () => createMidiIr({ ...validIr(), ppq: 480 }),
      MIDI_IR_ERROR_CODES.invalidPpq,
      "midiIr.ppq",
    );
    expectMidiError(
      () => createMidiIr({ ...validIr(), sectionEndTick: 30_719 }),
      MIDI_IR_ERROR_CODES.invalidSectionBoundary,
      "midiIr.sectionEndTick",
    );
  });

  it("enforces tick, note start, and note span boundaries", () => {
    expect(
      createMidiIrEvent({ type: "note-on", tick: 0, channel: 0, pitch: 0, velocity: 1 }),
    ).toMatchObject({
      tick: 0,
    });
    expect(
      createMidiIrEvent({ type: "note-on", tick: 30_719, channel: 0, pitch: 127, velocity: 127 }),
    ).toMatchObject({
      tick: 30_719,
    });
    expectMidiError(
      () =>
        createMidiIrEvent({ type: "note-on", tick: 30_720, channel: 0, pitch: 60, velocity: 1 }),
      MIDI_IR_ERROR_CODES.invalidNoteLifecycle,
      "event.tick",
    );
    expectMidiError(
      () => createMidiIrEvent({ type: "note-on", tick: -1, channel: 0, pitch: 60, velocity: 1 }),
      MIDI_IR_ERROR_CODES.invalidTick,
      "event.tick",
    );
    expect(
      createMidiSourceNote({
        component: "chords",
        channel: 0,
        startTick: 30_719,
        durationTicks: 1,
        pitch: 60,
        velocity: 1,
      }),
    ).toMatchObject({ startTick: 30_719, durationTicks: 1 });
    expectMidiError(
      () =>
        createMidiSourceNote({
          component: "chords",
          channel: 0,
          startTick: 30_720,
          durationTicks: 1,
          pitch: 60,
          velocity: 1,
        }),
      MIDI_IR_ERROR_CODES.invalidNoteLifecycle,
      "note.startTick",
    );
    expectMidiError(
      () =>
        createMidiSourceNote({
          component: "chords",
          channel: 0,
          startTick: 30_719,
          durationTicks: 2,
          pitch: 60,
          velocity: 1,
        }),
      MIDI_IR_ERROR_CODES.invalidNoteLifecycle,
      "note",
    );
  });

  it("validates pitch and explicit Note On/Off velocity semantics", () => {
    expect(
      createMidiIrEvent({ type: "note-on", tick: 0, channel: 0, pitch: 0, velocity: 1 }),
    ).toBeTruthy();
    expect(
      createMidiIrEvent({ type: "note-on", tick: 0, channel: 0, pitch: 127, velocity: 127 }),
    ).toBeTruthy();
    expect(
      createMidiIrEvent({ type: "note-off", tick: 1, channel: 0, pitch: 60, releaseVelocity: 0 }),
    ).toBeTruthy();
    expectMidiError(
      () => createMidiIrEvent({ type: "note-on", tick: 0, channel: 0, pitch: 128, velocity: 1 }),
      MIDI_IR_ERROR_CODES.invalidPitch,
      "event.pitch",
    );
    expectMidiError(
      () => createMidiIrEvent({ type: "note-on", tick: 0, channel: 0, pitch: 60, velocity: 0 }),
      MIDI_IR_ERROR_CODES.invalidNoteOnVelocity,
      "event.velocity",
    );
    expectMidiError(
      () =>
        createMidiIrEvent({ type: "note-off", tick: 1, channel: 0, pitch: 60, releaseVelocity: 1 }),
      MIDI_IR_ERROR_CODES.invalidNoteOffVelocity,
      "event.releaseVelocity",
    );
  });

  it("enforces the closed component/channel policy", () => {
    for (const [component, channel] of Object.entries(MIDI_CHANNEL_BY_COMPONENT)) {
      const track = createMidiIrTrack({
        component,
        channel,
        events: [
          { type: "note-on", tick: 0, channel, pitch: 60, velocity: 1 },
          { type: "note-off", tick: 1, channel, pitch: 60, releaseVelocity: 0 },
          endOfTrack,
        ],
      });
      expect(track.channel).toBe(channel);
    }
    expectMidiError(
      () => createMidiIrTrack({ ...chordsTrack(), channel: 1 }),
      MIDI_IR_ERROR_CODES.invalidChannel,
      "track.channel",
    );
    expectMidiError(
      () => createMidiIrTrack({ ...chordsTrack(), channel: null }),
      MIDI_IR_ERROR_CODES.invalidChannel,
      "track.channel",
    );
    expectMidiError(
      () =>
        createMidiIrTrack({
          component: "conductor",
          events: [{ type: "note-on", tick: 0, channel: 0, pitch: 60, velocity: 1 }, endOfTrack],
        }),
      MIDI_IR_ERROR_CODES.invalidTrack,
      "track.events[0]",
    );
    expectMidiError(
      () =>
        createMidiIrTrack({
          component: "chords",
          channel: 0,
          events: [{ type: "note-on", tick: 0, channel: 1, pitch: 60, velocity: 1 }, endOfTrack],
        }),
      MIDI_IR_ERROR_CODES.invalidChannel,
      "track.events[0].channel",
    );
    expectMidiError(
      () => createMidiIrTrack({ component: "drums", events: [endOfTrack] }),
      MIDI_IR_ERROR_CODES.invalidComponent,
      "track.component",
    );
  });

  it("rejects malformed event, tempo, and track lifecycle state", () => {
    expectMidiError(
      () => createMidiIrEvent({ type: "controller", tick: 0 }),
      MIDI_IR_ERROR_CODES.unsupportedEventType,
      "event.type",
    );
    expectMidiError(
      () => createMidiIrEvent({ type: "tempo", tick: 0, microsecondsPerQuarter: 0 }),
      MIDI_IR_ERROR_CODES.invalidTempo,
      "event.microsecondsPerQuarter",
    );
    expectMidiError(
      () =>
        createMidiIrTrack({ component: "chords", channel: 0, events: [endOfTrack, endOfTrack] }),
      MIDI_IR_ERROR_CODES.invalidTrack,
      "track.events",
    );
    expectMidiError(
      () =>
        createMidiIrTrack({
          component: "chords",
          channel: 0,
          events: [{ type: "note-on", tick: 0, channel: 0, pitch: 60, velocity: 1 }],
        }),
      MIDI_IR_ERROR_CODES.invalidTrack,
      "track.events",
    );
    expectMidiError(
      () => createMidiIrEvent({ type: "end-of-track", tick: 30_719 }),
      MIDI_IR_ERROR_CODES.invalidSectionBoundary,
      "event.tick",
    );
  });

  it("expands a validated source span into explicit note lifecycle events", () => {
    const events = expandMidiSourceNote({
      component: "chords",
      channel: 0,
      startTick: 0,
      durationTicks: 30_720,
      pitch: 60,
      velocity: 100,
    });
    expect(events).toEqual([
      { type: "note-on", tick: 0, channel: 0, pitch: 60, velocity: 100 },
      { type: "note-off", tick: 30_720, channel: 0, pitch: 60, releaseVelocity: 0 },
    ]);
    expect(Object.isFrozen(events)).toBe(true);
  });

  it("freezes validated values and nested collections", () => {
    const ir = createMidiIr(validIr());
    expect(Object.isFrozen(ir)).toBe(true);
    expect(Object.isFrozen(ir.tracks)).toBe(true);
    expect(Object.isFrozen(ir.tracks[0])).toBe(true);
    expect(Object.isFrozen(ir.tracks[0].events)).toBe(true);
    expect(Object.isFrozen(ir.tracks[0].events[0])).toBe(true);
  });

  it("rejects forged runtime values on revalidation with stable failures", () => {
    const forged = { schema: MIDI_IR_SCHEMA, ppq: 960, sectionEndTick: 30_720, tracks: [] };
    expectMidiError(() => createMidiIr(forged), MIDI_IR_ERROR_CODES.invalidShape, "midiIr.tracks");
    expectMidiError(
      () => createMidiIrEvent({ type: "note-on", tick: 0, channel: "0", pitch: 60, velocity: 1 }),
      MIDI_IR_ERROR_CODES.invalidChannel,
      "event.channel",
    );
  });

  it("keeps the public IR module free of third-party MIDI imports", () => {
    const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
    const imports = Array.from(source.matchAll(/from\s+["']([^"']+)["']/g), (match) => match[1]);
    expect(imports.every((specifier) => specifier.startsWith("."))).toBe(true);
  });
});
