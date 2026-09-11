// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  MIDI_CHANNEL_BY_COMPONENT,
  MIDI_COMPONENT_IDS,
  MIDI_IR_PPQ,
  MIDI_IR_SCHEMA,
  MIDI_IR_SECTION_END_TICK,
  MidiIrValidationError,
} from "../index";
import { serializeStandardMidiV1 } from "./index";

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

function componentTrack(
  component: "chords" | "bass" | "arp" | "lead",
  pitch: number,
  startTick: number,
  endTick: number,
) {
  const channel = MIDI_CHANNEL_BY_COMPONENT[component];
  return {
    component,
    channel,
    events: [
      { type: "track-name", tick: 0, name: component[0].toUpperCase() + component.slice(1) },
      { type: "note-on", tick: startTick, channel, pitch, velocity: 100 },
      { type: "note-off", tick: endTick, channel, pitch, releaseVelocity: 0 },
      endOfTrack,
    ],
  };
}

function validIr() {
  return {
    schema: MIDI_IR_SCHEMA,
    ppq: MIDI_IR_PPQ,
    sectionEndTick: MIDI_IR_SECTION_END_TICK,
    tracks: [
      conductorTrack(),
      componentTrack("chords", 60, 0, 960),
      componentTrack("bass", 48, 480, 960),
      componentTrack("arp", 72, 960, 1920),
      componentTrack("lead", 84, 1920, MIDI_IR_SECTION_END_TICK),
    ],
  };
}

type ParsedEvent = {
  readonly absoluteTick: number;
  readonly deltaTime: number;
  readonly kind: "meta" | "channel";
  readonly metaType?: number;
  readonly status?: number;
  readonly data: number[];
  readonly text?: string;
};

type ParsedTrack = {
  readonly name: string;
  readonly events: ParsedEvent[];
};

function readUint16(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] * 0x1000000 +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  );
}

function readVlq(bytes: Uint8Array, offset: number): { value: number; next: number } {
  let value = 0;
  let next = offset;
  while (true) {
    const byte = bytes[next++];
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) return { value, next };
  }
}

function readTracks(bytes: Uint8Array): {
  format: number;
  division: number;
  tracks: ParsedTrack[];
} {
  expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("MThd");
  expect(readUint32(bytes, 4)).toBe(6);
  const format = readUint16(bytes, 8);
  const trackCount = readUint16(bytes, 10);
  const division = readUint16(bytes, 12);
  let offset = 14;
  const tracks: ParsedTrack[] = [];

  for (let trackIndex = 0; trackIndex < trackCount; trackIndex += 1) {
    expect(String.fromCharCode(...bytes.slice(offset, offset + 4))).toBe("MTrk");
    const length = readUint32(bytes, offset + 4);
    const end = offset + 8 + length;
    offset += 8;
    let absoluteTick = 0;
    const events: ParsedEvent[] = [];
    while (offset < end) {
      const delta = readVlq(bytes, offset);
      offset = delta.next;
      absoluteTick += delta.value;
      const status = bytes[offset++];
      if (status === 0xff) {
        const metaType = bytes[offset++];
        const size = readVlq(bytes, offset);
        offset = size.next;
        const data = Array.from(bytes.slice(offset, offset + size.value));
        offset += size.value;
        events.push({
          absoluteTick,
          deltaTime: delta.value,
          kind: "meta",
          metaType,
          data,
          ...(metaType === 0x03 ? { text: String.fromCharCode(...data) } : {}),
        });
      } else {
        const dataLength = (status & 0xe0) === 0xc0 || (status & 0xe0) === 0xd0 ? 1 : 2;
        const data = Array.from(bytes.slice(offset, offset + dataLength));
        offset += dataLength;
        events.push({ absoluteTick, deltaTime: delta.value, kind: "channel", status, data });
      }
    }
    expect(offset).toBe(end);
    const nameEvent = events.find((event) => event.metaType === 0x03);
    tracks.push({ name: nameEvent?.text ?? "", events });
  }
  expect(offset).toBe(bytes.length);
  return { format, division, tracks };
}

