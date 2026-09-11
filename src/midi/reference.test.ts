// @vitest-environment node

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { serializeStandardMidiV1 } from "./adapter";
import {
  MIDI_CHANNEL_BY_COMPONENT,
  MIDI_COMPONENT_IDS,
  MIDI_IR_PPQ,
  MIDI_IR_SCHEMA,
  MIDI_IR_SECTION_END_TICK,
} from "./index";
import { parseReferenceSmf, type ReferenceTrack } from "./reference-parser.test-support";

function parseFailure(message: string): never {
  throw new Error(`semantic reference failure: ${message}`);
}

function rawSmf(
  trackPayload: readonly number[],
  format = 1,
  division: number = MIDI_IR_PPQ,
): Uint8Array {
  const header = [
    0x4d,
    0x54,
    0x68,
    0x64,
    0,
    0,
    0,
    6,
    (format >> 8) & 0xff,
    format & 0xff,
    0,
    1,
    (division >> 8) & 0xff,
    division & 0xff,
  ];
  const length = trackPayload.length;
  return Uint8Array.from([
    ...header,
    0x4d,
    0x54,
    0x72,
    0x6b,
    (length >>> 24) & 0xff,
    (length >>> 16) & 0xff,
    (length >>> 8) & 0xff,
    length & 0xff,
    ...trackPayload,
  ]);
}

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
  events: readonly Record<string, unknown>[],
) {
  return {
    component,
    channel: MIDI_CHANNEL_BY_COMPONENT[component],
    events: [
      { type: "track-name", tick: 0, name: component[0].toUpperCase() + component.slice(1) },
      ...events,
      endOfTrack,
    ],
  };
}

function notesFor(
  component: "chords" | "bass" | "arp" | "lead",
  values: readonly [number, number, number][],
) {
  const channel = MIDI_CHANNEL_BY_COMPONENT[component];
  return values.flatMap(([start, end, pitch]) => [
    { type: "note-on", tick: start, channel, pitch, velocity: 100 },
    { type: "note-off", tick: end, channel, pitch, releaseVelocity: 0 },
  ]);
}

function midiIr(tracks: readonly Record<string, unknown>[]) {
  return {
    schema: MIDI_IR_SCHEMA,
    ppq: MIDI_IR_PPQ,
    sectionEndTick: MIDI_IR_SECTION_END_TICK,
    tracks,
  };
}

const fixtures = [
  {
    name: "conductor-and-one-chords-note",
    ir: midiIr([conductorTrack(), componentTrack("chords", notesFor("chords", [[0, 960, 60]]))]),
    expectedHex:
      "4d546864000000060001000203c04d54726b0000002200ff0309436f6e647563746f7200ff58040402180800ff510307a12081f000ff2f004d54726b0000001900ff030643686f72647300903c648740803c0081e840ff2f00",
    expectedSha256: "6c656353aff09f41fe56979f13eaf32e304b2d42b517eed7c60eb804c1d98d82",
    expectedTracks: [
      { name: "Conductor", notes: [] },
      { name: "Chords", notes: [[0, 960, 60, 100]] },
    ],
  },
  {
    name: "multiple-component-tracks",
    ir: midiIr([
      conductorTrack(),
      componentTrack("chords", notesFor("chords", [[0, 960, 60]])),
      componentTrack("bass", notesFor("bass", [[480, 1920, 48]])),
      componentTrack("lead", notesFor("lead", [[1920, MIDI_IR_SECTION_END_TICK, 84]])),
    ]),
    expectedHex:
      "4d546864000000060001000403c04d54726b0000002200ff0309436f6e647563746f7200ff58040402180800ff510307a12081f000ff2f004d54726b0000001900ff030643686f72647300903c648740803c0081e840ff2f004d54726b0000001800ff03044261737383609130648b2081300081e100ff2f004d54726b0000001700ff03044c6561648f0093546481e10083540000ff2f00",
    expectedSha256: "021a64307852c800be7994a276614c4075bb3ec6e6c99e0d3b6fa136c2a29ad6",
    expectedTracks: [
      { name: "Conductor", notes: [] },
      { name: "Chords", notes: [[0, 960, 60, 100]] },
      { name: "Bass", notes: [[480, 1920, 48, 100]] },
      { name: "Lead", notes: [[1920, MIDI_IR_SECTION_END_TICK, 84, 100]] },
    ],
  },
  {
    name: "simultaneous-chord-notes-ascending",
    ir: midiIr([
      conductorTrack(),
      componentTrack("chords", [
        { type: "note-on", tick: 0, channel: 0, pitch: 60, velocity: 100 },
        { type: "note-on", tick: 0, channel: 0, pitch: 64, velocity: 100 },
        { type: "note-on", tick: 0, channel: 0, pitch: 67, velocity: 100 },
        { type: "note-off", tick: 960, channel: 0, pitch: 60, releaseVelocity: 0 },
        { type: "note-off", tick: 960, channel: 0, pitch: 64, releaseVelocity: 0 },
        { type: "note-off", tick: 960, channel: 0, pitch: 67, releaseVelocity: 0 },
      ]),
    ]),
    expectedHex:
      "4d546864000000060001000203c04d54726b0000002200ff0309436f6e647563746f7200ff58040402180800ff510307a12081f000ff2f004d54726b0000002900ff030643686f72647300903c6400904064009043648740803c00008040000080430081e840ff2f00",
    expectedSha256: "7ffcbcea7c5b1e7754d87456c1c905295a5dffd89ce7e71999a413e9ba934792",
    expectedTracks: [
      { name: "Conductor", notes: [] },
      {
        name: "Chords",
        notes: [
          [0, 960, 60, 100],
          [0, 960, 64, 100],
          [0, 960, 67, 100],
        ],
      },
    ],
  },
  {
    name: "same-tick-off-before-on",
    ir: midiIr([
      conductorTrack(),
      componentTrack("chords", [
        ...notesFor("chords", [
          [0, 960, 60],
          [960, 1920, 62],
        ]),
      ]),
    ]),
    expectedHex:
      "4d546864000000060001000203c04d54726b0000002200ff0309436f6e647563746f7200ff58040402180800ff510307a12081f000ff2f004d54726b0000002200ff030643686f72647300903c648740803c0000903e648740803e0081e100ff2f00",
    expectedSha256: "48fb617f85ebafe1b6684aa6a8fd5bb9e40d2e823b15120508bcca3f87f9090d",
    expectedTracks: [
      { name: "Conductor", notes: [] },
      {
        name: "Chords",
        notes: [
          [0, 960, 60, 100],
          [960, 1920, 62, 100],
        ],
      },
    ],
  },
  {
    name: "note-ending-at-section-boundary",
    ir: midiIr([
      conductorTrack(),
      componentTrack("chords", notesFor("chords", [[0, MIDI_IR_SECTION_END_TICK, 60]])),
    ]),
    expectedHex:
      "4d546864000000060001000203c04d54726b0000002200ff0309436f6e647563746f7200ff58040402180800ff510307a12081f000ff2f004d54726b0000001800ff030643686f72647300903c6481f000803c0000ff2f00",
    expectedSha256: "f412d45112d835cfdff9af2c0170854fdd98c278895839d740201b90c947a6bc",
    expectedTracks: [
      { name: "Conductor", notes: [] },
      { name: "Chords", notes: [[0, MIDI_IR_SECTION_END_TICK, 60, 100]] },
    ],
  },
  {
    name: "absent-optional-component-tracks",
    ir: midiIr([conductorTrack()]),
    expectedHex:
      "4d546864000000060001000103c04d54726b0000002200ff0309436f6e647563746f7200ff58040402180800ff510307a12081f000ff2f00",
    expectedSha256: "9e73b6475194e492f6c7371da1e31d8b74b3f187e9de22a2830a18f0a0608a85",
    expectedTracks: [{ name: "Conductor", notes: [] }],
  },
] as const;