describe("Standard MIDI V1 adapter", () => {
  it("emits deterministic Format 1 headers and fixed track order", () => {
    const bytes = serializeStandardMidiV1(validIr());
    expect(bytes).toEqual(serializeStandardMidiV1(validIr()));
    const parsed = readTracks(bytes);
    expect(parsed.format).toBe(1);
    expect(parsed.division).toBe(960);
    expect(parsed.tracks.map((track) => track.name)).toEqual([
      "Conductor",
      "Chords",
      "Bass",
      "Arp",
      "Lead",
    ]);
  });

  it("maps metadata, notes, explicit Note Off status, and absolute terminal EOT", () => {
    const parsed = readTracks(serializeStandardMidiV1(validIr()));
    const [conductor, chords, bass, arp, lead] = parsed.tracks;
    expect(conductor.events.map((event) => [event.metaType, event.absoluteTick])).toEqual([
      [0x03, 0],
      [0x58, 0],
      [0x51, 0],
      [0x2f, MIDI_IR_SECTION_END_TICK],
    ]);
    expect(conductor.events[1].data).toEqual([4, 2, 24, 8]);
    expect(conductor.events[2].data).toEqual([0x07, 0xa1, 0x20]);

    expect(
      chords.events.filter((event) => event.kind === "channel").map((event) => event.status),
    ).toEqual([0x90, 0x80]);
    expect(
      bass.events.filter((event) => event.kind === "channel").map((event) => event.status),
    ).toEqual([0x91, 0x81]);
    expect(
      arp.events.filter((event) => event.kind === "channel").map((event) => event.status),
    ).toEqual([0x92, 0x82]);
    expect(
      lead.events.filter((event) => event.kind === "channel").map((event) => event.status),
    ).toEqual([0x93, 0x83]);
    for (const track of parsed.tracks.slice(1)) {
      const channelEvents = track.events.filter((event) => event.kind === "channel");
      expect(
        channelEvents
          .filter((event) => (event.status ?? 0) >= 0x80 && (event.status ?? 0) < 0x90)
          .every((event) => event.data[1] === 0),
      ).toBe(true);
      expect(
        channelEvents
          .filter((event) => (event.status ?? 0) >= 0x90 && (event.status ?? 0) < 0xa0)
          .every((event) => event.data[1] > 0),
      ).toBe(true);
    }
    expect(
      bass.events.filter((event) => event.kind === "channel").map((event) => event.absoluteTick),
    ).toEqual([480, 960]);
    expect(
      arp.events.filter((event) => event.kind === "channel").map((event) => event.deltaTime),
    ).toEqual([960, 960]);
    expect(
      lead.events.filter((event) => event.kind === "channel").map((event) => event.absoluteTick),
    ).toEqual([1920, MIDI_IR_SECTION_END_TICK]);

    for (const track of parsed.tracks) {
      const eots = track.events.filter((event) => event.metaType === 0x2f);
      expect(eots).toHaveLength(1);
      expect(eots[0].absoluteTick).toBe(MIDI_IR_SECTION_END_TICK);
      expect(track.events.at(-1)?.metaType).toBe(0x2f);
    }
    expect(lead.events.at(-2)?.deltaTime).toBe(28_800);
    expect(lead.events.at(-1)?.deltaTime).toBe(0);
  });

  it("omits absent component tracks without inventing tracks or events", () => {
    const input = validIr();
    const bytes = serializeStandardMidiV1({ ...input, tracks: [input.tracks[0], input.tracks[1]] });
    const parsed = readTracks(bytes);
    expect(parsed.tracks.map((track) => track.name)).toEqual(["Conductor", "Chords"]);
    expect(parsed.tracks).toHaveLength(2);
    expect(
      parsed.tracks.flatMap((track) => track.events).filter((event) => event.metaType === 0x2f),
    ).toHaveLength(2);
  });

  it("revalidates forged or unsupported IR before invoking the adapter", () => {
    expect(() =>
      serializeStandardMidiV1({ ...validIr(), schema: "nightdrive.midi-ir.v2" }),
    ).toThrow(MidiIrValidationError);
    expect(() => serializeStandardMidiV1({ ...validIr(), tracks: [] })).toThrow(
      MidiIrValidationError,
    );
  });
});