function semanticNotes(
  track: ReferenceTrack,
): readonly (readonly [number, number, number, number])[] {
  const active = new Map<string, { tick: number; pitch: number; velocity: number }>();
  const notes: [number, number, number, number][] = [];
  for (const event of track.events) {
    if (event.kind !== "channel" || event.status === undefined) continue;
    const pitch = event.data[0];
    const key = `${event.status & 0x0f}:${pitch}`;
    if ((event.status & 0xf0) === 0x90 && event.data[1] > 0) {
      active.set(key, { tick: event.absoluteTick, pitch, velocity: event.data[1] });
    } else if ((event.status & 0xf0) === 0x80) {
      const start = active.get(key);
      if (!start) parseFailure("unmatched Note Off in semantic reference");
      notes.push([start.tick, event.absoluteTick, start.pitch, start.velocity]);
      active.delete(key);
    }
  }
  if (active.size > 0) parseFailure("unterminated note in semantic reference");
  return notes;
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

describe("independent Standard MIDI V1 reference evidence", () => {
  it("matches exact golden bytes and stable hashes for every bounded fixture", () => {
    for (const fixture of fixtures) {
      const bytes = serializeStandardMidiV1(fixture.ir);
      expect(hex(bytes), fixture.name).toBe(fixture.expectedHex);
      expect(sha256(bytes), fixture.name).toBe(fixture.expectedSha256);
      expect(bytes).toEqual(serializeStandardMidiV1(fixture.ir));
    }
  });

  it("round-trips accepted semantic fields through an independent parser", () => {
    for (const fixture of fixtures) {
      const parsed = parseReferenceSmf(serializeStandardMidiV1(fixture.ir));
      expect(parsed.format).toBe(1);
      expect(parsed.division).toBe(MIDI_IR_PPQ);
      expect(parsed.tracks.map((track) => track.name)).toEqual(
        fixture.expectedTracks.map((track) => track.name),
      );
      expect(parsed.tracks).toHaveLength(fixture.expectedTracks.length);
      for (const [index, expected] of fixture.expectedTracks.entries()) {
        const track = parsed.tracks[index];
        expect(semanticNotes(track)).toEqual(expected.notes);
        if (expected.name !== "Conductor") {
          const expectedChannel =
            MIDI_CHANNEL_BY_COMPONENT[
              expected.name.toLowerCase() as "chords" | "bass" | "arp" | "lead"
            ];
          for (const event of track.events.filter((candidate) => candidate.kind === "channel")) {
            const status = event.status;
            if (status === undefined) parseFailure("channel event has no status");
            expect(status & 0x0f).toBe(expectedChannel);
            if ((status & 0xf0) === 0x90) expect(event.data[1]).toBe(100);
            if ((status & 0xf0) === 0x80) expect(event.data[1]).toBe(0);
          }
        }
        const eots = track.events.filter((event) => event.metaType === 0x2f);
        expect(eots).toHaveLength(1);
        expect(eots[0].absoluteTick).toBe(MIDI_IR_SECTION_END_TICK);
        expect(track.events.at(-1)?.metaType).toBe(0x2f);
      }
      const conductor = parsed.tracks[0];
      expect(conductor.events.find((event) => event.metaType === 0x58)?.data).toEqual([
        4, 2, 24, 8,
      ]);
      expect(conductor.events.find((event) => event.metaType === 0x51)?.data).toEqual([
        0x07, 0xa1, 0x20,
      ]);
    }
  });

  it("proves explicit Note Off, ordering, and terminal EOT semantics independently", () => {
    const simultaneous = parseReferenceSmf(serializeStandardMidiV1(fixtures[2].ir)).tracks[1];
    const channelEvents = simultaneous.events.filter((event) => event.kind === "channel");
    expect(
      channelEvents
        .filter((event) => (event.status ?? 0) >= 0x90 && (event.status ?? 0) < 0xa0)
        .map((event) => event.data[0]),
    ).toEqual([60, 64, 67]);
    expect(
      channelEvents
        .filter((event) => (event.status ?? 0) >= 0x80 && (event.status ?? 0) < 0x90)
        .every((event) => event.data[1] === 0),
    ).toBe(true);
    expect(channelEvents.map((event) => event.absoluteTick)).toEqual([0, 0, 0, 960, 960, 960]);

    const sameTick = parseReferenceSmf(serializeStandardMidiV1(fixtures[3].ir)).tracks[1];
    const at960 = sameTick.events.filter(
      (event) => event.absoluteTick === 960 && event.kind === "channel",
    );
    expect(at960.map((event) => event.status)).toEqual([0x80, 0x90]);
    expect(sameTick.events.at(-1)?.metaType).toBe(0x2f);
    expect(sameTick.events.at(-1)?.absoluteTick).toBe(MIDI_IR_SECTION_END_TICK);
  });

  it("rejects malformed files with independent structural checks", () => {
    const valid = serializeStandardMidiV1(fixtures[0].ir);
    expect(() => parseReferenceSmf(valid.slice(0, 13))).toThrow(/truncated header/);
    expect(() => parseReferenceSmf(Uint8Array.from([...valid.slice(0, 14), 0x00]))).toThrow(
      /track chunk/,
    );

    const malformedVlq = rawSmf([0x80, 0x80, 0x80, 0x80, 0x00]);
    expect(() => parseReferenceSmf(malformedVlq)).toThrow(/variable-length quantity/);

    expect(() => parseReferenceSmf(rawSmf([0x00, 0x90, 60, 100]))).toThrow(/End-of-Track/);
    expect(() =>
      parseReferenceSmf(rawSmf([0x81, 0xf0, 0x00, 0xff, 0x2f, 0x00, 0x00, 0x90, 60, 100])),
    ).toThrow(/after End-of-Track/);
    expect(() => parseReferenceSmf(rawSmf([0x00, 0xff, 0x2f, 0x00], 0))).toThrow(/Format 1/);
    expect(() => parseReferenceSmf(rawSmf([0x00, 0xff, 0x2f, 0x00], 1, 480))).toThrow(/960 PPQ/);
    expect(() => parseReferenceSmf(rawSmf([0x00, 0x90, 60]))).toThrow(/channel event/);
  });

  it("keeps the parser independent of the midi-file writer and third-party readers", () => {
    expect(parseReferenceSmf).not.toBe(serializeStandardMidiV1);
    expect(serializeStandardMidiV1.toString()).not.toContain("parseReferenceSmf");
  });
});
